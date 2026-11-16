const DEFAULT_URL = 'http://localhost:3000';
const TOAST_TTL_MS = 90000;

let cachedCatalog = null;

async function getFoodCatalog() {
  if (cachedCatalog) return cachedCatalog;
  try {
    const res = await fetch(chrome.runtime.getURL('food_catalog.json'));
    if (res.ok) {
      cachedCatalog = await res.json();
      return cachedCatalog;
    }
  } catch {
    // fallback to empty
  }
  return [];
}

const GROCERY_STAPLES = [
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
  { keywords: ['chocolate', 'dairy milk', 'kitkat', 'snickers', 'mars', 'candy', 'toffee'], name: 'Chocolate / Confectionery (per 100g)', calories: 535, sugars: 51.5, fat: 29.7, protein: 7.6, sodium_mg: 79 },
  { keywords: ['coca cola', 'pepsi', 'sprite', 'fanta', 'thums up', 'mountain dew', 'soft drink', 'soda', 'cola', 'energy drink', 'red bull'], name: 'Sweetened Soft Drink (per 250ml)', calories: 105, sugars: 26.5, fat: 0.0, protein: 0.0, sodium_mg: 22 },
  { keywords: ['fruit juice', 'real juice', 'tropicana', 'mango drink', 'frooti', 'maaza', 'juice'], name: 'Packaged Fruit Juice / Nectar (per 250ml)', calories: 120, sugars: 27.0, fat: 0.0, protein: 0.4, sodium_mg: 25 },
  { keywords: ['green tea', 'herbal tea', 'black tea', 'tea', 'chai', 'coffee', 'espresso', 'nescafe'], name: 'Unsweetened Tea / Coffee (Prepared)', calories: 5, sugars: 0.0, fat: 0.0, protein: 0.3, sodium_mg: 4 },
  { keywords: ['milk', 'toned milk', 'skim milk', 'almond milk', 'soy milk'], name: 'Milk (per 100ml)', calories: 61, sugars: 4.8, fat: 3.3, protein: 3.2, sodium_mg: 43 },
  { keywords: ['greek yogurt', 'yogurt', 'curd', 'dahi'], name: 'Plain Yogurt / Curd (per 100g)', calories: 63, sugars: 4.0, fat: 3.3, protein: 4.2, sodium_mg: 46 },
  { keywords: ['paneer', 'cottage cheese', 'tofu'], name: 'Paneer / Cottage Cheese (per 100g)', calories: 265, sugars: 1.2, fat: 20.8, protein: 18.3, sodium_mg: 30 },
  { keywords: ['mozzarella', 'cheddar', 'cheese'], name: 'Cheese (per 100g)', calories: 375, sugars: 1.0, fat: 31.0, protein: 22.0, sodium_mg: 680 },
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
  { keywords: ['pickle', 'achaar', 'papad'], name: 'Pickles / Papad (per 100g)', calories: 220, sugars: 2.0, fat: 11.0, protein: 4.5, sodium_mg: 2400 },
  { keywords: ['soan papdi', 'laddu', 'laddoo', 'rasgulla', 'gulab jamun', 'halwa', 'barfi', 'peda'], name: 'Indian Packaged Sweets (per 100g)', calories: 430, sugars: 46.0, fat: 18.0, protein: 4.5, sodium_mg: 45 },
  { keywords: ['ice cream', 'kulfi', 'gelato'], name: 'Ice Cream (per 100g)', calories: 207, sugars: 21.2, fat: 11.0, protein: 3.5, sodium_mg: 80 },
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

const GOOD_ING = [
  ['wholegrain', 'Whole Grain', 'Unrefined whole-grain fiber supports steady energy.'],
  ['whole grain', 'Whole Grain', 'Unrefined whole-grain fiber supports steady energy.'],
  ['whole wheat', 'Whole Wheat', 'Retains natural bran and fiber.'],
  ['rolled oats', 'Rolled Oats', 'Rich in soluble beta-glucan fiber and protein.'],
  ['oats', 'Oats', 'Whole-grain oat base with dietary fiber.'],
  ['brown rice', 'Brown Rice', 'Whole grain retaining bran and micronutrients.'],
  ['basmati rice', 'Basmati Rice', 'Natural aromatic grain with minimal fat and sodium.'],
  ['rice', 'Rice Grain', 'Simple natural grain low in fat, sugar, and sodium.'],
  ['quinoa', 'Quinoa', 'Complete plant protein and mineral density.'],
  ['almond', 'Almonds', 'Heart-healthy unsaturated fats, vitamin E, and protein.'],
  ['walnut', 'Walnuts', 'Rich in plant omega-3 fats and antioxidants.'],
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
  ['chia', 'Chia Seeds', 'Rich in dietary fiber and omega-3 fats.'],
  ['flax', 'Flax Seeds', 'Rich in soluble fiber and plant omega-3 fats.'],
  ['olive oil', 'Olive Oil', 'Monounsaturated healthy cooking fat.'],
  ['turmeric', 'Turmeric', 'Natural spice with curcumin antioxidants.'],
  ['paneer', 'Paneer', 'Rich source of dairy protein and calcium.'],
  ['lentil', 'Lentils', 'High-fiber plant protein with slow glycemic release.'],
  ['chickpea', 'Chickpeas', 'High-fiber legume protein.'],
  ['yogurt', 'Yogurt', 'Probiotic dairy with protein and calcium.'],
  ['spinach', 'Spinach', 'Leafy green rich in iron and vitamins.'],
];

const MOD_ING = [
  ['refined wheat flour', 'Refined Flour (Maida)', 'Stripped of fiber; digests rapidly.'],
  ['maida', 'Refined Flour (Maida)', 'Highly refined starch low in fiber.'],
  ['palm oil', 'Palm Oil', 'High in saturated palmitic fat.'],
  ['palmolein', 'Palmolein Oil', 'Refined palm oil high in saturated fat.'],
  ['sugar', 'Added Sugar', 'Increases free-sugar calories.'],
  ['maltodextrin', 'Maltodextrin', 'High-glycemic processed starch.'],
  ['artificial flavor', 'Artificial Flavoring', 'Synthetic flavoring additive.'],
  ['artificial flavour', 'Artificial Flavouring', 'Synthetic flavouring additive.'],
  ['caramel color', 'Caramel Color', 'Added synthetic coloring agent.'],
  ['iodized salt', 'Added Salt', 'Increases sodium intake.'],
  ['salt', 'Added Salt', 'Increases sodium intake.'],
];

const BAD_ING = [
  ['high fructose corn syrup', 'High-Fructose Corn Syrup', 'Concentrated industrial free sugar.'],
  ['hfcs', 'High-Fructose Corn Syrup', 'Concentrated industrial sweetener.'],
  ['corn syrup', 'Corn Syrup', 'Refined liquid sugar syrup.'],
  ['partially hydrogenated', 'Partially Hydrogenated Oil', 'Source of harmful trans fats.'],
  ['vanaspati', 'Vanaspati Fat', 'Hydrogenated fat high in saturated/trans fats.'],
  ['aspartame', 'Aspartame', 'Artificial sweetener (E951).'],
  ['sucralose', 'Sucralose', 'Artificial sweetener (E955).'],
  ['sodium benzoate', 'Sodium Benzoate (E211)', 'Synthetic preservative.'],
  ['tbhq', 'TBHQ (E319)', 'Synthetic antioxidant preservative.'],
  ['e319', 'TBHQ (E319)', 'Synthetic antioxidant preservative.'],
  ['monosodium glutamate', 'MSG (E621)', 'Synthetic flavor enhancer.'],
  ['msg', 'MSG (E621)', 'Flavor enhancer in ultra-processed snacks.'],
  ['e621', 'MSG (E621)', 'Flavor enhancer additive.'],
];

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function inferPlatformName(url, explicit) {
  if (explicit) return explicit;
  const u = (url || '').toLowerCase();
  if (u.includes('flipkart')) return 'Flipkart';
  if (u.includes('instamart')) return 'Swiggy Instamart';
  if (u.includes('swiggy')) return 'Swiggy';
  if (u.includes('zomato')) return 'Zomato';
  if (u.includes('blinkit')) return 'Blinkit';
  if (u.includes('amazon')) return 'Amazon';
  return 'Online Store';
}

async function getHealthGuardUrl() {
  const stored = await chrome.storage.sync.get(['healthguardUrl']);
  const local = await chrome.storage.local.get(['lastActiveHealthGuardUrl']);
  const raw = stored.healthguardUrl || local.lastActiveHealthGuardUrl || DEFAULT_URL;
  return raw.replace(/\/+$/, '');
}

async function saveToastState(toast) {
  await chrome.storage.local.set({
    lastHealthGuardToast: {
      ...toast,
      updatedAt: Date.now(),
      expiresAt: Date.now() + TOAST_TTL_MS,
    },
  });
}

async function saveEventToExtensionHistory(ev) {
  if (!ev || !ev.event_id) return;
  const stored = await chrome.storage.local.get(['lastHealthGuardEvents']);
  const existing = Array.isArray(stored.lastHealthGuardEvents)
    ? stored.lastHealthGuardEvents
    : [];
  const next = [ev, ...existing.filter((item) => item.event_id !== ev.event_id)].slice(0, 30);
  await chrome.storage.local.set({ lastHealthGuardEvents: next });
}

function clip(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function round1(val) {
  return Math.round(val * 10) / 10;
}

function parseNutritionTextInWorker(text) {
  if (!text || !text.trim()) return null;

  const cleanedRaw = text
    .replace(/\r\n?/g, '\n')
    .replace(/based on a?\s*[\d,]+\s*(?:kcal|calories?)\s*diet/gi, ' ')
    .replace(/[\d,]+\s*(?:kcal|calories?)\s*diet/gi, ' ');

  const normalized = cleanedRaw.replace(/\|/g, ' ').replace(/\s+/g, ' ').trim();
  const hasLabelHeader = /\b(?:nutrition(?:al)?\s*(?:facts|information|values)|per\s*100\s*g|per\s*serving|energy\s*\(?\s*k?cal)\b/i.test(
    cleanedRaw
  );

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

  const grabMacroGrams = (namePattern, allowBare = true) => {
    const unitBefore = new RegExp(
      `(?:${namePattern})\\s*\\(\\s*g(?:ms?)?\\s*\\)\\s*[:|\\-]?\\s*(\\d+(?:\\.\\d+)?)(?!\\s*%)`,
      'i'
    );
    const mBefore = normalized.match(unitBefore);
    if (mBefore) return parseFloat(mBefore[1]);

    const unitAfter = new RegExp(
      `(?:${namePattern})\\s*[:|\\-]?\\s*(\\d+(?:\\.\\d+)?)\\s*g(?:ms?)?\\b`,
      'i'
    );
    const mAfter = normalized.match(unitAfter);
    if (mAfter) return parseFloat(mAfter[1]);

    if (allowBare && hasLabelHeader) {
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

  const normalizedNoAdded = normalized.replace(/\badded\s+sugars?\b/gi, ' __added_sugar__ ');
  let sugars = grabMacroGrams('\\btotal\\s+sugars?');
  if (sugars === null) sugars = grabMacroGrams('\\bof\\s+which\\s+sugars?');
  if (sugars === null) {
    const mPlainBefore = normalizedNoAdded.match(/\bsugars?\s*\(\s*g(?:ms?)?\s*\)\s*[:|\-]?\s*(\d+(?:\.\d+)?)(?!\s*%)/i);
    const mPlainAfter = normalizedNoAdded.match(/\bsugars?\s*[:|\-]?\s*(\d+(?:\.\d+)?)\s*g(?:ms?)?\b/i);
    if (mPlainBefore) sugars = parseFloat(mPlainBefore[1]);
    else if (mPlainAfter) sugars = parseFloat(mPlainAfter[1]);
    else if (hasLabelHeader) {
      const mBare = normalizedNoAdded.match(/\bsugars?\s*[:|\-]?\s*(\d+(?:\.\d+)?)\b(?!\s*%)/i);
      if (mBare && parseFloat(mBare[1]) <= 105) sugars = parseFloat(mBare[1]);
    }
  }
  if (sugars === null) sugars = grabMacroGrams('\\badded\\s+sugars?');

  const normalizedNoSubFats = normalized.replace(
    /\b(?:saturated|sat\.?|trans|mono(?:unsaturated)?|poly(?:unsaturated)?|omega[\s\-\d]*fatty)\s+fat(?:ty\s+acids?)?\b/gi,
    ' __sub_fat__ '
  );
  let fat = grabMacroGrams('\\btotal\\s+fat');
  if (fat === null) {
    const mFatBefore = normalizedNoSubFats.match(/\bfat\s*\(\s*g(?:ms?)?\s*\)\s*[:|\-]?\s*(\d+(?:\.\d+)?)(?!\s*%)/i);
    const mFatAfter = normalizedNoSubFats.match(/\bfat\s*[:|\-]?\s*(\d+(?:\.\d+)?)\s*g(?:ms?)?\b/i);
    if (mFatBefore) fat = parseFloat(mFatBefore[1]);
    else if (mFatAfter) fat = parseFloat(mFatAfter[1]);
    else if (hasLabelHeader) {
      const mBare = normalizedNoSubFats.match(/\bfat\s*[:|\-]?\s*(\d+(?:\.\d+)?)\b(?!\s*%)/i);
      if (mBare && parseFloat(mBare[1]) <= 105) fat = parseFloat(mBare[1]);
    }
  }

  const protein = grabMacroGrams('\\bproteins?');
  const carbs = grabMacroGrams('(?:\\btotal\\s+)?\\bcarbohydrates?');

  let sodium_mg = null;
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

function scanIngredientsInWorker(productName, text, nutritionAnalysis) {
  if (!text || !text.trim()) return null;
  const segMatch = text.match(
    /ingredients?(?:\s*\/\s*dish\s*notes)?\s*[:\-]?\s*([\s\S]+?)(?:\bnutrition|\ballergen|\bstorage|\bmanufactured|\bpacked by|\bbest before|\bnet weight|$)/i
  );
  const sourceText = segMatch
    ? segMatch[1]
    : text.replace(/\bnutrition\s*(?:facts|information)?[\s\S]*$/i, '');

  const parsedIngredients = sourceText
    .split(/[,;\n•]+/)
    .map((p) => p.replace(/\s+/g, ' ').replace(/^[ .:\-()]+|[ .:\-()]+$/g, ''))
    .filter((p) => p.length >= 2 && p.length <= 90 && !/^[\d.\s%gmkcal]+$/i.test(p))
    .slice(0, 40);

  let masked = sourceText.toLowerCase();
  const findings = [];
  const seen = new Set();
  let ingScore = 72;
  let goodHits = 0;

  for (const [kw, label, reason] of [...BAD_ING].sort((a, b) => b[0].length - a[0].length)) {
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

  for (const [kw, label, reason] of [...MOD_ING].sort((a, b) => b[0].length - a[0].length)) {
    const re = new RegExp(`\\b${escapeRegExp(kw)}s?\\b`, 'g');
    if (re.test(masked)) {
      masked = masked.replace(re, ' ');
      if (!seen.has(label)) {
        seen.add(label);
        findings.push({ ingredient: label, rating: 'moderate', reason });
        ingScore -= 8;
      }
    }
  }

  for (const [kw, label, reason] of [...GOOD_ING].sort((a, b) => b[0].length - a[0].length)) {
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

  if (findings.length === 0 && parsedIngredients.length < 1) return null;

  ingScore = round1(clip(ingScore, 8, 98));
  const combinedScore = nutritionAnalysis
    ? round1(0.55 * nutritionAnalysis.health_score + 0.45 * ingScore)
    : ingScore;

  const verdict = combinedScore >= 68 ? 'Good' : combinedScore >= 44 ? 'Moderate' : 'Not Good';
  const reasons = findings.map((f) => ({
    type: f.rating === 'good' ? 'good' : f.rating === 'moderate' ? 'warning' : 'danger',
    text: `${f.ingredient}: ${f.reason}`,
  }));

  return {
    product_name: productName,
    verdict,
    score: combinedScore,
    nutrition_found: Boolean(nutritionAnalysis),
    ingredients_count: parsedIngredients.length,
    parsed_ingredients: parsedIngredients,
    ingredient_findings: findings,
    reasons: reasons.slice(0, 8),
    summary: `${productName} ingredient check scores ${combinedScore}/100 (${verdict}).`,
    nutrition_analysis: nutritionAnalysis || null,
  };
}

function isWholeNutOrSeedWorker(name, n) {
  const lower = (name || '').toLowerCase();
  const hasNutSeed = /\b(almonds?|badam|walnuts?|akhrot|pistachios?|pista|cashews?|kaju|peanuts?|hazelnuts?|pecans?|macadamias?|chia|flax(?:seeds?)?|pumpkin seeds?|sunflower seeds?|sesame|mixed nuts?|dry\s*fruits?|dryfruits?|panchmewa|trail mix|nut\s*mix|nutmix|makhana|fox nuts?|olive oil)\b/i.test(lower);
  const hasJunk = /\b(chocolate|candy|bar|cookie|biscuit|cake|pastry|ice cream|fried|chips|namkeen|bhujia|caramel|sugar coated|syrup|honey roasted|salted|masala|butter|nutella|sauce)\b/i.test(lower);
  return hasNutSeed && !hasJunk && n.sodium_mg <= 180 && n.sugars <= 30;
}

function isNaturalDriedFruitWorker(name, n) {
  const lower = (name || '').toLowerCase();
  const hasDried = /\b(dates?|datiles|khajoor|raisins?|kishmish|figs?|anjeer|prunes?|apricots?)\b/i.test(lower);
  const hasJunk = /\b(chocolate|candy|syrup|jam|cake|cookie|bar|sugar|juice)\b/i.test(lower);
  return hasDried && !hasJunk && n.sodium_mg <= 40 && n.fat <= 5;
}

function isWholeFruitOrBerryWorker(name, n) {
  const lower = (name || '').toLowerCase();
  const hasFruit = /\b(blueberr(?:y|ies)|strawberr(?:y|ies)|raspberr(?:y|ies)|blackberr(?:y|ies)|cranberr(?:y|ies)|berr(?:y|ies)|avocados?|apples?|oranges?|pears?|guavas?|kiwis?|papayas?|pomegranates?|watermelon|fresh fruit)\b/i.test(lower);
  const hasJunk = /\b(dried|candied|chocolate|candy|cookie|biscuit|cake|muffin|pastry|pie|jam|jelly|marmalade|juice|nectar|sharbat|squash|syrup|soda|ice cream|yogurt|smoothie)\b/i.test(lower);
  return hasFruit && !hasJunk && n.sodium_mg <= 45 && n.sugars <= 16 && (n.fat <= 5 || /\bavocado\b/i.test(lower));
}

function scoreNutritionInWorker(foodName, n) {
  const kcal = Math.max(Number(n.calories) || 0, 1);
  const sugars = Math.max(Number(n.sugars) || 0, 0);
  const fat = Math.max(Number(n.fat) || 0, 0);
  const protein = Math.max(Number(n.protein) || 0, 0);
  const sodium_mg = Math.max(Number(n.sodium_mg) || 0, 0);

  const sugar_kcal_pct = clip((sugars * 4) / kcal * 100, 0, 100);
  const fat_kcal_pct = clip((fat * 9) / kcal * 100, 0, 100);
  const protein_kcal_pct = clip((protein * 4) / kcal * 100, 0, 100);
  const sodium_per_100kcal = clip((sodium_mg / kcal) * 100, 0, 5000);

  const wholeNut = isWholeNutOrSeedWorker(foodName, { sugars, sodium_mg });
  const wholeFruitBerry = !wholeNut && isWholeFruitOrBerryWorker(foodName, { sugars, fat, sodium_mg });
  const wholeDriedFruit = !wholeNut && !wholeFruitBerry && isNaturalDriedFruitWorker(foodName, { fat, sodium_mg });

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
  } else if (wholeFruitBerry) {
    pen_sugar *= 0.12;
    pen_fat *= 0.2;
    bon_whole += 10;
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
      status: wholeNut || wholeFruitBerry || wholeDriedFruit ? (sugars > 40 ? 'moderate' : 'good') : sugar_kcal_pct > 25 || sugars > 20 ? 'high' : sugar_kcal_pct > 10 || sugars > 10 ? 'moderate' : 'good',
      note: wholeNut || wholeFruitBerry || wholeDriedFruit ? `${round1(sugar_kcal_pct)}% of kcal (natural intrinsic sugars)` : `${round1(sugar_kcal_pct)}% of calories`,
    },
    {
      nutrient: 'Total Fat',
      value_display: `${round1(fat)} g`,
      status: wholeNut || wholeFruitBerry ? 'good' : fat_kcal_pct > 45 ? 'high' : fat_kcal_pct > 30 ? 'moderate' : 'good',
      note: wholeNut ? `${round1(fat_kcal_pct)}% of kcal (heart-healthy unsaturated fats)` : `${round1(fat_kcal_pct)}% of calories`,
    },
    {
      nutrient: 'Protein',
      value_display: `${round1(protein)} g`,
      status: protein_kcal_pct >= 20 || (wholeNut && protein >= 12) ? 'good' : 'moderate',
      note: `${round1(protein_kcal_pct)}% of calories`,
    },
    {
      nutrient: 'Sodium',
      value_display: `${Math.round(sodium_mg)} mg`,
      status: sodium_per_100kcal > 220 || sodium_mg > 600 ? 'high' : sodium_per_100kcal > 115 || sodium_mg > 300 ? 'moderate' : 'good',
      note: `${Math.round(sodium_per_100kcal)} mg per 100 kcal`,
    },
  ];

  const verdictWord = classification === 'Healthy' ? 'Good' : classification === 'Moderate' ? 'Moderate' : 'Not Good';
  const level = classification === 'Healthy' ? 'success' : classification === 'Moderate' ? 'warning' : 'danger';
  const explanation = wholeNut
    ? `${foodName} is ${verdictWord} (${health_score}/100) — whole nuts & dry fruits rich in healthy fats and ${round1(protein)}g protein.`
    : wholeFruitBerry
    ? `${foodName} is ${verdictWord} (${health_score}/100) — natural whole fruit/berry with dietary fiber, antioxidants, and low glycemic load.`
    : `${foodName} is ${verdictWord} (${health_score}/100) · ${Math.round(n.calories)} kcal, ${round1(sugars)}g sugar, ${round1(fat)}g fat, ${round1(protein)}g protein.`;

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
      title: verdictWord === 'Good' ? 'Good Choice Added' : verdictWord === 'Moderate' ? 'Moderation Recommended' : 'Warning: Not Good Choice',
      message: explanation,
    },
    model_used: 'WHO/FDA Nutrient Engine',
  };
}

async function lookupStapleOrCatalogInWorker(title) {
  const norm = title.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!norm) return null;

  let bestStaple = null;
  for (const profile of GROCERY_STAPLES) {
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
      source: 'Grocery & Dish Profile',
      nutrition: {
        calories: p.calories,
        sugars: p.sugars,
        fat: p.fat,
        protein: p.protein,
        sodium_mg: p.sodium_mg,
      },
    };
  }

  const catalog = await getFoodCatalog();
  const qTokens = norm.split(' ').filter((t) => t.length > 1);
  if (!qTokens.length || !catalog.length) return null;

  let bestRow = null;
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
      nutrition: {
        calories: bestRow[1],
        sugars: bestRow[2],
        fat: bestRow[3],
        protein: bestRow[4],
        sodium_mg: bestRow[5],
      },
    };
  }

  return null;
}

