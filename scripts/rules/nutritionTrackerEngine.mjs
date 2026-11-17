// Daily Food & Nutrition Tracker Engine
// Handles instant-consumption order filtering, full macro/micronutrient computation,
// personalized targets, deficiency/excess detection, and daily/weekly/monthly reports.

const NON_CONSUMABLE_RE =
  /\b(headphones?|earbuds?|earphones?|airpods?|bluetooth|speaker|laptop|macbook|tablet|ipad|smartphone|iphone|android phone|charger|usb cable|adapter|power bank|keyboard|mouse|monitor|webcam|tripod|smartwatch|watch|t-?shirt|shirt|jeans|trousers|kurta|saree|dress|jacket|hoodie|shoes|sneakers|sandals|slippers|socks|backpack|handbag|wallet|luggage|suitcase|bedsheet|pillow|blanket|curtain|mattress|towel|cookware|pressure cooker|frying pan|kettle|mixer grinder|toaster|microwave|refrigerator|washing machine|vacuum|iron box|detergent|laundry|dishwash|phenyl|bleach|cleaner|mop|broom|toilet paper|tissue|diaper|pampers|napkin|sanitary|shampoo|conditioner|body wash|face wash|serum|moisturizer|sunscreen|lipstick|perfume|deodorant|toothpaste|toothbrush|razor|trimmer|notebook|pen|pencil|diary|novel|book|toy|puzzle|lego|dumbbell|yoga mat|bulb|led light|extension board)\b/i;

const EDIBLE_OR_GROCERY_RE =
  /\b(biryani|dosa|idli|sambar|pulao|curry|paneer|chicken|mutton|fish|egg|dal|roti|naan|paratha|pizza|burger|fries|momos|sandwich|wrap|roll|salad|soup|khichdi|thali|noodles|pasta|rice|oats|atta|flour|bread|biscuit|cookie|cake|pastry|brownie|chocolate|candy|ice cream|kulfi|chips|namkeen|bhujia|samosa|pakora|dhokla|upma|poha|milk|yogurt|curd|dahi|butter|ghee|cheese|oil|peanut butter|almond|walnut|cashew|pistachio|dry fruit|dates|raisin|berry|blueberry|strawberry|apple|banana|orange|mango|grape|avocado|vegetable|tomato|potato|onion|spinach|broccoli|tea|coffee|juice|soda|cola|soft drink|coconut water|honey|sugar|jaggery|jam|ketchup|pickle|meal|breakfast|lunch|dinner|snack|shake|smoothie|lassi|buttermilk)\b/i;

export function classifyInstantConsumable({
  productTitle = '',
  platform = '',
  productUrl = '',
  source = '',
}) {
  const title = String(productTitle || '').trim();
  const plat = String(platform || '').trim();
  const platLower = plat.toLowerCase();
  const urlLower = String(productUrl || '').toLowerCase();
  const srcLower = String(source || '').toLowerCase();

  // Manual food entry is always allowed
  if (platLower === 'manual' || srcLower === 'manual_entry') {
    return { isInstantConsumable: true, normalizedPlatform: 'Manual', reason: null };
  }

  // Explicitly exclude non-consumable / household / electronics / apparel goods on any platform
  if (NON_CONSUMABLE_RE.test(title) && !EDIBLE_OR_GROCERY_RE.test(title)) {
    return {
      isInstantConsumable: false,
      normalizedPlatform: plat || 'Online Store',
      reason: 'Excluded: non-consumable household, electronics, apparel, or personal-care item.',
    };
  }

  // Amazon Fresh vs regular Amazon
  const isAmazonFresh =
    platLower.includes('amazon fresh') ||
    platLower.includes('fresh') ||
    /amazon\.[^/]+\/(?:fresh|alm|afx|wholefoods)/i.test(urlLower) ||
    /\bamazon\s+fresh\b/i.test(`${plat} ${srcLower}`);

  if (platLower === 'amazon' && !isAmazonFresh) {
    return {
      isInstantConsumable: false,
      normalizedPlatform: 'Amazon',
      reason:
        'Excluded: regular Amazon purchases and delayed multi-day shipments are not tracked in Daily Food Tracker (use Amazon Fresh, Blinkit, Swiggy, or Zomato).',
    };
  }

  if (platLower === 'flipkart' && !platLower.includes('minutes') && !platLower.includes('grocery')) {
    return {
      isInstantConsumable: false,
      normalizedPlatform: 'Flipkart',
      reason:
        'Excluded: standard delayed e-commerce parcels are excluded; only instant food & fresh groceries are tracked.',
    };
  }

  if (
    platLower.includes('zomato') ||
    platLower.includes('swiggy') ||
    platLower.includes('blinkit') ||
    isAmazonFresh ||
    platLower.includes('zepto') ||
    platLower.includes('bigbasket')
  ) {
    const normalizedPlatform = platLower.includes('zomato')
      ? 'Zomato'
      : platLower.includes('instamart')
      ? 'Swiggy Instamart'
      : platLower.includes('swiggy')
      ? 'Swiggy'
      : platLower.includes('blinkit')
      ? 'Blinkit'
      : isAmazonFresh
      ? 'Amazon Fresh'
      : plat;

    return {
      isInstantConsumable: true,
      normalizedPlatform,
      reason: null,
    };
  }

  return {
    isInstantConsumable: false,
    normalizedPlatform: plat || 'Online Store',
    reason: 'Excluded: only instant food & fresh grocery platforms (Zomato, Swiggy, Blinkit, Amazon Fresh) are auto-tracked.',
  };
}

