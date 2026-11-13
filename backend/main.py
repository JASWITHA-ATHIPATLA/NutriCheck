"""FastAPI Backend for HealthGuard – Food Health Analyzer."""

from __future__ import annotations

from datetime import datetime, timezone
from difflib import SequenceMatcher
from pathlib import Path
import re
from typing import Any, Literal
import uuid

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_BUNDLE_PATH = BASE_DIR / "artifacts" / "healthguard_model.joblib"

if not MODEL_BUNDLE_PATH.exists():
    raise RuntimeError(
        f"Trained model artifact not found at {MODEL_BUNDLE_PATH}. "
        "Run `.venv/bin/python ml/train_pipeline.py` first."
    )

BUNDLE: dict[str, Any] = joblib.load(MODEL_BUNDLE_PATH)
MODEL = BUNDLE["model"]
BEST_MODEL_NAME: str = BUNDLE["best_model_name"]
CLASS_LABELS: list[str] = BUNDLE["class_labels"]
CLASS_MEAN_SCORES: dict[str, float] = BUNDLE["class_mean_scores"]
REPORT: dict[str, Any] = BUNDLE["report"]
SAMPLE_FOODS: list[dict[str, Any]] = BUNDLE["sample_foods"]
FOOD_CATALOG: list[dict[str, Any]] = BUNDLE.get("food_catalog", [])

# Live feed of analyzed items triggered by Amazon Add-to-Cart extension or web intake
CART_EVENTS: list[dict[str, Any]] = []

