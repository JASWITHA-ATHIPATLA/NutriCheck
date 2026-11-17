import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Info,
  Loader2,
  Plus,
  RefreshCw,
  ShoppingBag,
  Trash2,
  TrendingDown,
  TrendingUp,
  Utensils,
  X,
} from 'lucide-react';
import { BreakdownPieChart } from '../components/BreakdownPieChart';
import { useAuth } from '../context/AuthContext';
import type {
  FoodConsumptionLog,
  MealSlot,
  NutritionSummaryReport,
  TrackerRange,
} from '../types';

const MEAL_SLOTS: { key: MealSlot; label: string; windowHint: string }[] = [
  { key: 'breakfast', label: 'Breakfast', windowHint: 'Morning' },
  { key: 'lunch', label: 'Lunch', windowHint: 'Midday' },
  { key: 'snack', label: 'Snack', windowHint: 'Evening / Bite' },
  { key: 'dinner', label: 'Dinner', windowHint: 'Night' },
];

const QUICK_FOOD_PRESETS = [
  {
    name: 'Rolled Oats Bowl (with milk)',
    mealSlot: 'breakfast' as MealSlot,
    platform: 'Manual',
    calories: 280,
    protein_g: 11,
    carbs_g: 44,
    fat_g: 5.5,
    fiber_g: 6.5,
    sugar_g: 6,
    sodium_mg: 75,
    potassium_mg: 310,
    calcium_mg: 180,
    iron_mg: 2.2,
    vitamin_c_mg: 1,
  },
  {
    name: 'Steamed Idli (3 pcs) & Sambar',
    mealSlot: 'breakfast' as MealSlot,
    platform: 'Swiggy',
    calories: 245,
    protein_g: 8.5,
    carbs_g: 45,
    fat_g: 2.8,
    fiber_g: 4.5,
    sugar_g: 2.0,
    sodium_mg: 390,
    potassium_mg: 280,
    calcium_mg: 55,
    iron_mg: 1.8,
    vitamin_c_mg: 8,
  },
  {
    name: 'Dal Tadka, 2 Roti & Sabzi',
    mealSlot: 'lunch' as MealSlot,
    platform: 'Zomato',
    calories: 465,
    protein_g: 17.5,
    carbs_g: 68,
    fat_g: 12.5,
    fiber_g: 9.5,
    sugar_g: 3.5,
    sodium_mg: 540,
    potassium_mg: 520,
    calcium_mg: 85,
    iron_mg: 4.2,
    vitamin_c_mg: 16,
  },
  {
    name: 'Grilled Chicken & Salad Bowl',
    mealSlot: 'dinner' as MealSlot,
    platform: 'Zomato',
    calories: 390,
    protein_g: 34,
    carbs_g: 18,
    fat_g: 18,
    fiber_g: 5.2,
    sugar_g: 4.0,
    sodium_mg: 480,
    potassium_mg: 610,
    calcium_mg: 90,
    iron_mg: 2.8,
    vitamin_c_mg: 32,
  },
  {
    name: 'Californian Walnuts (28g handful)',
    mealSlot: 'snack' as MealSlot,
    platform: 'Blinkit',
    calories: 185,
    protein_g: 4.3,
    carbs_g: 3.9,
    fat_g: 18.5,
    fiber_g: 1.9,
    sugar_g: 0.7,
    sodium_mg: 1,
    potassium_mg: 125,
    calcium_mg: 28,
    iron_mg: 0.8,
    vitamin_c_mg: 0.4,
  },
  {
    name: 'Fresh Blueberries (100g)',
    mealSlot: 'snack' as MealSlot,
    platform: 'Amazon Fresh',
    calories: 57,
    protein_g: 0.7,
    carbs_g: 14.5,
    fat_g: 0.3,
    fiber_g: 2.4,
    sugar_g: 10.0,
    sodium_mg: 1,
    potassium_mg: 77,
    calcium_mg: 6,
    iron_mg: 0.3,
    vitamin_c_mg: 9.7,
  },
];

const PORTION_OPTIONS = [
  { label: '0.25x (Quarter)', value: 0.25 },
  { label: '0.5x (Half)', value: 0.5 },
  { label: '0.75x', value: 0.75 },
  { label: '1x (Full serving)', value: 1 },
  { label: '1.5x', value: 1.5 },
  { label: '2x (Double)', value: 2 },
];

function getStatusBadge(status: string): { label: string; cls: string } {
  switch (status) {
    case 'deficient':
      return { label: 'Deficient', cls: 'is-high' };
    case 'excess':
      return { label: 'Excess', cls: 'is-high' };
    case 'near_limit':
      return { label: 'Near Limit', cls: 'is-moderate' };
    case 'remaining':
      return { label: 'Remaining', cls: 'is-moderate' };
    case 'within_limit':
      return { label: 'Within Limit', cls: 'is-good' };
    default:
      return { label: 'Optimal', cls: 'is-good' };
  }
}

