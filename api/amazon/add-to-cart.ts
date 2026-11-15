import fs from 'node:fs';
import path from 'node:path';

type CompactFoodRow = [string, number, number, number, number, number];

let cachedCatalog: CompactFoodRow[] | null = null;

function loadCatalog(): CompactFoodRow[] {
  if (cachedCatalog) return cachedCatalog;
  try {
    const filePath = path.join(process.cwd(), 'src', 'data', 'foodCatalog.json');
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      cachedCatalog = parsed as CompactFoodRow[];
      return cachedCatalog;
    }
  } catch {
    // ignore if unavailable
  }
  cachedCatalog = [];
  return cachedCatalog;
}

const GROCERY_STAPLES: {
  keywords: string[];
  name: string;
  calories: number;
  sugars: number;
  fat: number;
  protein: number;
  sodium_mg: number;
}[] = [
  { keywords: ['brown rice', 'red rice', 'black rice', 'wild rice'], name: 'Brown Rice (Whole Grain, per 100g)', calories: 362, sugars: 0.7, fat: 2.7, protein: 7.5, sodium_mg: 4 },
  { keywords: ['basmati rice', 'sona masoori', 'jasmine rice', 'ponni rice', 'white rice', 'rice'], name: 'Rice (Dry Grain, per 100g)', calories: 356, sugars: 0.1, fat: 0.6, protein: 7.1, sodium_mg: 5 },
  { keywords: ['quinoa'], name: 'Quinoa (Whole Grain, per 100g)', calories: 368, sugars: 1.6, fat: 6.1, protein: 14.1, sodium_mg: 5 },
  { keywords: ['rolled oats', 'steel cut oats', 'oats', 'oatmeal'], name: 'Wholegrain Oats (per 100g)', calories: 375, sugars: 1.0, fat: 7.0, protein: 13.0, sodium_mg: 5 },
  { keywords: ['muesli', 'granola'], name: 'Granola / Muesli (per 100g)', calories: 410, sugars: 18.0, fat: 11.5, protein: 9.5, sodium_mg: 180 },
  { keywords: ['cornflakes', 'corn flakes', 'cereal'], name: 'Breakfast Cornflakes (per 100g)', calories: 378, sugars: 9.5, fat: 0.9, protein: 7.5, sodium_mg: 620 },
  { keywords: ['whole wheat', 'atta', 'multigrain flour', 'chakki', 'ragi', 'millet', 'jowar', 'bajra', 'besan', 'poha', 'suji', 'rava'], name: 'Whole Grain Flour / Atta / Millet (per 100g)', calories: 341, sugars: 0.4, fat: 1.8, protein: 12.1, sodium_mg: 3 },
  { keywords: ['maida', 'all purpose flour', 'refined flour'], name: 'Refined White Flour / Maida (per 100g)', calories: 364, sugars: 0.3, fat: 1.0, protein: 10.3, sodium_mg: 2 },
  { keywords: ['toor dal', 'moong dal', 'masoor dal', 'chana dal', 'urad dal', 'lentil', 'dal', 'rajma', 'chickpea', 'kabuli chana'], name: 'Lentils / Dal (Dry, per 100g)', calories: 343, sugars: 2.0, fat: 1.5, protein: 22.3, sodium_mg: 12 },
  { keywords: ['brown bread', 'whole wheat bread', 'multigrain bread'], name: 'Whole Wheat Bread (per 100g)', calories: 252, sugars: 4.3, fat: 3.4, protein: 11.2, sodium_mg: 440 },
  { keywords: ['white bread', 'milk bread', 'bread', 'bun', 'pav'], name: 'Packaged Bread (per 100g)', calories: 266, sugars: 5.7, fat: 3.3, protein: 8.9, sodium_mg: 490 },
  { keywords: ['instant noodles', 'maggi', 'ramen', 'yippee', 'top ramen', 'cup noodles', 'noodles'], name: 'Instant Noodles (per 100g)', calories: 427, sugars: 2.1, fat: 15.7, protein: 8.2, sodium_mg: 1120 },
  { keywords: ['pasta', 'spaghetti', 'macaroni', 'penne', 'fusilli', 'vermicelli'], name: 'Dry Pasta / Vermicelli (per 100g)', calories: 358, sugars: 2.7, fat: 1.5, protein: 12.8, sodium_mg: 6 },
  { keywords: ['potato chips', 'lays', 'kurkure', 'bingo', 'doritos', 'pringles', 'nachos', 'namkeen', 'bhujia', 'mixture', 'chips', 'popcorn'], name: 'Packaged Chips / Namkeen (per 100g)', calories: 536, sugars: 1.5, fat: 34.0, protein: 6.8, sodium_mg: 620 },
  { keywords: ['biscuit', 'cookies', 'oreo', 'parle', 'good day', 'bourbon', 'marie', 'cracker', 'rusk', 'wafer', 'cake', 'donut', 'pastry'], name: 'Packaged Biscuits / Baked Snack (per 100g)', calories: 472, sugars: 24.0, fat: 19.5, protein: 6.4, sodium_mg: 340 },
  { keywords: ['dark chocolate'], name: 'Dark Chocolate (per 100g)', calories: 546, sugars: 24.0, fat: 31.0, protein: 7.8, sodium_mg: 20 },
  { keywords: ['chocolate', 'dairy milk', 'kitkat', 'snickers', 'mars', 'candy', 'toffee', 'barfi', 'gulab jamun'], name: 'Chocolate / Confectionery (per 100g)', calories: 535, sugars: 51.5, fat: 29.7, protein: 7.6, sodium_mg: 79 },
  { keywords: ['coca cola', 'pepsi', 'sprite', 'fanta', 'thums up', 'mountain dew', 'soft drink', 'soda', 'cola', 'energy drink', 'red bull'], name: 'Sweetened Soft Drink (per 250ml)', calories: 105, sugars: 26.5, fat: 0.0, protein: 0.0, sodium_mg: 22 },
  { keywords: ['fruit juice', 'real juice', 'tropicana', 'mango drink', 'frooti', 'maaza', 'juice'], name: 'Packaged Fruit Juice / Nectar (per 250ml)', calories: 120, sugars: 27.0, fat: 0.0, protein: 0.4, sodium_mg: 25 },
  { keywords: ['green tea', 'herbal tea', 'chamomile', 'black tea', 'tea', 'chai', 'coffee', 'espresso', 'nescafe'], name: 'Unsweetened Tea / Coffee (Prepared)', calories: 5, sugars: 0.0, fat: 0.0, protein: 0.3, sodium_mg: 4 },
  { keywords: ['milk', 'toned milk', 'skim milk', 'almond milk', 'soy milk', 'lassi', 'buttermilk'], name: 'Milk / Dairy Beverage (per 100ml)', calories: 61, sugars: 4.8, fat: 3.3, protein: 3.2, sodium_mg: 43 },
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
  { keywords: ['apple', 'banana', 'orange', 'mango', 'berry', 'berries', 'grape', 'watermelon', 'fruit'], name: 'Fresh Fruit (per 100g)', calories: 58, sugars: 11.2, fat: 0.2, protein: 0.7, sodium_mg: 1 },
  { keywords: ['broccoli', 'spinach', 'carrot', 'tomato', 'onion', 'potato', 'beans', 'peas', 'vegetable'], name: 'Fresh Vegetable (per 100g)', calories: 42, sugars: 2.5, fat: 0.3, protein: 2.1, sodium_mg: 22 },
  { keywords: ['soya chunks', 'soybean', 'soybeans', 'nutrela', 'soya granules'], name: 'Soya Chunks / Plant Protein (per 100g)', calories: 345, sugars: 2.0, fat: 0.5, protein: 52.0, sodium_mg: 12 },
  { keywords: ['coconut water', 'tender coconut'], name: 'Unsweetened Coconut Water (per 250ml)', calories: 46, sugars: 6.5, fat: 0.2, protein: 1.8, sodium_mg: 105 },
  { keywords: ['bournvita', 'horlicks', 'complan', 'boost', 'milo', 'malt drink'], name: 'Malted Milk Health Drink Mix (per 100g)', calories: 396, sugars: 32.0, fat: 2.8, protein: 11.0, sodium_mg: 240 },
  { keywords: ['rooh afza', 'sharbat', 'squash'], name: 'Flavored Sugar Syrup / Sharbat (per 100ml)', calories: 280, sugars: 70.0, fat: 0.0, protein: 0.0, sodium_mg: 15 },
  { keywords: ['pickle', 'achar', 'achaar', 'papad'], name: 'Pickles / Papad (per 100g)', calories: 220, sugars: 2.0, fat: 11.0, protein: 4.5, sodium_mg: 2400 },
  { keywords: ['soan papdi', 'laddu', 'laddoo', 'rasgulla', 'gulab jamun', 'halwa', 'barfi', 'peda'], name: 'Indian Packaged Sweets (per 100g)', calories: 430, sugars: 46.0, fat: 18.0, protein: 4.5, sodium_mg: 45 },
  { keywords: ['ice cream', 'kulfi', 'gelato'], name: 'Ice Cream (per 100g)', calories: 207, sugars: 21.2, fat: 11.0, protein: 3.5, sodium_mg: 80 },
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

const clip = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const round1 = (v: number) => Math.round(v * 10) / 10;
const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function parseNutritionText(text: string) {
  if (!text || !text.trim()) return null;
  const normalized = text.replace(/\s+/g, ' ').trim();
  const calMatch = normalized.match(
    /(?:calories|energy(?:\s*\(\s*kcal\s*\))?)\s*[:|\-]?\s*(\d+(?:\.\d+)?)\s*(?:kcal|cal)?/i
  );
  if (!calMatch) return null;
  const calories = parseFloat(calMatch[1]);
  const grab = (re: RegExp) => {
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

  const found = [sugars, fat, protein, sodium_mg, carbs].filter((v) => v !== null).length;
  if (found < 1) return null;
  return {
    calories,
    sugars: sugars ?? 0,
    fat: fat ?? 0,
    protein: protein ?? 0,
    sodium_mg: sodium_mg ?? 0,
  };
}

function isWholeNutOrSeedApi(name: string, n: { sugars: number; sodium_mg: number }): boolean {
  const lower = (name || '').toLowerCase();
  const hasNutSeed = /\b(almonds?|badam|walnuts?|akhrot|pistachios?|pista|cashews?|kaju|peanuts?|hazelnuts?|pecans?|macadamias?|chia|flax(?:seeds?)?|pumpkin seeds?|sunflower seeds?|sesame|mixed nuts?|dry\s*fruits?|dryfruits?|panchmewa|trail mix|nut\s*mix|nutmix|makhana|fox nuts?|olive oil)\b/i.test(lower);
  const hasJunk = /\b(chocolate|candy|bar|cookie|biscuit|cake|pastry|ice cream|fried|chips|namkeen|bhujia|caramel|sugar coated|syrup|honey roasted|salted|masala|butter|nutella|sauce)\b/i.test(lower);
  return hasNutSeed && !hasJunk && n.sodium_mg <= 180 && n.sugars <= 30;
}

function isNaturalDriedFruitApi(name: string, n: { fat: number; sodium_mg: number }): boolean {
  const lower = (name || '').toLowerCase();
  const hasDried = /\b(dates?|datiles|khajoor|raisins?|kishmish|figs?|anjeer|prunes?|apricots?)\b/i.test(lower);
  const hasJunk = /\b(chocolate|candy|syrup|jam|cake|cookie|bar|sugar|juice)\b/i.test(lower);
  return hasDried && !hasJunk && n.sodium_mg <= 40 && n.fat <= 5;
}

function scoreNutrition(foodName: string, n: { calories: number; sugars: number; fat: number; protein: number; sodium_mg: number }) {
  const kcal = Math.max(Number(n.calories) || 0, 1);
  const sugars = Math.max(Number(n.sugars) || 0, 0);
  const fat = Math.max(Number(n.fat) || 0, 0);
  const protein = Math.max(Number(n.protein) || 0, 0);
  const sodium_mg = Math.max(Number(n.sodium_mg) || 0, 0);

  const sugar_kcal_pct = clip(((sugars * 4) / kcal) * 100, 0, 100);
  const fat_kcal_pct = clip(((fat * 9) / kcal) * 100, 0, 100);
  const protein_kcal_pct = clip(((protein * 4) / kcal) * 100, 0, 100);
  const sodium_per_100kcal = clip((sodium_mg / kcal) * 100, 0, 5000);

  const wholeNut = isWholeNutOrSeedApi(foodName, { sugars, sodium_mg });
  const wholeDriedFruit = !wholeNut && isNaturalDriedFruitApi(foodName, { fat, sodium_mg });

  let pen_sugar = clip((sugar_kcal_pct - 10) * 0.75, 0, 35) + clip((sugars - 20) * 0.4, 0, 10);
  let pen_fat = clip((fat_kcal_pct - 30) * 0.65, 0, 18);
  const pen_sod = clip((sodium_per_100kcal - 115) * 0.08, 0, 22) + clip((sodium_mg - 500) * 0.012, 0, 10);
  let pen_ed = clip((kcal - 260) * 0.035, 0, 12);
  const bon_prot = clip(protein_kcal_pct * 0.4, 0, 12);
  let bon_whole = kcal < 160 && sugar_kcal_pct < 35 && sodium_per_100kcal < 150 ? 5 : 0;

  if (wholeNut) {
    pen_fat *= 0.2;
    pen_ed *= 0.25;
    pen_sugar *= 0.35;
    bon_whole += 8;
  } else if (wholeDriedFruit) {
    pen_sugar *= 0.45;
    bon_whole += 4;
  }

  const health_score = round1(clip(75 - pen_sugar - pen_fat - pen_sod - pen_ed + bon_prot + bon_whole, 0, 100));
  const classification = health_score >= 68 ? 'Healthy' : health_score >= 44 ? 'Moderate' : 'Unhealthy';

  const dH = Math.exp(-Math.abs(health_score - 82) / 14);
  const dM = Math.exp(-Math.abs(health_score - 56) / 14);
  const dU = Math.exp(-Math.abs(health_score - 26) / 14);
  const sumD = dH + dM + dU;
  const probabilities = {
    Healthy: round1((dH / sumD) * 100),
    Moderate: round1((dM / sumD) * 100),
    Unhealthy: round1((dU / sumD) * 100),
  };

  const nutrient_flags = [
    {
      nutrient: 'Sugar',
      value_display: `${round1(sugars)} g`,
      status: sugar_kcal_pct > 25 || sugars > 20 ? 'high' : sugar_kcal_pct > 10 || sugars > 10 ? 'moderate' : 'good',
      note: `${round1(sugar_kcal_pct)}% of calories`,
    },
    {
      nutrient: 'Total Fat',
      value_display: `${round1(fat)} g`,
      status: fat_kcal_pct > 45 ? 'high' : fat_kcal_pct > 30 ? 'moderate' : 'good',
      note: `${round1(fat_kcal_pct)}% of calories`,
    },
    {
      nutrient: 'Protein',
      value_display: `${round1(protein)} g`,
      status: protein_kcal_pct >= 20 ? 'good' : 'moderate',
      note: `${round1(protein_kcal_pct)}% of calories`,
    },
    {
      nutrient: 'Sodium',
      value_display: `${Math.round(sodium_mg)} mg`,
      status: sodium_per_100kcal > 220 || sodium_mg > 600 ? 'high' : sodium_per_100kcal > 115 || sodium_mg > 300 ? 'moderate' : 'good',
      note: `${Math.round(sodium_per_100kcal)} mg per 100 kcal`,
    },
  ];

  const verdict = classification === 'Healthy' ? 'Good' : classification === 'Moderate' ? 'Moderate' : 'Not Good';
  const level = classification === 'Healthy' ? 'success' : classification === 'Moderate' ? 'warning' : 'danger';
  const explanation = `${foodName} is ${verdict} (${health_score}/100) across ${round1(n.calories)} kcal, ${round1(sugars)}g sugar, ${round1(fat)}g fat, ${round1(protein)}g protein, and ${Math.round(sodium_mg)}mg sodium.`;

  return {
    food_name: foodName,
    classification,
    health_score,
    confidence: probabilities[classification],
    probabilities,
    nutrition: {
      calories: round1(n.calories),
      sugars: round1(sugars),
      fat: round1(fat),
      protein: round1(protein),
      sodium_mg: round1(sodium_mg),
      sugar_kcal_pct: round1(sugar_kcal_pct),
      fat_kcal_pct: round1(fat_kcal_pct),
      protein_kcal_pct: round1(protein_kcal_pct),
      sodium_per_100kcal: round1(sodium_per_100kcal),
    },
    nutrient_flags,
    explanation,
    cart_alert: {
      level,
      title: verdict === 'Good' ? 'Good Choice Added' : verdict === 'Moderate' ? 'Moderation Recommended' : 'Health Warning: Not Good',
      message: explanation,
    },
    model_used: 'WHO/FDA Nutrient Engine',
  };
}

function matchStapleOrCatalog(title: string) {
  const norm = title.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!norm) return null;

  let bestStaple: { profile: (typeof GROCERY_STAPLES)[number]; len: number } | null = null;
  for (const profile of GROCERY_STAPLES) {
    for (const kw of profile.keywords) {
      if (new RegExp(`\\b${escapeRegExp(kw)}\\b`, 'i').test(norm) && (!bestStaple || kw.length > bestStaple.len)) {
        bestStaple = { profile, len: kw.length };
      }
    }
  }
  if (bestStaple) {
    const p = bestStaple.profile;
    return {
      matched_food: p.name,
      source: 'Grocery Staple Nutrition Profile',
      nutrition: { calories: p.calories, sugars: p.sugars, fat: p.fat, protein: p.protein, sodium_mg: p.sodium_mg },
    };
  }

  const catalog = loadCatalog();
  const qTokens = norm.split(' ').filter((t) => t.length > 1);
  if (!qTokens.length || !catalog.length) return null;

  let bestRow: CompactFoodRow | null = null;
  let bestScore = 0;
  for (const row of catalog) {
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
      nutrition: { calories: bestRow[1], sugars: bestRow[2], fat: bestRow[3], protein: bestRow[4], sodium_mg: bestRow[5] },
    };
  }

  return null;
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: 'Invalid JSON body' });
    }
  }
  body = body || {};

  const title = String(body.product_title || 'Store Item').trim();
  const urlLower = String(body.product_url || '').toLowerCase();
  const sourcePlatform =
    String(body.source_platform || '').trim() ||
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
  const nutritionText = String(body.nutrition_text || '');
  const ingredientsText = String(body.ingredients_text || '');
  const combined = [ingredientsText, nutritionText].filter(Boolean).join('\n');

  let nutrition = parseNutritionText(combined);
  let nutritionSource = nutrition ? `${sourcePlatform} Page Nutrition Facts` : '';
  let matchedFood: string | null = null;

  if (!nutrition) {
    const staple = matchStapleOrCatalog(title);
    if (staple) {
      nutrition = staple.nutrition;
      nutritionSource = staple.source;
      matchedFood = staple.matched_food;
    }
  }

  const eventId = `vrc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  if (!nutrition) {
    return res.status(200).json({
      event_id: eventId,
      timestamp: new Date().toISOString(),
      source: body.source || 'store_browser_extension',
      source_platform: sourcePlatform,
      status: 'needs_nutrition',
      product_title: title,
      product_url: body.product_url || null,
      nutrition_source: 'Nutrition Label Not Found on Page',
      matched_food: null,
      message: `Captured "${title}". Enter nutrition values or paste ingredients to classify.`,
      analysis: null,
      ingredients_text: ingredientsText || null,
      ingredient_scan: null,
    });
  }

  const analysis = scoreNutrition(title, nutrition);
  return res.status(200).json({
    event_id: eventId,
    timestamp: new Date().toISOString(),
    source: body.source || 'store_browser_extension',
    source_platform: sourcePlatform,
    status: 'analyzed',
    product_title: title,
    product_url: body.product_url || null,
    nutrition_source: nutritionSource,
    matched_food: matchedFood,
    message: analysis.explanation,
    analysis,
    ingredients_text: ingredientsText || null,
    ingredient_scan: null,
  });
}