function round1(v) {
  return Math.round((Number(v) || 0) * 10) / 10;
}

function round0(v) {
  return Math.round(Number(v) || 0);
}

export function buildFullNutrientProfile({
  productTitle = '',
  baseNutrition = {},
  ingredientsText = '',
  portionMultiplier = 1,
}) {
  const portion = Math.max(0.1, Math.min(20, Number(portionMultiplier) || 1));
  const titleLower = `${productTitle} ${ingredientsText}`.toLowerCase();

  const calories = Math.max(0, Number(baseNutrition.calories) || 0);
  const protein_g = Math.max(0, Number(baseNutrition.protein ?? baseNutrition.protein_g) || 0);
  const fat_g = Math.max(0, Number(baseNutrition.fat ?? baseNutrition.fat_g) || 0);
  const sugar_g = Math.max(0, Number(baseNutrition.sugars ?? baseNutrition.sugar_g) || 0);
  const sodium_mg = Math.max(0, Number(baseNutrition.sodium_mg) || 0);

  let carbs_g =
    baseNutrition.carbs_g != null
      ? Math.max(0, Number(baseNutrition.carbs_g))
      : Math.max(sugar_g, round1(Math.max(0, (calories - protein_g * 4 - fat_g * 9) / 4)));

  // Infer dietary fiber & micronutrients from food type when explicit label fields are absent
  let fiber_g = baseNutrition.fiber_g != null ? Number(baseNutrition.fiber_g) : null;
  let potassium_mg = baseNutrition.potassium_mg != null ? Number(baseNutrition.potassium_mg) : null;
  let calcium_mg = baseNutrition.calcium_mg != null ? Number(baseNutrition.calcium_mg) : null;
  let iron_mg = baseNutrition.iron_mg != null ? Number(baseNutrition.iron_mg) : null;
  let vitamin_c_mg = baseNutrition.vitamin_c_mg != null ? Number(baseNutrition.vitamin_c_mg) : null;

  if (fiber_g == null) {
    if (/\b(oats|almond|walnut|chia|flax|dal|lentil|chickpea|rajma|quinoa)\b/i.test(titleLower)) fiber_g = 7.5;
    else if (/\b(berry|blueberr|strawberr|apple|orange|guava|banana|avocado|salad|spinach|broccoli|vegetable|idli|dosa|brown rice|whole wheat)\b/i.test(titleLower)) fiber_g = 3.8;
    else if (/\b(biryani|pulao|pizza|burger|bread|rice|sandwich|wrap|paratha)\b/i.test(titleLower)) fiber_g = 2.2;
    else if (/\b(soda|cola|juice|milk|yogurt|curd|paneer|egg|chicken|fish|ice cream|butter|ghee)\b/i.test(titleLower)) fiber_g = 0.2;
    else fiber_g = carbs_g > 15 ? 1.8 : 0.8;
  }

  if (potassium_mg == null) {
    if (/\b(banana|potato|spinach|avocado|coconut water|dal|lentil|almond|walnut|yogurt)\b/i.test(titleLower)) potassium_mg = 360;
    else if (/\b(milk|curd|fruit|berry|chicken|fish|oats|biryani|dosa|idli)\b/i.test(titleLower)) potassium_mg = 190;
    else potassium_mg = 95;
  }

  if (calcium_mg == null) {
    if (/\b(milk|yogurt|curd|dahi|paneer|cheese|ice cream|ragi|almond)\b/i.test(titleLower)) calcium_mg = 165;
    else if (/\b(spinach|broccoli|soya|tofu|oats|orange)\b/i.test(titleLower)) calcium_mg = 75;
    else calcium_mg = 28;
  }

  if (iron_mg == null) {
    if (/\b(spinach|dal|lentil|chickpea|soya|oats|dates|raisin|poha|rajma|chicken|egg|walnut|almond)\b/i.test(titleLower)) iron_mg = 2.6;
    else if (/\b(biryani|dosa|idli|bread|paratha|whole wheat)\b/i.test(titleLower)) iron_mg = 1.4;
    else iron_mg = 0.5;
  }

  if (vitamin_c_mg == null) {
    if (/\b(orange|guava|kiwi|strawberr|blueberr|berr|lemon|papaya|tomato|broccoli|spinach|salad|fruit)\b/i.test(titleLower)) vitamin_c_mg = 28;
    else if (/\b(potato|fries|sambar|vegetable|mango|apple|banana)\b/i.test(titleLower)) vitamin_c_mg = 8;
    else vitamin_c_mg = 1;
  }

  return {
    calories: round1(calories * portion),
    protein_g: round1(protein_g * portion),
    carbs_g: round1(carbs_g * portion),
    fat_g: round1(fat_g * portion),
    fiber_g: round1(fiber_g * portion),
    sugar_g: round1(sugar_g * portion),
    sodium_mg: round0(sodium_mg * portion),
    potassium_mg: round0(potassium_mg * portion),
    calcium_mg: round0(calcium_mg * portion),
    iron_mg: round1(iron_mg * portion),
    vitamin_c_mg: round1(vitamin_c_mg * portion),
  };
}

