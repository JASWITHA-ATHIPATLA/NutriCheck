import foodCatalogRaw from '../data/foodCatalog.json';
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

type CompactFoodRow = [string, number, number, number, number, number];
const COMPACT_CATALOG: CompactFoodRow[] = foodCatalogRaw as CompactFoodRow[];

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

interface StapleProfile {
  keywords: string[];
  name: string;
  calories: number;
  sugars: number;
  fat: number;
  protein: number;
  sodium_mg: number;
}

export const GROCERY_STAPLE_PROFILES: StapleProfile[] = [
  { keywords: ['brown rice', 'red rice', 'black rice', 'wild rice'], name: 'Brown Rice (Whole Grain, per 100g)', calories: 362, sugars: 0.7, fat: 2.7, protein: 7.5, sodium_mg: 4 },
  { keywords: ['basmati rice', 'sona masoori', 'jasmine rice', 'ponni rice', 'white rice', 'rice'], name: 'Rice (Dry Grain, per 100g)', calories: 356, sugars: 0.1, fat: 0.6, protein: 7.1, sodium_mg: 5 },
  { keywords: ['quinoa'], name: 'Quinoa (Whole Grain, per 100g)', calories: 368, sugars: 1.6, fat: 6.1, protein: 14.1, sodium_mg: 5 },
  { keywords: ['rolled oats', 'steel cut oats', 'oats', 'oatmeal'], name: 'Wholegrain Oats (per 100g)', calories: 375, sugars: 1.0, fat: 7.0, protein: 13.0, sodium_mg: 5 },
  { keywords: ['muesli', 'granola'], name: 'Granola / Muesli (per 100g)', calories: 410, sugars: 18.0, fat: 11.5, protein: 9.5, sodium_mg: 180 },
  { keywords: ['cornflakes', 'corn flakes', 'cereal'], name: 'Breakfast Cornflakes (per 100g)', calories: 378, sugars: 9.5, fat: 0.9, protein: 7.5, sodium_mg: 620 },
  { keywords: ['whole wheat', 'atta', 'multigrain flour', 'chakki', 'ragi', 'millet', 'jowar', 'bajra', 'besan'], name: 'Whole Grain Flour / Atta (per 100g)', calories: 341, sugars: 0.4, fat: 1.8, protein: 12.1, sodium_mg: 3 },
  { keywords: ['maida', 'all purpose flour', 'refined flour'], name: 'Refined White Flour / Maida (per 100g)', calories: 364, sugars: 0.3, fat: 1.0, protein: 10.3, sodium_mg: 2 },
  { keywords: ['toor dal', 'moong dal', 'masoor dal', 'chana dal', 'urad dal', 'lentil', 'dal', 'rajma', 'chickpea', 'kabuli chana'], name: 'Lentils / Dal (Dry, per 100g)', calories: 343, sugars: 2.0, fat: 1.5, protein: 22.3, sodium_mg: 12 },
  { keywords: ['brown bread', 'whole wheat bread', 'multigrain bread'], name: 'Whole Wheat Bread (per 100g)', calories: 252, sugars: 4.3, fat: 3.4, protein: 11.2, sodium_mg: 440 },
  { keywords: ['white bread', 'milk bread', 'bread', 'bun', 'pav'], name: 'Packaged Bread (per 100g)', calories: 266, sugars: 5.7, fat: 3.3, protein: 8.9, sodium_mg: 490 },
  { keywords: ['instant noodles', 'maggi', 'ramen', 'yippee', 'top ramen', 'cup noodles', 'noodles'], name: 'Instant Noodles (per 100g)', calories: 427, sugars: 2.1, fat: 15.7, protein: 8.2, sodium_mg: 1120 },
  { keywords: ['pasta', 'spaghetti', 'macaroni', 'penne', 'fusilli', 'vermicelli'], name: 'Dry Pasta / Vermicelli (per 100g)', calories: 358, sugars: 2.7, fat: 1.5, protein: 12.8, sodium_mg: 6 },
  { keywords: ['potato chips', 'lays', 'kurkure', 'bingo', 'doritos', 'pringles', 'nachos', 'namkeen', 'bhujia', 'mixture', 'chips'], name: 'Packaged Chips / Namkeen (per 100g)', calories: 536, sugars: 1.5, fat: 34.0, protein: 6.8, sodium_mg: 620 },
  { keywords: ['biscuit', 'cookies', 'oreo', 'parle', 'good day', 'bourbon', 'marie', 'cracker', 'rusk', 'wafer'], name: 'Packaged Biscuits / Cookies (per 100g)', calories: 472, sugars: 24.0, fat: 19.5, protein: 6.4, sodium_mg: 340 },
  { keywords: ['dark chocolate'], name: 'Dark Chocolate (per 100g)', calories: 546, sugars: 24.0, fat: 31.0, protein: 7.8, sodium_mg: 20 },
  { keywords: ['chocolate', 'dairy milk', 'kitkat', 'snickers', 'mars', 'candy', 'toffee', 'barfi', 'gulab jamun'], name: 'Chocolate / Confectionery (per 100g)', calories: 535, sugars: 51.5, fat: 29.7, protein: 7.6, sodium_mg: 79 },
  { keywords: ['coca cola', 'pepsi', 'sprite', 'fanta', 'thums up', 'mountain dew', 'soft drink', 'soda', 'cola', 'energy drink', 'red bull'], name: 'Sweetened Soft Drink (per 250ml)', calories: 105, sugars: 26.5, fat: 0.0, protein: 0.0, sodium_mg: 22 },
  { keywords: ['fruit juice', 'real juice', 'tropicana', 'mango drink', 'frooti', 'maaza', 'juice'], name: 'Packaged Fruit Juice / Nectar (per 250ml)', calories: 120, sugars: 27.0, fat: 0.0, protein: 0.4, sodium_mg: 25 },
  { keywords: ['green tea', 'herbal tea', 'chamomile', 'black tea', 'tea', 'chai', 'coffee', 'espresso', 'nescafe'], name: 'Unsweetened Tea / Coffee (Prepared)', calories: 5, sugars: 0.0, fat: 0.0, protein: 0.3, sodium_mg: 4 },
  { keywords: ['milk', 'toned milk', 'skim milk', 'almond milk', 'soy milk'], name: 'Milk (per 100ml)', calories: 61, sugars: 4.8, fat: 3.3, protein: 3.2, sodium_mg: 43 },
  { keywords: ['greek yogurt', 'yogurt', 'curd', 'dahi'], name: 'Plain Yogurt / Curd (per 100g)', calories: 63, sugars: 4.0, fat: 3.3, protein: 4.2, sodium_mg: 46 },
  { keywords: ['paneer', 'cottage cheese', 'tofu'], name: 'Paneer / Cottage Cheese (per 100g)', calories: 265, sugars: 1.2, fat: 20.8, protein: 18.3, sodium_mg: 30 },
  { keywords: ['mozzarella', 'cheddar', 'cheese'], name: 'Processed / Cheddar Cheese (per 100g)', calories: 375, sugars: 1.0, fat: 31.0, protein: 22.0, sodium_mg: 680 },
  { keywords: ['butter'], name: 'Salted Butter (per 100g)', calories: 717, sugars: 0.1, fat: 81.1, protein: 0.9, sodium_mg: 643 },
  { keywords: ['ghee'], name: 'Clarified Butter / Ghee (per 100g)', calories: 876, sugars: 0.0, fat: 99.5, protein: 0.0, sodium_mg: 2 },
  { keywords: ['olive oil'], name: 'Extra Virgin Olive Oil (per tbsp 15ml)', calories: 119, sugars: 0.0, fat: 13.5, protein: 0.0, sodium_mg: 0 },
  { keywords: ['sunflower oil', 'mustard oil', 'groundnut oil', 'coconut oil', 'cooking oil', 'refined oil', 'oil'], name: 'Cooking Oil (per tbsp 15ml)', calories: 120, sugars: 0.0, fat: 14.0, protein: 0.0, sodium_mg: 0 },
  { keywords: ['peanut butter', 'almond butter'], name: 'Nut / Peanut Butter (per 100g)', calories: 588, sugars: 9.2, fat: 50.0, protein: 25.1, sodium_mg: 420 },
  { keywords: ['mixed dry fruits', 'dry fruits', 'dry fruit', 'dryfruits', 'dryfruit', 'panchmewa', 'mixed nuts', 'trail mix', 'nut mix', 'nutmix'], name: 'Mixed Dry Fruits & Nuts (per 100g)', calories: 465, sugars: 14.0, fat: 28.5, protein: 14.2, sodium_mg: 6 },
  { keywords: ['almonds', 'almond', 'badam', 'walnuts', 'walnut', 'akhrot', 'pistachios', 'pistachio', 'pista', 'cashews', 'cashew', 'kaju', 'peanuts', 'peanut', 'hazelnuts', 'hazelnut', 'pecans', 'pecan', 'macadamia', 'chia seeds', 'chia', 'flaxseeds', 'flax seeds', 'flax', 'pumpkin seeds', 'pumpkin seed', 'sunflower seeds', 'sunflower seed', 'makhana', 'fox nut', 'fox nuts'], name: 'Nuts & Seeds (per 100g)', calories: 579, sugars: 4.4, fat: 49.9, protein: 21.2, sodium_mg: 4 },
  { keywords: ['dates', 'datiles', 'khajoor', 'raisins', 'raisin', 'kishmish', 'anjeer', 'dried fig', 'dried figs', 'dried apricot', 'dried apricots'], name: 'Dried Dates / Raisins / Figs (per 100g)', calories: 282, sugars: 63.0, fat: 0.4, protein: 2.5, sodium_mg: 3 },
  { keywords: ['honey'], name: 'Honey (per 100g)', calories: 304, sugars: 82.1, fat: 0.0, protein: 0.3, sodium_mg: 4 },
  { keywords: ['jaggery', 'gur', 'sugar'], name: 'Sugar / Sweetener (per 100g)', calories: 387, sugars: 99.8, fat: 0.0, protein: 0.0, sodium_mg: 1 },
  { keywords: ['ketchup', 'tomato sauce', 'sauce', 'chutney'], name: 'Tomato Ketchup / Sauce (per 100g)', calories: 112, sugars: 22.8, fat: 0.1, protein: 1.7, sodium_mg: 907 },
  { keywords: ['mayonnaise', 'mayo', 'dressing'], name: 'Mayonnaise / Dressing (per 100g)', calories: 680, sugars: 1.0, fat: 75.0, protein: 1.0, sodium_mg: 635 },
  { keywords: ['jam', 'marmalade', 'nutella', 'spread'], name: 'Fruit Jam / Sweet Spread (per 100g)', calories: 278, sugars: 48.5, fat: 0.1, protein: 0.4, sodium_mg: 32 },
  { keywords: ['whey protein', 'protein powder', 'protein bar'], name: 'Protein Supplement / Bar (per serving)', calories: 130, sugars: 2.5, fat: 2.0, protein: 24.0, sodium_mg: 140 },
  { keywords: ['egg'], name: 'Eggs (per 100g)', calories: 143, sugars: 0.4, fat: 9.5, protein: 12.6, sodium_mg: 142 },
  { keywords: ['chicken'], name: 'Chicken Breast (per 100g)', calories: 165, sugars: 0.0, fat: 3.6, protein: 31.0, sodium_mg: 74 },
  { keywords: ['salmon', 'tuna', 'fish', 'prawns'], name: 'Fish / Seafood (per 100g)', calories: 184, sugars: 0.0, fat: 8.1, protein: 25.4, sodium_mg: 62 },
  { keywords: ['turmeric', 'cumin', 'coriander', 'garam masala', 'masala', 'pepper', 'cinnamon', 'spice', 'seasoning'], name: 'Culinary Spices / Herbs (per 10g)', calories: 31, sugars: 0.3, fat: 0.8, protein: 1.1, sodium_mg: 18 },
  { keywords: ['salt', 'rock salt', 'sea salt'], name: 'Culinary Salt (per 5g)', calories: 0, sugars: 0.0, fat: 0.0, protein: 0.0, sodium_mg: 1938 },
  { keywords: ['apple', 'banana', 'orange', 'mango', 'berry', 'berries', 'grape', 'watermelon', 'fruit'], name: 'Fresh Fruit (per 100g)', calories: 58, sugars: 11.2, fat: 0.2, protein: 0.7, sodium_mg: 1 },
  { keywords: ['broccoli', 'spinach', 'carrot', 'tomato', 'onion', 'potato', 'beans', 'peas', 'vegetable'], name: 'Fresh Vegetable (per 100g)', calories: 42, sugars: 2.5, fat: 0.3, protein: 2.1, sodium_mg: 22 },
  { keywords: ['poha', 'suji', 'rava', 'sooji', 'semolina', 'dalia', 'broken wheat', 'vermicelli', 'seviyan'], name: 'Wholesome Grain / Poha / Dalia / Suji (per 100g)', calories: 356, sugars: 1.0, fat: 1.2, protein: 9.8, sodium_mg: 6 },
  { keywords: ['soya chunks', 'soybean', 'soybeans', 'nutrela', 'soya granules'], name: 'Soya Chunks / Plant Protein (per 100g)', calories: 345, sugars: 2.0, fat: 0.5, protein: 52.0, sodium_mg: 12 },
  { keywords: ['coconut water', 'tender coconut'], name: 'Unsweetened Coconut Water (per 250ml)', calories: 46, sugars: 6.5, fat: 0.2, protein: 1.8, sodium_mg: 105 },
  { keywords: ['bournvita', 'horlicks', 'complan', 'boost', 'milo', 'malt drink'], name: 'Malted Milk Health Drink Mix (per 100g)', calories: 396, sugars: 32.0, fat: 2.8, protein: 11.0, sodium_mg: 240 },
  { keywords: ['rooh afza', 'sharbat', 'squash'], name: 'Flavored Sugar Syrup / Sharbat (per 100ml)', calories: 280, sugars: 70.0, fat: 0.0, protein: 0.0, sodium_mg: 15 },
  { keywords: ['soan papdi', 'laddu', 'laddoo', 'rasgulla', 'gulab jamun', 'halwa', 'barfi', 'peda'], name: 'Indian Packaged Sweets (per 100g)', calories: 430, sugars: 46.0, fat: 18.0, protein: 4.5, sodium_mg: 45 },
  { keywords: ['ice cream', 'kulfi', 'gelato'], name: 'Ice Cream (per 100g)', calories: 207, sugars: 21.2, fat: 11.0, protein: 3.5, sodium_mg: 80 },
  { keywords: ['pickle', 'achar', 'achaar', 'papad'], name: 'Pickles / Papad (per 100g)', calories: 220, sugars: 2.0, fat: 11.0, protein: 4.5, sodium_mg: 2400 },
];

