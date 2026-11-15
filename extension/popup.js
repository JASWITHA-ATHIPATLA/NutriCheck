const DEFAULT_URL = 'http://localhost:3000';
const urlInput = document.getElementById('hg-url');
const statusEl = document.getElementById('status');

chrome.storage.sync.get(['healthguardUrl'], (res) => {
  urlInput.value = res.healthguardUrl || DEFAULT_URL;
});

document.getElementById('save-btn').addEventListener('click', () => {
  const cleaned = (urlInput.value || DEFAULT_URL).trim().replace(/\/+$/, '');
  chrome.storage.sync.set({ healthguardUrl: cleaned }, () => {
    urlInput.value = cleaned;
    statusEl.textContent = 'Saved! Ready on Amazon, Flipkart, Swiggy & Zomato.';
    setTimeout(() => {
      statusEl.textContent = '';
    }, 2500);
  });
});

document.getElementById('open-btn').addEventListener('click', () => {
  const cleaned = (urlInput.value || DEFAULT_URL).trim().replace(/\/+$/, '');
  chrome.tabs.create({ url: cleaned });
});
