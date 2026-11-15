import React, { useState } from 'react';
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  Image as ImageIcon,
  PieChart,
  Puzzle,
  ShoppingCart,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { BreakdownPieChart } from './BreakdownPieChart';
import { useAuth } from '../context/AuthContext';
import {
  HEALTH_CONDITION_OPTIONS,
  evaluateProfileAlertsForValues,
  getAgeGroupLabel,
} from '../utils/healthProfileEngine';
import { scanPacketLocally } from '../utils/localNutritionEngine';
import type { AmazonCartEvent } from '../types';

interface AmazonConnectViewProps {
  events: AmazonCartEvent[];
  isSubmitting: boolean;
  submitError: string | null;
  onAnalyzeAmazonText: (payload: {
    product_title: string;
    nutrition_text: string;
    ingredients_text?: string;
    product_url?: string;
    image_url?: string;
    source_platform?: string;
  }) => Promise<void>;
  onDeleteEvent: (eventId: string) => void;
  onClearEvents: () => void;
}

interface QuickStoreProduct {
  id: string;
  store: 'Amazon' | 'Flipkart' | 'Swiggy Instamart' | 'Zomato';
  title: string;
  image_url: string;
  ingredients_text: string;
  nutrition_text: string;
  product_url: string;
}

const QUICK_STORE_PRODUCTS: QuickStoreProduct[] = [
  {
    id: 'qs-oats',
    store: 'Amazon',
    title: 'Quaker Rolled Oats 1kg',
    image_url:
      'https://images.openfoodfacts.org/images/products/003/000/001/0402/front_en.104.200.jpg',
    ingredients_text: 'Wholegrain Rolled Oats (100%)',
    nutrition_text: 'Calories 379, Sugars 1.0g, Fat 6.5g, Protein 13.2g, Sodium 4mg',
    product_url: 'https://www.amazon.in/s?k=Quaker+Rolled+Oats',
  },
  {
    id: 'qs-dry-fruits',
    store: 'Flipkart',
    title: 'Mixed Dry Fruits & Nuts 500g',
    image_url:
      'https://images.openfoodfacts.org/images/products/327/408/000/5003/front_en.3.200.jpg',
    ingredients_text: 'Almonds, Cashews, Walnuts, Pistachios, Raisins, Dried Dates',
    nutrition_text: 'Calories 465, Sugars 14.0g, Fat 28.5g, Protein 14.2g, Sodium 6mg',
    product_url: 'https://www.flipkart.com/search?q=Mixed+Dry+Fruits',
  },
  {
    id: 'qs-noodles',
    store: 'Swiggy Instamart',
    title: 'Maggi 2-Minute Masala Noodles',
    image_url:
      'https://images.openfoodfacts.org/images/products/890/105/800/0290/front_en.48.200.jpg',
    ingredients_text:
      'Refined Wheat Flour (Maida), Palm Oil, Iodized Salt, Spices, Sugar, Thickener, Flavor Enhancer',
    nutrition_text: 'Calories 427, Sugars 2.1g, Fat 15.7g, Protein 8.2g, Sodium 1120mg',
    product_url: 'https://www.swiggy.com/instamart',
  },
  {
    id: 'qs-choc',
    store: 'Amazon',
    title: 'Cadbury Dairy Milk Chocolate Bar',
    image_url:
      'https://images.openfoodfacts.org/images/products/762/220/113/0268/front_en.34.200.jpg',
    ingredients_text: 'Sugar, Milk Solids, Cocoa Butter, Cocoa Mass, Emulsifiers (Soy Lecithin)',
    nutrition_text: 'Calories 535, Sugars 51.5g, Fat 29.7g, Protein 7.6g, Sodium 79mg',
    product_url: 'https://www.amazon.in/s?k=Cadbury+Dairy+Milk',
  },
];

function getVerdictLabel(classification: 'Healthy' | 'Moderate' | 'Unhealthy'): string {
  if (classification === 'Healthy') return 'Good';
  if (classification === 'Moderate') return 'Moderate';
  return 'Not Good';
}

