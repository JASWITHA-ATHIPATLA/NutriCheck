import 'dotenv/config';
import express from 'express';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { connectMongoDB, getMongoStatus } from './db/mongodb.mjs';
import {
  getUserById,
  loginUser,
  registerUser,
  syncOrUpsertUser,
  updateUserProfile,
} from './db/userStore.mjs';
import {
  clearCartEventsForUser,
  deleteCartEventForUser,
  getCartEventForUser,
  listCartEventsForUser,
  saveCartEventForUser,
} from './db/cartStore.mjs';
import {
  deletePrescriptionForUser,
  getActivePrescriptionSummaryForUser,
  listPrescriptionsForUser,
  savePrescriptionForUser,
  updatePrescriptionForUser,
} from './db/prescriptionStore.mjs';
import {
  deleteFoodLogForUser,
  getFoodLogById,
  getFoodLogBySourceEvent,
  listFoodLogsForUser,
  saveFoodLogForUser,
} from './db/foodLogStore.mjs';
import {
  PRESCRIPTION_DISCLAIMER,
  evaluateProductAgainstPrescriptions,
  resolveCanonicalConditionMeta,
} from './rules/prescriptionAlertEngine.mjs';
import {
  PrescriptionServiceError,
  analyzePrescriptionDocument,
} from './services/prescriptionVisionService.mjs';
import {
  buildFullNutrientProfile,
  buildNutritionComparisonReport,
  classifyInstantConsumable,
  computePersonalizedRequirements,
} from './rules/nutritionTrackerEngine.mjs';
import { parseNutritionText } from './ocr/nutritionParser.mjs';
import { scanGalleryImagesForPacket } from './ocr/packetGalleryOcr.mjs';

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
  { keywords: ['peanut butter', 'almond butter'], name: 'Nut / Peanut Butter (per 100g)', calories: 588, sugars: 9.2, fat: 50.0, protein: 25.1, sodium_mg: 420 },
  { keywords: ['mixed dry fruits', 'dry fruits', 'dry fruit', 'dryfruits', 'dryfruit', 'panchmewa', 'mixed nuts', 'trail mix', 'nut mix', 'nutmix'], name: 'Mixed Dry Fruits & Nuts (per 100g)', calories: 465, sugars: 14.0, fat: 28.5, protein: 14.2, sodium_mg: 6 },
  { keywords: ['walnuts', 'walnut', 'akhrot'], name: 'Walnuts (Unsalted Whole, per 100g)', calories: 654, sugars: 2.6, fat: 65.2, protein: 15.2, sodium_mg: 2 },
  { keywords: ['almonds', 'almond', 'badam'], name: 'Almonds (Unsalted Whole, per 100g)', calories: 579, sugars: 4.4, fat: 49.9, protein: 21.2, sodium_mg: 1 },
  { keywords: ['pistachios', 'pistachio', 'pista', 'cashews', 'cashew', 'kaju', 'peanuts', 'peanut', 'chia seeds', 'chia', 'flaxseeds', 'flax', 'makhana'], name: 'Nuts & Seeds (per 100g)', calories: 579, sugars: 4.4, fat: 49.9, protein: 21.2, sodium_mg: 4 },
  { keywords: ['dates', 'datiles', 'khajoor', 'raisins', 'raisin', 'kishmish', 'anjeer', 'dried fig'], name: 'Dried Dates / Raisins / Figs (per 100g)', calories: 282, sugars: 63.0, fat: 0.4, protein: 2.5, sodium_mg: 3 },
  { keywords: ['blueberries', 'blueberry'], name: 'Blueberries (Fresh Whole, per 100g)', calories: 57, sugars: 10.0, fat: 0.3, protein: 0.7, sodium_mg: 1 },
  { keywords: ['strawberries', 'strawberry', 'raspberries', 'raspberry', 'blackberries', 'blackberry', 'cranberries', 'cranberry', 'berries', 'berry'], name: 'Fresh Berries (Whole, per 100g)', calories: 46, sugars: 7.5, fat: 0.4, protein: 1.0, sodium_mg: 1 },
  { keywords: ['avocado', 'avocados'], name: 'Avocado (Fresh Whole, per 100g)', calories: 160, sugars: 0.7, fat: 14.7, protein: 2.0, sodium_mg: 7 },
  { keywords: ['apple', 'apples', 'banana', 'bananas', 'orange', 'oranges', 'mango', 'grape', 'grapes', 'watermelon', 'kiwi', 'papaya', 'guava', 'pomegranate', 'pear', 'fruit'], name: 'Fresh Fruit (Whole, per 100g)', calories: 58, sugars: 11.2, fat: 0.2, protein: 0.7, sodium_mg: 1 },
  { keywords: ['honey'], name: 'Honey (per 100g)', calories: 304, sugars: 82.1, fat: 0.0, protein: 0.3, sodium_mg: 4 },
  { keywords: ['biryani'], name: 'Biryani (per 100g)', calories: 168, sugars: 1.2, fat: 6.4, protein: 9.2, sodium_mg: 380 },
  { keywords: ['dosa'], name: 'Dosa (South Indian Crepe, per 100g)', calories: 168, sugars: 1.4, fat: 4.2, protein: 4.3, sodium_mg: 290 },
  { keywords: ['idli'], name: 'Steamed Idli / Breakfast (per 100g)', calories: 118, sugars: 0.8, fat: 0.9, protein: 3.9, sodium_mg: 220 },
  { keywords: ['pizza'], name: 'Baked Cheese Pizza (per 100g)', calories: 266, sugars: 3.6, fat: 10.1, protein: 11.4, sodium_mg: 598 },
  { keywords: ['burger'], name: 'Fast-Food Burger (per 100g)', calories: 272, sugars: 5.4, fat: 12.8, protein: 12.2, sodium_mg: 540 },
];

