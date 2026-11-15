import type {
  CatalogProduct,
  HealthCondition,
  PersonalizedCheckResult,
  RiskLevel,
  UserHealthProfile,
} from '../types';
import { CATALOG_PRODUCT_IMAGES } from './catalogImages';

export const HEALTH_CONDITION_OPTIONS: {
  key: HealthCondition;
  label: string;
  hint: string;
}[] = [
  { key: 'diabetes', label: 'Diabetes', hint: 'Monitors sugars & refined carbs' },
  { key: 'hypertension', label: 'Hypertension', hint: 'Monitors sodium & salt intake' },
  { key: 'heart_disease', label: 'Heart Disease', hint: 'Monitors saturated fat & sodium' },
  { key: 'kidney_disease', label: 'Kidney Disease', hint: 'Monitors sodium, protein & additives' },
  { key: 'obesity', label: 'Obesity', hint: 'Monitors calorie density & free sugars' },
];

export const SEEDED_CATALOG_PRODUCTS: CatalogProduct[] = [
  {
    id: 'canned-vegetable-soup',
    name: 'Canned Vegetable Soup',
    brand: 'Kitchen Demo',
    category: 'Soup',
    servingSize: '100 g',
    calories: 56,
    sugar_g: 3.0,
    sodium_mg: 450.0,
    saturated_fat_g: 0.2,
    fat_g: 1.1,
    protein_g: 1.8,
    fiber_g: 1.4,
    ingredients: 'Water, carrots, potatoes, green peas, corn, tomato paste, vegetable oil, iodized salt, onion powder, yeast extract, spices',
    allergens: [],
    imageUrl: CATALOG_PRODUCT_IMAGES['canned-vegetable-soup'],
  },
  {
    id: 'chocolate-bar',
    name: 'Chocolate Bar',
    brand: 'Sweet Demo',
    category: 'Confectionery',
    servingSize: '100 g',
    calories: 540,
    sugar_g: 48.0,
    sodium_mg: 120.0,
    saturated_fat_g: 19.0,
    fat_g: 31.0,
    protein_g: 6.0,
    fiber_g: 3.0,
    ingredients: 'Sugar, cocoa butter, milk solids, cocoa mass, soy lecithin, natural vanilla flavor',
    allergens: ['Milk', 'Soy'],
    imageUrl: CATALOG_PRODUCT_IMAGES['chocolate-bar'],
  },
  {
    id: 'cola-soft-drink',
    name: 'Cola Soft Drink',
    brand: 'Demo Foods',
    category: 'Beverage',
    servingSize: '100 ml',
    calories: 42,
    sugar_g: 10.6,
    sodium_mg: 7.0,
    saturated_fat_g: 0.0,
    fat_g: 0.0,
    protein_g: 0.0,
    fiber_g: 0.0,
    ingredients: 'Carbonated water, high fructose corn syrup, sugar, caramel color (E150d), phosphoric acid, natural flavors, caffeine',
    allergens: [],
    imageUrl: CATALOG_PRODUCT_IMAGES['cola-soft-drink'],
  },
  {
    id: 'instant-noodles',
    name: 'Instant Noodles',
    brand: 'Quick Meal',
    category: 'Ready-to-eat',
    servingSize: '100 g',
    calories: 427,
    sugar_g: 3.0,
    sodium_mg: 1200.0,
    saturated_fat_g: 7.0,
    fat_g: 15.7,
    protein_g: 8.5,
    fiber_g: 2.4,
    ingredients: 'Refined wheat flour (maida), palm oil, iodized salt, dehydrated vegetables, sugar, hydrolyzed vegetable protein, flavor enhancer (E621)',
    allergens: ['Wheat', 'Gluten'],
    imageUrl: CATALOG_PRODUCT_IMAGES['instant-noodles'],
  },
  {
    id: 'low-fat-plain-yogurt',
    name: 'Low Fat Plain Yogurt',
    brand: 'Dairy Demo',
    category: 'Dairy',
    servingSize: '100 g',
    calories: 63,
    sugar_g: 4.5,
    sodium_mg: 50.0,
    saturated_fat_g: 1.0,
    fat_g: 1.5,
    protein_g: 5.2,
    fiber_g: 0.0,
    ingredients: 'Pasteurized skim milk, active live yogurt cultures (L. bulgaricus, S. thermophilus)',
    allergens: ['Milk'],
    imageUrl: CATALOG_PRODUCT_IMAGES['low-fat-plain-yogurt'],
  },
  {
    id: 'plain-oats',
    name: 'Plain Oats',
    brand: 'Grain House',
    category: 'Breakfast',
    servingSize: '100 g',
    calories: 379,
    sugar_g: 1.0,
    sodium_mg: 2.0,
    saturated_fat_g: 1.2,
    fat_g: 6.9,
    protein_g: 13.2,
    fiber_g: 10.1,
    ingredients: '100% Wholegrain Rolled Oats',
    allergens: ['Oats'],
    imageUrl: CATALOG_PRODUCT_IMAGES['plain-oats'],
  },
  {
    id: 'roasted-unsalted-almonds',
    name: 'Roasted Unsalted Almonds',
    brand: 'Nut House',
    category: 'Snack',
    servingSize: '100 g',
    calories: 595,
    sugar_g: 4.4,
    sodium_mg: 1.0,
    saturated_fat_g: 3.7,
    fat_g: 52.0,
    protein_g: 21.2,
    fiber_g: 10.8,
    ingredients: '100% Whole California Almonds (dry roasted, unsalted)',
    allergens: ['Tree nuts', 'Almonds'],
    imageUrl: CATALOG_PRODUCT_IMAGES['roasted-unsalted-almonds'],
  },
  {
    id: 'salted-potato-chips',
    name: 'Salted Potato Chips',
    brand: 'SnackCo',
    category: 'Snack',
    servingSize: '100 g',
    calories: 536,
    sugar_g: 1.0,
    sodium_mg: 520.0,
    saturated_fat_g: 3.5,
    fat_g: 34.0,
    protein_g: 6.6,
    fiber_g: 4.2,
    ingredients: 'Potatoes, edible vegetable oil (palm olein), iodized salt',
    allergens: [],
    imageUrl: CATALOG_PRODUCT_IMAGES['salted-potato-chips'],
  },
  {
    id: 'unsweetened-peanut-butter',
    name: 'Unsweetened Peanut Butter',
    brand: 'Nutri Demo',
    category: 'Spread',
    servingSize: '100 g',
    calories: 588,
    sugar_g: 5.9,
    sodium_mg: 420.0,
    saturated_fat_g: 10.0,
    fat_g: 49.0,
    protein_g: 25.0,
    fiber_g: 8.0,
    ingredients: 'Roasted peanuts (98%), peanut oil, salt',
    allergens: ['Peanuts'],
    imageUrl: CATALOG_PRODUCT_IMAGES['unsweetened-peanut-butter'],
  },
  {
    id: 'whole-wheat-biscuits',
    name: 'Whole Wheat Biscuits',
    brand: 'Daily Bakes',
    category: 'Bakery',
    servingSize: '100 g',
    calories: 465,
    sugar_g: 18.0,
    sodium_mg: 420.0,
    saturated_fat_g: 5.0,
    fat_g: 17.5,
    protein_g: 7.4,
    fiber_g: 4.5,
    ingredients: 'Whole wheat flour (55%), sugar, vegetable fat (palm oil), invert syrup, milk solids, leavening agents, salt',
    allergens: ['Wheat', 'Milk'],
    imageUrl: CATALOG_PRODUCT_IMAGES['whole-wheat-biscuits'],
  },
];

