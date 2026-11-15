const DEFAULT_URL = 'http://localhost:3000';
const urlInput = document.getElementById('hg-url');
const statusEl = document.getElementById('status');

chrome.storage.sync.get(['healthguardUrl'], (syncRes) => {
  chrome.storage.local.get(['lastActiveHealthGuardUrl'], (localRes) => {
    urlInput.value =
      syncRes.healthguardUrl || localRes.lastActiveHealthGuardUrl || DEFAULT_URL;
  });
});

document.getElementById('save-btn').addEventListener('click', () => {
  const cleaned = (urlInput.value || DEFAULT_URL).trim().replace(/\/+$/, '');
  chrome.storage.sync.set({ healthguardUrl: cleaned }, () => {
    chrome.storage.local.set({ lastActiveHealthGuardUrl: cleaned });
    urlInput.value = cleaned;
    statusEl.textContent = 'Saved! Ready on Amazon, Flipkart, Swiggy & Zomato.';
    setTimeout(() => {
      statusEl.textContent = '';
    }, 2500);
  });
});

document.getElementById('open-btn').addEventListener('click', () => {
  const cleaned = (urlInput.value || DEFAULT_URL).trim().replace(/\/+$/, '');
  chrome.tabs.create({ url: `${cleaned}/amazon` });
});
