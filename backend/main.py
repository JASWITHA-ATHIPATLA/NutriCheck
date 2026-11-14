"""FastAPI Backend for HealthGuard – Food Health Analyzer."""

from __future__ import annotations

from datetime import datetime, timezone
from difflib import SequenceMatcher
import json
from pathlib import Path
import re
from typing import Any, Literal
import urllib.parse
import urllib.request
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
    title="NutriCheck – Food & Packet Nutrition Analyzer API",
    version="1.2.0",
    description="Predicts food health classification (Good/Moderate/Not Good) from nutrition values and packet ingredients using Scikit-learn and WHO/FDA nutrient rules.",
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
    ingredients_text: str | None = Field(default=None, max_length=6000)
    brand: str | None = Field(default=None, max_length=120)
    barcode: str | None = Field(default=None, max_length=40)
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


class IngredientFinding(BaseModel):
    ingredient: str
    rating: Literal["good", "moderate", "high"]
    reason: str


class ScanReason(BaseModel):
    type: Literal["good", "warning", "danger"]
    text: str


class PacketScanResponse(BaseModel):
    product_name: str
    verdict: Literal["Good", "Moderate", "Not Good"]
    score: float
    nutrition_found: bool
    ingredients_count: int
    parsed_ingredients: list[str]
    ingredient_findings: list[IngredientFinding]
    reasons: list[ScanReason]
    summary: str
    nutrition_analysis: PredictionResponse | None = None


class AmazonCartEvent(BaseModel):
    event_id: str
    timestamp: str
    source: str
    status: Literal["analyzed", "needs_nutrition"] = "analyzed"
    product_title: str
    product_url: str | None
    nutrition_source: str
    matched_food: str | None
    message: str | None = None
    analysis: PredictionResponse | None = None
    ingredients_text: str | None = None
    ingredient_scan: PacketScanResponse | None = None


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


def _is_whole_nut_or_seed(name: str, sugars: float, sodium_mg: float) -> bool:
    lower = (name or "").lower()
    has_nut = bool(re.search(r"\b(almonds?|badam|walnuts?|akhrot|pistachios?|pista|cashews?|kaju|peanuts?|hazelnuts?|pecans?|macadamias?|chia|flax(?:seeds?)?|pumpkin seeds?|sunflower seeds?|sesame|mixed nuts?|dry\s*fruits?|dryfruits?|panchmewa|trail mix|nut\s*mix|nutmix|makhana|fox nuts?|olive oil)\b", lower))
    has_junk = bool(re.search(r"\b(chocolate|candy|bar|cookie|biscuit|cake|pastry|ice cream|fried|chips|namkeen|bhujia|caramel|sugar coated|syrup|honey roasted|salted|masala|butter|nutella|sauce)\b", lower))
    return has_nut and not has_junk and sodium_mg <= 180.0 and sugars <= 30.0


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
    if _is_whole_nut_or_seed(food_name, nutrition_summary["sugars"], nutrition_summary["sodium_mg"]):
        pred_label = "Healthy"
        health_score = max(health_score, 80.5)
        confidence = max(confidence, 82.0)

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
    normalized = " ".join(text.replace("\n", " ").replace("\t", " ").split())

    cal_match = re.search(
        r"(?:calories|energy(?:\s*\(\s*kcal\s*\))?)\s*[:|\-]?\s*(\d+(?:\.\d+)?)\s*(?:kcal|cal)?",
        normalized,
        re.IGNORECASE,
    )
    if not cal_match:
        return None
    calories = float(cal_match.group(1))

    def extract_grams(pattern: str) -> float | None:
        m = re.search(pattern, normalized, re.IGNORECASE)
        return float(m.group(1)) if m else None

    sugars = extract_grams(
        r"(?:total\s+sugars?|of\s+which\s+sugars?|added\s+sugars?|sugars?)\s*[:|\-]?\s*(\d+(?:\.\d+)?)\s*g\b"
    )
    fat = extract_grams(r"(?:total\s+)?fat\s*[:|\-]?\s*(\d+(?:\.\d+)?)\s*g\b")
    protein = extract_grams(r"protein\s*[:|\-]?\s*(\d+(?:\.\d+)?)\s*g\b")
    carbs = extract_grams(r"(?:total\s+)?carbohydrate[s]?\s*[:|\-]?\s*(\d+(?:\.\d+)?)\s*g\b")

    sodium_mg: float | None = None
    sod_mg_match = re.search(
        r"sodium\s*[:|\-]?\s*(\d+(?:\.\d+)?)\s*mg\b", normalized, re.IGNORECASE
    )
    sod_g_match = re.search(
        r"sodium\s*[:|\-]?\s*(\d+(?:\.\d+)?)\s*g\b", normalized, re.IGNORECASE
    )
    salt_g_match = re.search(
        r"salt\s*[:|\-]?\s*(\d+(?:\.\d+)?)\s*g\b", normalized, re.IGNORECASE
    )
    if sod_mg_match:
        sodium_mg = float(sod_mg_match.group(1))
    elif sod_g_match:
        sodium_mg = float(sod_g_match.group(1)) * 1000.0
    elif salt_g_match:
        sodium_mg = float(salt_g_match.group(1)) * 393.4

    found_macros = sum(x is not None for x in (sugars, fat, protein, sodium_mg, carbs))
    if found_macros < 1:
        return None

    return {
        "calories": calories,
        "sugars": sugars if sugars is not None else 0.0,
        "fat": fat if fat is not None else 0.0,
        "protein": protein if protein is not None else 0.0,
        "sodium_mg": sodium_mg if sodium_mg is not None else 0.0,
    }


STOP_WORDS = {
    "pack", "oz", "fl", "ml", "g", "gm", "gms", "gram", "grams", "kg", "kgs", "lb", "lbs",
    "ltr", "litre", "litres", "liter", "liters", "count", "ct", "pcs", "piece", "pieces",
    "bag", "box", "bottle", "can", "jar", "pouch", "tin", "refill", "combo", "offer",
    "organic", "fresh", "natural", "amazon", "brand", "size", "family", "value", "snack",
    "food", "with", "and", "the", "for", "in", "of", "original", "classic", "new", "buy",
    "get", "free", "save", "saver", "best", "seller", "bestseller", "super", "mini",
    "jumbo", "mega", "tasty", "delicious", "flavour", "flavor", "flavoured", "flavored",
    "india", "made", "weight", "may", "vary", "rs", "mrp", "vegetarian", "ready", "minute",
    "minutes", "min", "mins", "instant", "each", "total", "assorted", "multipack",
}

OFF_SEARCH_CACHE: dict[str, list[dict[str, Any]]] = {}
OFF_PRODUCT_CACHE: dict[str, dict[str, Any] | None] = {}


def _stem_token(token: str) -> str:
    if token.endswith("ies") and len(token) > 4:
        return token[:-3] + "y"
    if token.endswith("s") and not token.endswith("ss") and len(token) > 3:
        return token[:-1]
    return token