export function computePersonalizedRequirements(userProfile = null, activePrescriptionConditions = []) {
  const age = Number(userProfile?.age) || 30;
  const conditions = new Set((userProfile?.conditions || []).map((c) => String(c).toLowerCase()));
  const otherJoined = (userProfile?.otherConditions || []).join(' ').toLowerCase();
  const rxKeys = new Set(
    (activePrescriptionConditions || [])
      .filter((c) => !c.status || c.status === 'active')
      .map((c) => String(c.canonicalKey || c.name || '').toLowerCase())
  );

  let calories = age < 13 ? 1600 : age < 20 ? 2100 : age >= 60 ? 1750 : 2000;
  let protein_g = age < 13 ? 38 : age >= 60 ? 60 : 55;
  let carbs_g = 240;
  let fat_g = 65;
  let fiber_g = 28;
  let sugar_g = age < 13 ? 22 : 36;
  let sodium_mg = age >= 60 ? 1800 : 2300;
  let potassium_mg = 3400;
  let calcium_mg = age >= 60 ? 1200 : 1000;
  let iron_mg = age >= 50 ? 10 : 14;
  let vitamin_c_mg = 75;

  if (conditions.has('diabetes') || rxKeys.has('diabetes') || /prediabetes|pcos|insulin/.test(otherJoined)) {
    calories = Math.min(calories, 1800);
    protein_g = Math.max(protein_g, 65);
    carbs_g = 190;
    sugar_g = Math.min(sugar_g, 25);
    fiber_g = Math.max(fiber_g, 32);
    sodium_mg = Math.min(sodium_mg, 2000);
  }
  if (conditions.has('hypertension') || rxKeys.has('hypertension')) {
    calories = Math.min(calories, 1900);
    sodium_mg = Math.min(sodium_mg, 1500);
    potassium_mg = Math.max(potassium_mg, 3800);
    fiber_g = Math.max(fiber_g, 30);
  }
  if (conditions.has('heart_disease') || rxKeys.has('cholesterol') || /cholesterol|lipid/.test(otherJoined)) {
    calories = Math.min(calories, 1850);
    fat_g = Math.min(fat_g, 55);
    sugar_g = Math.min(sugar_g, 25);
    fiber_g = Math.max(fiber_g, 30);
    sodium_mg = Math.min(sodium_mg, 1800);
  }
  if (conditions.has('kidney_disease') || rxKeys.has('kidney')) {
    protein_g = Math.min(protein_g, 50);
    sodium_mg = Math.min(sodium_mg, 1500);
    potassium_mg = 2400; // moderated ceiling for kidney care
  }
  if (conditions.has('obesity')) {
    calories = Math.min(calories, 1550);
    protein_g = Math.max(protein_g, 70);
    fat_g = Math.min(fat_g, 45);
    sugar_g = Math.min(sugar_g, 20);
    fiber_g = Math.max(fiber_g, 30);
  }
  if (rxKeys.has('fever') || rxKeys.has('throat_cold') || rxKeys.has('infection')) {
    vitamin_c_mg = Math.max(vitamin_c_mg, 95);
    protein_g = Math.max(protein_g, 60);
    sugar_g = Math.min(sugar_g, 28);
  }
  if (rxKeys.has('gastritis') || rxKeys.has('gastroenteritis')) {
    fat_g = Math.min(fat_g, 50);
    potassium_mg = Math.max(potassium_mg, 3500);
  }

  return {
    calories,
    protein_g,
    carbs_g,
    fat_g,
    fiber_g,
    sugar_g,
    sodium_mg,
    potassium_mg,
    calcium_mg,
    iron_mg,
    vitamin_c_mg,
  };
}

