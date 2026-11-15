(function () {
  function detectPlatform(hostname) {
    const h = (hostname || window.location.hostname || '').toLowerCase();
    const p = (window.location.pathname || '').toLowerCase();
    if (h.includes('amazon.')) return 'Amazon';
    if (h.includes('flipkart.')) return 'Flipkart';
    if (h.includes('swiggy.')) return p.includes('instamart') ? 'Swiggy Instamart' : 'Swiggy';
    if (h.includes('zomato.')) return 'Zomato';
    if (h.includes('blinkit.')) return 'Blinkit';
    return 'Online Store';
  }

  const AMAZON_ADD_TO_CART_SELECTORS = [
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

  const UI_CHROME_TITLE_RE =
    /^(?:subtotal|cart subtotal|your cart|shopping cart|proceed to (?:buy|checkout)|order summary|buy now|add to cart|added to cart|go to cart|see options|see all buying options|quick look|sponsored|sponsored ad|ad|best seller|amazon'?s choice|overall pick|limited time deal|deal of the day|delivery|free delivery|results|price|filters?|sort by|featured|loading\.*|amazon(?:\.[a-z.]+)?|flipkart|swiggy|instamart|zomato|blinkit|add|add item|customisable|customizable)$/i;

  function cleanExtractedTitle(raw) {
    if (!raw) return '';
    const cleaned = String(raw)
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!cleaned || cleaned.length < 2) return '';
    if (UI_CHROME_TITLE_RE.test(cleaned)) return '';
    if (/^subtotal\b/i.test(cleaned) || /\bcart subtotal\b/i.test(cleaned)) return '';
    if (/^[₹$€£]\s*[\d,.]+(?:\s*\([^)]+\))?$/.test(cleaned)) return '';
    if (/^\d+(?:\.\d+)?\s+out of\s+5\s+stars?$/i.test(cleaned)) return '';
    if (/^\(?[\d,]+(?:\s*ratings?|\s*votes?)?\)?$/.test(cleaned)) return '';
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

  function isAddToCartElement(target) {
    if (!target || !(target instanceof Element)) return null;
    if (target.closest('#nutricheck-floating-card, #nutricheck-scan-fab')) return null;

    const platform = detectPlatform();
    if (platform === 'Amazon') {
      if (target.closest('#ewc-content, #sc-subtotal-box, #gutterCartViewForm')) {
        return null;
      }
      const direct = target.closest(AMAZON_ADD_TO_CART_SELECTORS);
      if (direct) return direct;
    }

    const btn = target.closest('button, input[type="submit"], [role="button"], a[role="button"]');
    if (!btn) return null;

    const label = (
      btn.textContent ||
      btn.getAttribute('aria-label') ||
      btn.getAttribute('value') ||
      ''
    )
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();

    if (!label) return null;

    if (
      /\b(address|coupon|promo|tip|note|filter|sort|rating|veg only|bestseller|wishlist|compare|share|cancel|close|view cart|go to cart|checkout|proceed)\b/i.test(
        label
      )
    ) {
      return null;
    }

    if (
      label === 'add to cart' ||
      label.startsWith('add to cart') ||
      label === 'add item' ||
      label.startsWith('add item') ||
      label === 'add +' ||
      label === 'add'
    ) {
      return btn;
    }

    if (platform === 'Swiggy' || platform === 'Swiggy Instamart' || platform === 'Zomato' || platform === 'Blinkit') {
      if (/^add(?:\s*\+)?(?:\s*to\s*(?:cart|bag))?(?:\s*customisable)?$/i.test(label)) {
        return btn;
      }
    }

    return null;
  }

  /* ---------------- Amazon Helpers ---------------- */
  function findAmazonCard(clickedEl) {
    const directCard = clickedEl.closest(
      '[data-component-type="s-search-result"], .s-result-item[data-asin]:not([data-asin=""]), [data-asin]:not([data-asin=""]), [data-csa-c-asin]:not([data-csa-c-asin=""]), li.a-carousel-card, .sc-list-item, .octopus-pc-item, [data-testid*="product-card"], [class*="ProductGridItem"]'
    );
    if (directCard) return directCard;

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

  function extractAmazonLinkFromCard(card, clickedEl) {
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
      if (asin) return `${window.location.origin}/dp/${asin}`;
    }
    const btnFormAsin = extractAsinFromElement(clickedEl?.closest('form'));
    if (btnFormAsin) return `${window.location.origin}/dp/${btnFormAsin}`;
    return null;
  }

  function pickAmazonTitleFromCard(card, clickedEl) {
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

  /* ---------------- Flipkart / Swiggy / Zomato / Blinkit Helpers ---------------- */
  function findGenericCard(clickedEl, platform) {
    if (!clickedEl) return null;

    if (platform === 'Flipkart') {
      const direct = clickedEl.closest('[data-id], .slAVV4, ._1xHGtK, .tUxRFH, .cPHDOP');
      if (direct) return direct;
    }

    if (platform === 'Swiggy' || platform === 'Swiggy Instamart') {
      const direct = clickedEl.closest(
        '[data-testid="normal-dish-item"], [data-testid="recommended-dish-item"], [data-testid*="dish"], [data-testid*="item-card"], [data-testid*="product-card"], [role="dialog"]'
      );
      if (direct) return direct;
    }

    if (platform === 'Zomato') {
      const direct = clickedEl.closest('[class*="sc-"][class*="item"], li, [role="dialog"]');
      if (direct && (direct.querySelector('h4, h3, h2, p') || (direct.textContent || '').length < 450)) {
        return direct;
      }
    }

    let node = clickedEl.parentElement;
    for (let depth = 0; depth < 7 && node; depth += 1) {
      if (node === document.body || node === document.documentElement) break;
      const rect = node.getBoundingClientRect();
      const textLen = (node.textContent || '').trim().length;
      const hasHeadingOrImg = Boolean(
        node.querySelector('h1, h2, h3, h4, img[alt], a[href*="/p/"], a[href*="/prn/"]')
      );
      if (hasHeadingOrImg && rect.width > 120 && rect.height < 520 && textLen > 6 && textLen < 900) {
        return node;
      }
      node = node.parentElement;
    }
    return null;
  }

  function extractTitleFromGenericCard(card, clickedEl, platform) {
    if (!card) return '';
    const candidates = [];
    const push = (raw, bonus = 0) => {
      const t = cleanExtractedTitle(raw);
      if (!t) return;
      candidates.push({ text: t, score: Math.min(t.length, 100) + bonus });
    };

    const selectors =
      platform === 'Flipkart'
        ? ['a.wjcEIp', 'a.s1Q9rs', '.KzDlHZ', 'a[title]', 'a[href*="/p/"]', 'h2', 'h3']
        : platform === 'Swiggy' || platform === 'Swiggy Instamart'
        ? [
            '[data-testid*="item-name"]',
            '[class*="itemName"]',
            '[class*="ProductName"]',
            'h3',
            'h2',
            'h4',
            '[aria-hidden="false"]',
            'div[class*="Title"]',
          ]
        : platform === 'Zomato'
        ? ['h4', 'h3', 'h2', '[class*="title"]', 'img[alt]']
        : ['[class*="ProductTitle"]', '[class*="name"]', 'h3', 'h4', 'h2', 'img[alt]'];

    for (let i = 0; i < selectors.length; i += 1) {
      const bonus = Math.max(0, 32 - i * 3);
      card.querySelectorAll(selectors[i]).forEach((el) => {
        if (selectors[i] === 'a[title]') {
          push(el.getAttribute('title'), bonus);
        } else if (selectors[i] === 'img[alt]') {
          push(el.getAttribute('alt'), bonus);
        } else {
          push(el.textContent || el.innerText, bonus);
        }
      });
    }

    card.querySelectorAll('img[alt]').forEach((img) => {
      push(img.getAttribute('alt'), 4);
    });

    if (clickedEl) {
      const aria = clickedEl.getAttribute('aria-label') || '';
      if (aria && !/^add(?:\s+to\s+cart)?$/i.test(aria.trim())) {
        push(aria.replace(/^add\s+(?:to\s+cart\s*(?:for)?|item)?\s*/i, ''), 22);
      }
    }

    if (!candidates.length) return '';
    candidates.sort((a, b) => b.score - a.score);
    return candidates[0].text;
  }

  function extractDishDescriptionFromCard(card) {
    if (!card) return '';
    const pieces = [];
    card.querySelectorAll('p, [class*="desc"], [class*="Desc"], [data-testid*="description"]').forEach((el) => {
      const t = (el.textContent || '').replace(/\s+/g, ' ').trim();
      if (t && t.length >= 10 && t.length <= 400 && !/^[₹$]\s*\d/.test(t)) {
        pieces.push(t);
      }
    });
    const combined = Array.from(new Set(pieces)).join('. ').trim();
    if (!combined) return '';
    return `Ingredients / Dish notes: ${combined}`;
  }

  function extractProductLinkGeneric(card, platform) {
    if (card && platform === 'Flipkart') {
      const a = card.querySelector('a[href*="/p/"]');
      if (a) {
        try {
          return new URL(a.getAttribute('href'), window.location.origin).href;
        } catch {
          // ignore
        }
      }
    }
    return window.location.href;
  }

  /* ---------------- Shared Document Extraction ---------------- */
  function extractProductTitleFromDoc(doc, card, clickedEl, platform) {
    if (platform === 'Amazon') {
      if (card) {
        const cardTitle = pickAmazonTitleFromCard(card, clickedEl);
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
      const pageTitle = doc.querySelector(
        '#productTitle, #titleSection #title, #centerCol #title, h1#title'
      );
      if (pageTitle) {
        const t = cleanExtractedTitle(pageTitle.textContent || pageTitle.innerText);
        if (t) return t;
      }
    } else {
      if (card) {
        const cardTitle = extractTitleFromGenericCard(card, clickedEl, platform);
        if (cardTitle) return cardTitle;
      }
      const detailHeading = doc.querySelector(
        'h1.VU-ZEz, span.VU-ZEz, span.B_NuCI, h1[class*="Title"], h1'
      );
      if (detailHeading) {
        const t = cleanExtractedTitle(detailHeading.textContent || detailHeading.innerText);
        if (t) return t;
      }
    }

    const docTitle = cleanExtractedTitle(
      (doc.title || '')
        .replace(/^Amazon\.[^:]+:\s*/i, '')
        .replace(/\s*[-|:]\s*(?:Buy|Order|Flipkart|Amazon|Swiggy|Zomato|Blinkit).*$/i, '')
    );
    return docTitle || '';
  }

  function extractBrandAndBarcodeFromDoc(doc) {
    let brand = '';
    const byline = doc.querySelector('#bylineInfo, #brand, .m97_f9, [class*="Brand"]');
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
      '._1UhVsV',
      'table',
    ];
    for (const sel of detailRoots) {
      const el = doc.querySelector(sel);
      if (!el) continue;
      const txt = (el.innerText || el.textContent || '').trim();
      if (!txt) continue;
      const m = txt.match(/(?:EAN|UPC|GTIN|Barcode)\s*[:\s\-]*([0-9]{8,14})/i);
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
      // Flipkart & Instamart & Blinkit sections
      '.cPHDOP',
      '._1UhVsV',
      '.X3BRps',
      '.yN\\+eNk',
      '[class*="Ingredient"]',
      '[class*="ingredient"]',
      '[class*="Nutrition"]',
      '[class*="nutrition"]',
      '[class*="Description"]',
      '[data-testid*="product-description"]',
      '[data-testid*="highlights"]',
      '[role="dialog"]',
      'main table',
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

    doc.querySelectorAll('table').forEach((tbl) => {
      const t = (tbl.innerText || tbl.textContent || '').replace(/\s+/g, ' ').trim();
      if (!t || t.length > 2600) return;
      if (NUTRITION_REGEX.test(t)) nutritionChunks.push(t.slice(0, 1500));
      if (INGREDIENT_REGEX.test(t)) ingredientChunks.push(t.slice(0, 1200));
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

  function isProductDetailPage(platform) {
    const p = window.location.pathname.toLowerCase();
    if (platform === 'Amazon') {
      return Boolean(document.querySelector('#productTitle')) || /\/(?:dp|gp\/product)\//.test(p);
    }
    if (platform === 'Flipkart') {
      return p.includes('/p/') || Boolean(document.querySelector('span.VU-ZEz, h1.VU-ZEz'));
    }
    if (platform === 'Swiggy Instamart' || platform === 'Blinkit') {
      return p.includes('/item/') || p.includes('/prn/') || Boolean(document.querySelector('[class*="ProductDetail"], h1'));
    }
    return false;
  }

  function captureClickSnapshot(btn) {
    const platform = detectPlatform();
    if (platform === 'Amazon') {
      const card = findAmazonCard(btn);
      const inMainBuyBox = Boolean(
        btn.closest('#ppd, #centerCol, #buybox, #desktop_buybox, #addToCart, #exports_desktop_qualifiedBuybox')
      );
      const isMainDetailPage = Boolean(document.querySelector('#productTitle')) && (!card || inMainBuyBox);
      const initialTitle = extractProductTitleFromDoc(
        document,
        isMainDetailPage ? null : card,
        btn,
        platform
      );
      const dpUrl = isMainDetailPage ? window.location.href : extractAmazonLinkFromCard(card, btn);
      return {
        platform,
        isMainDetailPage,
        initialTitle,
        dpUrl,
        cardNotes: '',
      };
    }

    const card = findGenericCard(btn, platform);
    const detailPage = isProductDetailPage(platform) && !card;
    const initialTitle = extractProductTitleFromDoc(
      document,
      detailPage ? null : card,
      btn,
      platform
    );
    const dpUrl = detailPage ? window.location.href : extractProductLinkGeneric(card, platform);
    const cardNotes = card ? extractDishDescriptionFromCard(card) : '';

    return {
      platform,
      isMainDetailPage: detailPage,
      initialTitle,
      dpUrl,
      cardNotes,
    };
  }

  async function resolveProductDetails(snapshot) {
    let productTitle = snapshot.initialTitle;
    const productUrl = snapshot.dpUrl || window.location.href;
    let nutritionText = '';
    let ingredientsText = snapshot.cardNotes || '';
    let meta = { brand: '', barcode: '' };

    if (snapshot.isMainDetailPage) {
      const extractedCurrent = extractIngredientsAndNutritionFromDoc(document);
      nutritionText = extractedCurrent.nutritionText;
      if (extractedCurrent.ingredientsText) {
        ingredientsText = extractedCurrent.ingredientsText;
      }
      meta = extractBrandAndBarcodeFromDoc(document);
    } else if (
      snapshot.dpUrl &&
      snapshot.dpUrl !== window.location.href &&
      (snapshot.platform === 'Amazon' || snapshot.platform === 'Flipkart')
    ) {
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
          const fetchedTitle = extractProductTitleFromDoc(parsedDoc, null, null, snapshot.platform);
          if (fetchedTitle && fetchedTitle.length >= (productTitle || '').length * 0.6) {
            productTitle = fetchedTitle;
          }
          const fetchedData = extractIngredientsAndNutritionFromDoc(parsedDoc);
          nutritionText = fetchedData.nutritionText;
          if (fetchedData.ingredientsText) {
            ingredientsText = fetchedData.ingredientsText;
          }
          meta = extractBrandAndBarcodeFromDoc(parsedDoc);
        }
      } catch {
        // Fallback to card title & lookup
      }
    }

    return {
      platform: snapshot.platform,
      productTitle,
      productUrl,
      nutritionText,
      ingredientsText,
      brand: meta.brand,
      barcode: meta.barcode,
    };
  }

  /* ---------------- Natural Yellow & White Easy Floating Card ---------------- */
  function removeExistingToast() {
    const existing = document.getElementById('nutricheck-floating-card');
    if (existing) existing.remove();
    const oldLegacy = document.getElementById('healthguard-amazon-toast');
    if (oldLegacy) oldLegacy.remove();
  }

  function showHealthToast(toastData) {
    if (!toastData) return;
    if (toastData.expiresAt && toastData.expiresAt < Date.now()) {
      removeExistingToast();
      return;
    }

    removeExistingToast();

    const {
      level,
      verdict,
      productName,
      platform,
      takeaway,
      message,
      score,
      macros,
      ingredientSummary,
      query,
    } = toastData;

    const badgeStyle =
      level === 'success'
        ? { bg: '#f0fdf4', border: '#bbf7d0', ink: '#15803d', dot: '#16a34a' }
        : level === 'danger'
        ? { bg: '#fef2f2', border: '#fecaca', ink: '#b91c1c', dot: '#dc2626' }
        : level === 'warning'
        ? { bg: '#fffbeb', border: '#fde68a', ink: '#b45309', dot: '#d97706' }
        : { bg: '#fefce8', border: '#eab308', ink: '#854d0e', dot: '#eab308' };

    const card = document.createElement('div');
    card.id = 'nutricheck-floating-card';
    card.style.cssText = [
      'position:fixed',
      'top:16px',
      'right:16px',
      'z-index:2147483647',
      'width:344px',
      'max-width:calc(100vw - 24px)',
      'background:#ffffff',
      'border:1.5px solid #eab308',
      'border-radius:12px',
      'box-shadow:0 12px 32px rgba(28,25,23,0.16)',
      'font-family:system-ui,-apple-system,Segoe UI,sans-serif',
      'color:#1c1917',
      'overflow:hidden',
    ].join(';');

    // Warm yellow top bar
    const topBar = document.createElement('div');
    topBar.style.cssText =
      'background:#fefce8;border-bottom:1px solid #efe5bd;padding:10px 14px;display:flex;align-items:center;justify-content:space-between;gap:8px;';

    const brandWrap = document.createElement('div');
    brandWrap.style.cssText = 'display:flex;align-items:center;gap:6px;font-size:12px;font-weight:700;color:#854d0e;';
    brandWrap.textContent = `NutriCheck · ${platform || 'Store Check'}`;
    topBar.appendChild(brandWrap);

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.textContent = '×';
    closeBtn.title = 'Close';
    closeBtn.style.cssText =
      'background:transparent;border:none;color:#57534e;font-size:19px;cursor:pointer;line-height:1;padding:0 4px;';
    closeBtn.onclick = () => {
      card.remove();
      try {
        chrome.runtime.sendMessage({ type: 'HEALTHGUARD_DISMISS_TOAST' });
      } catch {
        // ignore
      }
    };
    topBar.appendChild(closeBtn);
    card.appendChild(topBar);

    const body = document.createElement('div');
    body.style.cssText = 'padding:12px 14px;';

    // Title + Verdict Row
    const titleRow = document.createElement('div');
    titleRow.style.cssText = 'display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:8px;';

    const nameEl = document.createElement('div');
    nameEl.textContent = productName || toastData.title || 'Food Item';
    nameEl.style.cssText =
      'font-size:13.5px;font-weight:700;color:#1c1917;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;';
    titleRow.appendChild(nameEl);

    const pill = document.createElement('div');
    pill.style.cssText = `flex-shrink:0;padding:4px 8px;border-radius:6px;background:${badgeStyle.bg};border:1px solid ${badgeStyle.border};color:${badgeStyle.ink};font-size:12px;font-weight:700;white-space:nowrap;`;
    pill.textContent =
      score != null ? `${verdict || 'Score'} · ${score}` : verdict || 'Checking...';
    titleRow.appendChild(pill);
    body.appendChild(titleRow);

    // 1-line easy takeaway
    const summaryEl = document.createElement('p');
    summaryEl.textContent = takeaway || message || '';
    summaryEl.style.cssText = 'margin:0 0 10px 0;font-size:12.5px;color:#44403c;line-height:1.45;';
    body.appendChild(summaryEl);

    // Compact 4-cell mini nutrition strip
    if (macros && macros.calories != null) {
      const strip = document.createElement('div');
      strip.style.cssText =
        'display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:10px;background:#fffef7;border:1px solid #efe5bd;border-radius:8px;padding:8px 6px;text-align:center;';

      const metrics = [
        ['Calories', `${Math.round(macros.calories)}`],
        ['Sugar', `${macros.sugars}g`],
        ['Fat', `${macros.fat}g`],
        ['Protein', `${macros.protein}g`],
      ];
      for (const [k, v] of metrics) {
        const cell = document.createElement('div');
        const lbl = document.createElement('div');
        lbl.textContent = k;
        lbl.style.cssText = 'font-size:10px;color:#78716c;font-weight:600;';
        const val = document.createElement('div');
        val.textContent = v;
        val.style.cssText = 'font-size:12.5px;color:#1c1917;font-weight:700;margin-top:2px;';
        cell.appendChild(lbl);
        cell.appendChild(val);
        strip.appendChild(cell);
      }
      body.appendChild(strip);
    }

    // Visual Good vs Bad Ingredient bar + up to 4 clear chips
    if (ingredientSummary && ingredientSummary.total > 0) {
      const { goodCount, modCount, badCount, total, highlights } = ingredientSummary;
      const barWrap = document.createElement('div');
      barWrap.style.cssText = 'margin-bottom:10px;';

      const barLabel = document.createElement('div');
      barLabel.style.cssText = 'font-size:11px;font-weight:700;color:#57534e;margin-bottom:4px;display:flex;justify-content:space-between;';
      barLabel.textContent = `Packet Ingredients (${goodCount} good · ${modCount + badCount} to watch)`;
      barWrap.appendChild(barLabel);

      const bar = document.createElement('div');
      bar.style.cssText = 'height:7px;border-radius:4px;overflow:hidden;display:flex;background:#f5f5f4;margin-bottom:7px;';
      if (goodCount > 0) {
        const seg = document.createElement('div');
        seg.style.cssText = `width:${(goodCount / total) * 100}%;background:#16a34a;`;
        bar.appendChild(seg);
      }
      if (modCount > 0) {
        const seg = document.createElement('div');
        seg.style.cssText = `width:${(modCount / total) * 100}%;background:#d97706;`;
        bar.appendChild(seg);
      }
      if (badCount > 0) {
        const seg = document.createElement('div');
        seg.style.cssText = `width:${(badCount / total) * 100}%;background:#dc2626;`;
        bar.appendChild(seg);
      }
      barWrap.appendChild(bar);

      if (Array.isArray(highlights) && highlights.length > 0) {
        const chipsRow = document.createElement('div');
        chipsRow.style.cssText = 'display:flex;flex-wrap:wrap;gap:5px;';
        for (const item of highlights.slice(0, 4)) {
          const chip = document.createElement('span');
          const c =
            item.rating === 'good'
              ? { bg: '#f0fdf4', fg: '#15803d', bd: '#bbf7d0', prefix: '✓ ' }
              : item.rating === 'moderate'
              ? { bg: '#fffbeb', fg: '#b45309', bd: '#fde68a', prefix: '! ' }
              : { bg: '#fef2f2', fg: '#b91c1c', bd: '#fecaca', prefix: '✕ ' };
          chip.textContent = `${c.prefix}${item.ingredient}`;
          chip.style.cssText = `font-size:11px;font-weight:600;padding:2px 7px;border-radius:4px;background:${c.bg};color:${c.fg};border:1px solid ${c.bd};`;
          chipsRow.appendChild(chip);
        }
        barWrap.appendChild(chipsRow);
      }
      body.appendChild(barWrap);
    }

    // Bottom Yellow Action Button
    const actionsRow = document.createElement('div');
    actionsRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:4px;';

    const openBtn = document.createElement('button');
    openBtn.type = 'button';
    openBtn.textContent = 'View Full Pie Chart & Table';
    openBtn.style.cssText =
      'flex:1;background:#facc15;color:#1c1917;border:1px solid #eab308;border-radius:6px;padding:8px 10px;font-size:12px;font-weight:700;cursor:pointer;';
    openBtn.onclick = () => {
      chrome.runtime.sendMessage({
        type: 'HEALTHGUARD_OPEN_SITE',
        query: query || '',
      });
    };

    actionsRow.appendChild(openBtn);
    body.appendChild(actionsRow);
    card.appendChild(body);
    document.body.appendChild(card);
  }

  function sendForAnalysis(details) {
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
          source: 'store_browser_extension',
          source_platform: details.platform,
        },
      },
      (response) => {
        if (chrome.runtime.lastError || !response) return;
        if (response.toast) {
          showHealthToast(response.toast);
        }
      }
    );
  }

  /* ---------------- Direct On-Page "Check Ingredients" Button ---------------- */
  function ensureProductPageScanButton() {
    const platform = detectPlatform();
    const shouldShow = isProductDetailPage(platform);
    const existing = document.getElementById('nutricheck-scan-fab');

    if (!shouldShow) {
      if (existing) existing.remove();
      return;
    }
    if (existing) return;

    const btn = document.createElement('button');
    btn.id = 'nutricheck-scan-fab';
    btn.type = 'button';
    btn.textContent = 'Check Ingredients · NutriCheck';
    btn.style.cssText = [
      'position:fixed',
      'bottom:20px',
      'right:20px',
      'z-index:2147483646',
      'background:#facc15',
      'color:#1c1917',
      'border:1.5px solid #ca8a04',
      'border-radius:8px',
      'padding:10px 14px',
      'font-family:system-ui,-apple-system,Segoe UI,sans-serif',
      'font-size:13px',
      'font-weight:700',
      'cursor:pointer',
      'box-shadow:0 6px 18px rgba(28,25,23,0.16)',
    ].join(';');

    btn.onclick = async () => {
      const title = extractProductTitleFromDoc(document, null, null, platform);
      if (!title) return;
      const details = await resolveProductDetails({
        platform,
        isMainDetailPage: true,
        initialTitle: title,
        dpUrl: window.location.href,
        cardNotes: '',
      });
      sendForAnalysis(details);
    };

    document.body.appendChild(btn);
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
  ensureProductPageScanButton();

  // Re-check SPA route transitions (Flipkart / Swiggy Instamart / Blinkit)
  let lastHref = window.location.href;
  setInterval(() => {
    if (window.location.href !== lastHref) {
      lastHref = window.location.href;
      setTimeout(ensureProductPageScanButton, 500);
    } else {
      ensureProductPageScanButton();
    }
  }, 1500);

  document.addEventListener(
    'click',
    (event) => {
      const btn = isAddToCartElement(event.target);
      if (!btn) return;
      const snapshot = captureClickSnapshot(btn);
      if (!snapshot.initialTitle && !snapshot.dpUrl) return;

      void (async () => {
        const details = await resolveProductDetails(snapshot);
        sendForAnalysis(details);
      })();
    },
    true
  );
})();
