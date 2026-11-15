import React, { useMemo, useState } from 'react';
import { CheckCircle2, Plus, Search, ShieldAlert, SlidersHorizontal, Sparkles } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { RiskLevel } from '../types';
import {
  HEALTH_CONDITION_OPTIONS,
  getAgeGroupLabel,
  getProfileSuggestions,
} from '../utils/healthProfileEngine';

export function DashboardPage() {
  const { currentUser, products, evaluateProduct } = useAuth();
  const navigate = useNavigate();

  const [queryInput, setQueryInput] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState<'ALL' | RiskLevel>('ALL');

  const evaluatedItems = useMemo(() => {
    return products.map((product) => ({
      product,
      check: evaluateProduct(product),
    }));
  }, [products, evaluateProduct]);

  const filteredItems = useMemo(() => {
    const q = appliedQuery.trim().toLowerCase();
    return evaluatedItems.filter(({ product, check }) => {
      if (riskFilter !== 'ALL' && check.riskLevel !== riskFilter) {
        return false;
      }
      if (!q) return true;
      const hay = `${product.name} ${product.brand} ${product.category} ${product.ingredients}`.toLowerCase();
      return hay.includes(q);
    });
  }, [evaluatedItems, appliedQuery, riskFilter]);

  const activeConditionLabels = useMemo(() => {
    if (!currentUser) return [];
    return HEALTH_CONDITION_OPTIONS.filter((opt) =>
      currentUser.conditions.includes(opt.key)
    ).map((opt) => opt.label);
  }, [currentUser]);

  const profileSuggestions = useMemo(() => {
    if (!currentUser) return null;
    return getProfileSuggestions(currentUser, evaluatedItems);
  }, [currentUser, evaluatedItems]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAppliedQuery(queryInput);
  }

  if (!currentUser) {
    return null;
  }

  return (
    <div className="page-shell">
      {/* Greeting / Active Profile Card */}
      <section className="card dashboard-hero-card" aria-label="Health profile status">
        <div className="dashboard-hero-row">
          <div>
            <p className="section-kicker" style={{ marginBottom: '4px' }}>
              YOUR FOOD DASHBOARD
            </p>
            <h1 className="page-title" style={{ fontSize: '26px' }}>
              Hello, {currentUser.fullName}
            </h1>
            <p className="card-subtitle" style={{ marginTop: '4px', fontSize: '14px' }}>
              {getAgeGroupLabel(currentUser.age)} ({currentUser.age} yrs) · Profile-based
              screening is active
              {activeConditionLabels.length > 0 && (
                <span> · Conditions: {activeConditionLabels.join(', ')}</span>
              )}
              {currentUser.allergies.length > 0 && (
                <span> · Allergies: {currentUser.allergies.join(', ')}</span>
              )}
            </p>
          </div>

          <div className="dashboard-hero-actions">
            <Link
              to="/profile"
              className="btn-secondary"
              style={{ textDecoration: 'none' }}
            >
              <SlidersHorizontal size={15} />
              <span>Edit health profile</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Personalized Health Suggestions Based on Profile */}
      {profileSuggestions && (
        <section
          className="card suggestions-card"
          aria-labelledby="suggestions-heading"
          style={{ marginTop: '16px' }}
        >
          <div className="suggestions-header">
            <div className="suggestions-title-row">
              <Sparkles size={17} color="#146c43" aria-hidden="true" />
              <h2 id="suggestions-heading" className="card-title">
                Personalized Health Suggestions
              </h2>
            </div>
            <span className="card-subtitle">
              Tailored to your conditions &amp; allergies
            </span>
          </div>

          <ul className="suggestions-tip-list">
            {profileSuggestions.tips.map((tip, idx) => (
              <li key={idx}>{tip}</li>
            ))}
          </ul>

          <div className="suggestions-columns">
            <div className="suggestion-col is-safe">
              <div className="suggestion-col-head">
                <CheckCircle2 size={15} />
                <span>Recommended for You (LOW RISK)</span>
              </div>
              <div className="suggestion-chip-list">
                {profileSuggestions.safePicks.length > 0 ? (
                  profileSuggestions.safePicks.map(({ product }) => (
                    <Link
                      key={product.id}
                      to={`/dashboard/${product.id}`}
                      className="suggestion-pick-chip is-safe"
                    >
                      <span className="suggestion-pick-name">{product.name}</span>
                      <span className="suggestion-pick-meta">
                        {product.sugar_g}g sugar · {Math.round(product.sodium_mg)}mg Na
                      </span>
                    </Link>
                  ))
                ) : (
                  <p className="card-subtitle">
                    No low-risk picks matched under current filters.
                  </p>
                )}
              </div>
            </div>

            <div className="suggestion-col is-avoid">
              <div className="suggestion-col-head">
                <ShieldAlert size={15} />
                <span>Limit or Avoid (HIGH RISK)</span>
              </div>
              <div className="suggestion-chip-list">
                {profileSuggestions.avoidPicks.length > 0 ? (
                  profileSuggestions.avoidPicks.map(({ product }) => (
                    <Link
                      key={product.id}
                      to={`/dashboard/${product.id}`}
                      className="suggestion-pick-chip is-avoid"
                    >
                      <span className="suggestion-pick-name">{product.name}</span>
                      <span className="suggestion-pick-meta">
                        {product.sugar_g}g sugar · {Math.round(product.sodium_mg)}mg Na
                      </span>
                    </Link>
                  ))
                ) : (
                  <p className="card-subtitle">
                    No high-risk items detected for your current settings.
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Screening Disclaimer Callout */}
      <div className="info-callout" role="note" style={{ marginTop: '16px' }}>
        <strong>Important:</strong> Results are educational screening estimates based on
        the product information and your saved profile. Verify the physical package label
        and consult a qualified healthcare professional for disease-specific advice.
      </div>

      {/* Search + Filter + Add Product Toolbar */}
      <form className="catalog-toolbar" onSubmit={handleSearchSubmit}>
        <div className="catalog-search-box">
          <Search size={16} className="grocery-search-icon" aria-hidden="true" />
          <input
            type="search"
            className="field-input grocery-search-input"
            placeholder="Search product, brand or category..."
            value={queryInput}
            onChange={(e) => {
              setQueryInput(e.target.value);
              setAppliedQuery(e.target.value);
            }}
            aria-label="Search product, brand or category"
          />
        </div>

        <button type="submit" className="btn-primary catalog-search-btn">
          Search
        </button>

        <Link
          to="/add-product"
          className="btn-secondary catalog-add-link"
          style={{ textDecoration: 'none' }}
        >
          <Plus size={15} />
          <span>Add product</span>
        </Link>
      </form>

      {/* Segmented Risk Filter Controls */}
      <div className="catalog-filter-row" role="group" aria-label="Filter by risk level">
        {(['ALL', 'LOW RISK', 'MODERATE RISK', 'HIGH RISK'] as const).map((lvl) => (
          <button
            key={lvl}
            type="button"
            className={`chart-switch-tab ${riskFilter === lvl ? 'is-active' : ''}`}
            onClick={() => setRiskFilter(lvl)}
          >
            {lvl === 'ALL'
              ? `All (${evaluatedItems.length})`
              : `${lvl} (${evaluatedItems.filter((x) => x.check.riskLevel === lvl).length})`}
          </button>
        ))}
      </div>

      {/* Product Catalogue Grid */}
      <section aria-labelledby="catalog-heading" style={{ marginTop: '18px' }}>
        <div className="catalog-section-top">
          <h2 id="catalog-heading" className="card-title" style={{ fontSize: '20px' }}>
            Product catalogue
          </h2>
          <span className="card-subtitle">
            Showing {filteredItems.length} of {evaluatedItems.length} products
          </span>
        </div>

        {filteredItems.length === 0 ? (
          <div className="card empty-state" style={{ marginTop: '12px' }}>
            <h3 className="empty-title">No matching products found</h3>
            <p className="empty-desc">
              Try clearing your search or add a custom product from any packet label.
            </p>
            <div className="nc-hero-actions" style={{ justifyContent: 'center' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setQueryInput('');
                  setAppliedQuery('');
                  setRiskFilter('ALL');
                }}
              >
                Reset Filters
              </button>
              <Link
                to="/add-product"
                className="btn-primary"
                style={{ textDecoration: 'none', flex: 'none' }}
              >
                + Add custom product
              </Link>
            </div>
          </div>
        ) : (
          <div className="catalog-grid">
            {filteredItems.map(({ product, check }) => {
              const badgeCls =
                check.tone === 'good'
                  ? 'is-low'
                  : check.tone === 'moderate'
                  ? 'is-moderate'
                  : 'is-high';

              return (
                <article key={product.id} className="card catalog-card">
                  <div>
                    {product.imageUrl && (
                      <div className="catalog-card-img-wrap">
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="catalog-card-img"
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            const wrap = (e.currentTarget as HTMLImageElement).parentElement;
                            if (wrap) wrap.style.display = 'none';
                          }}
                        />
                      </div>
                    )}

                    <div className="catalog-card-top">
                      <div>
                        <h3 className="catalog-card-title">{product.name}</h3>
                        <p className="catalog-card-brand">
                          {product.brand} · {product.category}
                        </p>
                      </div>
                      <span className={`risk-tag ${badgeCls}`}>{check.riskLevel}</span>
                    </div>
                  </div>

                  <div className="catalog-card-footer">
                    <div className="catalog-macro-row">
                      <div className="catalog-macro-item">
                        <span className="catalog-macro-lbl">Sugar</span>
                        <span className="catalog-macro-val tabular">
                          {product.sugar_g.toFixed(1)}g
                        </span>
                      </div>
                      <div className="catalog-macro-item">
                        <span className="catalog-macro-lbl">Sodium</span>
                        <span className="catalog-macro-val tabular">
                          {Math.round(product.sodium_mg)}mg
                        </span>
                      </div>
                      <div className="catalog-macro-item">
                        <span className="catalog-macro-lbl">Sat. fat</span>
                        <span className="catalog-macro-val tabular">
                          {product.saturated_fat_g.toFixed(1)}g
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="btn-primary catalog-check-btn"
                      onClick={() => navigate(`/dashboard/${product.id}`)}
                    >
                      View health check
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
