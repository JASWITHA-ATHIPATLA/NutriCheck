import type {
  PrescriptionAlertResult,
  PrescriptionAlertWarning,
  PrescriptionCondition,
} from '../types';

export const PRESCRIPTION_DISCLAIMER =
  'Informational dietary guidance based on your uploaded prescription. Always follow your physician’s direct advice for medical decisions.';

interface ClientRuleDef {
  key: string;
  label: string;
  category: 'acute' | 'chronic';
  matchesProduct: (hay: string, nutrition?: { calories?: number; sugars?: number; fat?: number; sodium_mg?: number } | null) => string | null;
  alternatives: string[];
}

const CLIENT_CONDITION_RULES: ClientRuleDef[] = [
  {
    key: 'fever',
    label: 'Fever',
    category: 'acute',
    matchesProduct: (hay, nutrition) => {
      if (
        /\b(ice cream|kulfi|gelato|sorbet|popsicle|cold coffee|milkshake|thick shake|iced tea|cold drink|soft drink|soda|cola|pepsi|sprite|fanta|thums up|slush|falooda|chilled)\b/i.test(
          hay
        )
      ) {
        return 'Cold beverages, ice cream, and sugary frozen items may irritate a sensitive throat or slow comfort during fever.';
      }
      if (
        /\b(fried|deep fried|chips|kurkure|namkeen|bhujia|samosa|pakora|kachori|chole bhature|spicy|chilli|schezwan|instant noodles|maggi|burger|french fries|pickle|achaar)\b/i.test(
          hay
        ) ||
        (nutrition && (nutrition.fat || 0) >= 24 && (nutrition.calories || 0) >= 420)
      ) {
        return 'Heavy, spicy, or deep-fried snacks can be harder to digest while recovering from fever.';
      }
      return null;
    },
    alternatives: [
      'Warm oats or soft khichdi',
      'Steamed idli with mild sambar',
      'Room-temperature tender coconut water',
      'Fresh whole fruits (banana, apple, berries)',
    ],
  },
  {
    key: 'throat_cold',
    label: 'Sore Throat / Cold & Cough',
    category: 'acute',
    matchesProduct: (hay) => {
      if (
        /\b(ice cream|kulfi|gelato|cold drink|soft drink|soda|cola|pepsi|sprite|milkshake|cold coffee|iced|slush|falooda|chips|kurkure|spicy|chilli|fried)\b/i.test(
          hay
        )
      ) {
        return 'Chilled desserts, carbonated drinks, or spicy/fried snacks can aggravate throat irritation.';
      }
      return null;
    },
    alternatives: [
      'Warm vegetable soup or clear broth',
      'Warm ginger-tulsi herbal tea',
      'Soft steamed idli or warm porridge',
    ],
  },
  {
    key: 'gastritis',
    label: 'Gastritis / Acidity / GERD',
    category: 'acute',
    matchesProduct: (hay, nutrition) => {
      if (
        /\b(spicy|chilli|masala|pickle|achaar|fried|samosa|pakora|chips|kurkure|namkeen|instant noodles|maggi|coffee|espresso|cola|soda|soft drink|carbonated|chocolate|garlic|schezwan|pizza|burger)\b/i.test(
          hay
        ) ||
        (nutrition && (nutrition.fat || 0) >= 22 && (nutrition.sodium_mg || 0) >= 450)
      ) {
        return 'Spicy, fried, caffeinated, or carbonated products commonly trigger acidity and stomach discomfort.';
      }
      return null;
    },
    alternatives: [
      'Plain rolled oats with low-fat milk',
      'Plain yogurt / curd (dahi)',
      'Steamed idli or soft moong dal khichdi',
    ],
  },
  {
    key: 'gastroenteritis',
    label: 'Stomach Infection / Gastroenteritis',
    category: 'acute',
    matchesProduct: (hay, nutrition) => {
      if (
        /\b(ice cream|cheese|paneer|butter|ghee|biryani|pizza|burger|fries|chips|namkeen|spicy|chilli|fried|milkshake|cola|soda|juice|chocolate)\b/i.test(
          hay
        ) ||
        (nutrition && ((nutrition.fat || 0) >= 15 || (nutrition.sugars || 0) >= 18))
      ) {
        return 'High-fat, rich dairy, spicy, or high-sugar items may worsen digestive upset during stomach recovery.';
      }
      return null;
    },
    alternatives: [
      'Plain curd rice or soft khichdi',
      'Ripe banana or plain toast',
      'Oral rehydration solution / coconut water',
    ],
  },
  {
    key: 'infection',
    label: 'Acute Infection / Antibiotic Course',
    category: 'acute',
    matchesProduct: (hay, nutrition) => {
      if (
        /\b(alcohol|beer|wine|whisky|energy drink|soda|cola|candy|pastry|gulab jamun|instant noodles)\b/i.test(
          hay
        ) ||
        (nutrition && (nutrition.sugars || 0) >= 22)
      ) {
        return 'Very sugary drinks or ultra-processed items offer little nourishment while your body is recovering.';
      }
      return null;
    },
    alternatives: [
      'Plain probiotic yogurt / buttermilk',
      'Fresh whole fruits and lentils/dal',
      'Hydrating unsweetened fluids',
    ],
  },
  {
    key: 'diabetes',
    label: 'Diabetes / Blood Sugar Management',
    category: 'chronic',
    matchesProduct: (hay, nutrition) => {
      const isWholeNutOrBerry =
        /\b(walnuts?|akhrot|almonds?|badam|blueberr(?:y|ies)|strawberr(?:y|ies)|raspberr(?:y|ies)|avocado)\b/i.test(
          hay
        ) && !/\b(sugar|chocolate|syrup|jam|juice|candy|ice cream|cake)\b/i.test(hay);
      if (isWholeNutOrBerry) return null;

      if (
        (nutrition && (nutrition.sugars || 0) >= 12) ||
        /\b(sugar syrup|sharbat|rooh afza|cola|soft drink|candy|chocolate|laddu|gulab jamun|rasgulla|soan papdi|ice cream|jam|honey|jaggery|cake|pastry|milkshake)\b/i.test(
          hay
        )
      ) {
        return nutrition && (nutrition.sugars || 0) >= 12
          ? `Contains ${nutrition.sugars}g sugar, which may raise blood glucose quickly.`
          : 'High free-sugar sweet or beverage listed on your active sugar-restriction plan.';
      }
      return null;
    },
    alternatives: [
      'Wholegrain rolled oats (unsweetened)',
      'Unsalted walnuts or almonds (~28g portion)',
      'Fresh whole blueberries or plain curd',
    ],
  },
  {
    key: 'hypertension',
    label: 'Hypertension (High BP)',
    category: 'chronic',
    matchesProduct: (hay, nutrition) => {
      if (
        (nutrition && (nutrition.sodium_mg || 0) >= 350) ||
        /\b(pickle|achaar|papad|instant noodles|maggi|ramen|salted|potato chips|lays|kurkure|namkeen|bhujia|soy sauce|ketchup|salted butter)\b/i.test(
          hay
        )
      ) {
        return nutrition && (nutrition.sodium_mg || 0) >= 350
          ? `Elevated sodium (${Math.round(nutrition.sodium_mg || 0)}mg) conflicts with low-salt BP guidance.`
          : 'Salty snack/condiment that contributes heavily to daily sodium.';
      }
      return null;
    },
    alternatives: [
      'Unsalted roasted almonds or walnuts',
      'Fresh fruits and steamed vegetables',
      'Low-sodium homemade oats or idli',
    ],
  },
  {
    key: 'cholesterol',
    label: 'High Cholesterol / Lipid Care',
    category: 'chronic',
    matchesProduct: (hay, nutrition) => {
      const isWholeNut =
        /\b(walnuts?|akhrot|almonds?|badam|chia|flax|olive oil|avocado)\b/i.test(hay) &&
        !/\b(fried|chocolate|butter|sugar|salted)\b/i.test(hay);
      if (isWholeNut) return null;

      if (
        (nutrition && (nutrition.fat || 0) >= 22) ||
        /\b(palm oil|palmolein|vanaspati|partially hydrogenated|butter|cheese|mayonnaise|deep fried|french fries|samosa|chips|pastry|brownie)\b/i.test(
          hay
        )
      ) {
        return 'High saturated/cooking fat or palm-oil food should be moderated for lipid balance.';
      }
      return null;
    },
    alternatives: [
      'Omega-3 rich walnuts (~28g unsalted)',
      'Soluble-fiber rolled oats or barley',
      'Fresh berries and green salads',
    ],
  },
  {
    key: 'kidney',
    label: 'Kidney / Renal Care',
    category: 'chronic',
    matchesProduct: (hay, nutrition) => {
      if (
        (nutrition && (nutrition.sodium_mg || 0) >= 320) ||
        /\b(cola|phosphoric|instant noodles|maggi|chips|pickle|achaar|papad|cheese|processed)\b/i.test(
          hay
        )
      ) {
        return 'High sodium or phosphate-containing processed foods warrant extra caution for kidney care.';
      }
      return null;
    },
    alternatives: [
      'Fresh low-sodium apples or berries',
      'Plain steamed rice or low-salt home meals',
    ],
  },
];