def _clean_tokens(text: str) -> list[str]:
    # Strip weight+unit combos like 500g, 1.5kg, 200ml, 12oz, rs.20
    stripped = re.sub(
        r"\b\d+(?:\.\d+)?\s*(?:g|gm|gms|kg|kgs|ml|l|ltr|litre|litres|oz|lb|lbs|pcs|ct|rs)\b",
        " ",
        text.lower(),
    )
    cleaned = re.sub(r"[^a-z0-9\s]", " ", stripped)
    return [
        t
        for t in cleaned.split()
        if len(t) > 1 and t not in STOP_WORDS and not t.isdigit()
    ]


GROCERY_STAPLE_PROFILES: list[dict[str, Any]] = [
    {"keywords": ["brown rice", "red rice", "black rice", "wild rice"], "name": "Brown Rice (Whole Grain, per 100g)", "calories": 362.0, "sugars": 0.7, "fat": 2.7, "protein": 7.5, "sodium_mg": 4.0},
    {"keywords": ["basmati rice", "sona masoori", "jasmine rice", "ponni rice", "white rice", "rice"], "name": "Rice (Dry Grain, per 100g)", "calories": 356.0, "sugars": 0.1, "fat": 0.6, "protein": 7.1, "sodium_mg": 5.0},
    {"keywords": ["quinoa"], "name": "Quinoa (Whole Grain, per 100g)", "calories": 368.0, "sugars": 1.6, "fat": 6.1, "protein": 14.1, "sodium_mg": 5.0},
    {"keywords": ["rolled oats", "steel cut oats", "oats", "oatmeal"], "name": "Wholegrain Oats (per 100g)", "calories": 375.0, "sugars": 1.0, "fat": 7.0, "protein": 13.0, "sodium_mg": 5.0},
    {"keywords": ["muesli", "granola"], "name": "Granola / Muesli (per 100g)", "calories": 410.0, "sugars": 18.0, "fat": 11.5, "protein": 9.5, "sodium_mg": 180.0},
    {"keywords": ["cornflakes", "corn flakes", "cereal"], "name": "Breakfast Cornflakes (per 100g)", "calories": 378.0, "sugars": 9.5, "fat": 0.9, "protein": 7.5, "sodium_mg": 620.0},
    {"keywords": ["whole wheat", "atta", "multigrain flour", "chakki", "ragi", "millet", "jowar", "bajra", "besan", "poha", "suji", "rava"], "name": "Whole Grain Flour / Atta / Millet (per 100g)", "calories": 341.0, "sugars": 0.4, "fat": 1.8, "protein": 12.1, "sodium_mg": 3.0},
    {"keywords": ["maida", "all purpose flour", "refined flour"], "name": "Refined White Flour / Maida (per 100g)", "calories": 364.0, "sugars": 0.3, "fat": 1.0, "protein": 10.3, "sodium_mg": 2.0},
    {"keywords": ["toor dal", "moong dal", "masoor dal", "chana dal", "urad dal", "lentil", "dal", "rajma", "chickpea", "kabuli chana"], "name": "Lentils / Dal (Dry, per 100g)", "calories": 343.0, "sugars": 2.0, "fat": 1.5, "protein": 22.3, "sodium_mg": 12.0},
    {"keywords": ["brown bread", "whole wheat bread", "multigrain bread"], "name": "Whole Wheat Bread (per 100g)", "calories": 252.0, "sugars": 4.3, "fat": 3.4, "protein": 11.2, "sodium_mg": 440.0},
    {"keywords": ["white bread", "milk bread", "bread", "bun", "pav"], "name": "Packaged Bread (per 100g)", "calories": 266.0, "sugars": 5.7, "fat": 3.3, "protein": 8.9, "sodium_mg": 490.0},
    {"keywords": ["instant noodles", "maggi", "ramen", "yippee", "top ramen", "cup noodles", "noodles"], "name": "Instant Noodles (per 100g)", "calories": 427.0, "sugars": 2.1, "fat": 15.7, "protein": 8.2, "sodium_mg": 1120.0},
    {"keywords": ["pasta", "spaghetti", "macaroni", "penne", "fusilli", "vermicelli"], "name": "Dry Pasta / Vermicelli (per 100g)", "calories": 358.0, "sugars": 2.7, "fat": 1.5, "protein": 12.8, "sodium_mg": 6.0},
    {"keywords": ["potato chips", "lays", "kurkure", "bingo", "doritos", "pringles", "nachos", "namkeen", "bhujia", "mixture", "chips", "popcorn"], "name": "Packaged Chips / Namkeen (per 100g)", "calories": 536.0, "sugars": 1.5, "fat": 34.0, "protein": 6.8, "sodium_mg": 620.0},
    {"keywords": ["biscuit", "cookies", "oreo", "parle", "good day", "bourbon", "marie", "cracker", "rusk", "wafer", "cake", "donut", "pastry"], "name": "Packaged Biscuits / Baked Snack (per 100g)", "calories": 472.0, "sugars": 24.0, "fat": 19.5, "protein": 6.4, "sodium_mg": 340.0},
    {"keywords": ["dark chocolate"], "name": "Dark Chocolate (per 100g)", "calories": 546.0, "sugars": 24.0, "fat": 31.0, "protein": 7.8, "sodium_mg": 20.0},
    {"keywords": ["chocolate", "dairy milk", "kitkat", "snickers", "mars", "candy", "toffee", "barfi", "gulab jamun"], "name": "Chocolate / Confectionery (per 100g)", "calories": 535.0, "sugars": 51.5, "fat": 29.7, "protein": 7.6, "sodium_mg": 79.0},
    {"keywords": ["coca cola", "pepsi", "sprite", "fanta", "thums up", "mountain dew", "soft drink", "soda", "cola", "energy drink", "red bull"], "name": "Sweetened Soft Drink (per 250ml)", "calories": 105.0, "sugars": 26.5, "fat": 0.0, "protein": 0.0, "sodium_mg": 22.0},
    {"keywords": ["fruit juice", "real juice", "tropicana", "mango drink", "frooti", "maaza", "juice"], "name": "Packaged Fruit Juice / Nectar (per 250ml)", "calories": 120.0, "sugars": 27.0, "fat": 0.0, "protein": 0.4, "sodium_mg": 25.0},
    {"keywords": ["coconut water", "mineral water", "drinking water"], "name": "Coconut / Natural Hydration Drink (per 250ml)", "calories": 46.0, "sugars": 6.0, "fat": 0.0, "protein": 0.5, "sodium_mg": 45.0},
    {"keywords": ["green tea", "herbal tea", "chamomile", "black tea", "tea", "chai", "coffee", "espresso", "nescafe"], "name": "Unsweetened Tea / Coffee (Prepared)", "calories": 5.0, "sugars": 0.0, "fat": 0.0, "protein": 0.3, "sodium_mg": 4.0},
    {"keywords": ["milk", "toned milk", "skim milk", "almond milk", "soy milk", "lassi", "buttermilk"], "name": "Milk / Dairy Beverage (per 100ml)", "calories": 61.0, "sugars": 4.8, "fat": 3.3, "protein": 3.2, "sodium_mg": 43.0},
    {"keywords": ["greek yogurt", "yogurt", "curd", "dahi"], "name": "Plain Yogurt / Curd (per 100g)", "calories": 63.0, "sugars": 4.0, "fat": 3.3, "protein": 4.2, "sodium_mg": 46.0},
    {"keywords": ["paneer", "cottage cheese", "tofu"], "name": "Paneer / Cottage Cheese (per 100g)", "calories": 265.0, "sugars": 1.2, "fat": 20.8, "protein": 18.3, "sodium_mg": 30.0},
    {"keywords": ["mozzarella", "cheddar", "cheese"], "name": "Processed / Cheddar Cheese (per 100g)", "calories": 375.0, "sugars": 1.0, "fat": 31.0, "protein": 22.0, "sodium_mg": 680.0},
    {"keywords": ["butter"], "name": "Salted Butter (per 100g)", "calories": 717.0, "sugars": 0.1, "fat": 81.1, "protein": 0.9, "sodium_mg": 643.0},
    {"keywords": ["ghee"], "name": "Clarified Butter / Ghee (per 100g)", "calories": 876.0, "sugars": 0.0, "fat": 99.5, "protein": 0.0, "sodium_mg": 2.0},
    {"keywords": ["olive oil"], "name": "Extra Virgin Olive Oil (per tbsp 15ml)", "calories": 119.0, "sugars": 0.0, "fat": 13.5, "protein": 0.0, "sodium_mg": 0.0},
    {"keywords": ["sunflower oil", "mustard oil", "groundnut oil", "coconut oil", "cooking oil", "refined oil", "oil"], "name": "Cooking Oil (per tbsp 15ml)", "calories": 120.0, "sugars": 0.0, "fat": 14.0, "protein": 0.0, "sodium_mg": 0.0},
    {"keywords": ["peanut butter", "almond butter"], "name": "Nut / Peanut Butter (per 100g)", "calories": 588.0, "sugars": 9.2, "fat": 50.0, "protein": 25.1, "sodium_mg": 420.0},
    {"keywords": ["mixed dry fruits", "dry fruits", "dry fruit", "dryfruits", "dryfruit", "panchmewa", "mixed nuts", "trail mix", "nut mix", "nutmix"], "name": "Mixed Dry Fruits & Nuts (per 100g)", "calories": 465.0, "sugars": 14.0, "fat": 28.5, "protein": 14.2, "sodium_mg": 6.0},
    {"keywords": ["almonds", "almond", "badam", "walnuts", "walnut", "akhrot", "pistachios", "pistachio", "pista", "cashews", "cashew", "kaju", "peanuts", "peanut", "hazelnuts", "hazelnut", "pecans", "pecan", "macadamia", "chia seeds", "chia", "flaxseeds", "flax seeds", "flax", "pumpkin seeds", "pumpkin seed", "sunflower seeds", "sunflower seed", "makhana", "fox nut", "fox nuts"], "name": "Nuts & Seeds (per 100g)", "calories": 579.0, "sugars": 4.4, "fat": 49.9, "protein": 21.2, "sodium_mg": 4.0},
    {"keywords": ["dates", "datiles", "khajoor", "raisins", "raisin", "kishmish", "anjeer", "dried fig", "dried figs", "dried apricot", "dried apricots"], "name": "Dried Dates / Raisins / Figs (per 100g)", "calories": 282.0, "sugars": 63.0, "fat": 0.4, "protein": 2.5, "sodium_mg": 3.0},
    {"keywords": ["honey"], "name": "Honey (per 100g)", "calories": 304.0, "sugars": 82.1, "fat": 0.0, "protein": 0.3, "sodium_mg": 4.0},
    {"keywords": ["jaggery", "gur", "sugar"], "name": "Sugar / Sweetener (per 100g)", "calories": 387.0, "sugars": 99.8, "fat": 0.0, "protein": 0.0, "sodium_mg": 1.0},
    {"keywords": ["ketchup", "tomato sauce", "sauce", "chutney"], "name": "Tomato Ketchup / Sauce (per 100g)", "calories": 112.0, "sugars": 22.8, "fat": 0.1, "protein": 1.7, "sodium_mg": 907.0},
    {"keywords": ["mayonnaise", "mayo", "dressing"], "name": "Mayonnaise / Dressing (per 100g)", "calories": 680.0, "sugars": 1.0, "fat": 75.0, "protein": 1.0, "sodium_mg": 635.0},
    {"keywords": ["jam", "marmalade", "nutella", "spread"], "name": "Fruit Jam / Sweet Spread (per 100g)", "calories": 278.0, "sugars": 48.5, "fat": 0.1, "protein": 0.4, "sodium_mg": 32.0},
    {"keywords": ["whey protein", "protein powder", "protein bar"], "name": "Protein Supplement / Bar (per serving)", "calories": 130.0, "sugars": 2.5, "fat": 2.0, "protein": 24.0, "sodium_mg": 140.0},
    {"keywords": ["egg"], "name": "Eggs (per 100g)", "calories": 143.0, "sugars": 0.4, "fat": 9.5, "protein": 12.6, "sodium_mg": 142.0},
    {"keywords": ["chicken"], "name": "Chicken Breast (per 100g)", "calories": 165.0, "sugars": 0.0, "fat": 3.6, "protein": 31.0, "sodium_mg": 74.0},
    {"keywords": ["salmon", "tuna", "fish", "prawns"], "name": "Fish / Seafood (per 100g)", "calories": 184.0, "sugars": 0.0, "fat": 8.1, "protein": 25.4, "sodium_mg": 62.0},
    {"keywords": ["turmeric", "cumin", "coriander", "garam masala", "masala", "pepper", "cinnamon", "spice", "seasoning"], "name": "Culinary Spices / Herbs (per 10g)", "calories": 31.0, "sugars": 0.3, "fat": 0.8, "protein": 1.1, "sodium_mg": 18.0},
    {"keywords": ["salt", "rock salt", "sea salt"], "name": "Culinary Salt (per 5g)", "calories": 0.0, "sugars": 0.0, "fat": 0.0, "protein": 0.0, "sodium_mg": 1938.0},
    {"keywords": ["apple", "banana", "orange", "mango", "berry", "berries", "grape", "watermelon", "fruit"], "name": "Fresh Fruit (per 100g)", "calories": 58.0, "sugars": 11.2, "fat": 0.2, "protein": 0.7, "sodium_mg": 1.0},
    {"keywords": ["broccoli", "spinach", "carrot", "tomato", "onion", "potato", "beans", "peas", "vegetable"], "name": "Fresh Vegetable (per 100g)", "calories": 42.0, "sugars": 2.5, "fat": 0.3, "protein": 2.1, "sodium_mg": 22.0},
    {"keywords": ["ice cream", "kulfi", "gelato"], "name": "Ice Cream (per 100g)", "calories": 207.0, "sugars": 21.2, "fat": 11.0, "protein": 3.5, "sodium_mg": 80.0},
    {"keywords": ["pickle", "achar", "papad"], "name": "Pickles / Papad (per 100g)", "calories": 220.0, "sugars": 2.0, "fat": 11.0, "protein": 4.5, "sodium_mg": 2400.0},
]