function inferDefaultIngredientsInWorker(title) {
  const lower = (title || '').toLowerCase();
  if (/mixed\s*dry\s*fruits|dry\s*fruits|trail\s*mix|panchmewa/.test(lower)) {
    return 'Almonds, Cashews, Walnuts, Pistachios, Raisins, Dried Dates';
  }
  if (/almond|badam/.test(lower)) return '100% Roasted / Natural California Almonds';
  if (/walnut|akhrot/.test(lower)) return '100% Whole Unsalted Walnuts';
  if (/blueberry|blueberries/.test(lower)) return '100% Fresh Whole Blueberries';
  if (/strawberry|strawberries|raspberry|raspberries|blackberry|blackberries|berries|berry/.test(lower)) return '100% Fresh Whole Berries';
  if (/avocado|avocados/.test(lower)) return '100% Fresh Whole Avocado';
  if (/cashew|kaju/.test(lower)) return 'Whole Cashews (100%)';
  if (/pistachio|pista/.test(lower)) return 'Roasted Pistachios';
  if (/dates|khajoor|raisin|kishmish/.test(lower)) return 'Natural Dried Fruit (100%)';
  if (/rolled oats|steel cut oats|oats|oatmeal/.test(lower)) return 'Wholegrain Rolled Oats (100%)';
  if (/muesli|granola/.test(lower)) return 'Rolled Oats, Wheat Flakes, Sugar, Palm Oil, Raisins, Almonds';
  if (/basmati rice|white rice|sona masoori|rice/.test(lower)) return 'Aged Basmati Rice Grains (100%)';
  if (/brown rice|red rice/.test(lower)) return 'Wholegrain Unpolished Brown Rice (100%)';
  if (/whole wheat|atta|chakki/.test(lower)) return '100% Whole Wheat Flour (Atta)';
  if (/instant noodles|maggi|ramen|yippee|noodles/.test(lower)) {
    return 'Refined Wheat Flour (Maida), Palm Oil, Iodized Salt, Spices, Sugar, Flavor Enhancers';
  }
  if (/potato chips|lays|kurkure|namkeen|bhujia|chips/.test(lower)) {
    return 'Potatoes, Refined Palmolein Oil, Iodized Salt, Spices & Condiments, Sugar';
  }
  if (/biscuit|cookies|oreo|parle|bourbon|marie/.test(lower)) {
    return 'Refined Wheat Flour (Maida), Sugar, Palm Oil, Invert Syrup, Milk Solids, Salt';
  }
  if (/chocolate|dairy milk|kitkat|snickers/.test(lower)) {
    return 'Sugar, Cocoa Butter, Milk Solids, Cocoa Mass, Emulsifiers (Soy Lecithin)';
  }
  if (/coca cola|pepsi|sprite|fanta|soft drink|soda|cola/.test(lower)) {
    return 'Carbonated Water, Sugar, Caramel Color, Phosphoric Acid, Caffeine, Natural Flavors';
  }
  if (/biryani/.test(lower)) return 'Basmati Rice, Spices, Ghee/Oil, Onions, Ginger Garlic, Salt';
  if (/masala dosa|dosa/.test(lower)) return 'Fermented Rice & Urad Dal Batter, Potato Masala, Cooking Oil, Salt';
  if (/idli/.test(lower)) return 'Steamed Fermented Rice & Urad Dal Batter, Salt';
  if (/pizza/.test(lower)) return 'Refined Wheat Flour, Mozzarella Cheese, Tomato Sauce, Olive Oil, Salt';
  if (/burger/.test(lower)) return 'Refined Flour Bun, Fried Patty, Mayonnaise, Cheese Slice, Salt, Spices';
  return '';
}

