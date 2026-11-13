"""HealthGuard ML Pipeline: Cleaning, EDA, Scientific Labeling, Model Training & Joblib Export."""

from __future__ import annotations

import json
from pathlib import Path
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    precision_recall_fscore_support,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.tree import DecisionTreeClassifier

DATA_DIR = Path("public/assets/aistudio")
ARTIFACT_DIR = Path("artifacts")
CLASS_LABELS = ["Healthy", "Moderate", "Unhealthy"]
FEATURE_NAMES = [
    "calories",
    "sugars",
    "fat",
    "protein",
    "sodium_mg",
    "sugar_kcal_pct",
    "fat_kcal_pct",
    "protein_kcal_pct",
    "sodium_per_100kcal",
]


def engineer_features(df_in: pd.DataFrame) -> pd.DataFrame:
    """Create ML feature matrix strictly from the 5 user-facing nutrition inputs."""
    kcal = np.maximum(df_in["calories"].astype(float), 1.0)
    sugars = np.maximum(df_in["sugars"].astype(float), 0.0)
    fat = np.maximum(df_in["fat"].astype(float), 0.0)
    protein = np.maximum(df_in["protein"].astype(float), 0.0)
    sodium_mg = np.maximum(df_in["sodium_mg"].astype(float), 0.0)

    return pd.DataFrame(
        {
            "calories": kcal,
            "sugars": sugars,
            "fat": fat,
            "protein": protein,
            "sodium_mg": sodium_mg,
            "sugar_kcal_pct": np.clip(sugars * 4.0 / kcal * 100.0, 0.0, 100.0),
            "fat_kcal_pct": np.clip(fat * 9.0 / kcal * 100.0, 0.0, 100.0),
            "protein_kcal_pct": np.clip(protein * 4.0 / kcal * 100.0, 0.0, 100.0),
            "sodium_per_100kcal": np.clip(sodium_mg / kcal * 100.0, 0.0, 5000.0),
        }
    )