function clip(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function round1(val: number): number {
  return Math.round(val * 10) / 10;
}

function isWholeNutOrSeedClient(name: string, n: { sugars: number; sodium_mg: number }): boolean {
  const lower = (name || '').toLowerCase();
  const hasNutSeed = /\b(almonds?|badam|walnuts?|akhrot|pistachios?|pista|cashews?|kaju|peanuts?|hazelnuts?|pecans?|macadamias?|chia|flax(?:seeds?)?|pumpkin seeds?|sunflower seeds?|sesame|mixed nuts?|dry\s*fruits?|dryfruits?|panchmewa|trail mix|nut\s*mix|nutmix|makhana|fox nuts?|olive oil)\b/i.test(lower);
  const hasJunk = /\b(chocolate|candy|bar|cookie|biscuit|cake|pastry|ice cream|fried|chips|namkeen|bhujia|caramel|sugar coated|syrup|honey roasted|salted|masala|butter|nutella|sauce)\b/i.test(lower);
  return hasNutSeed && !hasJunk && n.sodium_mg <= 180 && n.sugars <= 30;
}

function isNaturalDriedFruitClient(name: string, n: { fat: number; sodium_mg: number }): boolean {
  const lower = (name || '').toLowerCase();
  const hasDried = /\b(dates?|datiles|khajoor|raisins?|kishmish|figs?|anjeer|prunes?|apricots?)\b/i.test(lower);
  const hasJunk = /\b(chocolate|candy|syrup|jam|cake|cookie|bar|sugar|juice)\b/i.test(lower);
  return hasDried && !hasJunk && n.sodium_mg <= 40 && n.fat <= 5;
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

  const wholeNut = isWholeNutOrSeedClient(input.food_name, { sugars, sodium_mg });
  const wholeDriedFruit = !wholeNut && isNaturalDriedFruitClient(input.food_name, { fat, sodium_mg });

  let pen_sugar =
    clip((sugar_kcal_pct - 10) * 0.75, 0, 35) + clip((sugars - 20) * 0.4, 0, 10);
  let pen_fat = clip((fat_kcal_pct - 30) * 0.65, 0, 18);
  const pen_sod =
    clip((sodium_per_100kcal - 115) * 0.08, 0, 22) + clip((sodium_mg - 500) * 0.012, 0, 10);
  let pen_ed = clip((kcal - 260) * 0.035, 0, 12);
  const bon_prot = clip(protein_kcal_pct * 0.4, 0, 12);
  let bon_whole =
    kcal < 160 && sugar_kcal_pct < 35 && sodium_per_100kcal < 150 ? 5 : 0;

  if (wholeNut) {
    pen_fat *= 0.2;
    pen_ed *= 0.25;
    pen_sugar *= 0.35;
    bon_whole += 8;
  } else if (wholeDriedFruit) {
    pen_sugar *= 0.45;
    bon_whole += 4;
  }

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
    Unhealthy: round1((dU_val(dUnhealthy) / sumD) * 100),
  };
  const confidence = probabilities[classification];

  const flags: NutrientFlag[] = [];
  const concerns: string[] = [];
  const strengths: string[] = [];

  if (wholeNut || wholeDriedFruit) {
    flags.push({
      nutrient: 'Sugar',
      value_display: `${round1(sugars)} g`,
      status: sugars > 40 ? 'moderate' : 'good',
      note: `${round1(sugar_kcal_pct)}% of kcal (natural fruit/nut sugars)`,
    });
    if (sugars <= 15) strengths.push('low natural sugar');
  } else if (sugar_kcal_pct > 25 || sugars > 20) {
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

  if (wholeNut) {
    flags.push({
      nutrient: 'Total Fat',
      value_display: `${round1(fat)} g`,
      status: 'good',
      note: `${round1(fat_kcal_pct)}% of kcal (heart-healthy unsaturated fats)`,
    });
    strengths.push('heart-healthy unsaturated fats');
  } else if (fat_kcal_pct > 45) {
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

  if (protein_kcal_pct >= 20 || (wholeNut && protein >= 12)) {
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
      status: Number(input.calories) >= 120 ? 'moderate' : 'moderate',
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
    explanation = `${foodName} is Good (${health_score}/100) due to ${pos} across ${round1(input.calories)} kcal.`;
    cart_alert = {
      level: 'success',
      title: 'Good Choice Added',
      message: `${foodName} scored ${health_score}/100 with a balanced nutrient profile. Safe for everyday meals.`,
    };
  } else if (classification === 'Moderate') {
    const driver =
      concerns.length > 0
        ? `driven by ${concerns.slice(0, 2).join(', ')}`
        : 'due to borderline sugar, fat, or sodium density';
    explanation = `${foodName} is Moderate (${health_score}/100), ${driver}. Enjoy in controlled portions alongside fiber-rich whole foods.`;
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
    explanation = `${foodName} is Not Good (${health_score}/100), ${driver}. Frequent intake may exceed daily WHO/FDA sugar, fat, or sodium limits.`;
    cart_alert = {
      level: 'danger',
      title: 'Health Warning: Not Good Item',
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

function dU_val(v: number): number {
  return v;
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
  const carbs = grab(/(?:total\s+)?carbohydrate[s]?\s*[:|\-]?\s*(\d+(?:\.\d+)?)\s*g\b/i);

  let sodium_mg: number | null = null;
  const sodMg = normalized.match(/sodium\s*[:|\-]?\s*(\d+(?:\.\d+)?)\s*mg\b/i);
  const sodG = normalized.match(/sodium\s*[:|\-]?\s*(\d+(?:\.\d+)?)\s*g\b/i);
  const saltG = normalized.match(/salt\s*[:|\-]?\s*(\d+(?:\.\d+)?)\s*g\b/i);
  if (sodMg) sodium_mg = parseFloat(sodMg[1]);
  else if (sodG) sodium_mg = parseFloat(sodG[1]) * 1000;
  else if (saltG) sodium_mg = parseFloat(saltG[1]) * 393.4;

  const foundCount = [sugars, fat, protein, sodium_mg, carbs].filter((v) => v !== null).length;
  if (foundCount < 1) return null;

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
  ['basmati rice', 'Basmati Rice', 'Natural aromatic grain with minimal fat and sodium.'],
  ['rice', 'Rice Grain', 'Whole or milled rice base with very low fat, sugar, and sodium.'],
  ['almond', 'Almonds', 'Heart-healthy monounsaturated fats, vitamin E, and protein.'],
  ['walnut', 'Walnuts', 'Source of plant omega-3 fats and antioxidants.'],
  ['cashew', 'Cashews', 'Source of minerals, plant protein, and unsaturated fats.'],
  ['pistachio', 'Pistachios', 'Nutrient-dense tree nut with fiber and protein.'],
  ['peanut', 'Peanuts', 'Good source of protein and unsaturated fats.'],
  ['raisin', 'Raisins', 'Natural dried fruit rich in iron, potassium, and fiber.'],
  ['date', 'Dates', 'Natural whole fruit sweetener with fiber and minerals.'],
  ['fig', 'Figs', 'Natural dried fruit high in fiber and calcium.'],
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

export function matchStapleOrCatalogClient(
  title: string
): {
  matched_food: string;
  source: string;
  calories: number;
  sugars: number;
  fat: number;
  protein: number;
  sodium_mg: number;
} | null {
  const norm = title.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!norm) return null;

  // 1. Check grocery staple profiles (longest keyword first)
  let bestStaple: { profile: StapleProfile; len: number } | null = null;
  for (const profile of GROCERY_STAPLE_PROFILES) {
    for (const kw of profile.keywords) {
      const re = new RegExp(`\\b${escapeRegExp(kw)}\\b`, 'i');
      if (re.test(norm) && (!bestStaple || kw.length > bestStaple.len)) {
        bestStaple = { profile, len: kw.length };
      }
    }
  }
  if (bestStaple) {
    const p = bestStaple.profile;
    return {
      matched_food: p.name,
      source: 'Grocery Staple Nutrition Profile',
      calories: p.calories,
      sugars: p.sugars,
      fat: p.fat,
      protein: p.protein,
      sodium_mg: p.sodium_mg,
    };
  }

  // 2. Match against full 2,158-food cleaned CSV dataset
  const qTokens = norm.split(' ').filter((t) => t.length > 1);
  if (!qTokens.length) return null;
  let bestRow: CompactFoodRow | null = null;
  let bestScore = 0;

  for (const row of COMPACT_CATALOG) {
    const cand = row[0].toLowerCase();
    if (cand === norm) {
      bestRow = row;
      bestScore = 1;
      break;
    }
    const cTokens = cand.split(/\s+/).filter((t) => t.length > 1);
    const overlap = qTokens.filter((t) => cTokens.includes(t)).length;
    if (!overlap) continue;
    const score = overlap / new Set([...qTokens, ...cTokens]).size;
    if (score > bestScore) {
      bestScore = score;
      bestRow = row;
    }
  }

  if (bestRow && bestScore >= 0.25) {
    return {
      matched_food: bestRow[0],
      source: 'Matched Dataset Food (2,158-food catalog)',
      calories: bestRow[1],
      sugars: bestRow[2],
      fat: bestRow[3],
      protein: bestRow[4],
      sodium_mg: bestRow[5],
    };
  }

  return null;
}

export async function searchOpenFoodFactsClient(
  query: string,
  limit = 8
): Promise<CatalogFoodItem[]> {
  const q = query.trim().toLowerCase();
  const stapleMatches: CatalogFoodItem[] = GROCERY_STAPLE_PROFILES.filter((p) =>
    !q ? false : p.keywords.some((kw) => kw.includes(q) || q.includes(kw))
  ).map((p) => ({
    food: p.name,
    food_norm: p.name.toLowerCase(),
    calories: p.calories,
    sugars: p.sugars,
    fat: p.fat,
    protein: p.protein,
    sodium_mg: p.sodium_mg,
    source_group: 'Grocery Staple Nutrition Profile',
  }));

  const localCatalogMatches: CatalogFoodItem[] = (!q
    ? FALLBACK_SAMPLES.map((s) => ({
        food: s.food,
        food_norm: s.food.toLowerCase(),
        calories: s.calories,
        sugars: s.sugars,
        fat: s.fat,
        protein: s.protein,
        sodium_mg: s.sodium_mg,
        source_group: s.source_group,
      }))
    : COMPACT_CATALOG.filter((row) => row[0].toLowerCase().includes(q))
        .slice(0, limit)
        .map((row) => ({
          food: row[0],
          food_norm: row[0].toLowerCase(),
          calories: row[1],
          sugars: row[2],
          fat: row[3],
          protein: row[4],
          sodium_mg: row[5],
          source_group: 'Cleaned Nutrition Dataset',
        })));

  if (!q) {
    return localCatalogMatches.slice(0, limit);
  }

  const combinedLocal = [...stapleMatches, ...localCatalogMatches];

  try {
    const url = `https://search.openfoodfacts.org/search?q=${encodeURIComponent(query)}&page_size=${Math.min(limit * 2, 16)}&fields=product_name,brands,nutriments`;
    const res = await fetch(url);
    if (!res.ok) return combinedLocal.slice(0, limit);
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
    return [...combinedLocal, ...results].slice(0, limit);
  } catch {
    return combinedLocal.slice(0, limit);
  }
}

export async function analyzeAmazonItemLocally(payload: {
  product_title: string;
  nutrition_text?: string;
  ingredients_text?: string;
  product_url?: string;
}): Promise<AmazonCartEvent> {
  const title = payload.product_title.trim();
  const combinedLabelText = [payload.ingredients_text || '', payload.nutrition_text || '']
    .filter(Boolean)
    .join('\n');

  const parsed = combinedLabelText ? parseNutritionTextClient(combinedLabelText) : null;
  const hasIngredients = Boolean(
    payload.ingredients_text?.trim() ||
      /\bingredients?\b/i.test(payload.nutrition_text || '')
  );
  const ingredientScan = hasIngredients
    ? scanPacketLocally(title, combinedLabelText)
    : null;

  let nutritionInput = parsed;
  let nutritionSource = parsed ? 'Amazon Page Nutrition Facts' : '';
  let matchedFood: string | null = null;

  const stapleOrCatalog = !nutritionInput ? matchStapleOrCatalogClient(title) : null;
  const titleWords = title.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').trim().split(/\s+/).filter(Boolean);
  const isPureStaple = stapleOrCatalog?.source === 'Grocery Staple Nutrition Profile' && titleWords.length <= 2;

  if (!nutritionInput && !isPureStaple) {
    const offItems = await searchOpenFoodFactsClient(title, 4);
    const online = offItems.find((i) => {
      if (!i.source_group.includes('Open Food Facts')) return false;
      if (!stapleOrCatalog) return true;
      const qTokens = titleWords.filter((t) => t.length > 2);
      const hNorm = i.food_norm;
      const overlap = qTokens.filter((t) => hNorm.includes(t)).length;
      return qTokens.length > 0 && overlap / qTokens.length >= 0.5;
    });
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

  if (!nutritionInput && stapleOrCatalog) {
    nutritionInput = {
      calories: stapleOrCatalog.calories,
      sugars: stapleOrCatalog.sugars,
      fat: stapleOrCatalog.fat,
      protein: stapleOrCatalog.protein,
      sodium_mg: stapleOrCatalog.sodium_mg,
    };
    nutritionSource = stapleOrCatalog.source;
    matchedFood = stapleOrCatalog.matched_food;
  }

  const eventId = Math.random().toString(36).slice(2, 10);
  if (!nutritionInput && !ingredientScan) {
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
      ingredients_text: payload.ingredients_text || null,
      ingredient_scan: null,
    };
  }

  const finalNutrition = nutritionInput || {
    calories: 150,
    sugars: 0,
    fat: 0,
    protein: 0,
    sodium_mg: 0,
  };
  const analysis = analyzeNutritionLocally({
    food_name: title,
    ...finalNutrition,
  });

  if (ingredientScan && !nutritionInput) {
    nutritionSource = 'Amazon Page Ingredients Scan';
  } else if (ingredientScan && nutritionInput) {
    nutritionSource = `${nutritionSource} + Amazon Ingredients`;
  }

  return {
    event_id: eventId,
    timestamp: new Date().toISOString(),
    source: 'amazon_web_intake',
    status: 'analyzed',
    product_title: title,
    product_url: payload.product_url || null,
    nutrition_source: nutritionSource,
    matched_food: matchedFood,
    message: ingredientScan
      ? `${analysis.explanation} Scanned ${ingredientScan.ingredients_count} ingredients (${ingredientScan.verdict}).`
      : analysis.explanation,
    analysis,
    ingredients_text: payload.ingredients_text || null,
    ingredient_scan: ingredientScan,
  };
}
