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
  { keywords: ['walnuts', 'walnut', 'akhrot'], name: 'Walnuts (Unsalted Whole, per 100g)', calories: 654, sugars: 2.6, fat: 65.2, protein: 15.2, sodium_mg: 2 },
  { keywords: ['almonds', 'almond', 'badam'], name: 'Almonds (Unsalted Whole, per 100g)', calories: 579, sugars: 4.4, fat: 49.9, protein: 21.2, sodium_mg: 1 },
  { keywords: ['pistachios', 'pistachio', 'pista', 'cashews', 'cashew', 'kaju', 'peanuts', 'peanut', 'hazelnuts', 'hazelnut', 'pecans', 'pecan', 'macadamia', 'chia seeds', 'chia', 'flaxseeds', 'flax seeds', 'flax', 'pumpkin seeds', 'pumpkin seed', 'sunflower seeds', 'sunflower seed', 'makhana', 'fox nut', 'fox nuts'], name: 'Nuts & Seeds (per 100g)', calories: 579, sugars: 4.4, fat: 49.9, protein: 21.2, sodium_mg: 4 },
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
  { keywords: ['blueberries', 'blueberry'], name: 'Blueberries (Fresh Whole, per 100g)', calories: 57, sugars: 10.0, fat: 0.3, protein: 0.7, sodium_mg: 1 },
  { keywords: ['strawberries', 'strawberry', 'raspberries', 'raspberry', 'blackberries', 'blackberry', 'cranberries', 'cranberry', 'berries', 'berry'], name: 'Fresh Berries (Whole, per 100g)', calories: 46, sugars: 7.5, fat: 0.4, protein: 1.0, sodium_mg: 1 },
  { keywords: ['avocado', 'avocados'], name: 'Avocado (Fresh Whole, per 100g)', calories: 160, sugars: 0.7, fat: 14.7, protein: 2.0, sodium_mg: 7 },
  { keywords: ['apple', 'apples', 'banana', 'bananas', 'orange', 'oranges', 'mango', 'grape', 'grapes', 'watermelon', 'kiwi', 'papaya', 'guava', 'pomegranate', 'pear', 'fruit'], name: 'Fresh Fruit (Whole, per 100g)', calories: 58, sugars: 11.2, fat: 0.2, protein: 0.7, sodium_mg: 1 },
  { keywords: ['broccoli', 'spinach', 'carrot', 'tomato', 'onion', 'potato', 'beans', 'peas', 'vegetable'], name: 'Fresh Vegetable (per 100g)', calories: 42, sugars: 2.5, fat: 0.3, protein: 2.1, sodium_mg: 22 },
  { keywords: ['poha', 'suji', 'rava', 'sooji', 'semolina', 'dalia', 'broken wheat', 'vermicelli', 'seviyan'], name: 'Wholesome Grain / Poha / Dalia / Suji (per 100g)', calories: 356, sugars: 1.0, fat: 1.2, protein: 9.8, sodium_mg: 6 },
  { keywords: ['soya chunks', 'soybean', 'soybeans', 'nutrela', 'soya granules'], name: 'Soya Chunks / Plant Protein (per 100g)', calories: 345, sugars: 2.0, fat: 0.5, protein: 52.0, sodium_mg: 12 },
  { keywords: ['coconut water', 'tender coconut'], name: 'Unsweetened Coconut Water (per 250ml)', calories: 46, sugars: 6.5, fat: 0.2, protein: 1.8, sodium_mg: 105 },
  { keywords: ['bournvita', 'horlicks', 'complan', 'boost', 'milo', 'malt drink'], name: 'Malted Milk Health Drink Mix (per 100g)', calories: 396, sugars: 32.0, fat: 2.8, protein: 11.0, sodium_mg: 240 },
  { keywords: ['rooh afza', 'sharbat', 'squash'], name: 'Flavored Sugar Syrup / Sharbat (per 100ml)', calories: 280, sugars: 70.0, fat: 0.0, protein: 0.0, sodium_mg: 15 },
  { keywords: ['soan papdi', 'laddu', 'laddoo', 'rasgulla', 'gulab jamun', 'halwa', 'barfi', 'peda'], name: 'Indian Packaged Sweets (per 100g)', calories: 430, sugars: 46.0, fat: 18.0, protein: 4.5, sodium_mg: 45 },
  { keywords: ['ice cream', 'kulfi', 'gelato'], name: 'Ice Cream (per 100g)', calories: 207, sugars: 21.2, fat: 11.0, protein: 3.5, sodium_mg: 80 },
  { keywords: ['pickle', 'achar', 'achaar', 'papad'], name: 'Pickles / Papad (per 100g)', calories: 220, sugars: 2.0, fat: 11.0, protein: 4.5, sodium_mg: 2400 },
  // Popular Swiggy / Zomato / Quick-Commerce Dishes & Meals
  { keywords: ['chicken biryani', 'mutton biryani', 'hyderabadi biryani', 'dum biryani', 'biryani'], name: 'Biryani (per 100g)', calories: 168, sugars: 1.2, fat: 6.4, protein: 9.2, sodium_mg: 380 },
  { keywords: ['veg biryani', 'pulao', 'pulav', 'jeera rice'], name: 'Veg Biryani / Pulao (per 100g)', calories: 142, sugars: 1.5, fat: 4.5, protein: 3.6, sodium_mg: 310 },
  { keywords: ['paneer butter masala', 'paneer tikka masala', 'shahi paneer', 'kadai paneer', 'palak paneer'], name: 'Paneer Curry Dish (per 100g)', calories: 195, sugars: 3.8, fat: 14.5, protein: 7.4, sodium_mg: 440 },
  { keywords: ['butter chicken', 'chicken curry', 'chicken tikka masala'], name: 'Creamy Chicken Curry (per 100g)', calories: 185, sugars: 3.2, fat: 11.2, protein: 14.5, sodium_mg: 450 },
  { keywords: ['tandoori chicken', 'chicken tikka', 'paneer tikka', 'grilled chicken', 'kebab'], name: 'Grilled Tandoori / Tikka (per 100g)', calories: 168, sugars: 1.0, fat: 7.2, protein: 22.5, sodium_mg: 420 },
  { keywords: ['masala dosa', 'plain dosa', 'rava dosa', 'dosa'], name: 'Dosa (South Indian Crepe, per 100g)', calories: 168, sugars: 1.4, fat: 4.2, protein: 4.3, sodium_mg: 290 },
  { keywords: ['idli', 'idli sambar', 'medu vada'], name: 'Steamed Idli / Breakfast (per 100g)', calories: 118, sugars: 0.8, fat: 0.9, protein: 3.9, sodium_mg: 220 },
  { keywords: ['sambar', 'dal tadka', 'dal makhani', 'rajma chawal', 'khichdi'], name: 'Dal / Sambar / Khichdi Meal (per 100g)', calories: 126, sugars: 1.8, fat: 4.2, protein: 5.8, sodium_mg: 320 },
  { keywords: ['pizza', 'margherita', 'pepperoni'], name: 'Baked Cheese Pizza (per 100g)', calories: 266, sugars: 3.6, fat: 10.1, protein: 11.4, sodium_mg: 598 },
  { keywords: ['burger', 'zinger', 'mcveggie', 'mcchicken', 'whopper'], name: 'Fast-Food Burger (per 100g)', calories: 272, sugars: 5.4, fat: 12.8, protein: 12.2, sodium_mg: 540 },
  { keywords: ['french fries', 'peri peri fries', 'fries'], name: 'Deep-Fried French Fries (per 100g)', calories: 312, sugars: 0.3, fat: 14.7, protein: 3.4, sodium_mg: 410 },
  { keywords: ['momos', 'dumpling', 'dimsum'], name: 'Steamed / Fried Momos (per 100g)', calories: 215, sugars: 1.8, fat: 6.5, protein: 7.8, sodium_mg: 460 },
  { keywords: ['pav bhaji', 'chole bhature', 'vada pav', 'samosa', 'kachori', 'pakora'], name: 'Fried / Street Food Snack (per 100g)', calories: 295, sugars: 3.4, fat: 15.8, protein: 6.1, sodium_mg: 520 },
  { keywords: ['chowmein', 'hakka noodles', 'fried rice', 'manchurian'], name: 'Indo-Chinese Stir-Fry (per 100g)', calories: 218, sugars: 3.2, fat: 9.2, protein: 5.5, sodium_mg: 560 },
  { keywords: ['paratha', 'aloo paratha', 'naan', 'roti', 'chapati', 'kulcha'], name: 'Indian Flatbread / Paratha (per 100g)', calories: 275, sugars: 1.6, fat: 9.2, protein: 7.5, sodium_mg: 380 },
  { keywords: ['shawarma', 'kathi roll', 'frankie', 'wrap', 'sandwich', 'sub'], name: 'Wrap / Roll / Sandwich (per 100g)', calories: 224, sugars: 3.2, fat: 8.6, protein: 10.8, sodium_mg: 465 },
  { keywords: ['salad', 'sprouts', 'poke bowl', 'buddha bowl', 'quinoa bowl'], name: 'Fresh Salad / Protein Bowl (per 100g)', calories: 82, sugars: 2.6, fat: 3.4, protein: 5.2, sodium_mg: 140 },
  { keywords: ['cold coffee', 'milkshake', 'thick shake', 'frappe', 'boba', 'falooda'], name: 'Sweetened Shake / Cold Coffee (per 250ml)', calories: 215, sugars: 28.0, fat: 7.2, protein: 5.0, sodium_mg: 115 },
  { keywords: ['brownie', 'cheesecake', 'pastry', 'cupcake', 'muffin', 'waffle'], name: 'Bakery Dessert / Brownie / Pastry (per 100g)', calories: 405, sugars: 32.0, fat: 21.0, protein: 5.2, sodium_mg: 260 },
  { keywords: ['dhokla', 'khandvi', 'upma', 'pongal'], name: 'Steamed Indian Breakfast (per 100g)', calories: 152, sugars: 2.8, fat: 4.5, protein: 5.2, sodium_mg: 270 },
  { keywords: ['thali'], name: 'Balanced Indian Thali (per 100g)', calories: 148, sugars: 2.4, fat: 5.2, protein: 5.8, sodium_mg: 310 },
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