app = FastAPI(
    title="HealthGuard – Food Health Analyzer API",
    version="1.1.0",
    description="Predicts food health classification (Healthy, Moderate, Unhealthy) from nutrition values using a Scikit-learn model saved with Joblib.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class FoodNutritionInput(BaseModel):
    food_name: str = Field(default="Custom Food Item", max_length=160)
    calories: float = Field(..., ge=0, le=10000, description="Calories in kcal")
    sugars: float = Field(..., ge=0, le=1000, description="Total sugars in grams")
    fat: float = Field(..., ge=0, le=1000, description="Total fat in grams")
    protein: float = Field(..., ge=0, le=1000, description="Protein in grams")
    sodium_mg: float = Field(..., ge=0, le=20000, description="Sodium in milligrams")


class AmazonAddToCartInput(BaseModel):
    product_title: str = Field(..., min_length=2, max_length=300)
    product_url: str | None = Field(default=None, max_length=1000)
    nutrition_text: str | None = Field(default=None, max_length=8000)
    calories: float | None = Field(default=None, ge=0, le=10000)
    sugars: float | None = Field(default=None, ge=0, le=1000)
    fat: float | None = Field(default=None, ge=0, le=1000)
    protein: float | None = Field(default=None, ge=0, le=1000)
    sodium_mg: float | None = Field(default=None, ge=0, le=20000)
    source: str = Field(default="amazon_extension", max_length=60)


class NutrientFlag(BaseModel):
    nutrient: str
    value_display: str
    status: Literal["good", "moderate", "high"]
    note: str


class CartAlert(BaseModel):
    level: Literal["success", "warning", "danger"]
    title: str
    message: str


class PredictionResponse(BaseModel):
    food_name: str
    classification: Literal["Healthy", "Moderate", "Unhealthy"]
    health_score: float
    confidence: float
    probabilities: dict[str, float]
    nutrition: dict[str, float]
    nutrient_flags: list[NutrientFlag]
    explanation: str
    cart_alert: CartAlert
    model_used: str


class AmazonCartEvent(BaseModel):
    event_id: str
    timestamp: str
    source: str
    product_title: str
    product_url: str | None
    nutrition_source: str
    matched_food: str | None
    analysis: PredictionResponse


def build_feature_frame(payload: FoodNutritionInput) -> tuple[pd.DataFrame, dict[str, float]]:
    kcal = max(float(payload.calories), 1.0)
    sugars = max(float(payload.sugars), 0.0)
    fat = max(float(payload.fat), 0.0)
    protein = max(float(payload.protein), 0.0)
    sodium_mg = max(float(payload.sodium_mg), 0.0)

    sugar_kcal_pct = float(np.clip(sugars * 4.0 / kcal * 100.0, 0.0, 100.0))
    fat_kcal_pct = float(np.clip(fat * 9.0 / kcal * 100.0, 0.0, 100.0))
    protein_kcal_pct = float(np.clip(protein * 4.0 / kcal * 100.0, 0.0, 100.0))
    sodium_per_100kcal = float(np.clip(sodium_mg / kcal * 100.0, 0.0, 5000.0))

    features = pd.DataFrame(
        [
            {
                "calories": kcal,
                "sugars": sugars,
                "fat": fat,
                "protein": protein,
                "sodium_mg": sodium_mg,
                "sugar_kcal_pct": sugar_kcal_pct,
                "fat_kcal_pct": fat_kcal_pct,
                "protein_kcal_pct": protein_kcal_pct,
                "sodium_per_100kcal": sodium_per_100kcal,
            }
        ]
    )

    nutrition_summary = {
        "calories": round(float(payload.calories), 1),
        "sugars": round(sugars, 1),
        "fat": round(fat, 1),
        "protein": round(protein, 1),
        "sodium_mg": round(sodium_mg, 1),
        "sugar_kcal_pct": round(sugar_kcal_pct, 1),
        "fat_kcal_pct": round(fat_kcal_pct, 1),
        "protein_kcal_pct": round(protein_kcal_pct, 1),
        "sodium_per_100kcal": round(sodium_per_100kcal, 1),
    }
    return features, nutrition_summary


def generate_nutrient_flags_and_explanation(
    classification: str,
    health_score: float,
    food_name: str,
    n: dict[str, float],
) -> tuple[list[NutrientFlag], str, CartAlert]:
    flags: list[NutrientFlag] = []
    concerns: list[str] = []
    strengths: list[str] = []

    if n["sugar_kcal_pct"] > 25.0 or n["sugars"] > 20.0:
        flags.append(
            NutrientFlag(
                nutrient="Sugar",
                value_display=f"{n['sugars']} g",
                status="high",
                note=f"{n['sugar_kcal_pct']}% of calories (above WHO 10% guideline)",
            )
        )
        concerns.append(f"high sugar ({n['sugars']}g, {n['sugar_kcal_pct']}% of calories)")
    elif n["sugar_kcal_pct"] > 10.0 or n["sugars"] > 10.0:
        flags.append(
            NutrientFlag(
                nutrient="Sugar",
                value_display=f"{n['sugars']} g",
                status="moderate",
                note=f"{n['sugar_kcal_pct']}% of calories",
            )
        )
    else:
        flags.append(
            NutrientFlag(
                nutrient="Sugar",
                value_display=f"{n['sugars']} g",
                status="good",
                note=f"{n['sugar_kcal_pct']}% of calories (within WHO <10% target)",
            )
        )
        if n["sugars"] <= 5.0:
            strengths.append("low sugar")

    if n["fat_kcal_pct"] > 45.0:
        flags.append(
            NutrientFlag(
                nutrient="Total Fat",
                value_display=f"{n['fat']} g",
                status="high",
                note=f"{n['fat_kcal_pct']}% of calories (above 30% WHO upper bound)",
            )
        )
        concerns.append(f"fat-dense profile ({n['fat']}g, {n['fat_kcal_pct']}% of calories)")
    elif n["fat_kcal_pct"] > 30.0:
        flags.append(
            NutrientFlag(
                nutrient="Total Fat",
                value_display=f"{n['fat']} g",
                status="moderate",
                note=f"{n['fat_kcal_pct']}% of calories",
            )
        )
    else:
        flags.append(
            NutrientFlag(
                nutrient="Total Fat",
                value_display=f"{n['fat']} g",
                status="good",
                note=f"{n['fat_kcal_pct']}% of calories (balanced fat share)",
            )
        )
        strengths.append("controlled fat")

    if n["protein_kcal_pct"] >= 20.0:
        flags.append(
            NutrientFlag(
                nutrient="Protein",
                value_display=f"{n['protein']} g",
                status="good",
                note=f"{n['protein_kcal_pct']}% of calories (protein-rich)",
            )
        )
        strengths.append(f"strong protein ({n['protein']}g)")
    elif n["protein_kcal_pct"] >= 10.0:
        flags.append(
            NutrientFlag(
                nutrient="Protein",
                value_display=f"{n['protein']} g",
                status="moderate",
                note=f"{n['protein_kcal_pct']}% of calories",
            )
        )
    else:
        flags.append(
            NutrientFlag(
                nutrient="Protein",
                value_display=f"{n['protein']} g",
                status="high" if n["calories"] >= 120 else "moderate",
                note=f"{n['protein_kcal_pct']}% of calories (low protein density)",
            )
        )
        if n["calories"] >= 120:
            concerns.append(f"minimal protein ({n['protein']}g)")

    if n["sodium_per_100kcal"] > 220.0 or n["sodium_mg"] > 600.0:
        flags.append(
            NutrientFlag(
                nutrient="Sodium",
                value_display=f"{int(round(n['sodium_mg']))} mg",
                status="high",
                note=f"{int(round(n['sodium_per_100kcal']))} mg per 100 kcal (high sodium load)",
            )
        )
        concerns.append(f"elevated sodium ({int(round(n['sodium_mg']))} mg)")
    elif n["sodium_per_100kcal"] > 115.0 or n["sodium_mg"] > 300.0:
        flags.append(
            NutrientFlag(
                nutrient="Sodium",
                value_display=f"{int(round(n['sodium_mg']))} mg",
                status="moderate",
                note=f"{int(round(n['sodium_per_100kcal']))} mg per 100 kcal",
            )
        )
    else:
        flags.append(
            NutrientFlag(
                nutrient="Sodium",
                value_display=f"{int(round(n['sodium_mg']))} mg",
                status="good",
                note=f"{int(round(n['sodium_per_100kcal']))} mg per 100 kcal (low sodium)",
            )
        )
        strengths.append("low sodium")

    if classification == "Healthy":
        pos_text = ", ".join(strengths[:3]) if strengths else "balanced macronutrients"
        explanation = (
            f"{food_name} is classified as Healthy (score {health_score}/100) due to {pos_text} "
            f"across {n['calories']} kcal."
        )
        cart_alert = CartAlert(
            level="success",
            title="Healthy Choice Added",
            message=f"{food_name} scored {health_score}/100 with a balanced nutrient profile. Safe for everyday meals.",
        )
    elif classification == "Moderate":
        driver = (
            f"driven by {', '.join(concerns[:2])}"
            if concerns
            else "due to borderline sugar, fat, or sodium density"
        )
        explanation = (
            f"{food_name} is classified as Moderate (score {health_score}/100), {driver}. "
            "Enjoy in controlled portions alongside fiber-rich whole foods."
        )
        cart_alert = CartAlert(
            level="warning",
            title="Moderation Recommended",
            message=f"{food_name} scored {health_score}/100 (Moderate). Watch portion size if pairing with high-sodium or sugary items.",
        )
    else:
        driver = (
            f"driven by {', '.join(concerns[:3])}"
            if concerns
            else "due to excessive energy-adjusted sugar, fat, or sodium"
        )
        explanation = (
            f"{food_name} is classified as Unhealthy (score {health_score}/100), {driver}. "
            "Frequent intake may exceed daily WHO/FDA sugar, fat, or sodium limits."
        )
        cart_alert = CartAlert(
            level="danger",
            title="Health Warning: Unhealthy Item",
            message=f"Alert: {food_name} scored {health_score}/100 ({', '.join(concerns[:2]) if concerns else 'poor nutrient balance'}). Consider a lower-sugar or lower-sodium alternative.",
        )

    return flags, explanation, cart_alert


def run_ml_prediction(payload: FoodNutritionInput) -> PredictionResponse:
    features_df, nutrition_summary = build_feature_frame(payload)
    model_classes = list(MODEL.classes_)
    probs_raw = MODEL.predict_proba(features_df)[0]
    prob_map = {str(cls): float(p) for cls, p in zip(model_classes, probs_raw)}

    pred_label = str(MODEL.predict(features_df)[0])
    confidence = round(prob_map[pred_label] * 100.0, 1)

    weighted_score = sum(
        prob_map.get(lbl, 0.0) * CLASS_MEAN_SCORES[lbl] for lbl in CLASS_LABELS
    )
    if pred_label == "Healthy":
        health_score = max(weighted_score, 68.0)
    elif pred_label == "Moderate":
        health_score = float(np.clip(weighted_score, 44.0, 67.9))
    else:
        health_score = min(weighted_score, 43.9)
    health_score = round(float(np.clip(health_score, 0.0, 100.0)), 1)

    food_name = payload.food_name.strip() or "Custom Food Item"
    flags, explanation, cart_alert = generate_nutrient_flags_and_explanation(
        pred_label, health_score, food_name, nutrition_summary
    )

    return PredictionResponse(
        food_name=food_name,
        classification=pred_label,  # type: ignore[arg-type]
        health_score=health_score,
        confidence=confidence,
        probabilities={lbl: round(prob_map.get(lbl, 0.0) * 100.0, 1) for lbl in CLASS_LABELS},
        nutrition=nutrition_summary,
        nutrient_flags=flags,
        explanation=explanation,
        cart_alert=cart_alert,
        model_used=BEST_MODEL_NAME,
    )


def parse_nutrition_text(text: str) -> dict[str, float] | None:
    """Extract calories, sugars, fat, protein, and sodium (mg) from nutrition label text."""
    if not text or not text.strip():
        return None
    normalized = " ".join(text.replace("\n", " ").split())

    cal_match = re.search(
        r"(?:calories|energy)\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*(?:kcal|cal)?",
        normalized,
        re.IGNORECASE,
    )
    if not cal_match:
        return None
    calories = float(cal_match.group(1))

    def extract_grams(pattern: str) -> float | None:
        m = re.search(pattern, normalized, re.IGNORECASE)
        return float(m.group(1)) if m else None

    sugars = extract_grams(r"(?:total\s+)?sugars?\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*g")
    fat = extract_grams(r"(?:total\s+)?fat\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*g")
    protein = extract_grams(r"protein\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*g")

    sodium_mg: float | None = None
    sod_mg_match = re.search(
        r"sodium\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*mg", normalized, re.IGNORECASE
    )
    sod_g_match = re.search(
        r"sodium\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*g\b", normalized, re.IGNORECASE
    )
    salt_g_match = re.search(
        r"salt\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*g\b", normalized, re.IGNORECASE
    )
    if sod_mg_match:
        sodium_mg = float(sod_mg_match.group(1))
    elif sod_g_match:
        sodium_mg = float(sod_g_match.group(1)) * 1000.0
    elif salt_g_match:
        sodium_mg = float(salt_g_match.group(1)) * 393.4

    found_macros = sum(x is not None for x in (sugars, fat, protein, sodium_mg))
    if found_macros < 2:
        return None

    return {
        "calories": calories,
        "sugars": sugars if sugars is not None else 0.0,
        "fat": fat if fat is not None else 0.0,
        "protein": protein if protein is not None else 0.0,
        "sodium_mg": sodium_mg if sodium_mg is not None else 0.0,
    }


STOP_WORDS = {
    "pack", "oz", "fl", "ml", "g", "kg", "lb", "lbs", "count", "ct", "bag",
    "box", "bottle", "can", "jar", "organic", "fresh", "natural", "amazon",
    "brand", "size", "family", "value", "snack", "food", "with", "and", "the",
    "for", "in", "of", "original", "classic", "new",
}


def match_catalog_food(product_title: str) -> dict[str, Any] | None:
    """Find best food match from the cleaned 2,158-food CSV catalog."""
    cleaned = re.sub(r"[^a-z0-9\s]", " ", product_title.lower())
    tokens = [t for t in cleaned.split() if len(t) > 2 and t not in STOP_WORDS and not t.isdigit()]
    if not tokens:
        return None
    query = " ".join(tokens)

    best_score = 0.0
    best_entry: dict[str, Any] | None = None
    q_set = set(tokens)

    for entry in FOOD_CATALOG:
        cand = entry["food_norm"]
        c_tokens = [t for t in cand.split() if len(t) > 2]
        if not c_tokens:
            continue
        c_set = set(c_tokens)
        overlap = len(q_set & c_set)
        if overlap == 0:
            continue

        jaccard = overlap / len(q_set | c_set)
        containment = overlap / len(c_set)
        seq = SequenceMatcher(None, query, cand).ratio()
        score = 0.45 * containment + 0.30 * jaccard + 0.25 * seq

        if cand in query:
            score += 0.20

        if score > best_score:
            best_score = score
            best_entry = entry

    if best_score < 0.42:
        return None
    return best_entry


@app.get("/api/health")
def health_check() -> dict[str, Any]:
    return {
        "status": "ok",
        "model": BEST_MODEL_NAME,
        "cleaned_dataset_rows": REPORT["cleaning_summary"]["cleaned_rows"],
    }


@app.get("/api/metrics")
def get_metrics() -> dict[str, Any]:
    return REPORT


@app.get("/api/samples")
def get_samples() -> list[dict[str, Any]]:
    return SAMPLE_FOODS


@app.get("/api/foods")
def search_catalog_foods(q: str = "", limit: int = 12) -> list[dict[str, Any]]:
    limit = max(1, min(limit, 40))
    query = q.strip().lower()
    if not query:
        # Return a balanced real mix from the cleaned CSVs
        featured_names = {
            "broccoli cooked",
            "salmon cooked",
            "oatmeal bread",
            "spinach spaghetti cooked",
            "banana",
            "pepperoni pizza dominos",
            "french fries mcdonalds",
            "chocolate pudding",
            "root beer",
            "apple crisp",
            "cheddar cheese",
            "oatmeal cookies",
        }
        featured = [f for f in FOOD_CATALOG if f["food_norm"] in featured_names]
        if len(featured) >= limit:
            return featured[:limit]
        seen = {f["food_norm"] for f in featured}
        for f in FOOD_CATALOG:
            if f["food_norm"] not in seen:
                featured.append(f)
                if len(featured) >= limit:
                    break
        return featured

    matches = [f for f in FOOD_CATALOG if query in f["food_norm"]]
    return matches[:limit]


@app.post("/api/predict", response_model=PredictionResponse)
def predict_food_health(payload: FoodNutritionInput) -> PredictionResponse:
    try:
        return run_ml_prediction(payload)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {exc}") from exc


@app.post("/api/amazon/add-to-cart", response_model=AmazonCartEvent)
def analyze_amazon_add_to_cart(payload: AmazonAddToCartInput) -> AmazonCartEvent:
    title = payload.product_title.strip()
    nutrition_source = ""
    matched_food: str | None = None

    has_explicit_numbers = all(
        v is not None
        for v in (
            payload.calories,
            payload.sugars,
            payload.fat,
            payload.protein,
            payload.sodium_mg,
        )
    )

    if has_explicit_numbers:
        nutrition_source = "Structured Nutrition Inputs"
        nutrition_input = FoodNutritionInput(
            food_name=title,
            calories=float(payload.calories),  # type: ignore[arg-type]
            sugars=float(payload.sugars),  # type: ignore[arg-type]
            fat=float(payload.fat),  # type: ignore[arg-type]
            protein=float(payload.protein),  # type: ignore[arg-type]
            sodium_mg=float(payload.sodium_mg),  # type: ignore[arg-type]
        )
    else:
        parsed = parse_nutrition_text(payload.nutrition_text or "")
        if parsed is not None:
            nutrition_source = "Amazon Page Nutrition Text"
            nutrition_input = FoodNutritionInput(
                food_name=title,
                calories=parsed["calories"],
                sugars=parsed["sugars"],
                fat=parsed["fat"],
                protein=parsed["protein"],
                sodium_mg=parsed["sodium_mg"],
            )
        else:
            match = match_catalog_food(title)
            if match is None:
                raise HTTPException(
                    status_code=422,
                    detail=(
                        f"No nutrition numbers found on page and '{title}' did not match a food item "
                        "in the cleaned 2,158-food dataset. Paste the nutrition facts text or enter values manually."
                    ),
                )
            nutrition_source = f"Matched Dataset Food ({match['source_group']})"
            matched_food = str(match["food"])
            nutrition_input = FoodNutritionInput(
                food_name=title,
                calories=float(match["calories"]),
                sugars=float(match["sugars"]),
                fat=float(match["fat"]),
                protein=float(match["protein"]),
                sodium_mg=float(match["sodium_mg"]),
            )

    analysis = run_ml_prediction(nutrition_input)
    event = AmazonCartEvent(
        event_id=str(uuid.uuid4())[:8],
        timestamp=datetime.now(timezone.utc).isoformat(),
        source=payload.source,
        product_title=title,
        product_url=payload.product_url,
        nutrition_source=nutrition_source,
        matched_food=matched_food,
        analysis=analysis,
    )

    CART_EVENTS.insert(0, event.model_dump())
    del CART_EVENTS[30:]
    return event


@app.get("/api/amazon/cart-events", response_model=list[AmazonCartEvent])
def list_amazon_cart_events() -> list[dict[str, Any]]:
    return CART_EVENTS


@app.delete("/api/amazon/cart-events/{event_id}")
def delete_amazon_cart_event(event_id: str) -> dict[str, str]:
    global CART_EVENTS
    CART_EVENTS = [e for e in CART_EVENTS if e["event_id"] != event_id]
    return {"status": "deleted"}


@app.delete("/api/amazon/cart-events")
def clear_amazon_cart_events() -> dict[str, str]:
    CART_EVENTS.clear()
    return {"status": "cleared"}
