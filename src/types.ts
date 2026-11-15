export type HealthLabel = 'Healthy' | 'Moderate' | 'Unhealthy';

export interface NutritionFormValues {
  food_name: string;
  calories: string;
  sugars: string;
  fat: string;
  protein: string;
  sodium_mg: string;
}

export interface NutrientFlag {
  nutrient: string;
  value_display: string;
  status: 'good' | 'moderate' | 'high';
  note: string;
}

export interface CartAlert {
  level: 'success' | 'warning' | 'danger';
  title: string;
  message: string;
}

export interface PredictionResult {
  food_name: string;
  classification: HealthLabel;
  health_score: number;
  confidence: number;
  probabilities: Record<HealthLabel, number>;
  nutrition: {
    calories: number;
    sugars: number;
    fat: number;
    protein: number;
    sodium_mg: number;
    sugar_kcal_pct: number;
    fat_kcal_pct: number;
    protein_kcal_pct: number;
    sodium_per_100kcal: number;
  };
  nutrient_flags: NutrientFlag[];
  explanation: string;
  cart_alert: CartAlert;
  model_used: string;
}

export interface SampleFood {
  food: string;
  calories: number;
  sugars: number;
  fat: number;
  protein: number;
  sodium_mg: number;
  dataset_label: HealthLabel;
  source_group: string;
}

export interface CartItem {
  id: string;
  food_name: string;
  classification: HealthLabel;
  health_score: number;
  calories: number;
  sugars: number;
  fat: number;
  protein: number;
  sodium_mg: number;
  cart_alert: CartAlert;
}

export interface ModelMetricEntry {
  model: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  confusion_matrix: number[][];
}

export interface EvaluationReport {
  cleaning_summary: {
    raw_rows: number;
    cleaned_rows: number;
    duplicates_removed: number;
    missing_values_found: number;
    unit_standardization: string;
    files: { file: string; rows: number; columns: number }[];
    anomalies_removed: {
      low_calorie_or_zero_rows: number;
      tiny_serving_weight_rows: number;
      saturated_fat_exceeds_total_fat: number;
      sugars_exceeds_carbohydrates: number;
      macro_calorie_mismatch: number;
      extreme_sodium_outliers_gt_10000mg: number;
      total_invalid_rows_removed: number;
    };
  };
  eda_summary: Record<
    string,
    { mean: number; median: number; std: number; min: number; max: number }
  >;
  labeling_methodology: {
    framework: string;
    rules: string[];
    thresholds: Record<HealthLabel, string>;
    class_distribution: Record<HealthLabel, number>;
    class_mean_scores: Record<HealthLabel, number>;
  };
  train_test_split: {
    train_size: number;
    test_size: number;
    test_ratio: number;
  };
  class_labels: HealthLabel[];
  model_comparison: ModelMetricEntry[];
  best_model: string;
}

export interface AmazonCartEvent {
  event_id: string;
  timestamp: string;
  source: string;
  status: 'analyzed' | 'needs_nutrition';
  product_title: string;
  product_url: string | null;
  nutrition_source: string;
  matched_food: string | null;
  message: string | null;
  analysis: PredictionResult | null;
  ingredients_text?: string | null;
  ingredient_scan?: PacketScanResult | null;
  source_platform?: string;
}

export interface CatalogFoodItem {
  food: string;
  food_norm: string;
  calories: number;
  sugars: number;
  fat: number;
  protein: number;
  sodium_mg: number;
  source_group: string;
}

export interface IngredientFinding {
  ingredient: string;
  rating: 'good' | 'moderate' | 'high';
  reason: string;
}

export interface ScanReason {
  type: 'good' | 'warning' | 'danger';
  text: string;
}

export interface PacketScanResult {
  product_name: string;
  verdict: 'Good' | 'Moderate' | 'Not Good';
  score: number;
  nutrition_found: boolean;
  ingredients_count: number;
  parsed_ingredients: string[];
  ingredient_findings: IngredientFinding[];
  reasons: ScanReason[];
  summary: string;
  nutrition_analysis: PredictionResult | null;
}

export type HealthCondition =
  | 'diabetes'
  | 'hypertension'
  | 'heart_disease'
  | 'kidney_disease'
  | 'obesity';

export type RiskLevel = 'LOW RISK' | 'MODERATE RISK' | 'HIGH RISK';

export interface UserHealthProfile {
  id: string;
  fullName: string;
  email: string;
  password: string;
  age: number;
  conditions: HealthCondition[];
  allergies: string[];
  dietaryNotes: string;
  createdAt: string;
}

export interface CatalogProduct {
  id: string;
  name: string;
  brand: string;
  category: string;
  servingSize: string;
  calories: number;
  sugar_g: number;
  sodium_mg: number;
  saturated_fat_g: number;
  fat_g: number;
  protein_g: number;
  fiber_g: number;
  ingredients: string;
  allergens: string[];
  storeUrl?: string;
  isCustom?: boolean;
}

export interface PersonalizedCheckResult {
  riskLevel: RiskLevel;
  tone: 'good' | 'moderate' | 'bad';
  score: number;
  ageGroupLabel: string;
  reasons: string[];
  cautions: string[];
  matchedAllergens: string[];
  triggeredConditions: string[];
}
