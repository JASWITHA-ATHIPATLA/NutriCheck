import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Flame,
  HeartPulse,
  Info,
  Loader2,
  PieChart,
  Plus,
  RefreshCw,
  ShieldAlert,
  ShoppingBag,
  Sparkles,
  Trash2,
  TrendingDown,
  TrendingUp,
  Utensils,
  X,
} from 'lucide-react';
import { BreakdownPieChart } from '../components/BreakdownPieChart';
import { useAuth } from '../context/AuthContext';
import type {
  AmazonCartEvent,
  FoodConsumptionLog,
  FoodItemQualityEval,
  MealSlot,
  NutritionSummaryReport,
  TrackerRange,
} from '../types';
import {
  buildNonJsonErrorMessage,
  readJsonResponse,
} from '../utils/safeFetchJson';

const MEAL_SLOTS: { key: MealSlot; label: string; windowHint: string }[] = [
  { key: 'breakfast', label: 'Breakfast', windowHint: 'Morning' },
  { key: 'lunch', label: 'Lunch', windowHint: 'Midday' },
  { key: 'snack', label: 'Snack', windowHint: 'Evening / Bite' },
  { key: 'dinner', label: 'Dinner', windowHint: 'Night' },
];

const ZOMATO_SWIGGY_DEMO_ORDERS = [
  {
    name: 'Steamed Idli (3 pcs) & Sambar Bowl',
    mealSlot: 'breakfast' as MealSlot,
    platform: 'Swiggy',
    tag: 'Healthy Order · Low Sat Fat',
    calories: 245,
    protein_g: 8.5,
    carbs_g: 45,
    fat_g: 2.8,
    saturated_fat_g: 0.5,
    fiber_g: 4.8,
    sugar_g: 2.0,
    sodium_mg: 340,
    potassium_mg: 310,
    calcium_mg: 65,
    iron_mg: 2.1,
    vitamin_c_mg: 12,
  },
  {
    name: 'Grilled Chicken, Quinoa & Avocado Salad Bowl',
    mealSlot: 'lunch' as MealSlot,
    platform: 'Zomato',
    tag: 'High Protein & Good Fats',
    calories: 410,
    protein_g: 34,
    carbs_g: 22,
    fat_g: 18,
    saturated_fat_g: 2.6,
    fiber_g: 6.5,
    sugar_g: 3.5,
    sodium_mg: 390,
    potassium_mg: 640,
    calcium_mg: 95,
    iron_mg: 3.1,
    vitamin_c_mg: 34,
  },
  {
    name: 'Paneer Butter Masala & 2 Butter Naan',
    mealSlot: 'dinner' as MealSlot,
    platform: 'Zomato',
    tag: 'High Saturated Fat & Sodium',
    calories: 690,
    protein_g: 19,
    carbs_g: 66,
    fat_g: 38,
    saturated_fat_g: 21.5,
    fiber_g: 3.2,
    sugar_g: 9.5,
    sodium_mg: 1080,
    potassium_mg: 340,
    calcium_mg: 260,
    iron_mg: 2.4,
    vitamin_c_mg: 8,
  },
  {
    name: 'Double Cheese Burger, Loaded Fries & Cola',
    mealSlot: 'snack' as MealSlot,
    platform: 'Swiggy',
    tag: 'High Bad Fat & Free Sugar',
    calories: 780,
    protein_g: 21,
    carbs_g: 88,
    fat_g: 36,
    saturated_fat_g: 17.8,
    fiber_g: 2.4,
    sugar_g: 34.0,
    sodium_mg: 1240,
    potassium_mg: 290,
    calcium_mg: 140,
    iron_mg: 2.0,
    vitamin_c_mg: 4,
  },
];

const QUICK_FOOD_PRESETS = [
  ...ZOMATO_SWIGGY_DEMO_ORDERS,
  {
    name: 'Dal Tadka, 2 Whole Wheat Roti & Sabzi',
    mealSlot: 'lunch' as MealSlot,
    platform: 'Zomato',
    tag: 'Balanced Meal',
    calories: 455,
    protein_g: 17.5,
    carbs_g: 66,
    fat_g: 11.5,
    saturated_fat_g: 3.2,
    fiber_g: 9.5,
    sugar_g: 3.5,
    sodium_mg: 490,
    potassium_mg: 520,
    calcium_mg: 85,
    iron_mg: 4.2,
    vitamin_c_mg: 16,
  },
  {
    name: 'Californian Walnuts & Almonds (30g)',
    mealSlot: 'snack' as MealSlot,
    platform: 'Swiggy Instamart',
    tag: 'Good Omega-3 Fats',
    calories: 185,
    protein_g: 5.2,
    carbs_g: 4.2,
    fat_g: 17.8,
    saturated_fat_g: 1.6,
    fiber_g: 2.8,
    sugar_g: 1.1,
    sodium_mg: 2,
    potassium_mg: 160,
    calcium_mg: 42,
    iron_mg: 1.1,
    vitamin_c_mg: 0.5,
  },
];

