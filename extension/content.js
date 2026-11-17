(function () {
  function detectPlatform(hostname) {
    const h = (hostname || window.location.hostname || '').toLowerCase();
    const p = (window.location.pathname || '').toLowerCase();
    const s = (window.location.search || '').toLowerCase();
    if (h.includes('amazon.')) {
      const isFresh =
        p.includes('/fresh') ||
        p.includes('/alm/') ||
        p.includes('/afx/') ||
        p.includes('/wholefoods') ||
        s.includes('i=amazonfresh') ||
        s.includes('almbrandid') ||
        Boolean(document.querySelector('#freshAddToCartButton, [data-action="fresh-add-to-cart"]'));
      return isFresh ? 'Amazon Fresh' : 'Amazon';
    }
    if (h.includes('flipkart.')) return 'Flipkart';
    if (h.includes('swiggy.')) return p.includes('instamart') ? 'Swiggy Instamart' : 'Swiggy';
    if (h.includes('zomato.')) return 'Zomato';
    if (h.includes('blinkit.')) return 'Blinkit';
    return 'Online Store';
  }

  const AMAZON_ADD_TO_CART_SELECTORS = [
    '#add-to-cart-button',
    '#add-to-cart-button-ubb',
    '#freshAddToCartButton',
    '#submit\\.add-to-cart',
    '#submit\\.add-to-cart-announce',
    '#submit\\.add-to-cart-ubb',
    '#submit\\.add-to-cart-ubb-announce',
    '#add-to-wishlist-button-submit',
    '#add-to-wishlist-button',
    '#wishListMainButton',
    '#wishListMainButton-announce',
    'input[name="submit.add-to-cart"]',
    'input[name="submit.add-to-registry.wishlist"]',
    'button[name="submit.addToCart"]',
    '[data-action="add-to-cart"]',
    '[data-action="fresh-add-to-cart"]',
    '[data-action="add-to-cart"] button',
    '[data-action="add-to-cart"] input',
    '.a-button-input[aria-labelledby*="add-to-cart"]',
    '.a-button-input[aria-labelledby*="wishList"]',
    '[id*="add-to-cart-button"]',
    '[id*="add-to-wishlist"]',
    '[data-testid*="add-to-cart"]',
  ].join(',');

  const NUTRITION_REGEX =
    /calori|energy|sugar|sodium|salt|protein|fat|nutrition|kcal|carbohydrate|carbs/i;
  const INGREDIENT_REGEX = /\bingredients?(?!\s+(?:type|preference|format|category))\b|\bcontains\b|\ballergen/i;

  const UI_CHROME_TITLE_RE =
    /^(?:subtotal|cart subtotal|your cart|shopping cart|proceed to (?:buy|checkout)|order summary|buy now|add to cart|added to cart|add to basket|add to bag|add to list|add to wish ?list|add to wishlist|go to cart|see options|see all buying options|quick look|sponsored|sponsored ad|ad|best seller|bestseller|must try|chef'?s special|newly added|highly reordered|pure veg|veg|non-veg|non veg|amazon'?s choice|overall pick|limited time deal|deal of the day|delivery|free delivery|round the clock delivery|superfast delivery|best prices? & offers?|wide assortment|why shop from blinkit\??|results|price|filters?|sort by|featured|loading\.*|amazon(?:\.[a-z.]+)?|flipkart|swiggy|instamart|zomato|blinkit|add|add item|add items|customise|customize|customisable|customizable|repeat last)$/i;

  const PROMO_COPY_RE =
    /round the clock delivery|why shop from blinkit|delivered to your doorstep|dark stores near you|best price destination|choose from 30,000\+|wide assortment|best prices?\s*&\s*offers?|superfast delivery/i;

  function cleanExtractedTitle(raw) {
    if (!raw) return '';
    const cleaned = String(raw)
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!cleaned || cleaned.length < 2) return '';
    if (UI_CHROME_TITLE_RE.test(cleaned)) return '';
    if (PROMO_COPY_RE.test(cleaned)) return '';
    if (/^subtotal\b/i.test(cleaned) || /\bcart subtotal\b/i.test(cleaned)) return '';
    if (/^[₹$€£]\s*[\d,.]+(?:\s*\([^)]+\))?$/.test(cleaned)) return '';
    if (/^\d+(?:\.\d+)?\s+out of\s+5\s+stars?$/i.test(cleaned)) return '';
    if (/^\(?[\d,]+(?:\s*ratings?|\s*votes?)?\)?$/.test(cleaned)) return '';
    if (/^\d+(?:\.\d+)?\s*(?:g|gm|gms|kg|ml|l|ltr|oz|lb|pcs|count|pack)$/i.test(cleaned)) return '';
    if (/^(?:serves?\s+\d+|\d+\s*★|\d+\.\d+\s*\(\d+\)|\d+\s*mins?)$/i.test(cleaned)) return '';
    if (
      /^\d+\s*-\s*\d+\s+of\s+(?:over\s+)?[\d,]+\s+results/i.test(cleaned) ||
      /\bsort by:\s*featured\b/i.test(cleaned) ||
      /\bprice:\s*low to high\b/i.test(cleaned)
    ) {
      return '';
    }
    return cleaned.slice(0, 260);
  }

  function normalizeAddLabel(raw) {
    const label = String(raw || '').replace(/\s+/g, ' ').trim().toLowerCase();
    if (!label || label.length > 85) return { label: '', stripped: '' };
    if (
      /\b(address|coupon|promo|tip|note|filter|sort|rating|veg only|bestseller|compare|share|cancel|close|view cart|go to cart|checkout|proceed|buy now|remove|delete|clear|instruction|cooking|delivery|restaurant|review|photo|payment|credit card|debit card|gift card|upi|account|profile|question|answer|comment)\b/i.test(
        label
      )
    ) {
      return { label: '', stripped: '' };
    }
    const stripped = label
      .replace(/\badd\s+\d+\s+items?\b/gi, 'add item')
      .replace(/(?:customisable|customizable|\badd-ons?\b|[₹$€£]\s*[\d,.]+|\|\s*[\d,.]+|\(\s*\d*\s*\)|[()+•|·\-])/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return { label, stripped };
  }

  function matchesAddText(label, stripped) {
    if (!stripped) return false;
    if (
      stripped === 'add' ||
      stripped === 'add item' ||
      stripped === 'add items' ||
      stripped.startsWith('add item') ||
      stripped === 'add to cart' ||
      stripped.startsWith('add to cart') ||
      stripped === 'add to basket' ||
      stripped.startsWith('add to basket') ||
      stripped === 'add to bag' ||
      stripped.startsWith('add to bag') ||
      stripped === 'add to order' ||
      stripped === 'add to list' ||
      stripped.startsWith('add to list') ||
      stripped === 'add to wish list' ||
      stripped === 'add to wishlist' ||
      stripped === 'add to saved list' ||
      stripped === 'add to grocery list' ||
      stripped === 'add to pantry' ||
      stripped === 'add to registry' ||
      stripped === 'add to fresh cart'
    ) {
      return true;
    }
    if (/^add(?:\s+(?:item|items|to\s+(?:cart|bag|basket|order|list|wish\s*list|grocery\s*list|pantry|registry|fresh\s*cart)))?$/i.test(stripped)) {
      return true;
    }
    if (/^(?:add|\+\s*add|add\s*\+)$/i.test(label.replace(/\s+/g, ' ').trim())) {
      return true;
    }
    if (/^add\s+.{2,60}\s+to\s+(?:cart|bag|basket|order|list|wish\s*list)$/i.test(stripped)) {
      return true;
    }
    return false;
  }

  function isAddToCartElement(rawTarget) {
    const target =
      rawTarget instanceof Element ? rawTarget : rawTarget?.parentElement || null;
    if (!target) return null;
    if (target.closest('#nutricheck-floating-card, #nutricheck-scan-fab')) return null;

    const platform = detectPlatform();
    if (platform === 'Amazon') {
      if (target.closest('#ewc-content, #sc-subtotal-box, #gutterCartViewForm, #buy-now-button, #submit\\.buy-now')) {
        return null;
      }
      const direct = target.closest(AMAZON_ADD_TO_CART_SELECTORS);
      if (direct) return direct;

      const aBtn = target.closest('.a-button');
      if (aBtn) {
        if (
          aBtn.querySelector(
            'input[name="submit.add-to-cart"], input[name="submit.add-to-registry.wishlist"], button[name="submit.addToCart"], [id*="add-to-cart"], [id*="add-to-wishlist"]'
          )
        ) {
          return aBtn;
        }
        const aBtnText = (aBtn.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
        const { label, stripped } = normalizeAddLabel(aBtnText);
        if (matchesAddText(label, stripped)) {
          return aBtn;
        }
      }
    }

    const btn = target.closest(
      'button, input[type="submit"], [role="button"], a[role="button"], [data-testid*="add-button"], [data-testid*="add_button"], [data-cy*="add"]'
    );
    if (btn) {
      const ariaLabelledBy = btn.getAttribute('aria-labelledby');
      let labelledText = '';
      if (ariaLabelledBy) {
        labelledText = ariaLabelledBy
          .split(/\s+/)
          .map((id) => document.getElementById(id)?.textContent || '')
          .join(' ');
      }
      const rawCandidates = [
        btn.textContent,
        btn.getAttribute('aria-label'),
        labelledText,
        btn.getAttribute('value'),
        btn.getAttribute('title'),
      ];
      for (const raw of rawCandidates) {
        if (!raw) continue;
        const { label, stripped } = normalizeAddLabel(raw);
        if (matchesAddText(label, stripped)) {
          return btn;
        }
      }
    }

    // Stores & food apps often use styled <div>, <span>, or <a> as Add / Add to List buttons
    let node = target;
    for (let depth = 0; depth < 6 && node; depth += 1) {
      if (node === document.body || node === document.documentElement) break;
      const rect = node.getBoundingClientRect();
      if (rect.width > 0 && rect.width <= 400 && rect.height > 0 && rect.height <= 96) {
        const rawCandidates = [
          node.textContent,
          node.getAttribute('aria-label'),
          node.getAttribute('title'),
        ];
        for (const raw of rawCandidates) {
          if (!raw) continue;
          const { label, stripped } = normalizeAddLabel(raw);
          if (matchesAddText(label, stripped)) {
            return node;
          }
        }
      } else if (rect.width > 440 || rect.height > 120) {
        break;
      }
      node = node.parentElement;
    }

    return null;
  }

  /* ---------------- Amazon Helpers ---------------- */
  function findAmazonCard(clickedEl) {
    const outerCard = clickedEl.closest(
      '[data-component-type="s-search-result"], .s-result-item[data-asin]:not([data-asin=""]), li.a-carousel-card, .sc-list-item, .octopus-pc-item, [data-testid*="product-card"], [class*="ProductGridItem"]'
    );
    if (outerCard) return outerCard;

    let node = clickedEl.parentElement;
    for (let depth = 0; depth < 9 && node; depth += 1) {
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
      const hasImage = Boolean(node.querySelector('img'));
      const hasDpLink = Boolean(node.querySelector('a[href*="/dp/"], a[href*="/gp/product/"], h2, h3'));
      const rect = node.getBoundingClientRect();
      if (hasImage && hasDpLink && rect.width > 80 && rect.width < 950) {
        return node;
      }
      node = node.parentElement;
    }

    const asinContainer = clickedEl.closest('[data-asin]:not([data-asin=""]), [data-csa-c-asin]:not([data-csa-c-asin=""])');
    if (asinContainer && asinContainer.querySelector('img, h2, h3')) {
      return asinContainer;
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
  function isModalContainer(el) {
    if (!el || !(el instanceof Element)) return false;
    return Boolean(
      el.closest(
        '[role="dialog"], [aria-modal="true"], [data-testid*="modal" i], [data-testid*="customis" i], [data-testid*="customiz" i], [class*="Modal" i], [class*="Drawer" i], [class*="BottomSheet" i]'
      )
    );
  }

  function findGenericCard(clickedEl, platform) {
    if (!clickedEl) return null;

    const dialog = clickedEl.closest(
      '[role="dialog"], [aria-modal="true"], [data-testid*="modal" i], [data-testid*="customis" i], [data-testid*="customiz" i]'
    );
    if (dialog) return dialog;

    if (platform === 'Flipkart') {
      const shelfItem = clickedEl.closest('[data-id]');
      if (shelfItem && shelfItem.querySelector('a[href*="/p/"], img')) {
        return shelfItem;
      }
      if (isProductDetailPage('Flipkart')) return null;
      const direct = clickedEl.closest('.slAVV4, ._1xHGtK, .tUxRFH');
      if (direct) return direct;
    }

    if (platform === 'Blinkit') {
      // On Blinkit product detail pages (/prn/...), only match an explicit compact shelf card;
      // clicking the main Add to cart button must analyze the full product detail page.
      const btnText = (clickedEl.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
      if (isProductDetailPage('Blinkit') && btnText.includes('add to cart')) {
        return null;
      }
      const plpCard = clickedEl.closest(
        '[data-pf="reset"][role="button"], [role="button"][tabindex], [class*="Product__UpdatedPlpProductContainer"], [class*="ProductCard"], a[href*="/prn/"]'
      );
      if (plpCard && !PROMO_COPY_RE.test(plpCard.textContent || '')) {
        const rect = plpCard.getBoundingClientRect();
        if (rect.width >= 120 && rect.width <= 360 && rect.height >= 140 && rect.height <= 460) {
          return plpCard;
        }
      }
      if (isProductDetailPage('Blinkit')) return null;
    }

    if (platform === 'Swiggy' || platform === 'Swiggy Instamart') {
      if (platform === 'Swiggy Instamart' && isProductDetailPage('Swiggy Instamart')) {
        const instCard = clickedEl.closest('[data-testid*="product-card"], [data-testid*="item-card"]');
        if (!instCard) return null;
      }
      const direct = clickedEl.closest(
        '[data-testid="normal-dish-item"], [data-testid="recommended-dish-item"], [data-testid*="dish"], [data-testid*="item-card"], [data-testid*="product-card"], [data-testid*="product"]'
      );
      if (direct && (direct.querySelector('h2, h3, h4, [class*="name" i], [class*="title" i]') || (direct.textContent || '').length > 20)) {
        return direct;
      }
    }

    if (platform === 'Zomato') {
      const direct = clickedEl.closest('[class*="sc-"][class*="item"], [data-testid*="dish"], li');
      if (direct && (direct.querySelector('h4, h3, h2') || (direct.textContent || '').length > 25)) {
        return direct;
      }
    }

    let node = clickedEl.parentElement;
    for (let depth = 0; depth < 10 && node; depth += 1) {
      if (node === document.body || node === document.documentElement) break;
      const rect = node.getBoundingClientRect();
      const rawText = (node.textContent || '').trim();
      const textLen = rawText.length;
      if (PROMO_COPY_RE.test(rawText)) {
        // Never treat "Why shop from Blinkit / Round The Clock Delivery" promo blocks as a product card
        return null;
      }
      const hasHeading = Boolean(
        node.querySelector(
          'h1, h2, h3, h4, a[href*="/p/"], a[href*="/prn/"], [class*="title" i], [class*="Title"], [class*="name" i], [class*="Name"]'
        )
      );
      const hasMediaAndText =
        Boolean(node.querySelector('img')) && textLen >= 18;
      if (
        (hasHeading || hasMediaAndText) &&
        rect.width >= 130 &&
        rect.width <= 680 &&
        rect.height >= 64 &&
        rect.height < 480 &&
        textLen > 10 &&
        textLen < 900
      ) {
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
      if (!t || t.length > 140) return;
      candidates.push({ text: t, score: Math.min(t.length, 90) + bonus });
    };

    const selectors =
      platform === 'Flipkart'
        ? ['a.wjcEIp', 'a.s1Q9rs', 'a.WKTcLC', '.KzDlHZ', 'a[title]', 'a[href*="/p/"]', 'h2', 'h3']
        : platform === 'Swiggy' || platform === 'Swiggy Instamart'
        ? [
            '[data-testid*="item-name"]',
            '[class*="itemName"]',
            '[class*="ProductName"]',
            'h3',
            'h2',
            'h4',
            'div[class*="Title"]',
            '[aria-hidden="false"]',
          ]
        : platform === 'Zomato'
        ? ['h4', 'h3', 'h2', '[class*="title"]', '[class*="Title"]', 'img[alt]']
        : ['[class*="ProductTitle"]', '[class*="name"]', 'h3', 'h4', 'h2', 'img[alt]'];

    for (let i = 0; i < selectors.length; i += 1) {
      const bonus = Math.max(0, 36 - i * 3);
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

    // Zomato / Swiggy styled-components fallback: scan compact leaf text elements inside the card
    if ((platform === 'Zomato' || platform === 'Swiggy' || platform === 'Swiggy Instamart') && candidates.length === 0) {
      let leafIdx = 0;
      card.querySelectorAll('p, span, div').forEach((el) => {
        if (el.children.length > 0) return;
        const txt = (el.textContent || '').replace(/\s+/g, ' ').trim();
        if (!txt || txt.length < 3 || txt.length > 75) return;
        if (/^(?:customis|add|in stock|\+|−|-|\d)/i.test(txt)) return;
        push(txt, Math.max(2, 24 - leafIdx * 3));
        leafIdx += 1;
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

  function extractDishDescriptionFromCard(card, platform) {
    if (!card) return '';
    if (platform !== 'Zomato' && platform !== 'Swiggy') return '';
    const pieces = [];
    card.querySelectorAll('p, [class*="desc"], [class*="Desc"], [data-testid*="description"]').forEach((el) => {
      const t = (el.textContent || '').replace(/\s+/g, ' ').trim();
      if (
        t &&
        t.length >= 10 &&
        t.length <= 400 &&
        !/^[₹$]\s*\d/.test(t) &&
        !PROMO_COPY_RE.test(t)
      ) {
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
        'h1._6EBuvT span, h1._6EBuvT, h1.VU-ZEz, span.VU-ZEz, span.B_NuCI, h1[class*="Title"], h1'
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

  function extractTableTextWithRows(tbl) {
    if (!tbl) return '';
    const rowLines = [];
    tbl.querySelectorAll('tr').forEach((tr) => {
      const cells = [];
      tr.querySelectorAll('th, td').forEach((cell) => {
        const cText = (cell.textContent || '').replace(/\s+/g, ' ').trim();
        if (cText) cells.push(cText);
      });
      if (cells.length > 0) {
        rowLines.push(cells.join(' '));
      }
    });
    if (rowLines.length > 0) return rowLines.join('\n');
    return (tbl.innerText || tbl.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function extractStructuredText(el) {
    if (!el) return '';
    if (el.tagName === 'TABLE') return extractTableTextWithRows(el);
    if (typeof el.innerText === 'string' && el.innerText.trim() && !el.querySelector('table')) {
      return el.innerText.replace(/\r\n?/g, '\n').replace(/[ \t]+/g, ' ').trim();
    }
    const clone = el.cloneNode(true);
    clone.querySelectorAll('script, style, noscript').forEach((n) => n.remove());
    clone.querySelectorAll('tr').forEach((tr) => {
      const cells = [];
      tr.querySelectorAll('th, td').forEach((cell) => {
        const t = (cell.textContent || '').replace(/\s+/g, ' ').trim();
        if (t) cells.push(t);
      });
      if (cells.length > 0) {
        tr.textContent = `\n${cells.join(' ')}\n`;
      }
    });
    clone.querySelectorAll('br').forEach((br) => br.replaceWith('\n'));
    clone.querySelectorAll('p, li, div, h1, h2, h3, h4, h5, dt, dd').forEach((blk) => {
      blk.append('\n');
    });
    return (clone.textContent || '')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n\s+/g, '\n')
      .replace(/\n{2,}/g, '\n')
      .trim();
  }

  function extractIngredientsAndNutritionFromDoc(doc) {
    const nutritionChunks = [];
    const ingredientChunks = [];

    const candidateSelectors = [
      '#important-information',
      '[data-feature-name="importantInformation"]',
      '#productFactsDesktopExpander',
      '#productDetails_techSpec_section_1',
      '#productDetails_techSpec_section_2',
      '#productDetails_detailBullets_sections1',
      '#detailBullets_feature_div',
      '#productOverview_feature_div',
      '#technicalSpecifications_feature_div',
      '#vitalInfo_feature_div',
      '#feature-bullets',
      '#productDescription',
      '#aplus',
      '#aplus_feature_div',
      '#vital-info',
      '.prodDetTable',
      '.a-keyvalue',
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

    const extractRealIngredients = (rawText) => {
      if (!rawText) return '';
      // Strip Amazon product detail table metadata rows such as "Ingredient Type Vegetarian"
      const cleaned = rawText
        .replace(/\bingredient\s+(?:type|preference|format|category)\s*[:\-]?\s*[^\n;]+/gi, '')
        .replace(/\bspecial\s+ingredients?\s*[:\-]?\s*[^\n;]+/gi, '')
        .trim();
      if (!cleaned || !INGREDIENT_REGEX.test(cleaned)) return '';
      const ingMatch = cleaned.match(
        /\bingredients?(?:\s+list)?\s*[:\-]\s*([^]{2,1200}?)(?:\bdirections\b|\blegal disclaimer\b|\bnutrition\b|\ballergen\b|\bstorage\b|\bnet\s*weight\b|\bmanufactured\b|\bpacked\s*by\b|$)/i
      );
      if (ingMatch && ingMatch[1]) {
        const val = ingMatch[1].replace(/\s+/g, ' ').trim();
        if (val && !/^(?:vegetarian|vegan|non-vegetarian|organic|natural)$/i.test(val)) {
          return `Ingredients: ${val}`;
        }
      }
      return '';
    };

    for (const sel of candidateSelectors) {
      doc.querySelectorAll(sel).forEach((el) => {
        const text = extractStructuredText(el);
        if (!text) return;
        if (NUTRITION_REGEX.test(text)) {
          nutritionChunks.push(text.slice(0, 2600));
        }
        const extractedIng = extractRealIngredients(text);
        if (extractedIng) {
          ingredientChunks.push(extractedIng);
        }
      });
    }

    doc.querySelectorAll('table').forEach((tbl) => {
      const t = extractTableTextWithRows(tbl);
      if (!t || t.length > 3200) return;
      if (NUTRITION_REGEX.test(t)) nutritionChunks.push(t.slice(0, 2000));
      const extractedTableIng = extractRealIngredients(t);
      if (extractedTableIng) ingredientChunks.push(extractedTableIng);
    });

    doc.querySelectorAll('#aplus img[alt], #important-information img[alt]').forEach((img) => {
      const alt = (img.getAttribute('alt') || '').trim();
      if (!alt) return;
      if (NUTRITION_REGEX.test(alt)) nutritionChunks.push(alt.slice(0, 800));
      if (INGREDIENT_REGEX.test(alt)) ingredientChunks.push(alt.slice(0, 800));
    });

    return {
      nutritionText: Array.from(new Set(nutritionChunks)).join('\n').slice(0, 6500),
      ingredientsText: Array.from(new Set(ingredientChunks)).join('\n').slice(0, 3500),
    };
  }

  function normalizeImageCandidate(rawUrl) {
    if (!rawUrl) return '';
    const trimmed = String(rawUrl).trim();
    if (
      !trimmed ||
      trimmed.startsWith('data:image/gif') ||
      trimmed.startsWith('data:image/svg') ||
      /transparent-pixel|grey-pixel|loading|spinner|sprite|1x1|\.gif(?:\?|$)/i.test(trimmed)
    ) {
      return '';
    }
    try {
      const resolved = new URL(trimmed, window.location.origin).href;
      if (!/^https?:\/\//i.test(resolved)) return '';
      return resolved;
    } catch {
      return '';
    }
  }

  function extractCandidateFromImgElement(img) {
    if (!img) return '';
    const hiRes = img.getAttribute('data-old-hires');
    let dynBest = '';
    const dyn = img.getAttribute('data-a-dynamic-image');
    if (dyn && dyn.startsWith('{')) {
      try {
        const parsed = JSON.parse(dyn);
        const entries = Object.entries(parsed);
        entries.sort((a, b) => {
          const areaA = Array.isArray(a[1]) ? (a[1][0] || 0) * (a[1][1] || 0) : 0;
          const areaB = Array.isArray(b[1]) ? (b[1][0] || 0) * (b[1][1] || 0) : 0;
          return areaB - areaA;
        });
        if (entries.length) dynBest = entries[0][0];
      } catch {
        // ignore
      }
    }

    let srcsetBest = '';
    const srcset = img.getAttribute('srcset') || img.getAttribute('data-srcset') || '';
    if (srcset) {
      const parts = srcset
        .split(',')
        .map((s) => s.trim().split(/\s+/)[0])
        .filter(Boolean);
      if (parts.length) srcsetBest = parts[parts.length - 1];
    }

    return (
      normalizeImageCandidate(hiRes) ||
      normalizeImageCandidate(dynBest) ||
      normalizeImageCandidate(srcsetBest) ||
      normalizeImageCandidate(img.getAttribute('src')) ||
      normalizeImageCandidate(img.currentSrc) ||
      normalizeImageCandidate(img.getAttribute('data-src')) ||
      normalizeImageCandidate(img.getAttribute('data-lazy-src')) ||
      normalizeImageCandidate(img.getAttribute('data-original'))
    );
  }

  function extractBgImageCandidate(el) {
    if (!el || !(el instanceof Element)) return '';
    const style = el.getAttribute('style') || '';
    const m = style.match(/url\(["']?([^"')]+)["']?\)/i);
    if (m && m[1]) return normalizeImageCandidate(m[1]);
    return '';
  }

  function isLikelyIconImg(img, url, requireHeroSize = false) {
    const lowerUrl = (url || '').toLowerCase();
    const alt = (img?.getAttribute?.('alt') || '').toLowerCase();
    if (
      /(?:veg[-_]?icon|non[-_]?veg[-_]?icon|nonveg[-_]?icon|veg[-_]?mark|veg[-_]?symbol|green[-_]?dot|red[-_]?dot|rating[-_]?star|badge[-_]?icon|nav[-_]?logo|sprite|spinner|arrow[-_]?icon|cms[-_]?footer|why[-_]?shop|round[-_]?the[-_]?clock|10[-_]?minute|15[-_]?min|8[-_]?min|timer|stopwatch|express[-_]?delivery|wide[-_]?assortment|best[-_]?price|blinkit[-_]?logo|swiggy[-_]?logo|zomato[-_]?logo|flipkart[-_]?logo|amazon[-_]?logo|header[-_]?logo|app[-_]?icon|fk-p-linchpin|promos?\/)/i.test(
        lowerUrl
      ) ||
      /^(?:veg|non-veg|non veg|rating|star|icon|logo|clock|delivery|timer)$/i.test(alt.trim()) ||
      PROMO_COPY_RE.test(alt)
    ) {
      return true;
    }
    if (img?.closest?.('header, nav, footer')) {
      return true;
    }
    const rect =
      typeof img?.getBoundingClientRect === 'function' ? img.getBoundingClientRect() : null;
    const minRendered = requireHeroSize ? 80 : 38;
    if (rect && rect.width > 0 && rect.height > 0 && (rect.width < minRendered || rect.height < minRendered)) {
      return true;
    }
    const w = img.naturalWidth || img.width || 0;
    const h = img.naturalHeight || img.height || 0;
    const minDim = requireHeroSize ? 64 : 28;
    if ((w > 0 && w < minDim) || (h > 0 && h < minDim)) {
      return true;
    }
    return false;
  }

  function scoreHeroCandidate(img, selectorPriority) {
    const rect =
      typeof img?.getBoundingClientRect === 'function' ? img.getBoundingClientRect() : null;
    const area = rect ? Math.min(rect.width, 700) * Math.min(rect.height, 700) : 0;
    return area + selectorPriority * 5000;
  }

  function extractProductImageFromDoc(doc, card, platform) {
    const scope = card || doc;
    const requireHeroSize = !card;
    const selectors =
      platform === 'Amazon'
        ? [
            '#landingImage',
            '#imgBlkFront',
            '#main-image',
            'img[data-a-image-name="landingImage"]',
            '#imgTagWrapperId img',
            '.imgTagWrapper img',
            '[data-feature-name="imageBlock"] img',
            '#imageBlock img.a-dynamic-image',
            '#main-image-container img',
            '#image-block-carousel img',
            'img.s-image',
            '.s-product-image-container img',
            'img[data-image-latency="s-product-image"]',
            'img[data-old-hires]',
            'img[src*="media-amazon.com/images/I/"]',
            'img[src*="images-amazon.com/images/I/"]',
            'img[src*="media-amazon"]',
            'img[src*="ssl-images-amazon"]',
          ]
        : platform === 'Flipkart'
        ? [
            'img.DByuf4',
            'img._0DkuPH',
            'img.jLEJ7H',
            'img._396cs4',
            'img._2r_T1I',
            'img[src*="rukminim"][src*="/image/"]',
            'img[src*="rukminim"]',
          ]
        : platform === 'Blinkit'
        ? [
            'img[src*="/cms-assets/cms/product/"]',
            'img[src*="cdn.grofers.com/app/images/products"]',
            'img[src*="cdn.grofers.com/cdn-cgi/image/"][src*="product"]',
            'img[src*="cdn.grofers.com"]',
            'img[src*="cdn.blinkit.com"]',
            'img[src]',
          ]
        : platform === 'Zomato'
        ? ['img[src*="b.zmtcdn.com/data/dish_photos"]', 'img[src*="b.zmtcdn.com"]', 'img[src]']
        : platform === 'Swiggy' || platform === 'Swiggy Instamart'
        ? [
            'img[src*="media-assets.swiggy.com/swiggy/image/upload"]',
            'img[src*="media-assets.swiggy.com"]',
            'img[src*="instamart"]',
            'img[src]',
          ]
        : ['img[src]'];

    if (!card) {
      let bestCand = '';
      let bestScore = -1;
      for (let i = 0; i < selectors.length; i += 1) {
        const imgs = scope.querySelectorAll(selectors[i]);
        const priority = Math.max(0, selectors.length - i);
        for (const img of imgs) {
          const cand = extractCandidateFromImgElement(img);
          if (!cand || isLikelyIconImg(img, cand, true)) continue;
          const sc = scoreHeroCandidate(img, priority);
          if (sc > bestScore) {
            bestScore = sc;
            bestCand = cand;
          }
        }
      }
      if (bestCand) return bestCand;
    } else {
      for (const sel of selectors) {
        const imgs = scope.querySelectorAll(sel);
        for (const img of imgs) {
          const cand = extractCandidateFromImgElement(img);
          if (cand && !isLikelyIconImg(img, cand, false)) return cand;
        }
      }
    }

    if (card) {
      for (const anyImg of card.querySelectorAll('img')) {
        const cand = extractCandidateFromImgElement(anyImg);
        if (cand && !isLikelyIconImg(anyImg, cand, false)) return cand;
      }
      for (const bgEl of card.querySelectorAll('[style*="background-image"]')) {
        const bg = extractBgImageCandidate(bgEl);
        if (bg && !/(?:sprite|icon|logo|1x1)/i.test(bg)) return bg;
      }
      // If card had no image but we're on an Amazon/Flipkart detail page, search full document
      if (isProductDetailPage(platform)) {
        const docFallback = extractProductImageFromDoc(doc, null, platform);
        if (docFallback) return docFallback;
      }
    }

    const ogImg = doc.querySelector('meta[property="og:image"], meta[name="twitter:image"]');
    const ogCand = normalizeImageCandidate(ogImg?.getAttribute('content'));
    if (ogCand) return ogCand;

    return '';
  }

  function upgradeProductImageUrl(rawUrl, platform) {
    const clean = normalizeImageCandidate(rawUrl);
    if (!clean) return '';
    if (platform === 'Amazon' || /media-amazon\.com|images-amazon\.com/i.test(clean)) {
      return clean.replace(/\._[^./]+_\.(jpg|jpeg|png|webp)(\?.*)?$/i, '._SL1500_.$1$2');
    }
    if (platform === 'Flipkart' || /rukminim\d*\.flixcart\.com/i.test(clean)) {
      return clean.replace(/\/image\/\d+\/\d+\//i, '/image/832/832/');
    }
    if (platform === 'Blinkit' || /cdn\.grofers\.com|cdn\.blinkit\.com/i.test(clean)) {
      return clean
        .replace(/([,/])w=\d+/gi, '$1w=1200')
        .replace(/([?&])w=\d+/gi, '$1w=1200');
    }
    if (platform === 'Swiggy Instamart' || platform === 'Swiggy' || /media-assets\.swiggy\.com/i.test(clean)) {
      return clean.replace(/([,/])w_\d+,h_\d+(?:,c_[a-z]+)?/gi, '$1w_1200,h_1200,c_fit');
    }
    return clean;
  }

  function isExcludedGalleryAsset(img, url) {
    const lowerUrl = (url || '').toLowerCase();
    const alt = (img?.getAttribute?.('alt') || '').toLowerCase();
    if (
      /(?:veg[-_]?icon|non[-_]?veg[-_]?icon|nonveg[-_]?icon|veg[-_]?mark|rating[-_]?star|badge[-_]?icon|nav[-_]?logo|sprite|spinner|play[-_]?button|video|360[-_]?view|header[-_]?logo|app[-_]?icon|fk-p-linchpin|promos?\/|\.svg(?:\?|$)|\.gif(?:\?|$))/i.test(
        lowerUrl
      ) ||
      /^(?:veg|non-veg|non veg|rating|star|icon|logo|play|video)$/i.test(alt.trim())
    ) {
      return true;
    }
    if (img?.closest?.('header, nav, footer')) return true;
    if (img?.closest?.('[class*="video" i], [data-action*="video"]')) return true;
    return false;
  }

  function extractGalleryImagesFromDoc(doc, card, platform, primaryImageUrl = '') {
    const scope = card || doc;
    const urls = [];
    const seen = new Set();

    const pushUrl = (raw) => {
      const upgraded = upgradeProductImageUrl(raw, platform);
      if (!upgraded || isExcludedGalleryAsset(null, upgraded)) return;
      if (seen.has(upgraded)) return;
      seen.add(upgraded);
      urls.push(upgraded);
    };

    // 1. Prioritize currently active main viewer image on product detail page
    if (!card) {
      const activeMainSelectors =
        platform === 'Amazon'
          ? ['#landingImage', '#imgTagWrapperId img', '.imgTagWrapper img', '#main-image']
          : platform === 'Flipkart'
          ? ['img.jLEJ7H', 'img.DByuf4', 'img._0DkuPH', 'img[src*="rukminim"][src*="/image/"]']
          : platform === 'Blinkit'
          ? ['[class*="Carousel"] img', 'img[src*="/cms-assets/cms/product/"]', 'img[src*="cdn.grofers.com"]']
          : platform === 'Swiggy Instamart' || platform === 'Swiggy'
          ? ['img[src*="media-assets.swiggy.com/swiggy/image/upload"]']
          : [];

      let bestVisibleUrl = '';
      let bestArea = 0;
      for (const sel of activeMainSelectors) {
        doc.querySelectorAll(sel).forEach((img) => {
          const cand = extractCandidateFromImgElement(img);
          if (!cand || isExcludedGalleryAsset(img, cand)) return;
          const rect = typeof img.getBoundingClientRect === 'function' ? img.getBoundingClientRect() : null;
          const area = rect ? rect.width * rect.height : 10000;
          if (area >= bestArea) {
            bestArea = area;
            bestVisibleUrl = cand;
          }
        });
      }
      if (bestVisibleUrl) pushUrl(bestVisibleUrl);
    }

    if (primaryImageUrl) pushUrl(primaryImageUrl);

    // 2. Gather gallery thumbnail carousel images
    const gallerySelectors =
      platform === 'Amazon'
        ? [
            '#altImages li.imageThumbnail img',
            '#altImages img',
            '#imageBlock img',
            '[data-feature-name="imageBlock"] img',
          ]
        : platform === 'Flipkart'
        ? [
            'ul.ZqtVYK img',
            'ul._0DkuPH img',
            '._8M4o6K img',
            'img[src*="rukminim"][src*="/image/"]',
          ]
        : platform === 'Blinkit'
        ? [
            '[class*="Carousel" i] img',
            '[class*="Thumbnail" i] img',
            'img[src*="/cms-assets/cms/product/"]',
            'img[src*="cdn.grofers.com/app/images/products"]',
          ]
        : platform === 'Swiggy Instamart' || platform === 'Swiggy'
        ? [
            '[class*="carousel" i] img',
            'img[src*="media-assets.swiggy.com/swiggy/image/upload"]',
          ]
        : [];

    for (const sel of gallerySelectors) {
      scope.querySelectorAll(sel).forEach((img) => {
        const cand = extractCandidateFromImgElement(img);
        if (!cand || isExcludedGalleryAsset(img, cand)) return;
        pushUrl(cand);
      });
    }

    // 3. Fallback: Amazon colorImages inline hiRes JSON in fetched/rendered HTML
    if (platform === 'Amazon' && urls.length < 3 && doc === document) {
      const scripts = doc.querySelectorAll('script');
      for (const s of scripts) {
        const txt = s.textContent || '';
        if (!txt.includes('hiRes') && !txt.includes('colorImages')) continue;
        const matches = txt.matchAll(/"hiRes"\s*:\s*"(https:[^"]+)"/g);
        for (const m of matches) {
          pushUrl(m[1].replace(/\\u002F/g, '/'));
          if (urls.length >= 6) break;
        }
        if (urls.length >= 6) break;
      }
    }

    return urls.slice(0, 6);
  }

  function isProductDetailPage(platform) {
    const p = window.location.pathname.toLowerCase();
    if (platform === 'Amazon') {
      return Boolean(document.querySelector('#productTitle, #titleSection #title')) || /\/(?:dp|gp\/product)\//.test(p);
    }
    if (platform === 'Flipkart') {
      return p.includes('/p/') || Boolean(document.querySelector('h1._6EBuvT, span.VU-ZEz, h1.VU-ZEz, span.B_NuCI'));
    }
    if (platform === 'Swiggy Instamart' || platform === 'Blinkit') {
      return p.includes('/item/') || p.includes('/prn/') || Boolean(document.querySelector('[class*="ProductDetail"], h1'));
    }
    return false;
  }

  let lastMenuCardSnapshot = null;

  function captureClickSnapshot(btn) {
    const platform = detectPlatform();
    if (platform === 'Amazon') {
      const inSearchOrCarousel = Boolean(
        btn.closest(
          '[data-component-type="s-search-result"], .s-result-item, li.a-carousel-card, .octopus-pc-item, #similarities_feature_div'
        )
      );
      const hasDetailHeader = Boolean(
        document.querySelector('#productTitle, #titleSection #title, #dp-container')
      );
      const isMainDetailPage = hasDetailHeader && !inSearchOrCarousel;
      const card = isMainDetailPage ? null : findAmazonCard(btn);
      const initialTitle = extractProductTitleFromDoc(document, card, btn, platform);
      const dpUrl = isMainDetailPage ? window.location.href : extractAmazonLinkFromCard(card, btn);
      const imageUrl = extractProductImageFromDoc(document, card, platform);
      const galleryImages = extractGalleryImagesFromDoc(document, card, platform, imageUrl);
      return {
        platform,
        isMainDetailPage,
        initialTitle,
        dpUrl,
        imageUrl,
        galleryImages,
        cardNotes: '',
      };
    }

    const card = findGenericCard(btn, platform);
    const inDialog = Boolean(
      (card && card.matches('[role="dialog"], [aria-modal="true"], [data-testid*="modal" i], [data-testid*="customis" i], [data-testid*="customiz" i]')) ||
      isModalContainer(btn)
    );
    const detailPage = isProductDetailPage(platform) && !card;
    let initialTitle = extractProductTitleFromDoc(
      document,
      detailPage ? null : card,
      btn,
      platform
    );
    const dpUrl = detailPage ? window.location.href : extractProductLinkGeneric(card, platform);
    let cardNotes = card ? extractDishDescriptionFromCard(card, platform) : '';
    let imageUrl = extractProductImageFromDoc(
      document,
      detailPage ? null : card,
      platform
    );
    let galleryImages = extractGalleryImagesFromDoc(
      document,
      detailPage ? null : card,
      platform,
      imageUrl
    );

    if (
      inDialog &&
      lastMenuCardSnapshot &&
      Date.now() - lastMenuCardSnapshot.at < 90000
    ) {
      if (!initialTitle || initialTitle.length < 3) initialTitle = lastMenuCardSnapshot.title;
      if (!imageUrl) imageUrl = lastMenuCardSnapshot.imageUrl;
      if (!galleryImages.length && Array.isArray(lastMenuCardSnapshot.galleryImages)) {
        galleryImages = lastMenuCardSnapshot.galleryImages;
      }
      if (!cardNotes) cardNotes = lastMenuCardSnapshot.notes;
    } else if (!inDialog && initialTitle) {
      lastMenuCardSnapshot = {
        title: initialTitle,
        imageUrl,
        galleryImages,
        notes: cardNotes,
        at: Date.now(),
      };
    }

    if (!initialTitle && lastMenuCardSnapshot && Date.now() - lastMenuCardSnapshot.at < 90000) {
      initialTitle = lastMenuCardSnapshot.title;
      if (!imageUrl) imageUrl = lastMenuCardSnapshot.imageUrl;
      if (!galleryImages.length && Array.isArray(lastMenuCardSnapshot.galleryImages)) {
        galleryImages = lastMenuCardSnapshot.galleryImages;
      }
      if (!cardNotes) cardNotes = lastMenuCardSnapshot.notes;
    }

    return {
      platform,
      isMainDetailPage: detailPage,
      initialTitle: initialTitle || (platform !== 'Online Store' ? `${platform} Food Item` : ''),
      dpUrl,
      imageUrl,
      galleryImages,
      cardNotes,
    };
  }

  async function resolveProductDetails(snapshot) {
    let productTitle = snapshot.initialTitle;
    const productUrl = snapshot.dpUrl || window.location.href;
    let imageUrl = snapshot.imageUrl || '';
    let galleryImages = Array.isArray(snapshot.galleryImages) ? snapshot.galleryImages : [];
    let nutritionText = '';
    let ingredientsText = snapshot.cardNotes || '';
    let meta = { brand: '', barcode: '' };

    if (snapshot.isMainDetailPage) {
      const extractedCurrent = extractIngredientsAndNutritionFromDoc(document);
      nutritionText = extractedCurrent.nutritionText;
      if (extractedCurrent.ingredientsText) {
        ingredientsText = extractedCurrent.ingredientsText;
      }
      if (!imageUrl) {
        imageUrl = extractProductImageFromDoc(document, null, snapshot.platform);
      }
      galleryImages = extractGalleryImagesFromDoc(document, null, snapshot.platform, imageUrl);
      meta = extractBrandAndBarcodeFromDoc(document);
    } else if (
      snapshot.dpUrl &&
      snapshot.dpUrl !== window.location.href &&
      (snapshot.platform === 'Amazon' || snapshot.platform === 'Flipkart')
    ) {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 2800);
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
          if (!imageUrl) {
            imageUrl = extractProductImageFromDoc(parsedDoc, null, snapshot.platform);
          }
          const fetchedGallery = extractGalleryImagesFromDoc(parsedDoc, null, snapshot.platform, imageUrl);
          if (fetchedGallery.length) {
            galleryImages = fetchedGallery;
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
      imageUrl,
      galleryImages,
      nutritionText,
      ingredientsText,
      brand: meta.brand,
      barcode: meta.barcode,
    };
  }

  /* ---------------- Emerald Mint & White Top Floating Card ---------------- */
  function removeExistingToast() {
    const existing = document.getElementById('nutricheck-floating-card');
    if (existing) existing.remove();
    const oldLegacy = document.getElementById('healthguard-amazon-toast');
    if (oldLegacy) oldLegacy.remove();
  }

  function formatPrescriptionConditions(warnings) {
    if (!Array.isArray(warnings) || warnings.length === 0) return 'an active health condition';
    const medical = warnings.filter(
      (w) =>
        w &&
        w.conditionName &&
        !String(w.conditionKey || '').startsWith('avoid_') &&
        !String(w.conditionKey || '').startsWith('low_') &&
        !String(w.conditionKey || '').startsWith('soft_')
    );
    const source = medical.length > 0 ? medical : warnings;
    const names = [];
    const seen = new Set();
    for (const w of source) {
      const raw = String(w?.conditionName || '').trim();
      if (!raw) continue;
      const key = raw.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        names.push(raw);
      }
    }
    if (names.length === 0) return 'an active health condition';
    if (names.length === 1) return names[0];
    if (names.length === 2) return `${names[0]} and ${names[1]}`;
    return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
  }

  function formatShortToastProductName(name) {
    const clean = String(name || 'this product').replace(/\s+/g, ' ').trim();
    if (clean.length <= 88) return clean;
    return `${clean.slice(0, 85).trimEnd()}…`;
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
      imageUrl,
      ingredientsText,
      takeaway,
      message,
      score,
      macros,
      ingredientSummary,
      query,
      sourceLabel,
      isEstimated,
      prescriptionAlerts,
      eventId,
      queuedFoodLogId,
      userId,
    } = toastData;

    const hasPrescriptionAlert = Boolean(
      prescriptionAlerts &&
        prescriptionAlerts.hasWarnings &&
        Array.isArray(prescriptionAlerts.warnings) &&
        prescriptionAlerts.warnings.length > 0
    );

    if (hasPrescriptionAlert) {
      const card = document.createElement('div');
      card.id = 'nutricheck-floating-card';
      card.setAttribute('role', 'dialog');
      card.setAttribute('aria-label', 'NutriCheck – Health Alert');
      card.style.cssText = [
        'position:fixed',
        'top:14px',
        'right:14px',
        'z-index:2147483647',
        'width:min(440px, calc(100vw - 24px))',
        'max-height:calc(100vh - 28px)',
        'overflow-y:auto',
        'box-sizing:border-box',
        'background:#ffffff',
        'border:1.5px solid #e2b857',
        'border-radius:14px',
        'box-shadow:0 16px 38px rgba(15,23,42,0.16)',
        'font-family:system-ui,-apple-system,Segoe UI,sans-serif',
        'color:#0f172a',
        'padding:18px 20px',
      ].join(';');

      const headerRow = document.createElement('div');
      headerRow.style.cssText =
        'display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px;';

      const titleWrap = document.createElement('div');
      titleWrap.style.cssText =
        'display:flex;align-items:center;gap:8px;font-size:15.5px;font-weight:700;color:#0f172a;min-width:0;';

      const warnSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      warnSvg.setAttribute('width', '18');
      warnSvg.setAttribute('height', '18');
      warnSvg.setAttribute('viewBox', '0 0 24 24');
      warnSvg.setAttribute('fill', 'none');
      warnSvg.setAttribute('stroke', '#d97706');
      warnSvg.setAttribute('stroke-width', '2.1');
      warnSvg.setAttribute('stroke-linecap', 'round');
      warnSvg.setAttribute('stroke-linejoin', 'round');
      warnSvg.style.flexShrink = '0';

      const path1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path1.setAttribute('d', 'm21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z');
      const path2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path2.setAttribute('d', 'M12 9v4');
      const path3 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path3.setAttribute('d', 'M12 17h.01');
      warnSvg.appendChild(path1);
      warnSvg.appendChild(path2);
      warnSvg.appendChild(path3);

      const headerTitle = document.createElement('span');
      headerTitle.textContent = 'NutriCheck – Health Alert';
      titleWrap.appendChild(warnSvg);
      titleWrap.appendChild(headerTitle);

      const badge = document.createElement('span');
      badge.textContent = 'Health warning';
      badge.style.cssText =
        'background:#fdedde;color:#c2410c;font-size:12px;font-weight:600;padding:4px 11px;border-radius:999px;white-space:nowrap;flex-shrink:0;';

      headerRow.appendChild(titleWrap);
      headerRow.appendChild(badge);
      card.appendChild(headerRow);

      const headlineEl = document.createElement('div');
      headlineEl.textContent = 'Be careful with this product!';
      headlineEl.style.cssText =
        'font-size:16.5px;font-weight:700;color:#0f172a;line-height:1.3;margin:0 0 10px 0;';
      card.appendChild(headlineEl);

      const condText = formatPrescriptionConditions(prescriptionAlerts.warnings);
      const p1 = document.createElement('p');
      p1.style.cssText = 'margin:0 0 8px 0;font-size:13.5px;color:#1e293b;line-height:1.45;';
      p1.appendChild(document.createTextNode('Your recent prescription mentions '));
      const condStrong = document.createElement('strong');
      condStrong.style.cssText = 'font-weight:700;color:#0f172a;';
      condStrong.textContent = condText;
      p1.appendChild(condStrong);
      p1.appendChild(document.createTextNode('.'));
      card.appendChild(p1);

      const shortProd = formatShortToastProductName(productName || toastData.title || 'this product');
      const storeLabel = platform || 'Online Store';
      const p2 = document.createElement('p');
      p2.style.cssText = 'margin:0 0 8px 0;font-size:13.5px;color:#1e293b;line-height:1.45;';
      p2.textContent = `You are trying to add ${shortProd} to your ${storeLabel} cart.`;
      card.appendChild(p2);

      const p3 = document.createElement('p');
      p3.style.cssText = 'margin:0 0 10px 0;font-size:13.5px;color:#1e293b;line-height:1.45;';
      p3.textContent = 'Consider whether this product is suitable for your current health condition.';
      card.appendChild(p3);

      const primaryWarning = prescriptionAlerts.warnings[0];
      if (primaryWarning && (primaryWarning.headline || primaryWarning.detail)) {
        const reasonBox = document.createElement('div');
        reasonBox.style.cssText =
          'margin:0 0 10px 0;padding:10px 12px;border-radius:8px;background:#fffbeb;border:1px solid #fde68a;';
        if (primaryWarning.headline) {
          const reasonTitle = document.createElement('div');
          reasonTitle.style.cssText =
            'font-size:13.5px;font-weight:700;color:#78350f;line-height:1.38;';
          reasonTitle.textContent = primaryWarning.headline;
          reasonBox.appendChild(reasonTitle);
        }
        if (primaryWarning.detail) {
          const reasonDetail = document.createElement('div');
          reasonDetail.style.cssText =
            'margin-top:4px;font-size:12.5px;color:#475569;line-height:1.4;';
          reasonDetail.textContent = primaryWarning.detail;
          reasonBox.appendChild(reasonDetail);
        }
        card.appendChild(reasonBox);
      }

      if (Array.isArray(prescriptionAlerts.alternatives) && prescriptionAlerts.alternatives.length > 0) {
        const altEl = document.createElement('p');
        altEl.style.cssText = 'margin:0 0 8px 0;font-size:12.5px;color:#146c43;line-height:1.4;font-weight:600;';
        altEl.textContent = `Safer options: ${prescriptionAlerts.alternatives.slice(0, 2).join(' · ')}`;
        card.appendChild(altEl);
      }

      const disclaimerEl = document.createElement('p');
      disclaimerEl.style.cssText = 'margin:0 0 14px 0;font-size:11.5px;color:#64748b;line-height:1.4;';
      disclaimerEl.textContent =
        'This is a precautionary reminder, not a medical diagnosis or a confirmed food restriction.';
      card.appendChild(disclaimerEl);

      const btnRow = document.createElement('div');
      btnRow.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:10px;align-items:center;';

      const cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.textContent = 'Cancel';
      cancelBtn.style.cssText =
        'background:#ffffff;color:#0f172a;border:1px solid #e2e8f0;border-radius:8px;padding:10px 14px;font-size:13.5px;font-weight:700;cursor:pointer;';
      cancelBtn.onclick = () => {
        card.remove();
        try {
          chrome.runtime.sendMessage({
            type: 'HEALTHGUARD_CANCEL_CART_ITEM',
            eventId: eventId || null,
            queuedFoodLogId: queuedFoodLogId || null,
            userId: userId || null,
          });
        } catch {
          // ignore
        }
      };

      const continueBtn = document.createElement('button');
      continueBtn.type = 'button';
      continueBtn.textContent = 'Continue Anyway';
      continueBtn.style.cssText =
        'background:#146c43;color:#ffffff;border:1px solid #105635;border-radius:8px;padding:10px 14px;font-size:13.5px;font-weight:700;cursor:pointer;';
      continueBtn.onclick = () => {
        card.remove();
        try {
          chrome.runtime.sendMessage({ type: 'HEALTHGUARD_DISMISS_TOAST' });
        } catch {
          // ignore
        }
      };

      btnRow.appendChild(cancelBtn);
      btnRow.appendChild(continueBtn);
      card.appendChild(btnRow);
      document.body.appendChild(card);
      return;
    }

    const badgeStyle =
      level === 'success'
        ? { bg: '#dcfce7', border: '#bbf7d0', ink: '#166534' }
        : level === 'danger'
        ? { bg: '#fce7f3', border: '#fbcfe8', ink: '#9f1239' }
        : level === 'warning'
        ? { bg: '#fef3c7', border: '#fde68a', ink: '#92400e' }
        : { bg: '#eaf1ee', border: '#cbd5e1', ink: '#146c43' };

    const card = document.createElement('div');
    card.id = 'nutricheck-floating-card';
    card.style.cssText = [
      'position:fixed',
      'top:14px',
      'right:14px',
      'z-index:2147483647',
      'width:min(368px, calc(100vw - 24px))',
      'max-height:calc(100vh - 28px)',
      'overflow-y:auto',
      'box-sizing:border-box',
      'background:#ffffff',
      'border:1.5px solid #146c43',
      'border-radius:14px',
      'box-shadow:0 16px 38px rgba(15,23,42,0.18)',
      'font-family:system-ui,-apple-system,Segoe UI,sans-serif',
      'color:#0f172a',
    ].join(';');

    // Crisp mint top bar
    const topBar = document.createElement('div');
    topBar.style.cssText =
      'background:#eaf1ee;border-bottom:1px solid #d5e2dc;padding:10px 14px;display:flex;align-items:center;justify-content:space-between;gap:8px;';

    const brandWrap = document.createElement('div');
    brandWrap.style.cssText = 'display:flex;align-items:center;gap:6px;font-size:12px;font-weight:700;color:#146c43;min-width:0;overflow-wrap:anywhere;';
    brandWrap.textContent = `NutriCheck · ${platform || 'Store Check'}`;
    topBar.appendChild(brandWrap);

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.textContent = '×';
    closeBtn.title = 'Close';
    closeBtn.setAttribute('aria-label', 'Close NutriCheck popup');
    closeBtn.style.cssText =
      'background:transparent;border:none;color:#475569;font-size:20px;cursor:pointer;line-height:1;min-width:30px;min-height:30px;display:inline-flex;align-items:center;justify-content:center;padding:0;flex-shrink:0;';
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

    // Product Image on Top (when available) + Title & Verdict Row
    if (imageUrl) {
      const imgWrap = document.createElement('div');
      imgWrap.style.cssText =
        'width:100%;height:112px;background:#f8faf9;border:1px solid #dfe7e3;border-radius:10px;display:flex;align-items:center;justify-content:center;padding:8px;margin-bottom:10px;box-sizing:border-box;overflow:hidden;';
      const imgEl = document.createElement('img');
      imgEl.referrerPolicy = 'no-referrer';
      imgEl.src = imageUrl;
      imgEl.alt = productName || 'Product';
      imgEl.style.cssText = 'max-width:100%;max-height:100%;object-fit:contain;';
      imgEl.onerror = () => imgWrap.remove();
      imgWrap.appendChild(imgEl);
      body.appendChild(imgWrap);
    }

    // Ingredients block right below image / above summary
    if (ingredientsText) {
      const ingBox = document.createElement('div');
      ingBox.style.cssText =
        'background:#f8faf9;border:1px solid #dfe7e3;border-radius:8px;padding:8px 10px;margin-bottom:10px;';
      const ingLbl = document.createElement('div');
      ingLbl.textContent = 'INGREDIENTS';
      ingLbl.style.cssText = 'font-size:10px;font-weight:700;letter-spacing:0.06em;color:#475569;margin-bottom:3px;';
      const ingVal = document.createElement('div');
      ingVal.textContent = ingredientsText
        .replace(/^ingredients(?:\s*\/\s*dish\s*notes)?\s*[:\-]?\s*/i, '')
        .slice(0, 220);
      ingVal.style.cssText = 'font-size:12px;color:#0f172a;line-height:1.4;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;';
      ingBox.appendChild(ingLbl);
      ingBox.appendChild(ingVal);
      body.appendChild(ingBox);
    }

    const titleRow = document.createElement('div');
    titleRow.style.cssText = 'display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:8px;';

    const nameEl = document.createElement('div');
    nameEl.textContent = productName || toastData.title || 'Food Item';
    nameEl.style.cssText =
      'font-size:13.5px;font-weight:700;color:#0f172a;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;';
    titleRow.appendChild(nameEl);

    const pill = document.createElement('div');
    pill.style.cssText = `flex-shrink:0;padding:4px 8px;border-radius:6px;background:${badgeStyle.bg};border:1px solid ${badgeStyle.border};color:${badgeStyle.ink};font-size:12px;font-weight:700;white-space:nowrap;`;
    pill.textContent =
      score != null ? `${verdict || 'Score'} · ${score}` : verdict || 'Checking...';
    titleRow.appendChild(pill);
    body.appendChild(titleRow);

    if (sourceLabel) {
      const srcNote = document.createElement('div');
      srcNote.style.cssText = isEstimated
        ? 'font-size:11px;font-weight:600;color:#92400e;background:#fef3c7;border:1px solid #fde68a;border-radius:6px;padding:4px 8px;margin-bottom:8px;line-height:1.35;'
        : 'font-size:11px;font-weight:600;color:#166534;background:#dcfce7;border:1px solid #bbf7d0;border-radius:6px;padding:4px 8px;margin-bottom:8px;line-height:1.35;';
      srcNote.textContent = isEstimated
        ? `Estimated (${sourceLabel}) — open packet photo or click Store Connect to scan exact label`
        : `✓ ${sourceLabel}`;
      body.appendChild(srcNote);
    }

    const summaryEl = document.createElement('p');
    summaryEl.textContent = takeaway || message || '';
    summaryEl.style.cssText = 'margin:0 0 10px 0;font-size:12.5px;color:#475569;line-height:1.45;';
    body.appendChild(summaryEl);

    // Compact 4-cell mini nutrition strip
    if (macros && macros.calories != null) {
      const strip = document.createElement('div');
      strip.style.cssText =
        'display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:10px;background:#f8faf9;border:1px solid #dfe7e3;border-radius:8px;padding:8px 6px;text-align:center;';

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
        lbl.style.cssText = 'font-size:10px;color:#64748b;font-weight:600;';
        const val = document.createElement('div');
        val.textContent = v;
        val.style.cssText = 'font-size:12.5px;color:#0f172a;font-weight:700;margin-top:2px;';
        cell.appendChild(lbl);
        cell.appendChild(val);
        strip.appendChild(cell);
      }
      body.appendChild(strip);
    }

    // Ingredient classification bar + chips
    if (ingredientSummary && ingredientSummary.total > 0) {
      const { goodCount, modCount, badCount, total, highlights } = ingredientSummary;
      const barWrap = document.createElement('div');
      barWrap.style.cssText = 'margin-bottom:10px;';

      const barLabel = document.createElement('div');
      barLabel.style.cssText = 'font-size:11px;font-weight:700;color:#475569;margin-bottom:4px;display:flex;justify-content:space-between;';
      barLabel.textContent = `Ingredient Check (${goodCount} good · ${modCount + badCount} to watch)`;
      barWrap.appendChild(barLabel);

      const bar = document.createElement('div');
      bar.style.cssText = 'height:7px;border-radius:4px;overflow:hidden;display:flex;background:#e2e8f0;margin-bottom:7px;';
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
        seg.style.cssText = `width:${(badCount / total) * 100}%;background:#be123c;`;
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
              ? { bg: '#dcfce7', fg: '#166534', bd: '#bbf7d0', prefix: '✓ ' }
              : item.rating === 'moderate'
              ? { bg: '#fef3c7', fg: '#92400e', bd: '#fde68a', prefix: '! ' }
              : { bg: '#fce7f3', fg: '#9f1239', bd: '#fbcfe8', prefix: '✕ ' };
          chip.textContent = `${c.prefix}${item.ingredient}`;
          chip.style.cssText = `font-size:11px;font-weight:600;padding:2px 7px;border-radius:4px;background:${c.bg};color:${c.fg};border:1px solid ${c.bd};`;
          chipsRow.appendChild(chip);
        }
        barWrap.appendChild(chipsRow);
      }
      body.appendChild(barWrap);
    }

    // Emerald Green Action Button
    const actionsRow = document.createElement('div');
    actionsRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:4px;';

    const openBtn = document.createElement('button');
    openBtn.type = 'button';
    openBtn.textContent = 'Open in Store Connect ↗';
    openBtn.style.cssText =
      'flex:1;background:#146c43;color:#ffffff;border:1px solid #105635;border-radius:8px;padding:9px 12px;font-size:12.5px;font-weight:700;cursor:pointer;';
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

  let lastDispatchedKey = '';
  let lastDispatchedAt = 0;

  function sendForAnalysis(details, { force = false } = {}) {
    const title = cleanExtractedTitle(details.productTitle);
    if (!title) return;
    const gallery = Array.isArray(details.galleryImages) ? details.galleryImages : [];
    const dispatchKey = `${title.toLowerCase()}::${gallery[0] || details.imageUrl || ''}`;
    const now = Date.now();
    if (!force && dispatchKey === lastDispatchedKey && now - lastDispatchedAt < 4000) {
      return;
    }
    lastDispatchedKey = dispatchKey;
    lastDispatchedAt = now;

    chrome.runtime.sendMessage(
      {
        type: 'HEALTHGUARD_ADD_TO_CART',
        payload: {
          product_title: title,
          product_url: details.productUrl,
          image_url: details.imageUrl || undefined,
          gallery_images: gallery.length ? gallery : undefined,
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
      'bottom:14px',
      'right:14px',
      'z-index:2147483646',
      'max-width:calc(100vw - 28px)',
      'min-height:42px',
      'box-sizing:border-box',
      'background:#146c43',
      'color:#ffffff',
      'border:1px solid #105635',
      'border-radius:8px',
      'padding:10px 14px',
      'font-family:system-ui,-apple-system,Segoe UI,sans-serif',
      'font-size:13px',
      'font-weight:700',
      'cursor:pointer',
      'box-shadow:0 8px 20px rgba(15,23,42,0.18)',
    ].join(';');

    btn.onclick = async () => {
      const title = extractProductTitleFromDoc(document, null, null, platform);
      if (!title) return;
      const heroImg = extractProductImageFromDoc(document, null, platform);
      const details = await resolveProductDetails({
        platform,
        isMainDetailPage: true,
        initialTitle: title,
        dpUrl: window.location.href,
        imageUrl: heroImg,
        galleryImages: extractGalleryImagesFromDoc(document, null, platform, heroImg),
        cardNotes: '',
      });
      sendForAnalysis(details, { force: true });
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

  let pendingPressState = null;

  function dispatchSnapshot(btn, snapshot) {
    if (!snapshot || (!snapshot.initialTitle && !snapshot.dpUrl)) return;

    if (snapshot.isMainDetailPage || !snapshot.dpUrl || snapshot.dpUrl === window.location.href) {
      const extractedNow = extractIngredientsAndNutritionFromDoc(document);
      const metaNow = extractBrandAndBarcodeFromDoc(document);
      const heroImg = snapshot.imageUrl || extractProductImageFromDoc(document, null, snapshot.platform);
      const gallery =
        Array.isArray(snapshot.galleryImages) && snapshot.galleryImages.length > 0
          ? snapshot.galleryImages
          : extractGalleryImagesFromDoc(document, null, snapshot.platform, heroImg);
      sendForAnalysis({
        platform: snapshot.platform,
        productTitle: snapshot.initialTitle,
        productUrl: snapshot.dpUrl || window.location.href,
        imageUrl: heroImg,
        galleryImages: gallery,
        nutritionText: extractedNow.nutritionText,
        ingredientsText: extractedNow.ingredientsText || snapshot.cardNotes,
        brand: metaNow.brand,
        barcode: metaNow.barcode,
      });
      return;
    }

    const isFormSubmit =
      btn &&
      (btn.tagName === 'INPUT' ||
        btn.getAttribute('type') === 'submit' ||
        Boolean(btn.closest('form')));
    if (isFormSubmit) {
      const extractedNow = extractIngredientsAndNutritionFromDoc(document);
      sendForAnalysis({
        platform: snapshot.platform,
        productTitle: snapshot.initialTitle,
        productUrl: snapshot.dpUrl || window.location.href,
        imageUrl: snapshot.imageUrl,
        galleryImages: snapshot.galleryImages || [],
        nutritionText: extractedNow.nutritionText,
        ingredientsText: snapshot.cardNotes || extractedNow.ingredientsText,
        brand: '',
        barcode: '',
      });
    } else {
      void (async () => {
        const details = await resolveProductDetails(snapshot);
        sendForAnalysis(details);
      })();
    }
  }

  document.addEventListener(
    'pointerdown',
    (event) => {
      const btn = isAddToCartElement(event.target);
      if (!btn) return;
      const snapshot = captureClickSnapshot(btn);
      if (!snapshot.initialTitle && !snapshot.dpUrl) return;
      if (pendingPressState?.timer) clearTimeout(pendingPressState.timer);
      pendingPressState = {
        btn,
        snapshot,
        at: Date.now(),
        x: event.clientX || 0,
        y: event.clientY || 0,
        timer: null,
      };
    },
    true
  );

  document.addEventListener(
    'pointerup',
    (event) => {
      if (!pendingPressState) return;
      const dist = Math.hypot(
        (event.clientX || 0) - pendingPressState.x,
        (event.clientY || 0) - pendingPressState.y
      );
      if (dist > 14) {
        if (pendingPressState.timer) clearTimeout(pendingPressState.timer);
        pendingPressState = null;
        return;
      }
      const captured = pendingPressState;
      captured.timer = setTimeout(() => {
        if (pendingPressState === captured) {
          pendingPressState = null;
          dispatchSnapshot(captured.btn, captured.snapshot);
        }
      }, 220);
    },
    true
  );

  document.addEventListener(
    'click',
    (event) => {
      if (pendingPressState?.timer) clearTimeout(pendingPressState.timer);
      let btn = isAddToCartElement(event.target);
      let snapshot = btn ? captureClickSnapshot(btn) : null;

      // If React unmounted/swapped the "ADD" button into a "+ 1 -" stepper between pointerdown and click:
      if (!btn && pendingPressState && Date.now() - pendingPressState.at < 1200) {
        btn = pendingPressState.btn;
        snapshot = pendingPressState.snapshot;
      }
      pendingPressState = null;

      if (!btn || !snapshot) return;
      dispatchSnapshot(btn, snapshot);
    },
    true
  );

  // Backup form-submit & MutationObserver for Amazon "Added to Cart" drawer / smart wagon confirmation
  if (detectPlatform() === 'Amazon' && document.body) {
    document.addEventListener(
      'submit',
      (event) => {
        const form = event.target;
        if (!(form instanceof HTMLFormElement)) return;
        if (form.id !== 'addToCart' && !/cart\/add/i.test(form.action || '')) return;
        const title = extractProductTitleFromDoc(document, null, null, 'Amazon');
        if (!title) return;
        const extracted = extractIngredientsAndNutritionFromDoc(document);
        const meta = extractBrandAndBarcodeFromDoc(document);
        const heroImg = extractProductImageFromDoc(document, null, 'Amazon');
        sendForAnalysis({
          platform: 'Amazon',
          productTitle: title,
          productUrl: window.location.href,
          imageUrl: heroImg,
          galleryImages: extractGalleryImagesFromDoc(document, null, 'Amazon', heroImg),
          nutritionText: extracted.nutritionText,
          ingredientsText: extracted.ingredientsText,
          brand: meta.brand,
          barcode: meta.barcode,
        });
      },
      true
    );

    const confSelector =
      '#NATC_SMART_WAGON_CONF_MSG_SUCCESS, #sw-atc-confirmation, #attach-added-to-cart-message, #huc-v2-order-row-confirm-text, #attach-desktop-sideSheet';
    const atcObserver = new MutationObserver((mutations) => {
      let triggered = false;
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (!(node instanceof Element)) continue;
          if (node.matches(confSelector) || node.querySelector(confSelector)) {
            triggered = true;
            break;
          }
        }
        if (triggered) break;
      }
      if (!triggered) return;
      const title = extractProductTitleFromDoc(document, null, null, 'Amazon');
      if (!title) return;
      const extracted = extractIngredientsAndNutritionFromDoc(document);
      const meta = extractBrandAndBarcodeFromDoc(document);
      const heroImg = extractProductImageFromDoc(document, null, 'Amazon');
      sendForAnalysis({
        platform: 'Amazon',
        productTitle: title,
        productUrl: window.location.href,
        imageUrl: heroImg,
        galleryImages: extractGalleryImagesFromDoc(document, null, 'Amazon', heroImg),
        nutritionText: extracted.nutritionText,
        ingredientsText: extracted.ingredientsText,
        brand: meta.brand,
        barcode: meta.barcode,
      });
    });
    atcObserver.observe(document.body, { childList: true, subtree: true });
  }
})();