async function lookupOpenFoodFactsInWorker(title, barcode) {
  if (barcode) {
    try {
      const r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`);
      if (r.ok) {
        const d = await r.json();
        const p = d?.product;
        const n = p?.nutriments;
        const kcal = n?.['energy-kcal_100g'] ?? n?.['energy-kcal_serving'];
        if (kcal != null) {
          let sodiumMg = Number(n.sodium_100g || 0) * 1000;
          if (!sodiumMg && n.salt_100g) sodiumMg = Number(n.salt_100g) * 393.4;
          return {
            matched_food: p.product_name || title,
            source: 'Open Food Facts (Barcode)',
            ingredients_text: p.ingredients_text || '',
            image_url: p.image_front_small_url || p.image_front_url || p.image_url || '',
            nutrition: {
              calories: Number(kcal) || 0,
              sugars: Number(n.sugars_100g || 0),
              fat: Number(n.fat_100g || 0),
              protein: Number(n.proteins_100g || 0),
              sodium_mg: sodiumMg,
            },
          };
        }
      }
    } catch {
      // ignore
    }
  }

  const cleanQuery = title
    .replace(/\b\d+(?:\.\d+)?\s*(?:g|gm|gms|kg|ml|l|ltr|oz|lb|pcs|ct)\b/gi, ' ')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .trim()
    .split(/\s+/)
    .slice(0, 6)
    .join(' ');

  if (!cleanQuery) return null;

  try {
    const r = await fetch(
      `https://search.openfoodfacts.org/search?q=${encodeURIComponent(cleanQuery)}&page_size=6&fields=product_name,brands,nutriments,ingredients_text,image_front_small_url,image_front_url,image_url`
    );
    if (r.ok) {
      const d = await r.json();
      for (const p of d?.hits || []) {
        const n = p?.nutriments;
        const kcal = n?.['energy-kcal_100g'] ?? n?.['energy-kcal_serving'] ?? n?.['energy-kcal'];
        if (!p?.product_name || kcal == null) continue;
        let sodiumMg = Number(n.sodium_100g || 0) * 1000;
        if (!sodiumMg && n.salt_100g) sodiumMg = Number(n.salt_100g) * 393.4;
        return {
          matched_food: p.product_name,
          source: 'Open Food Facts (Live Packaged DB)',
          ingredients_text: p.ingredients_text || '',
          image_url: p.image_front_small_url || p.image_front_url || p.image_url || '',
          nutrition: {
            calories: Number(kcal) || 0,
            sugars: Number(n.sugars_100g || 0),
            fat: Number(n.fat_100g || 0),
            protein: Number(n.proteins_100g || 0),
            sodium_mg: sodiumMg,
          },
        };
      }
    }
  } catch {
    // fallback below
  }

  try {
    const r2 = await fetch(
      `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(cleanQuery)}&search_simple=1&action=process&json=1&page_size=6`
    );
    if (r2.ok) {
      const d2 = await r2.json();
      for (const p of d2?.products || []) {
        const n = p?.nutriments;
        const kcal = n?.['energy-kcal_100g'] ?? n?.['energy-kcal_serving'];
        if (!p?.product_name || kcal == null) continue;
        let sodiumMg = Number(n.sodium_100g || 0) * 1000;
        if (!sodiumMg && n.salt_100g) sodiumMg = Number(n.salt_100g) * 393.4;
        return {
          matched_food: p.product_name,
          source: 'Open Food Facts (Live Packaged DB)',
          ingredients_text: p.ingredients_text || '',
          image_url: p.image_front_small_url || p.image_front_url || p.image_url || '',
          nutrition: {
            calories: Number(kcal) || 0,
            sugars: Number(n.sugars_100g || 0),
            fat: Number(n.fat_100g || 0),
            protein: Number(n.proteins_100g || 0),
            sodium_mg: sodiumMg,
          },
        };
      }
    }
  } catch {
    // ignore
  }
  return null;
}

