(function () {
  if (!chrome?.storage?.local) return;

  let currentPageUserId = null;

  function isStoreWebsiteOrigin() {
    const h = (window.location.hostname || '').toLowerCase();
    return (
      h.includes('zomato.') ||
      h.includes('swiggy.') ||
      h.includes('blinkit.') ||
      h.includes('grofers.') ||
      h.includes('amazon.') ||
      h.includes('flipkart.')
    );
  }

  function isNutriCheckOriginPage() {
    try {
      if (isStoreWebsiteOrigin()) return false;
      const titleMatch = /nutricheck|healthguard/i.test(document.title || '');
      return titleMatch;
    } catch {
      return false;
    }
  }

  if (isNutriCheckOriginPage() && /^https?:\/\//i.test(window.location.origin)) {
    chrome.storage.local.set({ lastActiveHealthGuardUrl: window.location.origin });
  }

  function filterEventsForUser(events, userId) {
    if (!Array.isArray(events)) return [];
    if (!userId) {
      return events.filter(Boolean);
    }
    return events
      .filter((ev) => ev && (!ev.user_id || ev.user_id === userId))
      .map((ev) => (ev.user_id ? ev : { ...ev, user_id: userId }));
  }

  function syncEventsToPage(events, userId) {
    if (isStoreWebsiteOrigin()) return;
    const activeId = userId !== undefined ? userId : currentPageUserId;
    const filtered = filterEventsForUser(events, activeId);
    window.postMessage(
      {
        type: 'NUTRICHECK_AMAZON_SYNC',
        events: filtered,
      },
      window.location.origin
    );
  }

  function pullAndSyncLatestFromStorage() {
    if (isStoreWebsiteOrigin()) return;
    chrome.storage.local.get(['lastHealthGuardEvents', 'activeHealthGuardUserId'], (res) => {
      const storedUserId = res?.activeHealthGuardUserId || null;
      if (!currentPageUserId && storedUserId) {
        currentPageUserId = storedUserId;
      }
      if (Array.isArray(res?.lastHealthGuardEvents) && res.lastHealthGuardEvents.length > 0) {
        syncEventsToPage(res.lastHealthGuardEvents, currentPageUserId);
      }
    });
  }

  pullAndSyncLatestFromStorage();

  if (chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== 'local' || !changes.lastHealthGuardEvents) return;
      const next = changes.lastHealthGuardEvents.newValue;
      if (Array.isArray(next)) {
        syncEventsToPage(next, currentPageUserId);
      }
    });
  }

  // Also sync immediately when user switches back from Zomato/Swiggy tab to NutriCheck tab
  window.addEventListener('focus', pullAndSyncLatestFromStorage);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      pullAndSyncLatestFromStorage();
    }
  });

  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    const msg = event.data;
    if (!msg || typeof msg !== 'object') return;

    if (msg.type === 'NUTRICHECK_SET_ACTIVE_USER') {
      currentPageUserId = msg.userId || null;
      const updates = { activeHealthGuardUserId: currentPageUserId };
      if (!isStoreWebsiteOrigin() && /^https?:\/\//i.test(window.location.origin)) {
        updates.lastActiveHealthGuardUrl = window.location.origin;
      }
      if (!currentPageUserId) {
        updates.activePrescriptionSummary = null;
      }
      chrome.storage.local.set(updates);
      chrome.storage.local.get(['lastHealthGuardEvents'], (res) => {
        syncEventsToPage(res?.lastHealthGuardEvents || [], currentPageUserId);
      });
    } else if (msg.type === 'NUTRICHECK_REQUEST_SYNC') {
      const updates = {};
      if (!isStoreWebsiteOrigin() && /^https?:\/\//i.test(window.location.origin)) {
        updates.lastActiveHealthGuardUrl = window.location.origin;
      }
      if (msg.userId !== undefined) {
        currentPageUserId = msg.userId || null;
        updates.activeHealthGuardUserId = currentPageUserId;
      }
      if (Object.keys(updates).length > 0) {
        chrome.storage.local.set(updates);
      }
      chrome.storage.local.get(['lastHealthGuardEvents', 'activeHealthGuardUserId'], (res) => {
        const uid = currentPageUserId || res?.activeHealthGuardUserId || null;
        syncEventsToPage(res?.lastHealthGuardEvents || [], uid);
      });
    } else if (msg.type === 'NUTRICHECK_CLEAR_AMAZON_EVENTS') {
      const uid = msg.userId || currentPageUserId;
      chrome.storage.local.get(['lastHealthGuardEvents'], (res) => {
        const list = Array.isArray(res?.lastHealthGuardEvents) ? res.lastHealthGuardEvents : [];
        const remaining = uid ? list.filter((e) => e && e.user_id && e.user_id !== uid) : [];
        chrome.storage.local.set({ lastHealthGuardEvents: remaining });
      });
    } else if (msg.type === 'NUTRICHECK_DELETE_AMAZON_EVENT' && msg.eventId) {
      const uid = msg.userId || currentPageUserId;
      chrome.storage.local.get(['lastHealthGuardEvents'], (res) => {
        const list = Array.isArray(res?.lastHealthGuardEvents) ? res.lastHealthGuardEvents : [];
        chrome.storage.local.set({
          lastHealthGuardEvents: list.filter((e) => {
            if (!e) return false;
            if (e.event_id !== msg.eventId) return true;
            if (uid && e.user_id && e.user_id !== uid) return true;
            return false;
          }),
        });
      });
    } else if (msg.type === 'NUTRICHECK_UPDATE_AMAZON_EVENT' && msg.event?.event_id) {
      const updated = msg.event;
      chrome.storage.local.get(['lastHealthGuardEvents'], (res) => {
        const list = Array.isArray(res?.lastHealthGuardEvents) ? res.lastHealthGuardEvents : [];
        const exists = list.some((e) => e && e.event_id === updated.event_id);
        const next = exists
          ? list.map((e) => (e && e.event_id === updated.event_id ? updated : e))
          : [updated, ...list];
        chrome.storage.local.set({ lastHealthGuardEvents: next.slice(0, 50) });
      });
    } else if (msg.type === 'NUTRICHECK_SYNC_PRESCRIPTIONS') {
      chrome.storage.local.set({
        activePrescriptionSummary: msg.summary || null,
      });
    }
  });
})();