def match_grocery_staple(product_title: str) -> dict[str, Any] | None:
    norm = re.sub(r"\s+", " ", re.sub(r"[^a-z0-9\s]", " ", product_title.lower())).strip()
    if not norm:
        return None
    best_profile: dict[str, Any] | None = None
    best_len = 0
    for profile in GROCERY_STAPLE_PROFILES:
        for kw in profile["keywords"]:
            if re.search(rf"\b{re.escape(kw)}\b", norm) and len(kw) > best_len:
                best_profile = profile
                best_len = len(kw)
    if best_profile is None:
        return None
    return {
        "food": best_profile["name"],
        "food_norm": best_profile["name"].lower(),
        "calories": best_profile["calories"],
        "sugars": best_profile["sugars"],
        "fat": best_profile["fat"],
        "protein": best_profile["protein"],
        "sodium_mg": best_profile["sodium_mg"],
        "source_group": "Grocery Staple Nutrition Profile",
    }


def match_catalog_food(product_title: str, min_score: float = 0.44) -> dict[str, Any] | None:
    """Find best food match from the cleaned 2,158-food CSV catalog."""
    tokens = _clean_tokens(product_title)
    if not tokens:
        return None
    query = " ".join(tokens)
    q_set = set(tokens)
    q_stems = {_stem_token(t) for t in tokens}

    best_score = 0.0
    best_entry: dict[str, Any] | None = None

    for entry in FOOD_CATALOG:
        cand = entry["food_norm"]
        c_tokens = [t for t in cand.split() if len(t) > 1]
        if not c_tokens:
            continue
        c_set = set(c_tokens)
        c_stems = {_stem_token(t) for t in c_tokens}

        overlap = len(q_set & c_set)
        stem_overlap = len(q_stems & c_stems)
        eff_overlap = max(overlap, stem_overlap)
        if eff_overlap == 0:
            continue

        jaccard = eff_overlap / len(q_stems | c_stems)
        containment = eff_overlap / len(c_stems)
        seq = SequenceMatcher(None, query, cand).ratio()
        score = 0.45 * containment + 0.30 * jaccard + 0.25 * seq

        if cand in query:
            score += 0.20

        if score > best_score:
            best_score = score
            best_entry = entry

    if best_score < min_score:
        return None
    return best_entry