function inferPlatformLabel(ev: AmazonCartEvent): string {
  if (ev.source_platform) return ev.source_platform;
  const hay = `${ev.product_url || ''} ${ev.source || ''}`.toLowerCase();
  if (hay.includes('flipkart')) return 'Flipkart';
  if (hay.includes('instamart')) return 'Swiggy Instamart';
  if (hay.includes('swiggy')) return 'Swiggy';
  if (hay.includes('zomato')) return 'Zomato';
  if (hay.includes('blinkit')) return 'Blinkit';
  if (hay.includes('amazon')) return 'Amazon';
  return 'Online Store';
}

const SUPPORTED_STORES = [
  'Amazon',
  'Flipkart',
  'Swiggy Instamart',
  'Swiggy Food',
  'Zomato',
  'Blinkit',
];

export function AmazonConnectView({
  events,
  isSubmitting,
  submitError,
  onAnalyzeAmazonText,
  onDeleteEvent,
  onClearEvents,
}: AmazonConnectViewProps) {
  const { currentUser } = useAuth();
  const [productTitle, setProductTitle] = useState('');
  const [nutritionText, setNutritionText] = useState('');
  const [ingredientsText, setIngredientsText] = useState('');
  const [productUrl, setProductUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [expandedChartId, setExpandedChartId] = useState<string | null>(null);
  const [addingQuickId, setAddingQuickId] = useState<string | null>(null);

  const serverOrigin =
    typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

  const activeConditionLabels = currentUser
    ? HEALTH_CONDITION_OPTIONS.filter((opt) =>
        currentUser.conditions.includes(opt.key)
      ).map((opt) => opt.label)
    : [];

  function handleCopyOrigin() {
    if (navigator.clipboard) {
      void navigator.clipboard.writeText(serverOrigin);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    }
  }

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!productTitle.trim()) return;
    await onAnalyzeAmazonText({
      product_title: productTitle.trim(),
      nutrition_text: nutritionText.trim(),
      ingredients_text: ingredientsText.trim() || undefined,
      product_url: productUrl.trim() || undefined,
      image_url: imageUrl.trim() || undefined,
    });
  }

  async function handleQuickAdd(item: QuickStoreProduct) {
    setAddingQuickId(item.id);
    try {
      await onAnalyzeAmazonText({
        product_title: item.title,
        nutrition_text: item.nutrition_text,
        ingredients_text: item.ingredients_text,
        product_url: item.product_url,
        image_url: item.image_url,
        source_platform: item.store,
      });
    } finally {
      setAddingQuickId(null);
    }
  }

  return (
    <div>
      {currentUser && (
        <div
          className="active-profile-bar"
          role="region"
          aria-label="Active health profile"
          style={{ marginBottom: '20px' }}
        >
          <div className="active-profile-bar-copy">
            <strong>Add-to-cart screening for {currentUser.fullName}</strong>
            <span>
              {' '}
              · {getAgeGroupLabel(currentUser.age)} ({currentUser.age} yrs)
              {activeConditionLabels.length > 0
                ? ` · Conditions: ${activeConditionLabels.join(', ')}`
                : ' · Standard healthy thresholds'}
              {currentUser.allergies.length > 0
                ? ` · Allergies: ${currentUser.allergies.join(', ')}`
                : ''}
            </span>
          </div>
          <Link to="/profile" className="text-action-link" style={{ flexShrink: 0 }}>
            <SlidersHorizontal size={14} />
            <span>Edit health profile</span>
          </Link>
        </div>
      )}

      {/* Quick Store Add-to-Cart Product Shelf */}
      <section className="card" style={{ marginBottom: '24px' }} aria-labelledby="quick-store-heading">
        <div className="card-header">
          <div>
            <h2 id="quick-store-heading" className="card-title">
              Store Products — Add to Cart &amp; Screen
            </h2>
            <p className="card-subtitle">
              Click Add to Cart on any store item to see the top popup alert, product photo, ingredients, and risk result.
            </p>
          </div>
        </div>

        <div className="quick-store-grid">
          {QUICK_STORE_PRODUCTS.map((item) => (
            <div key={item.id} className="quick-store-card">
              <div className="quick-store-top">
                <span className="store-chip">{item.store}</span>
              </div>
              <div className="quick-store-img-box">
                <img
                  src={item.image_url}
                  alt={item.title}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
              <div className="quick-store-ing-preview">
                <strong>Ingredients:</strong> {item.ingredients_text}
              </div>
              <div className="quick-store-title">{item.title}</div>
              <button
                type="button"
                className="btn-primary"
                style={{ width: '100%', flex: 'none', padding: '9px 12px' }}
                disabled={addingQuickId === item.id || isSubmitting}
                onClick={() => handleQuickAdd(item)}
              >
                <ShoppingCart size={14} />
                <span>
                  {addingQuickId === item.id ? 'Checking...' : 'Add to Cart'}
                </span>
              </button>
            </div>
          ))}
        </div>
      </section>

      <div className="two-col-grid">
        <div className="result-column">
          <section className="card" aria-labelledby="amazon-paste-heading">
            <div className="card-header">
              <div>
                <h2 id="amazon-paste-heading" className="card-title">
                  Add Product to Cart &amp; Check
                </h2>
                <p className="card-subtitle">
                  Enter any store item name, product image URL, and ingredients or nutrition text.
                </p>
              </div>
            </div>

            <form className="form-stack" onSubmit={handleFormSubmit}>
              <div className="field">
                <label htmlFor="amz-title" className="field-label">
                  <span>Product Name</span>
                  <span className="field-unit">Required</span>
                </label>
                <input
                  id="amz-title"
                  type="text"
                  required
                  className="field-input"
                  placeholder="e.g., India Gate Basmati Rice, Mixed Dry Fruits, or Maggi"
                  value={productTitle}
                  onChange={(e) => setProductTitle(e.target.value)}
                />
              </div>

              <div className="field">
                <label htmlFor="amz-ingredients" className="field-label">
                  <span>Ingredients Text</span>
                  <span className="field-unit">Shown above nutrition details</span>
                </label>
                <textarea
                  id="amz-ingredients"
                  className="field-input field-textarea"
                  style={{ minHeight: '72px' }}
                  placeholder="e.g., Ingredients: Wholegrain Rolled Oats, Almonds, Chia Seeds"
                  value={ingredientsText}
                  onChange={(e) => setIngredientsText(e.target.value)}
                />
              </div>

              <div className="field">
                <label htmlFor="amz-nutrition" className="field-label">
                  <span>Nutrition Facts Text</span>
                  <span className="field-unit">Optional</span>
                </label>
                <textarea
                  id="amz-nutrition"
                  className="field-input field-textarea"
                  style={{ minHeight: '68px' }}
                  placeholder="e.g., Calories 356, Sugars 0.1g, Fat 0.6g, Protein 7.1g, Sodium 5mg"
                  value={nutritionText}
                  onChange={(e) => setNutritionText(e.target.value)}
                />
              </div>

              <div className="field-grid">
                <div className="field">
                  <label htmlFor="amz-img" className="field-label">
                    <span>Product Image URL</span>
                    <span className="field-unit">Optional</span>
                  </label>
                  <input
                    id="amz-img"
                    type="url"
                    className="field-input"
                    placeholder="https://m.media-amazon.com/images/..."
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                  />
                </div>

                <div className="field">
                  <label htmlFor="amz-url" className="field-label">
                    <span>Store Product Link</span>
                    <span className="field-unit">Optional</span>
                  </label>
                  <input
                    id="amz-url"
                    type="url"
                    className="field-input"
                    placeholder="https://www.amazon.in/dp/..."
                    value={productUrl}
                    onChange={(e) => setProductUrl(e.target.value)}
                  />
                </div>
              </div>

              {submitError && (
                <div className="error-banner" role="alert">
                  <AlertCircle size={16} />
                  <span>{submitError}</span>
                </div>
              )}

              <button type="submit" className="btn-primary" disabled={isSubmitting}>
                <ShoppingCart size={16} />
                <span>
                  {isSubmitting ? 'Analyzing Product...' : 'Add to Cart & Analyze'}
                </span>
              </button>
            </form>
          </section>

          <section className="card" aria-labelledby="amazon-ext-heading">
            <div className="card-header">
              <div>
                <h2 id="amazon-ext-heading" className="card-title">
                  Chrome Extension Store Sync
                </h2>
                <p className="card-subtitle">
                  Captures product photo, ingredients, and nutrition automatically when you click Add to Cart.
                </p>
              </div>
              <Puzzle size={20} color="#146c43" />
            </div>

            <div className="info-callout">
              <strong>Supported shopping apps:</strong> Load the{' '}
              <code>extension/</code> folder in Chrome/Edge and save your live URL. Clicking{' '}
              <strong>Add to Cart</strong> triggers an instant popup on the store page and syncs the product photo + ingredients here.
              <div className="store-chips-row" aria-label="Supported stores">
                {SUPPORTED_STORES.map((store) => (
                  <span key={store} className="store-chip">
                    {store}
                  </span>
                ))}
              </div>
            </div>

            <ol className="rule-list" style={{ marginBottom: '14px' }}>
              <li>
                Open <code>chrome://extensions</code>, enable <strong>Developer mode</strong>, and click{' '}
                <strong>Load unpacked</strong> on <code>extension/</code>.
              </li>
              <li>
                Click the <strong>NutriCheck</strong> extension icon, paste this URL, and click <strong>Save URL</strong>:
              </li>
            </ol>

            <div className="url-copy-box">
              <div className="url-code">{serverOrigin}</div>
              <button
                type="button"
                className="btn-secondary"
                onClick={handleCopyOrigin}
              >
                {copiedUrl ? <Check size={14} /> : <Copy size={14} />}
                <span>{copiedUrl ? 'Copied' : 'Copy URL'}</span>
              </button>
            </div>
          </section>
        </div>

        <section className="card" aria-labelledby="amazon-feed-heading">
          <div className="card-header">
            <div>
              <h2 id="amazon-feed-heading" className="card-title">
                Added to Cart Products ({events.length})
              </h2>
              <p className="card-subtitle">
                Synced from Amazon, Flipkart, Swiggy Instamart, Zomato, Blinkit, or added directly.
              </p>
            </div>
            {events.length > 0 && (
              <button
                type="button"
                className="cart-remove-btn"
                onClick={onClearEvents}
              >
                Clear Cart
              </button>
            )}
          </div>

          {events.length === 0 ? (
            <div className="empty-state" style={{ padding: '32px 16px' }}>
              <h3 className="empty-title">No Added to Cart Products Yet</h3>
              <p className="empty-desc">
                Click <strong>Add to Cart</strong> on any store card above, or click{' '}
                <strong>Add to Cart</strong> on Amazon / Flipkart / Swiggy with the extension active.
              </p>
            </div>
          ) : (
            <div className="event-card-list">
              {events.map((ev) => {
                const a = ev.analysis;
                const scan = ev.ingredient_scan;
                const platform = inferPlatformLabel(ev);
                const isChartOpen = expandedChartId === ev.event_id;

                const badgeCls = !a
                  ? 'is-pending'
                  : a.classification === 'Healthy'
                  ? 'is-healthy'
                  : a.classification === 'Moderate'
                  ? 'is-moderate'
                  : 'is-unhealthy';

                const resolvedScan =
                  scan ||
                  (ev.ingredients_text
                    ? scanPacketLocally(ev.product_title, `Ingredients: ${ev.ingredients_text}`)
                    : null);

                const ingGoodCount = resolvedScan
                  ? resolvedScan.ingredient_findings.filter((f) => f.rating === 'good').length
                  : 0;
                const ingBadCount = resolvedScan
                  ? resolvedScan.ingredient_findings.filter((f) => f.rating === 'high').length
                  : 0;
                const ingModCount = resolvedScan
                  ? resolvedScan.ingredient_findings.filter((f) => f.rating === 'moderate').length
                  : 0;
                const ingNeutralCount = resolvedScan
                  ? Math.max(
                      0,
                      resolvedScan.ingredients_count -
                        (ingGoodCount + ingModCount + ingBadCount)
                    )
                  : 0;

                const prof = a
                  ? evaluateProfileAlertsForValues(
                      {
                        productName: ev.product_title,
                        calories: a.nutrition.calories,
                        sugars: a.nutrition.sugars,
                        sodium_mg: a.nutrition.sodium_mg,
                        fat: a.nutrition.fat,
                        ingredientsText: ev.ingredients_text || '',
                        baseScore: a.health_score,
                      },
                      currentUser
                    )
                  : null;

                return (
                  <article key={ev.event_id} className="event-item">
                    <div className="event-item-top">
                      <div>
                        <div className="store-meta-badges">
                          <span className="store-chip">{platform}</span>
                          {prof && (
                            <span
                              className={`risk-tag ${
                                prof.riskLevel === 'LOW RISK'
                                  ? 'is-low'
                                  : prof.riskLevel === 'MODERATE RISK'
                                  ? 'is-moderate'
                                  : 'is-high'
                              }`}
                            >
                              {prof.riskLevel}
                            </span>
                          )}
                        </div>
                        <div className="event-item-title">{ev.product_title}</div>
                        <div className="event-item-meta">
                          {ev.nutrition_source}
                          {ev.matched_food ? ` (${ev.matched_food})` : ''}
                        </div>
                      </div>

                      <div className={`status-badge ${badgeCls}`}>
                        {a ? (
                          <span>
                            {getVerdictLabel(a.classification)} ·{' '}
                            <span className="tabular">{a.health_score}</span>
                          </span>
                        ) : (
                          <span>Needs Nutrition</span>
                        )}
                      </div>
                    </div>

                    {/* Product Image above Ingredients */}
                    <div className="store-product-hero">
                      <div className="store-product-thumb-wrap">
                        {ev.image_url ? (
                          <img
                            src={ev.image_url}
                            alt={ev.product_title}
                            className="store-product-thumb"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="store-product-thumb-empty" aria-hidden="true">
                            <ImageIcon size={24} />
                            <span>{platform}</span>
                          </div>
                        )}
                      </div>

                      <div className="store-ingredients-banner">
                        <div className="store-ingredients-label">Ingredients</div>
                        <p className="store-ingredients-copy">
                          {ev.ingredients_text
                            ? ev.ingredients_text.replace(/^ingredients\s*[:\-]?\s*/i, '')
                            : 'No ingredient list captured from page yet.'}
                        </p>
                        {resolvedScan && (
                          <div className="store-ing-badges">
                            <span
                              className={`eval-pill ${
                                resolvedScan.verdict === 'Good'
                                  ? 'is-good'
                                  : resolvedScan.verdict === 'Moderate'
                                  ? 'is-moderate'
                                  : 'is-high'
                              }`}
                            >
                              {resolvedScan.verdict} ({resolvedScan.score}/100)
                            </span>
                            <span className="amz-ing-counts">
                              {ingGoodCount} good · {ingModCount} caution · {ingBadCount} bad
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {a && (
                      <div className="data-table-wrap" style={{ margin: '10px 0' }}>
                        <table className="data-table nutrition-table amz-mini-table">
                          <thead>
                            <tr>
                              <th className="num">Calories</th>
                              <th className="num">Sugars</th>
                              <th className="num">Fat</th>
                              <th className="num">Protein</th>
                              <th className="num">Sodium</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="num">{a.nutrition.calories} kcal</td>
                              <td className="num">{a.nutrition.sugars} g</td>
                              <td className="num">{a.nutrition.fat} g</td>
                              <td className="num">{a.nutrition.protein} g</td>
                              <td className="num">{Math.round(a.nutrition.sodium_mg)} mg</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )}

                    <p className="card-subtitle" style={{ color: '#475569', marginTop: 6 }}>
                      {a ? a.explanation : ev.message}
                    </p>

                    {prof && (
                      <div
                        className={`profile-alert-box is-${prof.level}`}
                        style={{ marginTop: '10px', padding: '10px 12px' }}
                      >
                        <div className="profile-alert-head-row">
                          <span className="profile-alert-head" style={{ fontSize: '13px' }}>
                            {prof.headline}
                          </span>
                          <span
                            className={`risk-tag ${
                              prof.riskLevel === 'LOW RISK'
                                ? 'is-low'
                                : prof.riskLevel === 'MODERATE RISK'
                                ? 'is-moderate'
                                : 'is-high'
                            }`}
                          >
                            {prof.riskLevel}
                          </span>
                        </div>
                        <p className="card-subtitle" style={{ marginTop: '4px', color: 'inherit' }}>
                          {prof.alerts.join(' · ')}
                        </p>
                        {prof.suggestions.length > 0 && (
                          <div className="profile-suggestions-sub">
                            <strong>Suggestion:</strong> {prof.suggestions.join(' ')}
                          </div>
                        )}
                      </div>
                    )}

                    {isChartOpen && a && (
                      <div style={{ marginTop: '12px' }}>
                        <BreakdownPieChart
                          title="Good vs. Watch Nutrition Share"
                          subtitle="Protective protein vs. sugars, fats & sodium"
                          slices={[
                            {
                              label: 'Good (Protein)',
                              value: Math.max(0.5, a.nutrition.protein * 4),
                              displayValue: `${a.nutrition.protein} g`,
                              color: '#16a34a',
                            },
                            {
                              label: 'Watch (Sugars)',
                              value: Math.max(0, a.nutrition.sugars * 4),
                              displayValue: `${a.nutrition.sugars} g`,
                              color: '#be123c',
                            },
                            {
                              label: 'Watch (Fats + Sodium)',
                              value: Math.max(
                                0,
                                a.nutrition.fat * 9 + a.nutrition.sodium_mg * 0.05
                              ),
                              displayValue: `${a.nutrition.fat} g fat · ${Math.round(a.nutrition.sodium_mg)} mg Na`,
                              color: '#d97706',
                            },
                          ]}
                          centerValue={`${a.health_score}`}
                          centerLabel="Score"
                        />

                        {resolvedScan && resolvedScan.ingredients_count > 0 && (
                          <div style={{ marginTop: '10px' }}>
                            <BreakdownPieChart
                              title="Good vs. Bad Ingredients"
                              subtitle={`${resolvedScan.ingredients_count} ingredients inspected`}
                              slices={[
                                { label: 'Good', value: ingGoodCount, color: '#16a34a', displayValue: `${ingGoodCount}` },
                                { label: 'Caution', value: ingModCount, color: '#d97706', displayValue: `${ingModCount}` },
                                { label: 'Bad', value: ingBadCount, color: '#be123c', displayValue: `${ingBadCount}` },
                                { label: 'Neutral', value: ingNeutralCount, color: '#94a3b8', displayValue: `${ingNeutralCount}` },
                              ]}
                              centerValue={`${resolvedScan.ingredients_count}`}
                              centerLabel="Items"
                            />
                          </div>
                        )}
                      </div>
                    )}

                    <div className="event-item-actions">
                      {a && (
                        <button
                          type="button"
                          className="btn-secondary"
                          style={{ padding: '6px 10px', fontSize: '12.5px' }}
                          onClick={() =>
                            setExpandedChartId(isChartOpen ? null : ev.event_id)
                          }
                        >
                          <PieChart size={13} />
                          <span>{isChartOpen ? 'Hide Pie Chart' : 'View Pie Chart'}</span>
                          {isChartOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                        </button>
                      )}

                      {!a && (
                        <button
                          type="button"
                          className="btn-secondary"
                          style={{ padding: '6px 10px', fontSize: '12.5px' }}
                          onClick={() => {
                            setProductTitle(ev.product_title);
                            setProductUrl(ev.product_url || '');
                            setImageUrl(ev.image_url || '');
                            setNutritionText('');
                            setIngredientsText(ev.ingredients_text || '');
                            document.getElementById('amz-nutrition')?.focus();
                          }}
                        >
                          Enter Nutrition Here
                        </button>
                      )}

                      {ev.product_url && (
                        <a
                          href={ev.product_url}
                          target="_blank"
                          rel="noreferrer"
                          className="event-link"
                        >
                          Open {platform} <ExternalLink size={12} style={{ verticalAlign: 'middle' }} />
                        </a>
                      )}

                      <button
                        type="button"
                        className="cart-remove-btn"
                        onClick={() => onDeleteEvent(ev.event_id)}
                        aria-label={`Remove ${ev.product_title}`}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