const PORTION_OPTIONS = [
  { label: '0.25x (Quarter)', value: 0.25 },
  { label: '0.5x (Half)', value: 0.5 },
  { label: '0.75x', value: 0.75 },
  { label: '1x (Full order)', value: 1 },
  { label: '1.5x', value: 1.5 },
  { label: '2x (Double)', value: 2 },
];

const DISMISSED_EVENTS_STORAGE_PREFIX = 'nutricheck_tracker_dismissed_events_v1_';
const AMAZON_STORAGE_PREFIX = 'nutricheck_amazon_events_v1_';

function readDismissedEventIds(userId: string): Set<string> {
  if (!userId || typeof window === 'undefined') return new Set();
  try {
    const raw = window.localStorage.getItem(`${DISMISSED_EVENTS_STORAGE_PREFIX}${userId}`);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function saveDismissedEventIds(userId: string, ids: Set<string>) {
  if (!userId || typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      `${DISMISSED_EVENTS_STORAGE_PREFIX}${userId}`,
      JSON.stringify(Array.from(ids).slice(-200))
    );
  } catch {
    // ignore storage errors
  }
}

function isInstantOrderPlatform(platform = '', url = ''): boolean {
  const hay = `${platform} ${url}`.toLowerCase();
  return (
    hay.includes('zomato') ||
    hay.includes('swiggy') ||
    hay.includes('instamart') ||
    hay.includes('blinkit') ||
    hay.includes('amazon fresh') ||
    hay.includes('zepto')
  );
}

function getPlatformChipClass(platform = ''): string {
  const lower = platform.toLowerCase();
  if (lower.includes('zomato')) return 'store-chip is-zomato';
  if (lower.includes('swiggy')) return 'store-chip is-swiggy';
  return 'store-chip';
}

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
  const [isSimulatingOrder, setIsSimulatingOrder] = useState<string | null>(null);
  const [isClearingAll, setIsClearingAll] = useState(false);

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
  const [manualPlatform, setManualPlatform] = useState('Zomato');
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

  const syncingEventsRef = useRef(false);

  // Sync any Zomato / Swiggy / Blinkit orders stored in local Store Connect history into FoodLogs
  const syncStoreConnectOrdersToTracker = useCallback(
    async (existingLogs: FoodConsumptionLog[]): Promise<boolean> => {
      if (!userId || syncingEventsRef.current || typeof window === 'undefined') return false;
      try {
        const raw = window.localStorage.getItem(`${AMAZON_STORAGE_PREFIX}${userId}`);
        if (!raw) return false;
        const storedEvents = JSON.parse(raw) as AmazonCartEvent[];
        if (!Array.isArray(storedEvents) || storedEvents.length === 0) return false;

        const dismissedIds = readDismissedEventIds(userId);
        const loggedSourceIds = new Set(
          existingLogs.map((l) => l.sourceEventId).filter(Boolean) as string[]
        );

        const unsyncedInstantOrders = storedEvents.filter((ev) => {
          if (!ev?.event_id || dismissedIds.has(ev.event_id) || loggedSourceIds.has(ev.event_id)) {
            return false;
          }
          if (!ev.analysis?.nutrition) return false;
          if (ev.tracker_eligibility) {
            return ev.tracker_eligibility.isInstantConsumable;
          }
          return isInstantOrderPlatform(ev.source_platform || '', ev.product_url || '');
        });

        if (unsyncedInstantOrders.length === 0) return false;

        syncingEventsRef.current = true;
        let addedAny = false;
        for (const ev of unsyncedInstantOrders) {
          const n = ev.analysis?.nutrition;
          if (!n) continue;
          const evDate = ev.timestamp ? new Date(ev.timestamp) : new Date();
          const validDate = Number.isNaN(evDate.getTime()) ? new Date() : evDate;
          const consumedDate = validDate.toISOString().slice(0, 10);
          const consumedTime = validDate.toTimeString().slice(0, 5);
          const hour = validDate.getHours();
          const mealSlot: MealSlot =
            hour < 11 ? 'breakfast' : hour < 16 ? 'lunch' : hour < 19 ? 'snack' : 'dinner';

          const res = await fetch('/api/food-logs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-User-Id': userId },
            body: JSON.stringify({
              userId,
              sourceEventId: ev.event_id,
              foodName: ev.product_title,
              platform: ev.source_platform || 'Zomato',
              mealSlot,
              consumedDate,
              consumedTime,
              consumptionStatus: 'consumed',
              portionMultiplier: 1,
              quantityLabel: '1 order serving',
              calories: n.calories,
              protein_g: n.protein,
              fat_g: n.fat,
              sugar_g: n.sugars,
              sodium_mg: n.sodium_mg,
              ingredientsText: ev.ingredients_text || '',
              imageUrl: ev.image_url || null,
            }),
          }).catch(() => null);

          if (res?.ok) {
            addedAny = true;
          }
        }
        syncingEventsRef.current = false;
        return addedAny;
      } catch {
        syncingEventsRef.current = false;
        return false;
      }
    },
    [userId]
  );

  const loadTracker = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(
        `/api/food-logs?userId=${encodeURIComponent(userId)}&range=${encodeURIComponent(range)}&date=${encodeURIComponent(selectedDate)}`,
        { headers: { 'X-User-Id': userId } }
      );
      const { data } = await readJsonResponse<{
        logs?: FoodConsumptionLog[];
        report?: NutritionSummaryReport | null;
        error?: string;
      }>(res);
      if (!res.ok || !data) {
        throw new Error(
          data?.error || buildNonJsonErrorMessage(res, 'Unable to load daily nutrition logs.')
        );
      }
      const fetchedLogs = Array.isArray(data.logs) ? data.logs : [];
      const didSyncNew = await syncStoreConnectOrdersToTracker(fetchedLogs);
      if (didSyncNew) {
        const res2 = await fetch(
          `/api/food-logs?userId=${encodeURIComponent(userId)}&range=${encodeURIComponent(range)}&date=${encodeURIComponent(selectedDate)}`,
          { headers: { 'X-User-Id': userId } }
        );
        const { data: data2 } = await readJsonResponse<{
          logs?: FoodConsumptionLog[];
          report?: NutritionSummaryReport | null;
        }>(res2);
        if (res2.ok && data2) {
          setLogs(Array.isArray(data2.logs) ? data2.logs : []);
          setReport(data2.report || null);
          return;
        }
      }
      setLogs(fetchedLogs);
      setReport(data.report || null);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to load food logs.');
    } finally {
      setIsLoading(false);
    }
  }, [range, selectedDate, syncStoreConnectOrdersToTracker, userId]);

  useEffect(() => {
    void loadTracker();
  }, [loadTracker]);

  // Real-time listener: when user orders on Zomato / Swiggy via Chrome Extension, refresh Daily Tracker automatically
  useEffect(() => {
    function handleExtensionMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      const msg = event.data;
      if (msg?.type === 'NUTRICHECK_AMAZON_SYNC' && Array.isArray(msg.events)) {
        void loadTracker();
      }
    }
    window.addEventListener('message', handleExtensionMessage);
    return () => window.removeEventListener('message', handleExtensionMessage);
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
    setManualQtyLabel('1 order serving');
  }

  async function handleQuickSimulateOrder(p: (typeof ZOMATO_SWIGGY_DEMO_ORDERS)[number]) {
    if (!userId) return;
    setIsSimulatingOrder(p.name);
    setErrorMsg(null);
    try {
      const nowTime = new Date().toTimeString().slice(0, 5);
      const res = await fetch('/api/food-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': userId },
        body: JSON.stringify({
          userId,
          foodName: p.name,
          platform: p.platform,
          mealSlot: p.mealSlot,
          consumedDate: selectedDate,
          consumedTime: nowTime,
          consumptionStatus: 'consumed',
          portionMultiplier: 1,
          quantityLabel: '1 order serving',
          calories: p.calories,
          protein_g: p.protein_g,
          carbs_g: p.carbs_g,
          fat_g: p.fat_g,
          saturated_fat_g: p.saturated_fat_g,
          fiber_g: p.fiber_g,
          sugar_g: p.sugar_g,
          sodium_mg: p.sodium_mg,
          potassium_mg: p.potassium_mg,
          calcium_mg: p.calcium_mg,
          iron_mg: p.iron_mg,
          vitamin_c_mg: p.vitamin_c_mg,
        }),
      });
      const { data } = await readJsonResponse<{ ok?: boolean; error?: string }>(res);
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || 'Could not log Zomato/Swiggy order.');
      }
      await loadTracker();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to log order.');
    } finally {
      setIsSimulatingOrder(null);
    }
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
      const { data } = await readJsonResponse<{ ok?: boolean; error?: string }>(res);
      if (!res.ok || !data?.ok) {
        throw new Error(
          data?.error || buildNonJsonErrorMessage(res, 'Could not log food item.')
        );
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

  async function handleUpdatePortion(log: FoodConsumptionLog, newMultiplier: number) {
    if (!userId) return;
    setConfirmingId(log.log_id);
    const labelMatch = PORTION_OPTIONS.find((p) => p.value === newMultiplier);
    try {
      const res = await fetch(`/api/food-logs/${encodeURIComponent(log.log_id)}/confirm`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': userId },
        body: JSON.stringify({
          userId,
          consumptionStatus: 'consumed',
          portionMultiplier: newMultiplier,
          mealSlot: log.mealSlot,
          quantityLabel: labelMatch ? labelMatch.label : `${newMultiplier}x serving`,
        }),
      });
      if (!res.ok) throw new Error('Unable to update portion size.');
      await loadTracker();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Portion update failed.');
    } finally {
      setConfirmingId(null);
    }
  }

  async function handleDeleteLog(log: FoodConsumptionLog) {
    if (!userId) return;
    try {
      if (log.sourceEventId) {
        const dismissed = readDismissedEventIds(userId);
        dismissed.add(log.sourceEventId);
        saveDismissedEventIds(userId, dismissed);
      }
      const res = await fetch(
        `/api/food-logs/${encodeURIComponent(log.log_id)}?userId=${encodeURIComponent(userId)}`,
        { method: 'DELETE', headers: { 'X-User-Id': userId } }
      );
      if (!res.ok) throw new Error('Unable to delete food log.');
      await loadTracker();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Delete failed.');
    }
  }

  async function handleClearAllTrackerLogs() {
    if (!userId) return;
    setIsClearingAll(true);
    setErrorMsg(null);
    try {
      // Mark all currently stored local events as dismissed so they aren't re-imported automatically
      const dismissed = readDismissedEventIds(userId);
      for (const l of logs) {
        if (l.sourceEventId) dismissed.add(l.sourceEventId);
      }
      try {
        const raw = window.localStorage.getItem(`${AMAZON_STORAGE_PREFIX}${userId}`);
        if (raw) {
          const evs = JSON.parse(raw) as AmazonCartEvent[];
          if (Array.isArray(evs)) {
            evs.forEach((e) => {
              if (e?.event_id) dismissed.add(e.event_id);
            });
          }
        }
      } catch {
        // ignore
      }
      saveDismissedEventIds(userId, dismissed);

      const res = await fetch(`/api/food-logs?userId=${encodeURIComponent(userId)}`, {
        method: 'DELETE',
        headers: { 'X-User-Id': userId },
      });
      if (!res.ok) throw new Error('Unable to clear tracker logs.');
      await loadTracker();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to clear tracker.');
    } finally {
      setIsClearingAll(false);
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

  const hasAnyTrackedFood =
    consumedLogsInWindow.length > 0 || pendingConfirmations.length > 0;

  const displayNutrients = useMemo(() => {
    if (!report) return null;
    return range === 'daily' ? report.totals : report.dailyAverage;
  }, [range, report]);

  const qualityBreakdown = report?.qualityBreakdown || null;

  const itemEvalById = useMemo(() => {
    const map = new Map<string, FoodItemQualityEval>();
    for (const ev of qualityBreakdown?.itemEvaluations || []) {
      if (ev.log_id) map.set(ev.log_id, ev);
    }
    return map;
  }, [qualityBreakdown]);

  // Big Hero Pie Chart: Good vs. Moderate vs. Bad Consumed
  const goodVsBadSlices = useMemo(() => {
    if (!qualityBreakdown) return [];
    return [
      {
        label: 'Good / Healthy Consumed',
        subLabel: 'Protein, Dietary Fiber, Good Unsaturated Fats & Micronutrients',
        value: qualityBreakdown.goodCalories,
        displayValue: `${qualityBreakdown.goodCalories} kcal`,
        color: '#15803d',
      },
      {
        label: 'Moderate / Balanced Intake',
        subLabel: 'Everyday complex carbohydrates & balanced energy',
        value: qualityBreakdown.moderateCalories,
        displayValue: `${qualityBreakdown.moderateCalories} kcal`,
        color: '#d97706',
      },
      {
        label: 'Bad / Excess Risk Consumed',
        subLabel: 'Bad Saturated Fat, Free Sugar & High Sodium load',
        value: qualityBreakdown.badCalories,
        displayValue: `${qualityBreakdown.badCalories} kcal`,
        color: '#be123c',
      },
    ];
  }, [qualityBreakdown]);

  // Fats Breakdown Pie Chart: Good Unsaturated Fat vs Bad Saturated Fat
  const fatSlices = useMemo(() => {
    if (!displayNutrients) return [];
    const totalFat = Math.max(0, Number(displayNutrients.fat_g) || 0);
    const satFat = Math.max(
      0,
      Number(displayNutrients.saturated_fat_g ?? Math.round(totalFat * 0.35 * 10) / 10)
    );
    const unsatFat = Math.max(
      0,
      Number(
        displayNutrients.unsaturated_fat_g ?? Math.round(Math.max(0, totalFat - satFat) * 10) / 10
      )
    );
    return [
      {
        label: 'Good Unsaturated Fat',
        value: unsatFat,
        displayValue: `${unsatFat}g`,
        color: '#15803d',
      },
      {
        label: 'Bad Saturated Fat',
        value: satFat,
        displayValue: `${satFat}g`,
        color: '#be123c',
      },
    ];
  }, [displayNutrients]);

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

  const platformOrMealSlices = useMemo(() => {
    if (!report) return [];
    if (report.platformBreakdown.length > 0) {
      const palette: Record<string, string> = {
        Zomato: '#e11d48',
        Swiggy: '#f97316',
        'Swiggy Instamart': '#d97706',
        Blinkit: '#eab308',
        'Amazon Fresh': '#15803d',
        Manual: '#0284c7',
      };
      return report.platformBreakdown.map((p) => ({
        label: p.platform,
        value: p.count,
        displayValue: `${p.count} ${p.count === 1 ? 'order' : 'orders'}`,
        color: palette[p.platform] || '#146c43',
      }));
    }
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

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <p className="section-kicker" style={{ marginBottom: '4px' }}>
            DAILY NUTRITION &amp; ZOMATO / SWIGGY ORDER TRACKER · {range.toUpperCase()} VIEW
          </p>
          <h1 className="page-title">Daily Food &amp; Nutrition Tracker</h1>
          <p className="page-subtitle">
            Starts clean with zero pre-filled data. Automatically tracks nutrients, good vs.
            bad fats, and shows a big Good vs. Bad consumption pie chart when you order from{' '}
            <strong>Zomato, Swiggy, Blinkit, or Amazon Fresh</strong>.
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
            <span>{showManualForm ? 'Close Order Form' : 'Log Zomato / Swiggy Order'}</span>
          </button>
          {hasAnyTrackedFood && (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => void handleClearAllTrackerLogs()}
              disabled={isClearingAll}
              title="Reset Daily Tracker back to empty state"
            >
              <Trash2 size={15} />
              <span>{isClearingAll ? 'Clearing...' : 'Reset Tracker'}</span>
            </button>
          )}
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
        <strong>Live Zomato &amp; Swiggy Tracking:</strong> Orders placed on{' '}
        <strong>Zomato, Swiggy, Swiggy Instamart, Blinkit, and Amazon Fresh</strong> are
        automatically tracked here with a complete Good vs. Bad pie chart, saturated vs.
        unsaturated fats, and 13 nutrient metrics.
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
          {report && hasAnyTrackedFood && (
            <span className="card-subtitle tabular">
              Window: {report.startDate} → {report.endDate}
            </span>
          )}
        </div>
      </div>

      {/* Manual / Zomato / Swiggy Order Form */}
      {showManualForm && (
        <form
          className="card tracker-manual-card"
          onSubmit={handleAddManualFood}
          aria-label="Log Zomato, Swiggy or custom food item"
        >
          <div className="rx-card-head">
            <div>
              <h2 className="card-title">Log Zomato / Swiggy Order or Meal</h2>
              <p className="card-subtitle">
                Pick a sample Zomato/Swiggy dish below or enter custom meal nutrition facts.
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
                {p.platform}: {p.name}
              </button>
            ))}
          </div>

          <div className="tracker-form-grid">
            <div className="field">
              <label htmlFor="m-food-name" className="field-label">
                Dish / Order Name *
              </label>
              <input
                id="m-food-name"
                type="text"
                required
                className="field-input"
                placeholder="e.g. Paneer Butter Masala & 2 Naan"
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="m-platform" className="field-label">
                Order Platform
              </label>
              <select
                id="m-platform"
                className="field-input"
                value={manualPlatform}
                onChange={(e) => setManualPlatform(e.target.value)}
              >
                <option value="Zomato">Zomato</option>
                <option value="Swiggy">Swiggy</option>
                <option value="Swiggy Instamart">Swiggy Instamart</option>
                <option value="Blinkit">Blinkit</option>
                <option value="Amazon Fresh">Amazon Fresh</option>
                <option value="Manual">Manual / Home</option>
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
                placeholder="1 order / 200g"
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
                Total Fat (g)
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
              {isSubmittingManual ? 'Tracking Order...' : 'Track Order in Daily Tracker'}
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
            <span>Loading nutrition tracker...</span>
          </div>
        </div>
      ) : !hasAnyTrackedFood ? (
        /* ==================== CLEAN INITIAL EMPTY STATE ==================== */
        <section className="tracker-empty-hero" aria-label="No food orders tracked yet">
          <div className="tracker-empty-icon-ring">
            <PieChart size={28} />
          </div>
          <h2 className="tracker-empty-title">
            No Zomato or Swiggy Orders Tracked Yet
          </h2>
          <p className="tracker-empty-desc">
            Your Daily Tracker starts completely clean. As soon as you order from{' '}
            <strong>Zomato, Swiggy, Swiggy Instamart, or Blinkit</strong>, your nutrition,
            protein, fats, and insights appear here instantly.
          </p>

          <div className="tracker-sim-box">
            <div className="tracker-sim-head">
              <span className="tracker-sim-title">
                <Sparkles size={13} style={{ verticalAlign: 'text-bottom', marginRight: 5 }} />
                Quick Test: Simulate a Live Zomato / Swiggy Order
              </span>
              <span className="card-subtitle">
                Click any dish below to see your Eathy tracker update instantly
              </span>
            </div>

            <div className="tracker-sim-grid">
              {ZOMATO_SWIGGY_DEMO_ORDERS.map((order) => (
                <button
                  key={order.name}
                  type="button"
                  className="tracker-sim-btn"
                  disabled={isSimulatingOrder !== null}
                  onClick={() => void handleQuickSimulateOrder(order)}
                >
                  <div>
                    <div className="tracker-sim-btn-name">{order.name}</div>
                    <div className="tracker-sim-btn-meta tabular">
                      {order.calories} kcal · Protein: {order.protein_g}g · {order.tag}
                    </div>
                  </div>
                  <span className={getPlatformChipClass(order.platform)}>
                    + {order.platform}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>
      ) : (
        /* ==================== EATHY STYLE TRACKER CARD VIEW ==================== */
        <>
          <div className="eathy-card" style={{ marginTop: 16 }}>
          {/* Weekday Selector Row */}
          <div className="eathy-week-row">
            {[
              { day: 'S', num: '8', active: false },
              { day: 'M', num: '9', active: false },
              { day: 'T', num: '10', active: false },
              { day: 'W', num: '11', active: true },
              { day: 'T', num: '12', active: false },
              { day: 'F', num: '13', active: false },
              { day: 'S', num: '14', active: false },
            ].map((d, i) => (
              <div key={i} className={`eathy-day-pill ${d.active ? 'is-active' : ''}`}>
                <span style={{ fontSize: '11px', textTransform: 'uppercase' }}>{d.day}</span>
                <span className="eathy-day-num">{d.num}</span>
                <div
                  className="eathy-day-indicator"
                  style={{
                    backgroundColor: d.active ? '#146c43' : 'transparent',
                  }}
                />
              </div>
            ))}
          </div>

          {/* Main Eathy Grid: Protein Gauge (Left) + Stat Tiles (Right) */}
          <div className="eathy-main-grid">
            {/* Left: Protein Card with Circular Progress */}
            <div className="eathy-protein-box">
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                <Utensils size={18} color="#146c43" />
                <span style={{ fontWeight: 800, fontSize: '16px', color: 'var(--text-primary)' }}>
                  Protein
                </span>
              </div>

              {/* Circular Gauge */}
              <div style={{ position: 'relative', width: 140, height: 140, margin: '10px auto' }}>
                <svg width="140" height="140" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#e2e8f0"
                    strokeWidth="10"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#146c43"
                    strokeWidth="10"
                    strokeDasharray="251.2"
                    strokeDashoffset={
                      251.2 *
                      (1 -
                        Math.min(
                          1,
                          displayNutrients.protein_g /
                            Math.max(1, report.requirements.protein_g)
                        ))
                    }
                    strokeLinecap="round"
                    transform="rotate(-90 50 50)"
                  />
                </svg>
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <span style={{ fontSize: '26px', fontWeight: 900, color: '#146c43' }}>
                    {Math.max(
                      0,
                      Math.round(report.requirements.protein_g - displayNutrients.protein_g)
                    )}
                  </span>
                </div>
              </div>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#146c43', marginTop: 6 }}>
                g remaining
              </span>
              <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: 2 }}>
                Consumed: {displayNutrients.protein_g}g / target {report.requirements.protein_g}g
              </span>
            </div>

            {/* Right: Stack of Stat Tiles (Calories, Carbs, Saturated Fat, Sugars, Sodium) */}
            <div className="eathy-stats-stack">
              {/* Calories */}
              <div className="eathy-stat-tile">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Flame size={16} color="#e11d48" />
                  <span style={{ fontWeight: 700, fontSize: '14px' }}>Calories</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div
                    style={{
                      fontSize: '15px',
                      fontWeight: 800,
                      color:
                        displayNutrients.calories > report.requirements.calories
                          ? '#e11d48'
                          : '#146c43',
                    }}
                  >
                    {Math.round(displayNutrients.calories)} kcal
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {displayNutrients.calories > report.requirements.calories ? 'over' : 'left'}
                  </div>
                </div>
              </div>

              {/* Carbs */}
              <div className="eathy-stat-tile">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '15px' }}>🌾</span>
                  <span style={{ fontWeight: 700, fontSize: '14px' }}>Carbs</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#146c43' }}>
                    {Math.round(displayNutrients.carbs_g)} g
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>left</div>
                </div>
              </div>

              {/* Saturated Fat */}
              <div className="eathy-stat-tile">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '15px' }}>💧</span>
                  <span style={{ fontWeight: 700, fontSize: '14px' }}>Saturated Fat</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#146c43' }}>
                    {displayNutrients.saturated_fat_g ?? 0} g
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>left</div>
                </div>
              </div>

              {/* Sugars */}
              <div className="eathy-stat-tile">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '15px' }}>🌿</span>
                  <span style={{ fontWeight: 700, fontSize: '14px' }}>Sugars</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div
                    style={{
                      fontSize: '15px',
                      fontWeight: 800,
                      color: displayNutrients.sugar_g > 35 ? '#e11d48' : '#146c43',
                    }}
                  >
                    {displayNutrients.sugar_g} g
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {displayNutrients.sugar_g > 35 ? 'over' : 'left'}
                  </div>
                </div>
              </div>

              {/* Sodium */}
              <div className="eathy-stat-tile">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '15px' }}>🧂</span>
                  <span style={{ fontWeight: 700, fontSize: '14px' }}>Sodium</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#146c43' }}>
                    {Math.round(displayNutrients.sodium_mg)} mg
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>left</div>
                </div>
              </div>
            </div>
          </div>
        </div>

          {/* ==================== ORDERED ITEMS & BREAKFAST-TO-DINNER LOG WITH ALL NUTRIENT INFO ==================== */}
          <section className="card" style={{ marginTop: 16 }} aria-labelledby="meal-timeline-title">
            <div className="rx-card-head">
              <div>
                <h2 id="meal-timeline-title" className="card-title">
                  Tracked Zomato &amp; Swiggy Orders (Breakfast to Dinner)
                </h2>
                <p className="card-subtitle">
                  Every order shows its Good vs. Bad verdict, saturated &amp; unsaturated fats,
                  macros, micronutrients, and adjustable portion size.
                </p>
              </div>
              <span className="sc-count-pill">{consumedLogsInWindow.length} tracked orders</span>
            </div>

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
                        {Math.round(slotSummary?.calories || 0)} kcal ·{' '}
                        {slotSummary?.fat_g || 0}g fat
                      </span>
                    </div>

                    {slotItems.length === 0 ? (
                      <p className="card-subtitle" style={{ marginTop: 8 }}>
                        No {slot.label.toLowerCase()} orders logged.
                      </p>
                    ) : (
                      <div className="tracker-slot-items">
                        {slotItems.map((item) => {
                          const itemEval = itemEvalById.get(item.log_id);
                          const verdictTone =
                            itemEval?.verdict === 'Good'
                              ? 'is-good'
                              : itemEval?.verdict === 'Bad'
                              ? 'is-high'
                              : 'is-moderate';

                          return (
                            <div key={item.log_id} className="tracker-food-entry">
                              <div className="tracker-food-main" style={{ width: '100%' }}>
                                <div className="tracker-food-title">
                                  <span>{item.foodName}</span>
                                  <span className={getPlatformChipClass(item.platform)}>
                                    <ShoppingBag size={11} style={{ marginRight: 3 }} />
                                    {item.platform}
                                  </span>
                                  {itemEval && (
                                    <span className={`eval-pill ${verdictTone}`}>
                                      {itemEval.verdict} ({itemEval.healthScore}/100)
                                    </span>
                                  )}
                                </div>

                                <div
                                  className="tracker-food-meta tabular"
                                  style={{
                                    justifyContent: 'space-between',
                                    flexWrap: 'wrap',
                                    marginTop: 5,
                                  }}
                                >
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                                    <Clock size={11} />
                                    {item.consumedDate} {item.consumedTime} · Good:{' '}
                                    <strong style={{ color: '#15803d' }}>
                                      {itemEval?.goodCalories ?? 0} kcal
                                    </strong>{' '}
                                    · Bad:{' '}
                                    <strong style={{ color: '#be123c' }}>
                                      {itemEval?.badCalories ?? 0} kcal
                                    </strong>
                                  </span>

                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                    <label
                                      htmlFor={`portion-${item.log_id}`}
                                      style={{ fontSize: '11px', fontWeight: 600 }}
                                    >
                                      Portion:
                                    </label>
                                    <select
                                      id={`portion-${item.log_id}`}
                                      className="field-input"
                                      style={{
                                        width: 'auto',
                                        padding: '2px 6px',
                                        fontSize: '11.5px',
                                        height: 'auto',
                                      }}
                                      disabled={confirmingId === item.log_id}
                                      value={item.portionMultiplier}
                                      onChange={(e) =>
                                        void handleUpdatePortion(
                                          item,
                                          parseFloat(e.target.value) || 1
                                        )
                                      }
                                    >
                                      {PORTION_OPTIONS.map((opt) => (
                                        <option key={opt.value} value={opt.value}>
                                          {opt.label}
                                        </option>
                                      ))}
                                    </select>
                                  </span>
                                </div>

                                {/* Complete Nutrient & Fat Chips */}
                                <div className="tracker-nutrient-chips tabular">
                                  <span className="tracker-nut-chip">
                                    <Flame size={10} style={{ marginRight: 2 }} />
                                    {Math.round(item.nutrients.calories)} kcal
                                  </span>
                                  <span className="tracker-nut-chip is-good">
                                    Protein: {item.nutrients.protein_g}g
                                  </span>
                                  <span className="tracker-nut-chip">
                                    Carbs: {item.nutrients.carbs_g}g
                                  </span>
                                  <span className="tracker-nut-chip">
                                    Total Fat: {item.nutrients.fat_g}g
                                  </span>
                                  <span className="tracker-nut-chip is-good">
                                    Good Unsat Fat: {item.nutrients.unsaturated_fat_g ?? 0}g
                                  </span>
                                  <span className="tracker-nut-chip is-bad">
                                    Bad Sat Fat: {item.nutrients.saturated_fat_g ?? 0}g
                                  </span>
                                  <span className="tracker-nut-chip is-good">
                                    Fiber: {item.nutrients.fiber_g}g
                                  </span>
                                  <span
                                    className={`tracker-nut-chip ${
                                      item.nutrients.sugar_g >= 14 ? 'is-bad' : ''
                                    }`}
                                  >
                                    Sugar: {item.nutrients.sugar_g}g
                                  </span>
                                  <span
                                    className={`tracker-nut-chip ${
                                      item.nutrients.sodium_mg >= 550 ? 'is-bad' : ''
                                    }`}
                                  >
                                    Sodium: {Math.round(item.nutrients.sodium_mg)}mg
                                  </span>
                                  <span className="tracker-nut-chip">
                                    K: {Math.round(item.nutrients.potassium_mg)}mg · Ca:{' '}
                                    {Math.round(item.nutrients.calcium_mg)}mg · Fe:{' '}
                                    {item.nutrients.iron_mg}mg · Vit C: {item.nutrients.vitamin_c_mg}mg
                                  </span>
                                </div>
                              </div>

                              <button
                                type="button"
                                className="cart-remove-btn"
                                aria-label={`Delete ${item.foodName}`}
                                onClick={() => void handleDeleteLog(item)}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
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
                <h3>Excess Consumption Alerts</h3>
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
                <h3>Remaining Daily Allowance</h3>
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
                  Complete Nutrient &amp; Fat Comparison Table
                </h2>
                <p className="card-subtitle">
                  {range === 'daily'
                    ? 'Today’s macros, good/bad fats, and micronutrients vs. your personalized health requirements.'
                    : `Daily average vs. target across ${report.startDate} to ${report.endDate}.`}
                </p>
              </div>
              <span className="sc-count-pill">{report.comparisonRows.length} tracked nutrients</span>
            </div>

            <div className="data-table-wrap limits-table-frame">
              <table className="data-table is-compact">
                <thead>
                  <tr>
                    <th>Nutrient / Fat</th>
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

          {/* Weekly / Monthly Day-by-Day Trend Table */}
          {range !== 'daily' && (
            <section className="card" style={{ marginTop: 16 }} aria-labelledby="period-series-title">
              <div className="rx-card-head">
                <div>
                  <h2 id="period-series-title" className="card-title">
                    {range === 'weekly' ? 'Weekly (7-Day)' : 'Monthly (30-Day)'} Daily Trend Report
                  </h2>
                  <p className="card-subtitle">
                    Day-by-day calorie, macro, fat, fiber, sugar, and sodium breakdown.
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
                        <th className="num">Orders</th>
                        <th className="num">Calories</th>
                        <th className="num">Protein</th>
                        <th className="num">Carbs</th>
                        <th className="num">Total Fat</th>
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