export function evaluateProductAgainstActiveProfileClient(params: {
  productTitle: string;
  ingredientsText?: string;
  nutrition?: { calories?: number; sugars?: number; fat?: number; sodium_mg?: number } | null;
  activeConditions: PrescriptionCondition[];
  dietaryRestrictions: string[];
}): PrescriptionAlertResult {
  const hay = `${params.productTitle || ''} ${params.ingredientsText || ''}`.toLowerCase();
  const warnings: PrescriptionAlertWarning[] = [];
  const alternativeSet = new Set<string>();

  for (const cond of params.activeConditions || []) {
    if (cond.status && cond.status !== 'active') continue;
    const key = (cond.canonicalKey || '').toLowerCase();
    const label = cond.name || 'this condition';
    const labelLower = label.toLowerCase();
    const rule =
      CLIENT_CONDITION_RULES.find((r) => r.key === key) ||
      CLIENT_CONDITION_RULES.find((r) => labelLower.includes(r.key)) ||
      ((key.includes('cold') || key.includes('cough') || key.includes('throat') || /\bcold\b|\bcough\b|\bthroat\b/i.test(labelLower))
        ? CLIENT_CONDITION_RULES.find((r) => r.key === 'throat_cold')
        : undefined);

    if (rule) {
      const reason = rule.matchesProduct(hay, params.nutrition);
      if (reason) {
        const displayName = cond.name || rule.label;
        const shortCondLabel = rule.key === 'fever' ? 'fever' : displayName.toLowerCase();
        warnings.push({
          conditionKey: rule.key,
          conditionName: displayName,
          prescribedDate: cond.prescribedDate,
          daysRemaining: cond.daysRemaining ?? null,
          severity: rule.category === 'acute' ? 'warning' : 'caution',
          headline: `You recently reported ${shortCondLabel}. Consider whether this product is suitable for your current condition.`,
          detail: reason,
        });
        rule.alternatives.forEach((a) => alternativeSet.add(a));
      }
    } else {
      const isUltraProcessed =
        /\b(chips|instant noodles|maggi|soda|cola|ice cream|fried|candy|chocolate|pickle|bhujia)\b/i.test(
          hay
        ) ||
        (params.nutrition &&
          ((params.nutrition.sugars || 0) >= 18 || (params.nutrition.sodium_mg || 0) >= 600));
      if (isUltraProcessed) {
        warnings.push({
          conditionKey: key || 'custom',
          conditionName: label,
          prescribedDate: cond.prescribedDate,
          daysRemaining: cond.daysRemaining ?? null,
          severity: 'caution',
          headline: `You recently reported ${label.toLowerCase()}. Consider whether this product is suitable for your current condition.`,
          detail: `High sugar, sodium, or heavily processed ingredients detected while "${label}" is active.`,
        });
        alternativeSet.add('Minimally processed home-style meals, oats, or fresh fruit');
      }
    }
  }

  for (const ruleText of params.dietaryRestrictions || []) {
    const rLower = (ruleText || '').toLowerCase();
    if (
      /cold|ice cream|chilled/i.test(rLower) &&
      /\b(ice cream|kulfi|gelato|cold drink|soft drink|cola|pepsi|sprite|milkshake|cold coffee|iced)\b/i.test(
        hay
      )
    ) {
      if (!warnings.some((w) => w.conditionKey === 'avoid_cold')) {
        warnings.push({
          conditionKey: 'avoid_cold',
          conditionName: 'Avoid cold drinks & ice cream',
          severity: 'caution',
          headline:
            'Prescription dietary note (Avoid cold drinks & ice cream): consider whether this product fits your current restrictions.',
          detail: `Rule applied: ${ruleText}`,
        });
      }
      alternativeSet.add('Warm herbal tea or room-temperature coconut water');
    } else if (
      /spicy|oily|fried/i.test(rLower) &&
      /\b(spicy|chilli|masala|fried|deep fried|chips|kurkure|namkeen|bhujia|samosa|pakora|pickle|achaar|instant noodles)\b/i.test(
        hay
      )
    ) {
      if (!warnings.some((w) => w.conditionKey === 'avoid_spicy_oily')) {
        warnings.push({
          conditionKey: 'avoid_spicy_oily',
          conditionName: 'Avoid spicy, oily & fried food',
          severity: 'caution',
          headline:
            'Prescription dietary note (Avoid spicy, oily & fried food): consider whether this product fits your current restrictions.',
          detail: `Rule applied: ${ruleText}`,
        });
      }
      alternativeSet.add('Steamed idli, plain oats, or soft khichdi');
    }
  }

  return {
    hasWarnings: warnings.length > 0,
    warnings,
    alternatives: Array.from(alternativeSet).slice(0, 4),
    activeConditionCount: (params.activeConditions || []).filter(
      (c) => !c.status || c.status === 'active'
    ).length,
    disclaimer: PRESCRIPTION_DISCLAIMER,
  };
}
