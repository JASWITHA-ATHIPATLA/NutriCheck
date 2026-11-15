import React, { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  Image as ImageIcon,
  Lightbulb,
  PieChart,
  ShoppingBasket,
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
import { CATALOG_PRODUCT_IMAGES } from '../utils/catalogImages';
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
  badgeLabel: string;
  badgeTone: 'is-good' | 'is-moderate' | 'is-poor';
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
    badgeLabel: 'Healthy choice',
    badgeTone: 'is-good',
    image_url: CATALOG_PRODUCT_IMAGES['plain-oats'],
    ingredients_text: 'Wholegrain Rolled Oats (100%)',
    nutrition_text: 'Calories 379, Sugars 1.0g, Fat 6.5g, Protein 13.2g, Sodium 4mg',
    product_url: 'https://www.amazon.in/s?k=Quaker+Rolled+Oats',
  },
  {
    id: 'qs-dry-fruits',
    store: 'Flipkart',
    title: 'California Almonds 500g',
    badgeLabel: 'Healthy choice',
    badgeTone: 'is-good',
    image_url: CATALOG_PRODUCT_IMAGES['roasted-unsalted-almonds'],
    ingredients_text: '100% Whole California Almonds (dry roasted, unsalted)',
    nutrition_text: 'Calories 595, Sugars 4.4g, Fat 52.0g, Protein 21.2g, Sodium 1mg',
    product_url: 'https://www.flipkart.com/search?q=Roasted+Almonds',
  },
  {
    id: 'qs-noodles',
    store: 'Swiggy Instamart',
    title: 'Maggi 2-Minute Masala Noodles',
    badgeLabel: 'High sodium',
    badgeTone: 'is-poor',
    image_url: CATALOG_PRODUCT_IMAGES['instant-noodles'],
    ingredients_text:
      'Refined Wheat Flour (Maida), Palm Oil, Iodized Salt, Spices, Sugar, Thickener, Flavor Enhancer',
    nutrition_text: 'Calories 427, Sugars 2.1g, Fat 15.7g, Protein 8.2g, Sodium 1120mg',
    product_url: 'https://www.swiggy.com/instamart',
  },
  {
    id: 'qs-choc',
    store: 'Amazon',
    title: 'Dairy Milk Chocolate Bar',
    badgeLabel: 'High sugar',
    badgeTone: 'is-poor',
    image_url: CATALOG_PRODUCT_IMAGES['chocolate-bar'],
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
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [expandedChartId, setExpandedChartId] = useState<string | null>(null);
  const [addingQuickId, setAddingQuickId] = useState<string | null>(null);
  const [showExtConfig, setShowExtConfig] = useState(false);

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
    <div className="sc-stack">
      {/* 1. Personalized screening summary card */}
      {currentUser && (
        <section className="sc-info-card" aria-label="Personalized screening">
          <div className="sc-info-top">
            <h2 className="sc-info-title">Personalized screening</h2>
            <span className="pa-status-pill is-analyzed">Active</span>
          </div>
          <p className="sc-info-sub">
            Screening based on your selected health profile.
          </p>
          <div className="sc-info-foot">
            <span className="sc-info-meta">
              {getAgeGroupLabel(currentUser.age)} · {currentUser.age} yrs ·{' '}
              {activeConditionLabels.length === 1
                ? '1 condition'
                : `${activeConditionLabels.length} conditions`}
              {currentUser.allergies.length > 0
                ? ` · ${currentUser.allergies.length} ${currentUser.allergies.length === 1 ? 'allergy' : 'allergies'}`
                : ''}
            </span>
            <Link to="/profile" className="sc-text-link">
              Edit profile →
            </Link>
          </div>
        </section>
      )}

      {/* 2. Explore products section */}
      <section className="sc-explore-section" aria-labelledby="quick-store-heading">
        <div className="sc-section-head">
          <h2 id="quick-store-heading" className="sc-section-title">
            Explore products
          </h2>
          <span className="sc-section-count">
            {QUICK_STORE_PRODUCTS.length} products
          </span>
        </div>

        <div className="sc-explore-grid">
          {QUICK_STORE_PRODUCTS.map((item) => (
            <div key={item.id} className="sc-product-card">
              <div className="sc-product-img-box">
                <img
                  src={item.image_url}
                  alt={item.title}
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
              <div className="sc-product-title">{item.title}</div>
              <div>
                <span className={`pa-score-chip ${item.badgeTone}`} style={{ marginTop: 0 }}>
                  {item.badgeLabel}
                </span>
              </div>
              <button
                type="button"
                className="sc-add-pill-btn"
                disabled={addingQuickId === item.id || isSubmitting}
                onClick={() => handleQuickAdd(item)}
              >
                {addingQuickId === item.id ? 'Checking...' : 'Add to Cart'}
              </button>
            </div>
          ))}
        </div>
      </section>

      {submitError && (
        <div className="error-banner" role="alert">
          <AlertCircle size={16} />
          <span>{submitError}</span>
        </div>
      )}

      {/* 3. Your cart analysis card */}
      <section className="card" aria-labelledby="amazon-feed-heading">
        <div className="sc-cart-head">
          <h2 id="amazon-feed-heading" className="sc-info-title">
            Your cart analysis
          </h2>
          <div className="sc-cart-head-right">
            <span className="sc-count-pill">
              {events.length} {events.length === 1 ? 'product' : 'products'}
            </span>
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
        </div>

        {events.length === 0 ? (
          <div className="sc-empty-cart">
            <ShoppingBasket size={34} className="sc-empty-icon" />
            <h3 className="sc-empty-title">Your cart is empty</h3>
            <p className="sc-empty-desc">
              Add products to see their nutritional information and personalized health assessment.
            </p>
          </div>
        ) : (
          <div className="event-card-list">
              {events.map((ev) => {
                const a = ev.analysis;
                const scan = ev.ingredient_scan;
                const platform = inferPlatformLabel(ev);
                const isChartOpen = expandedChartId === ev.event_id;

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

                const scoreTone = !a
                  ? 'is-pending'
                  : a.classification === 'Healthy'
                  ? 'is-good'
                  : a.classification === 'Moderate'
                  ? 'is-moderate'
                  : 'is-poor';

                const scorePillText = !a
                  ? 'Pending nutrition info'
                  : a.classification === 'Healthy'
                  ? 'Good nutrition score'
                  : a.classification === 'Moderate'
                  ? 'Moderate nutrition score'
                  : 'Poor nutrition score';

                const riskTone = !prof
                  ? 'is-moderate'
                  : prof.riskLevel === 'LOW RISK'
                  ? 'is-good'
                  : prof.riskLevel === 'MODERATE RISK'
                  ? 'is-moderate'
                  : 'is-high';

                const riskTitleText = !prof
                  ? 'Pending check'
                  : prof.riskLevel === 'LOW RISK'
                  ? 'Low risk'
                  : prof.riskLevel === 'MODERATE RISK'
                  ? 'Moderate risk'
                  : 'High risk';

                const cleanedIngredients = ev.ingredients_text
                  ? ev.ingredients_text.replace(
                      /^ingredients(?:\s*\/\s*dish\s*notes)?\s*[:\-]?\s*/i,
                      ''
                    )
                  : '';

                const recommendationText =
                  prof && prof.suggestions.length > 0
                    ? prof.suggestions.join(' ')
                    : a && a.classification === 'Healthy'
                    ? 'Fits well with your saved health profile in normal portions.'
                    : 'Consider unsweetened oats, plain nuts, or minimally processed snacks as alternatives.';

                return (
                  <article key={ev.event_id} className="pa-card">
                    {/* Top Row: Product Analysis + Analyzed Pill */}
                    <div className="pa-card-head">
                      <div className="pa-card-head-title">
                        <span>Product Analysis</span>
                        <span className="store-chip">{platform}</span>
                      </div>
                      <span className={`pa-status-pill ${a ? 'is-analyzed' : 'is-pending'}`}>
                        {a ? 'Analyzed' : 'Needs Info'}
                      </span>
                    </div>

                    {/* Product Summary Row */}
                    <div className="pa-product-row">
                      <div className="pa-product-thumb">
                        {ev.image_url ? (
                          <img
                            src={ev.image_url}
                            alt={ev.product_title}
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="pa-thumb-empty" aria-hidden="true">
                            <ImageIcon size={22} />
                          </div>
                        )}
                      </div>

                      <div className="pa-product-meta">
                        <h3 className="pa-product-title">{ev.product_title}</h3>
                        <div className="pa-product-sub">
                          {platform}
                          {ev.matched_food
                            ? ` · ${ev.matched_food}`
                            : ev.nutrition_source
                            ? ` · ${ev.nutrition_source}`
                            : ''}
                        </div>
                        <span className={`pa-score-chip ${scoreTone}`}>
                          {scorePillText}
                        </span>
                      </div>
                    </div>

                    {/* Nutrition score + Health assessment */}
                    {a && (
                      <div className="pa-score-grid">
                        <div className="pa-score-cell">
                          <div className="pa-metric-label">Nutrition score</div>
                          <div className={`pa-score-big ${scoreTone}`}>
                            {a.health_score}/100
                          </div>
                          <div className="pa-metric-sub">
                            {getVerdictLabel(a.classification)}
                          </div>
                        </div>

                        <div className="pa-score-cell">
                          <div className="pa-metric-label">Health assessment</div>
                          <div className={`pa-risk-big ${riskTone}`}>
                            {riskTitleText}
                          </div>
                          <div className="pa-metric-sub">
                            {currentUser
                              ? `For ${currentUser.fullName}`
                              : 'For selected profile'}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Ingredients Section */}
                    {cleanedIngredients && (
                      <div className="pa-ingredients-block">
                        <div className="pa-section-heading-sm">
                          <span>Ingredients</span>
                          {resolvedScan && (
                            <span className="amz-ing-counts">
                              {ingGoodCount} good · {ingModCount} caution · {ingBadCount} bad
                            </span>
                          )}
                        </div>
                        <p className="pa-ingredients-text">{cleanedIngredients}</p>
                      </div>
                    )}

                    {/* Nutrition Facts Grid */}
                    {a && (
                      <div className="pa-facts-section">
                        <div className="pa-section-heading">Nutrition Facts</div>
                        <div className="pa-facts-grid">
                          <div className="pa-fact-tile">
                            <div className="pa-fact-val">
                              {Math.round(a.nutrition.calories)}
                            </div>
                            <div className="pa-fact-lbl">Calories (kcal)</div>
                          </div>
                          <div className="pa-fact-tile">
                            <div className="pa-fact-val">{a.nutrition.sugars}</div>
                            <div className="pa-fact-lbl">Sugar (g)</div>
                          </div>
                          <div className="pa-fact-tile">
                            <div className="pa-fact-val">{a.nutrition.fat}</div>
                            <div className="pa-fact-lbl">Fat (g)</div>
                          </div>
                          <div className="pa-fact-tile">
                            <div className="pa-fact-val">{a.nutrition.protein}</div>
                            <div className="pa-fact-lbl">Protein (g)</div>
                          </div>
                          <div className="pa-fact-tile">
                            <div className="pa-fact-val">
                              {Math.round(a.nutrition.sodium_mg)}
                            </div>
                            <div className="pa-fact-lbl">Sodium (mg)</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Health Insights & Recommendation */}
                    <div className="pa-insights-section">
                      <div className="pa-section-heading">Health Insights</div>
                      <div className="pa-insight-row">
                        <span className={`pa-insight-icon ${riskTone}`}>
                          {prof?.riskLevel === 'LOW RISK' ? (
                            <CheckCircle2 size={16} />
                          ) : (
                            <AlertTriangle size={16} />
                          )}
                        </span>
                        <div className="pa-insight-copy">
                          <div className="pa-insight-title">
                            {prof ? prof.headline : a ? a.cart_alert.title : 'Label needed'}
                          </div>
                          <p className="pa-insight-desc">
                            {prof
                              ? prof.alerts.join(' · ')
                              : a
                              ? a.explanation
                              : ev.message}
                          </p>
                        </div>
                      </div>

                      <div className="pa-insight-divider" />

                      <div className="pa-insight-row">
                        <span className="pa-insight-icon is-good">
                          <Lightbulb size={16} />
                        </span>
                        <div className="pa-insight-copy">
                          <div className="pa-insight-title">Recommendation</div>
                          <p className="pa-insight-desc">{recommendationText}</p>
                        </div>
                      </div>
                    </div>

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
                        <Link
                          to="/scan"
                          className="btn-secondary"
                          style={{ padding: '6px 10px', fontSize: '12.5px' }}
                        >
                          Scan Packet Label
                        </Link>
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

      {/* 4. Compact Chrome Extension card at the bottom */}
      <section className="sc-info-card" aria-labelledby="amazon-ext-heading">
        <div className="sc-info-top">
          <h2 id="amazon-ext-heading" className="sc-info-title">
            Chrome Extension
          </h2>
          <span className="pa-status-pill is-analyzed">Active</span>
        </div>
        <p className="sc-info-sub">
          Automatically capture products from supported shopping websites.
        </p>
        <div className="sc-info-foot">
          <span className="sc-info-meta">5 supported stores</span>
          <button
            type="button"
            className="sc-text-link-btn"
            onClick={() => setShowExtConfig((prev) => !prev)}
          >
            {showExtConfig ? 'Hide setup' : 'Configure →'}
          </button>
        </div>

        {showExtConfig && (
          <div className="sc-ext-drawer">
            <div className="store-chips-row" aria-label="Supported stores" style={{ marginBottom: '12px' }}>
              {SUPPORTED_STORES.map((store) => (
                <span key={store} className="store-chip">
                  {store}
                </span>
              ))}
            </div>

            <ol className="rule-list" style={{ marginBottom: '12px' }}>
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
          </div>
        )}
      </section>
    </div>
  );
}