def _to_float(val: Any) -> float | None:
    try:
        if val is None or val == "":
            return None
        f = float(val)
        return f if np.isfinite(f) and f >= 0 else None
    except (TypeError, ValueError):
        return None


def extract_off_nutrition(nutriments: dict[str, Any] | None) -> dict[str, float] | None:
    """Extract normalized per-100g nutrition from an Open Food Facts nutriments payload."""
    if not isinstance(nutriments, dict) or not nutriments:
        return None

    kcal = _to_float(nutriments.get("energy-kcal_100g"))
    if kcal is None:
        kcal = _to_float(nutriments.get("energy-kcal"))
    if kcal is None:
        kj = _to_float(nutriments.get("energy_100g"))
        if kj is not None and kj > 0:
            kcal = kj / 4.184
    if kcal is None or kcal < 1.0 or kcal > 950.0:
        return None

    sugars = _to_float(nutriments.get("sugars_100g"))
    if sugars is None:
        sugars = _to_float(nutriments.get("sugars"))

    fat = _to_float(nutriments.get("fat_100g"))
    if fat is None:
        fat = _to_float(nutriments.get("fat"))

    protein = _to_float(nutriments.get("proteins_100g"))
    if protein is None:
        protein = _to_float(nutriments.get("proteins"))

    sodium_g = _to_float(nutriments.get("sodium_100g"))
    if sodium_g is None:
        sodium_g = _to_float(nutriments.get("sodium"))
    salt_g = _to_float(nutriments.get("salt_100g"))
    if salt_g is None:
        salt_g = _to_float(nutriments.get("salt"))

    sodium_mg: float | None = None
    if sodium_g is not None:
        sodium_mg = sodium_g * 1000.0
    elif salt_g is not None:
        sodium_mg = salt_g * 393.4

    present_count = sum(x is not None for x in (sugars, fat, protein, sodium_mg))
    if present_count < 2:
        return None

    return {
        "calories": round(min(kcal, 950.0), 1),
        "sugars": round(min(sugars or 0.0, 100.0), 1),
        "fat": round(min(fat or 0.0, 100.0), 1),
        "protein": round(min(protein or 0.0, 100.0), 1),
        "sodium_mg": round(min(sodium_mg or 0.0, 10000.0), 1),
        "completeness": present_count,
    }


def _off_display_name(product: dict[str, Any]) -> str:
    name = str(product.get("product_name") or "").strip()
    brands_raw = product.get("brands")
    if isinstance(brands_raw, list):
        brand = ", ".join(str(b).strip() for b in brands_raw if str(b).strip())
    else:
        brand = str(brands_raw or "").strip()
    if brand and name and brand.lower() not in name.lower():
        return f"{brand} {name}"[:140]
    return (name or brand or "Packaged Food Item")[:140]


def lookup_openfoodfacts_barcode(barcode: str) -> dict[str, Any] | None:
    code = re.sub(r"[^0-9]", "", barcode or "")
    if len(code) < 8:
        return None
    if code in OFF_PRODUCT_CACHE:
        return OFF_PRODUCT_CACHE[code]

    url = f"https://world.openfoodfacts.org/api/v2/product/{code}.json?fields=product_name,brands,nutriments,code"
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "HealthGuard-Nutrition-Analyzer/1.2"},
    )
    try:
        with urllib.request.urlopen(req, timeout=4.5) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
        prod = payload.get("product")
        if not isinstance(prod, dict):
            OFF_PRODUCT_CACHE[code] = None
            return None
        parsed = extract_off_nutrition(prod.get("nutriments"))
        if parsed is None:
            OFF_PRODUCT_CACHE[code] = None
            return None
        display = _off_display_name(prod)
        entry = {
            "food": display,
            "food_norm": display.lower(),
            "calories": parsed["calories"],
            "sugars": parsed["sugars"],
            "fat": parsed["fat"],
            "protein": parsed["protein"],
            "sodium_mg": parsed["sodium_mg"],
            "source_group": "Open Food Facts (Barcode Match)",
        }
        OFF_PRODUCT_CACHE[code] = entry
        return entry
    except Exception:
        return None