export function getAgeGroupLabel(age: number): string {
  if (!Number.isFinite(age) || age <= 0) return 'Adult';
  if (age < 13) return 'Child';
  if (age < 20) return 'Teen';
  if (age < 30) return 'Young Adult';
  if (age < 60) return 'Adult';
  return 'Senior';
}

export function parseAllergiesInput(input: string): string[] {
  return input
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !/^(none|nil|na|n\/a)$/i.test(s));
}

function findMatchingAllergens(
  userAllergies: string[],
  productAllergens: string[],
  ingredientsText: string,
  productName: string
): string[] {
  if (!userAllergies.length) return [];
  const haystack = `${productAllergens.join(' ')} ${ingredientsText} ${productName}`.toLowerCase();
  const matches: string[] = [];
  for (const raw of userAllergies) {
    const clean = raw.trim().toLowerCase();
    if (!clean) continue;
    const singular = clean.endsWith('s') && clean.length > 3 ? clean.slice(0, -1) : clean;
    if (haystack.includes(clean) || haystack.includes(singular)) {
      matches.push(raw.trim());
    }
  }
  return Array.from(new Set(matches));
}

export function evaluateProductForProfile(
  product: CatalogProduct,
  profile: UserHealthProfile | null
): PersonalizedCheckResult {
  const conditions = new Set<HealthCondition>(profile?.conditions || []);
  const userAllergies = profile?.allergies || [];
  const age = profile?.age ?? 30;
  const ageGroupLabel = getAgeGroupLabel(age);

  const reasons: string[] = [];
  const cautions: string[] = [];
  const triggeredConditions: string[] = [];
  let riskPoints = 0; // higher = worse risk

  // 1. Allergen check (strictest override)
  const matchedAllergens = findMatchingAllergens(
    userAllergies,
    product.allergens,
    product.ingredients,
    product.name
  );
  if (matchedAllergens.length > 0) {
    riskPoints += 80;
    triggeredConditions.push(`Allergy (${matchedAllergens.join(', ')})`);
    reasons.push(
      `Allergen alert: contains or lists ${matchedAllergens.join(', ')} matching your profile allergies.`
    );
  }

  // 2. Diabetes screening
  if (conditions.has('diabetes')) {
    if (product.sugar_g >= 15) {
      riskPoints += 50;
      triggeredConditions.push('Diabetes');
      reasons.push('High sugar content may make blood-glucose management harder.');
    } else if (product.sugar_g >= 8) {
      riskPoints += 28;
      triggeredConditions.push('Diabetes');
      reasons.push(
        `Moderate free sugar (${product.sugar_g.toFixed(1)} g per ${product.servingSize})—portion size matters for glucose control.`
      );
    } else if (
      /refined wheat flour|maida|corn syrup|maltodextrin/i.test(product.ingredients) &&
      product.fiber_g < 4
    ) {
      riskPoints += 22;
      triggeredConditions.push('Diabetes');
      reasons.push(
        'Contains fast-digesting refined carbs with low dietary fiber, which can spike blood glucose.'
      );
    }
  }

  // 3. Hypertension screening
  if (conditions.has('hypertension')) {
    if (product.sodium_mg >= 600) {
      riskPoints += 48;
      triggeredConditions.push('Hypertension');
      reasons.push(
        `High sodium (${Math.round(product.sodium_mg)} mg) may elevate blood pressure.`
      );
    } else if (product.sodium_mg >= 250) {
      riskPoints += 24;
      triggeredConditions.push('Hypertension');
      reasons.push(
        `Moderate sodium level (${Math.round(product.sodium_mg)} mg)—factor into daily salt limits.`
      );
    }
  }

  // 4. Kidney Disease screening
  if (conditions.has('kidney_disease')) {
    if (product.sodium_mg >= 400) {
      riskPoints += 28;
      triggeredConditions.push('Kidney Disease');
      reasons.push('Sodium may need restriction in some kidney conditions.');
    }
    if (product.protein_g >= 18 || /phosph|potassium|yeast extract/i.test(product.ingredients)) {
      cautions.push(
        'Kidney diets vary; potassium and phosphorus levels on the pack are not captured in full here.'
      );
    } else {
      cautions.push(
        'Kidney diets vary; potassium and phosphorus are not captured in this demo.'
      );
    }
  }

  // 5. Heart Disease screening
  if (conditions.has('heart_disease')) {
    if (product.saturated_fat_g >= 8 || (product.saturated_fat_g >= 5 && product.sodium_mg >= 400)) {
      riskPoints += 45;
      triggeredConditions.push('Heart Disease');
      reasons.push(
        `High saturated fat (${product.saturated_fat_g.toFixed(1)} g) raises cardiovascular risk.`
      );
    } else if (product.saturated_fat_g >= 3) {
      riskPoints += 22;
      triggeredConditions.push('Heart Disease');
      reasons.push(
        `Contains ${product.saturated_fat_g.toFixed(1)} g saturated fat—keep servings modest for heart health.`
      );
    }
  }

  // 6. Obesity / Weight management screening
  if (conditions.has('obesity')) {
    if (product.calories >= 450 && product.fiber_g < 6) {
      riskPoints += 38;
      triggeredConditions.push('Obesity');
      reasons.push('Energy-dense food, portion size matters for weight management.');
    } else if (product.calories >= 480) {
      riskPoints += 20;
      triggeredConditions.push('Obesity');
      reasons.push(
        `High calorie density (${product.calories} kcal per ${product.servingSize})—measure small portions.`
      );
    } else if (product.sugar_g >= 10 && product.fiber_g < 2) {
      riskPoints += 24;
      triggeredConditions.push('Obesity');
      reasons.push('Liquid/simple sugars add calories without promoting satiety.');
    }
  }

  // 7. General WHO / FDA baseline (applies to everyone, and dominates when no conditions conflict)
  if (product.sugar_g >= 22) {
    riskPoints += 42;
    if (!reasons.some((r) => /sugar/i.test(r))) {
      reasons.push(`Very high sugar (${product.sugar_g.toFixed(1)} g per ${product.servingSize}).`);
    }
  } else if (product.sugar_g >= 10) {
    riskPoints += 20;
    if (!reasons.some((r) => /sugar/i.test(r))) {
      reasons.push(
        `Added sugars (${product.sugar_g.toFixed(1)} g) contribute noticeably to daily free-sugar allowance.`
      );
    }
  }

  if (product.sodium_mg >= 800) {
    riskPoints += 35;
    if (!reasons.some((r) => /sodium/i.test(r))) {
      reasons.push(`Very high sodium (${Math.round(product.sodium_mg)} mg per ${product.servingSize}).`);
    }
  } else if (product.sodium_mg >= 380) {
    riskPoints += 16;
    if (!reasons.some((r) => /sodium/i.test(r))) {
      reasons.push(`Notable sodium content (${Math.round(product.sodium_mg)} mg).`);
    }
  }

  if (product.saturated_fat_g >= 10) {
    riskPoints += 32;
    if (!reasons.some((r) => /saturated fat/i.test(r))) {
      reasons.push(`High saturated fat (${product.saturated_fat_g.toFixed(1)} g per ${product.servingSize}).`);
    }
  } else if (product.saturated_fat_g >= 4.5) {
    riskPoints += 14;
  }

  // Protective factors
  if (product.fiber_g >= 5 && product.sugar_g < 8) {
    riskPoints -= 12;
  }
  if (product.protein_g >= 10 && product.sugar_g < 8 && product.sodium_mg < 450) {
    riskPoints -= 10;
  }
  if (product.fiber_g < 1.5 && product.protein_g < 3 && product.calories > 30) {
    cautions.push('Low fiber may be less filling.');
  }
  if (
    /palm oil|palm olein|phosphoric acid|e621|caramel color|high fructose corn syrup/i.test(
      product.ingredients
    )
  ) {
    riskPoints += 10;
    cautions.push('Contains ultra-processed additives or refined palm oil.');
  }

  // Senior / Child age-tailored caution
  if (profile && age >= 60 && product.sodium_mg >= 400 && !cautions.some((c) => /sodium/i.test(c))) {
    cautions.push('Older adults typically benefit from keeping sodium well below 1,500–2,000 mg/day.');
  }
  if (profile && age < 13 && /caffeine/i.test(product.ingredients)) {
    riskPoints += 25;
    reasons.push('Contains caffeine, which is not recommended for children.');
  }

  const boundedPoints = Math.max(0, Math.min(100, riskPoints));
  const healthScore = Math.max(12, Math.min(96, Math.round(94 - boundedPoints * 0.78)));

  let riskLevel: RiskLevel;
  let tone: 'good' | 'moderate' | 'bad';
  if (matchedAllergens.length > 0 || boundedPoints >= 65) {
    riskLevel = 'HIGH RISK';
    tone = 'bad';
  } else if (boundedPoints >= 25) {
    riskLevel = 'MODERATE RISK';
    tone = 'moderate';
  } else {
    riskLevel = 'LOW RISK';
    tone = 'good';
  }

  if (reasons.length === 0) {
    reasons.push(
      `Balanced nutrient profile with low sugar (${product.sugar_g.toFixed(1)} g) and safe sodium (${Math.round(product.sodium_mg)} mg) for ${profile ? profile.fullName : 'daily nutrition'}.`
    );
  }

  return {
    riskLevel,
    tone,
    score: healthScore,
    ageGroupLabel,
    reasons: Array.from(new Set(reasons)),
    cautions: Array.from(new Set(cautions)),
    matchedAllergens,
    triggeredConditions: Array.from(new Set(triggeredConditions)),
  };
}

