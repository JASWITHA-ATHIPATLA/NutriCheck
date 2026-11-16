import { useMemo, useState } from 'react';
import {
  Activity,
  ShoppingBasket,
  SlidersHorizontal,
  Store,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { AmazonCartEvent, HealthCondition } from '../types';
import {
  BASELINE_NUTRIENT_PROFILES,
  HEALTH_CONDITION_OPTIONS,
  computeUserPersonalLimits,
  evaluateProfileAlertsForValues,
  getAgeGroupLabel,
} from '../utils/healthProfileEngine';

interface NutritionLimitsPageProps {
  events: AmazonCartEvent[];
}

function inferStorePlatform(ev: AmazonCartEvent): string {
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

function pctOf(value: number, limit: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(limit) || limit <= 0) return 0;
  return Math.round((value / limit) * 100);
}

export function NutritionLimitsPage({ events }: NutritionLimitsPageProps) {
  const { currentUser } = useAuth();
  const [viewMode, setViewMode] = useState<'daily' | 'per100g'>('daily');

  const normalBaseline = BASELINE_NUTRIENT_PROFILES[0];
  const personalLimits = useMemo(
    () => computeUserPersonalLimits(currentUser),
    [currentUser]
  );

  const activeConditionLabels = useMemo(() => {
    if (!currentUser) return [];
    return [
      ...HEALTH_CONDITION_OPTIONS.filter((opt) =>
        currentUser.conditions.includes(opt.key)
      ).map((opt) => opt.label),
      ...(currentUser.otherConditions || []),
    ];
  }, [currentUser]);

  const baselineRows = useMemo(
    () => [...BASELINE_NUTRIENT_PROFILES, personalLimits],
    [personalLimits]
  );

  const analyzedEvents = useMemo(
    () => events.filter((ev) => Boolean(ev.analysis)),
    [events]
  );

  const cartTotals = useMemo(() => {
    return analyzedEvents.reduce(
      (acc, ev) => {
        const n = ev.analysis?.nutrition;
        if (!n) return acc;
        acc.calories += n.calories || 0;
        acc.sugars += n.sugars || 0;
        acc.fat += n.fat || 0;
        acc.protein += n.protein || 0;
        acc.sodium_mg += n.sodium_mg || 0;
        return acc;
      },
      { calories: 0, sugars: 0, fat: 0, protein: 0, sodium_mg: 0 }
    );
  }, [analyzedEvents]);

  if (!currentUser) return null;

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <h1 className="page-title">Daily Nutrient Limits &amp; Cart Tracker</h1>
          <p className="page-subtitle">
            Compare recommended daily and per-100g nutrition thresholds for a normal healthy
            adult versus patient conditions, tailored to your signed-in health profile.
          </p>
        </div>

        <div className="profile-header-actions">
          <Link
            to="/profile"
            className="btn-secondary"
            style={{ textDecoration: 'none' }}
          >
            <SlidersHorizontal size={15} />
            <span>Edit Health Profile</span>
          </Link>
          <Link
            to="/amazon"
            className="btn-primary"
            style={{ textDecoration: 'none', flex: 'none' }}
          >
            <Store size={15} />
            <span>Store Connect</span>
          </Link>
        </div>
      </div>

      {/* Logged-in User Profile Bar */}
      <div className="active-profile-bar" role="region" aria-label="Signed in health limits">
        <div className="active-profile-bar-copy">
          <strong>{currentUser.fullName}</strong>
          <span>
            {' '}
            · {getAgeGroupLabel(currentUser.age)} ({currentUser.age} yrs) ·{' '}
            {activeConditionLabels.length > 0
              ? `Conditions: ${activeConditionLabels.join(', ')}`
              : 'Normal healthy baseline'}
            {currentUser.allergies.length > 0
              ? ` · Allergies: ${currentUser.allergies.join(', ')}`
              : ''}
          </span>
        </div>
        <span className="sc-info-meta tabular">
          {events.length} {events.length === 1 ? 'item' : 'items'} in cart
        </span>
      </div>

      {/* Personal vs Normal Baseline KPI Cards */}
      <section aria-labelledby="personal-limits-heading">
        <div className="catalog-section-top" style={{ marginTop: 4 }}>
          <h2 id="personal-limits-heading" className="card-title">
            Your Daily Thresholds vs. Normal Adult
          </h2>
          <span className="card-subtitle">
            Protective limits based on your conditions &amp; age
          </span>
        </div>

        <div className="limits-kpi-grid">
          <div className="kpi-card">
            <div className="kpi-label">Calories / Day</div>
            <div className="kpi-value">{personalLimits.caloriesDay.toLocaleString()} kcal</div>
            <div className="kpi-note tabular">
              Normal adult: {normalBaseline.caloriesDay.toLocaleString()} kcal
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-label">Free Sugars Max</div>
            <div className="kpi-value">&le; {personalLimits.sugarDayMaxG} g</div>
            <div className="kpi-note tabular">
              Normal adult: &le; {normalBaseline.sugarDayMaxG} g/day ({personalLimits.sugarPer100gMaxG}g/100g)
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-label">Total Fat / Sat. Fat Max</div>
            <div className="kpi-value">
              {personalLimits.fatDayMaxG} g / {personalLimits.satFatDayMaxG} g
            </div>
            <div className="kpi-note tabular">
              Normal: {normalBaseline.fatDayMaxG}g fat / {normalBaseline.satFatDayMaxG}g sat.
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-label">Protein Target / Day</div>
            <div className="kpi-value">{personalLimits.proteinDayLabel}</div>
            <div className="kpi-note tabular">
              Normal adult: {normalBaseline.proteinDayLabel}
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-label">Dietary Fiber Min</div>
            <div className="kpi-value">&ge; {personalLimits.fiberDayMinG} g</div>
            <div className="kpi-note tabular">
              Normal adult: &ge; {normalBaseline.fiberDayMinG} g/day
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-label">Sodium (Salt) Max</div>
            <div className="kpi-value">
              &le; {personalLimits.sodiumDayMaxMg.toLocaleString()} mg
            </div>
            <div className="kpi-note tabular">
              Normal: &le; {normalBaseline.sodiumDayMaxMg.toLocaleString()} mg ({personalLimits.sodiumPer100gMaxMg}mg/100g)
            </div>
          </div>
        </div>
      </section>

      {/* Normal vs Patient Baseline Comparison Table */}
      <section className="card" style={{ marginTop: 20 }} aria-labelledby="baseline-table-heading">
        <div className="pie-card-header-row">
          <div>
            <h2 id="baseline-table-heading" className="card-title">
              Normal Person vs. Patient Nutrition Limits
            </h2>
            <p className="card-subtitle">
              Clinical reference thresholds used when screening packaged and whole foods.
              Whole unsalted walnuts &amp; fresh berries remain beneficial within portions.
            </p>
          </div>

          <div className="chart-switch-tabs" role="group" aria-label="Threshold view mode">
            <button
              type="button"
              className={`chart-switch-tab ${viewMode === 'daily' ? 'is-active' : ''}`}
              onClick={() => setViewMode('daily')}
            >
              Daily Limits
            </button>
            <button
              type="button"
              className={`chart-switch-tab ${viewMode === 'per100g' ? 'is-active' : ''}`}
              onClick={() => setViewMode('per100g')}
            >
              Per-100g Screening
            </button>
          </div>
        </div>

        <div className="data-table-wrap">
          {viewMode === 'daily' ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Profile Group</th>
                  <th className="num">Calories/day</th>
                  <th className="num">Sugars Max</th>
                  <th className="num">Total Fat Max</th>
                  <th className="num">Sat. Fat Max</th>
                  <th className="num">Protein Target</th>
                  <th className="num">Fiber Min</th>
                  <th className="num">Sodium Max</th>
                  <th>Clinical Focus</th>
                </tr>
              </thead>
              <tbody>
                {baselineRows.map((row) => {
                  const isActiveRow =
                    row.profileKey === 'active' ||
                    currentUser.conditions.includes(row.profileKey as HealthCondition) ||
                    (row.profileKey === 'normal' &&
                      currentUser.conditions.length === 0 &&
                      (currentUser.otherConditions || []).length === 0);

                  return (
                    <tr
                      key={row.profileKey}
                      className={isActiveRow ? 'is-active-profile' : undefined}
                    >
                      <td>
                        <strong>{row.profileLabel}</strong>
                        {row.profileKey === 'active' ? (
                          <span className="best-tag">Your Limit</span>
                        ) : isActiveRow ? (
                          <span className="best-tag">Active</span>
                        ) : null}
                      </td>
                      <td className="num">{row.caloriesDay.toLocaleString()} kcal</td>
                      <td className="num">&le; {row.sugarDayMaxG} g</td>
                      <td className="num">&le; {row.fatDayMaxG} g</td>
                      <td className="num">&le; {row.satFatDayMaxG} g</td>
                      <td className="num">{row.proteinDayLabel}</td>
                      <td className="num">&ge; {row.fiberDayMinG} g</td>
                      <td className="num">&le; {row.sodiumDayMaxMg.toLocaleString()} mg</td>
                      <td className="table-note-cell">{row.keyFocus}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Profile Group</th>
                  <th className="num">Max kcal / 100g</th>
                  <th className="num">Free Sugar / 100g</th>
                  <th className="num">Sat. Fat / 100g</th>
                  <th className="num">Sodium / 100g</th>
                  <th>Fat Guidance (Per 100g)</th>
                </tr>
              </thead>
              <tbody>
                {baselineRows.map((row) => {
                  const isActiveRow =
                    row.profileKey === 'active' ||
                    currentUser.conditions.includes(row.profileKey as HealthCondition) ||
                    (row.profileKey === 'normal' &&
                      currentUser.conditions.length === 0 &&
                      (currentUser.otherConditions || []).length === 0);

                  return (
                    <tr
                      key={row.profileKey}
                      className={isActiveRow ? 'is-active-profile' : undefined}
                    >
                      <td>
                        <strong>{row.profileLabel}</strong>
                        {row.profileKey === 'active' ? (
                          <span className="best-tag">Your Limit</span>
                        ) : isActiveRow ? (
                          <span className="best-tag">Active</span>
                        ) : null}
                      </td>
                      <td className="num">&le; {row.caloriesPer100gMax} kcal</td>
                      <td className="num">&le; {row.sugarPer100gMaxG} g</td>
                      <td className="num">&le; {row.satFatPer100gMaxG} g</td>
                      <td className="num">&le; {row.sodiumPer100gMaxMg} mg</td>
                      <td className="table-note-cell">{row.fatPer100gNote}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Logged-In Cart vs. Personal Limits Table */}
      <section className="card" style={{ marginTop: 20 }} aria-labelledby="cart-limits-heading">
        <div className="card-header">
          <div>
            <h2 id="cart-limits-heading" className="card-title">
              Logged-In Cart vs. Your Personal Limits ({currentUser.fullName})
            </h2>
            <p className="card-subtitle">
              Shows how each 100g serving in your Store Connect cart compares against your daily caps.
            </p>
          </div>
          <span className="sc-count-pill">
            {events.length} {events.length === 1 ? 'item' : 'items'}
          </span>
        </div>

        {events.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon" aria-hidden="true">
              <ShoppingBasket size={22} />
            </div>
            <h3 className="empty-title">No products in your cart yet</h3>
            <p className="empty-desc">
              Add foods from Store Connect (or add walnuts, blueberries, oats, or packaged
              snacks via the store extension) to compare every nutrient against your limits here.
            </p>
            <Link
              to="/amazon"
              className="btn-primary"
              style={{ textDecoration: 'none', flex: 'none' }}
            >
              <Store size={16} />
              <span>Browse Store Connect</span>
            </Link>
          </div>
        ) : (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Store</th>
                  <th className="num">Calories</th>
                  <th className="num">Sugars</th>
                  <th className="num">Fat</th>
                  <th className="num">Protein</th>
                  <th className="num">Sodium</th>
                  <th>Share of Daily Caps</th>
                  <th>Profile Verdict</th>
                </tr>
              </thead>
              <tbody>
                {events.map((ev) => {
                  const a = ev.analysis;
                  const store = inferStorePlatform(ev);
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

                  const riskCls = !prof
                    ? 'is-moderate'
                    : prof.riskLevel === 'LOW RISK'
                    ? 'is-low'
                    : prof.riskLevel === 'MODERATE RISK'
                    ? 'is-moderate'
                    : 'is-high';

                  const calPct = a ? pctOf(a.nutrition.calories, personalLimits.caloriesDay) : 0;
                  const sugPct = a ? pctOf(a.nutrition.sugars, personalLimits.sugarDayMaxG) : 0;
                  const sodPct = a ? pctOf(a.nutrition.sodium_mg, personalLimits.sodiumDayMaxMg) : 0;

                  return (
                    <tr key={ev.event_id}>
                      <td>
                        <strong>{ev.product_title}</strong>
                      </td>
                      <td>{store}</td>
                      <td className="num">
                        {a ? `${Math.round(a.nutrition.calories)} kcal` : '—'}
                      </td>
                      <td className="num">{a ? `${a.nutrition.sugars} g` : '—'}</td>
                      <td className="num">{a ? `${a.nutrition.fat} g` : '—'}</td>
                      <td className="num">{a ? `${a.nutrition.protein} g` : '—'}</td>
                      <td className="num">
                        {a ? `${Math.round(a.nutrition.sodium_mg)} mg` : '—'}
                      </td>
                      <td className="table-note-cell tabular">
                        {a
                          ? `${calPct}% kcal · ${sugPct}% sugar · ${sodPct}% Na`
                          : 'Needs nutrition info'}
                      </td>
                      <td>
                        <span className={`risk-tag ${riskCls}`}>
                          {prof ? prof.riskLevel : 'PENDING'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {analyzedEvents.length > 0 && (
                <tfoot>
                  <tr className="limits-total-row">
                    <td colSpan={2}>
                      <strong>
                        Cumulative Cart Total ({analyzedEvents.length} analyzed{' '}
                        {analyzedEvents.length === 1 ? 'item' : 'items'})
                      </strong>
                    </td>
                    <td className="num">
                      {Math.round(cartTotals.calories)} kcal ({pctOf(cartTotals.calories, personalLimits.caloriesDay)}%)
                    </td>
                    <td className="num">
                      {cartTotals.sugars.toFixed(1)} g ({pctOf(cartTotals.sugars, personalLimits.sugarDayMaxG)}%)
                    </td>
                    <td className="num">
                      {cartTotals.fat.toFixed(1)} g ({pctOf(cartTotals.fat, personalLimits.fatDayMaxG)}%)
                    </td>
                    <td className="num">{cartTotals.protein.toFixed(1)} g</td>
                    <td className="num">
                      {Math.round(cartTotals.sodium_mg)} mg ({pctOf(cartTotals.sodium_mg, personalLimits.sodiumDayMaxMg)}%)
                    </td>
                    <td className="table-note-cell" colSpan={2}>
                      <span className="limits-total-note">
                        <Activity size={13} aria-hidden="true" />
                        <span>
                          Against {personalLimits.caloriesDay} kcal / {personalLimits.sugarDayMaxG}g
                          sugar / {personalLimits.sodiumDayMaxMg}mg Na daily cap
                        </span>
                      </span>
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
