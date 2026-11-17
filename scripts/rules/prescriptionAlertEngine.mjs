// Deterministic Prescription OCR Parser & Dietary Alert Engine
// Strictly informational: never makes medical diagnoses or unsupported clinical claims.

export const PRESCRIPTION_DISCLAIMER =
  'Informational dietary guidance based on your uploaded prescription. Always follow your physician’s direct advice for medical decisions.';

const CONDITION_RULES = [
  {
    key: 'fever',
    label: 'Fever',
    category: 'acute',
    defaultValidDays: 7,
    keywords: [
      'viral fever',
      'high fever',
      'fever',
      'feaver',
      'fiver',
      'feverish',
      'pyrexia',
      'febrile',
      'febril',
      'typhoid',
      'dengue',
      'malaria',
      'body heat',
      'high temperature',
      'temperature',
    ],
    medicineHints: ['paracetamol', 'dolo', 'crocin', 'calpol', 'acetaminophen', 'pacimol'],
    dietaryDefaults: [
      'Prefer warm, easily digestible meals and room-temperature fluids',
      'Avoid ice cream, chilled cold drinks, and deep-fried heavy foods',
    ],
    triggerCheck: ({ hay, nutrition }) => {
      const isColdOrSweet =
        /\b(ice[\s-]*cream|icecream|kulfi|gelato|sorbet|popsicle|frozen\s+dessert|sundae|cornetto|magnum|chocobar|cassata|cold\s+coffee|milkshake|thick\s+shake|iced\s+tea|cold\s+drink|soft\s+drink|soda|cola|pepsi|sprite|fanta|thums\s+up|slush|falooda|chilled)\b/i.test(
          hay
        );
      const isHeavyFriedSpicy =
        /\b(fried|deep fried|chips|kurkure|namkeen|bhujia|samosa|pakora|kachori|chole bhature|spicy|chilli|schezwan|instant noodles|maggi|burger|french fries|pickle|achaar)\b/i.test(
          hay
        ) || (nutrition && nutrition.fat >= 24 && nutrition.calories >= 420);

      if (isColdOrSweet) {
        return {
          matched: true,
          reason:
            'Cold beverages, ice cream, and sugary frozen items may irritate a sensitive throat or slow comfort during fever.',
        };
      }
      if (isHeavyFriedSpicy) {
        return {
          matched: true,
          reason:
            'Heavy, spicy, or deep-fried snacks can be harder to digest while recovering from fever.',
        };
      }
      return { matched: false };
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
    defaultValidDays: 7,
    keywords: [
      'sore throat',
      'throat infection',
      'pharyngitis',
      'tonsillitis',
      'common cold',
      'cough',
      'upper respiratory',
      'urti',
      'sinusitis',
      'bronchitis',
    ],
    medicineHints: ['azithromycin', 'cetirizine', 'montelukast', 'cough syrup', 'ambroxol', 'levocetirizine', 'strepsils'],
    dietaryDefaults: [
      'Avoid ice-cold drinks, ice cream, and excessively oily/spicy snacks',
      'Favor warm soups, herbal tea, and soft warm meals',
    ],
    triggerCheck: ({ hay }) => {
      if (
        /\b(ice[\s-]*cream|icecream|kulfi|gelato|frozen\s+dessert|sundae|cornetto|magnum|chocobar|cassata|cold\s+drink|soft\s+drink|soda|cola|pepsi|sprite|milkshake|cold\s+coffee|iced|slush|falooda|chips|kurkure|spicy|chilli|fried)\b/i.test(
          hay
        )
      ) {
        return {
          matched: true,
          reason:
            'Chilled desserts, carbonated drinks, or spicy/fried snacks can aggravate throat irritation.',
        };
      }
      return { matched: false };
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
    defaultValidDays: 14,
    keywords: [
      'gastritis',
      'acidity',
      'acid reflux',
      'gerd',
      'dyspepsia',
      'peptic ulcer',
      'gastric',
      'heartburn',
      'epigastric pain',
    ],
    medicineHints: ['pantoprazole', 'omeprazole', 'rabeprazole', 'esomeprazole', 'pan-d', 'pantocid', 'gelusil', 'digene', 'sucralfate'],
    dietaryDefaults: [
      'Avoid spicy, deep-fried, sour/pickled foods, carbonated drinks, and excess caffeine',
      'Eat small, bland, non-oily meals on time',
    ],
    triggerCheck: ({ hay, nutrition }) => {
      if (
        /\b(spicy|chilli|masala|pickle|achaar|fried|samosa|pakora|chips|kurkure|namkeen|instant noodles|maggi|coffee|espresso|cola|soda|soft drink|carbonated|chocolate|garlic|schezwan|pizza|burger)\b/i.test(
          hay
        ) ||
        (nutrition && nutrition.fat >= 22 && nutrition.sodium_mg >= 450)
      ) {
        return {
          matched: true,
          reason:
            'Spicy, fried, caffeinated, or carbonated products commonly trigger acidity and stomach discomfort.',
        };
      }
      return { matched: false };
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
    defaultValidDays: 5,
    keywords: [
      'gastroenteritis',
      'diarrhea',
      'loose motion',
      'loose stools',
      'food poisoning',
      'stomach infection',
      'vomiting',
      'dehydration',
    ],
    medicineHints: ['ors', 'electral', 'metronidazole', 'ofloxacin', 'loperamide', 'racecadotril', 'ondansetron', 'enterogermina'],
    dietaryDefaults: [
      'Follow a soft bland diet (khichdi, banana, curd rice, ORS) and stay hydrated',
      'Avoid heavy dairy ice creams, oily/fried fast foods, and spicy dishes',
    ],
    triggerCheck: ({ hay, nutrition }) => {
      if (
        /\b(ice cream|cheese|paneer|butter|ghee|biryani|pizza|burger|fries|chips|namkeen|spicy|chilli|fried|milkshake|cola|soda|juice|chocolate)\b/i.test(
          hay
        ) ||
        (nutrition && (nutrition.fat >= 15 || nutrition.sugars >= 18))
      ) {
        return {
          matched: true,
          reason:
            'High-fat, rich dairy, spicy, or high-sugar items may worsen digestive upset during stomach recovery.',
        };
      }
      return { matched: false };
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
    defaultValidDays: 10,
    keywords: [
      'bacterial infection',
      'urinary tract infection',
      'uti',
      'infection',
      'sepsis',
      'cellulitis',
      'antibiotic course',
    ],
    medicineHints: ['amoxicillin', 'augmentin', 'ciprofloxacin', 'cefixime', 'levofloxacin', 'doxycycline'],
    dietaryDefaults: [
      'Maintain good hydration and include probiotic-rich light foods (plain yogurt/curd)',
      'Limit ultra-processed high-sugar snacks and alcohol',
    ],
    triggerCheck: ({ hay, nutrition }) => {
      if (
        /\b(alcohol|beer|wine|whisky|energy drink|soda|cola|candy|pastry|gulab jamun|instant noodles)\b/i.test(hay) ||
        (nutrition && nutrition.sugars >= 22)
      ) {
        return {
          matched: true,
          reason:
            'Very sugary drinks or ultra-processed items offer little nourishment while your body is recovering.',
        };
      }
      return { matched: false };
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
    defaultValidDays: 180,
    keywords: [
      'diabetes',
      'type 2 diabetes',
      'type 1 diabetes',
      't2dm',
      'dm',
      'hyperglycemia',
      'prediabetes',
      'hba1c',
      'blood sugar',
      'insulin resistance',
    ],
    medicineHints: ['metformin', 'glimepiride', 'sitagliptin', 'empagliflozin', 'dapagliflozin', 'insulin', 'glycomet'],
    dietaryDefaults: [
      'Limit added sugars (<= 5g/100g) and refined flour snacks',
      'Choose high-fiber whole grains, unsalted nuts, and fresh whole berries',
    ],
    triggerCheck: ({ hay, nutrition }) => {
      const isWholeNutOrBerry =
        /\b(walnuts?|akhrot|almonds?|badam|blueberr(?:y|ies)|strawberr(?:y|ies)|raspberr(?:y|ies)|avocado)\b/i.test(
          hay
        ) && !/\b(sugar|chocolate|syrup|jam|juice|candy|ice cream|cake)\b/i.test(hay);

      if (isWholeNutOrBerry) return { matched: false };

      if (
        (nutrition && nutrition.sugars >= 12) ||
        /\b(sugar syrup|sharbat|rooh afza|cola|soft drink|candy|chocolate|laddu|gulab jamun|rasgulla|soan papdi|ice cream|jam|honey|jaggery|cake|pastry|milkshake)\b/i.test(
          hay
        )
      ) {
        return {
          matched: true,
          reason:
            nutrition && nutrition.sugars >= 12
              ? `Contains ${nutrition.sugars}g sugar, which may raise blood glucose quickly.`
              : 'High free-sugar sweet or beverage listed on your active sugar-restriction plan.',
        };
      }
      return { matched: false };
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
    defaultValidDays: 180,
    keywords: [
      'hypertension',
      'high bp',
      'high blood pressure',
      'htn',
      'elevated bp',
      'blood pressure',
    ],
    medicineHints: ['amlodipine', 'telmisartan', 'losartan', 'atenolol', 'metoprolol', 'ramipril', 'telma'],
    dietaryDefaults: [
      'Keep sodium low (avoid pickles, instant noodles, salted chips, and processed sauces)',
    ],
    triggerCheck: ({ hay, nutrition }) => {
      if (
        (nutrition && nutrition.sodium_mg >= 350) ||
        /\b(pickle|achaar|papad|instant noodles|maggi|ramen|salted|potato chips|lays|kurkure|namkeen|bhujia|soy sauce|ketchup|salted butter)\b/i.test(
          hay
        )
      ) {
        return {
          matched: true,
          reason:
            nutrition && nutrition.sodium_mg >= 350
              ? `Elevated sodium (${Math.round(nutrition.sodium_mg)}mg) conflicts with low-salt BP guidance.`
              : 'Salty snack/condiment that contributes heavily to daily sodium.',
        };
      }
      return { matched: false };
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
    defaultValidDays: 180,
    keywords: [
      'high cholesterol',
      'dyslipidemia',
      'hyperlipidemia',
      'hypercholesterolemia',
      'high triglycerides',
      'lipid profile',
      'coronary',
      'heart disease',
    ],
    medicineHints: ['atorvastatin', 'rosuvastatin', 'rosuvas', 'atorva', 'ecosprin', 'clopidogrel'],
    dietaryDefaults: [
      'Limit saturated/trans fats, palm oil, ghee-heavy sweets, and deep-fried foods',
    ],
    triggerCheck: ({ hay, nutrition }) => {
      const isWholeNut =
        /\b(walnuts?|akhrot|almonds?|badam|chia|flax|olive oil|avocado)\b/i.test(hay) &&
        !/\b(fried|chocolate|butter|sugar|salted)\b/i.test(hay);
      if (isWholeNut) return { matched: false };

      if (
        (nutrition && nutrition.fat >= 22) ||
        /\b(palm oil|palmolein|vanaspati|partially hydrogenated|butter|cheese|mayonnaise|deep fried|french fries|samosa|chips|pastry|brownie)\b/i.test(
          hay
        )
      ) {
        return {
          matched: true,
          reason:
            'High saturated/cooking fat or palm-oil food should be moderated for lipid balance.',
        };
      }
      return { matched: false };
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
    defaultValidDays: 180,
    keywords: ['kidney disease', 'ckd', 'renal', 'nephropathy', 'creatinine', 'kidney stone'],
    medicineHints: ['furosemide', 'torsemide', 'sodium bicarbonate'],
    dietaryDefaults: [
      'Strictly limit high-sodium processed foods, colas (phosphoric acid), and salty snacks',
    ],
    triggerCheck: ({ hay, nutrition }) => {
      if (
        (nutrition && nutrition.sodium_mg >= 320) ||
        /\b(cola|phosphoric|instant noodles|maggi|chips|pickle|achaar|papad|cheese|processed)\b/i.test(
          hay
        )
      ) {
        return {
          matched: true,
          reason:
            'High sodium or phosphate-containing processed foods warrant extra caution for kidney care.',
        };
      }
      return { matched: false };
    },
    alternatives: [
      'Fresh low-sodium apples or berries',
      'Plain steamed rice or low-salt home meals',
    ],
  },
  {
    key: 'thyroid',
    label: 'Thyroid Care',
    category: 'chronic',
    defaultValidDays: 180,
    keywords: ['hypothyroidism', 'hyperthyroidism', 'thyroid', 'tsh'],
    medicineHints: ['levothyroxine', 'thyronorm', 'eltroxin'],
    dietaryDefaults: [
      'Take thyroid medication on an empty stomach; limit ultra-processed sugary snacks',
    ],
    triggerCheck: ({ nutrition }) => {
      if (nutrition && nutrition.sugars >= 24 && nutrition.calories >= 420) {
        return {
          matched: true,
          reason: 'Calorie-dense high-sugar processed food can work against steady metabolic balance.',
        };
      }
      return { matched: false };
    },
    alternatives: ['High-fiber whole grains, eggs, yogurt, and fresh fruit'],
  },
];

const DIETARY_RESTRICTION_PATTERNS = [
  {
    key: 'avoid_cold',
    label: 'Avoid cold drinks & ice cream',
    regex: /\b(?:avoid|no|stop|limit|restrict)\s+(?:very\s+)?(?:cold|chilled|iced)\s*(?:drinks?|beverages?|water|items?|foods?)?|no\s+ice\s*cream|avoid\s+ice\s*cream/i,
    productRegex: /\b(ice[\s-]*cream|icecream|kulfi|gelato|frozen\s+dessert|sundae|cornetto|magnum|chocobar|cassata|cold drink|soft drink|cola|pepsi|sprite|fanta|milkshake|cold coffee|iced|slush|falooda)\b/i,
    alternative: 'Warm herbal tea or room-temperature coconut water',
  },
  {
    key: 'avoid_spicy_oily',
    label: 'Avoid spicy, oily & fried food',
    regex: /\b(?:avoid|no|limit|restrict)\s+(?:spicy|oily|greasy|deep[- ]?fried|fried|junk|outside)\s*(?:food|foods|items|snacks)?/i,
    productRegex: /\b(spicy|chilli|masala|fried|deep fried|chips|kurkure|namkeen|bhujia|samosa|pakora|kachori|french fries|burger|pizza|pickle|achaar|schezwan|instant noodles)\b/i,
    alternative: 'Steamed idli, plain oats, or soft khichdi',
  },
  {
    key: 'low_sodium',
    label: 'Low salt / sodium restriction',
    regex: /\b(?:low\s*salt|low\s*sodium|salt\s*restricted|reduce\s*salt|avoid\s*(?:excess\s*)?salt|no\s*added\s*salt)\b/i,
    productRegex: /\b(pickle|achaar|papad|salted|chips|namkeen|bhujia|instant noodles|maggi|soy sauce|ketchup|cheese)\b/i,
    nutrientCheck: (n) => n && n.sodium_mg >= 320,
    alternative: 'Unsalted nuts, fresh fruits, or low-salt home foods',
  },
  {
    key: 'low_sugar',
    label: 'Low sugar / sugar restricted diet',
    regex: /\b(?:low\s*sugar|sugar\s*free|no\s*(?:added\s*)?sugar|avoid\s*(?:sweets?|sugar)|diabetic\s*diet)\b/i,
    productRegex: /\b(candy|chocolate|cake|pastry|laddu|gulab jamun|rasgulla|ice[\s-]*cream|icecream|soda|cola|sharbat|jam|honey|jaggery|milkshake)\b/i,
    nutrientCheck: (n) => n && n.sugars >= 10,
    alternative: 'Unsweetened oats, plain yogurt, or fresh whole berries',
  },
  {
    key: 'soft_bland_diet',
    label: 'Soft / bland diet recommended',
    regex: /\b(?:soft\s*diet|bland\s*diet|light\s*(?:home\s*)?food|khichdi|liquid\s*diet|semi[- ]?solid)\b/i,
    productRegex: /\b(chips|nachos|kurkure|fried|burger|pizza|biryani|spicy|pickles?|steak|popcorn)\b/i,
    alternative: 'Warm khichdi, mashed oats, or steamed idli',
  },
  {
    key: 'avoid_caffeine',
    label: 'Limit caffeine / aerated drinks',
    regex: /\b(?:avoid|no|limit)\s+(?:caffeine|coffee|tea|aerated|carbonated|soda|cola|alcohol)\b/i,
    productRegex: /\b(coffee|espresso|cappuccino|latte|cola|pepsi|coca cola|thums up|energy drink|red bull|soda|carbonated|chocolate)\b/i,
    alternative: 'Caffeine-free herbal infusion or warm water',
  },
];

const KNOWN_MEDICINE_LEXICON = [
  'Paracetamol',
  'Dolo 650',
  'Crocin',
  'Calpol',
  'Ibuprofen',
  'Azithromycin',
  'Amoxicillin',
  'Augmentin',
  'Cefixime',
  'Ciprofloxacin',
  'Pantoprazole',
  'Omeprazole',
  'Rabeprazole',
  'Pan-D',
  'Domperidone',
  'Ondansetron',
  'Cetirizine',
  'Levocetirizine',
  'Montelukast',
  'Metformin',
  'Glimepiride',
  'Sitagliptin',
  'Amlodipine',
  'Telmisartan',
  'Losartan',
  'Atorvastatin',
  'Rosuvastatin',
  'Levothyroxine',
  'Thyronorm',
  'ORS',
  'Electral',
  'Vitamin C',
  'Vitamin D3',
  'Zinc',
  'B-Complex',
];

const MONTHS = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

export function resolveCanonicalConditionMeta(conditionName) {
  const lower = String(conditionName || '').trim().toLowerCase();
  if (!lower) {
    return { canonicalKey: 'custom', category: 'acute', defaultValidDays: 7 };
  }
  for (const rule of CONDITION_RULES) {
    if (lower === rule.key || rule.label.toLowerCase() === lower) {
      return {
        canonicalKey: rule.key,
        category: rule.category,
        defaultValidDays: rule.defaultValidDays,
      };
    }
    for (const kw of rule.keywords) {
      const re = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (re.test(lower)) {
        return {
          canonicalKey: rule.key,
          category: rule.category,
          defaultValidDays: rule.defaultValidDays,
        };
      }
    }
  }
  return {
    canonicalKey: lower.replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'custom',
    category: 'acute',
    defaultValidDays: 7,
  };
}

export function parsePrescriptionDateFromText(rawText) {
  const text = String(rawText || '');
  const isoToday = new Date().toISOString().slice(0, 10);

  // YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = text.match(/\b(20\d{2})[-/](0?[1-9]|1[0-2])[-/](0?[1-9]|[12]\d|3[01])\b/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = text.match(/\b(0?[1-9]|[12]\d|3[01])[-/.](0?[1-9]|1[0-2])[-/.](20\d{2}|\d{2})\b/);
  if (dmyMatch) {
    let [, d, m, y] = dmyMatch;
    if (y.length === 2) y = `20${y}`;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // DD MMM YYYY (e.g. 12 Nov 2026)
  const wordDateMatch = text.match(
    /\b(0?[1-9]|[12]\d|3[01])\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)[,\s]+(20\d{2})\b/i
  );
  if (wordDateMatch) {
    const [, d, mon, y] = wordDateMatch;
    const monthNum = MONTHS[mon.toLowerCase()];
    if (monthNum !== undefined) {
      return `${y}-${String(monthNum + 1).padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
  }

  return isoToday;
}

export function extractMedicinesFromText(rawText) {
  const text = String(rawText || '');
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const medicines = [];
  const seen = new Set();

  const pushMed = (name, dosage = '', note = '') => {
    const cleanName = String(name || '').replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9)+]+$/g, '').trim();
    if (!cleanName || cleanName.length < 3) return;
    const key = cleanName.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    medicines.push({ name: cleanName, dosage: dosage.trim(), note: note.trim() });
  };

  // 1. Line-based Rx pattern (Tab. / Cap. / Syp. / Inj. / Rx lines)
  for (const line of lines) {
    const rxMatch = line.match(
      /^(?:\d+[.)]?\s*)?(?:tab(?:let)?s?|cap(?:sule)?s?|syp|syrup|inj(?:ection)?|susp(?:ension)?|drops?|sachet|rx)\s*[.:-]?\s*([A-Za-z][A-Za-z0-9+\-\s]{2,42})(?:\s+(\d+\s*(?:mg|mcg|ml|g)\b[^,\n]*))?/i
    );
    if (rxMatch) {
      const dosageMatch = line.match(/(\d+\s*(?:mg|mcg|ml|g)\b|(?:OD|BD|TDS|QID|SOS|HS)\b[^,\n]*|\b[01]-[01]-[01]\b)/i);
      const durMatch = line.match(/\bfor\s+\d+\s+days?\b|\bx\s*\d+\s*d(?:ays?)?\b/i);
      pushMed(
        rxMatch[1],
        dosageMatch ? dosageMatch[0] : rxMatch[2] || '',
        durMatch ? durMatch[0] : ''
      );
    }
  }

  // 2. Lexicon match anywhere in text
  for (const med of KNOWN_MEDICINE_LEXICON) {
    const esc = med.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const m = text.match(new RegExp(`\\b${esc}\\b([^\\n]{0,40})`, 'i'));
    if (m) {
      const tail = m[1] || '';
      const dose = tail.match(/(\d+\s*(?:mg|mcg|ml|g)\b|\b[01]-[01]-[01]\b|\b(?:OD|BD|TDS|SOS)\b)/i);
      pushMed(med, dose ? dose[1] : '');
    }
  }

  return medicines.slice(0, 15);
}

export function extractPrescriptionFields(rawText, options = {}) {
  const text = String(rawText || '').trim();
  const prescriptionDate =
    options.prescriptionDate && /^\d{4}-\d{2}-\d{2}$/.test(options.prescriptionDate)
      ? options.prescriptionDate
      : parsePrescriptionDateFromText(text);

  const lower = text.toLowerCase();
  const medicines = extractMedicinesFromText(text);
  const medNamesLower = medicines.map((m) => m.name.toLowerCase()).join(' ');

  // Parse explicit duration override e.g. "x 5 days" or "for 7 days"
  const explicitDurationMatch = text.match(/\b(?:for|valid(?:ity)?\s*(?:for)?|review\s+after)\s+(\d{1,3})\s+days?\b/i);
  const explicitDays = explicitDurationMatch ? Math.min(365, Math.max(1, parseInt(explicitDurationMatch[1], 10))) : null;

  const baseDateMs = new Date(`${prescriptionDate}T00:00:00`).getTime() || Date.now();
  const conditions = [];
  const seenKeys = new Set();
  const dietaryRestrictions = new Set();

  for (const rule of CONDITION_RULES) {
    let matchedSnippet = '';
    for (const kw of rule.keywords) {
      const re = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      const m = text.match(re);
      if (m) {
        matchedSnippet = `Mentioned "${m[0]}" in prescription`;
        break;
      }
    }

    // Only infer from medicines when condition wasn't named directly and medicine is specific
    if (!matchedSnippet && rule.medicineHints.length > 0) {
      for (const mh of rule.medicineHints) {
        if (lower.includes(mh) || medNamesLower.includes(mh)) {
          matchedSnippet = `Associated with prescribed ${mh}`;
          break;
        }
      }
    }

    if (matchedSnippet && !seenKeys.has(rule.key)) {
      seenKeys.add(rule.key);
      const validDays =
        rule.category === 'acute' && explicitDays ? explicitDays : rule.defaultValidDays;
      const expiresAt = new Date(baseDateMs + validDays * 24 * 60 * 60 * 1000).toISOString();
      const isExpired = Date.now() > new Date(expiresAt).getTime();

      conditions.push({
        id: `cond-${rule.key}-${Date.now().toString(36).slice(-4)}`,
        name: rule.label,
        canonicalKey: rule.key,
        category: rule.category,
        validDays,
        prescribedDate: prescriptionDate,
        expiresAt,
        status: isExpired ? 'expired' : 'active',
        sourceSnippet: matchedSnippet,
      });

      for (const d of rule.dietaryDefaults) {
        dietaryRestrictions.add(d);
      }
    }
  }

  for (const dr of DIETARY_RESTRICTION_PATTERNS) {
    if (dr.regex.test(text)) {
      dietaryRestrictions.add(dr.label);
    }
  }

  // Extract raw "Diet:" / "Advice:" lines from prescription text
  for (const line of text.split(/\r?\n/)) {
    const adviceMatch = line.match(/^(?:diet(?:ary)?\s*(?:advice|restrictions?)?|advice|precautions?|instructions?)\s*[:\-]\s*(.+)$/i);
    if (adviceMatch && adviceMatch[1].trim().length > 3) {
      dietaryRestrictions.add(adviceMatch[1].trim().slice(0, 140));
    }
  }

  return {
    prescriptionDate,
    conditions,
    medicines,
    dietaryRestrictions: Array.from(dietaryRestrictions).slice(0, 12),
    disclaimer: PRESCRIPTION_DISCLAIMER,
  };
}

export function computeEffectiveConditionStatus(condition, nowMs = Date.now()) {
  if (!condition) return 'expired';
  if (condition.status === 'dismissed') return 'dismissed';
  const expMs = condition.expiresAt ? new Date(condition.expiresAt).getTime() : 0;
  if (expMs && nowMs > expMs) return 'expired';
  return 'active';
}

export function refreshPrescriptionStatuses(prescription, nowMs = Date.now()) {
  if (!prescription) return null;
  const conditions = (prescription.conditions || []).map((c) => {
    const status = computeEffectiveConditionStatus(c, nowMs);
    const expMs = c.expiresAt ? new Date(c.expiresAt).getTime() : nowMs;
    const daysRemaining =
      status === 'active' ? Math.max(0, Math.ceil((expMs - nowMs) / (24 * 60 * 60 * 1000))) : 0;
    return {
      ...c,
      status,
      daysRemaining,
    };
  });
  const activeCount = conditions.filter((c) => c.status === 'active').length;
  return {
    ...prescription,
    conditions,
    activeCount,
    hasActiveConditions: activeCount > 0,
  };
}

export function buildActivePrescriptionProfile(prescriptions, nowMs = Date.now()) {
  const activeConditions = [];
  const expiredConditions = [];
  const medicines = [];
  const dietaryRestrictions = new Set();
  const seenCondKeys = new Set();

  for (const rawRx of prescriptions || []) {
    const rx = refreshPrescriptionStatuses(rawRx, nowMs);
    if (!rx) continue;

    let rxHasActiveCond = false;
    for (const c of rx.conditions || []) {
      const enriched = {
        ...c,
        prescription_id: rx.prescription_id,
        fileName: rx.fileName,
      };
      if (c.status === 'active') {
        rxHasActiveCond = true;
        const dedupKey = `${c.canonicalKey || c.name}`.toLowerCase();
        if (!seenCondKeys.has(dedupKey)) {
          seenCondKeys.add(dedupKey);
          activeConditions.push(enriched);
        }
      } else {
        expiredConditions.push(enriched);
      }
    }

    // Include dietary restrictions & medicines if any condition is active, OR if the
    // prescription was uploaded in the past 14 days without explicit condition tags.
    const uploadedMs = rx.uploadedAt ? new Date(rx.uploadedAt).getTime() : 0;
    const isRecentWithoutConditions =
      (rx.conditions || []).length === 0 &&
      (!uploadedMs || nowMs - uploadedMs <= 14 * 24 * 60 * 60 * 1000);

    if (rxHasActiveCond || isRecentWithoutConditions) {
      for (const dr of rx.dietaryRestrictions || []) {
        dietaryRestrictions.add(dr);
      }
      for (const med of rx.medicines || []) {
        if (!medicines.some((m) => m.name.toLowerCase() === med.name.toLowerCase())) {
          medicines.push(med);
        }
      }
    }
  }

  return {
    activeConditions,
    expiredConditions,
    medicines,
    dietaryRestrictions: Array.from(dietaryRestrictions),
    disclaimer: PRESCRIPTION_DISCLAIMER,
  };
}

function getWarningProductSubject(hay) {
  if (/\b(ice[\s-]*cream|icecream|kulfi|gelato|frozen\s+dessert|sundae|cornetto|magnum|chocobar|cassata)\b/i.test(hay)) {
    return 'ice cream';
  }
  if (/\b(cold\s+drink|soft\s+drink|soda|cola|pepsi|sprite|fanta|thums\s+up|milkshake|cold\s+coffee|iced\s+tea|slush|falooda)\b/i.test(hay)) {
    return 'cold drinks';
  }
  return 'this product';
}

export function evaluateProductAgainstPrescriptions({
  productTitle,
  ingredientsText = '',
  nutrition = null,
  activeConditions = [],
  dietaryRestrictions = [],
}) {
  const hay = `${productTitle || ''} ${ingredientsText || ''}`.toLowerCase();
  const warnings = [];
  const alternativeSet = new Set();
  const itemSubject = getWarningProductSubject(hay);

  for (const cond of activeConditions || []) {
    if (cond.status && cond.status !== 'active') continue;
    const key = String(cond.canonicalKey || '').toLowerCase();
    const label = cond.name || 'this condition';
    const labelLower = label.toLowerCase();

    const matchedRule =
      CONDITION_RULES.find((r) => r.key === key) ||
      CONDITION_RULES.find((r) => labelLower.includes(r.key)) ||
      ((/\b(fever|feaver|fiver|feverish|pyrexia|febril|febrile|body\s+heat)\b/i.test(`${key} ${labelLower}`))
        ? CONDITION_RULES.find((r) => r.key === 'fever')
        : (key.includes('cold') || key.includes('cough') || key.includes('throat') || /\bcold\b|\bcough\b|\bthroat\b/i.test(labelLower))
        ? CONDITION_RULES.find((r) => r.key === 'throat_cold')
        : undefined);

    if (matchedRule) {
      const check = matchedRule.triggerCheck({ hay, nutrition });
      if (check.matched) {
        const displayName = cond.name || matchedRule.label;
        const shortCondLabel = matchedRule.key === 'fever'
          ? 'fever'
          : displayName.toLowerCase();
        warnings.push({
          conditionKey: matchedRule.key,
          conditionName: matchedRule.key === 'fever' ? 'Fever' : displayName,
          prescribedDate: cond.prescribedDate,
          daysRemaining: cond.daysRemaining ?? null,
          severity: matchedRule.category === 'acute' ? 'warning' : 'caution',
          headline: `You recently reported ${shortCondLabel} — ${itemSubject} is not good for your health right now.`,
          detail: check.reason,
        });
        for (const alt of matchedRule.alternatives) {
          alternativeSet.add(alt);
        }
      }
    } else {
      // Custom condition reported in prescription text
      const isUltraProcessed =
        /\b(chips|instant noodles|maggi|soda|cola|ice[\s-]*cream|icecream|fried|candy|chocolate|pickle|bhujia)\b/i.test(
          hay
        ) || (nutrition && (nutrition.sugars >= 18 || nutrition.sodium_mg >= 600));
      if (isUltraProcessed) {
        warnings.push({
          conditionKey: key || 'custom',
          conditionName: label,
          prescribedDate: cond.prescribedDate,
          daysRemaining: cond.daysRemaining ?? null,
          severity: 'caution',
          headline: `You recently reported ${label.toLowerCase()} — ${itemSubject} is not good for your health right now.`,
          detail: `High sugar, sodium, or heavily processed ingredients detected while "${label}" is marked active.`,
        });
        alternativeSet.add('Minimally processed home-style meals, oats, or fresh fruit');
      }
    }
  }

  for (const ruleText of dietaryRestrictions || []) {
    const rLower = String(ruleText || '').toLowerCase();
    for (const pat of DIETARY_RESTRICTION_PATTERNS) {
      const matchesRule =
        pat.label.toLowerCase() === rLower ||
        pat.regex.test(rLower) ||
        (pat.key === 'avoid_cold' && /cold|ice[\s-]*cream|icecream|chilled/i.test(rLower)) ||
        (pat.key === 'avoid_spicy_oily' && /spicy|oily|fried/i.test(rLower)) ||
        (pat.key === 'low_sodium' && /salt|sodium/i.test(rLower)) ||
        (pat.key === 'low_sugar' && /sugar|sweet/i.test(rLower));

      if (!matchesRule) continue;
      const productMatches =
        pat.productRegex.test(hay) || (pat.nutrientCheck && pat.nutrientCheck(nutrition));
      if (productMatches) {
        if (!warnings.some((w) => w.detail.includes(pat.label) || w.conditionKey === pat.key)) {
          warnings.push({
            conditionKey: pat.key,
            conditionName: pat.label,
            severity: 'caution',
            headline: `Prescription note: ${itemSubject} conflicts with your active dietary guidance (${pat.label.toLowerCase()}).`,
            detail: `Rule applied: ${ruleText}`,
          });
        }
        alternativeSet.add(pat.alternative);
      }
    }
  }

  return {
    hasWarnings: warnings.length > 0,
    warnings,
    alternatives: Array.from(alternativeSet).slice(0, 4),
    activeConditionCount: (activeConditions || []).filter((c) => !c.status || c.status === 'active').length,
    disclaimer: PRESCRIPTION_DISCLAIMER,
  };
}