def search_openfoodfacts(query: str, limit: int = 8) -> list[dict[str, Any]]:
    q_clean = " ".join(_clean_tokens(query)) or query.strip().lower()
    if len(q_clean) < 2:
        return []
    cache_key = f"{q_clean}|{limit}"
    if cache_key in OFF_SEARCH_CACHE:
        return OFF_SEARCH_CACHE[cache_key]

    url = "https://search.openfoodfacts.org/search?" + urllib.parse.urlencode(
        {
            "q": q_clean,
            "page_size": max(24, limit * 3),
            "fields": "product_name,brands,nutriments,code",
        }
    )
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "HealthGuard-Nutrition-Analyzer/1.2"},
    )
    try:
        with urllib.request.urlopen(req, timeout=4.5) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
    except Exception:
        return []

    hits = payload.get("hits") or []
    q_stems = {_stem_token(t) for t in q_clean.split()}
    scored: list[tuple[float, dict[str, Any]]] = []
    seen_names: set[str] = set()

    for hit in hits:
        if not isinstance(hit, dict):
            continue
        parsed = extract_off_nutrition(hit.get("nutriments"))
        if parsed is None:
            continue
        display = _off_display_name(hit)
        norm = display.lower()
        if norm in seen_names:
            continue
        seen_names.add(norm)

        h_stems = {_stem_token(t) for t in _clean_tokens(display)}
        q_recall = len(q_stems & h_stems) / max(len(q_stems), 1)
        h_precision = len(q_stems & h_stems) / max(len(h_stems), 1)
        completeness_score = parsed["completeness"] / 4.0
        rank_score = 0.55 * q_recall + 0.25 * h_precision + 0.20 * completeness_score
        scored.append(
            (
                rank_score,
                {
                    "food": display,
                    "food_norm": norm,
                    "calories": parsed["calories"],
                    "sugars": parsed["sugars"],
                    "fat": parsed["fat"],
                    "protein": parsed["protein"],
                    "sodium_mg": parsed["sodium_mg"],
                    "source_group": "Open Food Facts (Live Packaged Food DB)",
                },
            )
        )

    scored.sort(key=lambda pair: pair[0], reverse=True)
    results = [item for _, item in scored[:limit]]

    if len(OFF_SEARCH_CACHE) >= 200:
        OFF_SEARCH_CACHE.clear()
    OFF_SEARCH_CACHE[cache_key] = results
    return results


