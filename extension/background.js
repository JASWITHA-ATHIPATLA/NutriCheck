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
  { keywords: ['almond', 'badam', 'walnut', 'pistachio', 'cashew', 'peanut', 'chia', 'flax', 'pumpkin seed', 'sunflower seed', 'dry fruits', 'mixed nuts'], name: 'Nuts & Seeds (per 100g)', calories: 579, sugars: 4.4, fat: 49.9, protein: 21.2, sodium_mg: 4 },
  { keywords: ['dates', 'khajoor', 'raisins', 'kishmish'], name: 'Dried Dates / Raisins (per 100g)', calories: 282, sugars: 63.0, fat: 0.4, protein: 2.5, sodium_mg: 3 },
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
  { keywords: ['ice cream', 'kulfi', 'gelato'], name: 'Ice Cream (per 100g)', calories: 207, sugars: 21.2, fat: 11.0, protein: 3.5, sodium_mg: 80 },
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
  ['almond', 'Almonds', 'Heart-healthy unsaturated fats and protein.'],
  ['peanut', 'Peanuts', 'Good source of protein and unsaturated fats.'],
  ['chia', 'Chia Seeds', 'Rich in dietary fiber and omega-3 fats.'],
  ['flax', 'Flax Seeds', 'Rich in soluble fiber and plant omega-3 fats.'],
  ['olive oil', 'Olive Oil', 'Monounsaturated healthy cooking fat.'],
  ['turmeric', 'Turmeric', 'Natural spice with curcumin antioxidants.'],
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