def main() -> None:
    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    csv_files = sorted(DATA_DIR.glob("FOOD-DATA-GROUP*.csv"))
    if not csv_files:
        raise FileNotFoundError(f"No CSV files found in {DATA_DIR}")

    frames = []
    file_counts = []
    for f in csv_files:
        part = pd.read_csv(f)
        part["source_group"] = f.name
        file_counts.append({"file": f.name, "rows": int(len(part)), "columns": int(part.shape[1] - 1)})
        frames.append(part)

    raw = pd.concat(frames, ignore_index=True)
    raw_rows = int(len(raw))

    # 1. Remove index columns
    unnamed_cols = [c for c in raw.columns if c.startswith("Unnamed")]
    df = raw.drop(columns=unnamed_cols).copy()

    # 2. Missing value handling
    missing_cells = int(df.isna().sum().sum())
    df = df.dropna(subset=["food", "Caloric Value", "Fat", "Sugars", "Protein", "Sodium"]).copy()
    numeric_cols = [c for c in df.columns if c not in ("food", "source_group")]
    for c in numeric_cols:
        df[c] = pd.to_numeric(df[c], errors="coerce").fillna(0.0)

    # 3. Deduplicate food names
    df["food_clean"] = df["food"].astype(str).str.strip()
    df["food_norm"] = df["food_clean"].str.lower()
    before_dedup = len(df)
    df = df.drop_duplicates(subset=["food_norm"]).copy()
    duplicates_removed = int(before_dedup - len(df))

    # 4. Standardize Sodium from grams to milligrams (verified during EDA)
    df["sodium_mg"] = df["Sodium"] * 1000.0
    df["est_weight_g"] = df["Fat"] + df["Carbohydrates"] + df["Protein"] + df["Water"]
    df["est_kcal"] = 4.0 * df["Carbohydrates"] + 4.0 * df["Protein"] + 9.0 * df["Fat"]

    # 5. Clean zero-calorie/corrupted/physically impossible rows
    mask_low_cal = df["Caloric Value"] < 5.0
    mask_low_weight = df["est_weight_g"] < 5.0
    mask_sat_gt_fat = df["Saturated Fats"] > df["Fat"] + 0.1
    mask_sug_gt_carb = df["Sugars"] > df["Carbohydrates"] + 0.1
    mask_macro_mismatch = df["est_kcal"] > (df["Caloric Value"] * 1.8 + 50.0)
    mask_extreme_sodium = df["sodium_mg"] > 10000.0

    mask_valid = ~(
        mask_low_cal
        | mask_low_weight
        | mask_sat_gt_fat
        | mask_sug_gt_carb
        | mask_macro_mismatch
        | mask_extreme_sodium
    )
    clean = df[mask_valid].copy().reset_index(drop=True)

    cleaning_summary = {
        "raw_rows": raw_rows,
        "files": file_counts,
        "unnamed_columns_dropped": unnamed_cols,
        "missing_values_found": missing_cells,
        "duplicates_removed": duplicates_removed,
        "anomalies_removed": {
            "low_calorie_or_zero_rows": int(mask_low_cal.sum()),
            "tiny_serving_weight_rows": int((~mask_low_cal & mask_low_weight).sum()),
            "saturated_fat_exceeds_total_fat": int(mask_sat_gt_fat.sum()),
            "sugars_exceeds_carbohydrates": int(mask_sug_gt_carb.sum()),
            "macro_calorie_mismatch": int(mask_macro_mismatch.sum()),
            "extreme_sodium_outliers_gt_10000mg": int(mask_extreme_sodium.sum()),
            "total_invalid_rows_removed": int((~mask_valid).sum()),
        },
        "cleaned_rows": int(len(clean)),
        "unit_standardization": "Converted Sodium from grams (g) to milligrams (mg = Sodium * 1000) after verifying salt=7.0g, cheeses=0.2-0.7g, and fast foods=0.8-2.4g in raw CSVs.",
    }

    # 6. Scientifically documented WHO / FDA / WCRF Nutrient Balance Labeling
    kcal = clean["Caloric Value"]
    w = clean["est_weight_g"]
    sugar_pct = np.clip(clean["Sugars"] * 4.0 / kcal * 100.0, 0.0, 100.0)
    sat_pct = np.clip(clean["Saturated Fats"] * 9.0 / kcal * 100.0, 0.0, 100.0)
    fat_pct = np.clip(clean["Fat"] * 9.0 / kcal * 100.0, 0.0, 100.0)
    prot_pct = np.clip(clean["Protein"] * 4.0 / kcal * 100.0, 0.0, 100.0)
    sod_per_100kcal = clean["sodium_mg"] / kcal * 100.0
    fiber_per_100kcal = clean["Dietary Fiber"] / kcal * 100.0
    kcal_per_100g = kcal / w * 100.0

    pen_sugar = np.clip((sugar_pct - 10.0) * 0.75, 0.0, 35.0) + np.clip((clean["Sugars"] - 20.0) * 0.4, 0.0, 10.0)
    pen_sat = np.clip((sat_pct - 8.0) * 0.9, 0.0, 25.0)
    pen_fat = np.clip((fat_pct - 30.0) * 0.65, 0.0, 18.0)
    pen_sod = np.clip((sod_per_100kcal - 115.0) * 0.08, 0.0, 22.0) + np.clip((clean["sodium_mg"] - 500.0) * 0.012, 0.0, 10.0)
    pen_ed = np.clip((kcal_per_100g - 200.0) * 0.06, 0.0, 14.0)

    bon_fiber = np.clip(fiber_per_100kcal * 5.0, 0.0, 15.0)
    bon_prot = np.clip(prot_pct * 0.4, 0.0, 12.0)
    bon_whole = np.where((kcal_per_100g < 100.0) & (sugar_pct < 35.0) & (sod_per_100kcal < 150.0), 5.0, 0.0)

    scientific_score = np.clip(
        75.0 - pen_sugar - pen_sat - pen_fat - pen_sod - pen_ed + bon_fiber + bon_prot + bon_whole,
        0.0,
        100.0,
    )
    clean["scientific_score"] = np.round(scientific_score, 1)
    clean["health_label"] = np.where(
        scientific_score >= 68.0,
        "Healthy",
        np.where(scientific_score >= 44.0, "Moderate", "Unhealthy"),
    )

    class_counts = {
        lbl: int((clean["health_label"] == lbl).sum()) for lbl in CLASS_LABELS
    }
    class_mean_scores = {
        lbl: round(float(clean.loc[clean["health_label"] == lbl, "scientific_score"].mean()), 1)
        for lbl in CLASS_LABELS
    }

    # 7. Basic EDA summary on cleaned dataset
    eda_cols = {
        "calories_kcal": clean["Caloric Value"],
        "sugars_g": clean["Sugars"],
        "fat_g": clean["Fat"],
        "saturated_fat_g": clean["Saturated Fats"],
        "protein_g": clean["Protein"],
        "dietary_fiber_g": clean["Dietary Fiber"],
        "sodium_mg": clean["sodium_mg"],
    }
    eda_stats = {}
    for col_name, series in eda_cols.items():
        eda_stats[col_name] = {
            "mean": round(float(series.mean()), 2),
            "median": round(float(series.median()), 2),
            "std": round(float(series.std()), 2),
            "min": round(float(series.min()), 2),
            "max": round(float(series.max()), 2),
        }

    # 8. Prepare features & split
    model_input_df = pd.DataFrame(
        {
            "calories": clean["Caloric Value"],
            "sugars": clean["Sugars"],
            "fat": clean["Fat"],
            "protein": clean["Protein"],
            "sodium_mg": clean["sodium_mg"],
        }
    )
    X = engineer_features(model_input_df)
    y = clean["health_label"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )

    candidates = {
        "Logistic Regression": Pipeline(
            [
                ("scaler", StandardScaler()),
                ("clf", LogisticRegression(max_iter=2000, random_state=42)),
            ]
        ),
        "Decision Tree": DecisionTreeClassifier(
            max_depth=8, min_samples_leaf=5, random_state=42
        ),
        "Random Forest": RandomForestClassifier(
            n_estimators=200, max_depth=12, min_samples_leaf=3, random_state=42
        ),
    }

    comparison = []
    trained_models = {}

    for model_name, estimator in candidates.items():
        estimator.fit(X_train, y_train)
        y_pred = estimator.predict(X_test)

        acc = float(accuracy_score(y_test, y_pred))
        prec, rec, f1, _ = precision_recall_fscore_support(
            y_test, y_pred, average="weighted", zero_division=0
        )
        cm = confusion_matrix(y_test, y_pred, labels=CLASS_LABELS).tolist()
        per_class = classification_report(
            y_test, y_pred, labels=CLASS_LABELS, output_dict=True, zero_division=0
        )

        trained_models[model_name] = estimator
        comparison.append(
            {
                "model": model_name,
                "accuracy": round(acc, 4),
                "precision": round(float(prec), 4),
                "recall": round(float(rec), 4),
                "f1_score": round(float(f1), 4),
                "confusion_matrix": cm,
                "per_class": {
                    lbl: {
                        "precision": round(float(per_class[lbl]["precision"]), 4),
                        "recall": round(float(per_class[lbl]["recall"]), 4),
                        "f1_score": round(float(per_class[lbl]["f1-score"]), 4),
                        "support": int(per_class[lbl]["support"]),
                    }
                    for lbl in CLASS_LABELS
                },
            }
        )

    # Select best model based on F1-score, then accuracy
    best_entry = max(comparison, key=lambda r: (r["f1_score"], r["accuracy"]))
    best_model_name = best_entry["model"]
    best_model = trained_models[best_model_name]

    # Curate real sample foods from cleaned dataset for quick UI testing
    sample_names = [
        "broccoli cooked",
        "salmon cooked",
        "oatmeal bread",
        "spinach spaghetti cooked",
        "pepperoni pizza dominos",
        "french fries mcdonalds",
        "chocolate pudding",
        "root beer",
        "apple crisp",
        "cheddar cheese",
        "biscuit with egg cheese bacon",
    ]
    samples = []
    for name in sample_names:
        match = clean[clean["food_norm"] == name]
        if match.empty:
            continue
        row = match.iloc[0]
        samples.append(
            {
                "food": row["food_clean"].title(),
                "calories": round(float(row["Caloric Value"]), 1),
                "sugars": round(float(row["Sugars"]), 1),
                "fat": round(float(row["Fat"]), 1),
                "protein": round(float(row["Protein"]), 1),
                "sodium_mg": round(float(row["sodium_mg"]), 1),
                "dataset_label": str(row["health_label"]),
                "source_group": str(row["source_group"]),
            }
        )

    labeling_methodology = {
        "framework": "WHO / FDA / WCRF Nutrient Balance & Energy-Density Criteria",
        "rules": [
            "Sugars penalty: >10% of total calories from sugars (WHO free sugars threshold) plus >20g/serving penalty.",
            "Saturated fat penalty: >8% of total calories from saturated fat (WHO <10% upper limit).",
            "Total fat penalty: >30% of total calories from fat (WHO upper bound).",
            "Sodium penalty: >115 mg per 100 kcal (FDA 2,300 mg / 2,000 kcal benchmark) plus >500 mg/serving high-sodium penalty.",
            "Energy density penalty: >200 kcal per 100g estimated food weight (WCRF energy-dense threshold).",
            "Positive credits: Dietary fiber density (up to +15 pts), Protein density (up to +12 pts), and low energy density whole foods (<100 kcal/100g, +5 pts).",
        ],
        "thresholds": {
            "Healthy": "Score >= 68.0",
            "Moderate": "44.0 <= Score < 68.0",
            "Unhealthy": "Score < 44.0",
        },
        "class_distribution": class_counts,
        "class_mean_scores": class_mean_scores,
    }

    report = {
        "cleaning_summary": cleaning_summary,
        "eda_summary": eda_stats,
        "labeling_methodology": labeling_methodology,
        "train_test_split": {
            "train_size": int(len(X_train)),
            "test_size": int(len(X_test)),
            "test_ratio": 0.20,
            "stratified": True,
            "random_state": 42,
        },
        "features_used": FEATURE_NAMES,
        "class_labels": CLASS_LABELS,
        "model_comparison": comparison,
        "best_model": best_model_name,
    }

    food_catalog = [
        {
            "food": str(row["food_clean"]).title(),
            "food_norm": str(row["food_norm"]),
            "calories": round(float(row["Caloric Value"]), 1),
            "sugars": round(float(row["Sugars"]), 1),
            "fat": round(float(row["Fat"]), 1),
            "protein": round(float(row["Protein"]), 1),
            "sodium_mg": round(float(row["sodium_mg"]), 1),
            "source_group": str(row["source_group"]),
        }
        for _, row in clean.iterrows()
    ]

    bundle = {
        "model": best_model,
        "best_model_name": best_model_name,
        "feature_names": FEATURE_NAMES,
        "class_labels": CLASS_LABELS,
        "class_mean_scores": class_mean_scores,
        "report": report,
        "sample_foods": samples,
        "food_catalog": food_catalog,
    }

    model_path = ARTIFACT_DIR / "healthguard_model.joblib"
    report_path = ARTIFACT_DIR / "evaluation_report.json"
    samples_path = ARTIFACT_DIR / "sample_foods.json"
    catalog_path = ARTIFACT_DIR / "food_catalog.json"

    joblib.dump(bundle, model_path)
    report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    samples_path.write_text(json.dumps(samples, indent=2), encoding="utf-8")
    catalog_path.write_text(json.dumps(food_catalog), encoding="utf-8")

    # Print clear summary to stdout
    print("=== HEALTHGUARD TRAINING COMPLETE ===")
    print(f"Raw rows: {raw_rows} | Cleaned rows: {len(clean)} | Removed: {raw_rows - len(clean)}")
    print(f"Class counts: {class_counts}")
    print(f"Train size: {len(X_train)} | Test size: {len(X_test)}")
    print("\n--- Model Comparison ---")
    for row in comparison:
        marker = " [BEST]" if row["model"] == best_model_name else ""
        print(
            f"{row['model']}{marker}: "
            f"Accuracy={row['accuracy']:.4f}, Precision={row['precision']:.4f}, "
            f"Recall={row['recall']:.4f}, F1={row['f1_score']:.4f}"
        )
        print(f"  Confusion Matrix {CLASS_LABELS}: {row['confusion_matrix']}")
    print(f"\nSaved Joblib bundle to: {model_path}")


if __name__ == "__main__":
    main()
