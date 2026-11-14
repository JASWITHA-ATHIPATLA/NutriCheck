(function () {
  const ADD_TO_CART_SELECTORS = [
    '#add-to-cart-button',
    '#add-to-cart-button-ubb',
    'input[name="submit.add-to-cart"]',
    '[data-action="add-to-cart"] button',
    '[data-action="add-to-cart"] input',
    '.a-button-input[aria-labelledby*="add-to-cart"]',
    'button[name="submit.addToCart"]',
  ].join(',');

  const NUTRITION_REGEX = /calori|energy|sugar|sodium|salt|protein|fat|nutrition|kcal|carbohydrate/i;

  function isAddToCartElement(target) {
    if (!target || !(target instanceof Element)) return null;
    const direct = target.closest(ADD_TO_CART_SELECTORS);
    if (direct) return direct;

    const btn = target.closest('button, input[type="submit"], [role="button"]');
    if (!btn) return null;
    const label = (
      btn.textContent ||
      btn.getAttribute('aria-label') ||
      btn.getAttribute('value') ||
      ''
    )
      .trim()
      .toLowerCase();
    if (label === 'add to cart' || label.startsWith('add to cart')) {
      return btn;
    }
    return null;
  }

  function extractProductTitle(clickedEl) {
    const card = clickedEl.closest('[data-asin]');
    if (card) {
      const cardTitle = card.querySelector(
        'h2 a span, h2 span, [data-cy="title-recipe"] span, .a-size-medium, .a-size-base-plus'
      );
      if (cardTitle && cardTitle.textContent.trim()) {
        return cardTitle.textContent.trim();
      }
    }

    const pageTitle =
      document.querySelector('#productTitle') ||
      document.querySelector('#title') ||
      document.querySelector('h1');
    if (pageTitle && pageTitle.textContent.trim()) {
      return pageTitle.textContent.trim();
    }

    return document.title.replace(/^Amazon\.[^:]+:\s*/i, '').trim();
  }

  function extractBrandAndBarcode() {
    let brand = '';
    const byline = document.querySelector('#bylineInfo, #brand');
    if (byline && byline.textContent) {
      brand = byline.textContent
        .replace(/visit the\s+/i, '')
        .replace(/\s+store$/i, '')
        .replace(/^brand:\s*/i, '')
        .trim();
    }

    let barcode = '';
    const detailRoots = [
      '#detailBullets_feature_div',
      '#productDetails_techSpec_section_1',
      '#productDetails_detailBullets_sections1',
    ];
    for (const sel of detailRoots) {
      const el = document.querySelector(sel);
      if (!el || !el.innerText) continue;
      const m = el.innerText.match(
        /(?:EAN|UPC|GTIN|Barcode)\s*[:\s\-]*([0-9]{8,14})/i
      );
      if (m) {
        barcode = m[1];
        break;
      }
    }
    return { brand, barcode };
  }

  function extractNutritionText() {
    const chunks = [];
    const candidateSelectors = [
      '#productDetails_techSpec_section_1',
      '#productDetails_detailBullets_sections1',
      '#detailBullets_feature_div',
      '#important-information',
      '#productOverview_feature_div',
      '#feature-bullets',
      '#productDescription',
      '#aplus',
      '#vital-info',
      '.a-expander-content',
    ];

    for (const sel of candidateSelectors) {
      document.querySelectorAll(sel).forEach((el) => {
        const text = (el.innerText || '').trim();
        if (text && NUTRITION_REGEX.test(text)) {
          chunks.push(text.slice(0, 2000));
        }
      });
    }

    document.querySelectorAll('table').forEach((tbl) => {
      const t = (tbl.innerText || '').trim();
      if (t && NUTRITION_REGEX.test(t)) {
        chunks.push(t.slice(0, 1500));
      }
    });

    document.querySelectorAll('img[alt]').forEach((img) => {
      const alt = (img.getAttribute('alt') || '').trim();
      if (alt && NUTRITION_REGEX.test(alt)) {
        chunks.push(alt.slice(0, 800));
      }
    });

    return chunks.join('\n').slice(0, 6000);
  }

  function removeExistingToast() {
    const existing = document.getElementById('healthguard-amazon-toast');
    if (existing) existing.remove();
  }

  function showHealthToast(toastData) {
    if (!toastData) return;
    if (toastData.expiresAt && toastData.expiresAt < Date.now()) {
      removeExistingToast();
      return;
    }

    removeExistingToast();

    const { level, title, message, score, query } = toastData;
    const colors =
      {
        success: { bg: '#f0fdf4', border: '#86efac', ink: '#14532d' },
        warning: { bg: '#fffbeb', border: '#fcd34d', ink: '#92400e' },
        danger: { bg: '#fef2f2', border: '#fca5a5', ink: '#991b1b' },
        info: { bg: '#f5f3ff', border: '#c4b5fd', ink: '#4c1d95' },
      }[level || 'info'] || {
        bg: '#f5f3ff',
        border: '#c4b5fd',
        ink: '#4c1d95',
      };

    const toast = document.createElement('div');
    toast.id = 'healthguard-amazon-toast';
    toast.style.cssText = [
      'position:fixed',
      'top:18px',
      'right:18px',
      'z-index:2147483647',
      'max-width:380px',
      `background:${colors.bg}`,
      `border:2px solid ${colors.border}`,
      `color:${colors.ink}`,
      'border-radius:12px',
      'padding:14px 16px',
      'box-shadow:0 12px 32px rgba(17,24,39,0.22)',
      'font-family:system-ui,-apple-system,sans-serif',
      'font-size:13.5px',
      'line-height:1.45',
    ].join(';');

    const header = document.createElement('div');
    header.style.cssText =
      'display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:6px;font-weight:700;font-size:14.5px;';

    const titleSpan = document.createElement('span');
    titleSpan.textContent = score != null ? `${title} (${score}/100)` : title;
    header.appendChild(titleSpan);

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.textContent = '×';
    closeBtn.title = 'Dismiss NutriCheck alert';
    closeBtn.style.cssText =
      'background:transparent;border:none;color:inherit;font-size:20px;cursor:pointer;line-height:1;padding:0 4px;';
    closeBtn.onclick = () => {
      toast.remove();
      try {
        chrome.runtime.sendMessage({ type: 'HEALTHGUARD_DISMISS_TOAST' });
      } catch {
        // Ignore if context invalidated
      }
    };
    header.appendChild(closeBtn);

    const body = document.createElement('p');
    body.style.cssText = 'margin:0 0 10px 0;';
    body.textContent = message;

    const actionsRow = document.createElement('div');
    actionsRow.style.cssText =
      'display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;';

    const linkBtn = document.createElement('button');
    linkBtn.type = 'button';
    linkBtn.textContent = 'Open in NutriCheck Website';
    linkBtn.style.cssText =
      'background:#059669;color:#ffffff;border:none;border-radius:6px;padding:7px 11px;font-size:12px;font-weight:600;cursor:pointer;';
    linkBtn.onclick = () => {
      chrome.runtime.sendMessage({
        type: 'HEALTHGUARD_OPEN_SITE',
        query: query || '',
      });
    };

    const hintSpan = document.createElement('span');
    hintSpan.textContent = 'Click × to dismiss';
    hintSpan.style.cssText = 'font-size:11px;opacity:0.75;';

    actionsRow.appendChild(linkBtn);
    actionsRow.appendChild(hintSpan);

    toast.appendChild(header);
    toast.appendChild(body);
    toast.appendChild(actionsRow);
    document.body.appendChild(toast);
  }

  // Restore any active toast after Amazon navigates (e.g. to /cart/smart-wagon)
  function restoreStoredToast() {
    if (!chrome?.storage?.local) return;
    chrome.storage.local.get(['lastHealthGuardToast'], (res) => {
      const saved = res?.lastHealthGuardToast;
      if (saved && (!saved.expiresAt || saved.expiresAt > Date.now())) {
        showHealthToast(saved);
      }
    });
  }

  if (chrome?.storage?.onChanged) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== 'local' || !changes.lastHealthGuardToast) return;
      const next = changes.lastHealthGuardToast.newValue;
      if (next && (!next.expiresAt || next.expiresAt > Date.now())) {
        showHealthToast(next);
      } else {
        removeExistingToast();
      }
    });
  }

  restoreStoredToast();

  document.addEventListener(
    'click',
    (event) => {
      const btn = isAddToCartElement(event.target);
      if (!btn) return;

      const productTitle = extractProductTitle(btn);
      if (!productTitle) return;

      const nutritionText = extractNutritionText();
      const { brand, barcode } = extractBrandAndBarcode();
      const productUrl = window.location.href;

      chrome.runtime.sendMessage(
        {
          type: 'HEALTHGUARD_ADD_TO_CART',
          payload: {
            product_title: productTitle,
            product_url: productUrl,
            nutrition_text: nutritionText,
            brand: brand || undefined,
            barcode: barcode || undefined,
            source: 'amazon_browser_extension',
          },
        },
        (response) => {
          if (chrome.runtime.lastError || !response) return;
          if (response.toast) {
            showHealthToast(response.toast);
          }
        }
      );
    },
    true
  );
})();
