import type {
  AmazonCartEvent,
  CatalogFoodItem,
  EvaluationReport,
  HealthLabel,
  IngredientFinding,
  NutrientFlag,
  PacketScanResult,
  PredictionResult,
  SampleFood,
  ScanReason,
} from '../types';

export const FALLBACK_SAMPLES: SampleFood[] = [
  { food: 'Broccoli Cooked', calories: 98, sugars: 3.9, fat: 1.1, protein: 6.7, sodium_mg: 100, dataset_label: 'Healthy', source_group: 'FOOD-DATA-GROUP1.csv' },
  { food: 'Salmon Baked', calories: 206, sugars: 0, fat: 12.3, protein: 22.1, sodium_mg: 61, dataset_label: 'Healthy', source_group: 'FOOD-DATA-GROUP2.csv' },
  { food: 'Wholegrain Rolled Oats', calories: 375, sugars: 1.0, fat: 7.0, protein: 13.0, sodium_mg: 5, dataset_label: 'Healthy', source_group: 'FOOD-DATA-GROUP1.csv' },
  { food: 'Chickpeas Boiled', calories: 164, sugars: 4.8, fat: 2.6, protein: 8.9, sodium_mg: 7, dataset_label: 'Healthy', source_group: 'FOOD-DATA-GROUP3.csv' },
  { food: 'Greek Yogurt Plain', calories: 97, sugars: 3.6, fat: 5.0, protein: 9.0, sodium_mg: 35, dataset_label: 'Healthy', source_group: 'FOOD-DATA-GROUP4.csv' },
  { food: 'Pepperoni Pizza Slice', calories: 308, sugars: 4.2, fat: 12.6, protein: 12.7, sodium_mg: 700, dataset_label: 'Moderate', source_group: 'FOOD-DATA-GROUP2.csv' },
  { food: 'Packaged Butter Cookies', calories: 472, sugars: 23.5, fat: 20.1, protein: 6.1, sodium_mg: 320, dataset_label: 'Moderate', source_group: 'FOOD-DATA-GROUP5.csv' },
  { food: 'Masala Instant Noodles', calories: 427, sugars: 1.2, fat: 15.7, protein: 8.0, sodium_mg: 1120, dataset_label: 'Unhealthy', source_group: 'FOOD-DATA-GROUP5.csv' },
  { food: 'Root Beer Soda', calories: 202, sugars: 52.3, fat: 0, protein: 0, sodium_mg: 68, dataset_label: 'Unhealthy', source_group: 'FOOD-DATA-GROUP5.csv' },
  { food: 'Potato Chips Salted', calories: 536, sugars: 0.4, fat: 34.6, protein: 7.0, sodium_mg: 525, dataset_label: 'Unhealthy', source_group: 'FOOD-DATA-GROUP4.csv' },
];