const NUTRIENT_SPECS = [
  { key: 'calories', label: 'Calories', unit: 'kcal', mode: 'target' },
  { key: 'protein_g', label: 'Protein', unit: 'g', mode: 'min' },
  { key: 'carbs_g', label: 'Carbohydrates', unit: 'g', mode: 'target' },
  { key: 'fat_g', label: 'Total Fat', unit: 'g', mode: 'max' },
  { key: 'fiber_g', label: 'Dietary Fiber', unit: 'g', mode: 'min' },
  { key: 'sugar_g', label: 'Sugar', unit: 'g', mode: 'max' },
  { key: 'sodium_mg', label: 'Sodium', unit: 'mg', mode: 'max' },
  { key: 'potassium_mg', label: 'Potassium', unit: 'mg', mode: 'min' },
  { key: 'calcium_mg', label: 'Calcium', unit: 'mg', mode: 'min' },
  { key: 'iron_mg', label: 'Iron', unit: 'mg', mode: 'min' },
  { key: 'vitamin_c_mg', label: 'Vitamin C', unit: 'mg', mode: 'min' },
];

export function emptyNutrients() {
  return {
    calories: 0,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0,
    fiber_g: 0,
    sugar_g: 0,
    sodium_mg: 0,
    potassium_mg: 0,
    calcium_mg: 0,
    iron_mg: 0,
    vitamin_c_mg: 0,
  };
}

export function sumNutrients(logs) {
  const totals = emptyNutrients();
  for (const log of logs || []) {
    if (log.consumptionStatus !== 'consumed') continue;
    const n = log.nutrients || {};
    for (const spec of NUTRIENT_SPECS) {
      totals[spec.key] += Number(n[spec.key]) || 0;
    }
  }
  for (const spec of NUTRIENT_SPECS) {
    totals[spec.key] =
      spec.unit === 'kcal' || spec.unit === 'mg'
        ? Math.round(totals[spec.key])
        : round1(totals[spec.key]);
  }
  return totals;
}