const GOOD_ING = [
  ['wholegrain', 'Whole Grain', 'Unrefined whole-grain fiber supports steady energy.'],
  ['whole grain', 'Whole Grain', 'Unrefined whole-grain fiber supports steady energy.'],
  ['whole wheat', 'Whole Wheat', 'Retains natural bran and fiber.'],
  ['rolled oats', 'Rolled Oats', 'Rich in soluble beta-glucan fiber and protein.'],
  ['oats', 'Oats', 'Whole-grain oat base with dietary fiber.'],
  ['brown rice', 'Brown Rice', 'Whole grain retaining bran and micronutrients.'],
  ['basmati rice', 'Basmati Rice', 'Natural aromatic grain with minimal fat and sodium.'],
  ['almond', 'Almonds', 'Heart-healthy unsaturated fats, vitamin E, and protein.'],
  ['walnut', 'Walnuts', 'Rich in plant omega-3 fats and antioxidants.'],
  ['cashew', 'Cashews', 'Source of minerals, plant protein, and unsaturated fats.'],
  ['pistachio', 'Pistachios', 'Nutrient-dense tree nut with fiber and protein.'],
  ['peanut', 'Peanuts', 'Good source of protein and unsaturated fats.'],
  ['raisin', 'Raisins', 'Natural dried fruit rich in iron, potassium, and fiber.'],
  ['date', 'Dates', 'Natural whole fruit sweetener with fiber and minerals.'],
  ['blueberry', 'Blueberries', 'Rich in anthocyanin antioxidants, fiber, and low glycemic load.'],
  ['blueberries', 'Blueberries', 'Rich in anthocyanin antioxidants, fiber, and low glycemic load.'],
  ['strawberry', 'Strawberries', 'Low-sugar berry rich in vitamin C and fiber.'],
  ['raspberry', 'Raspberries', 'High-fiber berry supporting steady blood glucose.'],
  ['blackberry', 'Blackberries', 'Antioxidant-rich low-GI berry.'],
  ['berry', 'Berries', 'Antioxidant-rich whole fruit with dietary fiber.'],
  ['avocado', 'Avocado', 'Heart-healthy monounsaturated fats and dietary fiber.'],
  ['chia', 'Chia Seeds', 'Rich in dietary fiber and omega-3 fats.'],
  ['olive oil', 'Olive Oil', 'Monounsaturated healthy cooking fat.'],
];

const MOD_ING = [
  ['refined wheat flour', 'Refined Flour (Maida)', 'Stripped of fiber; digests rapidly.'],
  ['maida', 'Refined Flour (Maida)', 'Highly refined starch low in fiber.'],
  ['palm oil', 'Palm Oil', 'High in saturated palmitic fat.'],
  ['palmolein', 'Palmolein Oil', 'Refined palm oil high in saturated fat.'],
  ['sugar', 'Added Sugar', 'Increases free-sugar calories.'],
  ['maltodextrin', 'Maltodextrin', 'High-glycemic processed starch.'],
  ['caramel color', 'Caramel Color', 'Added synthetic coloring agent.'],
  ['iodized salt', 'Added Salt', 'Increases sodium intake.'],
  ['salt', 'Added Salt', 'Increases sodium intake.'],
];

