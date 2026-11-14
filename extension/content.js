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

  const NUTRITION_REGEX =
    /calori|energy|sugar|sodium|salt|protein|fat|nutrition|kcal|carbohydrate|carbs/i;
  const INGREDIENT_REGEX = /\bingredients?\b|\bcontains\b|\ballergen/i;

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

  function extractProductLinkFromCard(clickedEl) {
    const card = clickedEl.closest('[data-asin]');
    if (!card) return null;
    const link = card.querySelector('a[href*="/dp/"], a[href*="/gp/product/"]');
    if (!link) return null;
    try {
      return new URL(link.getAttribute('href'), window.location.origin).href;
    } catch {
      return null;
    }
  }

  function extractProductTitleFromDoc(doc, clickedEl) {
    if (clickedEl) {
      const card = clickedEl.closest('[data-asin]');
      if (card) {
        const cardTitle = card.querySelector(
          'h2 a span, h2 span, [data-cy="title-recipe"] span, .a-size-medium, .a-size-base-plus'
        );
        if (cardTitle && cardTitle.textContent.trim()) {
          return cardTitle.textContent.trim();
        }
      }
    }

    const pageTitle =
      doc.querySelector('#productTitle') ||
      doc.querySelector('#title') ||
      doc.querySelector('h1');
    if (pageTitle && pageTitle.textContent.trim()) {
      return pageTitle.textContent.trim();
    }

    return (doc.title || document.title)
      .replace(/^Amazon\.[^:]+:\s*/i, '')
      .trim();
  }

  function extractBrandAndBarcodeFromDoc(doc) {
    let brand = '';
    const byline = doc.querySelector('#bylineInfo, #brand');
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
      '#productFactsDesktopExpander',
    ];
    for (const sel of detailRoots) {
      const el = doc.querySelector(sel);
      if (!el) continue;
      const txt = (el.innerText || el.textContent || '').trim();
      if (!txt) continue;
      const m = txt.match(
        /(?:EAN|UPC|GTIN|Barcode)\s*[:\s\-]*([0-9]{8,14})/i
      );
      if (m) {
        barcode = m[1];
        break;
      }
    }
    return { brand, barcode };
  }

  function extractIngredientsAndNutritionFromDoc(doc) {
    const nutritionChunks = [];
    const ingredientChunks = [];

    const candidateSelectors = [
      '#important-information',
      '[data-feature-name="importantInformation"]',
      '#productFactsDesktopExpander',
      '#productDetails_techSpec_section_1',
      '#productDetails_detailBullets_sections1',
      '#detailBullets_feature_div',
      '#productOverview_feature_div',
      '#feature-bullets',
      '#productDescription',
      '#aplus',
      '#aplus_feature_div',
      '#vital-info',
      '.a-expander-content',
    ];

    for (const sel of candidateSelectors) {
      doc.querySelectorAll(sel).forEach((el) => {
        const text = (el.innerText || el.textContent || '')
          .replace(/\s+/g, ' ')
          .trim();
        if (!text) return;
        if (NUTRITION_REGEX.test(text)) {
          nutritionChunks.push(text.slice(0, 2200));
        }
        if (INGREDIENT_REGEX.test(text)) {
          const ingMatch = text.match(
            /ingredients?\s*[:\-]?\s*([^]{3,1200}?)(?:\bdirections\b|\blegal disclaimer\b|\bnutrition\b|\ballergen\b|\bstorage\b|$)/i
          );
          if (ingMatch && ingMatch[1]) {
            ingredientChunks.push(`Ingredients: ${ingMatch[1].trim()}`);
          } else {
            ingredientChunks.push(text.slice(0, 1000));
          }
        }
      });
    }

    doc.querySelectorAll('table').forEach((tbl) => {
      const t = (tbl.innerText || tbl.textContent || '')
        .replace(/\s+/g, ' ')
        .trim();
      if (!t) return;
      if (NUTRITION_REGEX.test(t)) {
        nutritionChunks.push(t.slice(0, 1500));
      }
      if (INGREDIENT_REGEX.test(t)) {
        ingredientChunks.push(t.slice(0, 1200));
      }
    });

    doc.querySelectorAll('img[alt]').forEach((img) => {
      const alt = (img.getAttribute('alt') || '').trim();
      if (!alt) return;
      if (NUTRITION_REGEX.test(alt)) nutritionChunks.push(alt.slice(0, 800));
      if (INGREDIENT_REGEX.test(alt)) ingredientChunks.push(alt.slice(0, 800));
    });

    return {
      nutritionText: Array.from(new Set(nutritionChunks)).join('\n').slice(0, 6000),
      ingredientsText: Array.from(new Set(ingredientChunks)).join('\n').slice(0, 3500),
    };
  }

  async function resolveProductDetails(btn) {
    let targetDoc = document;
    let productTitle = extractProductTitleFromDoc(document, btn);
    let productUrl = window.location.href;

    const extractedCurrent = extractIngredientsAndNutritionFromDoc(document);
    let nutritionText = extractedCurrent.nutritionText;
    let ingredientsText = extractedCurrent.ingredientsText;
    let meta = extractBrandAndBarcodeFromDoc(document);

    // If clicked on an Amazon search card without full product HTML, fetch the /dp/ page
    if (!nutritionText && !ingredientsText) {
      const dpUrl = extractProductLinkFromCard(btn);
      if (dpUrl) {
        productUrl = dpUrl;
        try {
          const ctrl = new AbortController();
          const timer = setTimeout(() => ctrl.abort(), 2500);
          const res = await fetch(dpUrl, {
            credentials: 'same-origin',
            signal: ctrl.signal,
          });
          clearTimeout(timer);
          if (res.ok) {
            const html = await res.text();
            const parsedDoc = new DOMParser().parseFromString(html, 'text/html');
            targetDoc = parsedDoc;
            const fetchedTitle = extractProductTitleFromDoc(targetDoc, null);
            if (fetchedTitle && fetchedTitle.length > 2) {
              productTitle = fetchedTitle;
            }
            const fetchedData = extractIngredientsAndNutritionFromDoc(targetDoc);
            nutritionText = fetchedData.nutritionText;
            ingredientsText = fetchedData.ingredientsText;
            meta = extractBrandAndBarcodeFromDoc(targetDoc);
          }
        } catch {
          // Ignore network/timeout errors and proceed with title lookup
        }
      }
    }

    return {
      productTitle,
      productUrl,
      nutritionText,
      ingredientsText,
      brand: meta.brand,
      barcode: meta.barcode,
    };
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
        info: { bg: '#ecfdf5', border: '#a7f3d0', ink: '#047857' },
      }[level || 'info'] || {
        bg: '#ecfdf5',
        border: '#a7f3d0',
        ink: '#047857',
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

      void (async () => {
        const details = await resolveProductDetails(btn);
        if (!details.productTitle) return;

        chrome.runtime.sendMessage(
          {
            type: 'HEALTHGUARD_ADD_TO_CART',
            payload: {
              product_title: details.productTitle,
              product_url: details.productUrl,
              nutrition_text: details.nutritionText,
              ingredients_text: details.ingredientsText,
              brand: details.brand || undefined,
              barcode: details.barcode || undefined,
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
      })();
    },
    true
  );
})();
