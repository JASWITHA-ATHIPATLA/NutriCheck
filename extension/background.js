const DEFAULT_URL = 'http://localhost:3000';

async function getHealthGuardUrl() {
  const stored = await chrome.storage.sync.get(['healthguardUrl']);
  const raw = stored.healthguardUrl || DEFAULT_URL;
  return raw.replace(/\/+$/, '');
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'HEALTHGUARD_ADD_TO_CART') {
    (async () => {
      try {
        const baseUrl = await getHealthGuardUrl();
        const res = await fetch(`${baseUrl}/api/amazon/add-to-cart`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(message.payload),
        });

        const data = await res.json().catch(() => null);
        if (!res.ok) {
          sendResponse({
            ok: false,
            baseUrl,
            error: data?.detail || `Server responded with ${res.status}`,
          });
          return;
        }

        sendResponse({ ok: true, baseUrl, event: data });
      } catch (err) {
        const baseUrl = await getHealthGuardUrl();
        sendResponse({
          ok: false,
          baseUrl,
          error:
            err instanceof Error
              ? err.message
              : 'Could not connect to HealthGuard website.',
        });
      }
    })();
    return true;
  }

  if (message?.type === 'HEALTHGUARD_OPEN_SITE') {
    (async () => {
      const baseUrl = await getHealthGuardUrl();
      const target = message.query ? `${baseUrl}/?${message.query}` : baseUrl;
      chrome.tabs.create({ url: target });
    })();
  }

  return false;
});