function isWholeFreshFruitOrBerryClient(
  name: string,
  n: { sugars: number; fat: number; sodium_mg: number }
): boolean {
  const lower = (name || '').toLowerCase();
  const hasFruit = /\b(blueberr(?:y|ies)|strawberr(?:y|ies)|raspberr(?:y|ies)|blackberr(?:y|ies)|cranberr(?:y|ies)|berr(?:y|ies)|avocados?|apples?|oranges?|pears?|guavas?|kiwis?|papayas?|pomegranates?|watermelon|fresh fruit)\b/i.test(
    lower
  );
  const hasJunkOrDried = /\b(dried|candied|chocolate|candy|cookie|biscuit|cake|muffin|pastry|pie|jam|jelly|marmalade|juice|nectar|sharbat|squash|syrup|soda|ice cream|yogurt|smoothie)\b/i.test(
    lower
  );
  return (
    hasFruit &&
    !hasJunkOrDried &&
    n.sodium_mg <= 45 &&
    n.sugars <= 16 &&
    (n.fat <= 5 || /\bavocado\b/i.test(lower))
  );
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
  const wholeFreshFruit =
    !wholeNut && isWholeFreshFruitOrBerryClient(input.food_name, { sugars, fat, sodium_mg });
  const wholeDriedFruit =
    !wholeNut && !wholeFreshFruit && isNaturalDriedFruitClient(input.food_name, { fat, sodium_mg });

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
  } else if (wholeFreshFruit) {
    pen_sugar *= 0.12;
    pen_fat *= 0.2;
    bon_whole += 10;
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

  if (wholeNut || wholeFreshFruit || wholeDriedFruit) {
    flags.push({
      nutrient: 'Sugar',
      value_display: `${round1(sugars)} g`,
      status: sugars > 40 ? 'moderate' : 'good',
      note: `${round1(sugar_kcal_pct)}% of kcal (intrinsic whole-food sugars with fiber)`,
    });
    if (sugars <= 15) strengths.push('low glycemic natural sugar');
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

  // Strip "2,000 calorie(s) diet" footnotes so footnote energy doesn't spoof label energy
  const cleanedRaw = text
    .replace(/\r\n?/g, '\n')
    .replace(/based on a?\s*[\d,]+\s*(?:kcal|calories?)\s*diet/gi, ' ')
    .replace(/[\d,]+\s*(?:kcal|calories?)\s*diet/gi, ' ');

  const normalized = cleanedRaw.replace(/\|/g, ' ').replace(/\s+/g, ' ').trim();
  const hasLabelHeader = /\b(?:nutrition(?:al)?\s*(?:facts|information|values)|per\s*100\s*g|per\s*serving|energy\s*\(?\s*k?cal)\b/i.test(
    cleanedRaw
  );

  // Calories / Energy: supports "Energy (kcal) 654", "Calories: 379 kcal", "Energy 427"
  const calMatch =
    normalized.match(
      /(?:calories|energy)\s*\(\s*(?:k?cal|keal)\s*(?:\/\s*kj)?\s*\)\s*[:|\-]?\s*(\d+(?:\.\d+)?)(?!\s*%)/i
    ) ||
    normalized.match(
      /(?:calories|energy)\s*[:|\-]?\s*(\d+(?:\.\d+)?)\s*(?:kcal|cal|keal)\b/i
    ) ||
    (hasLabelHeader
      ? normalized.match(/(?:calories|energy)\s*[:|\-]?\s*(\d+(?:\.\d+)?)\b(?!\s*(?:%|kj\b|g\b|mg\b))/i)
      : null);

  if (!calMatch) return null;
  const calories = parseFloat(calMatch[1]);

  const grabMacroGrams = (
    namePattern: string,
    options?: { allowBare?: boolean }
  ): number | null => {
    // 1. Unit before number: e.g. "Total Sugars (g) 2.6", "Protein (gm): 15.2"
    const unitBefore = new RegExp(
      `(?:${namePattern})\\s*\\(\\s*g(?:ms?)?\\s*\\)\\s*[:|\\-]?\\s*(\\d+(?:\\.\\d+)?)(?!\\s*%)`,
      'i'
    );
    const mBefore = normalized.match(unitBefore);
    if (mBefore) return parseFloat(mBefore[1]);

    // 2. Unit after number: e.g. "Total Fat: 65.2 g", "Sugars 2.6g"
    const unitAfter = new RegExp(
      `(?:${namePattern})\\s*[:|\\-]?\\s*(\\d+(?:\\.\\d+)?)\\s*g(?:ms?)?\\b`,
      'i'
    );
    const mAfter = normalized.match(unitAfter);
    if (mAfter) return parseFloat(mAfter[1]);

    // 3. Bare tabular number when explicit nutrition table header exists
    if (options?.allowBare && hasLabelHeader) {
      const bare = new RegExp(
        `(?:${namePattern})\\s*[:|\\-]?\\s*(\\d+(?:\\.\\d+)?)\\b(?!\\s*(?:%|mg\\b|kcal\\b))`,
        'i'
      );
      const mBare = normalized.match(bare);
      if (mBare) {
        const val = parseFloat(mBare[1]);
        if (val <= 105) return val;
      }
    }
    return null;
  };

  // Sugars: prioritize Total Sugars -> Of which sugars -> plain Sugars (excluding Added Sugar) -> Added Sugar
  const normalizedNoAdded = normalized.replace(/\badded\s+sugars?\b/gi, ' __added_sugar__ ');
  let sugars = grabMacroGrams('\\btotal\\s+sugars?', { allowBare: true });
  if (sugars === null) {
    sugars = grabMacroGrams('\\bof\\s+which\\s+sugars?', { allowBare: true });
  }
  if (sugars === null) {
    const mPlainSugBefore = normalizedNoAdded.match(
      /\bsugars?\s*\(\s*g(?:ms?)?\s*\)\s*[:|\-]?\s*(\d+(?:\.\d+)?)(?!\s*%)/i
    );
    const mPlainSugAfter = normalizedNoAdded.match(
      /\bsugars?\s*[:|\-]?\s*(\d+(?:\.\d+)?)\s*g(?:ms?)?\b/i
    );
    if (mPlainSugBefore) sugars = parseFloat(mPlainSugBefore[1]);
    else if (mPlainSugAfter) sugars = parseFloat(mPlainSugAfter[1]);
    else if (hasLabelHeader) {
      const mBare = normalizedNoAdded.match(/\bsugars?\s*[:|\-]?\s*(\d+(?:\.\d+)?)\b(?!\s*%)/i);
      if (mBare && parseFloat(mBare[1]) <= 105) sugars = parseFloat(mBare[1]);
    }
  }
  if (sugars === null) {
    sugars = grabMacroGrams('\\badded\\s+sugars?', { allowBare: true });
  }

  // Fat: prioritize Total Fat -> plain Fat (excluding Saturated / Trans / Mono / Poly fat)
  const normalizedNoSubFats = normalized.replace(
    /\b(?:saturated|sat\.?|trans|mono(?:unsaturated)?|poly(?:unsaturated)?|omega[\s\-\d]*fatty)\s+fat(?:ty\s+acids?)?\b/gi,
    ' __sub_fat__ '
  );
  let fat = grabMacroGrams('\\btotal\\s+fat', { allowBare: true });
  if (fat === null) {
    const mFatBefore = normalizedNoSubFats.match(
      /\bfat\s*\(\s*g(?:ms?)?\s*\)\s*[:|\-]?\s*(\d+(?:\.\d+)?)(?!\s*%)/i
    );
    const mFatAfter = normalizedNoSubFats.match(
      /\bfat\s*[:|\-]?\s*(\d+(?:\.\d+)?)\s*g(?:ms?)?\b/i
    );
    if (mFatBefore) fat = parseFloat(mFatBefore[1]);
    else if (mFatAfter) fat = parseFloat(mFatAfter[1]);
    else if (hasLabelHeader) {
      const mBare = normalizedNoSubFats.match(/\bfat\s*[:|\-]?\s*(\d+(?:\.\d+)?)\b(?!\s*%)/i);
      if (mBare && parseFloat(mBare[1]) <= 105) fat = parseFloat(mBare[1]);
    }
  }

  const protein = grabMacroGrams('\\bproteins?', { allowBare: true });
  const carbs = grabMacroGrams('(?:\\btotal\\s+)?\\bcarbohydrates?', { allowBare: true });

  // Sodium: mg before/after -> g before/after (*1000) -> Salt g (*393.4) -> bare mg in header table
  let sodium_mg: number | null = null;
  const sodMgBefore = normalized.match(/\bsodium\s*\(\s*mg\s*\)\s*[:|\-]?\s*(\d+(?:\.\d+)?)(?!\s*%)/i);
  const sodMgAfter = normalized.match(/\bsodium\s*[:|\-]?\s*(\d+(?:\.\d+)?)\s*mg\b/i);
  const sodGBefore = normalized.match(/\bsodium\s*\(\s*g(?:ms?)?\s*\)\s*[:|\-]?\s*(\d+(?:\.\d+)?)(?!\s*%)/i);
  const sodGAfter = normalized.match(/\bsodium\s*[:|\-]?\s*(\d+(?:\.\d+)?)\s*g(?:ms?)?\b/i);
  const saltGBefore = normalized.match(/\bsalt\s*\(\s*g(?:ms?)?\s*\)\s*[:|\-]?\s*(\d+(?:\.\d+)?)(?!\s*%)/i);
  const saltGAfter = normalized.match(/\bsalt\s*[:|\-]?\s*(\d+(?:\.\d+)?)\s*g(?:ms?)?\b/i);
  const sodBare = hasLabelHeader
    ? normalized.match(/\bsodium\s*[:|\-]?\s*(\d+(?:\.\d+)?)\b(?!\s*(?:%|g\b))/i)
    : null;

  if (sodMgBefore) sodium_mg = parseFloat(sodMgBefore[1]);
  else if (sodMgAfter) sodium_mg = parseFloat(sodMgAfter[1]);
  else if (sodGBefore) sodium_mg = parseFloat(sodGBefore[1]) * 1000;
  else if (sodGAfter) sodium_mg = parseFloat(sodGAfter[1]) * 1000;
  else if (saltGBefore) sodium_mg = parseFloat(saltGBefore[1]) * 393.4;
  else if (saltGAfter) sodium_mg = parseFloat(saltGAfter[1]) * 393.4;
  else if (sodBare) sodium_mg = parseFloat(sodBare[1]);

  const foundCount = [sugars, fat, protein, sodium_mg, carbs].filter((v) => v !== null).length;
  if (foundCount < 1) return null;

  // Guard against dropped decimal dot on sugars when carbohydrates are parsed (Total Sugars <= Total Carbohydrate)
  if (
    sugars !== null &&
    carbs !== null &&
    sugars > carbs &&
    Number.isInteger(sugars) &&
    sugars >= 10 &&
    sugars <= 99
  ) {
    sugars = round1(sugars / 10);
  }

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
  ['blueberry', 'Blueberries', 'Rich in anthocyanin antioxidants, fiber, and low glycemic load.'],
  ['blueberries', 'Blueberries', 'Rich in anthocyanin antioxidants, fiber, and low glycemic load.'],
  ['strawberry', 'Strawberries', 'Low-sugar berry rich in vitamin C and fiber.'],
  ['raspberry', 'Raspberries', 'High-fiber berry supporting steady blood glucose.'],
  ['blackberry', 'Blackberries', 'Antioxidant-rich low-GI berry.'],
  ['berry', 'Berries', 'Antioxidant-rich whole fruit with dietary fiber.'],
  ['avocado', 'Avocado', 'Heart-healthy monounsaturated fats and dietary fiber.'],
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

const GENERAL_FOOD_VOCAB_RE =
  /\b(ingredients?|water|milk|cream|butter|cheese|yogurt|curd|whey|casein|lactose|sugar|sucrose|fructose|glucose|dextrose|maltose|syrup|honey|jaggery|salt|sodium|flour|wheat|maida|oats|oatmeal|rice|corn|maize|barley|rye|millet|quinoa|starch|fiber|fibre|protein|fat|calories|energy|carbohydrate|carbs|oil|palm|sunflower|canola|soybean|olive|coconut|almond|walnut|cashew|pistachio|peanut|hazelnut|pecan|chia|flax|sesame|blueberry|blueberries|strawberry|strawberries|raspberry|blackberry|berry|berries|apple|banana|orange|mango|grape|fruit|vegetable|tomato|potato|onion|garlic|spinach|broccoli|carrot|peas|beans|lentil|chickpea|soya|soy|cocoa|chocolate|vanilla|cinnamon|turmeric|ginger|pepper|spice|spices|herbs|vinegar|citric|ascorbic|baking|soda|yeast|lecithin|emulsifier|stabilizer|thickener|preservative|color|colour|flavor|flavour|sweetener|caffeine|allergen|contains|nutrition|serving)\b/gi;

export function validateFoodLabelText(
  rawText: string,
  ocrConfidence?: number
): { valid: boolean; reason?: string; cleanText: string } {
  const clean = (rawText || '').replace(/\s+/g, ' ').trim();
  if (clean.length < 6) {
    return {
      valid: false,
      reason:
        'No readable food packet text was detected. Hold the camera steady over the packet Ingredients or Nutrition Facts box with good lighting, or paste the label text manually.',
      cleanText: clean,
    };
  }

  const parsedNutrition = parseNutritionTextClient(rawText);
  const lower = clean.toLowerCase();

  const knownIngredientHits = new Set<string>();
  for (const [kw] of [...CONCERN_INGREDIENTS, ...CAUTION_INGREDIENTS, ...BENEFICIAL_INGREDIENTS]) {
    const re = new RegExp(`\\b${escapeRegExp(kw)}s?\\b`, 'i');
    if (re.test(lower)) {
      knownIngredientHits.add(kw);
    }
  }
  const vocabMatches = clean.match(GENERAL_FOOD_VOCAB_RE) || [];
  const hasFoodVocabulary = knownIngredientHits.size >= 1 || vocabMatches.length >= 2;

  const alphaTokens = clean.match(/[a-zA-Z]{2,}/g) || [];
  const plausibleWords = alphaTokens.filter(
    (w) => w.length >= 3 && /[aeiouy]/i.test(w)
  );
  const nonSpaceChars = clean.replace(/\s/g, '').length;
  const alnumChars = (clean.match(/[a-zA-Z0-9]/g) || []).length;
  const symbolNoiseRatio = nonSpaceChars > 0 ? 1 - alnumChars / nonSpaceChars : 1;

  if (symbolNoiseRatio > 0.42 && !parsedNutrition) {
    return {
      valid: false,
      reason:
        'The captured image looks unclear or does not contain a readable food label (no ingredients or nutrition table detected). Please point the camera directly at the printed Ingredients or Nutrition Facts box.',
      cleanText: clean,
    };
  }

  if (typeof ocrConfidence === 'number' && ocrConfidence > 0) {
    if (ocrConfidence < 38 && !parsedNutrition) {
      return {
        valid: false,
        reason: `Low scan accuracy (${Math.round(ocrConfidence)}%) — this image does not appear to show clear food packet text (e.g., face or background object detected). Point the camera closely at the packet Ingredients label.`,
        cleanText: clean,
      };
    }
    if (
      ocrConfidence < 55 &&
      !parsedNutrition &&
      knownIngredientHits.size === 0 &&
      vocabMatches.length < 2
    ) {
      return {
        valid: false,
        reason: `Could not verify food ingredients with sufficient accuracy (${Math.round(ocrConfidence)}%). Crop closer to the printed Ingredients or Nutrition Facts box under bright lighting.`,
        cleanText: clean,
      };
    }
  }

  if (!parsedNutrition && !hasFoodVocabulary) {
    return {
      valid: false,
      reason:
        'No food ingredients or nutrition facts were recognized in that scan. Make sure you are scanning the back label (Ingredients / Nutrition Facts) rather than a face or non-food scene.',
      cleanText: clean,
    };
  }

  if (!parsedNutrition && plausibleWords.length < 2 && knownIngredientHits.size === 0) {
    return {
      valid: false,
      reason:
        'Too few readable ingredient words detected. Try a closer, sharper photo of the Ingredients list.',
      cleanText: clean,
    };
  }

  return { valid: true, cleanText: rawText.trim() };
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
    const url = `https://search.openfoodfacts.org/search?q=${encodeURIComponent(query)}&page_size=${Math.min(limit * 2, 16)}&fields=product_name,brands,nutriments,ingredients_text,image_front_small_url,image_front_url,image_url`;
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
      const offImg = p?.image_front_small_url || p?.image_front_url || p?.image_url || null;
      const offIng = typeof p?.ingredients_text === 'string' && p.ingredients_text.trim() ? p.ingredients_text.trim() : null;
      results.push({
        food: display.slice(0, 140),
        food_norm: display.toLowerCase(),
        calories: round1(Number(kcal) || 0),
        sugars: round1(Number(n['sugars_100g'] ?? 0)),
        fat: round1(Number(n['fat_100g'] ?? 0)),
        protein: round1(Number(n['proteins_100g'] ?? 0)),
        sodium_mg: round1(sodiumMg),
        source_group: 'Open Food Facts (Live Online)',
        image_url: offImg,
        ingredients_text: offIng,
      });
      if (results.length >= limit) break;
    }
    return [...combinedLocal, ...results].slice(0, limit);
  } catch {
    return combinedLocal.slice(0, limit);
  }
}

export function inferDefaultIngredientsClient(title: string): string | null {
  const lower = title.toLowerCase();
  if (/\b(rolled oats|oats|oatmeal)\b/.test(lower)) return '100% Wholegrain Rolled Oats';
  if (/\b(brown rice)\b/.test(lower)) return '100% Wholegrain Brown Rice';
  if (/\b(basmati|rice)\b/.test(lower)) return '100% Aged Basmati / Rice Grain';
  if (/\b(mixed dry fruits|dry fruits|trail mix|nut mix)\b/.test(lower)) return 'Whole almonds, cashews, walnuts, raisins, pistachios';
  if (/\b(walnut|walnuts|akhrot)\b/.test(lower)) return '100% Whole Unsalted Walnuts';
  if (/\b(almond|almonds|badam)\b/.test(lower)) return '100% Roasted / Natural California Almonds';
  if (/\b(blueberry|blueberries)\b/.test(lower)) return '100% Fresh Whole Blueberries';
  if (/\b(strawberry|strawberries|raspberry|raspberries|blackberry|blackberries|berries|berry)\b/.test(lower)) return '100% Fresh Whole Berries';
  if (/\b(avocado|avocados)\b/.test(lower)) return '100% Fresh Whole Avocado';
  if (/\b(cashew|pistachio|peanut)\b/.test(lower)) return 'Whole Tree Nuts / Peanuts';
  if (/\b(instant noodles|maggi|ramen|yippee|noodles)\b/.test(lower)) return 'Refined wheat flour (maida), palm oil, iodized salt, sugar, maltodextrin, flavor enhancer (E621), TBHQ';
  if (/\b(potato chips|lays|kurkure|bingo|doritos|pringles|chips|namkeen|bhujia)\b/.test(lower)) return 'Potatoes, edible vegetable oil (palm olein), iodized salt, spices, dextrose';
  if (/\b(biscuit|cookies|oreo|parle|bourbon|wafer)\b/.test(lower)) return 'Refined wheat flour (maida), sugar, vegetable fat (palm oil), invert syrup, milk solids, leavening agents, salt';
  if (/\b(chocolate|dairy milk|kitkat|snickers)\b/.test(lower)) return 'Sugar, cocoa butter, milk solids, cocoa mass, soy lecithin, natural vanilla flavor';
  if (/\b(coca cola|pepsi|sprite|fanta|thums up|cola|soda|soft drink)\b/.test(lower)) return 'Carbonated water, high fructose corn syrup, sugar, caramel color (E150d), phosphoric acid, caffeine, sodium benzoate';
  if (/\b(peanut butter)\b/.test(lower)) return 'Roasted peanuts (98%), peanut oil, salt';
  if (/\b(yogurt|curd|dahi)\b/.test(lower)) return 'Pasteurized milk, active live yogurt cultures';
  if (/\b(biryani)\b/.test(lower)) return 'Basmati rice, spices, onions, oil/ghee, salt, herbs';
  if (/\b(paneer butter masala|butter chicken)\b/.test(lower)) return 'Paneer / chicken, tomato puree, cream, butter, spices, salt, sugar';
  if (/\b(dosa)\b/.test(lower)) return 'Fermented rice & urad dal batter, cooking oil, iodized salt';
  if (/\b(pizza)\b/.test(lower)) return 'Refined wheat flour (maida), mozzarella cheese, tomato sauce, vegetable oil, salt, yeast';
  return null;
}

export async function analyzeAmazonItemLocally(payload: {
  product_title: string;
  nutrition_text?: string;
  ingredients_text?: string;
  product_url?: string;
  image_url?: string;
  source_platform?: string;
  calories?: number;
  sugars?: number;
  fat?: number;
  protein?: number;
  sodium_mg?: number;
  event_id?: string;
  user_id?: string;
  skipGenericFallback?: boolean;
}): Promise<AmazonCartEvent> {
  const title = payload.product_title.trim();
  const urlLower = (payload.product_url || '').toLowerCase();
  const platform =
    payload.source_platform ||
    (urlLower.includes('flipkart')
      ? 'Flipkart'
      : urlLower.includes('instamart')
      ? 'Swiggy Instamart'
      : urlLower.includes('swiggy')
      ? 'Swiggy'
      : urlLower.includes('zomato')
      ? 'Zomato'
      : urlLower.includes('blinkit')
      ? 'Blinkit'
      : urlLower.includes('amazon')
      ? 'Amazon'
      : 'Online Store');

  let capturedIngredients = (payload.ingredients_text || '').trim();
  let capturedImage = (payload.image_url || '').trim() || null;

  const combinedLabelText = [capturedIngredients, payload.nutrition_text || '']
    .filter(Boolean)
    .join('\n');

  const hasExplicitNumbers =
    payload.calories != null &&
    payload.sugars != null &&
    payload.fat != null &&
    payload.protein != null &&
    payload.sodium_mg != null;

  const parsed = hasExplicitNumbers
    ? {
        calories: Number(payload.calories),
        sugars: Number(payload.sugars),
        fat: Number(payload.fat),
        protein: Number(payload.protein),
        sodium_mg: Number(payload.sodium_mg),
      }
    : combinedLabelText
    ? parseNutritionTextClient(combinedLabelText)
    : null;

  let nutritionInput = parsed;
  let nutritionSource = hasExplicitNumbers
    ? 'Back of Packet (Verified)'
    : parsed
    ? `${platform} Page Nutrition Facts`
    : '';
  let matchedFood: string | null = null;

  const stapleOrCatalog =
    !payload.skipGenericFallback && !nutritionInput ? matchStapleOrCatalogClient(title) : null;
  const titleWords = title.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').trim().split(/\s+/).filter(Boolean);
  const isWholeProduceStaple =
    stapleOrCatalog?.source === 'Grocery Staple Nutrition Profile' &&
    /\b(walnuts?|akhrot|almonds?|badam|blueberr(?:y|ies)|strawberr(?:y|ies)|raspberr(?:y|ies)|blackberr(?:y|ies)|berr(?:y|ies)|avocados?)\b/i.test(title) &&
    !/\b(chocolate|candy|cookie|biscuit|cake|muffin|jam|jelly|juice|syrup|salted|masala|butter|chips|dried|roasted honey)\b/i.test(title);
  const isPureStaple =
    isWholeProduceStaple ||
    (stapleOrCatalog?.source === 'Grocery Staple Nutrition Profile' && titleWords.length <= 2);

  if (!payload.skipGenericFallback && !nutritionInput && !isPureStaple) {
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
      nutritionSource = `${online.source_group} (Estimated)`;
      matchedFood = online.food;
      if (!capturedIngredients && online.ingredients_text && !stapleOrCatalog) {
        capturedIngredients = online.ingredients_text;
      }
      if (!capturedImage && online.image_url) {
        capturedImage = online.image_url;
      }
    }
  }

  if (!payload.skipGenericFallback && !nutritionInput && stapleOrCatalog) {
    nutritionInput = {
      calories: stapleOrCatalog.calories,
      sugars: stapleOrCatalog.sugars,
      fat: stapleOrCatalog.fat,
      protein: stapleOrCatalog.protein,
      sodium_mg: stapleOrCatalog.sodium_mg,
    };
    nutritionSource = `${stapleOrCatalog.source} (Estimated)`;
    matchedFood = stapleOrCatalog.matched_food;
  }

  if (!payload.skipGenericFallback && !capturedIngredients) {
    const inferred = inferDefaultIngredientsClient(title);
    if (inferred) capturedIngredients = inferred;
  }

  const finalCombinedText = [capturedIngredients, payload.nutrition_text || '']
    .filter(Boolean)
    .join('\n');
  const hasIngredients = Boolean(
    capturedIngredients || /\bingredients?\b/i.test(payload.nutrition_text || '')
  );
  const ingredientScan = hasIngredients
    ? scanPacketLocally(title, finalCombinedText)
    : null;

  const eventId = payload.event_id || Math.random().toString(36).slice(2, 10);
  if (!nutritionInput && !ingredientScan) {
    return {
      event_id: eventId,
      user_id: payload.user_id,
      timestamp: new Date().toISOString(),
      source: 'web_intake',
      source_platform: platform,
      status: 'needs_nutrition',
      product_title: title,
      product_url: payload.product_url || null,
      image_url: capturedImage,
      nutrition_source: 'Nutrition Label Not Found on Page',
      matched_food: null,
      message: `Captured "${title}". Nutrition facts were not detected—scan or enter back-of-packet values.`,
      analysis: null,
      ingredients_text: capturedIngredients || null,
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
    nutritionSource = `${platform} Ingredients Scan`;
  } else if (ingredientScan && nutritionInput && !nutritionSource.includes('Ingredients Scan')) {
    nutritionSource = `${nutritionSource} + Ingredients Scan`;
  }

  return {
    event_id: eventId,
    user_id: payload.user_id,
    timestamp: new Date().toISOString(),
    source: hasExplicitNumbers ? 'packet_back_verified' : 'web_intake',
    source_platform: platform,
    status: 'analyzed',
    product_title: title,
    product_url: payload.product_url || null,
    image_url: capturedImage,
    nutrition_source: nutritionSource,
    matched_food: matchedFood,
    message: ingredientScan
      ? `${analysis.explanation} Scanned ${ingredientScan.ingredients_count} ingredients (${ingredientScan.verdict}).`
      : analysis.explanation,
    analysis,
    ingredients_text: capturedIngredients || null,
    ingredient_scan: ingredientScan,
  };
}