def build_progressive_queries(title: str, brand: str | None = None) -> list[str]:
    base_part = re.split(r"[|\(\[\-–—]", title)[0].strip() or title
    tokens = _clean_tokens(base_part)
    if not tokens:
        tokens = _clean_tokens(title)

    queries: list[str] = []
    if tokens:
        queries.append(" ".join(tokens[:5]))
    if brand:
        b_tokens = _clean_tokens(brand)
        if b_tokens and tokens:
            combined = " ".join(dict.fromkeys(b_tokens[:2] + tokens[:3]))
            queries.append(combined)
    if len(tokens) >= 3:
        queries.append(" ".join(tokens[:3]))
    if len(tokens) >= 2:
        queries.append(" ".join(tokens[:2]))
        queries.append(" ".join(tokens[-2:]))

    deduped: list[str] = []
    seen: set[str] = set()
    for q in queries:
        if q and q not in seen:
            seen.add(q)
            deduped.append(q)
    return deduped


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

    # 1. Exact substring matches from cleaned 2,158-food dataset
    local_matches = [f for f in FOOD_CATALOG if query in f["food_norm"]]
    seen_norms = {f["food_norm"] for f in local_matches}

    # 2. Stemmed token matches in local dataset if substring matches are sparse
    if len(local_matches) < limit:
        q_stems = {_stem_token(t) for t in _clean_tokens(query)}
        if q_stems:
            for f in FOOD_CATALOG:
                if f["food_norm"] in seen_norms:
                    continue
                c_stems = {_stem_token(t) for t in f["food_norm"].split()}
                if q_stems.issubset(c_stems):
                    local_matches.append(f)
                    seen_norms.add(f["food_norm"])
                    if len(local_matches) >= limit:
                        break

    # 3. Live Open Food Facts packaged food search when local dataset has fewer matches
    if len(local_matches) < limit and len(query) >= 2:
        off_matches = search_openfoodfacts(query, limit=limit - len(local_matches))
        for item in off_matches:
            if item["food_norm"] not in seen_norms:
                local_matches.append(item)
                seen_norms.add(item["food_norm"])

    return local_matches[:limit]


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
    combined_label_text = "\n".join(
        t for t in (payload.ingredients_text or "", payload.nutrition_text or "") if t and t.strip()
    )

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

    nutrition_input: FoodNutritionInput | None = None

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
        parsed = parse_nutrition_text(combined_label_text)
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

    if nutrition_input is None and payload.barcode:
        barcode_match = lookup_openfoodfacts_barcode(payload.barcode)
        if barcode_match is not None:
            nutrition_source = "Open Food Facts (Verified Barcode Match)"
            matched_food = str(barcode_match["food"])
            nutrition_input = FoodNutritionInput(
                food_name=title,
                calories=float(barcode_match["calories"]),
                sugars=float(barcode_match["sugars"]),
                fat=float(barcode_match["fat"]),
                protein=float(barcode_match["protein"]),
                sodium_mg=float(barcode_match["sodium_mg"]),
            )

    staple_match = match_grocery_staple(title) if nutrition_input is None else None

    if nutrition_input is None:
        exact_local = match_catalog_food(title, min_score=0.95)
        if exact_local is not None:
            nutrition_source = f"Matched Dataset Food ({exact_local['source_group']})"
            matched_food = str(exact_local["food"])
            nutrition_input = FoodNutritionInput(
                food_name=title,
                calories=float(exact_local["calories"]),
                sugars=float(exact_local["sugars"]),
                fat=float(exact_local["fat"]),
                protein=float(exact_local["protein"]),
                sodium_mg=float(exact_local["sodium_mg"]),
            )

    if nutrition_input is None and staple_match is not None and len(_clean_tokens(title)) <= 2:
        nutrition_source = str(staple_match["source_group"])
        matched_food = str(staple_match["food"])
        nutrition_input = FoodNutritionInput(
            food_name=title,
            calories=float(staple_match["calories"]),
            sugars=float(staple_match["sugars"]),
            fat=float(staple_match["fat"]),
            protein=float(staple_match["protein"]),
            sodium_mg=float(staple_match["sodium_mg"]),
        )

    if nutrition_input is None:
        for q_try in build_progressive_queries(title, payload.brand):
            off_hits = search_openfoodfacts(q_try, limit=3)
            if off_hits:
                best_off = off_hits[0]
                q_stems = {_stem_token(t) for t in _clean_tokens(title)}
                h_stems = {_stem_token(t) for t in _clean_tokens(str(best_off["food"]))}
                overlap_ratio = len(q_stems & h_stems) / max(len(q_stems), 1)
                if staple_match is None or overlap_ratio >= 0.5:
                    nutrition_source = "Open Food Facts (Live Packaged Food DB)"
                    matched_food = str(best_off["food"])
                    nutrition_input = FoodNutritionInput(
                        food_name=title,
                        calories=float(best_off["calories"]),
                        sugars=float(best_off["sugars"]),
                        fat=float(best_off["fat"]),
                        protein=float(best_off["protein"]),
                        sodium_mg=float(best_off["sodium_mg"]),
                    )
                    break

    if nutrition_input is None and staple_match is not None:
        nutrition_source = str(staple_match["source_group"])
        matched_food = str(staple_match["food"])
        nutrition_input = FoodNutritionInput(
            food_name=title,
            calories=float(staple_match["calories"]),
            sugars=float(staple_match["sugars"]),
            fat=float(staple_match["fat"]),
            protein=float(staple_match["protein"]),
            sodium_mg=float(staple_match["sodium_mg"]),
        )

    if nutrition_input is None:
        fallback_local = match_catalog_food(title, min_score=0.25)
        if fallback_local is not None:
            nutrition_source = f"Matched Dataset Category ({fallback_local['source_group']})"
            matched_food = str(fallback_local["food"])
            nutrition_input = FoodNutritionInput(
                food_name=title,
                calories=float(fallback_local["calories"]),
                sugars=float(fallback_local["sugars"]),
                fat=float(fallback_local["fat"]),
                protein=float(fallback_local["protein"]),
                sodium_mg=float(fallback_local["sodium_mg"]),
            )

    has_ingredients = bool(
        (payload.ingredients_text and payload.ingredients_text.strip())
        or re.search(r"\bingredients?\b", payload.nutrition_text or "", re.I)
    )
    ingredient_scan: PacketScanResponse | None = None
    if has_ingredients and combined_label_text:
        ingredient_scan = analyze_packet_text(title, combined_label_text, raise_on_empty=False)

    if nutrition_input is None and ingredient_scan is None:
        event = AmazonCartEvent(
            event_id=str(uuid.uuid4())[:8],
            timestamp=datetime.now(timezone.utc).isoformat(),
            source=payload.source,
            status="needs_nutrition",
            product_title=title,
            product_url=payload.product_url,
            nutrition_source="Nutrition Label Not Found on Page",
            matched_food=None,
            message=(
                f"Detected '{title}' from Amazon Add to Cart, but nutrition facts were not in the page HTML "
                "and no packaged-food match was found. Enter nutrition values or paste label text to classify."
            ),
            analysis=None,
            ingredients_text=payload.ingredients_text,
            ingredient_scan=None,
        )
        CART_EVENTS.insert(0, event.model_dump())
        del CART_EVENTS[30:]
        return event

    if nutrition_input is None:
        nutrition_input = FoodNutritionInput(
            food_name=title,
            calories=150.0,
            sugars=0.0,
            fat=0.0,
            protein=0.0,
            sodium_mg=0.0,
        )
        nutrition_source = "Amazon Page Ingredients Scan"

    analysis = run_ml_prediction(nutrition_input)
    if ingredient_scan is not None:
        if "Ingredients" not in nutrition_source:
            nutrition_source = f"{nutrition_source} + Amazon Ingredients"
        if ingredient_scan.nutrition_analysis is None:
            ingredient_scan.nutrition_analysis = analysis

    event = AmazonCartEvent(
        event_id=str(uuid.uuid4())[:8],
        timestamp=datetime.now(timezone.utc).isoformat(),
        source=payload.source,
        status="analyzed",
        product_title=title,
        product_url=payload.product_url,
        nutrition_source=nutrition_source,
        matched_food=matched_food,
        message=(
            f"{analysis.explanation} Scanned {ingredient_scan.ingredients_count} ingredients ({ingredient_scan.verdict})."
            if ingredient_scan is not None
            else analysis.explanation
        ),
        analysis=analysis,
        ingredients_text=payload.ingredients_text,
        ingredient_scan=ingredient_scan,
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


class PacketScanInput(BaseModel):
    product_name: str = Field(default="Scanned Food Packet", max_length=200)
    raw_text: str = Field(..., min_length=3, max_length=12000)


BENEFICIAL_INGREDIENTS: list[tuple[str, str, str]] = [
    ("wholegrain", "Whole Grain", "Unrefined whole-grain fiber supports steady energy and digestion."),
    ("whole grain", "Whole Grain", "Unrefined whole-grain fiber supports steady energy and digestion."),
    ("whole wheat", "Whole Wheat", "Contains bran and germ fiber instead of stripped white flour."),
    ("rolled oats", "Rolled Oats", "Rich in soluble beta-glucan fiber and plant protein."),
    ("oats", "Oats", "Whole-grain oat base supplies complex carbohydrates and dietary fiber."),
    ("quinoa", "Quinoa", "Complete plant protein and high mineral/fiber density."),
    ("millet", "Millet", "Nutrient-dense whole grain rich in iron, magnesium, and fiber."),
    ("ragi", "Ragi (Finger Millet)", "Whole millet grain high in calcium and dietary fiber."),
    ("jowar", "Jowar (Sorghum)", "High-fiber whole grain with slow glycemic release."),
    ("bajra", "Bajra (Pearl Millet)", "Unrefined millet rich in fiber and micronutrients."),
    ("brown rice", "Brown Rice", "Retains bran fiber and B vitamins compared with white rice."),
    ("almond", "Almonds", "Heart-healthy monounsaturated fats, vitamin E, and protein."),
    ("walnut", "Walnuts", "Source of plant omega-3 fats and antioxidants."),
    ("pistachio", "Pistachios", "Nutrient-dense tree nuts providing protein and fiber."),
    ("peanut", "Peanuts", "Good source of protein and unsaturated fats."),
    ("flaxseed", "Flaxseeds", "Rich in omega-3 fatty acids and soluble fiber."),
    ("flax seed", "Flax Seeds", "Rich in omega-3 fatty acids and soluble fiber."),
    ("chia seed", "Chia Seeds", "High in dietary fiber, plant protein, and omega-3 fats."),
    ("chia", "Chia Seeds", "High in dietary fiber, plant protein, and omega-3 fats."),
    ("pumpkin seed", "Pumpkin Seeds", "Rich in magnesium, zinc, and plant protein."),
    ("sunflower seed", "Sunflower Seeds", "Source of vitamin E and unsaturated fats."),
    ("chickpea", "Chickpeas", "Legume protein and fiber help keep blood sugar steady."),
    ("lentil", "Lentils", "High-fiber plant protein with low glycemic impact."),
    ("olive oil", "Olive Oil", "Monounsaturated healthy fat with natural polyphenols."),
    ("whey protein", "Whey Protein", "Concentrated high-quality protein boost."),
    ("soy protein", "Soy Protein", "Complete plant-based protein source."),
    ("skim milk", "Skim Milk", "Low-fat dairy protein and calcium."),
    ("yogurt", "Yogurt", "Provides protein, calcium, and fermented dairy nutrients."),
    ("spinach", "Spinach", "Leafy green micronutrients and dietary fiber."),
    ("broccoli", "Broccoli", "Cruciferous vegetable rich in fiber and vitamin C."),
    ("tomato", "Tomatoes", "Natural vegetable base rich in lycopene and potassium."),
    ("turmeric", "Turmeric", "Natural spice with curcumin antioxidants."),
    ("ginger", "Ginger", "Natural root spice with digestive and antioxidant benefits."),
    ("garlic", "Garlic", "Natural culinary aromatic with beneficial organosulfur compounds."),
    ("dietary fiber", "Dietary Fiber", "Supports gut health and reduces glycemic spikes."),
    ("inulin", "Inulin Prebiotic Fiber", "Prebiotic soluble fiber supporting digestive health."),
]

CAUTION_INGREDIENTS: list[tuple[str, str, str]] = [
    ("refined wheat flour", "Refined Wheat Flour (Maida)", "Stripped of bran and fiber; digests rapidly into blood sugar."),
    ("maida", "Refined Flour (Maida)", "Highly refined starch low in dietary fiber."),
    ("enriched wheat flour", "Enriched Wheat Flour", "Refined flour with synthetic vitamins added back."),
    ("white flour", "White Flour", "Refined starch with minimal fiber."),
    ("palm oil", "Palm Oil", "High in saturated palmitic fat compared with olive or mustard oil."),
    ("palmolein", "Palmolein Oil", "Refined palm oil high in saturated fatty acids."),
    ("vegetable oil", "Unspecified Vegetable Oil", "Refined cooking oil blend, often palm or soybean."),
    ("invert syrup", "Invert Sugar Syrup", "Concentrated free sugar that increases glycemic load."),
    ("sugar", "Added Sugar", "Increases empty calories and free-sugar intake."),
    ("maltodextrin", "Maltodextrin", "Fast-digesting processed starch with a high glycemic index."),
    ("dextrose", "Dextrose", "Simple refined glucose sugar."),
    ("modified starch", "Modified Food Starch", "Industrially processed thickener with low nutritional value."),
    ("corn starch", "Corn Starch", "Refined starch thickener lacking fiber."),
    ("artificial flavor", "Artificial Flavoring", "Synthetic flavoring compound indicating ultra-processed formulation."),
    ("artificial flavour", "Artificial Flavouring", "Synthetic flavouring additive indicating ultra-processed formulation."),
    ("emulsifier", "Industrial Emulsifier", "Texturizing additive common in ultra-processed packaged foods."),
    ("caramel color", "Caramel Color", "Added coloring agent used in colas and sauces."),
    ("caramel colour", "Caramel Colour", "Added coloring agent used in packaged snacks and drinks."),
    ("iodized salt", "Added Salt", "Contributes directly to daily sodium intake."),
    ("sea salt", "Added Sea Salt", "Contributes directly to daily sodium intake."),
    ("salt", "Added Salt", "Increases sodium density; monitor daily intake."),
]

CONCERN_INGREDIENTS: list[tuple[str, str, str]] = [
    ("high fructose corn syrup", "High-Fructose Corn Syrup", "Strongly linked to excess free-sugar intake and metabolic strain."),
    ("high-fructose corn syrup", "High-Fructose Corn Syrup", "Strongly linked to excess free-sugar intake and metabolic strain."),
    ("hfcs", "High-Fructose Corn Syrup (HFCS)", "Concentrated industrial sweetener."),
    ("liquid glucose", "Liquid Glucose", "Rapidly absorbed refined syrup driving sharp sugar spikes."),
    ("corn syrup", "Corn Syrup", "Refined liquid sugar syrup."),
    ("partially hydrogenated", "Partially Hydrogenated Oil", "Source of artificial trans fats harmful to heart health."),
    ("hydrogenated vegetable oil", "Hydrogenated Vegetable Oil", "Processed fat that can introduce trans or saturated fats."),
    ("vanaspati", "Vanaspati / Hydrogenated Fat", "Hydrogenated fat high in saturated and trans fatty acids."),
    ("aspartame", "Aspartame", "Artificial non-nutritive sweetener (E951)."),
    ("acesulfame", "Acesulfame Potassium", "Synthetic high-intensity sweetener (E950)."),
    ("sucralose", "Sucralose", "Artificial chlorinated sweetener (E955)."),
    ("saccharin", "Saccharin", "Synthetic artificial sweetener (E954)."),
    ("sodium benzoate", "Sodium Benzoate (E211)", "Synthetic chemical preservative used in acidic drinks and sauces."),
    ("e211", "Sodium Benzoate (E211)", "Synthetic preservative."),
    ("tbhq", "TBHQ (E319)", "Synthetic petroleum-derived antioxidant preservative in fried snacks."),
    ("e319", "TBHQ (E319)", "Synthetic preservative."),
    ("bha", "BHA (E320)", "Synthetic preservative additive."),
    ("bht", "BHT (E321)", "Synthetic preservative additive."),
    ("sodium nitrite", "Sodium Nitrite (E250)", "Curing preservative flagged for processed meats."),
    ("monosodium glutamate", "MSG (E621)", "Flavor enhancer associated with high-sodium ultra-processed snacks."),
    ("msg", "MSG (E621)", "Flavor enhancer in ultra-processed savory snacks."),
    ("e621", "MSG (E621)", "Flavor enhancer additive."),
    ("tartrazine", "Tartrazine (Yellow 5 / E102)", "Synthetic azo food dye."),
    ("e102", "Tartrazine (E102)", "Synthetic yellow food dye."),
    ("sunset yellow", "Sunset Yellow (E110)", "Synthetic azo food dye."),
    ("e110", "Sunset Yellow (E110)", "Synthetic orange food dye."),
    ("allura red", "Allura Red (Red 40 / E129)", "Synthetic red food dye."),
    ("red 40", "Red 40 Dye", "Synthetic food coloring."),
    ("brilliant blue", "Brilliant Blue (E133)", "Synthetic blue food dye."),
]


def _extract_ingredients_segment(raw_text: str) -> list[str]:
    text = raw_text.strip()
    m = re.search(
        r"ingredients?\s*[:\-]?\s*(.+?)(?:\bnutrition|\ballergen|\bstorage|\bmanufactured|\bpacked by|\bbest before|\bnet weight|$)",
        text,
        flags=re.IGNORECASE | re.DOTALL,
    )
    segment = m.group(1) if m else text
    # Split by comma or semicolon cleanly while respecting newlines
    parts = re.split(r"[,;\n•]+", segment)
    cleaned: list[str] = []
    for p in parts:
        item = re.sub(r"\s+", " ", p).strip(" .:-()")
        if 2 <= len(item) <= 90 and not re.fullmatch(r"[\d.\s%gmkcal]+", item, re.I):
            cleaned.append(item)
    return cleaned[:40]


def analyze_packet_text(
    product_name: str,
    raw_text: str,
    raise_on_empty: bool = True,
) -> PacketScanResponse | None:
    raw = raw_text.strip()
    if len(raw) < 3:
        if raise_on_empty:
            raise HTTPException(
                status_code=422,
                detail="No readable text found. Upload a clearer photo of the packet or paste the ingredients / nutrition text.",
            )
        return None

    clean_product_name = product_name.strip() or "Scanned Food Packet"
    parsed_nutrition = parse_nutrition_text(raw)
    nutrition_analysis: PredictionResponse | None = None
    if parsed_nutrition is not None:
        nutrition_analysis = run_ml_prediction(
            FoodNutritionInput(
                food_name=clean_product_name,
                calories=parsed_nutrition["calories"],
                sugars=parsed_nutrition["sugars"],
                fat=parsed_nutrition["fat"],
                protein=parsed_nutrition["protein"],
                sodium_mg=parsed_nutrition["sodium_mg"],
            )
        )

    m_seg = re.search(
        r"ingredients?\s*[:\-]?\s*(.+?)(?:\bnutrition|\ballergen|\bstorage|\bmanufactured|\bpacked by|\bbest before|\bnet weight|$)",
        raw,
        flags=re.IGNORECASE | re.DOTALL,
    )
    ingredient_source_text = (
        m_seg.group(1)
        if m_seg
        else re.sub(r"\bnutrition\s*(?:facts|information)?[\s\S]*$", "", raw, flags=re.IGNORECASE)
    )
    parsed_ingredients = _extract_ingredients_segment(raw)
    masked_raw = ingredient_source_text.lower()
    findings: list[IngredientFinding] = []
    seen_labels: set[str] = set()

    ing_score = 72.0
    good_hits = 0

    for kw, label, reason in sorted(CONCERN_INGREDIENTS, key=lambda item: len(item[0]), reverse=True):
        pattern = re.compile(rf"\b{re.escape(kw)}s?\b")
        if pattern.search(masked_raw):
            masked_raw = pattern.sub(" ", masked_raw)
            if label not in seen_labels:
                seen_labels.add(label)
                findings.append(IngredientFinding(ingredient=label, rating="high", reason=reason))
                ing_score -= 16.0

    for kw, label, reason in sorted(CAUTION_INGREDIENTS, key=lambda item: len(item[0]), reverse=True):
        pattern = re.compile(rf"\b{re.escape(kw)}s?\b")
        if pattern.search(masked_raw):
            masked_raw = pattern.sub(" ", masked_raw)
            norm_label = "Refined Flour (Maida)" if label == "Refined Wheat Flour (Maida)" else label
            if norm_label not in seen_labels:
                seen_labels.add(norm_label)
                is_top_ingredient = any(kw in p.lower() for p in parsed_ingredients[:2])
                findings.append(
                    IngredientFinding(
                        ingredient=norm_label,
                        rating="moderate",
                        reason=(
                            f"Listed near the top of the packet ({reason})"
                            if is_top_ingredient
                            else reason
                        ),
                    )
                )
                ing_score -= 10.0 if is_top_ingredient else 6.0

    for kw, label, reason in sorted(BENEFICIAL_INGREDIENTS, key=lambda item: len(item[0]), reverse=True):
        pattern = re.compile(rf"\b{re.escape(kw)}s?\b")
        if pattern.search(masked_raw):
            masked_raw = pattern.sub(" ", masked_raw)
            if label not in seen_labels:
                seen_labels.add(label)
                findings.append(IngredientFinding(ingredient=label, rating="good", reason=reason))
                good_hits += 1
                ing_score += 7.0 if good_hits <= 3 else 3.0

    if not findings and nutrition_analysis is None and len(parsed_ingredients) < 1:
        if raise_on_empty:
            raise HTTPException(
                status_code=422,
                detail="Could not identify nutrition facts or food ingredients in that text. Try cropping closer to the Ingredients or Nutrition Facts box.",
            )
        return None

    ing_score = round(float(np.clip(ing_score, 8.0, 98.0)), 1)

    if nutrition_analysis is not None and findings:
        combined_score = round(0.55 * nutrition_analysis.health_score + 0.45 * ing_score, 1)
    elif nutrition_analysis is not None:
        combined_score = round(nutrition_analysis.health_score, 1)
    else:
        combined_score = ing_score

    if combined_score >= 68.0:
        verdict: Literal["Good", "Moderate", "Not Good"] = "Good"
    elif combined_score >= 44.0:
        verdict = "Moderate"
    else:
        verdict = "Not Good"

    reasons: list[ScanReason] = []
    for f in findings:
        rtype: Literal["good", "warning", "danger"] = (
            "good" if f.rating == "good" else "warning" if f.rating == "moderate" else "danger"
        )
        reasons.append(ScanReason(type=rtype, text=f"{f.ingredient}: {f.reason}"))

    if nutrition_analysis is not None:
        for flag in nutrition_analysis.nutrient_flags:
            if flag.status == "good":
                reasons.append(
                    ScanReason(type="good", text=f"{flag.nutrient} ({flag.value_display}): {flag.note}")
                )
            elif flag.status == "moderate":
                reasons.append(
                    ScanReason(type="warning", text=f"{flag.nutrient} ({flag.value_display}): {flag.note}")
                )
            else:
                prefix = "Low" if flag.nutrient.lower() == "protein" else "High"
                reasons.append(
                    ScanReason(type="danger", text=f"{prefix} {flag.nutrient} ({flag.value_display}): {flag.note}")
                )

    if not reasons:
        reasons.append(
            ScanReason(
                type="warning",
                text=f"Parsed {len(parsed_ingredients)} ingredient entries without flagged additives; review nutrition facts for sugar and sodium per serving.",
            )
        )

    if verdict == "Good":
        reasons.sort(key=lambda r: 0 if r.type == "good" else 1 if r.type == "warning" else 2)
    else:
        reasons.sort(key=lambda r: 0 if r.type == "danger" else 1 if r.type == "warning" else 2)

    if verdict == "Good":
        summary = (
            f"{clean_product_name} scores {combined_score}/100 (Good) — whole-food ingredients and balanced nutrient profile with low additive concern."
        )
    elif verdict == "Moderate":
        summary = (
            f"{clean_product_name} scores {combined_score}/100 (Moderate) — contains refined ingredients or moderate sugar/fat/sodium; enjoy occasionally in controlled portions."
        )
    else:
        summary = (
            f"{clean_product_name} scores {combined_score}/100 (Not Good) — flagged for added sugars, refined/hydrogenated fats, high sodium, or synthetic additives."
        )

    return PacketScanResponse(
        product_name=clean_product_name,
        verdict=verdict,
        score=combined_score,
        nutrition_found=nutrition_analysis is not None,
        ingredients_count=len(parsed_ingredients),
        parsed_ingredients=parsed_ingredients,
        ingredient_findings=findings,
        reasons=reasons[:8],
        summary=summary,
        nutrition_analysis=nutrition_analysis,
    )


@app.post("/api/scan-packet", response_model=PacketScanResponse)
def scan_packet_ingredients(payload: PacketScanInput) -> PacketScanResponse:
    res = analyze_packet_text(payload.product_name, payload.raw_text, raise_on_empty=True)
    assert res is not None
    return res

