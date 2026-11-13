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
        'h2 span, .a-size-medium, .a-size-base-plus'
      );
      if (cardTitle && cardTitle.textContent.trim()) {
        return cardTitle.textContent.trim();
      }
    }

    const pageTitle =
      document.querySelector('#productTitle') ||
      document.querySelector('#title');
    if (pageTitle && pageTitle.textContent.trim()) {
      return pageTitle.textContent.trim();
    }

    return document.title.replace(/^Amazon\.[^:]+:\s*/i, '').trim();
  }

  function extractNutritionText() {
    const chunks = [];
    const candidateSelectors = [
      '#productDetails_techSpec_section_1',
      '#detailBullets_feature_div',
      '#important-information',
      '#feature-bullets',
      '#aplus',
    ];

    for (const sel of candidateSelectors) {
      const el = document.querySelector(sel);
      if (el && el.innerText) {
        const text = el.innerText.trim();
        if (/calori|sugar|sodium|protein|fat|nutrition/i.test(text)) {
          chunks.push(text.slice(0, 2000));
        }
      }
    }

    document.querySelectorAll('table').forEach((tbl) => {
      const t = tbl.innerText || '';
      if (/calori|nutrition|sodium|sugar|protein/i.test(t)) {
        chunks.push(t.slice(0, 1500));
      }
    });

    return chunks.join('\n').slice(0, 4500);
  }

  function showHealthToast({ level, title, message, score, baseUrl, query }) {
    const existing = document.getElementById('healthguard-amazon-toast');
    if (existing) existing.remove();

    const colors = {
      success: { bg: '#f0fdf4', border: '#bbf7d0', ink: '#15803d' },
      warning: { bg: '#fffbeb', border: '#fde68a', ink: '#b45309' },
      danger: { bg: '#fef2f2', border: '#fecaca', ink: '#b91c1c' },
      info: { bg: '#f5f3ff', border: '#ddd6fe', ink: '#5b21b6' },
    }[level || 'info'];

    const toast = document.createElement('div');
    toast.id = 'healthguard-amazon-toast';
    toast.style.cssText = [
      'position:fixed',
      'top:18px',
      'right:18px',
      'z-index:2147483647',
      'max-width:360px',
      `background:${colors.bg}`,
      `border:1px solid ${colors.border}`,
      `color:${colors.ink}`,
      'border-radius:12px',
      'padding:14px 16px',
      'box-shadow:0 10px 28px rgba(17,24,39,0.14)',
      'font-family:system-ui,-apple-system,sans-serif',
      'font-size:13.5px',
      'line-height:1.45',
    ].join(';');

    const header = document.createElement('div');
    header.style.cssText =
      'display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:4px;font-weight:700;font-size:14.5px;';
    header.textContent = score != null ? `${title} (${score}/100)` : title;

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.textContent = '×';
    closeBtn.style.cssText =
      'background:transparent;border:none;color:inherit;font-size:18px;cursor:pointer;line-height:1;padding:0 2px;';
    closeBtn.onclick = () => toast.remove();
    header.appendChild(closeBtn);

    const body = document.createElement('p');
    body.style.cssText = 'margin:0 0 10px 0;';
    body.textContent = message;

    const linkBtn = document.createElement('button');
    linkBtn.type = 'button';
    linkBtn.textContent = 'Open in HealthGuard Website';
    linkBtn.style.cssText =
      'background:#6d28d9;color:#ffffff;border:none;border-radius:6px;padding:6px 10px;font-size:12px;font-weight:600;cursor:pointer;';
    linkBtn.onclick = () => {
      chrome.runtime.sendMessage({
        type: 'HEALTHGUARD_OPEN_SITE',
        query: query || '',
      });
    };

    toast.appendChild(header);
    toast.appendChild(body);
    toast.appendChild(linkBtn);
    document.body.appendChild(toast);

    setTimeout(() => {
      if (document.body.contains(toast)) toast.remove();
    }, 11000);
  }

  document.addEventListener(
    'click',
    (event) => {
      const btn = isAddToCartElement(event.target);
      if (!btn) return;

      const productTitle = extractProductTitle(btn);
      if (!productTitle) return;

      const nutritionText = extractNutritionText();
      const productUrl = window.location.href;

      chrome.runtime.sendMessage(
        {
          type: 'HEALTHGUARD_ADD_TO_CART',
          payload: {
            product_title: productTitle,
            product_url: productUrl,
            nutrition_text: nutritionText,
            source: 'amazon_browser_extension',
          },
        },
        (response) => {
          if (!response) return;

          if (!response.ok) {
            const fallbackQuery = new URLSearchParams({
              item: productTitle,
              source: 'amazon',
            }).toString();
            showHealthToast({
              level: 'info',
              title: 'HealthGuard: Manual Label Needed',
              message: response.error,
              baseUrl: response.baseUrl,
              query: fallbackQuery,
            });
            return;
          }

          const ev = response.event;
          const a = ev.analysis;
          const query = new URLSearchParams({
            item: a.food_name,
            calories: String(a.nutrition.calories),
            sugars: String(a.nutrition.sugars),
            fat: String(a.nutrition.fat),
            protein: String(a.nutrition.protein),
            sodium_mg: String(a.nutrition.sodium_mg),
            source: 'amazon',
          }).toString();

          showHealthToast({
            level: a.cart_alert.level,
            title: `HealthGuard: ${a.classification}`,
            message: `${a.explanation} (${ev.nutrition_source})`,
            score: a.health_score,
            baseUrl: response.baseUrl,
            query,
          });
        }
      );
    },
    true
  );
})();