export function evaluateProfileAlertsForValues(
  input: {
    productName: string;
    calories: number;
    sugars: number;
    sodium_mg: number;
    fat?: number;
    ingredientsText?: string;
    baseScore?: number;
  },
  profile: UserHealthProfile | null
): {
  riskLevel: RiskLevel;
  level: 'good' | 'warning' | 'danger';
  headline: string;
  alerts: string[];
  suggestions: string[];
} | null {
  if (!profile) return null;

  const alerts: string[] = [];
  const suggestions: string[] = [];
  let level: 'good' | 'warning' | 'danger' = 'good';
  const conditions = new Set(profile.conditions);

  const matchedAllergens = findMatchingAllergens(
    profile.allergies,
    [],
    input.ingredientsText || '',
    input.productName
  );
  if (matchedAllergens.length > 0) {
    level = 'danger';
    alerts.push(
      `Allergen match (${matchedAllergens.join(', ')}) found in this item against your profile.`
    );
    suggestions.push(
      `Avoid this product due to ${matchedAllergens.join(', ')} allergy and pick an allergen-free whole food alternative.`
    );
  }

  if (conditions.has('diabetes') && input.sugars >= 12) {
    level = 'danger';
    alerts.push(
      `Diabetes alert: ${input.sugars}g sugar may spike blood glucose.`
    );
    suggestions.push(
      'Swap for unsweetened high-fiber options like Plain Oats or Unsalted Almonds.'
    );
  } else if (conditions.has('diabetes') && input.sugars >= 6) {
    if (level !== 'danger') level = 'warning';
    alerts.push(`Diabetes watch: ${input.sugars}g sugar—consume in modest portions.`);
    suggestions.push('Pair with protein or fiber and keep serving size small.');
  }

  if (conditions.has('hypertension') && input.sodium_mg >= 400) {
    if (input.sodium_mg >= 650) level = 'danger';
    else if (level !== 'danger') level = 'warning';
    alerts.push(
      `Hypertension watch: ${Math.round(input.sodium_mg)}mg sodium contributes significantly to daily salt.`
    );
    suggestions.push(
      'Choose low-sodium (<140mg) or unsalted products to protect blood pressure.'
    );
  }

  if (conditions.has('kidney_disease') && input.sodium_mg >= 350) {
    if (level === 'good') level = 'warning';
    alerts.push(
      `Kidney care note: ${Math.round(input.sodium_mg)}mg sodium—verify potassium & phosphorus on the pack.`
    );
    suggestions.push(
      'Prefer fresh or low-sodium unprocessed foods without phosphate additives.'
    );
  }

  if (conditions.has('heart_disease') && (input.fat ?? 0) >= 14) {
    if (level === 'good') level = 'warning';
    alerts.push(
      `Heart care note: ${input.fat}g total fat—check saturated/trans fat percentages on pack.`
    );
    suggestions.push(
      'Pick foods cooked without palm oil or hydrogenated fats.'
    );
  }

  if (conditions.has('obesity') && input.calories >= 420) {
    if (level === 'good') level = 'warning';
    alerts.push(
      `Weight management note: energy-dense (${Math.round(input.calories)} kcal)—mind serving size.`
    );
    suggestions.push(
      'Portion into small servings or choose higher-fiber, lower-calorie snacks.'
    );
  }

  if (
    level === 'good' &&
    typeof input.baseScore === 'number' &&
    input.baseScore < 45
  ) {
    level = 'danger';
    alerts.push('High sugar, sodium, or ultra-processed ingredients detected on label.');
  } else if (
    level === 'good' &&
    typeof input.baseScore === 'number' &&
    input.baseScore < 70
  ) {
    level = 'warning';
    alerts.push('Moderate nutritional load—keep portions controlled.');
  }

  const riskLevel: RiskLevel =
    level === 'danger' ? 'HIGH RISK' : level === 'warning' ? 'MODERATE RISK' : 'LOW RISK';

  if (alerts.length === 0) {
    return {
      riskLevel: 'LOW RISK',
      level: 'good',
      headline: `LOW RISK · Safe choice for ${profile.fullName}`,
      alerts: [
        'No allergen matches or high condition-specific nutrient flags detected for your profile.',
      ],
      suggestions: ['Suitable for regular inclusion within your daily calorie budget.'],
    };
  }

  return {
    riskLevel,
    level,
    headline:
      level === 'danger'
        ? `HIGH RISK · Caution for ${profile.fullName}`
        : `MODERATE RISK · Watch portions (${profile.fullName})`,
    alerts: Array.from(new Set(alerts)),
    suggestions: Array.from(new Set(suggestions)),
  };
}

