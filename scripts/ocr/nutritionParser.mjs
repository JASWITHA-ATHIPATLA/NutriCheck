function round1(val) {
  return Math.round(val * 10) / 10;
}

/**
 * Fix common Tesseract OCR misreads inside nutrition facts tables
 * (e.g. "(9)" for "(g)", "Proten" for "Protein", "keal" for "kcal").
 */
export function normalizeOcrTableText(raw) {
  if (!raw) return '';
  let text = String(raw)
    .replace(/\r\n?/g, '\n')
    .replace(/\bPro[tl]e[in]{1,2}\b/gi, 'Protein')
    .replace(/\bCarbo[hy]{1,2}[dv]rates?\b/gi, 'Carbohydrate')
    .replace(/\bTota[lt]\s+Sugars?\b/gi, 'Total Sugars')
    .replace(/\bAdded\s+Sugars?\b/gi, 'Added Sugar')
    .replace(/\bTota[lt]\s+Fat\b/gi, 'Total Fat')
    .replace(/\bSod[iu]m\b/gi, 'Sodium')
    .replace(/\bEner[gq]y\b/gi, 'Energy')
    .replace(/\bEnergy\s*\(\s*(?:keal|keai|kca1|keat)\s*\)/gi, 'Energy (kcal)')
    .replace(/\b(\d+(?:\.\d+)?)\s*(?:keal|keai|kca1)\b/gi, '$1 kcal')
    .replace(/\bTotal\s+Fat\s*\(\s*[gq9]\s*\)/gi, 'Total Fat (g)')
    .replace(/\bSaturated\s+Fat\s*\(\s*[gq9]\s*\)/gi, 'Saturated Fat (g)')
    .replace(/\bTrans\s+Fat\s*\(\s*[gq9]\s*\)/gi, 'Trans Fat (g)')
    .replace(/\bTotal\s+Sugars?\s*\(\s*[gq9]\s*\)/gi, 'Total Sugars (g)')
    .replace(/\bAdded\s+Sugars?\s*\(\s*[gq9]\s*\)/gi, 'Added Sugar (g)')
    .replace(/\bProtein\s*\(\s*[gq9e]\s*\)/gi, 'Protein (g)')
    .replace(/\bCarbohydrates?\s*\(\s*[gq9]\s*\)/gi, 'Carbohydrate (g)')
    .replace(/\bDietary\s+Fib(?:er|re)\s*\(\s*[gq9]\s*\)/gi, 'Dietary Fiber (g)')
    .replace(/\bSodium\s*\(\s*m[gq]\s*\)/gi, 'Sodium (mg)');

  // Recover dropped decimal dot when "(g)" is explicitly in the header (e.g. "Protein (g) 152" -> "15.2")
  text = text.replace(
    /((?:protein|carbohydrates?|total\s+sugars?|total\s+fat|saturated\s+fat|dietary\s+fiber)\s*\(\s*g\s*\)\s*[:|\-]?\s*)(\d{3})(?!\.\d)/gi,
    (_full, prefix, digits) => {
      const val = parseInt(digits, 10);
      if (val >= 101 && val <= 999) {
        return `${prefix}${(val / 10).toFixed(1)}`;
      }
      return `${prefix}${digits}`;
    }
  );

  return text;
}

export function extractIngredientsFromOcrText(rawText) {
  if (!rawText) return '';
  const match = String(rawText).match(
    /\bingredients?\b\s*[:\-]\s*([\s\S]{2,900}?)(?:\bnet\s*weight\b|\bnutrition(?:al)?\s*(?:facts|information|values)\b|\ballergen|\bstorage|\bfor feedback|\bmarketed|\bmanufactured|\bpacked\s*by|\bbest\s*before|\bfssai\b|\bapprox(?:imate)?\s*values\b|$)/i
  );
  if (match && match[1]) {
    const cleaned = match[1].replace(/\s+/g, ' ').replace(/^[ :\-]+|[ ,:;\-]+$/g, '').trim();
    if (cleaned.length >= 2 && !/^(?:type|preference|vegetarian|vegan)$/i.test(cleaned)) {
      return `Ingredients: ${cleaned}`;
    }
  }
  return '';
}

function getMacroCandidates(rawToken, hasUnitBefore, calories, macroType) {
  const num = parseFloat(rawToken);
  if (Number.isNaN(num)) return [];
  if (num <= 100) {
    // Handle X.Y9 where trailing "g" was misread as "9" when no "(g)" in header
    if (!hasUnitBefore && /^\d+\.\d9$/.test(rawToken)) {
      return [parseFloat(rawToken.slice(0, -1)), num];
    }
    return [num];
  }

  // > 100g per 100g is physically impossible: recover dropped decimal point or trailing g->9 OCR artifact
  const intStr = String(Math.round(num));
  const cands = [];
  if (!hasUnitBefore && /^\d{4}$/.test(intStr) && intStr.endsWith('9')) {
    const stripped = parseInt(intStr.slice(0, -1), 10);
    if (stripped > 100) cands.push(round1(stripped / 10));
    else cands.push(round1(stripped / 10), stripped);
  } else if (!hasUnitBefore && /^\d{3}$/.test(intStr) && intStr.endsWith('9')) {
    const withoutNine = parseInt(intStr.slice(0, -1), 10);
    // e.g. "699" -> 6.9 (6.9g with g->9) or 69.9; "329" -> 32.9 or 32 or 3.2
    cands.push(round1(withoutNine / 10));
    if (withoutNine <= 95 && macroType !== 'protein') cands.push(withoutNine);
    if (num / 10 <= 99.9 && (macroType !== 'protein' || calories > 350)) {
      cands.push(round1(num / 10));
    }
  } else if (num >= 101 && num <= 999) {
    cands.push(round1(num / 10));
  }

  const deduped = Array.from(new Set(cands.filter((v) => v >= 0 && v <= 100)));
  return deduped;
}