export const FALLBACK_REPORT: EvaluationReport = {
  cleaning_summary: {
    raw_rows: 2395,
    cleaned_rows: 2158,
    duplicates_removed: 48,
    missing_values_found: 0,
    unit_standardization: 'Converted Sodium from grams (g) to milligrams (mg = Sodium * 1000).',
    files: [
      { file: 'FOOD-DATA-GROUP1.csv', rows: 551, columns: 35 },
      { file: 'FOOD-DATA-GROUP2.csv', rows: 319, columns: 35 },
      { file: 'FOOD-DATA-GROUP3.csv', rows: 571, columns: 35 },
      { file: 'FOOD-DATA-GROUP4.csv', rows: 232, columns: 35 },
      { file: 'FOOD-DATA-GROUP5.csv', rows: 722, columns: 35 },
    ],
    anomalies_removed: {
      low_calorie_or_zero_rows: 64,
      tiny_serving_weight_rows: 52,
      saturated_fat_exceeds_total_fat: 14,
      sugars_exceeds_carbohydrates: 19,
      macro_calorie_mismatch: 31,
      extreme_sodium_outliers_gt_10000mg: 9,
      total_invalid_rows_removed: 189,
    },
  },
  eda_summary: {
    calories_kcal: { mean: 214.8, median: 189.0, std: 142.3, min: 6.0, max: 884.0 },
    sugars_g: { mean: 8.7, median: 2.9, std: 14.2, min: 0.0, max: 82.0 },
    fat_g: { mean: 9.8, median: 6.1, std: 12.1, min: 0.0, max: 100.0 },
    protein_g: { mean: 11.4, median: 8.6, std: 10.2, min: 0.0, max: 62.0 },
    sodium_mg: { mean: 312.5, median: 142.0, std: 528.4, min: 0.0, max: 7800.0 },
  },
  labeling_methodology: {
    framework: 'WHO Free Sugars (<10% kcal) & Fat (<30% kcal) + FDA Sodium Density (<115 mg/100 kcal)',
    rules: [
      'Penalizes free-sugar energy share above 10% kcal and absolute sugar > 20g.',
      'Penalizes total fat share above 30% kcal and high calorie density.',
      'Penalizes sodium density above 115 mg / 100 kcal and sodium > 500mg.',
      'Rewards protein calorie density and low-energy whole-food profiles.',
    ],
    thresholds: {
      Healthy: 'Score >= 68 / 100',
      Moderate: 'Score 44 – 67.9 / 100',
      Unhealthy: 'Score < 44 / 100',
    },
    class_distribution: { Healthy: 862, Moderate: 724, Unhealthy: 572 },
    class_mean_scores: { Healthy: 80.4, Moderate: 56.2, Unhealthy: 28.9 },
  },
  train_test_split: { train_size: 1726, test_size: 432, test_ratio: 0.2 },
  class_labels: ['Healthy', 'Moderate', 'Unhealthy'],
  model_comparison: [
    {
      model: 'Random Forest',
      accuracy: 0.942,
      precision: 0.941,
      recall: 0.942,
      f1_score: 0.941,
      confusion_matrix: [
        [165, 7, 0],
        [6, 134, 5],
        [0, 7, 108],
      ],
    },
    {
      model: 'Decision Tree',
      accuracy: 0.896,
      precision: 0.897,
      recall: 0.896,
      f1_score: 0.896,
      confusion_matrix: [
        [156, 16, 0],
        [12, 125, 8],
        [0, 9, 106],
      ],
    },
    {
      model: 'Logistic Regression',
      accuracy: 0.859,
      precision: 0.858,
      recall: 0.859,
      f1_score: 0.858,
      confusion_matrix: [
        [150, 21, 1],
        [15, 117, 13],
        [1, 10, 104],
      ],
    },
  ],
  best_model: 'Random Forest',
};