const BAD_ING = [
  ['high fructose corn syrup', 'High-Fructose Corn Syrup', 'Concentrated industrial free sugar.'],
  ['hfcs', 'High-Fructose Corn Syrup', 'Concentrated industrial sweetener.'],
  ['corn syrup', 'Corn Syrup', 'Refined liquid sugar syrup.'],
  ['partially hydrogenated', 'Partially Hydrogenated Oil', 'Source of harmful trans fats.'],
  ['aspartame', 'Aspartame', 'Artificial sweetener (E951).'],
  ['sucralose', 'Sucralose', 'Artificial sweetener (E955).'],
  ['sodium benzoate', 'Sodium Benzoate (E211)', 'Synthetic preservative.'],
  ['tbhq', 'TBHQ (E319)', 'Synthetic antioxidant preservative.'],
  ['monosodium glutamate', 'MSG (E621)', 'Synthetic flavor enhancer.'],
  ['e621', 'MSG (E621)', 'Flavor enhancer additive.'],
];

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function clip(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function round1(val) {
  return Math.round(val * 10) / 10;
}

function loadFoodCatalog() {
  try {
    const filePath = path.resolve(process.cwd(), 'extension/food_catalog.json');
    const raw = readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
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

function scoreNutrition(foodName, n) {
  const kcal = Math.max(Number(n.calories) || 0, 1);
  const sugars = Math.max(Number(n.sugars) || 0, 0);
  const fat = Math.max(Number(n.fat) || 0, 0);
  const protein = Math.max(Number(n.protein) || 0, 0);
  const sodium_mg = Math.max(Number(n.sodium_mg) || 0, 0);

  const sugar_kcal_pct = clip(((sugars * 4) / kcal) * 100, 0, 100);
  const fat_kcal_pct = clip(((fat * 9) / kcal) * 100, 0, 100);
  const protein_kcal_pct = clip(((protein * 4) / kcal) * 100, 0, 100);
  const sodium_per_100kcal = clip((sodium_mg / kcal) * 100, 0, 5000);

  const lower = (foodName || '').toLowerCase();
  const hasNutSeed = /\b(almonds?|badam|walnuts?|akhrot|pistachios?|pista|cashews?|kaju|peanuts?|chia|flax(?:seeds?)?|mixed nuts?|dry\s*fruits?|dryfruits?|panchmewa|trail mix|nut\s*mix|makhana|olive oil)\b/i.test(lower);
  const hasJunk = /\b(chocolate|candy|bar|cookie|biscuit|cake|pastry|ice cream|fried|chips|namkeen|bhujia|caramel|syrup|salted|masala|butter|nutella|sauce)\b/i.test(lower);
  const wholeNut = hasNutSeed && !hasJunk && sodium_mg <= 180 && sugars <= 30;

  const hasBerryFruit = /\b(blueberr(?:y|ies)|strawberr(?:y|ies)|raspberr(?:y|ies)|blackberr(?:y|ies)|cranberr(?:y|ies)|berr(?:y|ies)|avocados?|apples?|oranges?|pears?|guavas?|kiwis?|papayas?|pomegranates?|watermelon|fresh fruit)\b/i.test(lower);
  const hasFruitJunk = /\b(dried|candied|chocolate|candy|cookie|biscuit|cake|muffin|pastry|pie|jam|jelly|marmalade|juice|nectar|sharbat|squash|syrup|soda|ice cream|yogurt|smoothie)\b/i.test(lower);
  const wholeFruitBerry = !wholeNut && hasBerryFruit && !hasFruitJunk && sodium_mg <= 45 && sugars <= 16 && (fat <= 5 || /\bavocado\b/i.test(lower));

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
    nutrient_flags: [
      {
        nutrient: 'Sugar',
        value_display: `${round1(sugars)} g`,
        status: wholeNut || wholeFruitBerry ? (sugars > 40 ? 'moderate' : 'good') : sugar_kcal_pct > 25 || sugars > 20 ? 'high' : sugar_kcal_pct > 10 || sugars > 10 ? 'moderate' : 'good',
        note: wholeFruitBerry ? `${round1(sugar_kcal_pct)}% of kcal (natural intrinsic fruit sugar)` : `${round1(sugar_kcal_pct)}% of calories`,
      },
      {
        nutrient: 'Total Fat',
        value_display: `${round1(fat)} g`,
        status: wholeNut || wholeFruitBerry ? 'good' : fat_kcal_pct > 45 ? 'high' : fat_kcal_pct > 30 ? 'moderate' : 'good',
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
    ],
    explanation,
    cart_alert: {
      level,
      title: verdictWord === 'Good' ? 'Good Choice Added' : verdictWord === 'Moderate' ? 'Moderation Recommended' : 'Warning: Not Good Choice',
      message: explanation,
    },
    model_used: 'WHO/FDA Nutrient Engine',
  };
}

function scanIngredients(productName, text, nutritionAnalysis) {
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

  const GENERAL_FOOD_RE = /\b(ingredients?|water|milk|cream|butter|cheese|yogurt|curd|whey|sugar|syrup|honey|salt|sodium|flour|wheat|maida|oats|rice|corn|starch|fiber|fibre|protein|fat|calories|energy|oil|palm|sunflower|olive|coconut|almond|walnut|cashew|pistachio|peanut|chia|flax|blueberry|blueberries|strawberry|strawberries|berry|berries|avocado|apple|banana|fruit|vegetable|tomato|potato|onion|garlic|cocoa|chocolate|vanilla|spice|herbs|vinegar|yeast|lecithin|emulsifier|preservative|flavor|flavour|sweetener|caffeine|allergen|contains|nutrition)\b/gi;
  const vocabHits = (text.match(GENERAL_FOOD_RE) || []).length;
  const plausibleWords = (sourceText.match(/[a-zA-Z]{3,}/g) || []).filter((w) => /[aeiouy]/i.test(w));
  if (!nutritionAnalysis && findings.length === 0 && (vocabHits < 2 || plausibleWords.length < 2)) {
    return null;
  }
  if (findings.length === 0 && parsedIngredients.length < 1 && !nutritionAnalysis) return null;

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

function lookupStapleOrCatalog(title, catalog) {
  const norm = (title || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
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

  const qTokens = norm.split(' ').filter((t) => t.length > 1);
  if (!qTokens.length || !catalog.length) return null;

  let bestRow = null;
  let bestScore = 0;
  for (const row of catalog) {
    const cand = String(row[0] || '').toLowerCase();
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
        calories: Number(bestRow[1]) || 0,
        sugars: Number(bestRow[2]) || 0,
        fat: Number(bestRow[3]) || 0,
        protein: Number(bestRow[4]) || 0,
        sodium_mg: Number(bestRow[5]) || 0,
      },
    };
  }
  return null;
}

async function lookupOpenFoodFacts(title) {
  const cleanQuery = (title || '')
    .replace(/\b\d+(?:\.\d+)?\s*(?:g|gm|gms|kg|ml|l|ltr|oz|lb|pcs|ct)\b/gi, ' ')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .trim()
    .split(/\s+/)
    .slice(0, 6)
    .join(' ');
  if (!cleanQuery) return null;
  const queryTokens = cleanQuery.toLowerCase().split(/\s+/).filter((t) => t.length >= 3);
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 2200);
    const res = await fetch(
      `https://search.openfoodfacts.org/search?q=${encodeURIComponent(cleanQuery)}&page_size=6&fields=product_name,nutriments,ingredients_text,image_front_small_url,image_front_url,image_url`,
      { signal: ctrl.signal }
    );
    clearTimeout(t);
    if (!res.ok) return null;
    const data = await res.json();
    let bestHit = null;
    let bestHitsCount = 0;
    for (const p of data?.hits || []) {
      const n = p?.nutriments;
      const kcal = n?.['energy-kcal_100g'] ?? n?.['energy-kcal_serving'] ?? n?.['energy-kcal'];
      if (!p?.product_name || kcal == null) continue;
      const nameLower = String(p.product_name).toLowerCase();
      const overlap = queryTokens.filter((tok) => nameLower.includes(tok)).length;
      if (queryTokens.length > 0 && overlap === 0) continue;
      if (overlap > bestHitsCount) {
        bestHitsCount = overlap;
        bestHit = p;
      }
    }
    if (bestHit) {
      const p = bestHit;
      const n = p.nutriments;
      const kcal = n['energy-kcal_100g'] ?? n['energy-kcal_serving'] ?? n['energy-kcal'];
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
  } catch {
    // ignore timeout/network
  }
  return null;
}

export function createApiApp() {
  const catalog = loadFoodCatalog();

  void connectMongoDB();

  const app = express();
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-User-Id');
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  });
  app.use(express.json({ limit: '25mb' }));

  app.get('/api/health', async (_req, res) => {
    await connectMongoDB();
    res.json({
      status: 'ok',
      engine: 'node-express',
      mongodb: getMongoStatus(),
    });
  });

  app.post('/api/auth/register', async (req, res) => {
    try {
      const result = await registerUser(req.body || {});
      res.status(result.status || (result.ok ? 201 : 400)).json({
        ok: result.ok,
        ...(result.user ? { user: result.user } : {}),
        ...(result.storage ? { storage: result.storage } : {}),
        ...(result.error ? { error: result.error } : {}),
      });
    } catch (err) {
      res.status(500).json({
        ok: false,
        error: err instanceof Error ? err.message : 'Unable to register user.',
      });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const result = await loginUser(req.body || {});
      res.status(result.status || (result.ok ? 200 : 401)).json({
        ok: result.ok,
        ...(result.user ? { user: result.user } : {}),
        ...(result.storage ? { storage: result.storage } : {}),
        ...(result.reason ? { reason: result.reason } : {}),
        ...(result.error ? { error: result.error } : {}),
      });
    } catch (err) {
      res.status(500).json({
        ok: false,
        error: err instanceof Error ? err.message : 'Unable to sign in.',
      });
    }
  });

  app.post('/api/auth/sync', async (req, res) => {
    try {
      const result = await syncOrUpsertUser(req.body || {});
      res.status(result.status || (result.ok ? 200 : 400)).json({
        ok: result.ok,
        ...(result.user ? { user: result.user } : {}),
        ...(result.storage ? { storage: result.storage } : {}),
        ...(result.migratedFromId ? { migratedFromId: result.migratedFromId } : {}),
        ...(result.error ? { error: result.error } : {}),
      });
    } catch (err) {
      res.status(500).json({
        ok: false,
        error: err instanceof Error ? err.message : 'Unable to sync user account.',
      });
    }
  });

  app.get('/api/auth/me/:id', async (req, res) => {
    try {
      const found = await getUserById(req.params.id);
      if (!found) {
        res.status(404).json({ ok: false, error: 'User not found.' });
        return;
      }
      res.json({ ok: true, user: found.user, storage: found.storage });
    } catch (err) {
      res.status(500).json({
        ok: false,
        error: err instanceof Error ? err.message : 'Unable to load user.',
      });
    }
  });

  app.put('/api/users/:id/profile', async (req, res) => {
    try {
      const result = await updateUserProfile(req.params.id, req.body || {});
      res.status(result.status || (result.ok ? 200 : 400)).json({
        ok: result.ok,
        ...(result.user ? { user: result.user } : {}),
        ...(result.storage ? { storage: result.storage } : {}),
        ...(result.migratedFromId ? { migratedFromId: result.migratedFromId } : {}),
        ...(result.error ? { error: result.error } : {}),
      });
    } catch (err) {
      res.status(500).json({
        ok: false,
        error: err instanceof Error ? err.message : 'Unable to update profile.',
      });
    }
  });

  const getRequestUserId = (req, payload = {}) => {
    const raw =
      payload?.user_id ||
      payload?.userId ||
      req.query?.userId ||
      req.query?.user_id ||
      req.headers['x-user-id'] ||
      '';
    return String(raw).trim();
  };

  function inferDefaultIngredients(title) {
    const lower = (title || '').toLowerCase();
    if (/\b(rolled oats|oats|oatmeal)\b/.test(lower)) return '100% Wholegrain Rolled Oats';
    if (/\b(brown rice)\b/.test(lower)) return '100% Wholegrain Brown Rice';
    if (/\b(walnut|walnuts|akhrot)\b/.test(lower)) return '100% Whole Unsalted Walnuts';
    if (/\b(almond|almonds|badam)\b/.test(lower)) return '100% Roasted / Natural California Almonds';
    if (/\b(blueberry|blueberries)\b/.test(lower)) return '100% Fresh Whole Blueberries';
    if (/\b(strawberry|strawberries|raspberry|raspberries|blackberry|blackberries|berries|berry)\b/.test(lower)) return '100% Fresh Whole Berries';
    if (/\b(avocado|avocados)\b/.test(lower)) return '100% Fresh Whole Avocado';
    if (/\b(mixed dry fruits|dry fruits|trail mix|nut mix)\b/.test(lower)) return 'Whole almonds, cashews, walnuts, raisins, pistachios';
    if (/\b(cashew|pistachio|peanut)\b/.test(lower)) return 'Whole Tree Nuts / Peanuts';
    return null;
  }

  async function buildAnalyzedCartEvent(payload, { existingEvent = null, skipGenericFallback = false } = {}) {
    const title = String(payload.product_title || existingEvent?.product_title || '').trim() || 'Food Item';
    const platform = inferPlatformName(
      payload.product_url ?? existingEvent?.product_url,
      payload.source_platform ?? existingEvent?.source_platform
    );
    const ingredientsInput =
      payload.ingredients_text !== undefined
        ? String(payload.ingredients_text || '').trim()
        : String(existingEvent?.ingredients_text || '').trim();
    const nutritionTextInput = String(payload.nutrition_text || '').trim();
    const combinedText = [ingredientsInput, nutritionTextInput].filter(Boolean).join('\n');

    const hasExplicitNumbers =
      payload.calories != null &&
      payload.sugars != null &&
      payload.fat != null &&
      payload.protein != null &&
      payload.sodium_mg != null;

    let nutrition = hasExplicitNumbers
      ? {
          calories: Number(payload.calories),
          sugars: Number(payload.sugars),
          fat: Number(payload.fat),
          protein: Number(payload.protein),
          sodium_mg: Number(payload.sodium_mg),
        }
      : parseNutritionText(combinedText);

    let nutritionSource = hasExplicitNumbers
      ? 'Back of Packet (Verified)'
      : nutrition
      ? payload.source === 'packet_back_scan'
        ? 'Back of Packet (Scanned)'
        : `${platform} Page Nutrition Facts`
      : '';
    let matchedFood = null;
    let ingredientsText = ingredientsInput;
    let imageUrl = String(payload.image_url ?? existingEvent?.image_url ?? '').trim();
    let resolvedSource = payload.source || existingEvent?.source || 'store_browser_extension';

    if (
      !nutrition &&
      !hasExplicitNumbers &&
      !skipGenericFallback &&
      Array.isArray(payload.gallery_images) &&
      payload.gallery_images.length > 0
    ) {
      const galleryOcr = await scanGalleryImagesForPacket(payload.gallery_images, {
        existingIngredients: ingredientsText,
      });
      if (galleryOcr?.nutrition) {
        nutrition = galleryOcr.nutrition;
        nutritionSource = 'Back of Packet Image (Auto-Scanned)';
        resolvedSource = 'packet_gallery_ocr';
      }
      if (!ingredientsText && galleryOcr?.ingredientsText) {
        ingredientsText = galleryOcr.ingredientsText;
      }
    }

    if (!skipGenericFallback && (!nutrition || !imageUrl || !ingredientsText)) {
      const staple = lookupStapleOrCatalog(title, catalog);
      const isWholeStaple =
        staple?.source === 'Grocery & Dish Profile' &&
        (/\b(walnuts?|akhrot|almonds?|badam|blueberr(?:y|ies)|strawberr(?:y|ies)|raspberr(?:y|ies)|blackberr(?:y|ies)|berr(?:y|ies)|avocados?|rolled oats|oats|basmati rice|brown rice)\b/i.test(title) &&
          !/\b(chocolate|candy|cookie|biscuit|cake|muffin|jam|jelly|juice|syrup|salted|masala|butter|chips|dried)\b/i.test(title));
      const off = isWholeStaple ? null : await lookupOpenFoodFacts(title);

      if (!nutrition) {
        if (isWholeStaple && staple) {
          nutrition = staple.nutrition;
          nutritionSource = `${staple.source} (Estimated)`;
          matchedFood = staple.matched_food;
        } else if (off) {
          nutrition = off.nutrition;
          nutritionSource = `${off.source} (Estimated)`;
          matchedFood = off.matched_food;
        } else if (staple) {
          nutrition = staple.nutrition;
          nutritionSource = `${staple.source} (Estimated)`;
          matchedFood = staple.matched_food;
        }
      }
      if (!ingredientsText) {
        if (off?.ingredients_text && !isWholeStaple) {
          ingredientsText = off.ingredients_text;
        } else if (staple) {
          ingredientsText = inferDefaultIngredients(title) || '';
        }
      }
      if (!imageUrl && off?.image_url) {
        imageUrl = off.image_url;
      }
    }

    if (!nutrition && existingEvent?.analysis?.nutrition && skipGenericFallback) {
      nutrition = existingEvent.analysis.nutrition;
      nutritionSource = existingEvent.nutrition_source || 'Back of Packet (Verified)';
    }

    const baseNutrition = nutrition || { calories: 150, sugars: 0, fat: 0, protein: 0, sodium_mg: 0 };
    const analysis = nutrition ? scoreNutrition(title, baseNutrition) : null;
    const ingredientScan = ingredientsText ? scanIngredients(title, ingredientsText, analysis) : null;
    const eventId =
      existingEvent?.event_id ||
      `api-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

    if (!analysis && !ingredientScan) {
      return {
        event_id: eventId,
        timestamp: existingEvent?.timestamp || new Date().toISOString(),
        source: resolvedSource,
        source_platform: platform,
        status: 'needs_nutrition',
        product_title: title,
        product_url: payload.product_url ?? existingEvent?.product_url ?? null,
        image_url: imageUrl || null,
        nutrition_source: 'Nutrition Label Not Found on Page',
        matched_food: null,
        message: `Captured "${title}" from ${platform}. Enter back-of-packet label numbers or scan the packet.`,
        analysis: null,
        ingredients_text: ingredientsText || null,
        ingredient_scan: null,
      };
    }

    const finalAnalysis = analysis || scoreNutrition(title, baseNutrition);
    if (ingredientScan && !analysis) {
      nutritionSource = `${platform} Ingredients Scan`;
    } else if (ingredientScan && analysis && !nutritionSource.includes('Ingredients Scan')) {
      nutritionSource = `${nutritionSource} + Ingredients Scan`;
    }

    return {
      event_id: eventId,
      timestamp: existingEvent?.timestamp || new Date().toISOString(),
      source: resolvedSource,
      source_platform: platform,
      status: 'analyzed',
      product_title: title,
      product_url: payload.product_url ?? existingEvent?.product_url ?? null,
      image_url: imageUrl || null,
      nutrition_source: nutritionSource || 'Analyzed',
      matched_food: matchedFood,
      message: ingredientScan
        ? `${finalAnalysis.explanation} Scanned ingredients (${ingredientScan.verdict}).`
        : finalAnalysis.explanation,
      analysis: finalAnalysis,
      ingredients_text: ingredientsText || null,
      ingredient_scan: ingredientScan,
    };
  }

  app.get('/api/amazon/cart-events', async (req, res) => {
    try {
      const userId = getRequestUserId(req);
      if (!userId) {
        res.json([]);
        return;
      }
      const events = await listCartEventsForUser(userId);
      res.json(events);
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Unable to load cart.' });
    }
  });

  app.delete('/api/amazon/cart-events', async (req, res) => {
    try {
      const userId = getRequestUserId(req);
      if (userId) {
        await clearCartEventsForUser(userId);
      }
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Unable to clear cart.' });
    }
  });

  app.delete('/api/amazon/cart-events/:id', async (req, res) => {
    try {
      const userId = getRequestUserId(req);
      if (userId) {
        await deleteCartEventForUser(userId, req.params.id);
      }
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Unable to delete cart item.' });
    }
  });

  app.post('/api/amazon/add-to-cart', async (req, res) => {
    try {
      const payload = req.body || {};
      const userId = getRequestUserId(req, payload);
      const ev = await buildAnalyzedCartEvent(payload);

      // Feature 1: Check active prescription conditions & dietary rules
      let prescriptionAlerts = {
        hasWarnings: false,
        warnings: [],
        alternatives: [],
        activeConditionCount: 0,
        disclaimer: PRESCRIPTION_DISCLAIMER,
      };
      if (userId) {
        const activeProfile = await getActivePrescriptionSummaryForUser(userId);
        if (
          activeProfile.activeConditions.length > 0 ||
          activeProfile.dietaryRestrictions.length > 0
        ) {
          prescriptionAlerts = evaluateProductAgainstPrescriptions({
            productTitle: ev.product_title,
            ingredientsText: ev.ingredients_text || '',
            nutrition: ev.analysis?.nutrition || null,
            activeConditions: activeProfile.activeConditions,
            dietaryRestrictions: activeProfile.dietaryRestrictions,
          });
        }
      }

      // Feature 2: Instant-consumption filter for Daily Food & Nutrition Tracker
      const intakeCheck = classifyInstantConsumable({
        productTitle: ev.product_title,
        platform: ev.source_platform,
        productUrl: ev.product_url || '',
        source: ev.source || '',
      });

      let queuedFoodLog = null;
      if (userId && intakeCheck.isInstantConsumable && ev.analysis?.nutrition) {
        const existingLog = await getFoodLogBySourceEvent(userId, ev.event_id);
        if (!existingLog) {
          const now = new Date();
          const consumedDate = now.toISOString().slice(0, 10);
          const consumedTime = now.toTimeString().slice(0, 5);
          const hour = now.getHours();
          const mealSlot =
            hour < 11 ? 'breakfast' : hour < 16 ? 'lunch' : hour < 19 ? 'snack' : 'dinner';
          const baseNutrients = buildFullNutrientProfile({
            productTitle: ev.product_title,
            baseNutrition: ev.analysis.nutrition,
            ingredientsText: ev.ingredients_text || '',
            portionMultiplier: 1,
          });
          queuedFoodLog = await saveFoodLogForUser(userId, {
            log_id: `log-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
            sourceEventId: ev.event_id,
            foodName: ev.product_title,
            platform: intakeCheck.normalizedPlatform,
            isInstantConsumable: true,
            mealSlot,
            consumedDate,
            consumedTime,
            consumptionStatus: 'pending_confirmation',
            portionMultiplier: 1,
            quantityLabel: '1 serving (100g)',
            baseNutrients,
            nutrients: baseNutrients,
            ingredientsText: ev.ingredients_text || '',
            imageUrl: ev.image_url || null,
            createdAtIso: now.toISOString(),
          });
        }
      }

      const enrichedEvent = {
        ...ev,
        prescription_alerts: prescriptionAlerts,
        tracker_eligibility: intakeCheck,
        queued_food_log_id: queuedFoodLog?.log_id || null,
      };

      const saved = await saveCartEventForUser(userId, enrichedEvent);
      res.json({
        ...saved,
        prescription_alerts: prescriptionAlerts,
        tracker_eligibility: intakeCheck,
        queued_food_log_id: queuedFoodLog?.log_id || null,
      });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Unable to add item.' });
    }
  });

  app.put('/api/amazon/cart-events/:id', async (req, res) => {
    try {
      const payload = req.body || {};
      const userId = getRequestUserId(req, payload);
      if (!userId) {
        res.status(400).json({ ok: false, error: 'Missing userId for cart update.' });
        return;
      }
      const existingEvent = await getCartEventForUser(userId, req.params.id);
      const ev = await buildAnalyzedCartEvent(
        {
          ...payload,
          source: payload.source || 'packet_back_verified',
        },
        {
          existingEvent: existingEvent || { event_id: req.params.id },
          skipGenericFallback: true,
        }
      );
      const saved = await saveCartEventForUser(userId, ev);
      res.json(saved);
    } catch (err) {
      res.status(500).json({
        ok: false,
        error: err instanceof Error ? err.message : 'Unable to update cart item.',
      });
    }
  });

  app.post('/api/scan-packet', (req, res) => {
    const body = req.body || {};
    const productName = String(body.product_name || 'Scanned Food Packet').trim() || 'Scanned Food Packet';
    const rawText = String(body.raw_text || '').trim();
    if (!rawText || rawText.length < 6) {
      res.status(422).json({ detail: 'No readable food ingredients or nutrition facts detected. Point the camera clearly at the Ingredients or Nutrition Facts box.' });
      return;
    }
    const nutrition = parseNutritionText(rawText);
    const nutritionAnalysis = nutrition ? scoreNutrition(productName, nutrition) : null;
    const scan = scanIngredients(productName, rawText, nutritionAnalysis);
    if (!scan && !nutritionAnalysis) {
      res.status(422).json({ detail: 'No readable food ingredients or nutrition facts detected. Ensure the camera is aimed at the packet Ingredients box rather than a face or background object.' });
      return;
    }
    if (scan) {
      res.json(scan);
      return;
    }
    const verdict =
      nutritionAnalysis.classification === 'Healthy'
        ? 'Good'
        : nutritionAnalysis.classification === 'Moderate'
        ? 'Moderate'
        : 'Not Good';
    res.json({
      product_name: productName,
      verdict,
      score: nutritionAnalysis.health_score,
      nutrition_found: true,
      ingredients_count: 0,
      parsed_ingredients: [],
      ingredient_findings: [],
      reasons: [
        {
          type: verdict === 'Good' ? 'good' : verdict === 'Moderate' ? 'warning' : 'danger',
          text: nutritionAnalysis.explanation,
        },
      ],
      summary: nutritionAnalysis.explanation,
      nutrition_analysis: nutritionAnalysis,
    });
  });

  /* ==================== Feature 1: Smart Prescription Health Alerts ==================== */
  app.get('/api/prescriptions', async (req, res) => {
    try {
      const userId = getRequestUserId(req);
      if (!userId) {
        res.json({ ok: true, prescriptions: [], activeProfile: { activeConditions: [], expiredConditions: [], medicines: [], dietaryRestrictions: [], disclaimer: PRESCRIPTION_DISCLAIMER } });
        return;
      }
      const prescriptions = await listPrescriptionsForUser(userId);
      const activeProfile = await getActivePrescriptionSummaryForUser(userId);
      res.json({ ok: true, prescriptions, activeProfile });
    } catch (err) {
      res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'Unable to load prescriptions.' });
    }
  });

  app.get('/api/prescriptions/active', async (req, res) => {
    try {
      const userId = getRequestUserId(req);
      if (!userId) {
        res.json({ ok: true, activeConditions: [], expiredConditions: [], medicines: [], dietaryRestrictions: [], disclaimer: PRESCRIPTION_DISCLAIMER });
        return;
      }
      const summary = await getActivePrescriptionSummaryForUser(userId);
      res.json({ ok: true, ...summary });
    } catch (err) {
      res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'Unable to load active prescription profile.' });
    }
  });

  app.post('/api/prescriptions/extract', async (req, res) => {
    try {
      const body = req.body || {};
      const pages = Array.isArray(body.pages)
        ? body.pages
        : body.imageDataUrl
        ? [
            {
              pageNumber: 1,
              fileName: body.fileName || 'Prescription',
              dataUrl: body.imageDataUrl,
            },
          ]
        : [];
      const rawTextInput = String(body.rawText || '').trim();

      const extracted = await analyzePrescriptionDocument({
        pages,
        rawTextInput,
      });

      res.json({ ok: true, ...extracted });
    } catch (err) {
      if (err instanceof PrescriptionServiceError) {
        res.status(err.status).json({
          ok: false,
          code: err.code,
          error: err.message,
        });
        return;
      }
      res.status(500).json({
        ok: false,
        error:
          err instanceof Error
            ? err.message
            : 'Unable to extract prescription details.',
      });
    }
  });

  app.post('/api/prescriptions', async (req, res) => {
    try {
      const body = req.body || {};
      const userId = getRequestUserId(req, body);
      if (!userId) {
        res.status(400).json({ ok: false, error: 'Missing userId.' });
        return;
      }

      const rawText = String(body.rawOcrText || body.rawText || '');
      const prescriptionDate =
        body.prescriptionDate && /^\d{4}-\d{2}-\d{2}$/.test(body.prescriptionDate)
          ? body.prescriptionDate
          : new Date().toISOString().slice(0, 10);
      const baseMs = new Date(`${prescriptionDate}T00:00:00`).getTime() || Date.now();

      const rawConditions = Array.isArray(body.conditions) ? body.conditions : [];
      const conditions = rawConditions
        .filter((c) => c && String(c.name || '').trim())
        .map((c, idx) => {
          const name = String(c.name).trim();
          const meta = resolveCanonicalConditionMeta(name);
          const validDays = Math.min(
            365,
            Math.max(
              1,
              Number(c.validDays) || (c.category === 'chronic' ? 180 : meta.defaultValidDays || 7)
            )
          );
          const pDate = c.prescribedDate || prescriptionDate;
          const pMs = new Date(`${pDate}T00:00:00`).getTime() || baseMs;
          const expiresAt =
            c.expiresAt || new Date(pMs + validDays * 24 * 60 * 60 * 1000).toISOString();
          const confidence = ['high', 'medium', 'low'].includes(c.confidence)
            ? c.confidence
            : 'high';
          return {
            id: c.id || `cond-${Date.now().toString(36)}-${idx}`,
            name,
            canonicalKey: String(c.canonicalKey || meta.canonicalKey || name)
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '_'),
            category: c.category === 'chronic' ? 'chronic' : 'acute',
            validDays,
            prescribedDate: pDate,
            expiresAt,
            status:
              c.status === 'dismissed'
                ? 'dismissed'
                : Date.now() > new Date(expiresAt).getTime()
                ? 'expired'
                : 'active',
            confidence,
            needsVerification: Boolean(c.needsVerification),
            uncertaintyReason: String(c.uncertaintyReason || '').trim(),
            sourceSnippet: String(c.sourceSnippet || 'Verified by user before saving'),
          };
        });

      const medicines = (Array.isArray(body.medicines) ? body.medicines : [])
        .filter((m) => m && String(m.name || '').trim())
        .map((m) => ({
          name: String(m.name).trim(),
          dosage: String(m.dosage || '').trim(),
          frequency: String(m.frequency || '').trim(),
          duration: String(m.duration || '').trim(),
          confidence: ['high', 'medium', 'low'].includes(m.confidence) ? m.confidence : 'high',
          needsVerification: Boolean(m.needsVerification),
          uncertaintyReason: String(m.uncertaintyReason || '').trim(),
          note: String(m.note || '').trim(),
        }));

      const dietaryRestrictions = (
        Array.isArray(body.dietaryRestrictions) ? body.dietaryRestrictions : []
      )
        .map((d) => String(d || '').trim())
        .filter(Boolean);

      const dietaryRestrictionItems = Array.isArray(body.dietaryRestrictionItems)
        ? body.dietaryRestrictionItems
        : dietaryRestrictions.map((text) => ({
            text,
            confidence: 'high',
            needsVerification: false,
          }));

      const saved = await savePrescriptionForUser(userId, {
        prescription_id:
          body.prescription_id ||
          `rx-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        fileName: String(body.fileName || 'Doctor Prescription').trim(),
        fileType: ['pdf', 'jpg', 'png', 'manual'].includes(body.fileType)
          ? body.fileType
          : 'jpg',
        uploadedAt: new Date().toISOString(),
        patientName: String(body.patientName || '').trim(),
        patientNameConfidence: ['high', 'medium', 'low'].includes(body.patientNameConfidence)
          ? body.patientNameConfidence
          : 'medium',
        prescriptionDate,
        prescriptionDateConfidence: ['high', 'medium', 'low'].includes(
          body.prescriptionDateConfidence
        )
          ? body.prescriptionDateConfidence
          : 'medium',
        rawOcrText: rawText,
        ocrProvider: String(
          body.ocrProvider || 'google_cloud_vision_document_text + gemini_vision'
        ),
        ocrConfidence: typeof body.ocrConfidence === 'number' ? body.ocrConfidence : null,
        pagesCount: Math.max(1, Number(body.pagesCount) || 1),
        ocrPages: Array.isArray(body.ocrPages) ? body.ocrPages : [],
        handwritingQuality: ['clear', 'partially_unclear', 'unreadable'].includes(
          body.handwritingQuality
        )
          ? body.handwritingQuality
          : 'clear',
        overallConfidence: ['high', 'medium', 'low'].includes(body.overallConfidence)
          ? body.overallConfidence
          : 'high',
        doctorVerificationRecommended: Boolean(body.doctorVerificationRecommended),
        verifiedByUser: body.verifiedByUser !== false,
        imageQualityWarnings: Array.isArray(body.imageQualityWarnings)
          ? body.imageQualityWarnings
          : [],
        conditions,
        medicines,
        dietaryRestrictions,
        dietaryRestrictionItems,
        notes: String(body.notes || '').trim(),
      });

      const activeProfile = await getActivePrescriptionSummaryForUser(userId);
      res.status(201).json({ ok: true, prescription: saved, activeProfile });
    } catch (err) {
      res.status(500).json({
        ok: false,
        error: err instanceof Error ? err.message : 'Unable to save prescription.',
      });
    }
  });

  app.patch('/api/prescriptions/:id', async (req, res) => {
    try {
      const body = req.body || {};
      const userId = getRequestUserId(req, body);
      if (!userId) {
        res.status(400).json({ ok: false, error: 'Missing userId.' });
        return;
      }

      const list = await listPrescriptionsForUser(userId);
      const existing = list.find((p) => p.prescription_id === req.params.id);
      if (!existing) {
        res.status(404).json({ ok: false, error: 'Prescription not found.' });
        return;
      }

      let nextConditions = existing.conditions;
      if (body.conditionId && (body.status || body.validDays)) {
        nextConditions = existing.conditions.map((c) => {
          if (c.id !== body.conditionId) return c;
          const validDays = body.validDays ? Math.min(365, Math.max(1, Number(body.validDays))) : c.validDays;
          const baseMs = new Date(`${c.prescribedDate}T00:00:00`).getTime() || Date.now();
          const expiresAt = body.validDays
            ? new Date(baseMs + validDays * 24 * 60 * 60 * 1000).toISOString()
            : c.expiresAt;
          const nextStatus =
            body.status === 'dismissed'
              ? 'dismissed'
              : body.status === 'active'
              ? 'active'
              : Date.now() > new Date(expiresAt).getTime()
              ? 'expired'
              : 'active';
          return { ...c, validDays, expiresAt, status: nextStatus };
        });
      } else if (Array.isArray(body.conditions)) {
        nextConditions = body.conditions;
      }

      const updated = await updatePrescriptionForUser(userId, req.params.id, {
        ...body,
        conditions: nextConditions,
      });
      const activeProfile = await getActivePrescriptionSummaryForUser(userId);
      res.json({ ok: true, prescription: updated, activeProfile });
    } catch (err) {
      res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'Unable to update prescription.' });
    }
  });

  app.delete('/api/prescriptions/:id', async (req, res) => {
    try {
      const userId = getRequestUserId(req);
      if (!userId) {
        res.status(400).json({ ok: false, error: 'Missing userId.' });
        return;
      }
      await deletePrescriptionForUser(userId, req.params.id);
      const activeProfile = await getActivePrescriptionSummaryForUser(userId);
      res.json({ ok: true, activeProfile });
    } catch (err) {
      res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'Unable to delete prescription.' });
    }
  });

  app.post('/api/prescriptions/check-product', async (req, res) => {
    try {
      const body = req.body || {};
      const userId = getRequestUserId(req, body);
      if (!userId) {
        res.json({ ok: true, hasWarnings: false, warnings: [], alternatives: [], activeConditionCount: 0, disclaimer: PRESCRIPTION_DISCLAIMER });
        return;
      }
      const activeProfile = await getActivePrescriptionSummaryForUser(userId);
      const result = evaluateProductAgainstPrescriptions({
        productTitle: String(body.product_title || body.productTitle || ''),
        ingredientsText: String(body.ingredients_text || body.ingredientsText || ''),
        nutrition: body.nutrition || null,
        activeConditions: activeProfile.activeConditions,
        dietaryRestrictions: activeProfile.dietaryRestrictions,
      });
      res.json({ ok: true, ...result });
    } catch (err) {
      res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'Unable to evaluate product.' });
    }
  });

  /* ==================== Feature 2: Daily Food & Nutrition Tracker ==================== */
  app.get('/api/food-logs', async (req, res) => {
    try {
      const userId = getRequestUserId(req);
      const range = ['daily', 'weekly', 'monthly'].includes(String(req.query?.range))
        ? String(req.query.range)
        : 'daily';
      const targetDate = /^\d{4}-\d{2}-\d{2}$/.test(String(req.query?.date || ''))
        ? String(req.query.date)
        : new Date().toISOString().slice(0, 10);

      if (!userId) {
        const emptyReq = computePersonalizedRequirements(null, []);
        res.json({
          ok: true,
          logs: [],
          report: buildNutritionComparisonReport([], emptyReq, range, targetDate),
        });
        return;
      }

      const [logs, userFound, activeRx] = await Promise.all([
        listFoodLogsForUser(userId),
        getUserById(userId).catch(() => null),
        getActivePrescriptionSummaryForUser(userId).catch(() => ({ activeConditions: [] })),
      ]);

      const requirements = computePersonalizedRequirements(
        userFound?.user || null,
        activeRx?.activeConditions || []
      );
      const report = buildNutritionComparisonReport(logs, requirements, range, targetDate);

      res.json({ ok: true, logs, report });
    } catch (err) {
      res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'Unable to load food logs.' });
    }
  });

  app.post('/api/food-logs', async (req, res) => {
    try {
      const body = req.body || {};
      const userId = getRequestUserId(req, body);
      if (!userId) {
        res.status(400).json({ ok: false, error: 'Missing userId.' });
        return;
      }

      const foodName = String(body.foodName || body.product_title || '').trim();
      if (!foodName) {
        res.status(400).json({ ok: false, error: 'Food name is required.' });
        return;
      }

      const platform = String(body.platform || 'Manual').trim();
      const intakeCheck = classifyInstantConsumable({
        productTitle: foodName,
        platform,
        productUrl: body.productUrl || '',
        source: body.source || (platform === 'Manual' ? 'manual_entry' : ''),
      });

      if (!intakeCheck.isInstantConsumable) {
        res.status(422).json({
          ok: false,
          excluded: true,
          error: intakeCheck.reason || 'Non-consumable or regular delayed shipment excluded from Daily Food Tracker.',
        });
        return;
      }

      const portionMultiplier = Math.max(0.1, Math.min(20, Number(body.portionMultiplier) || 1));
      const baseInput = body.baseNutrients || body.nutrients || {
        calories: body.calories,
        protein_g: body.protein_g ?? body.protein,
        carbs_g: body.carbs_g,
        fat_g: body.fat_g ?? body.fat,
        fiber_g: body.fiber_g,
        sugar_g: body.sugar_g ?? body.sugars,
        sodium_mg: body.sodium_mg,
        potassium_mg: body.potassium_mg,
        calcium_mg: body.calcium_mg,
        iron_mg: body.iron_mg,
        vitamin_c_mg: body.vitamin_c_mg,
      };

      const baseNutrients = buildFullNutrientProfile({
        productTitle: foodName,
        baseNutrition: baseInput,
        ingredientsText: body.ingredientsText || '',
        portionMultiplier: 1,
      });

      const scaledNutrients = buildFullNutrientProfile({
        productTitle: foodName,
        baseNutrition: baseNutrients,
        ingredientsText: body.ingredientsText || '',
        portionMultiplier,
      });

      const now = new Date();
      const log = await saveFoodLogForUser(userId, {
        log_id: body.log_id || `log-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        sourceEventId: body.sourceEventId || null,
        foodName,
        platform: intakeCheck.normalizedPlatform,
        isInstantConsumable: true,
        mealSlot: ['breakfast', 'lunch', 'snack', 'dinner'].includes(body.mealSlot)
          ? body.mealSlot
          : 'lunch',
        consumedDate: /^\d{4}-\d{2}-\d{2}$/.test(String(body.consumedDate || ''))
          ? body.consumedDate
          : now.toISOString().slice(0, 10),
        consumedTime: /^\d{2}:\d{2}$/.test(String(body.consumedTime || ''))
          ? body.consumedTime
          : now.toTimeString().slice(0, 5),
        consumptionStatus: ['pending_confirmation', 'consumed', 'skipped'].includes(
          body.consumptionStatus
        )
          ? body.consumptionStatus
          : 'consumed',
        portionMultiplier,
        quantityLabel: String(body.quantityLabel || `${portionMultiplier}x serving`).trim(),
        baseNutrients,
        nutrients: scaledNutrients,
        ingredientsText: String(body.ingredientsText || '').trim(),
        imageUrl: body.imageUrl || null,
        createdAtIso: now.toISOString(),
      });

      res.status(201).json({ ok: true, log });
    } catch (err) {
      res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'Unable to save food log.' });
    }
  });

  app.patch('/api/food-logs/:id/confirm', async (req, res) => {
    try {
      const body = req.body || {};
      const userId = getRequestUserId(req, body);
      if (!userId) {
        res.status(400).json({ ok: false, error: 'Missing userId.' });
        return;
      }

      const existing = await getFoodLogById(userId, req.params.id);
      if (!existing) {
        res.status(404).json({ ok: false, error: 'Food log entry not found.' });
        return;
      }

      const consumptionStatus = body.consumptionStatus === 'skipped' ? 'skipped' : 'consumed';
      const portionMultiplier = Math.max(
        0.1,
        Math.min(20, Number(body.portionMultiplier ?? existing.portionMultiplier) || 1)
      );
      const base = existing.baseNutrients || existing.nutrients || {};
      const scaledNutrients = buildFullNutrientProfile({
        productTitle: existing.foodName,
        baseNutrition: base,
        ingredientsText: existing.ingredientsText || '',
        portionMultiplier,
      });

      const updated = await saveFoodLogForUser(userId, {
        ...existing,
        consumptionStatus,
        portionMultiplier,
        quantityLabel: String(
          body.quantityLabel || `${portionMultiplier}x serving`
        ).trim(),
        mealSlot: ['breakfast', 'lunch', 'snack', 'dinner'].includes(body.mealSlot)
          ? body.mealSlot
          : existing.mealSlot,
        consumedDate: /^\d{4}-\d{2}-\d{2}$/.test(String(body.consumedDate || ''))
          ? body.consumedDate
          : existing.consumedDate,
        consumedTime: /^\d{2}:\d{2}$/.test(String(body.consumedTime || ''))
          ? body.consumedTime
          : existing.consumedTime,
        nutrients: scaledNutrients,
      });

      res.json({ ok: true, log: updated });
    } catch (err) {
      res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'Unable to confirm food consumption.' });
    }
  });

  app.delete('/api/food-logs/:id', async (req, res) => {
    try {
      const userId = getRequestUserId(req);
      if (!userId) {
        res.status(400).json({ ok: false, error: 'Missing userId.' });
        return;
      }
      await deleteFoodLogForUser(userId, req.params.id);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'Unable to delete food log.' });
    }
  });

  return app;
}

export function startNodeApiFallback({ host = '127.0.0.1', port = 8001 } = {}) {
  const app = createApiApp();
  const server = app.listen(port, host, () => {
    console.log(`[NutriCheck] Node API server listening on http://${host}:${port}`);
  });
  return server;
}
