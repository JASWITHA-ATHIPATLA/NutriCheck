import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Droplets,
  Leaf,
  Plus,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  Sprout,
  Wheat,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import wellnessCapsuleImg from '../assets/images/dashboard_wellness_capsule_1794737387347.jpg';
import kitchenWellnessImg from '../assets/images/dashboard_kitchen_wellness_1794737388833.jpg';
import wholefoodBowlImg from '../assets/images/dashboard_wholefood_bowl_1794737387978.jpg';
import { useAuth } from '../context/AuthContext';
import type { RiskLevel } from '../types';
import {
  HEALTH_CONDITION_OPTIONS,
  getAgeGroupLabel,
  getProfileSuggestions,
} from '../utils/healthProfileEngine';

interface NutritionPillar {
  id: string;
  index: string;
  label: string;
  query: string;
  risk: 'ALL' | RiskLevel;
}

const NUTRITION_PILLARS: NutritionPillar[] = [
  { id: 'good-fats', index: '(01)', label: 'Good Fats', query: 'almonds', risk: 'ALL' },
  { id: 'whole-grains', index: '(02)', label: 'Whole Grains', query: 'oats', risk: 'ALL' },
  { id: 'plant-protein', index: '(03)', label: 'Plant Protein', query: 'peanut', risk: 'ALL' },
  { id: 'low-risk', index: '(04)', label: 'Low Risk Picks', query: '', risk: 'LOW RISK' },
];

export function DashboardPage() {
  const { currentUser, products, evaluateProduct } = useAuth();
  const navigate = useNavigate();

  const [queryInput, setQueryInput] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState<'ALL' | RiskLevel>('ALL');
  const [activePillarId, setActivePillarId] = useState<string | null>(null);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

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
    setActivePillarId(null);
    setAppliedQuery(queryInput);
  }

  function handlePillarClick(pillar: NutritionPillar) {
    if (activePillarId === pillar.id) {
      setActivePillarId(null);
      setQueryInput('');
      setAppliedQuery('');
      setRiskFilter('ALL');
      return;
    }

    setActivePillarId(pillar.id);
    setQueryInput(pillar.query);
    setAppliedQuery(pillar.query);
    setRiskFilter(pillar.risk);
    const target = document.getElementById('catalog-heading');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function renderPillarIcon(id: string) {
    if (id === 'good-fats') return <Droplets size={14} aria-hidden="true" />;
    if (id === 'whole-grains') return <Wheat size={14} aria-hidden="true" />;
    if (id === 'plant-protein') return <Sprout size={14} aria-hidden="true" />;
    return <Leaf size={14} aria-hidden="true" />;
  }

  if (!currentUser) {
    return null;
  }

  return (
    <div className="page-shell dashboard-page-shell">
      {/* Unified Personalized Dashboard Hero & Wellness Showcase */}
      <section
        className="dashboard-editorial-card"
        aria-label="Health profile status and daily nutrition showcase"
      >
        <div className="dashboard-editorial-left">
          {!failedImages.capsule ? (
            <img
              src={wellnessCapsuleImg}
              alt="Fresh broccoli, strawberries, green apple, red onion, herbs, and almonds bursting from a clean nutrition capsule"
              className="dashboard-editorial-capsule-img"
              referrerPolicy="no-referrer"
              onError={() =>
                setFailedImages((prev) => ({ ...prev, capsule: true }))
              }
            />
          ) : (
            <div className="dashboard-img-fallback">
              <Leaf size={28} />
              <span>Whole Food Nutrition</span>
            </div>
          )}
        </div>

        <div className="dashboard-editorial-right">
          <div className="dashboard-editorial-head">
            <div className="dashboard-editorial-profile-top">
              <div className="dashboard-editorial-greeting">
                <p className="section-kicker" style={{ marginBottom: '2px' }}>
                  YOUR FOOD DASHBOARD
                </p>
                <h1 className="dashboard-editorial-title">
                  Hello, {currentUser.fullName}
                </h1>
              </div>

              <Link
                to="/profile"
                className="btn-secondary dashboard-editorial-edit-btn"
                style={{ textDecoration: 'none' }}
              >
                <SlidersHorizontal size={15} />
                <span>Edit health profile</span>
              </Link>
            </div>

            <p className="dashboard-editorial-meta">
              {getAgeGroupLabel(currentUser.age)} ({currentUser.age} yrs) · Profile-based
              screening is active
              {activeConditionLabels.length > 0 && (
                <span> · Conditions: {activeConditionLabels.join(', ')}</span>
              )}
              {currentUser.allergies.length > 0 && (
                <span> · Allergies: {currentUser.allergies.join(', ')}</span>
              )}
            </p>

            <div className="dashboard-editorial-rule-row" aria-hidden="true">
              <span>GOALS.</span>
              <span className="dashboard-editorial-rule-line" />
              <span>HEALTH.</span>
            </div>
          </div>

          {/* Full-Space Compact Media + Interactive Pillars Strip */}
          <div className="dashboard-editorial-bottom">
            <div className="dashboard-cloud-frame">
              {!failedImages.kitchen ? (
                <img
                  src={kitchenWellnessImg}
                  alt="Smiling person in a bright sunlit kitchen with fresh tomatoes, leafy greens, and citrus"
                  className="dashboard-cloud-img"
                  referrerPolicy="no-referrer"
                  onError={() =>
                    setFailedImages((prev) => ({ ...prev, kitchen: true }))
                  }
                />
              ) : (
                <div className="dashboard-img-fallback">
                  <Sparkles size={24} />
                  <span>Everyday Mindful Eating</span>
                </div>
              )}
            </div>

            <div className="dashboard-bowl-card">
              <div className="dashboard-bowl-thumb">
                {!failedImages.bowl ? (
                  <img
                    src={wholefoodBowlImg}
                    alt="Balanced whole foods on stone: avocado, spinach, almonds, rolled oats, blueberries, and chia seeds"
                    className="dashboard-bowl-img"
                    referrerPolicy="no-referrer"
                    onError={() =>
                      setFailedImages((prev) => ({ ...prev, bowl: true }))
                    }
                  />
                ) : (
                  <div className="dashboard-img-fallback">
                    <Sprout size={22} />
                    <span>Balanced Ingredients</span>
                  </div>
                )}
              </div>
              <p className="dashboard-bowl-caption">
                Our 4 Pillars of Nutrition
              </p>
            </div>

            <div
              className="dashboard-pillars-list"
              role="group"
              aria-label="Filter catalogue by nutrition pillar"
            >
              {NUTRITION_PILLARS.map((pillar) => {
                const isActive = activePillarId === pillar.id;
                return (
                  <button
                    key={pillar.id}
                    type="button"
                    className={`dashboard-pillar-btn ${isActive ? 'is-active' : ''}`}
                    onClick={() => handlePillarClick(pillar)}
                  >
                    <span className="dashboard-pillar-text">
                      <span className="dashboard-pillar-idx">{pillar.index}</span>
                      <span>{pillar.label}</span>
                    </span>
                    <span className="dashboard-pillar-icon">
                      {renderPillarIcon(pillar.id)}
                    </span>
                  </button>
                );
              })}
            </div>
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
              setActivePillarId(null);
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
            onClick={() => {
              setActivePillarId(null);
              setRiskFilter(lvl);
            }}
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
                  setActivePillarId(null);
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