function clip(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function round1(val: number): number {
  return Math.round(val * 10) / 10;
}

export function analyzeNutritionLocally(input: {
  food_name: string;
  calories: number;
  sugars: number;
  fat: number;
  protein: number;
  sodium_mg: number;
  model_used?: string;
}): PredictionResult {
  const kcal = Math.max(Number(input.calories) || 0, 1);
  const sugars = Math.max(Number(input.sugars) || 0, 0);
  const fat = Math.max(Number(input.fat) || 0, 0);
  const protein = Math.max(Number(input.protein) || 0, 0);
  const sodium_mg = Math.max(Number(input.sodium_mg) || 0, 0);

  const sugar_kcal_pct = clip((sugars * 4) / kcal * 100, 0, 100);
  const fat_kcal_pct = clip((fat * 9) / kcal * 100, 0, 100);
  const protein_kcal_pct = clip((protein * 4) / kcal * 100, 0, 100);
  const sodium_per_100kcal = clip((sodium_mg / kcal) * 100, 0, 5000);

  const pen_sugar =
    clip((sugar_kcal_pct - 10) * 0.75, 0, 35) + clip((sugars - 20) * 0.4, 0, 10);
  const pen_fat = clip((fat_kcal_pct - 30) * 0.65, 0, 18);
  const pen_sod =
    clip((sodium_per_100kcal - 115) * 0.08, 0, 22) + clip((sodium_mg - 500) * 0.012, 0, 10);
  const pen_ed = clip((kcal - 260) * 0.035, 0, 12);
  const bon_prot = clip(protein_kcal_pct * 0.4, 0, 12);
  const bon_whole =
    kcal < 160 && sugar_kcal_pct < 35 && sodium_per_100kcal < 150 ? 5 : 0;

  const health_score = round1(
    clip(75 - pen_sugar - pen_fat - pen_sod - pen_ed + bon_prot + bon_whole, 0, 100)
  );

  const classification: HealthLabel =
    health_score >= 68 ? 'Healthy' : health_score >= 44 ? 'Moderate' : 'Unhealthy';

  const dHealthy = Math.exp(-Math.abs(health_score - 82) / 14);
  const dModerate = Math.exp(-Math.abs(health_score - 56) / 14);
  const dUnhealthy = Math.exp(-Math.abs(health_score - 26) / 14);
  const sumD = dHealthy + dModerate + dUnhealthy;
  const probabilities: Record<HealthLabel, number> = {
    Healthy: round1((dHealthy / sumD) * 100),
    Moderate: round1((dModerate / sumD) * 100),
    Unhealthy: round1((dUnhealthy / sumD) * 100),
  };
  const confidence = probabilities[classification];

  const flags: NutrientFlag[] = [];
  const concerns: string[] = [];
  const strengths: string[] = [];

  if (sugar_kcal_pct > 25 || sugars > 20) {
    flags.push({
      nutrient: 'Sugar',
      value_display: `${round1(sugars)} g`,
      status: 'high',
      note: `${round1(sugar_kcal_pct)}% of calories (above WHO 10% guideline)`,
    });
    concerns.push(`high sugar (${round1(sugars)}g, ${round1(sugar_kcal_pct)}% of calories)`);
  } else if (sugar_kcal_pct > 10 || sugars > 10) {
    flags.push({
      nutrient: 'Sugar',
      value_display: `${round1(sugars)} g`,
      status: 'moderate',
      note: `${round1(sugar_kcal_pct)}% of calories`,
    });
  } else {
    flags.push({
      nutrient: 'Sugar',
      value_display: `${round1(sugars)} g`,
      status: 'good',
      note: `${round1(sugar_kcal_pct)}% of calories (within WHO <10% target)`,
    });
    if (sugars <= 5) strengths.push('low sugar');
  }

  if (fat_kcal_pct > 45) {
    flags.push({
      nutrient: 'Total Fat',
      value_display: `${round1(fat)} g`,
      status: 'high',
      note: `${round1(fat_kcal_pct)}% of calories (above 30% WHO upper bound)`,
    });
    concerns.push(`fat-dense profile (${round1(fat)}g, ${round1(fat_kcal_pct)}% of calories)`);
  } else if (fat_kcal_pct > 30) {
    flags.push({
      nutrient: 'Total Fat',
      value_display: `${round1(fat)} g`,
      status: 'moderate',
      note: `${round1(fat_kcal_pct)}% of calories`,
    });
  } else {
    flags.push({
      nutrient: 'Total Fat',
      value_display: `${round1(fat)} g`,
      status: 'good',
      note: `${round1(fat_kcal_pct)}% of calories (balanced fat share)`,
    });
    strengths.push('controlled fat');
  }

  if (protein_kcal_pct >= 20) {
    flags.push({
      nutrient: 'Protein',
      value_display: `${round1(protein)} g`,
      status: 'good',
      note: `${round1(protein_kcal_pct)}% of calories (protein-rich)`,
    });
    strengths.push(`strong protein (${round1(protein)}g)`);
  } else if (protein_kcal_pct >= 10) {
    flags.push({
      nutrient: 'Protein',
      value_display: `${round1(protein)} g`,
      status: 'moderate',
      note: `${round1(protein_kcal_pct)}% of calories`,
    });
  } else {
    flags.push({
      nutrient: 'Protein',
      value_display: `${round1(protein)} g`,
      status: Number(input.calories) >= 120 ? 'high' : 'moderate',
      note: `${round1(protein_kcal_pct)}% of calories (low protein density)`,
    });
    if (Number(input.calories) >= 120) concerns.push(`minimal protein (${round1(protein)}g)`);
  }

  if (sodium_per_100kcal > 220 || sodium_mg > 600) {
    flags.push({
      nutrient: 'Sodium',
      value_display: `${Math.round(sodium_mg)} mg`,
      status: 'high',
      note: `${Math.round(sodium_per_100kcal)} mg per 100 kcal (high sodium load)`,
    });
    concerns.push(`elevated sodium (${Math.round(sodium_mg)} mg)`);
  } else if (sodium_per_100kcal > 115 || sodium_mg > 300) {
    flags.push({
      nutrient: 'Sodium',
      value_display: `${Math.round(sodium_mg)} mg`,
      status: 'moderate',
      note: `${Math.round(sodium_per_100kcal)} mg per 100 kcal`,
    });
  } else {
    flags.push({
      nutrient: 'Sodium',
      value_display: `${Math.round(sodium_mg)} mg`,
      status: 'good',
      note: `${Math.round(sodium_per_100kcal)} mg per 100 kcal (low sodium)`,
    });
    strengths.push('low sodium');
  }

  const foodName = input.food_name.trim() || 'Custom Food Item';
  let explanation = '';
  let cart_alert: PredictionResult['cart_alert'];

  if (classification === 'Healthy') {
    const pos = strengths.slice(0, 3).join(', ') || 'balanced macronutrients';
    explanation = `${foodName} is classified as Healthy (score ${health_score}/100) due to ${pos} across ${round1(input.calories)} kcal.`;
    cart_alert = {
      level: 'success',
      title: 'Healthy Choice Added',
      message: `${foodName} scored ${health_score}/100 with a balanced nutrient profile. Safe for everyday meals.`,
    };
  } else if (classification === 'Moderate') {
    const driver =
      concerns.length > 0
        ? `driven by ${concerns.slice(0, 2).join(', ')}`
        : 'due to borderline sugar, fat, or sodium density';
    explanation = `${foodName} is classified as Moderate (score ${health_score}/100), ${driver}. Enjoy in controlled portions alongside fiber-rich whole foods.`;
    cart_alert = {
      level: 'warning',
      title: 'Moderation Recommended',
      message: `${foodName} scored ${health_score}/100 (Moderate). Watch portion size if pairing with high-sodium or sugary items.`,
    };
  } else {
    const driver =
      concerns.length > 0
        ? `driven by ${concerns.slice(0, 3).join(', ')}`
        : 'due to excessive energy-adjusted sugar, fat, or sodium';
    explanation = `${foodName} is classified as Unhealthy (score ${health_score}/100), ${driver}. Frequent intake may exceed daily WHO/FDA sugar, fat, or sodium limits.`;
    cart_alert = {
      level: 'danger',
      title: 'Health Warning: Unhealthy Item',
      message: `Alert: ${foodName} scored ${health_score}/100 (${concerns.slice(0, 2).join(', ') || 'poor nutrient balance'}). Consider a lower-sugar or lower-sodium alternative.`,
    };
  }

  return {
    food_name: foodName,
    classification,
    health_score,
    confidence,
    probabilities,
    nutrition: {
      calories: round1(input.calories),
      sugars: round1(sugars),
      fat: round1(fat),
      protein: round1(protein),
      sodium_mg: round1(sodium_mg),
      sugar_kcal_pct: round1(sugar_kcal_pct),
      fat_kcal_pct: round1(fat_kcal_pct),
      protein_kcal_pct: round1(protein_kcal_pct),
      sodium_per_100kcal: round1(sodium_per_100kcal),
    },
    nutrient_flags: flags,
    explanation,
    cart_alert,
    model_used: input.model_used || 'WHO/FDA Nutrient Engine',
  };
}

export function parseNutritionTextClient(text: string): {
  calories: number;
  sugars: number;
  fat: number;
  protein: number;
  sodium_mg: number;
} | null {
  if (!text || !text.trim()) return null;
  const normalized = text.replace(/\s+/g, ' ').trim();
  const calMatch = normalized.match(
    /(?:calories|energy(?:\s*\(\s*kcal\s*\))?)\s*[:|\-]?\s*(\d+(?:\.\d+)?)\s*(?:kcal|cal)?/i
  );
  if (!calMatch) return null;
  const calories = parseFloat(calMatch[1]);

  const grab = (re: RegExp): number | null => {
    const m = normalized.match(re);
    return m ? parseFloat(m[1]) : null;
  };

  const sugars = grab(/(?:total\s+sugars?|of\s+which\s+sugars?|added\s+sugars?|sugars?)\s*[:|\-]?\s*(\d+(?:\.\d+)?)\s*g\b/i);
  const fat = grab(/(?:total\s+)?fat\s*[:|\-]?\s*(\d+(?:\.\d+)?)\s*g\b/i);
  const protein = grab(/protein\s*[:|\-]?\s*(\d+(?:\.\d+)?)\s*g\b/i);

  let sodium_mg: number | null = null;
  const sodMg = normalized.match(/sodium\s*[:|\-]?\s*(\d+(?:\.\d+)?)\s*mg\b/i);
  const sodG = normalized.match(/sodium\s*[:|\-]?\s*(\d+(?:\.\d+)?)\s*g\b/i);
  const saltG = normalized.match(/salt\s*[:|\-]?\s*(\d+(?:\.\d+)?)\s*g\b/i);
  if (sodMg) sodium_mg = parseFloat(sodMg[1]);
  else if (sodG) sodium_mg = parseFloat(sodG[1]) * 1000;
  else if (saltG) sodium_mg = parseFloat(saltG[1]) * 393.4;

  const foundCount = [sugars, fat, protein, sodium_mg].filter((v) => v !== null).length;
  if (foundCount < 2) return null;

  return {
    calories,
    sugars: sugars ?? 0,
    fat: fat ?? 0,
    protein: protein ?? 0,
    sodium_mg: sodium_mg ?? 0,
  };
}

const BENEFICIAL_INGREDIENTS: [string, string, string][] = [
  ['wholegrain', 'Whole Grain', 'Unrefined whole-grain fiber supports steady energy and digestion.'],
  ['whole grain', 'Whole Grain', 'Unrefined whole-grain fiber supports steady energy and digestion.'],
  ['whole wheat', 'Whole Wheat', 'Contains bran and germ fiber instead of stripped white flour.'],
  ['rolled oats', 'Rolled Oats', 'Rich in soluble beta-glucan fiber and plant protein.'],
  ['oats', 'Oats', 'Whole-grain oat base supplies complex carbohydrates and dietary fiber.'],
  ['quinoa', 'Quinoa', 'Complete plant protein and high mineral/fiber density.'],
  ['millet', 'Millet', 'Nutrient-dense whole grain rich in iron, magnesium, and fiber.'],
  ['ragi', 'Ragi (Finger Millet)', 'Whole millet grain high in calcium and dietary fiber.'],
  ['brown rice', 'Brown Rice', 'Retains bran fiber and B vitamins compared with white rice.'],
  ['almond', 'Almonds', 'Heart-healthy monounsaturated fats, vitamin E, and protein.'],
  ['walnut', 'Walnuts', 'Source of plant omega-3 fats and antioxidants.'],
  ['peanut', 'Peanuts', 'Good source of protein and unsaturated fats.'],
  ['flaxseed', 'Flaxseeds', 'Rich in omega-3 fatty acids and soluble fiber.'],
  ['flax seed', 'Flax Seeds', 'Rich in omega-3 fatty acids and soluble fiber.'],
  ['chia seed', 'Chia Seeds', 'High in dietary fiber, plant protein, and omega-3 fats.'],
  ['chia', 'Chia Seeds', 'High in dietary fiber, plant protein, and omega-3 fats.'],
  ['pumpkin seed', 'Pumpkin Seeds', 'Rich in magnesium, zinc, and plant protein.'],
  ['chickpea', 'Chickpeas', 'Legume protein and fiber help keep blood sugar steady.'],
  ['lentil', 'Lentils', 'High-fiber plant protein with low glycemic impact.'],
  ['olive oil', 'Olive Oil', 'Monounsaturated healthy fat with natural polyphenols.'],
  ['whey protein', 'Whey Protein', 'Concentrated high-quality protein boost.'],
  ['soy protein', 'Soy Protein', 'Complete plant-based protein source.'],
  ['yogurt', 'Yogurt', 'Provides protein, calcium, and fermented dairy nutrients.'],
  ['spinach', 'Spinach', 'Leafy green micronutrients and dietary fiber.'],
  ['broccoli', 'Broccoli', 'Cruciferous vegetable rich in fiber and vitamin C.'],
  ['turmeric', 'Turmeric', 'Natural spice with curcumin antioxidants.'],
  ['ginger', 'Ginger', 'Natural root spice with digestive and antioxidant benefits.'],
  ['dietary fiber', 'Dietary Fiber', 'Supports gut health and reduces glycemic spikes.'],
];

const CAUTION_INGREDIENTS: [string, string, string][] = [
  ['refined wheat flour', 'Refined Wheat Flour (Maida)', 'Stripped of bran and fiber; digests rapidly into blood sugar.'],
  ['maida', 'Refined Flour (Maida)', 'Highly refined starch low in dietary fiber.'],
  ['white flour', 'White Flour', 'Refined starch with minimal fiber.'],
  ['palm oil', 'Palm Oil', 'High in saturated palmitic fat compared with olive or mustard oil.'],
  ['palmolein', 'Palmolein Oil', 'Refined palm oil high in saturated fatty acids.'],
  ['vegetable oil', 'Unspecified Vegetable Oil', 'Refined cooking oil blend, often palm or soybean.'],
  ['invert syrup', 'Invert Sugar Syrup', 'Concentrated free sugar that increases glycemic load.'],
  ['sugar', 'Added Sugar', 'Increases empty calories and free-sugar intake.'],
  ['maltodextrin', 'Maltodextrin', 'Fast-digesting processed starch with a high glycemic index.'],
  ['dextrose', 'Dextrose', 'Simple refined glucose sugar.'],
  ['modified starch', 'Modified Food Starch', 'Industrially processed thickener with low nutritional value.'],
  ['artificial flavor', 'Artificial Flavoring', 'Synthetic flavoring compound indicating ultra-processed formulation.'],
  ['artificial flavour', 'Artificial Flavouring', 'Synthetic flavouring additive indicating ultra-processed formulation.'],
  ['emulsifier', 'Industrial Emulsifier', 'Texturizing additive common in ultra-processed packaged foods.'],
  ['caramel color', 'Caramel Color', 'Added coloring agent used in colas and sauces.'],
  ['caramel colour', 'Caramel Colour', 'Added coloring agent used in packaged snacks and drinks.'],
  ['iodized salt', 'Added Salt', 'Contributes directly to daily sodium intake.'],
  ['sea salt', 'Added Sea Salt', 'Contributes directly to daily sodium intake.'],
  ['salt', 'Added Salt', 'Increases sodium density; monitor daily intake.'],
];

const CONCERN_INGREDIENTS: [string, string, string][] = [
  ['high fructose corn syrup', 'High-Fructose Corn Syrup', 'Strongly linked to excess free-sugar intake and metabolic strain.'],
  ['high-fructose corn syrup', 'High-Fructose Corn Syrup', 'Strongly linked to excess free-sugar intake and metabolic strain.'],
  ['hfcs', 'High-Fructose Corn Syrup (HFCS)', 'Concentrated industrial sweetener.'],
  ['liquid glucose', 'Liquid Glucose', 'Rapidly absorbed refined syrup driving sharp sugar spikes.'],
  ['corn syrup', 'Corn Syrup', 'Refined liquid sugar syrup.'],
  ['partially hydrogenated', 'Partially Hydrogenated Oil', 'Source of artificial trans fats harmful to heart health.'],
  ['hydrogenated vegetable oil', 'Hydrogenated Vegetable Oil', 'Processed fat that can introduce trans or saturated fats.'],
  ['vanaspati', 'Vanaspati / Hydrogenated Fat', 'Hydrogenated fat high in saturated and trans fatty acids.'],
  ['aspartame', 'Aspartame', 'Artificial non-nutritive sweetener (E951).'],
  ['acesulfame', 'Acesulfame Potassium', 'Synthetic high-intensity sweetener (E950).'],
  ['sucralose', 'Sucralose', 'Artificial chlorinated sweetener (E955).'],
  ['sodium benzoate', 'Sodium Benzoate (E211)', 'Synthetic chemical preservative used in acidic drinks and sauces.'],
  ['e211', 'Sodium Benzoate (E211)', 'Synthetic preservative.'],
  ['tbhq', 'TBHQ (E319)', 'Synthetic petroleum-derived antioxidant preservative in fried snacks.'],
  ['e319', 'TBHQ (E319)', 'Synthetic preservative.'],
  ['bha', 'BHA (E320)', 'Synthetic preservative additive.'],
  ['bht', 'BHT (E321)', 'Synthetic preservative additive.'],
  ['monosodium glutamate', 'MSG (E621)', 'Flavor enhancer associated with high-sodium ultra-processed snacks.'],
  ['msg', 'MSG (E621)', 'Flavor enhancer in ultra-processed savory snacks.'],
  ['e621', 'MSG (E621)', 'Flavor enhancer additive.'],
  ['tartrazine', 'Tartrazine (Yellow 5 / E102)', 'Synthetic azo food dye.'],
  ['sunset yellow', 'Sunset Yellow (E110)', 'Synthetic azo food dye.'],
  ['allura red', 'Allura Red (Red 40 / E129)', 'Synthetic red food dye.'],
];

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function scanPacketLocally(
  productName: string,
  rawText: string
): PacketScanResult {
  const raw = rawText.trim();
  const parsedNutrition = parseNutritionTextClient(raw);
  const nutritionAnalysis = parsedNutrition
    ? analyzeNutritionLocally({
        food_name: productName.trim() || 'Scanned Food Packet',
        ...parsedNutrition,
      })
    : null;

  const segMatch = raw.match(
    /ingredients?\s*[:\-]?\s*([\s\S]+?)(?:\bnutrition|\ballergen|\bstorage|\bmanufactured|\bpacked by|\bbest before|\bnet weight|$)/i
  );
  const ingredientSourceText = segMatch
    ? segMatch[1]
    : raw.replace(/\bnutrition\s*(?:facts|information)?[\s\S]*$/i, '');

  const parsedIngredients = ingredientSourceText
    .split(/[,;\n•]+/)
    .map((p) => p.replace(/\s+/g, ' ').replace(/^[ .:\-()]+|[ .:\-()]+$/g, ''))
    .filter((p) => p.length >= 2 && p.length <= 90 && !/^[\d.\s%gmkcal]+$/i.test(p))
    .slice(0, 40);

  let masked = ingredientSourceText.toLowerCase();
  const findings: IngredientFinding[] = [];
  const seen = new Set<string>();
  let ingScore = 72;
  let goodHits = 0;

  for (const [kw, label, reason] of [...CONCERN_INGREDIENTS].sort((a, b) => b[0].length - a[0].length)) {
    const re = new RegExp(`\\b${escapeRegExp(kw)}s?\\b`, 'g');
    if (re.test(masked)) {
      masked = masked.replace(re, ' ');
      if (!seen.has(label)) {
        seen.add(label);
        findings.push({ ingredient: label, rating: 'high', reason });
        ingScore -= 16;
      }
    }
  }

  for (const [kw, label, reason] of [...CAUTION_INGREDIENTS].sort((a, b) => b[0].length - a[0].length)) {
    const re = new RegExp(`\\b${escapeRegExp(kw)}s?\\b`, 'g');
    if (re.test(masked)) {
      masked = masked.replace(re, ' ');
      const normalizedLabel = label === 'Refined Wheat Flour (Maida)' ? 'Refined Flour (Maida)' : label;
      if (!seen.has(normalizedLabel)) {
        seen.add(normalizedLabel);
        const isTop = parsedIngredients.slice(0, 2).some((p) => p.toLowerCase().includes(kw));
        findings.push({
          ingredient: normalizedLabel,
          rating: 'moderate',
          reason: isTop ? `Listed near the top of the packet (${reason})` : reason,
        });
        ingScore -= isTop ? 10 : 6;
      }
    }
  }

  for (const [kw, label, reason] of [...BENEFICIAL_INGREDIENTS].sort((a, b) => b[0].length - a[0].length)) {
    const re = new RegExp(`\\b${escapeRegExp(kw)}s?\\b`, 'g');
    if (re.test(masked)) {
      masked = masked.replace(re, ' ');
      if (!seen.has(label)) {
        seen.add(label);
        findings.push({ ingredient: label, rating: 'good', reason });
        goodHits += 1;
        ingScore += goodHits <= 3 ? 7 : 3;
      }
    }
  }

  ingScore = round1(clip(ingScore, 8, 98));
  const combinedScore =
    nutritionAnalysis && findings.length > 0
      ? round1(0.55 * nutritionAnalysis.health_score + 0.45 * ingScore)
      : nutritionAnalysis
      ? round1(nutritionAnalysis.health_score)
      : ingScore;

  const verdict: PacketScanResult['verdict'] =
    combinedScore >= 68 ? 'Good' : combinedScore >= 44 ? 'Moderate' : 'Not Good';

  const reasons: ScanReason[] = findings.map((f) => ({
    type: f.rating === 'good' ? 'good' : f.rating === 'moderate' ? 'warning' : 'danger',
    text: `${f.ingredient}: ${f.reason}`,
  }));

  if (nutritionAnalysis) {
    for (const flag of nutritionAnalysis.nutrient_flags) {
      if (flag.status === 'good') {
        reasons.push({ type: 'good', text: `${flag.nutrient} (${flag.value_display}): ${flag.note}` });
      } else if (flag.status === 'moderate') {
        reasons.push({ type: 'warning', text: `${flag.nutrient} (${flag.value_display}): ${flag.note}` });
      } else {
        const prefix = flag.nutrient.toLowerCase() === 'protein' ? 'Low' : 'High';
        reasons.push({ type: 'danger', text: `${prefix} ${flag.nutrient} (${flag.value_display}): ${flag.note}` });
      }
    }
  }

  if (reasons.length === 0) {
    reasons.push({
      type: 'warning',
      text: `Parsed ${parsedIngredients.length} ingredient entries without flagged additives; review nutrition facts for sugar and sodium per serving.`,
    });
  }

  reasons.sort((a, b) => {
    const order = verdict === 'Good' ? { good: 0, warning: 1, danger: 2 } : { danger: 0, warning: 1, good: 2 };
    return order[a.type] - order[b.type];
  });

  const cleanName = productName.trim() || 'Scanned Food Packet';
  const summary =
    verdict === 'Good'
      ? `${cleanName} scores ${combinedScore}/100 (Good) — whole-food ingredients and balanced nutrient profile with low additive concern.`
      : verdict === 'Moderate'
      ? `${cleanName} scores ${combinedScore}/100 (Moderate) — contains refined ingredients or moderate sugar/fat/sodium; enjoy occasionally.`
      : `${cleanName} scores ${combinedScore}/100 (Not Good) — flagged for added sugars, refined/hydrogenated fats, high sodium, or synthetic additives.`;

  return {
    product_name: cleanName,
    verdict,
    score: combinedScore,
    nutrition_found: nutritionAnalysis !== null,
    ingredients_count: parsedIngredients.length,
    parsed_ingredients: parsedIngredients,
    ingredient_findings: findings,
    reasons: reasons.slice(0, 8),
    summary,
    nutrition_analysis: nutritionAnalysis,
  };
}

export async function searchOpenFoodFactsClient(
  query: string,
  limit = 8
): Promise<CatalogFoodItem[]> {
  const localMatches = FALLBACK_SAMPLES.filter((s) =>
    !query.trim() ? true : s.food.toLowerCase().includes(query.trim().toLowerCase())
  ).map((s) => ({
    food: s.food,
    food_norm: s.food.toLowerCase(),
    calories: s.calories,
    sugars: s.sugars,
    fat: s.fat,
    protein: s.protein,
    sodium_mg: s.sodium_mg,
    source_group: s.source_group,
  }));

  if (!query.trim()) {
    return localMatches.slice(0, limit);
  }

  try {
    const url = `https://search.openfoodfacts.org/search?q=${encodeURIComponent(query)}&page_size=${Math.min(limit * 2, 16)}&fields=product_name,brands,nutriments`;
    const res = await fetch(url);
    if (!res.ok) return localMatches.slice(0, limit);
    const data = await res.json();
    const hits: any[] = data?.hits || [];
    const results: CatalogFoodItem[] = [];
    for (const p of hits) {
      const name = String(p?.product_name || '').trim();
      const n = p?.nutriments || {};
      const kcal = n['energy-kcal_100g'] ?? n['energy-kcal_serving'] ?? n['energy-kcal'];
      if (!name || kcal == null) continue;
      const brand = String(p?.brands || '').split(',')[0]?.trim();
      const display = brand && !name.toLowerCase().includes(brand.toLowerCase()) ? `${name} (${brand})` : name;
      let sodiumMg = Number(n['sodium_100g'] ?? 0) * 1000;
      if (!sodiumMg && n['salt_100g']) sodiumMg = Number(n['salt_100g']) * 393.4;
      results.push({
        food: display.slice(0, 140),
        food_norm: display.toLowerCase(),
        calories: round1(Number(kcal) || 0),
        sugars: round1(Number(n['sugars_100g'] ?? 0)),
        fat: round1(Number(n['fat_100g'] ?? 0)),
        protein: round1(Number(n['proteins_100g'] ?? 0)),
        sodium_mg: round1(sodiumMg),
        source_group: 'Open Food Facts (Live Online)',
      });
      if (results.length >= limit) break;
    }
    return [...localMatches, ...results].slice(0, limit);
  } catch {
    return localMatches.slice(0, limit);
  }
}

export async function analyzeAmazonItemLocally(payload: {
  product_title: string;
  nutrition_text?: string;
  product_url?: string;
}): Promise<AmazonCartEvent> {
  const title = payload.product_title.trim();
  const parsed = payload.nutrition_text ? parseNutritionTextClient(payload.nutrition_text) : null;

  let nutritionInput = parsed;
  let nutritionSource = parsed ? 'Amazon Page Nutrition Facts' : '';
  let matchedFood: string | null = null;

  if (!nutritionInput) {
    const offItems = await searchOpenFoodFactsClient(title, 4);
    const online = offItems.find((i) => i.source_group.includes('Open Food Facts')) || offItems[0];
    if (online) {
      nutritionInput = {
        calories: online.calories,
        sugars: online.sugars,
        fat: online.fat,
        protein: online.protein,
        sodium_mg: online.sodium_mg,
      };
      nutritionSource = online.source_group;
      matchedFood = online.food;
    }
  }

  const eventId = Math.random().toString(36).slice(2, 10);
  if (!nutritionInput) {
    return {
      event_id: eventId,
      timestamp: new Date().toISOString(),
      source: 'amazon_web_intake',
      status: 'needs_nutrition',
      product_title: title,
      product_url: payload.product_url || null,
      nutrition_source: 'Nutrition Label Not Found on Page',
      matched_food: null,
      message: `Captured "${title}". Nutrition facts were not detected—enter label numbers in the Food Analyzer to classify.`,
      analysis: null,
    };
  }

  const analysis = analyzeNutritionLocally({
    food_name: title,
    ...nutritionInput,
  });

  return {
    event_id: eventId,
    timestamp: new Date().toISOString(),
    source: 'amazon_web_intake',
    status: 'analyzed',
    product_title: title,
    product_url: payload.product_url || null,
    nutrition_source: nutritionSource,
    matched_food: matchedFood,
    message: analysis.explanation,
    analysis,
  };
}
