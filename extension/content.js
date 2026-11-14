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
    if (target.closest('#ewc-content, #sc-subtotal-box, #gutterCartViewForm')) {
      return null;
    }

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

  const UI_CHROME_TITLE_RE =
    /^(?:subtotal|cart subtotal|your cart|shopping cart|proceed to (?:buy|checkout)|order summary|buy now|add to cart|added to cart|go to cart|see options|see all buying options|quick look|sponsored|sponsored ad|ad|best seller|amazon'?s choice|overall pick|limited time deal|deal of the day|delivery|free delivery|results|price|filters?|sort by|featured|loading\.*|amazon(?:\.[a-z.]+)?)$/i;

  function cleanExtractedTitle(raw) {
    if (!raw) return '';
    const cleaned = String(raw)
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!cleaned || cleaned.length < 3) return '';
    if (UI_CHROME_TITLE_RE.test(cleaned)) return '';
    if (/^subtotal\b/i.test(cleaned) || /\bcart subtotal\b/i.test(cleaned)) return '';
    if (/^[₹$€£]\s*[\d,.]+(?:\s*\([^)]+\))?$/.test(cleaned)) return '';
    if (/^\d+(?:\.\d+)?\s+out of\s+5\s+stars?$/i.test(cleaned)) return '';
    if (/^\(?[\d,]+(?:\s*ratings?)?\)?$/.test(cleaned)) return '';
    if (/^\d+(?:\.\d+)?\s*(?:g|gm|gms|kg|ml|l|ltr|oz|lb|pcs|count|pack)$/i.test(cleaned)) return '';
    if (
      /^\d+\s*-\s*\d+\s+of\s+(?:over\s+)?[\d,]+\s+results/i.test(cleaned) ||
      /\bsort by:\s*featured\b/i.test(cleaned) ||
      /\bprice:\s*low to high\b/i.test(cleaned)
    ) {
      return '';
    }
    return cleaned.slice(0, 260);
  }

  function findProductCard(clickedEl) {
    if (!clickedEl || !(clickedEl instanceof Element)) return null;
    const directCard = clickedEl.closest(
      '[data-component-type="s-search-result"], .s-result-item[data-asin]:not([data-asin=""]), [data-asin]:not([data-asin=""]), [data-csa-c-asin]:not([data-csa-c-asin=""]), li.a-carousel-card, .sc-list-item, .octopus-pc-item, [data-testid*="product-card"], [class*="ProductGridItem"]'
    );
    if (directCard) return directCard;

    // Fallback for Fresh / storefront tiles without data-asin on ancestor
    let node = clickedEl.parentElement;
    for (let depth = 0; depth < 8 && node; depth += 1) {
      if (
        node === document.body ||
        node === document.documentElement ||
        node.id === 'a-page' ||
        node.id === 'search' ||
        node.id === 'dp' ||
        node.id === 'ppd'
      ) {
        break;
      }
      const hasDpLink = node.querySelector('a[href*="/dp/"], a[href*="/gp/product/"]');
      const hasAsinInput = node.querySelector('input[name="asin"], input[name="ASIN"]');
      const rect = node.getBoundingClientRect();
      if ((hasDpLink || hasAsinInput) && rect.width > 80 && rect.width < 900) {
        return node;
      }
      node = node.parentElement;
    }
    return null;
  }

  function extractAsinFromElement(el) {
    if (!el || !(el instanceof Element)) return '';
    const attrs = [
      el.getAttribute('data-asin'),
      el.getAttribute('data-csa-c-asin'),
      el.getAttribute('data-csa-c-item-id'),
    ];
    for (const val of attrs) {
      if (!val) continue;
      const m = val.match(/\b(B[0-9A-Z]{9}|[0-9]{10})\b/);
      if (m) return m[1];
    }
    const asinInput = el.querySelector('input[name="asin"], input[name="ASIN"]');
    if (asinInput && /^[A-Z0-9]{10}$/i.test((asinInput.value || '').trim())) {
      return asinInput.value.trim();
    }
    return '';
  }

  function extractProductLinkFromCard(card, clickedEl) {
    const scope = card || clickedEl?.closest('form, .a-section, li, div');
    if (scope) {
      const links = scope.querySelectorAll('a[href*="/dp/"], a[href*="/gp/product/"]');
      for (const link of links) {
        const href = link.getAttribute('href') || '';
        if (href && !href.startsWith('#')) {
          try {
            return new URL(href, window.location.origin).href;
          } catch {
            // continue
          }
        }
      }
      const asin = extractAsinFromElement(scope) || extractAsinFromElement(clickedEl);
      if (asin) {
        return `${window.location.origin}/dp/${asin}`;
      }
    }
    const btnFormAsin = extractAsinFromElement(clickedEl?.closest('form'));
    if (btnFormAsin) {
      return `${window.location.origin}/dp/${btnFormAsin}`;
    }
    return null;
  }

  function pickBestTitleFromCard(card, clickedEl) {
    if (!card) return '';

    const candidates = [];
    const pushCandidate = (raw, bonus = 0) => {
      const t = cleanExtractedTitle(raw);
      if (!t) return;
      candidates.push({ text: t, score: Math.min(t.length, 120) + bonus });
    };

    card.querySelectorAll('h2[aria-label]').forEach((el) => {
      pushCandidate(el.getAttribute('aria-label'), 40);
    });

    const selectors = [
      '[data-cy="title-recipe"] h2 span',
      '[data-cy="title-recipe"] h2',
      '[data-cy="title-recipe"] a span',
      'h2 a span',
      'a h2 span',
      'h2 span',
      'h2',
      'h3 a span',
      'h3 span',
      '.a-truncate-full',
      '.s-line-clamp-2 span',
      '.a-size-medium.a-color-base.a-text-normal',
      '.a-size-base-plus.a-color-base.a-text-normal',
      'a[href*="/dp/"][title]',
      'a[href*="/dp/"] span',
      'a[href*="/dp/"]',
    ];
    for (let i = 0; i < selectors.length; i += 1) {
      const bonus = Math.max(0, 30 - i * 2);
      card.querySelectorAll(selectors[i]).forEach((el) => {
        if (selectors[i].endsWith('[title]')) {
          pushCandidate(el.getAttribute('title'), bonus);
        } else {
          pushCandidate(el.textContent || el.innerText, bonus);
        }
      });
    }

    card.querySelectorAll('img.s-image[alt], img[alt]').forEach((img) => {
      const alt = (img.getAttribute('alt') || '').replace(/^sponsored ad\s*-\s*/i, '');
      pushCandidate(alt, 5);
    });

    if (clickedEl) {
      const btnAria = clickedEl.getAttribute('aria-label') || '';
      if (btnAria && !/^add to cart$/i.test(btnAria.trim())) {
        pushCandidate(btnAria.replace(/^add\s+to\s+cart\s*(?:for)?\s*/i, ''), 20);
      }
    }

    if (!candidates.length) return '';
    candidates.sort((a, b) => b.score - a.score);
    return candidates[0].text;
  }

  function extractProductTitleFromDoc(doc, card, clickedEl) {
    if (card) {
      const cardTitle = pickBestTitleFromCard(card, clickedEl);
      if (cardTitle) return cardTitle;
    }

    if (clickedEl) {
      const btnAria = clickedEl.getAttribute('aria-label') || '';
      if (btnAria && !/^add to cart$/i.test(btnAria.trim())) {
        const stripped = cleanExtractedTitle(
          btnAria.replace(/^add\s+to\s+cart\s*(?:for)?\s*/i, '')
        );
        if (stripped) return stripped;
      }
    }

    // Only match actual Amazon product detail title containers (NEVER bare #title which matches side-cart Subtotal!)
    const pageTitle = doc.querySelector(
      '#productTitle, #titleSection #title, #centerCol #title, h1#title'
    );
    if (pageTitle) {
      const t = cleanExtractedTitle(pageTitle.textContent || pageTitle.innerText);
      if (t) return t;
    }

    const docTitle = cleanExtractedTitle(
      (doc.title || '')
        .replace(/^Amazon\.[^:]+:\s*/i, '')
        .replace(/\s*:\s*(?:Grocery|Amazon\.[^:]+).*$/i, '')
    );
    if (docTitle) return docTitle;

    return '';
  }

  function extractBrandAndBarcodeFromDoc(doc) {
    let brand = '';
    const byline = doc.querySelector('#bylineInfo, #brand');
    if (byline) {
      brand = (byline.innerText || byline.textContent || '')
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
    ];

    for (const sel of candidateSelectors) {
      doc.querySelectorAll(sel).forEach((el) => {
        const text = (el.innerText || el.textContent || '')
          .replace(/<[^>]*>/g, ' ')
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

    doc.querySelectorAll('#productFactsDesktopExpander table, #productDetails_techSpec_section_1 table, #important-information table, #aplus table').forEach((tbl) => {
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

    doc.querySelectorAll('#aplus img[alt], #important-information img[alt]').forEach((img) => {
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

  function captureClickSnapshot(btn) {
    const card = findProductCard(btn);
    const inMainBuyBox = Boolean(
      btn.closest('#ppd, #centerCol, #buybox, #desktop_buybox, #addToCart, #exports_desktop_qualifiedBuybox')
    );
    const isMainDetailPage = Boolean(document.querySelector('#productTitle')) && (!card || inMainBuyBox);
    const initialTitle = extractProductTitleFromDoc(
      document,
      isMainDetailPage ? null : card,
      btn
    );
    const dpUrl = isMainDetailPage ? window.location.href : extractProductLinkFromCard(card, btn);
    return {
      isMainDetailPage,
      initialTitle,
      dpUrl,
    };
  }

  async function resolveProductDetails(snapshot) {
    let productTitle = snapshot.initialTitle;
    let productUrl = snapshot.dpUrl || window.location.href;
    let nutritionText = '';
    let ingredientsText = '';
    let meta = { brand: '', barcode: '' };

    if (snapshot.isMainDetailPage) {
      const extractedCurrent = extractIngredientsAndNutritionFromDoc(document);
      nutritionText = extractedCurrent.nutritionText;
      ingredientsText = extractedCurrent.ingredientsText;
      meta = extractBrandAndBarcodeFromDoc(document);
    } else if (snapshot.dpUrl) {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 3500);
        const res = await fetch(snapshot.dpUrl, {
          credentials: 'same-origin',
          signal: ctrl.signal,
        });
        clearTimeout(timer);
        if (res.ok) {
          const html = await res.text();
          const parsedDoc = new DOMParser().parseFromString(html, 'text/html');
          const fetchedTitle = extractProductTitleFromDoc(parsedDoc, null, null);
          if (fetchedTitle && fetchedTitle.length >= (productTitle || '').length * 0.6) {
            productTitle = fetchedTitle;
          }
          const fetchedData = extractIngredientsAndNutritionFromDoc(parsedDoc);
          nutritionText = fetchedData.nutritionText;
          ingredientsText = fetchedData.ingredientsText;
          meta = extractBrandAndBarcodeFromDoc(parsedDoc);
        }
      } catch {
        // Ignore network/timeout errors and use synchronous card title + ASIN fallback
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
      const snapshot = captureClickSnapshot(btn);
      if (!snapshot.initialTitle && !snapshot.dpUrl) return;

      void (async () => {
        const details = await resolveProductDetails(snapshot);
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
