const DEFAULT_URL = 'http://localhost:3000';
const TOAST_TTL_MS = 90000;

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

  let sodium_mg = null;
  const sodMg = normalized.match(/sodium\s*[:|\-]?\s*(\d+(?:\.\d+)?)\s*mg\b/i);
  const sodG = normalized.match(/sodium\s*[:|\-]?\s*(\d+(?:\.\d+)?)\s*g\b/i);
  const saltG = normalized.match(/salt\s*[:|\-]?\s*(\d+(?:\.\d+)?)\s*g\b/i);
  if (sodMg) sodium_mg = parseFloat(sodMg[1]);
  else if (sodG) sodium_mg = parseFloat(sodG[1]) * 1000;
  else if (saltG) sodium_mg = parseFloat(saltG[1]) * 393.4;

  const foundCount = [sugars, fat, protein, sodium_mg].filter((v) => v !== null).length;
  if (foundCount < 2) return null;

  return {
    calories,
    sugars: sugars ?? 0,
    fat: fat ?? 0,
    protein: protein ?? 0,
    sodium_mg: sodium_mg ?? 0,
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
      status: protein_kcal_pct >= 20 ? 'good' : protein_kcal_pct >= 10 || Number(n.calories) < 120 ? 'moderate' : 'high',
      note: `${round1(protein_kcal_pct)}% of calories`,
    },
    {
      nutrient: 'Sodium',
      value_display: `${Math.round(sodium_mg)} mg`,
      status: sodium_per_100kcal > 220 || sodium_mg > 600 ? 'high' : sodium_per_100kcal > 115 || sodium_mg > 300 ? 'moderate' : 'good',
      note: `${Math.round(sodium_per_100kcal)} mg per 100 kcal`,
    },
  ];

  const level = classification === 'Healthy' ? 'success' : classification === 'Moderate' ? 'warning' : 'danger';
  const explanation = `${foodName} scored ${health_score}/100 (${classification}) across ${round1(n.calories)} kcal, ${round1(sugars)}g sugar, ${round1(fat)}g fat, and ${Math.round(sodium_mg)}mg sodium.`;

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
      title: classification === 'Healthy' ? 'Healthy Choice Added' : classification === 'Moderate' ? 'Moderation Recommended' : 'Health Warning: Unhealthy Item',
      message: explanation,
    },
    model_used: 'WHO/FDA Nutrient Engine (Extension Sync)',
  };
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
      // ignore barcode lookup failure
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
      `https://search.openfoodfacts.org/search?q=${encodeURIComponent(cleanQuery)}&page_size=6&fields=product_name,brands,nutriments`
    );
    if (!r.ok) return null;
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
    // ignore search error
  }
  return null;
}

async function analyzeInExtensionFallback(payload) {
  const title = payload.product_title || 'Amazon Item';
  const parsed = parseNutritionTextInWorker(payload.nutrition_text || '');
  let nutritionSource = '';
  let matchedFood = null;
  let nutrition = parsed;

  if (nutrition) {
    nutritionSource = 'Amazon Page Nutrition Facts';
  } else {
    const off = await lookupOpenFoodFactsInWorker(title, payload.barcode);
    if (off) {
      nutrition = off.nutrition;
      nutritionSource = off.source;
      matchedFood = off.matched_food;
    }
  }

  const eventId = `ext-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  if (!nutrition) {
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
    };
  }

  const analysis = scoreNutritionInWorker(title, nutrition);
  return {
    event_id: eventId,
    timestamp: new Date().toISOString(),
    source: payload.source || 'amazon_browser_extension',
    status: 'analyzed',
    product_title: title,
    product_url: payload.product_url || null,
    nutrition_source: nutritionSource,
    matched_food: matchedFood,
    message: analysis.explanation,
    analysis,
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
        `Captured "${data.product_title}" for your NutriCheck website. Nutrition numbers were not found in HTML—enter them on the website to classify.`,
      score: null,
      baseUrl,
      query,
    };
  }

  const a = data.analysis;
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
    title: `NutriCheck: ${a.classification}`,
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
        message: `Checking "${productTitle}" nutrition and syncing to ${baseUrl}.`,
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
          eventData = await res.json().catch(() => null);
        }
      } catch {
        // Fallback below handles static Vercel deployments or offline local backend
      }

      if (!eventData) {
        eventData = await analyzeInExtensionFallback(message.payload || { product_title: productTitle });
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