export function DailyTrackerPage() {
  const { currentUser } = useAuth();
  const userId = currentUser?.id || '';

  const [range, setRange] = useState<TrackerRange>('daily');
  const [selectedDate, setSelectedDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [logs, setLogs] = useState<FoodConsumptionLog[]>([]);
  const [report, setReport] = useState<NutritionSummaryReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Per-pending confirmation draft state
  const [confirmDrafts, setConfirmDrafts] = useState<
    Record<
      string,
      { portionMultiplier: number; mealSlot: MealSlot; quantityLabel: string }
    >
  >({});
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  // Manual food entry panel state
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualPlatform, setManualPlatform] = useState('Manual');
  const [manualSlot, setManualSlot] = useState<MealSlot>('lunch');
  const [manualDate, setManualDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [manualTime, setManualTime] = useState(() =>
    new Date().toTimeString().slice(0, 5)
  );
  const [manualPortion, setManualPortion] = useState('1');
  const [manualQtyLabel, setManualQtyLabel] = useState('1 serving');
  const [manualCalories, setManualCalories] = useState('');
  const [manualProtein, setManualProtein] = useState('');
  const [manualCarbs, setManualCarbs] = useState('');
  const [manualFat, setManualFat] = useState('');
  const [manualFiber, setManualFiber] = useState('');
  const [manualSugar, setManualSugar] = useState('');
  const [manualSodium, setManualSodium] = useState('');
  const [manualPotassium, setManualPotassium] = useState('');
  const [manualCalcium, setManualCalcium] = useState('');
  const [manualIron, setManualIron] = useState('');
  const [manualVitC, setManualVitC] = useState('');
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);

  const loadTracker = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(
        `/api/food-logs?userId=${encodeURIComponent(userId)}&range=${encodeURIComponent(range)}&date=${encodeURIComponent(selectedDate)}`,
        { headers: { 'X-User-Id': userId } }
      );
      if (!res.ok) throw new Error('Unable to load daily nutrition logs.');
      const data = await res.json();
      setLogs(Array.isArray(data.logs) ? data.logs : []);
      setReport(data.report || null);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to load food logs.');
    } finally {
      setIsLoading(false);
    }
  }, [range, selectedDate, userId]);

  useEffect(() => {
    void loadTracker();
  }, [loadTracker]);

  function applyPreset(p: (typeof QUICK_FOOD_PRESETS)[number]) {
    setManualName(p.name);
    setManualPlatform(p.platform);
    setManualSlot(p.mealSlot);
    setManualCalories(String(p.calories));
    setManualProtein(String(p.protein_g));
    setManualCarbs(String(p.carbs_g));
    setManualFat(String(p.fat_g));
    setManualFiber(String(p.fiber_g));
    setManualSugar(String(p.sugar_g));
    setManualSodium(String(p.sodium_mg));
    setManualPotassium(String(p.potassium_mg));
    setManualCalcium(String(p.calcium_mg));
    setManualIron(String(p.iron_mg));
    setManualVitC(String(p.vitamin_c_mg));
    setManualPortion('1');
    setManualQtyLabel('1 serving');
  }

  async function handleAddManualFood(e: React.FormEvent) {
    e.preventDefault();
    if (!userId || !manualName.trim()) return;
    setIsSubmittingManual(true);
    setErrorMsg(null);

    const portion = Math.max(0.1, Math.min(20, parseFloat(manualPortion) || 1));

    try {
      const res = await fetch('/api/food-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': userId },
        body: JSON.stringify({
          userId,
          foodName: manualName.trim(),
          platform: manualPlatform,
          mealSlot: manualSlot,
          consumedDate: manualDate || selectedDate,
          consumedTime: manualTime,
          consumptionStatus: 'consumed',
          portionMultiplier: portion,
          quantityLabel: manualQtyLabel.trim() || `${portion}x serving`,
          calories: parseFloat(manualCalories) || 0,
          protein_g: parseFloat(manualProtein) || 0,
          carbs_g: manualCarbs.trim() === '' ? undefined : parseFloat(manualCarbs),
          fat_g: parseFloat(manualFat) || 0,
          fiber_g: manualFiber.trim() === '' ? undefined : parseFloat(manualFiber),
          sugar_g: parseFloat(manualSugar) || 0,
          sodium_mg: parseFloat(manualSodium) || 0,
          potassium_mg:
            manualPotassium.trim() === '' ? undefined : parseFloat(manualPotassium),
          calcium_mg: manualCalcium.trim() === '' ? undefined : parseFloat(manualCalcium),
          iron_mg: manualIron.trim() === '' ? undefined : parseFloat(manualIron),
          vitamin_c_mg: manualVitC.trim() === '' ? undefined : parseFloat(manualVitC),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Could not log food item.');
      }

      setManualName('');
      setManualCalories('');
      setManualProtein('');
      setManualCarbs('');
      setManualFat('');
      setManualFiber('');
      setManualSugar('');
      setManualSodium('');
      setShowManualForm(false);
      await loadTracker();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to save food log.');
    } finally {
      setIsSubmittingManual(false);
    }
  }

  async function handleConfirmPending(
    log: FoodConsumptionLog,
    status: 'consumed' | 'skipped'
  ) {
    if (!userId) return;
    setConfirmingId(log.log_id);
    const draft = confirmDrafts[log.log_id] || {
      portionMultiplier: log.portionMultiplier || 1,
      mealSlot: log.mealSlot || 'lunch',
      quantityLabel: log.quantityLabel || '1 serving',
    };

    try {
      const res = await fetch(`/api/food-logs/${encodeURIComponent(log.log_id)}/confirm`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': userId },
        body: JSON.stringify({
          userId,
          consumptionStatus: status,
          portionMultiplier: draft.portionMultiplier,
          mealSlot: draft.mealSlot,
          quantityLabel: draft.quantityLabel,
        }),
      });
      if (!res.ok) throw new Error('Unable to update confirmation.');
      await loadTracker();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Confirmation failed.');
    } finally {
      setConfirmingId(null);
    }
  }

  async function handleDeleteLog(logId: string) {
    if (!userId) return;
    try {
      const res = await fetch(
        `/api/food-logs/${encodeURIComponent(logId)}?userId=${encodeURIComponent(userId)}`,
        { method: 'DELETE', headers: { 'X-User-Id': userId } }
      );
      if (!res.ok) throw new Error('Unable to delete food log.');
      await loadTracker();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Delete failed.');
    }
  }

  const pendingConfirmations = report?.pendingConfirmations || [];

  const consumedLogsInWindow = useMemo(() => {
    if (!report) return [];
    return logs.filter(
      (l) =>
        l.consumptionStatus === 'consumed' &&
        l.consumedDate >= report.startDate &&
        l.consumedDate <= report.endDate
    );
  }, [logs, report]);

  const displayNutrients = useMemo(() => {
    if (!report) return null;
    return range === 'daily' ? report.totals : report.dailyAverage;
  }, [range, report]);

  const macroSlices = useMemo(() => {
    if (!displayNutrients) return [];
    const proteinKcal = Math.round(displayNutrients.protein_g * 4);
    const carbsKcal = Math.round(displayNutrients.carbs_g * 4);
    const fatKcal = Math.round(displayNutrients.fat_g * 9);
    return [
      {
        label: 'Protein',
        value: proteinKcal,
        displayValue: `${displayNutrients.protein_g}g`,
        color: '#146c43',
      },
      {
        label: 'Carbohydrates',
        value: carbsKcal,
        displayValue: `${displayNutrients.carbs_g}g`,
        color: '#0284c7',
      },
      {
        label: 'Total Fat',
        value: fatKcal,
        displayValue: `${displayNutrients.fat_g}g`,
        color: '#d97706',
      },
    ];
  }, [displayNutrients]);

  const mealSlotSlices = useMemo(() => {
    if (!report) return [];
    const colors: Record<MealSlot, string> = {
      breakfast: '#16a34a',
      lunch: '#0284c7',
      snack: '#d97706',
      dinner: '#7c3aed',
    };
    return report.mealSlots.map((slot) => ({
      label: slot.mealSlot.charAt(0).toUpperCase() + slot.mealSlot.slice(1),
      value: slot.calories,
      displayValue: `${Math.round(slot.calories)} kcal`,
      color: colors[slot.mealSlot],
    }));
  }, [report]);

  const platformSlices = useMemo(() => {
    if (!report) return [];
    const palette = ['#146c43', '#e11d48', '#f97316', '#0284c7', '#7c3aed', '#64748b'];
    return report.platformBreakdown.map((p, i) => ({
      label: p.platform,
      value: p.count,
      displayValue: `${p.count} items`,
      color: palette[i % palette.length],
    }));
  }, [report]);

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <p className="section-kicker" style={{ marginBottom: '4px' }}>
            DAILY NUTRITION &amp; ORDER TRACKER · {range.toUpperCase()} VIEW
          </p>
          <h1 className="page-title">Daily Food &amp; Nutrition Tracker</h1>
          <p className="page-subtitle">
            Track instant food orders (Zomato, Swiggy, Blinkit, Amazon Fresh) and manual
            meals from breakfast to dinner with personalized target comparisons.
          </p>
        </div>

        <div className="tracker-header-actions">
          <button
            type="button"
            className="btn-primary"
            style={{ flex: 'none' }}
            onClick={() => setShowManualForm((v) => !v)}
          >
            <Plus size={15} />
            <span>{showManualForm ? 'Close Food Form' : 'Log Food Manually'}</span>
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => void loadTracker()}
            disabled={isLoading}
          >
            <RefreshCw size={15} className={isLoading ? 'spin-icon' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Instant-consumable scope banner */}
      <div className="info-callout" role="note">
        <Info size={16} style={{ verticalAlign: 'text-bottom', marginRight: 6 }} />
        <strong>Instant Food &amp; Groceries Only:</strong> Delivered orders from{' '}
        <strong>Zomato, Swiggy, Blinkit, and Amazon Fresh</strong> appear below for portion
        confirmation. Regular Amazon parcels and delayed non-consumables are automatically
        excluded.
      </div>

      {errorMsg && (
        <div className="error-banner" role="alert" style={{ marginTop: 12 }}>
          <AlertTriangle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Range Segmented Bar & Date Picker */}
      <div className="tracker-toolbar">
        <div className="catalog-filter-row" role="group" aria-label="Report period">
          {(
            [
              { key: 'daily', label: 'Daily' },
              { key: 'weekly', label: 'Weekly (7 Days)' },
              { key: 'monthly', label: 'Monthly (30 Days)' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`chart-switch-tab ${range === tab.key ? 'is-active' : ''}`}
              onClick={() => setRange(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="tracker-date-wrap">
          <Calendar size={15} color="#475569" />
          <label htmlFor="tracker-date-picker" className="sr-only">
            Target date
          </label>
          <input
            id="tracker-date-picker"
            type="date"
            className="field-input"
            style={{ width: 'auto', padding: '7px 10px' }}
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
          {report && (
            <span className="card-subtitle tabular">
              Window: {report.startDate} → {report.endDate}
            </span>
          )}
        </div>
      </div>

      {/* Pending Delivery Confirmations */}
      {pendingConfirmations.length > 0 && (
        <section
          className="card tracker-pending-card"
          aria-labelledby="pending-confirm-heading"
        >
          <div className="rx-card-head">
            <div>
              <h2 id="pending-confirm-heading" className="card-title">
                Confirm Delivered Food &amp; Portions ({pendingConfirmations.length})
              </h2>
              <p className="card-subtitle">
                Confirm whether you consumed these instant food orders and select your portion eaten.
              </p>
            </div>
            <span className="risk-tag is-moderate">Awaiting Confirmation</span>
          </div>

          <div className="tracker-pending-list">
            {pendingConfirmations.map((log) => {
              const draft = confirmDrafts[log.log_id] || {
                portionMultiplier: log.portionMultiplier || 1,
                mealSlot: log.mealSlot || 'lunch',
                quantityLabel: log.quantityLabel || '1 serving (100g)',
              };

              return (
                <div key={log.log_id} className="tracker-pending-row">
                  <div className="tracker-pending-info">
                    <div className="tracker-pending-title">
                      <span>{log.foodName}</span>
                      <span className="store-chip">{log.platform}</span>
                    </div>
                    <div className="tracker-pending-meta tabular">
                      {log.consumedDate} · {log.consumedTime} · Base:{' '}
                      {Math.round(log.baseNutrients.calories)} kcal ·{' '}
                      {log.baseNutrients.protein_g}g protein ·{' '}
                      {log.baseNutrients.sugar_g}g sugar
                    </div>
                  </div>

                  <div className="tracker-pending-controls">
                    <select
                      aria-label={`Meal slot for ${log.foodName}`}
                      className="field-input"
                      style={{ width: 'auto', padding: '6px 9px', fontSize: '13px' }}
                      value={draft.mealSlot}
                      onChange={(e) =>
                        setConfirmDrafts((prev) => ({
                          ...prev,
                          [log.log_id]: {
                            ...draft,
                            mealSlot: e.target.value as MealSlot,
                          },
                        }))
                      }
                    >
                      {MEAL_SLOTS.map((ms) => (
                        <option key={ms.key} value={ms.key}>
                          {ms.label}
                        </option>
                      ))}
                    </select>

                    <select
                      aria-label={`Portion consumed for ${log.foodName}`}
                      className="field-input"
                      style={{ width: 'auto', padding: '6px 9px', fontSize: '13px' }}
                      value={draft.portionMultiplier}
                      onChange={(e) => {
                        const mult = parseFloat(e.target.value) || 1;
                        const labelMatch = PORTION_OPTIONS.find((p) => p.value === mult);
                        setConfirmDrafts((prev) => ({
                          ...prev,
                          [log.log_id]: {
                            ...draft,
                            portionMultiplier: mult,
                            quantityLabel: labelMatch
                              ? labelMatch.label
                              : `${mult}x serving`,
                          },
                        }));
                      }}
                    >
                      {PORTION_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      className="btn-primary"
                      style={{ flex: 'none', padding: '7px 12px', fontSize: '12.5px' }}
                      disabled={confirmingId === log.log_id}
                      onClick={() => void handleConfirmPending(log, 'consumed')}
                    >
                      <Check size={14} />
                      <span>Confirm Consumed</span>
                    </button>

                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ padding: '7px 11px', fontSize: '12.5px' }}
                      disabled={confirmingId === log.log_id}
                      onClick={() => void handleConfirmPending(log, 'skipped')}
                    >
                      <X size={14} />
                      <span>Not Consumed</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Manual Food Entry Form */}
      {showManualForm && (
        <form
          className="card tracker-manual-card"
          onSubmit={handleAddManualFood}
          aria-label="Log food item manually"
        >
          <div className="rx-card-head">
            <div>
              <h2 className="card-title">Log Food Item Manually</h2>
              <p className="card-subtitle">
                Pick a preset meal or enter your dish, meal slot, portion, and nutrition facts.
              </p>
            </div>
            <button
              type="button"
              className="cart-remove-btn"
              onClick={() => setShowManualForm(false)}
            >
              <X size={15} />
            </button>
          </div>

          <div className="rx-quick-test-chips">
            {QUICK_FOOD_PRESETS.map((p) => (
              <button
                key={p.name}
                type="button"
                className="btn-secondary"
                style={{ padding: '5px 10px', fontSize: '12px' }}
                onClick={() => applyPreset(p)}
              >
                {p.name}
              </button>
            ))}
          </div>

          <div className="tracker-form-grid">
            <div className="field">
              <label htmlFor="m-food-name" className="field-label">
                Food / Meal Name *
              </label>
              <input
                id="m-food-name"
                type="text"
                required
                className="field-input"
                placeholder="e.g. Dal Tadka & 2 Roti"
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="m-platform" className="field-label">
                Platform
              </label>
              <select
                id="m-platform"
                className="field-input"
                value={manualPlatform}
                onChange={(e) => setManualPlatform(e.target.value)}
              >
                <option value="Manual">Manual / Home</option>
                <option value="Zomato">Zomato</option>
                <option value="Swiggy">Swiggy</option>
                <option value="Swiggy Instamart">Swiggy Instamart</option>
                <option value="Blinkit">Blinkit</option>
                <option value="Amazon Fresh">Amazon Fresh</option>
              </select>
            </div>

            <div className="field">
              <label htmlFor="m-slot" className="field-label">
                Meal Slot
              </label>
              <select
                id="m-slot"
                className="field-input"
                value={manualSlot}
                onChange={(e) => setManualSlot(e.target.value as MealSlot)}
              >
                {MEAL_SLOTS.map((ms) => (
                  <option key={ms.key} value={ms.key}>
                    {ms.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="m-date" className="field-label">
                Date &amp; Time
              </label>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  id="m-date"
                  type="date"
                  className="field-input"
                  value={manualDate}
                  onChange={(e) => setManualDate(e.target.value)}
                />
                <input
                  aria-label="Time"
                  type="time"
                  className="field-input"
                  style={{ width: 112 }}
                  value={manualTime}
                  onChange={(e) => setManualTime(e.target.value)}
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor="m-portion" className="field-label">
                Portion Multiplier
              </label>
              <input
                id="m-portion"
                type="number"
                step="0.25"
                min="0.1"
                max="10"
                className="field-input is-numeric"
                value={manualPortion}
                onChange={(e) => setManualPortion(e.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="m-qty" className="field-label">
                Quantity Label
              </label>
              <input
                id="m-qty"
                type="text"
                className="field-input"
                placeholder="1 bowl / 200g"
                value={manualQtyLabel}
                onChange={(e) => setManualQtyLabel(e.target.value)}
              />
            </div>
          </div>

          <div className="tracker-nut-grid">
            <div className="field">
              <label htmlFor="m-cal" className="field-label">
                Calories (kcal)
              </label>
              <input
                id="m-cal"
                type="number"
                step="any"
                min="0"
                required
                className="field-input is-numeric"
                value={manualCalories}
                onChange={(e) => setManualCalories(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="m-pro" className="field-label">
                Protein (g)
              </label>
              <input
                id="m-pro"
                type="number"
                step="any"
                min="0"
                className="field-input is-numeric"
                value={manualProtein}
                onChange={(e) => setManualProtein(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="m-carb" className="field-label">
                Carbs (g)
              </label>
              <input
                id="m-carb"
                type="number"
                step="any"
                min="0"
                className="field-input is-numeric"
                value={manualCarbs}
                onChange={(e) => setManualCarbs(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="m-fat" className="field-label">
                Fat (g)
              </label>
              <input
                id="m-fat"
                type="number"
                step="any"
                min="0"
                className="field-input is-numeric"
                value={manualFat}
                onChange={(e) => setManualFat(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="m-fib" className="field-label">
                Fiber (g)
              </label>
              <input
                id="m-fib"
                type="number"
                step="any"
                min="0"
                className="field-input is-numeric"
                value={manualFiber}
                onChange={(e) => setManualFiber(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="m-sug" className="field-label">
                Sugar (g)
              </label>
              <input
                id="m-sug"
                type="number"
                step="any"
                min="0"
                className="field-input is-numeric"
                value={manualSugar}
                onChange={(e) => setManualSugar(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="m-sod" className="field-label">
                Sodium (mg)
              </label>
              <input
                id="m-sod"
                type="number"
                step="any"
                min="0"
                className="field-input is-numeric"
                value={manualSodium}
                onChange={(e) => setManualSodium(e.target.value)}
              />
            </div>
          </div>

          <div style={{ marginTop: 12, display: 'flex', gap: 10 }}>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmittingManual}
              style={{ flex: 'none', padding: '9px 18px' }}
            >
              {isSubmittingManual ? 'Logging...' : 'Save Consumed Food'}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setShowManualForm(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {isLoading || !report || !displayNutrients ? (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="rx-loading-state">
            <Loader2 size={18} className="spin-icon" />
            <span>Computing personalized nutrition summary...</span>
          </div>
        </div>
      ) : (
        <>
          {/* KPI Strip */}
          <section className="rx-kpi-grid" aria-label="Daily nutrition summary KPIs">
            <div className="kpi-card">
              <div className="kpi-label">
                {range === 'daily' ? 'Calories Consumed' : 'Avg Daily Calories'}
              </div>
              <div className="kpi-value tabular">
                {Math.round(displayNutrients.calories)}{' '}
                <span className="tracker-kpi-target">
                  / {Math.round(report.requirements.calories)} kcal
                </span>
              </div>
              <div className="kpi-note">
                {range === 'daily'
                  ? `${report.consumedCount} meals confirmed today`
                  : `${report.consumedCount} meals across ${report.loggedDays} active days`}
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-label">
                {range === 'daily' ? 'Protein Intake' : 'Avg Daily Protein'}
              </div>
              <div className="kpi-value tabular">
                {displayNutrients.protein_g}g{' '}
                <span className="tracker-kpi-target">
                  / {report.requirements.protein_g}g
                </span>
              </div>
              <div className="kpi-note">
                Personalized for {currentUser?.fullName} ({currentUser?.age} yrs)
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-label">Nutrient Deficiencies</div>
              <div
                className="kpi-value tabular"
                style={{
                  color: report.deficiencies.length > 0 ? '#92400e' : '#146c43',
                }}
              >
                {report.deficiencies.length}
              </div>
              <div className="kpi-note">
                {report.deficiencies.length === 0
                  ? 'All target minimums on track'
                  : report.deficiencies
                      .slice(0, 2)
                      .map((d) => d.label)
                      .join(', ')}
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-label">Excess Consumption Alerts</div>
              <div
                className="kpi-value tabular"
                style={{
                  color: report.excesses.length > 0 ? '#be123c' : '#146c43',
                }}
              >
                {report.excesses.length}
              </div>
              <div className="kpi-note">
                {report.excesses.length === 0
                  ? 'Sugar, sodium & calories within limit'
                  : report.excesses
                      .slice(0, 2)
                      .map((e) => e.label)
                      .join(', ')}
              </div>
            </div>
          </section>

          {/* Pie Charts Grid */}
          <section className="tracker-charts-grid" aria-label="Nutrition breakdown charts">
            <BreakdownPieChart
              title="Macronutrient Energy Share"
              subtitle={
                range === 'daily'
                  ? 'Calorie share from Protein, Carbs & Fat today'
                  : `Daily average energy split (${range})`
              }
              slices={macroSlices}
              centerValue={`${Math.round(displayNutrients.calories)}`}
              centerLabel="kcal"
              emptyMessage="Log or confirm a meal to see your macronutrient pie chart."
            />

            <BreakdownPieChart
              title={
                range === 'daily'
                  ? 'Breakfast-to-Dinner Calories'
                  : 'Food Orders by Platform'
              }
              subtitle={
                range === 'daily'
                  ? 'Meal timing calorie balance'
                  : 'Instant food sources logged in this period'
              }
              slices={range === 'daily' ? mealSlotSlices : platformSlices}
              centerValue={
                range === 'daily'
                  ? `${report.consumedCount}`
                  : `${report.consumedCount}`
              }
              centerLabel={range === 'daily' ? 'Meals' : 'Items'}
              emptyMessage="No confirmed food logs in this period yet."
            />
          </section>

          {/* Deficiency / Excess / Remaining Spotlight */}
          <section className="tracker-spotlight-grid" aria-label="Deficiency and excess summary">
            <div className="card tracker-spot-card is-deficient">
              <div className="tracker-spot-head">
                <TrendingDown size={16} color="#92400e" />
                <h3>Nutrient Deficiencies</h3>
              </div>
              {report.deficiencies.length === 0 ? (
                <p className="card-subtitle">
                  No nutrient deficiencies flagged in this view.
                </p>
              ) : (
                <ul className="tracker-spot-list">
                  {report.deficiencies.map((row) => (
                    <li key={row.key}>
                      <span>{row.label}</span>
                      <span className="tabular">
                        {row.consumed}/{row.target} {row.unit} (-{row.remaining} {row.unit})
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="card tracker-spot-card is-excess">
              <div className="tracker-spot-head">
                <TrendingUp size={16} color="#be123c" />
                <h3>Excess Consumption</h3>
              </div>
              {report.excesses.length === 0 ? (
                <p className="card-subtitle">
                  No nutrients exceeded your personalized ceiling.
                </p>
              ) : (
                <ul className="tracker-spot-list">
                  {report.excesses.map((row) => (
                    <li key={row.key}>
                      <span>{row.label}</span>
                      <span className="tabular" style={{ color: '#be123c' }}>
                        +{row.excess} {row.unit} over ({row.pct}%)
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="card tracker-spot-card is-remaining">
              <div className="tracker-spot-head">
                <CheckCircle2 size={16} color="#146c43" />
                <h3>Remaining Requirements</h3>
              </div>
              {report.remaining.length === 0 ? (
                <p className="card-subtitle">All daily requirements reached.</p>
              ) : (
                <ul className="tracker-spot-list">
                  {report.remaining.slice(0, 6).map((row) => (
                    <li key={row.key}>
                      <span>{row.label}</span>
                      <span className="tabular">
                        {row.remaining} {row.unit} left
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {/* Detailed Nutrient Comparison Table + Progress Bars */}
          <section className="card" style={{ marginTop: 16 }} aria-labelledby="tracker-comp-title">
            <div className="rx-card-head">
              <div>
                <h2 id="tracker-comp-title" className="card-title">
                  Personalized Nutrient Comparison Table
                </h2>
                <p className="card-subtitle">
                  {range === 'daily'
                    ? 'Today’s macros and micronutrients vs. your personalized health requirements.'
                    : `Daily average vs. target across ${report.startDate} to ${report.endDate}.`}
                </p>
              </div>
              <span className="sc-count-pill">11 tracked nutrients</span>
            </div>

            <div className="data-table-wrap limits-table-frame">
              <table className="data-table is-compact">
                <thead>
                  <tr>
                    <th>Nutrient</th>
                    <th className="num">
                      {range === 'daily' ? 'Consumed' : 'Avg / Day'}
                    </th>
                    {range !== 'daily' && <th className="num">Period Total</th>}
                    <th className="num">Target Limit</th>
                    <th className="num">Remaining / Diff</th>
                    <th>Progress</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {report.comparisonRows.map((row) => {
                    const badge = getStatusBadge(row.status);
                    const barColor =
                      row.status === 'excess'
                        ? '#be123c'
                        : row.status === 'deficient' || row.status === 'near_limit'
                        ? '#d97706'
                        : '#146c43';
                    return (
                      <tr key={row.key}>
                        <td>
                          <strong>{row.label}</strong>
                          <span className="limits-row-sub" style={{ marginLeft: 6 }}>
                            ({row.mode === 'max' ? 'Upper cap' : row.mode === 'min' ? 'Daily min' : 'Target'})
                          </span>
                        </td>
                        <td className="num tabular">
                          {row.consumed} {row.unit}
                        </td>
                        {range !== 'daily' && (
                          <td className="num tabular">
                            {row.periodTotal} {row.unit}
                          </td>
                        )}
                        <td className="num tabular">
                          {row.target} {row.unit}
                        </td>
                        <td className="num tabular">
                          {row.excess > 0 ? (
                            <span style={{ color: '#be123c', fontWeight: 700 }}>
                              +{row.excess} {row.unit} over
                            </span>
                          ) : (
                            <span>
                              {row.remaining} {row.unit} left
                            </span>
                          )}
                        </td>
                        <td style={{ minWidth: 140 }}>
                          <div className="tracker-progress-wrap">
                            <div className="tracker-progress-track">
                              <div
                                className="tracker-progress-fill"
                                style={{
                                  width: `${Math.min(100, row.pct)}%`,
                                  backgroundColor: barColor,
                                }}
                              />
                            </div>
                            <span className="tabular tracker-progress-pct">{row.pct}%</span>
                          </div>
                        </td>
                        <td>
                          <span className={`eval-pill ${badge.cls}`}>{badge.label}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* Daily Breakfast-to-Dinner Meal Log */}
          <section className="card" style={{ marginTop: 16 }} aria-labelledby="meal-timeline-title">
            <div className="rx-card-head">
              <div>
                <h2 id="meal-timeline-title" className="card-title">
                  Breakfast to Dinner Consumption Log
                </h2>
                <p className="card-subtitle">
                  Confirmed food intake with date, time, platform, and portion size.
                </p>
              </div>
              <span className="sc-count-pill">{consumedLogsInWindow.length} entries</span>
            </div>

            {consumedLogsInWindow.length === 0 ? (
              <div className="rx-empty-box" style={{ marginTop: 12 }}>
                <Utensils size={24} color="#64748b" />
                <div>
                  <strong>No confirmed meals logged for this period</strong>
                  <p>
                    Use “Log Food Manually” or confirm an instant food delivery order above.
                  </p>
                </div>
              </div>
            ) : (
              <div className="tracker-slots-grid">
                {MEAL_SLOTS.map((slot) => {
                  const slotItems = consumedLogsInWindow.filter(
                    (l) => l.mealSlot === slot.key
                  );
                  const slotSummary = report.mealSlots.find(
                    (s) => s.mealSlot === slot.key
                  );
                  return (
                    <div key={slot.key} className="tracker-slot-box">
                      <div className="tracker-slot-head">
                        <div>
                          <div className="tracker-slot-title">{slot.label}</div>
                          <div className="limits-row-sub">{slot.windowHint}</div>
                        </div>
                        <span className="tabular tracker-slot-kcal">
                          {Math.round(slotSummary?.calories || 0)} kcal
                        </span>
                      </div>

                      {slotItems.length === 0 ? (
                        <p className="card-subtitle" style={{ marginTop: 8 }}>
                          No {slot.label.toLowerCase()} logged.
                        </p>
                      ) : (
                        <div className="tracker-slot-items">
                          {slotItems.map((item) => (
                            <div key={item.log_id} className="tracker-food-entry">
                              <div className="tracker-food-main">
                                <div className="tracker-food-title">
                                  <span>{item.foodName}</span>
                                  <span className="store-chip">
                                    <ShoppingBag size={11} style={{ marginRight: 3 }} />
                                    {item.platform}
                                  </span>
                                </div>
                                <div className="tracker-food-meta tabular">
                                  <Clock size={11} />
                                  <span>
                                    {item.consumedDate} {item.consumedTime} · {item.quantityLabel} (
                                    {item.portionMultiplier}x)
                                  </span>
                                </div>
                                <div className="tracker-food-macros tabular">
                                  {Math.round(item.nutrients.calories)} kcal · P:{' '}
                                  {item.nutrients.protein_g}g · C: {item.nutrients.carbs_g}g · F:{' '}
                                  {item.nutrients.fat_g}g · Fib: {item.nutrients.fiber_g}g · Sug:{' '}
                                  {item.nutrients.sugar_g}g · Na: {Math.round(item.nutrients.sodium_mg)}mg
                                </div>
                              </div>
                              <button
                                type="button"
                                className="cart-remove-btn"
                                aria-label={`Delete ${item.foodName}`}
                                onClick={() => void handleDeleteLog(item.log_id)}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Weekly / Monthly Day-by-Day Trend Table */}
          {range !== 'daily' && (
            <section className="card" style={{ marginTop: 16 }} aria-labelledby="period-series-title">
              <div className="rx-card-head">
                <div>
                  <h2 id="period-series-title" className="card-title">
                    {range === 'weekly' ? 'Weekly (7-Day)' : 'Monthly (30-Day)'} Daily Trend Report
                  </h2>
                  <p className="card-subtitle">
                    Day-by-day calorie, macro, fiber, sugar, and sodium breakdown.
                  </p>
                </div>
                <span className="sc-count-pill">{report.dailySeries.length} logged days</span>
              </div>

              {report.dailySeries.length === 0 ? (
                <p className="card-subtitle" style={{ marginTop: 10 }}>
                  No confirmed daily totals in this window yet.
                </p>
              ) : (
                <div className="data-table-wrap limits-table-frame">
                  <table className="data-table is-compact">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th className="num">Meals</th>
                        <th className="num">Calories</th>
                        <th className="num">Protein</th>
                        <th className="num">Carbs</th>
                        <th className="num">Fat</th>
                        <th className="num">Fiber</th>
                        <th className="num">Sugar</th>
                        <th className="num">Sodium</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.dailySeries.map((day) => (
                        <tr key={day.date}>
                          <td className="tabular">
                            <strong>{day.date}</strong>
                          </td>
                          <td className="num tabular">{day.itemsCount}</td>
                          <td className="num tabular">{Math.round(day.calories)} kcal</td>
                          <td className="num tabular">{day.protein_g}g</td>
                          <td className="num tabular">{day.carbs_g}g</td>
                          <td className="num tabular">{day.fat_g}g</td>
                          <td className="num tabular">{day.fiber_g}g</td>
                          <td className="num tabular">{day.sugar_g}g</td>
                          <td className="num tabular">{Math.round(day.sodium_mg)} mg</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
