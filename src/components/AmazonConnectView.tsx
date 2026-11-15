import React, { useState } from 'react';
import {
  AlertCircle,
  Check,
  Copy,
  ExternalLink,
  Puzzle,
  Search,
  Trash2,
} from 'lucide-react';
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
  }) => Promise<void>;
  onInspectEventInAnalyzer: (event: AmazonCartEvent) => void;
  onDeleteEvent: (eventId: string) => void;
  onClearEvents: () => void;
}

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
  onInspectEventInAnalyzer,
  onDeleteEvent,
  onClearEvents,
}: AmazonConnectViewProps) {
  const [productTitle, setProductTitle] = useState('');
  const [nutritionText, setNutritionText] = useState('');
  const [ingredientsText, setIngredientsText] = useState('');
  const [productUrl, setProductUrl] = useState('');
  const [copiedUrl, setCopiedUrl] = useState(false);

  const serverOrigin =
    typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

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
    });
  }

  return (
    <div className="two-col-grid">
      <div className="result-column">
        <section className="card" aria-labelledby="amazon-ext-heading">
          <div className="card-header">
            <div>
              <h2 id="amazon-ext-heading" className="card-title">
                Online Store &amp; Food Extension (General)
              </h2>
              <p className="card-subtitle">
                Checks ingredients and calories right on product pages and on every Add to Cart click.
              </p>
            </div>
            <Puzzle size={20} color="#ca8a04" />
          </div>

          <div className="info-callout">
            <strong>Works across grocery stores &amp; food apps:</strong> Load the{' '}
            <code>extension/</code> folder in Chrome/Edge and save your live URL. On any supported store, click{' '}
            <strong>Check Ingredients · NutriCheck</strong> directly on a product page or click{' '}
            <strong>Add / Add to Cart</strong> to see a simple summary card and sync full charts here.
            <div className="store-chips-row" aria-label="Supported stores">
              {SUPPORTED_STORES.map((store) => (
                <span key={store} className="store-chip">
                  {store}
                </span>
              ))}
            </div>
          </div>

          <ol className="rule-list" style={{ marginBottom: '16px' }}>
            <li>
              Open <code>chrome://extensions</code> in Chrome/Edge, enable{' '}
              <strong>Developer mode</strong>, and click{' '}
              <strong>Load unpacked</strong> on the <code>extension/</code>{' '}
              folder (or click Reload ↻ after updating).
            </li>
            <li>
              Click the <strong>NutriCheck</strong> extension icon, paste your
              active URL below, and click <strong>Save URL</strong>:
            </li>
            <li>
              Browse Amazon, Flipkart, Swiggy Instamart, Zomato, or Blinkit in Chrome — ingredient checks appear right on the page and sync here automatically.
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

        <section className="card" aria-labelledby="amazon-paste-heading">
          <div className="card-header">
            <div>
              <h2 id="amazon-paste-heading" className="card-title">
                Check Any Grocery Item or Restaurant Dish
              </h2>
              <p className="card-subtitle">
                Enter any item name (e.g., &ldquo;Mixed Dry Fruits&rdquo;, &ldquo;Masala Dosa&rdquo;, or &ldquo;Maggi Noodles&rdquo;) and optional label text.
              </p>
            </div>
          </div>

          <form className="form-stack" onSubmit={handleFormSubmit}>
            <div className="field">
              <label htmlFor="amz-title" className="field-label">
                <span>Product or Food Name</span>
                <span className="field-unit">Required</span>
              </label>
              <input
                id="amz-title"
                type="text"
                required
                className="field-input"
                placeholder="e.g., India Gate Basmati Rice, Paneer Butter Masala, or Maggi"
                value={productTitle}
                onChange={(e) => setProductTitle(e.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="amz-ingredients" className="field-label">
                <span>Ingredients Text (from product page)</span>
                <span className="field-unit">Optional</span>
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
                <span>Nutrition Facts Text (from product page)</span>
                <span className="field-unit">Optional</span>
              </label>
              <textarea
                id="amz-nutrition"
                className="field-input field-textarea"
                style={{ minHeight: '72px' }}
                placeholder="e.g., Calories 356, Sugars 0.1g, Fat 0.6g, Protein 7.1g, Sodium 5mg (leave blank for auto-lookup)"
                value={nutritionText}
                onChange={(e) => setNutritionText(e.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="amz-url" className="field-label">
                <span>Store Link</span>
                <span className="field-unit">Optional</span>
              </label>
              <input
                id="amz-url"
                type="url"
                className="field-input"
                placeholder="https://www.amazon.in/... or flipkart.com / swiggy.com / zomato.com"
                value={productUrl}
                onChange={(e) => setProductUrl(e.target.value)}
              />
            </div>

            {submitError && (
              <div className="error-banner" role="alert">
                <AlertCircle size={16} />
                <span>{submitError}</span>
              </div>
            )}

            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              <Search size={16} />
              <span>
                {isSubmitting ? 'Analyzing Food...' : 'Analyze Food Item'}
              </span>
            </button>
          </form>
        </section>
      </div>

      <section className="card" aria-labelledby="amazon-feed-heading">
        <div className="card-header">
          <div>
            <h2 id="amazon-feed-heading" className="card-title">
              Live Store &amp; Food Monitor ({events.length})
            </h2>
            <p className="card-subtitle">
              Updates automatically from Amazon, Flipkart, Swiggy Instamart, Zomato &amp; Blinkit.
            </p>
          </div>
          {events.length > 0 && (
            <button
              type="button"
              className="cart-remove-btn"
              onClick={onClearEvents}
            >
              Clear Feed
            </button>
          )}
        </div>

        {events.length === 0 ? (
          <div className="empty-state" style={{ padding: '32px 16px' }}>
            <h3 className="empty-title">Waiting for Store Scans or Add-to-Cart Clicks</h3>
            <p className="empty-desc">
              Click <strong>Check Ingredients</strong> or <strong>Add to Cart</strong> on
              Amazon, Flipkart, Swiggy Instamart, or Zomato — or test any food on the left
              to see its simple verdict, calories table, and pie chart here.
            </p>
          </div>
        ) : (
          <div className="event-card-list">
            {events.map((ev) => {
              const a = ev.analysis;
              const scan = ev.ingredient_scan;
              const platform = inferPlatformLabel(ev);
              const badgeCls = !a
                ? 'is-pending'
                : a.classification === 'Healthy'
                ? 'is-healthy'
                : a.classification === 'Moderate'
                ? 'is-moderate'
                : 'is-unhealthy';

              const ingGoodCount = scan
                ? scan.ingredient_findings.filter((f) => f.rating === 'good').length
                : 0;
              const ingBadCount = scan
                ? scan.ingredient_findings.filter((f) => f.rating === 'high').length
                : 0;
              const ingModCount = scan
                ? scan.ingredient_findings.filter((f) => f.rating === 'moderate').length
                : 0;

              return (
                <article key={ev.event_id} className="event-item">
                  <div className="event-item-top">
                    <div>
                      <div className="event-item-title">{ev.product_title}</div>
                      <div className="event-item-meta">
                        {platform} · {ev.nutrition_source}
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

                  {scan && (
                    <div className="amz-ing-strip">
                      <span
                        className={`eval-pill ${
                          scan.verdict === 'Good'
                            ? 'is-good'
                            : scan.verdict === 'Moderate'
                            ? 'is-moderate'
                            : 'is-high'
                        }`}
                      >
                        Ingredients: {scan.verdict} ({scan.score}/100)
                      </span>
                      <span className="amz-ing-counts">
                        {ingGoodCount} good · {ingModCount} caution · {ingBadCount} bad
                      </span>
                    </div>
                  )}

                  <p className="card-subtitle" style={{ color: '#44403c', marginTop: 6 }}>
                    {a ? a.explanation : ev.message}
                  </p>

                  <div className="event-item-actions">
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ padding: '6px 10px', fontSize: '12.5px' }}
                      onClick={() => onInspectEventInAnalyzer(ev)}
                    >
                      {a ? 'View Pie Chart & Tables' : 'Enter Nutrition Values'}
                    </button>

                    {!a && (
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ padding: '6px 10px', fontSize: '12.5px' }}
                        onClick={() => {
                          setProductTitle(ev.product_title);
                          setProductUrl(ev.product_url || '');
                          setNutritionText('');
                          setIngredientsText(ev.ingredients_text || '');
                          document.getElementById('amz-nutrition')?.focus();
                        }}
                      >
                        Paste Label Here
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
  );
}