function resolveMacroCombinationsWithEnergy(calories, pCands, cCands, fCands) {
  const ps = pCands.length ? pCands : [0];
  const cs = cCands.length ? cCands : [0];
  const fs = fCands.length ? fCands : [0];

  if (ps.length === 1 && cs.length === 1 && fs.length === 1) {
    return {
      protein: pCands.length ? ps[0] : null,
      carbs: cCands.length ? cs[0] : null,
      fat: fCands.length ? fs[0] : null,
    };
  }

  let best = { p: ps[0], c: cs[0], f: fs[0], err: Infinity };
  for (const p of ps) {
    for (const c of cs) {
      for (const f of fs) {
        const estKcal = p * 4 + c * 4 + f * 9;
        // Prefer realistic macro balance when close to printed Energy
        let err = Math.abs(estKcal - calories);
        if (p > 45 && calories > 250 && f > 15) err += 60;
        if (err < best.err) {
          best = { p, c, f, err };
        }
      }
    }
  }
  return {
    protein: pCands.length ? best.p : null,
    carbs: cCands.length ? best.c : null,
    fat: fCands.length ? best.f : null,
  };
}

export function parseNutritionText(text) {
  if (!text || !String(text).trim()) return null;

  const ocrClean = normalizeOcrTableText(String(text));
  const cleanedRaw = ocrClean
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
  if (Number.isNaN(calories) || calories <= 0 || calories > 1200) return null;

  const grabMacroRaw = (sourceStr, namePattern, macroType) => {
    const unitBefore = new RegExp(
      `(?:${namePattern})\\s*\\(\\s*g(?:ms?)?\\s*\\)\\s*[:|\\-]?\\s*(\\d+(?:\\.\\d+)?)(?!\\s*%)`,
      'i'
    );
    const mBefore = sourceStr.match(unitBefore);
    if (mBefore) {
      return getMacroCandidates(mBefore[1], true, calories, macroType);
    }

    const unitAfter = new RegExp(
      `(?:${namePattern})\\s*[:|\\-]?\\s*(\\d+(?:\\.\\d+)?)\\s*g(?:ms?)?\\b`,
      'i'
    );
    const mAfter = sourceStr.match(unitAfter);
    if (mAfter) {
      const val = parseFloat(mAfter[1]);
      return val <= 105 ? [val] : getMacroCandidates(mAfter[1], true, calories, macroType);
    }

    if (hasLabelHeader) {
      const bare = new RegExp(
        `(?:${namePattern})\\s*[:|\\-]?\\s*(\\d+(?:\\.\\d+)?)\\b(?!\\s*(?:%|mg\\b|kcal\\b))`,
        'i'
      );
      const mBare = sourceStr.match(bare);
      if (mBare) {
        return getMacroCandidates(mBare[1], false, calories, macroType);
      }
    }
    return [];
  };

  const normalizedNoAdded = normalized.replace(/\badded\s+sugars?\b/gi, ' __added_sugar__ ');
  let sugarCands = grabMacroRaw(normalized, '\\btotal\\s+sugars?', 'sugars');
  if (!sugarCands.length) sugarCands = grabMacroRaw(normalized, '\\bof\\s+which\\s+sugars?', 'sugars');
  if (!sugarCands.length) sugarCands = grabMacroRaw(normalizedNoAdded, '\\bsugars?', 'sugars');
  if (!sugarCands.length) sugarCands = grabMacroRaw(normalized, '\\badded\\s+sugars?', 'sugars');

  const normalizedNoSubFats = normalized.replace(
    /\b(?:saturated|sat\.?|trans|mono(?:unsaturated)?|poly(?:unsaturated)?|omega[\s\-\d]*fatty)\s+fat(?:ty\s+acids?)?\b/gi,
    ' __sub_fat__ '
  );
  let fatCands = grabMacroRaw(normalized, '\\btotal\\s+fat', 'fat');
  if (!fatCands.length) fatCands = grabMacroRaw(normalizedNoSubFats, '\\bfat', 'fat');

  const protCands = grabMacroRaw(normalized, '\\bproteins?', 'protein');
  const carbCands = grabMacroRaw(normalized, '(?:\\btotal\\s+)?\\bcarbohydrates?', 'carbs');

  const resolved = resolveMacroCombinationsWithEnergy(calories, protCands, carbCands, fatCands);
  let sugars = sugarCands.length ? sugarCands[0] : null;
  const fat = resolved.fat;
  const protein = resolved.protein;
  const carbs = resolved.carbs;

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
