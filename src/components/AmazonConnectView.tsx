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
                Amazon Add-to-Cart Browser Extension
              </h2>
              <p className="card-subtitle">
                Automatically scans Amazon food ingredients &amp; calories on every Add to Cart click.
              </p>
            </div>
            <Puzzle size={20} color="#059669" />
          </div>

          <div className="info-callout">
            <strong>Works for all packed &amp; staple Amazon food items:</strong> Load the{' '}
            <code>extension/</code> folder in Chrome/Edge and save your live URL (
            <code>https://your-app.vercel.app</code> or <code>http://localhost:3000</code>). When you click{' '}
            <strong>Add to Cart</strong> on Amazon, NutriCheck reads the product page ingredients &amp; nutrition facts, falls back across Open Food Facts, our 2,158-food dataset, and grocery staples (like rice, atta, dal, noodles, snacks), and syncs straight to this website.
          </div>

          <ol className="rule-list" style={{ marginBottom: '16px' }}>
            <li>
              Open <code>chrome://extensions</code> in Chrome/Edge, enable{' '}
              <strong>Developer mode</strong>, and click{' '}
              <strong>Load unpacked</strong> on the <code>extension/</code>{' '}
              folder (or click Reload ↻ if already loaded).
            </li>
            <li>
              Click the <strong>NutriCheck</strong> extension icon, paste your
              active URL below, and click <strong>Save URL</strong>:
            </li>
            <li>
              Keep Amazon and NutriCheck in the same Chrome browser — every{' '}
              <strong>Add to Cart</strong> click syncs here automatically.
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
                Analyze Any Amazon Food Item (Manual Intake)
              </h2>
              <p className="card-subtitle">
                Enter an Amazon food title (like &ldquo;rice&rdquo; or &ldquo;Maggi Masala Noodles&rdquo;) and optional Amazon page ingredients/nutrition text.
              </p>
            </div>
          </div>

          <form className="form-stack" onSubmit={handleFormSubmit}>
            <div className="field">
              <label htmlFor="amz-title" className="field-label">
                <span>Amazon Product Title</span>
                <span className="field-unit">Required</span>
              </label>
              <input
                id="amz-title"
                type="text"
                required
                className="field-input"
                placeholder="e.g., India Gate Basmati Rice, Rice, or Maggi Masala Noodles"
                value={productTitle}
                onChange={(e) => setProductTitle(e.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="amz-ingredients" className="field-label">
                <span>Ingredients Text (from Amazon page)</span>
                <span className="field-unit">Optional</span>
              </label>
              <textarea
                id="amz-ingredients"
                className="field-input field-textarea"
                style={{ minHeight: '72px' }}
                placeholder="e.g., Ingredients: Refined Wheat Flour (Maida), Palm Oil, Salt, Sugar, TBHQ"
                value={ingredientsText}
                onChange={(e) => setIngredientsText(e.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="amz-nutrition" className="field-label">
                <span>Nutrition Facts Text (from Amazon page)</span>
                <span className="field-unit">Optional</span>
              </label>
              <textarea
                id="amz-nutrition"
                className="field-input field-textarea"
                style={{ minHeight: '72px' }}
                placeholder="e.g., Calories 356, Sugars 0.1g, Fat 0.6g, Protein 7.1g, Sodium 5mg (or leave blank for auto-lookup)"
                value={nutritionText}
                onChange={(e) => setNutritionText(e.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="amz-url" className="field-label">
                <span>Amazon Product Link</span>
                <span className="field-unit">Optional</span>
              </label>
              <input
                id="amz-url"
                type="url"
                className="field-input"
                placeholder="https://www.amazon.in/dp/... or https://www.amazon.com/dp/..."
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
                {isSubmitting ? 'Analyzing Item...' : 'Analyze Amazon Product'}
              </span>
            </button>
          </form>
        </section>
      </div>

      <section className="card" aria-labelledby="amazon-feed-heading">
        <div className="card-header">
          <div>
            <h2 id="amazon-feed-heading" className="card-title">
              Live Amazon Cart Monitor ({events.length})
            </h2>
            <p className="card-subtitle">
              Updates automatically whenever you click Add to Cart on Amazon with
              the extension active.
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
            <h3 className="empty-title">Waiting for Amazon Add-to-Cart Clicks</h3>
            <p className="empty-desc">
              Click <strong>Add to Cart</strong> on any food product in Amazon
              (with the Chrome extension loaded) or submit an item on the left to
              see its Good, Moderate, or Not Good verdict, calories table, and ingredients here.
            </p>
          </div>
        ) : (
          <div className="event-card-list">
            {events.map((ev) => {
              const a = ev.analysis;
              const scan = ev.ingredient_scan;
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
                        Source: {ev.nutrition_source}
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
                      <span className={`eval-pill ${scan.verdict === 'Good' ? 'is-good' : scan.verdict === 'Moderate' ? 'is-moderate' : 'is-high'}`}>
                        Ingredients: {scan.verdict} ({scan.score}/100)
                      </span>
                      <span className="amz-ing-counts">
                        {ingGoodCount} good · {ingModCount} caution · {ingBadCount} bad
                      </span>
                      {scan.parsed_ingredients.length > 0 && (
                        <div className="amz-ing-preview">
                          Scanned: {scan.parsed_ingredients.slice(0, 6).join(', ')}
                          {scan.parsed_ingredients.length > 6 ? '…' : ''}
                        </div>
                      )}
                    </div>
                  )}

                  <p className="card-subtitle" style={{ color: '#374151', marginTop: 6 }}>
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
                          document
                            .getElementById('amz-nutrition')
                            ?.focus();
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
                        Amazon Page <ExternalLink size={12} style={{ verticalAlign: 'middle' }} />
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
