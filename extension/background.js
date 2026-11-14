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
        `Could not connect to NutriCheck at ${baseUrl}. Make sure npm run dev is running.`,
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
        `Captured "${data.product_title}" on your NutriCheck website. Nutrition numbers were not found in HTML—enter them on the website to classify.`,
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

      // Save an immediate pending toast so even if Amazon redirects to
      // /cart/smart-wagon within 1 second, the new page shows status immediately.
      await saveToastState({
        level: 'info',
        title: 'NutriCheck: Analyzing Amazon Item...',
        message: `Sending "${productTitle}" to ${baseUrl} for ML nutrition analysis.`,
        score: null,
        baseUrl,
        query: new URLSearchParams({ item: productTitle, source: 'amazon' }).toString(),
      });

      try {
        const res = await fetch(`${baseUrl}/api/amazon/add-to-cart`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(message.payload),
        });

        const data = await res.json().catch(() => null);
        if (!res.ok) {
          const errMsg =
            res.status === 502 || res.status === 504
              ? `NutriCheck backend API is unreachable (HTTP ${res.status}). Verify FastAPI is running on port 8001.`
              : data?.detail || `Server responded with HTTP ${res.status}`;

          const toast = buildToastFromResponse({
            ok: false,
            baseUrl,
            error: errMsg,
            productTitle,
          });
          await saveToastState(toast);
          sendResponse({ ok: false, baseUrl, error: errMsg, toast });
          return;
        }

        const toast = buildToastFromResponse({
          ok: true,
          baseUrl,
          data,
          productTitle,
        });
        await saveToastState(toast);
        sendResponse({ ok: true, baseUrl, event: data, toast });
      } catch (err) {
        const errMsg =
          err instanceof Error
            ? `Could not reach ${baseUrl}: ${err.message}`
            : `Could not connect to NutriCheck website at ${baseUrl}.`;

        const toast = buildToastFromResponse({
          ok: false,
          baseUrl,
          error: errMsg,
          productTitle,
        });
        await saveToastState(toast);
        sendResponse({ ok: false, baseUrl, error: errMsg, toast });
      }
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