export function buildNutritionComparisonReport(logs, requirements, range = 'daily', targetDate = null) {
  const todayStr = targetDate || new Date().toISOString().slice(0, 10);
  const targetMs = new Date(`${todayStr}T23:59:59`).getTime() || Date.now();
  const windowDays = range === 'monthly' ? 30 : range === 'weekly' ? 7 : 1;
  const startDate = new Date(targetMs - (windowDays - 1) * 24 * 60 * 60 * 1000);
  const startStr = startDate.toISOString().slice(0, 10);

  const inRangeAll = (logs || []).filter((log) => {
    const d = String(log.consumedDate || '').slice(0, 10);
    if (!d) return false;
    return d >= startStr && d <= todayStr;
  });

  const pendingConfirmations = (logs || []).filter(
    (log) => log.consumptionStatus === 'pending_confirmation'
  );

  const consumedLogs = inRangeAll.filter((log) => log.consumptionStatus === 'consumed');
  const totals = sumNutrients(consumedLogs);

  const activeDaysSet = new Set(consumedLogs.map((l) => l.consumedDate));
  const activeDayCount = range === 'daily' ? 1 : Math.max(1, activeDaysSet.size || 1);

  const dailyAverage = emptyNutrients();
  for (const spec of NUTRIENT_SPECS) {
    const avg = totals[spec.key] / (range === 'daily' ? 1 : activeDayCount);
    dailyAverage[spec.key] =
      spec.unit === 'kcal' || spec.unit === 'mg' ? Math.round(avg) : round1(avg);
  }

  const comparisonRows = NUTRIENT_SPECS.map((spec) => {
    const consumedVal = range === 'daily' ? totals[spec.key] : dailyAverage[spec.key];
    const targetVal = Number(requirements[spec.key]) || 1;
    const pct = Math.round((consumedVal / targetVal) * 100);
    const diff = round1(targetVal - consumedVal);

    let status = 'optimal';
    if (spec.mode === 'max') {
      if (pct > 100) status = 'excess';
      else if (pct >= 80) status = 'near_limit';
      else status = 'within_limit';
    } else if (spec.mode === 'min') {
      if (pct < 70) status = 'deficient';
      else if (pct < 100) status = 'remaining';
      else status = 'optimal';
    } else {
      // target (calories / carbs)
      if (pct > 112) status = 'excess';
      else if (pct < 65) status = 'deficient';
      else if (pct < 92) status = 'remaining';
      else status = 'optimal';
    }

    return {
      key: spec.key,
      label: spec.label,
      unit: spec.unit,
      mode: spec.mode,
      consumed: consumedVal,
      periodTotal: totals[spec.key],
      target: targetVal,
      remaining: diff > 0 ? diff : 0,
      excess: diff < 0 ? round1(Math.abs(diff)) : 0,
      pct,
      status,
    };
  });

  const deficiencies = comparisonRows.filter((r) => r.status === 'deficient');
  const excesses = comparisonRows.filter((r) => r.status === 'excess');
  const remaining = comparisonRows.filter((r) => r.remaining > 0 && r.status !== 'excess');

  const mealSlots = ['breakfast', 'lunch', 'snack', 'dinner'].map((slot) => {
    const slotLogs = consumedLogs.filter((l) => l.mealSlot === slot);
    const slotTotals = sumNutrients(slotLogs);
    return {
      mealSlot: slot,
      count: slotLogs.length,
      calories: slotTotals.calories,
      protein_g: slotTotals.protein_g,
      carbs_g: slotTotals.carbs_g,
      fat_g: slotTotals.fat_g,
    };
  });

  const platformCounts = {};
  for (const log of consumedLogs) {
    const p = log.platform || 'Manual';
    platformCounts[p] = (platformCounts[p] || 0) + 1;
  }

  // Daily breakdown series for weekly/monthly charts & tables
  const dailySeriesMap = new Map();
  for (const log of consumedLogs) {
    const d = log.consumedDate;
    if (!dailySeriesMap.has(d)) dailySeriesMap.set(d, []);
    dailySeriesMap.get(d).push(log);
  }
  const dailySeries = Array.from(dailySeriesMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, dayLogs]) => {
      const n = sumNutrients(dayLogs);
      return {
        date,
        itemsCount: dayLogs.length,
        ...n,
      };
    });

  return {
    range,
    startDate: startStr,
    endDate: todayStr,
    loggedDays: activeDaysSet.size,
    consumedCount: consumedLogs.length,
    pendingConfirmations,
    totals,
    dailyAverage,
    requirements,
    comparisonRows,
    deficiencies,
    excesses,
    remaining,
    mealSlots,
    platformBreakdown: Object.entries(platformCounts).map(([platform, count]) => ({ platform, count })),
    dailySeries,
  };
}