async function analyzeInExtensionFallback(payload) {
  const title = payload.product_title || 'Food Item';
  const platform = inferPlatformName(payload.product_url, payload.source_platform);
  const combinedText = [payload.ingredients_text || '', payload.nutrition_text || '']
    .filter(Boolean)
    .join('\n');

  let nutrition = parseNutritionTextInWorker(combinedText);
  let nutritionSource = nutrition ? `${platform} Page Nutrition Facts` : '';
  let matchedFood = null;
  let capturedIngredients = payload.ingredients_text || '';
  let imageUrl = payload.image_url || '';

  if (!nutrition || !imageUrl || !capturedIngredients) {
    const stapleOrCatalog = await lookupStapleOrCatalogInWorker(title);
    const titleWords = title.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').trim().split(/\s+/).filter(Boolean);
    const isWholeProduceStaple =
      stapleOrCatalog?.source === 'Grocery & Dish Profile' &&
      /\b(walnuts?|akhrot|almonds?|badam|blueberr(?:y|ies)|strawberr(?:y|ies)|raspberr(?:y|ies)|blackberr(?:y|ies)|berr(?:y|ies)|avocados?)\b/i.test(title) &&
      !/\b(chocolate|candy|cookie|biscuit|cake|muffin|jam|jelly|juice|syrup|salted|masala|butter|chips|dried)\b/i.test(title);
    const isPureStaple =
      isWholeProduceStaple ||
      (stapleOrCatalog?.source === 'Grocery & Dish Profile' && titleWords.length <= 2);

    const off = isPureStaple && (nutrition || isWholeProduceStaple) && imageUrl
      ? null
      : isWholeProduceStaple && imageUrl
      ? null
      : await lookupOpenFoodFactsInWorker(title, payload.barcode);

    if (stapleOrCatalog && !nutrition) {
      nutrition = stapleOrCatalog.nutrition;
      nutritionSource = `${stapleOrCatalog.source} (Estimated)`;
      matchedFood = stapleOrCatalog.matched_food;
    } else if (off && !nutrition && !isWholeProduceStaple) {
      nutrition = off.nutrition;
      nutritionSource = `${off.source} (Estimated)`;
      matchedFood = off.matched_food;
    }

    if (!capturedIngredients && off?.ingredients_text && !isWholeProduceStaple && !stapleOrCatalog) {
      capturedIngredients = off.ingredients_text;
    }
    if (!imageUrl && off?.image_url) {
      imageUrl = off.image_url;
    }
  }

  if (!capturedIngredients) {
    capturedIngredients = inferDefaultIngredientsInWorker(title);
  }

  const baseNutrition = nutrition || { calories: 150, sugars: 0, fat: 0, protein: 0, sodium_mg: 0 };
  const analysis = nutrition ? scoreNutritionInWorker(title, baseNutrition) : null;
  const ingredientScan = capturedIngredients
    ? scanIngredientsInWorker(title, capturedIngredients, analysis)
    : null;

  const eventId = `ext-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  if (!analysis && !ingredientScan) {
    return {
      event_id: eventId,
      timestamp: new Date().toISOString(),
      source: payload.source || 'store_browser_extension',
      source_platform: platform,
      status: 'needs_nutrition',
      product_title: title,
      product_url: payload.product_url || null,
      image_url: imageUrl || null,
      nutrition_source: 'Nutrition Label Not Found on Page',
      matched_food: null,
      message: `Captured "${title}" from ${platform}. Open NutriCheck to enter label numbers or scan packet photo.`,
      analysis: null,
      ingredients_text: null,
      ingredient_scan: null,
    };
  }

  const finalAnalysis = analysis || scoreNutritionInWorker(title, baseNutrition);
  if (ingredientScan && !analysis) {
    nutritionSource = `${platform} Ingredients Scan`;
  } else if (ingredientScan && analysis) {
    nutritionSource = `${nutritionSource} + Ingredients Scan`;
  }

  return {
    event_id: eventId,
    timestamp: new Date().toISOString(),
    source: payload.source || 'store_browser_extension',
    source_platform: platform,
    status: 'analyzed',
    product_title: title,
    product_url: payload.product_url || null,
    image_url: imageUrl || null,
    nutrition_source: nutritionSource,
    matched_food: matchedFood,
    message: ingredientScan
      ? `${finalAnalysis.explanation} Scanned ingredients (${ingredientScan.verdict}).`
      : finalAnalysis.explanation,
    analysis: finalAnalysis,
    ingredients_text: capturedIngredients || null,
    ingredient_scan: ingredientScan,
  };
}

function buildToastFromResponse({ ok, baseUrl, data, error, productTitle, platform, imageUrl, ingredientsText }) {
  const storeName = data?.source_platform || platform || 'Online Store';
  const resolvedImage = data?.image_url || imageUrl || '';
  const resolvedIngredients = data?.ingredients_text || ingredientsText || '';

  if (!ok || !data) {
    const fallbackQuery = new URLSearchParams({
      item: productTitle || 'Food Item',
      source: storeName.toLowerCase(),
    }).toString();

    return {
      level: 'info',
      verdict: 'Offline',
      platform: storeName,
      productName: productTitle || 'Food Item',
      imageUrl: resolvedImage,
      ingredientsText: resolvedIngredients,
      takeaway: error || `Could not reach NutriCheck at ${baseUrl}.`,
      score: null,
      baseUrl,
      query: fallbackQuery,
    };
  }

  if (data.status === 'needs_nutrition' || !data.analysis) {
    const queryParams = new URLSearchParams({
      item: data.product_title || productTitle || 'Food Item',
      source: storeName.toLowerCase(),
    });
    if (resolvedImage) queryParams.set('image_url', resolvedImage);
    if (resolvedIngredients) queryParams.set('ingredients', resolvedIngredients.slice(0, 350));

    return {
      level: 'warning',
      verdict: 'Needs Info',
      platform: storeName,
      productName: data.product_title || productTitle || 'Food Item',
      imageUrl: resolvedImage,
      ingredientsText: resolvedIngredients,
      takeaway: 'Label numbers were not on this page. Open NutriCheck to paste or scan the packet.',
      score: null,
      baseUrl,
      query: queryParams.toString(),
    };
  }

  const a = data.analysis;
  const verdict = a.classification === 'Healthy' ? 'Good' : a.classification === 'Moderate' ? 'Moderate' : 'Not Good';

  const scan = data.ingredient_scan;
  let ingredientSummary = null;
  if (scan && Array.isArray(scan.ingredient_findings)) {
    const goodCount = scan.ingredient_findings.filter((f) => f.rating === 'good').length;
    const modCount = scan.ingredient_findings.filter((f) => f.rating === 'moderate').length;
    const badCount = scan.ingredient_findings.filter((f) => f.rating === 'high').length;
    const unflagged =
      goodCount + modCount + badCount === 0 ? scan.parsed_ingredients?.length || 0 : 0;
    const g = goodCount + unflagged;
    const total = g + modCount + badCount;
    if (total > 0) {
      ingredientSummary = {
        goodCount: g,
        modCount,
        badCount,
        total,
        highlights: scan.ingredient_findings.slice(0, 4).map((f) => ({
          ingredient: f.ingredient,
          rating: f.rating,
        })),
      };
    }
  }

  const queryParams = new URLSearchParams({
    item: a.food_name,
    calories: String(a.nutrition.calories),
    sugars: String(a.nutrition.sugars),
    fat: String(a.nutrition.fat),
    protein: String(a.nutrition.protein),
    sodium_mg: String(a.nutrition.sodium_mg),
    source: storeName.toLowerCase(),
  });
  if (resolvedImage) queryParams.set('image_url', resolvedImage);
  if (resolvedIngredients) queryParams.set('ingredients', resolvedIngredients.slice(0, 350));

  return {
    level: a.cart_alert.level,
    verdict,
    platform: storeName,
    productName: a.food_name,
    imageUrl: resolvedImage,
    ingredientsText: resolvedIngredients,
    takeaway: a.explanation,
    score: a.health_score,
    macros: {
      calories: a.nutrition.calories,
      sugars: a.nutrition.sugars,
      fat: a.nutrition.fat,
      protein: a.nutrition.protein,
    },
    ingredientSummary,
    baseUrl,
    query: queryParams.toString(),
  };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'HEALTHGUARD_ADD_TO_CART') {
    (async () => {
      const baseUrl = await getHealthGuardUrl();
      const rawTitle = (message.payload?.product_title || '').trim();
      if (!rawTitle || /^(?:subtotal|cart subtotal|your cart|shopping cart|proceed to (?:buy|checkout)|order summary)$/i.test(rawTitle)) {
        sendResponse({ ok: false, ignored: true });
        return;
      }
      const productTitle = rawTitle || 'Food Item';
      const platform = inferPlatformName(message.payload?.product_url, message.payload?.source_platform);
      const payloadImageUrl = message.payload?.image_url || '';
      const payloadIngredients = message.payload?.ingredients_text || '';

      await saveToastState({
        level: 'info',
        verdict: 'Checking...',
        platform,
        productName: productTitle,
        imageUrl: payloadImageUrl,
        ingredientsText: payloadIngredients,
        takeaway: 'Scanning ingredients and nutrition profile...',
        score: null,
        baseUrl,
        query: new URLSearchParams({ item: productTitle, source: platform.toLowerCase() }).toString(),
      });

      const storedAuth = await chrome.storage.local.get(['activeHealthGuardUserId']);
      const activeUserId = storedAuth?.activeHealthGuardUserId || null;
      const outboundPayload = {
        ...(message.payload || {}),
        ...(activeUserId ? { user_id: activeUserId } : {}),
      };

      let eventData = null;
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 3200);
        const headers = {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        };
        if (activeUserId) {
          headers['X-User-Id'] = activeUserId;
        }
        const res = await fetch(`${baseUrl}/api/amazon/add-to-cart`, {
          method: 'POST',
          mode: 'cors',
          headers,
          body: JSON.stringify(outboundPayload),
          signal: ctrl.signal,
        });
        clearTimeout(timer);
        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          const candidate = await res.json().catch(() => null);
          if (candidate && candidate.status === 'analyzed') {
            eventData = candidate;
          }
        }
      } catch {
        // Fallback to local worker engine below
      }

      if (!eventData) {
        eventData = await analyzeInExtensionFallback(
          outboundPayload || { product_title: productTitle }
        );
      }

      if (eventData) {
        if (activeUserId && !eventData.user_id) eventData.user_id = activeUserId;
        if (!eventData.source_platform) eventData.source_platform = platform;
        if (!eventData.image_url && payloadImageUrl) eventData.image_url = payloadImageUrl;
        if (!eventData.ingredients_text && payloadIngredients) {
          eventData.ingredients_text = payloadIngredients;
        }
      }

      await saveEventToExtensionHistory(eventData);

      const toast = buildToastFromResponse({
        ok: true,
        baseUrl,
        data: eventData,
        productTitle,
        platform,
        imageUrl: payloadImageUrl,
        ingredientsText: payloadIngredients,
      });
      await saveToastState(toast);
      sendResponse({ ok: true, baseUrl, event: eventData, toast });
    })();
    return true;
  }

  if (message?.type === 'HEALTHGUARD_DISMISS_TOAST') {
    chrome.storage.local.remove('lastHealthGuardToast');
    return false;
  }

  if (message?.type === 'HEALTHGUARD_OPEN_SITE') {
    (async () => {
      const baseUrl = await getHealthGuardUrl();
      const target = message.query ? `${baseUrl}/amazon?${message.query}` : `${baseUrl}/amazon`;
      chrome.tabs.create({ url: target });
    })();
  }

  return false;
});
