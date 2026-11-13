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
    product_url?: string;
  }) => Promise<void>;
  onInspectEventInAnalyzer: (event: AmazonCartEvent) => void;
  onDeleteEvent: (eventId: string) => void;
  onClearEvents: () => void;
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
                Real-time interception on Amazon grocery &amp; food product pages.
              </p>
            </div>
            <Puzzle size={20} color="#6d28d9" />
          </div>

          <div className="info-callout">
            <strong>How it works with Amazon:</strong> Mobile OS sandboxing
            prevents any website from reading clicks inside the native Amazon
            mobile app directly. On <strong>Amazon in Chrome or Edge</strong>,
            the included Manifest V3 extension (<code>extension/</code>) hooks
            every <strong>Add to Cart</strong> button click, extracts the
            clicked item&apos;s title and nutrition text, and sends it straight to
            this dashboard.
          </div>

          <ol className="rule-list" style={{ marginBottom: '16px' }}>
            <li>
              Open <code>chrome://extensions</code> in Chrome/Edge and enable{' '}
              <strong>Developer mode</strong>.
            </li>
            <li>
              Click <strong>Load unpacked</strong> and select the{' '}
              <code>extension/</code> folder in this project.
            </li>
            <li>
              Open the <strong>HealthGuard</strong> extension icon and paste your
              active dashboard URL below:
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
                Analyze Copied Amazon Item (App / Manual Intake)
              </h2>
              <p className="card-subtitle">
                Using the mobile Amazon app? Paste the product title and optional
                nutrition label text to analyze immediately.
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
                placeholder="e.g., Quaker Oatmeal Cookies or A&W Root Beer"
                value={productTitle}
                onChange={(e) => setProductTitle(e.target.value)}
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
                placeholder="e.g., Calories 160, Total Fat 6g, Sugars 12g, Protein 2g, Sodium 190mg (leave blank to match against the 2,158-food dataset)"
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
                placeholder="https://www.amazon.com/dp/..."
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
              see its Healthy, Moderate, or Unhealthy verdict here.
            </p>
          </div>
        ) : (
          <div className="event-card-list">
            {events.map((ev) => {
              const a = ev.analysis;
              const badgeCls =
                a.classification === 'Healthy'
                  ? 'is-healthy'
                  : a.classification === 'Moderate'
                  ? 'is-moderate'
                  : 'is-unhealthy';

              return (
                <article key={ev.event_id} className="event-item">
                  <div className="event-item-top">
                    <div>
                      <div className="event-item-title">{ev.product_title}</div>
                      <div className="event-item-meta">
                        Source: {ev.nutrition_source}
                        {ev.matched_food ? ` (${ev.matched_food})` : ''} ·{' '}
                        <span className="tabular">{a.nutrition.calories}</span>{' '}
                        kcal ·{' '}
                        <span className="tabular">{a.nutrition.sugars}g</span>{' '}
                        sugar ·{' '}
                        <span className="tabular">
                          {Math.round(a.nutrition.sodium_mg)}mg
                        </span>{' '}
                        sodium
                      </div>
                    </div>

                    <div className={`status-badge ${badgeCls}`}>
                      <span>
                        {a.classification} ·{' '}
                        <span className="tabular">{a.health_score}</span>
                      </span>
                    </div>
                  </div>

                  <p className="card-subtitle" style={{ color: '#374151' }}>
                    {a.explanation}
                  </p>

                  <div className="event-item-actions">
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ padding: '6px 10px', fontSize: '12.5px' }}
                      onClick={() => onInspectEventInAnalyzer(ev)}
                    >
                      Open Full Breakdown
                    </button>

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
