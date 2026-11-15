import { useState } from 'react';
import { ArrowLeft, ArrowRight, ExternalLink, Info, ShieldAlert, Sparkles } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { BreakdownPieChart } from '../components/BreakdownPieChart';
import { useAuth } from '../context/AuthContext';
import { getSaferAlternativesForProduct } from '../utils/healthProfileEngine';
import { scanPacketLocally } from '../utils/localNutritionEngine';

export function ProductDetailPage() {
  const { productId } = useParams<{ productId: string }>();
  const { currentUser, products, evaluateProduct } = useAuth();
  const [chartTab, setChartTab] = useState<'nutrients' | 'ingredients'>('nutrients');

  const product = products.find((p) => p.id === productId);

  if (!product) {
    return (
      <div className="page-shell">
        <div className="card empty-state">
          <h1 className="empty-title">Product Not Found</h1>
          <p className="empty-desc">
            The requested packaged food item could not be located in the catalogue.
          </p>
          <Link
            to="/dashboard"
            className="btn-primary"
            style={{ textDecoration: 'none', flex: 'none' }}
          >
            Back to Product Catalogue
          </Link>
        </div>
      </div>
    );
  }

  const check = evaluateProduct(product);
  const saferSwaps =
    check.riskLevel !== 'LOW RISK'
      ? getSaferAlternativesForProduct(product, products, currentUser)
      : [];

  const badgeCls =
    check.tone === 'good'
      ? 'is-low'
      : check.tone === 'moderate'
      ? 'is-moderate'
      : 'is-high';

  const ingredientAnalysis = scanPacketLocally(
    product.name,
    `Ingredients: ${product.ingredients}`
  );

  const ingGood = ingredientAnalysis.ingredient_findings.filter(
    (f) => f.rating === 'good'
  ).length;
  const ingMod = ingredientAnalysis.ingredient_findings.filter(
    (f) => f.rating === 'moderate'
  ).length;
  const ingBad = ingredientAnalysis.ingredient_findings.filter(
    (f) => f.rating === 'high'
  ).length;
  const ingNeutral = Math.max(
    0,
    ingredientAnalysis.ingredients_count - (ingGood + ingMod + ingBad)
  );

  const ingredientSlices = [
    { label: 'Good Ingredients', value: ingGood, color: '#16a34a', displayValue: `${ingGood}` },
    { label: 'Caution', value: ingMod, color: '#ca8a04', displayValue: `${ingMod}` },
    { label: 'Watch / Bad', value: ingBad, color: '#dc2626', displayValue: `${ingBad}` },
    { label: 'Base / Neutral', value: ingNeutral, color: '#94a3b8', displayValue: `${ingNeutral}` },
  ];

  const goodCalories = Math.max(0, product.protein_g * 4 + product.fiber_g * 2);
  const sugarCalories = Math.max(0, product.sugar_g * 4);
  const satFatCalories = Math.max(0, product.saturated_fat_g * 9);
  const sodiumPenalty = Math.max(0, product.sodium_mg * 0.05);

  const macroSlices = [
    {
      label: 'Protein & Fiber',
      value: goodCalories || 1,
      displayValue: `${product.protein_g.toFixed(1)}g P · ${product.fiber_g.toFixed(1)}g F`,
      color: '#16a34a',
    },
    {
      label: 'Sugar Load',
      value: sugarCalories,
      displayValue: `${product.sugar_g.toFixed(1)}g`,
      color: '#dc2626',
    },
    {
      label: 'Sat. Fat & Sodium Watch',
      value: satFatCalories + sodiumPenalty,
      displayValue: `${product.saturated_fat_g.toFixed(1)}g sat · ${Math.round(product.sodium_mg)}mg Na`,
      color: '#ca8a04',
    },
  ];

  const encodedQuery = encodeURIComponent(product.name);
  const primaryStoreHref =
    product.storeUrl || `https://www.bigbasket.com/ps/?q=${encodedQuery}`;

  return (
    <div className="page-shell">
      <div style={{ marginBottom: '16px' }}>
        <Link to="/dashboard" className="text-action-link">
          <ArrowLeft size={15} />
          <span>Back to products</span>
        </Link>
      </div>

      <div className="product-detail-grid">
        {/* Left Main Personalized Screening Card */}
        <section className="card" aria-labelledby="detail-prod-heading">
          <p className="section-kicker" style={{ marginBottom: '4px' }}>
            PERSONALIZED PRODUCT CHECK
          </p>
          <div className="result-hero" style={{ paddingBottom: '16px' }}>
            <div>
              <h1 id="detail-prod-heading" className="page-title" style={{ fontSize: '26px' }}>
                {product.name}
              </h1>
              <p className="result-meta-line">
                {product.brand} · {product.category} · Serving {product.servingSize}
              </p>
            </div>

            <span className={`risk-tag risk-tag-lg ${badgeCls}`}>
              {check.riskLevel}
            </span>
          </div>

          <p className="detail-screening-for">
            {currentUser ? (
              <>
                This is the screening result for{' '}
                <strong>{currentUser.fullName}</strong> ({check.ageGroupLabel},{' '}
                {currentUser.age} yrs).
              </>
            ) : (
              <>
                General screening estimate.{' '}
                <Link to="/register" className="text-action-link">
                  Create a health profile
                </Link>{' '}
                for diabetes, blood pressure, kidney, heart, and allergy checks.
              </>
            )}
          </p>

          <div className="detail-reasons-block">
            <h2 className="detail-subhead">Why this result?</h2>
            <ul className="detail-bullet-list">
              {check.reasons.map((reason, idx) => (
                <li key={idx}>{reason}</li>
              ))}
            </ul>
          </div>

          {check.cautions.length > 0 && (
            <div className="detail-cautions-block">
              <h2 className="detail-subhead">Additional cautions</h2>
              <ul className="detail-bullet-list">
                {check.cautions.map((caution, idx) => (
                  <li key={idx}>{caution}</li>
                ))}
              </ul>
            </div>
          )}

          {check.matchedAllergens.length > 0 && (
            <div className="error-banner" role="alert" style={{ marginTop: '14px' }}>
              <ShieldAlert size={16} />
              <span>
                <strong>Allergen Warning:</strong> Matches your listed allergies (
                {check.matchedAllergens.join(', ')}).
              </span>
            </div>
          )}

          {saferSwaps.length > 0 && (
            <div className="safer-swaps-box" aria-labelledby="safer-swaps-heading">
              <div className="safer-swaps-head">
                <Sparkles size={15} color="#15803d" aria-hidden="true" />
                <h2 id="safer-swaps-heading" className="detail-subhead" style={{ marginBottom: 0 }}>
                  Safer Suggestions for Your Health
                </h2>
              </div>
              <div className="safer-swaps-grid">
                {saferSwaps.map(({ product: alt, check: altCheck }) => (
                  <Link
                    key={alt.id}
                    to={`/dashboard/${alt.id}`}
                    className="safer-swap-card"
                  >
                    <div className="safer-swap-top">
                      <span className="safer-swap-name">{alt.name}</span>
                      <span className="risk-tag is-low">{altCheck.riskLevel}</span>
                    </div>
                    <p className="safer-swap-meta">
                      {alt.sugar_g.toFixed(1)}g sugar · {Math.round(alt.sodium_mg)}mg sodium ·{' '}
                      {alt.fiber_g.toFixed(1)}g fiber
                    </p>
                    <span className="safer-swap-cta">
                      View swap <ArrowRight size={13} />
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginTop: '20px' }}>
            <div className="pie-card-header-row">
              <span className="detail-subhead" style={{ marginBottom: 0 }}>
                Visual Breakdown
              </span>
              <div className="chart-switch-tabs" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={chartTab === 'nutrients'}
                  className={`chart-switch-tab ${chartTab === 'nutrients' ? 'is-active' : ''}`}
                  onClick={() => setChartTab('nutrients')}
                >
                  Good vs. Watch Nutrients
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={chartTab === 'ingredients'}
                  className={`chart-switch-tab ${chartTab === 'ingredients' ? 'is-active' : ''}`}
                  onClick={() => setChartTab('ingredients')}
                >
                  Packet Ingredients
                </button>
              </div>
            </div>

            {chartTab === 'nutrients' ? (
              <BreakdownPieChart
                title="Nutrient Balance"
                subtitle="Protective protein/fiber vs. sugars, saturated fat & sodium"
                slices={macroSlices}
                centerLabel="Score"
                centerValue={`${check.score}`}
              />
            ) : (
              <BreakdownPieChart
                title="Good vs. Watch Ingredients"
                subtitle={`${ingredientAnalysis.ingredients_count} ingredients inspected`}
                slices={ingredientSlices}
                centerLabel="Items"
                centerValue={`${ingredientAnalysis.ingredients_count}`}
              />
            )}
          </div>
        </section>

        {/* Right Nutrition + Ingredients + Online Grocery Store Card */}
        <aside className="detail-side-stack">
          <section className="card" aria-labelledby="nutrition-info-heading">
            <h2 id="nutrition-info-heading" className="card-title">
              Nutrition information
            </h2>
            <p className="card-subtitle" style={{ marginBottom: '12px' }}>
              Per {product.servingSize}
            </p>

            <div className="data-table-wrap">
              <table className="data-table nutrition-table">
                <tbody>
                  <tr>
                    <td>Calories</td>
                    <td className="num">{product.calories.toFixed(1)} kcal</td>
                  </tr>
                  <tr>
                    <td>Sugar</td>
                    <td className="num">{product.sugar_g.toFixed(1)} g</td>
                  </tr>
                  <tr>
                    <td>Sodium</td>
                    <td className="num">{product.sodium_mg.toFixed(1)} mg</td>
                  </tr>
                  <tr>
                    <td>Saturated fat</td>
                    <td className="num">{product.saturated_fat_g.toFixed(1)} g</td>
                  </tr>
                  <tr>
                    <td>Protein</td>
                    <td className="num">{product.protein_g.toFixed(1)} g</td>
                  </tr>
                  <tr>
                    <td>Fiber</td>
                    <td className="num">{product.fiber_g.toFixed(1)} g</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="detail-ingredients-box">
              <h3 className="detail-subhead" style={{ marginBottom: '6px' }}>
                Ingredients / allergens
              </h3>
              <p className="detail-ingredients-text">{product.ingredients}</p>
              <p className="detail-allergens-line">
                <strong>Allergens:</strong>{' '}
                {product.allergens.length > 0
                  ? product.allergens.join(', ')
                  : 'None listed'}
              </p>
            </div>

            <div className="detail-store-actions">
              <a
                href={primaryStoreHref}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary detail-open-store-btn"
                style={{ textDecoration: 'none' }}
              >
                <span>Open shopping website</span>
                <ExternalLink size={15} />
              </a>

              <div className="detail-store-links" aria-label="Search on other stores">
                <span className="detail-store-links-label">Or check on:</span>
                <a
                  href={`https://www.amazon.in/s?k=${encodedQuery}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="store-mini-link"
                >
                  Amazon
                </a>
                <a
                  href={`https://www.flipkart.com/search?q=${encodedQuery}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="store-mini-link"
                >
                  Flipkart
                </a>
                <a
                  href={`https://www.swiggy.com/instamart/search?custom_back=true&query=${encodedQuery}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="store-mini-link"
                >
                  Swiggy Instamart
                </a>
                <a
                  href={`https://www.zomato.com`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="store-mini-link"
                >
                  Zomato
                </a>
              </div>

              <p className="detail-store-note">
                <Info size={13} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>
                  Opens the general retailer website; NutriCheck Extension also checks
                  cart items directly on Amazon, Flipkart, Swiggy &amp; Zomato.
                </span>
              </p>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