export function getProfileSuggestions(
  profile: UserHealthProfile,
  evaluatedItems: { product: CatalogProduct; check: PersonalizedCheckResult }[]
): {
  tips: string[];
  safePicks: { product: CatalogProduct; check: PersonalizedCheckResult }[];
  avoidPicks: { product: CatalogProduct; check: PersonalizedCheckResult }[];
} {
  const tips: string[] = [];
  const conditions = new Set(profile.conditions);

  if (conditions.has('diabetes')) {
    tips.push(
      'Diabetes focus: Favor foods under 5g sugar per 100g with 5g+ fiber (e.g., Plain Oats, Unsalted Almonds) to steady blood glucose.'
    );
  }
  if (conditions.has('hypertension')) {
    tips.push(
      'Hypertension focus: Aim for products under 250mg sodium per 100g and avoid instant noodles or heavily salted snacks.'
    );
  }
  if (conditions.has('heart_disease')) {
    tips.push(
      'Heart health focus: Choose foods low in saturated fat (<3g/100g) and free from palm oil.'
    );
  }
  if (conditions.has('kidney_disease')) {
    tips.push(
      'Kidney care focus: Restrict high-sodium packaged foods and verify potassium and phosphorus on physical packs.'
    );
  }
  if (conditions.has('obesity')) {
    tips.push(
      'Weight focus: Prioritize filling, high-fiber, protein-rich foods while keeping energy-dense sweets and chips occasional.'
    );
  }
  if (profile.allergies.length > 0) {
    tips.push(
      `Allergy protection active: Any product containing ${profile.allergies.join(', ')} is automatically flagged HIGH RISK.`
    );
  }
  if (tips.length === 0) {
    tips.push(
      'Balanced eating focus: Prioritize whole foods with low added sugar, moderate sodium, and higher fiber & protein.'
    );
  }

  const safePicks = evaluatedItems
    .filter((item) => item.check.riskLevel === 'LOW RISK')
    .sort((a, b) => b.check.score - a.check.score)
    .slice(0, 3);

  const avoidPicks = evaluatedItems
    .filter((item) => item.check.riskLevel === 'HIGH RISK')
    .sort((a, b) => a.check.score - b.check.score)
    .slice(0, 3);

  return { tips, safePicks, avoidPicks };
}

export function getSaferAlternativesForProduct(
  currentProduct: CatalogProduct,
  allProducts: CatalogProduct[],
  profile: UserHealthProfile | null
): { product: CatalogProduct; check: PersonalizedCheckResult }[] {
  return allProducts
    .filter((p) => p.id !== currentProduct.id)
    .map((p) => ({ product: p, check: evaluateProductForProfile(p, profile) }))
    .filter((entry) => entry.check.riskLevel === 'LOW RISK')
    .sort((a, b) => b.check.score - a.check.score)
    .slice(0, 2);
}