async function getHealthGuardUrl() {
  const stored = await chrome.storage.sync.get(['healthguardUrl']);
  const raw = stored.healthguardUrl || DEFAULT_URL;
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
  const normalized = text.replace(/\s+/g, ' ').trim();
  const calMatch = normalized.match(
    /(?:calories|energy(?:\s*\(\s*kcal\s*\))?)\s*[:|\-]?\s*(\d+(?:\.\d+)?)\s*(?:kcal|cal)?/i
  );
  if (!calMatch) return null;
  const calories = parseFloat(calMatch[1]);

  const grab = (re) => {
    const m = normalized.match(re);
    return m ? parseFloat(m[1]) : null;
  };

  const sugars = grab(/(?:total\s+sugars?|of\s+which\s+sugars?|added\s+sugars?|sugars?)\s*[:|\-]?\s*(\d+(?:\.\d+)?)\s*g\b/i);
  const fat = grab(/(?:total\s+)?fat\s*[:|\-]?\s*(\d+(?:\.\d+)?)\s*g\b/i);
  const protein = grab(/protein\s*[:|\-]?\s*(\d+(?:\.\d+)?)\s*g\b/i);
  const carbs = grab(/(?:total\s+)?carbohydrate[s]?\s*[:|\-]?\s*(\d+(?:\.\d+)?)\s*g\b/i);

  let sodium_mg = null;
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

function scanIngredientsInWorker(productName, text, nutritionAnalysis) {
  if (!text || !text.trim()) return null;
  const segMatch = text.match(
    /ingredients?\s*[:\-]?\s*([\s\S]+?)(?:\bnutrition|\ballergen|\bstorage|\bmanufactured|\bpacked by|\bbest before|\bnet weight|$)/i
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

  const pen_sugar = clip((sugar_kcal_pct - 10) * 0.75, 0, 35) + clip((sugars - 20) * 0.4, 0, 10);
  const pen_fat = clip((fat_kcal_pct - 30) * 0.65, 0, 18);
  const pen_sod = clip((sodium_per_100kcal - 115) * 0.08, 0, 22) + clip((sodium_mg - 500) * 0.012, 0, 10);
  const pen_ed = clip((kcal - 260) * 0.035, 0, 12);
  const bon_prot = clip(protein_kcal_pct * 0.4, 0, 12);
  const bon_whole = kcal < 160 && sugar_kcal_pct < 35 && sodium_per_100kcal < 150 ? 5 : 0;

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

  const verdictWord = classification === 'Healthy' ? 'Good' : classification === 'Moderate' ? 'Moderate' : 'Not Good';
  const level = classification === 'Healthy' ? 'success' : classification === 'Moderate' ? 'warning' : 'danger';
  const explanation = `${foodName} is ${verdictWord} (${health_score}/100) across ${round1(n.calories)} kcal, ${round1(sugars)}g sugar, ${round1(fat)}g fat, ${round1(protein)}g protein, and ${Math.round(sodium_mg)}mg sodium.`;

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
      source: 'Grocery Staple Nutrition Profile',
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
      `https://search.openfoodfacts.org/search?q=${encodeURIComponent(cleanQuery)}&page_size=6&fields=product_name,brands,nutriments,ingredients_text`
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
  const title = payload.product_title || 'Amazon Item';
  const combinedText = [payload.ingredients_text || '', payload.nutrition_text || '']
    .filter(Boolean)
    .join('\n');

  let nutrition = parseNutritionTextInWorker(combinedText);
  let nutritionSource = nutrition ? 'Amazon Page Nutrition Facts' : '';
  let matchedFood = null;
  let capturedIngredients = payload.ingredients_text || '';

  if (!nutrition) {
    const stapleOrCatalog = await lookupStapleOrCatalogInWorker(title);
    const titleWords = title.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').trim().split(/\s+/).filter(Boolean);
    const isPureStaple =
      stapleOrCatalog?.source === 'Grocery Staple Nutrition Profile' && titleWords.length <= 2;

    const off = isPureStaple ? null : await lookupOpenFoodFactsInWorker(title, payload.barcode);
    let offIsRelevant = false;
    if (off) {
      if (!stapleOrCatalog) {
        offIsRelevant = true;
      } else {
        const qTokens = titleWords.filter((t) => t.length > 2);
        const hNorm = (off.matched_food || '').toLowerCase();
        const overlap = qTokens.filter((t) => hNorm.includes(t)).length;
        offIsRelevant = qTokens.length > 0 && overlap / qTokens.length >= 0.5;
      }
    }

    if (off && offIsRelevant) {
      nutrition = off.nutrition;
      nutritionSource = off.source;
      matchedFood = off.matched_food;
      if (!capturedIngredients && off.ingredients_text) {
        capturedIngredients = off.ingredients_text;
      }
    } else if (stapleOrCatalog) {
      nutrition = stapleOrCatalog.nutrition;
      nutritionSource = stapleOrCatalog.source;
      matchedFood = stapleOrCatalog.matched_food;
    } else if (off) {
      nutrition = off.nutrition;
      nutritionSource = off.source;
      matchedFood = off.matched_food;
      if (!capturedIngredients && off.ingredients_text) {
        capturedIngredients = off.ingredients_text;
      }
    }
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
      source: payload.source || 'amazon_browser_extension',
      status: 'needs_nutrition',
      product_title: title,
      product_url: payload.product_url || null,
      nutrition_source: 'Nutrition Label Not Found on Page',
      matched_food: null,
      message: `Captured "${title}" from Amazon Add to Cart. Open NutriCheck to enter label numbers or scan packet ingredients.`,
      analysis: null,
      ingredients_text: null,
      ingredient_scan: null,
    };
  }

  const finalAnalysis = analysis || scoreNutritionInWorker(title, baseNutrition);
  if (ingredientScan && !analysis) {
    nutritionSource = 'Amazon Page Ingredients Scan';
  } else if (ingredientScan && analysis) {
    nutritionSource = `${nutritionSource} + Ingredients Scan`;
  }

  return {
    event_id: eventId,
    timestamp: new Date().toISOString(),
    source: payload.source || 'amazon_browser_extension',
    status: 'analyzed',
    product_title: title,
    product_url: payload.product_url || null,
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

function buildToastFromResponse({ ok, baseUrl, data, error, productTitle }) {
  if (!ok || !data) {
    const fallbackQuery = new URLSearchParams({
      item: productTitle || 'Amazon Item',
      source: 'amazon',
    }).toString();

    return {
      level: 'info',
      title: 'NutriCheck: Connection Issue',
      message:
        error ||
        `Could not connect to NutriCheck at ${baseUrl}. Make sure your website is reachable.`,
      score: null,
      baseUrl,
      query: fallbackQuery,
    };
  }

  if (data.status === 'needs_nutrition' || !data.analysis) {
    const query = new URLSearchParams({
      item: data.product_title || productTitle || 'Amazon Item',
      source: 'amazon',
    }).toString();

    return {
      level: 'warning',
      title: 'NutriCheck: Sent to Website (Needs Nutrition)',
      message:
        data.message ||
        `Captured "${data.product_title}" for your NutriCheck website.`,
      score: null,
      baseUrl,
      query,
    };
  }

  const a = data.analysis;
  const verdict = a.classification === 'Healthy' ? 'Good' : a.classification === 'Moderate' ? 'Moderate' : 'Not Good';
  const query = new URLSearchParams({
    item: a.food_name,
    calories: String(a.nutrition.calories),
    sugars: String(a.nutrition.sugars),
    fat: String(a.nutrition.fat),
    protein: String(a.nutrition.protein),
    sodium_mg: String(a.nutrition.sodium_mg),
    source: 'amazon',
  }).toString();

  return {
    level: a.cart_alert.level,
    title: `NutriCheck: ${verdict}`,
    message: `${a.explanation} (${data.nutrition_source})`,
    score: a.health_score,
    baseUrl,
    query,
  };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'HEALTHGUARD_ADD_TO_CART') {
    (async () => {
      const baseUrl = await getHealthGuardUrl();
      const productTitle = message.payload?.product_title || 'Amazon Item';

      await saveToastState({
        level: 'info',
        title: 'NutriCheck: Analyzing Amazon Item...',
        message: `Scanning "${productTitle}" ingredients & calories, syncing to ${baseUrl}.`,
        score: null,
        baseUrl,
        query: new URLSearchParams({ item: productTitle, source: 'amazon' }).toString(),
      });

      let eventData = null;
      try {
        const res = await fetch(`${baseUrl}/api/amazon/add-to-cart`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(message.payload),
        });
        if (res.ok) {
          const candidate = await res.json().catch(() => null);
          if (candidate && candidate.status === 'analyzed') {
            eventData = candidate;
          }
        }
      } catch {
        // Fallback below handles static Vercel deployments and universal staples
      }

      if (!eventData) {
        eventData = await analyzeInExtensionFallback(
          message.payload || { product_title: productTitle }
        );
      }

      await saveEventToExtensionHistory(eventData);

      const toast = buildToastFromResponse({
        ok: true,
        baseUrl,
        data: eventData,
        productTitle,
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
      const target = message.query ? `${baseUrl}/analyzer?${message.query}` : `${baseUrl}/analyzer`;
      chrome.tabs.create({ url: target });
    })();
  }

  return false;
});
