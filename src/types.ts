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
  user_id?: string;
  timestamp: string;
  source: string;
  status: 'analyzed' | 'needs_nutrition';
  product_title: string;
  product_url: string | null;
  image_url?: string | null;
  nutrition_source: string;
  matched_food: string | null;
  message: string | null;
  analysis: PredictionResult | null;
  ingredients_text?: string | null;
  ingredient_scan?: PacketScanResult | null;
  source_platform?: string;
  prescription_alerts?: PrescriptionAlertResult | null;
  tracker_eligibility?: TrackerEligibility | null;
  queued_food_log_id?: string | null;
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
  image_url?: string | null;
  ingredients_text?: string | null;
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
  password?: string;
  age: number;
  conditions: HealthCondition[];
  otherConditions?: string[];
  allergies: string[];
  dietaryNotes: string;
  createdAt: string;
}

export interface NutrientBaselineLimit {
  profileKey: string;
  profileLabel: string;
  audience: 'normal' | 'patient' | 'active';
  caloriesDay: number;
  caloriesPer100gMax: number;
  sugarDayMaxG: number;
  sugarPer100gMaxG: number;
  fatDayMaxG: number;
  fatPer100gNote: string;
  satFatDayMaxG: number;
  satFatPer100gMaxG: number;
  proteinDayMinG: number;
  proteinDayLabel: string;
  fiberDayMinG: number;
  sodiumDayMaxMg: number;
  sodiumPer100gMaxMg: number;
  keyFocus: string;
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
  imageUrl?: string;
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

/* ==================== Feature 1: Smart Prescription Health Alerts ==================== */
export type ConditionCategory = 'acute' | 'chronic';
export type ConditionStatus = 'active' | 'expired' | 'dismissed';
export type ExtractionConfidence = 'high' | 'medium' | 'low';

export interface PrescriptionCondition {
  id: string;
  name: string;
  canonicalKey: string;
  category: ConditionCategory;
  validDays: number;
  prescribedDate: string;
  expiresAt: string;
  status: ConditionStatus;
  daysRemaining?: number;
  confidence?: ExtractionConfidence;
  needsVerification?: boolean;
  uncertaintyReason?: string;
  sourceSnippet?: string;
  prescription_id?: string;
  fileName?: string;
}

export interface PrescriptionMedicine {
  name: string;
  dosage: string;
  frequency?: string;
  duration?: string;
  confidence?: ExtractionConfidence;
  needsVerification?: boolean;
  uncertaintyReason?: string;
  note?: string;
}

export interface PrescriptionDietaryRestrictionItem {
  text: string;
  confidence?: ExtractionConfidence;
  needsVerification?: boolean;
  uncertaintyReason?: string;
}

export interface PrescriptionOcrPageSummary {
  pageNumber: number;
  fileName: string;
  rawText: string;
  confidence: number | null;
  lowConfidenceWordCount: number;
  sharpnessScore: number | null;
  isBlurry: boolean;
  warnings: string[];
}

export interface PrescriptionExtractResponse {
  ok: boolean;
  rawText: string;
  ocrProvider: string;
  ocrConfidence: number | null;
  pagesCount: number;
  ocrPages: PrescriptionOcrPageSummary[];
  qualityWarnings: string[];
  isReadablePrescription: boolean;
  handwritingQuality: 'clear' | 'partially_unclear' | 'unreadable';
  overallConfidence: ExtractionConfidence;
  doctorVerificationRecommended: boolean;
  verificationPrompt: string;
  patientName: string;
  patientNameConfidence: ExtractionConfidence;
  patientNameUncertain: boolean;
  prescriptionDate: string;
  prescriptionDateConfidence: ExtractionConfidence;
  prescriptionDateUncertain: boolean;
  conditions: PrescriptionCondition[];
  medicines: PrescriptionMedicine[];
  dietaryRestrictions: string[];
  dietaryRestrictionItems: PrescriptionDietaryRestrictionItem[];
}

export interface PrescriptionRecord {
  prescription_id: string;
  user_id?: string;
  fileName: string;
  fileType: 'pdf' | 'jpg' | 'png' | 'manual';
  uploadedAt: string;
  patientName?: string;
  patientNameConfidence?: ExtractionConfidence;
  prescriptionDate: string;
  prescriptionDateConfidence?: ExtractionConfidence;
  rawOcrText?: string;
  ocrProvider?: string;
  ocrConfidence?: number | null;
  pagesCount?: number;
  ocrPages?: PrescriptionOcrPageSummary[];
  handwritingQuality?: 'clear' | 'partially_unclear' | 'unreadable';
  overallConfidence?: ExtractionConfidence;
  doctorVerificationRecommended?: boolean;
  verifiedByUser?: boolean;
  imageQualityWarnings?: string[];
  conditions: PrescriptionCondition[];
  medicines: PrescriptionMedicine[];
  dietaryRestrictions: string[];
  dietaryRestrictionItems?: PrescriptionDietaryRestrictionItem[];
  notes?: string;
  activeCount?: number;
  hasActiveConditions?: boolean;
}

export interface ActivePrescriptionSummary {
  activeConditions: PrescriptionCondition[];
  expiredConditions: PrescriptionCondition[];
  medicines: PrescriptionMedicine[];
  dietaryRestrictions: string[];
  disclaimer: string;
}

export interface PrescriptionAlertWarning {
  conditionKey: string;
  conditionName: string;
  prescribedDate?: string;
  daysRemaining?: number | null;
  severity: 'warning' | 'caution';
  headline: string;
  detail: string;
}

export interface PrescriptionAlertResult {
  hasWarnings: boolean;
  warnings: PrescriptionAlertWarning[];
  alternatives: string[];
  activeConditionCount: number;
  disclaimer: string;
}

/* ==================== Feature 2: Daily Food & Nutrition Tracker ==================== */
export type MealSlot = 'breakfast' | 'lunch' | 'snack' | 'dinner';
export type ConsumptionStatus = 'pending_confirmation' | 'consumed' | 'skipped';
export type TrackerRange = 'daily' | 'weekly' | 'monthly';

export interface TrackerEligibility {
  isInstantConsumable: boolean;
  normalizedPlatform: string;
  reason: string | null;
}

export interface FullNutrients {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  saturated_fat_g?: number;
  unsaturated_fat_g?: number;
  fiber_g: number;
  sugar_g: number;
  sodium_mg: number;
  potassium_mg: number;
  calcium_mg: number;
  iron_mg: number;
  vitamin_c_mg: number;
}

export interface FoodConsumptionLog {
  log_id: string;
  user_id?: string;
  sourceEventId?: string | null;
  foodName: string;
  platform: string;
  isInstantConsumable: boolean;
  mealSlot: MealSlot;
  consumedDate: string;
  consumedTime: string;
  consumptionStatus: ConsumptionStatus;
  portionMultiplier: number;
  quantityLabel: string;
  baseNutrients: FullNutrients;
  nutrients: FullNutrients;
  ingredientsText?: string;
  imageUrl?: string | null;
  createdAtIso?: string;
}

export interface NutrientComparisonRow {
  key: keyof FullNutrients;
  label: string;
  unit: string;
  mode: 'target' | 'min' | 'max';
  consumed: number;
  periodTotal: number;
  target: number;
  remaining: number;
  excess: number;
  pct: number;
  status: 'deficient' | 'remaining' | 'optimal' | 'within_limit' | 'near_limit' | 'excess';
}

export interface MealSlotSummary {
  mealSlot: MealSlot;
  count: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface DailySeriesEntry extends FullNutrients {
  date: string;
  itemsCount: number;
}

export interface FoodItemQualityEval {
  log_id: string;
  foodName: string;
  platform: string;
  healthScore: number;
  verdict: 'Good' | 'Moderate' | 'Bad';
  goodCalories: number;
  moderateCalories: number;
  badCalories: number;
  goodHighlights: string[];
  badHighlights: string[];
}

export interface QualityBreakdownReport {
  goodCalories: number;
  moderateCalories: number;
  badCalories: number;
  goodPct: number;
  moderatePct: number;
  badPct: number;
  overallHealthScore: number;
  overallVerdict: 'Good' | 'Moderate' | 'Bad';
  goodItemsCount: number;
  moderateItemsCount: number;
  badItemsCount: number;
  goodNutrients: {
    key: string;
    label: string;
    consumed: number;
    target: number;
    unit: string;
    pct: number;
  }[];
  badNutrients: {
    key: string;
    label: string;
    consumed: number;
    limit: number;
    unit: string;
    pct: number;
  }[];
  itemEvaluations: FoodItemQualityEval[];
}

export interface NutritionSummaryReport {
  range: TrackerRange;
  startDate: string;
  endDate: string;
  loggedDays: number;
  consumedCount: number;
  pendingConfirmations: FoodConsumptionLog[];
  totals: FullNutrients;
  dailyAverage: FullNutrients;
  requirements: FullNutrients;
  comparisonRows: NutrientComparisonRow[];
  deficiencies: NutrientComparisonRow[];
  excesses: NutrientComparisonRow[];
  remaining: NutrientComparisonRow[];
  qualityBreakdown?: QualityBreakdownReport;
  mealSlots: MealSlotSummary[];
  platformBreakdown: { platform: string; count: number }[];
  dailySeries: DailySeriesEntry[];
}

