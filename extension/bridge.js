(function () {
  if (!chrome?.storage?.local) return;

  function syncEventsToPage(events) {
    if (!Array.isArray(events)) return;
    window.postMessage(
      {
        type: 'NUTRICHECK_AMAZON_SYNC',
        events,
      },
      window.location.origin
    );
  }

  chrome.storage.local.get(['lastHealthGuardEvents'], (res) => {
    if (Array.isArray(res?.lastHealthGuardEvents) && res.lastHealthGuardEvents.length > 0) {
      syncEventsToPage(res.lastHealthGuardEvents);
    }
  });

  if (chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== 'local' || !changes.lastHealthGuardEvents) return;
      const next = changes.lastHealthGuardEvents.newValue;
      if (Array.isArray(next)) {
        syncEventsToPage(next);
      }
    });
  }

  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    const msg = event.data;
    if (!msg || typeof msg !== 'object') return;

    if (msg.type === 'NUTRICHECK_REQUEST_SYNC') {
      chrome.storage.local.get(['lastHealthGuardEvents'], (res) => {
        syncEventsToPage(res?.lastHealthGuardEvents || []);
      });
    } else if (msg.type === 'NUTRICHECK_CLEAR_AMAZON_EVENTS') {
      chrome.storage.local.set({ lastHealthGuardEvents: [] });
    } else if (msg.type === 'NUTRICHECK_DELETE_AMAZON_EVENT' && msg.eventId) {
      chrome.storage.local.get(['lastHealthGuardEvents'], (res) => {
        const list = Array.isArray(res?.lastHealthGuardEvents) ? res.lastHealthGuardEvents : [];
        chrome.storage.local.set({
          lastHealthGuardEvents: list.filter((e) => e.event_id !== msg.eventId),
        });
      });
    }
  });
})();
