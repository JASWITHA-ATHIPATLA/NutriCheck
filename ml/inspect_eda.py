"""Exploratory Data Analysis (EDA) for the 5 uploaded nutrition CSV datasets."""

from pathlib import Path
import json
import pandas as pd
import numpy as np

DATA_DIR = Path("public/assets/aistudio")
CSV_FILES = sorted(DATA_DIR.glob("FOOD-DATA-GROUP*.csv"))


def main() -> None:
    if not CSV_FILES:
        raise FileNotFoundError(f"No CSV files found in {DATA_DIR}")

    frames = []
    print("=== DATASET FILES ===")
    for f in CSV_FILES:
        df = pd.read_csv(f)
        df["source_file"] = f.name
        print(f"  {f.name}: {df.shape[0]} rows, {df.shape[1]-1} cols")
        frames.append(df)

    raw = pd.concat(frames, ignore_index=True)
    print(f"\nCombined raw shape: {raw.shape}")
    print(f"Columns ({len(raw.columns)}): {list(raw.columns)}")

    # Drop unnamed index columns if present
    unnamed_cols = [c for c in raw.columns if c.startswith("Unnamed")]
    print(f"\nIndex/Unnamed columns detected: {unnamed_cols}")
    df = raw.drop(columns=unnamed_cols)

    # Check missing values
    missing = df.isna().sum()
    missing = missing[missing > 0]
    print(f"\nMissing values (>0):\n{missing if len(missing) else '  None'}")

    # Check data types
    non_numeric = [c for c in df.columns if c not in ("food", "source_file") and not pd.api.types.is_numeric_dtype(df[c])]
    print(f"\nNon-numeric nutrition columns: {non_numeric if non_numeric else 'None'}")

    # Check duplicates
    exact_dupes_all = df.drop(columns=["source_file"]).duplicated().sum()
    df["food_norm"] = df["food"].astype(str).str.strip().str.lower()
    dupe_food_names = df["food_norm"].duplicated().sum()
    print(f"\nExact duplicate rows (excluding source_file): {exact_dupes_all}")
    print(f"Duplicate normalized food names: {dupe_food_names}")
    if dupe_food_names > 0:
        dupes = df[df["food_norm"].duplicated(keep=False)].sort_values("food_norm")
        print("Sample duplicate food names (first 10):")
        print(dupes[["food", "Caloric Value", "Fat", "Sugars", "Protein", "Sodium", "source_file"]].head(10).to_string(index=False))

    # Negative values check
    num_cols = [c for c in df.columns if c not in ("food", "food_norm", "source_file")]
    neg_counts = (df[num_cols] < 0).sum()
    neg_counts = neg_counts[neg_counts > 0]
    print(f"\nNegative value counts:\n{neg_counts if len(neg_counts) else '  None'}")

    # Anomalies & unit checks
    print("\n=== ANOMALY & UNIT CHECKS ===")
    sat_gt_fat = df[df["Saturated Fats"] > df["Fat"] + 0.05]
    print(f"Rows where Saturated Fats > Fat (+0.05g tolerance): {len(sat_gt_fat)}")
    if len(sat_gt_fat) > 0:
        print(sat_gt_fat[["food", "Caloric Value", "Fat", "Saturated Fats", "source_file"]].head(10).to_string(index=False))

    sug_gt_carb = df[df["Sugars"] > df["Carbohydrates"] + 0.05]
    print(f"\nRows where Sugars > Carbohydrates (+0.05g tolerance): {len(sug_gt_carb)}")
    if len(sug_gt_carb) > 0:
        print(sug_gt_carb[["food", "Caloric Value", "Carbohydrates", "Sugars", "source_file"]].head(10).to_string(index=False))

    # Calorie vs 4*C + 4*P + 9*F check
    df["est_kcal"] = 4 * df["Carbohydrates"] + 4 * df["Protein"] + 9 * df["Fat"]
    df["kcal_diff"] = (df["Caloric Value"] - df["est_kcal"]).abs()
    bad_kcal = df[(df["kcal_diff"] > 50) & (df["Caloric Value"] > 0) & (df["kcal_diff"] / df["Caloric Value"].clip(lower=1) > 0.5)]
    print(f"\nRows with large Caloric Value vs Atwater macro mismatch (>50 kcal & >50% diff): {len(bad_kcal)}")
    if len(bad_kcal) > 0:
        print(bad_kcal[["food", "Caloric Value", "est_kcal", "Fat", "Carbohydrates", "Protein", "source_file"]].head(12).to_string(index=False))

    # Zero calorie rows
    zero_cal = df[df["Caloric Value"] == 0]
    print(f"\nZero-calorie rows: {len(zero_cal)}")
    if len(zero_cal) > 0:
        print(zero_cal[["food", "Caloric Value", "Fat", "Sugars", "Protein", "Sodium", "Water"]].head(10).to_string(index=False))

    # Sodium unit verification (g vs mg)
    print("\n=== SODIUM UNIT INSPECTION ===")
    print(df["Sodium"].describe(percentiles=[0.25, 0.5, 0.75, 0.95, 0.99]).to_string())
    print("\nTop 12 foods by Sodium:")
    print(df.nlargest(12, "Sodium")[["food", "Caloric Value", "Sodium", "Water", "source_file"]].to_string(index=False))

    # Serving weight proxy inspection
    df["macro_water_g"] = df["Fat"] + df["Carbohydrates"] + df["Protein"] + df["Water"]
    print("\n=== SERVING WEIGHT PROXY (Fat + Carbs + Protein + Water in g) ===")
    print(df["macro_water_g"].describe(percentiles=[0.1, 0.25, 0.5, 0.75, 0.9, 0.99]).to_string())

    # Key nutrition summary
    key_cols = [
        "Caloric Value", "Fat", "Saturated Fats", "Carbohydrates",
        "Sugars", "Protein", "Dietary Fiber", "Cholesterol", "Sodium", "Water", "Nutrition Density"
    ]
    print("\n=== KEY NUTRITION SUMMARY (RAW) ===")
    print(df[key_cols].describe().round(3).to_string())


if __name__ == "__main__":
    main()
