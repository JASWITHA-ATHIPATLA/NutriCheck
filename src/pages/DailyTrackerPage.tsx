import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Flame,
  Loader2,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  Utensils,
  X,
} from 'lucide-react';
import { BreakdownPieChart } from '../components/BreakdownPieChart';
import {
  DoraemonBambooCopterCartoon,
  DoraemonChefCartoon,
  EathyBotanicalLeavesLeft,
  EathyBotanicalLeavesRight,
} from '../components/DoraemonCartoonUI';
import { useAuth } from '../context/AuthContext';
import type {
  AmazonCartEvent,
  FoodConsumptionLog,
  MealSlot,
  NutritionSummaryReport,
  TrackerRange,
} from '../types';
import {
  buildNonJsonErrorMessage,
  readJsonResponse,
} from '../utils/safeFetchJson';

const MEAL_SLOTS: { key: MealSlot; label: string; windowHint: string }[] = [
  { key: 'breakfast', label: 'Breakfast', windowHint: '4:00 AM – 10:59 AM' },
  { key: 'lunch', label: 'Lunch', windowHint: '11:00 AM – 3:59 PM' },
  { key: 'snack', label: 'Snack', windowHint: '4:00 PM – 6:59 PM' },
  { key: 'dinner', label: 'Dinner', windowHint: '7:00 PM – 3:59 AM' },
];

function getLocalDateYYYYMMDD(d: Date = new Date()): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function getLocalTimeHHMM(d: Date = new Date()): string {
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${min}`;
}

export function getMealSlotForHour(hour: number): MealSlot {
  if (hour >= 4 && hour < 11) return 'breakfast';
  if (hour >= 11 && hour < 16) return 'lunch';
  if (hour >= 16 && hour < 19) return 'snack';
  return 'dinner';
}

function resolveMealSlotFromTimeStr(timeStr?: string, fallbackSlot?: MealSlot): MealSlot {
  if (timeStr && /^\d{2}:\d{2}/.test(timeStr)) {
    const hr = parseInt(timeStr.slice(0, 2), 10);
    if (Number.isFinite(hr)) {
      return getMealSlotForHour(hr);
    }
  }
  if (fallbackSlot && ['breakfast', 'lunch', 'snack', 'dinner'].includes(fallbackSlot)) {
    return fallbackSlot;
  }
  return getMealSlotForHour(new Date().getHours());
}

function formatTime12Hour(time24?: string): string {
  if (!time24 || !/^\d{1,2}:\d{2}/.test(time24)) return 'Just now';
  const [hStr, mStr] = time24.split(':');
  const hour24 = parseInt(hStr, 10);
  if (!Number.isFinite(hour24)) return time24;
  const period = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour12}:${mStr.slice(0, 2)} ${period}`;
}

function getTimeOfDayGreeting(): string {
  const hr = new Date().getHours();
  if (hr >= 4 && hr < 12) return 'Good morning!';
  if (hr >= 12 && hr < 17) return 'Good afternoon!';
  return 'Good evening!';
}

function getDishFallbackImage(title = ''): string {
  const lower = String(title || '').toLowerCase();
  if (/\b(idli|vada|sambar|upma|pongal|dhokla)\b/.test(lower)) {
    return 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=300&q=80';
  }
  if (/\b(dosa|masala dosa|uttapam)\b/.test(lower)) {
    return 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=300&q=80';
  }
  if (/\b(biryani|pulao|pulav|fried rice|jeera rice|rice)\b/.test(lower)) {
    return 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=300&q=80';
  }
  if (/\b(paneer|butter chicken|curry|dal|tadka|makhani|rajma|chole|thali|roti|naan|paratha)\b/.test(lower)) {
    return 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=300&q=80';
  }
  if (/\b(pizza|margherita|pepperoni)\b/.test(lower)) {
    return 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=300&q=80';
  }
  if (/\b(burger|fries|sandwich|wrap|roll|shawarma)\b/.test(lower)) {
    return 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=300&q=80';
  }
  if (/\b(salad|quinoa|avocado|bowl|sprouts)\b/.test(lower)) {
    return 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=300&q=80';
  }
  if (/\b(walnut|almond|cashew|pistachio|nuts|dry fruit|oats|muesli)\b/.test(lower)) {
    return 'https://images.unsplash.com/photo-1508061253366-f7da158b6d46?auto=format&fit=crop&w=300&q=80';
  }
  if (/\b(ice cream|kulfi|gelato|brownie|cake|dessert|chocolate|sweet)\b/.test(lower)) {
    return 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=300&q=80';
  }
  if (/\b(noodles|maggi|ramen|momos|manchurian)\b/.test(lower)) {
    return 'https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?auto=format&fit=crop&w=300&q=80';
  }
  return 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=300&q=80';
}

const ZOMATO_SWIGGY_DEMO_ORDERS = [
  {
    name: 'Idli & Sambar',
    mealSlot: 'breakfast' as MealSlot,
    platform: 'Zomato',
    imageUrl: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=300&q=80',
    calories: 320,
    protein_g: 10.5,
    carbs_g: 54,
    fat_g: 4.2,
    saturated_fat_g: 0.8,
    fiber_g: 5.2,
    sugar_g: 2.5,
    sodium_mg: 360,
    potassium_mg: 320,
    calcium_mg: 68,
    iron_mg: 2.2,
    vitamin_c_mg: 12,
  },
  {
    name: 'Veg Biryani',
    mealSlot: 'lunch' as MealSlot,
    platform: 'Swiggy',
    imageUrl: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=300&q=80',
    calories: 520,
    protein_g: 14,
    carbs_g: 68,
    fat_g: 18,
    saturated_fat_g: 4.5,
    fiber_g: 4.8,
    sugar_g: 3.5,
    sodium_mg: 620,
    potassium_mg: 410,
    calcium_mg: 85,
    iron_mg: 2.8,
    vitamin_c_mg: 14,
  },
  {
    name: 'Grilled Chicken, Quinoa & Avocado Bowl',
    mealSlot: 'lunch' as MealSlot,
    platform: 'Zomato',
    imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=300&q=80',
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
    platform: 'Swiggy',
    imageUrl: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=300&q=80',
    calories: 610,
    protein_g: 21,
    carbs_g: 58,
    fat_g: 32,
    saturated_fat_g: 14.5,
    fiber_g: 3.8,
    sugar_g: 7.5,
    sodium_mg: 890,
    potassium_mg: 340,
    calcium_mg: 260,
    iron_mg: 2.4,
    vitamin_c_mg: 8,
  },
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

export function DailyTrackerPage() {
  const { currentUser } = useAuth();
  const userId = currentUser?.id || '';

  const [range] = useState<TrackerRange>('daily');
  const [selectedDate, setSelectedDate] = useState(() => getLocalDateYYYYMMDD());
  const [logs, setLogs] = useState<FoodConsumptionLog[]>([]);
  const [report, setReport] = useState<NutritionSummaryReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSimulatingOrder, setIsSimulatingOrder] = useState<string | null>(null);
  const [isClearingAll, setIsClearingAll] = useState(false);

  // Manual food entry panel state
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualPlatform, setManualPlatform] = useState('Zomato');
  const [manualSlot, setManualSlot] = useState<MealSlot>(() =>
    getMealSlotForHour(new Date().getHours())
  );
  const [manualDate, setManualDate] = useState(() => getLocalDateYYYYMMDD());
  const [manualTime, setManualTime] = useState(() => getLocalTimeHHMM());
  const [manualCalories, setManualCalories] = useState('');
  const [manualProtein, setManualProtein] = useState('');
  const [manualCarbs, setManualCarbs] = useState('');
  const [manualFat, setManualFat] = useState('');
  const [manualFiber, setManualFiber] = useState('');
  const [manualSugar, setManualSugar] = useState('');
  const [manualSodium, setManualSodium] = useState('');
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);

  const syncingEventsRef = useRef(false);
  const hasLoadedOnceRef = useRef(false);
  const dateInputRef = useRef<HTMLInputElement | null>(null);

  const [liveStoreEvents, setLiveStoreEvents] = useState<AmazonCartEvent[]>([]);

  const refreshLiveStoreEventsFromStorage = useCallback(() => {
    if (!userId || typeof window === 'undefined') {
      setLiveStoreEvents([]);
      return;
    }
    try {
      const raw = window.localStorage.getItem(`${AMAZON_STORAGE_PREFIX}${userId}`);
      if (!raw) {
        setLiveStoreEvents([]);
        return;
      }
      const parsed = JSON.parse(raw) as AmazonCartEvent[];
      if (Array.isArray(parsed)) {
        setLiveStoreEvents(parsed);
      }
    } catch {
      // ignore parse errors
    }
  }, [userId]);

  useEffect(() => {
    refreshLiveStoreEventsFromStorage();
  }, [refreshLiveStoreEventsFromStorage]);

  // Sync any cart events stored in Store Connect localStorage into FoodLogs using local time
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

        const unsyncedOrders = storedEvents.filter((ev) => {
          if (!ev?.event_id || dismissedIds.has(ev.event_id) || loggedSourceIds.has(ev.event_id)) {
            return false;
          }
          return Boolean(ev.product_title);
        });

        if (unsyncedOrders.length === 0) return false;

        syncingEventsRef.current = true;
        let addedAny = false;
        for (const ev of unsyncedOrders) {
          const n = ev.analysis?.nutrition || {
            calories: 280,
            protein: 9.5,
            fat: 10.5,
            sugars: 3.5,
            sodium_mg: 390,
          };
          const evAny = ev as AmazonCartEvent & {
            local_date?: string;
            local_time?: string;
            local_hour?: number;
            meal_slot?: MealSlot;
          };
          const evDate = ev.timestamp ? new Date(ev.timestamp) : new Date();
          const validDate = Number.isNaN(evDate.getTime()) ? new Date() : evDate;
          const consumedDate =
            evAny.local_date && /^\d{4}-\d{2}-\d{2}$/.test(evAny.local_date)
              ? evAny.local_date
              : getLocalDateYYYYMMDD(validDate);
          const consumedTime =
            evAny.local_time && /^\d{2}:\d{2}$/.test(evAny.local_time)
              ? evAny.local_time
              : getLocalTimeHHMM(validDate);
          const hour =
            typeof evAny.local_hour === 'number'
              ? evAny.local_hour
              : parseInt(consumedTime.slice(0, 2), 10) || validDate.getHours();
          const mealSlot =
            evAny.meal_slot && ['breakfast', 'lunch', 'snack', 'dinner'].includes(evAny.meal_slot)
              ? evAny.meal_slot
              : getMealSlotForHour(hour);

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
              local_date: consumedDate,
              local_time: consumedTime,
              local_hour: hour,
              tz_offset_min: validDate.getTimezoneOffset(),
              consumptionStatus: 'consumed',
              portionMultiplier: 1,
              quantityLabel: '1 order serving',
              calories: n.calories,
              protein_g: n.protein,
              fat_g: n.fat,
              sugar_g: n.sugars,
              sodium_mg: n.sodium_mg,
              ingredientsText: ev.ingredients_text || '',
              imageUrl: ev.image_url || getDishFallbackImage(ev.product_title),
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

  const loadTracker = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!userId) return;
      refreshLiveStoreEventsFromStorage();
      const isSilent = Boolean(options?.silent && hasLoadedOnceRef.current);
      if (!isSilent) {
        setIsLoading(true);
        setErrorMsg(null);
      }
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
        let fetchedLogs = Array.isArray(data.logs) ? data.logs : [];
        let fetchedReport = data.report || null;

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
            fetchedLogs = Array.isArray(data2.logs) ? data2.logs : fetchedLogs;
            fetchedReport = data2.report || fetchedReport;
          }
        }

        hasLoadedOnceRef.current = true;
        setLogs((prev) => {
          const prevSig = prev
            .map((l) => `${l.log_id}:${l.mealSlot}:${l.consumedTime}:${l.nutrients?.calories}:${l.imageUrl || ''}`)
            .join('|');
          const nextSig = fetchedLogs
            .map((l) => `${l.log_id}:${l.mealSlot}:${l.consumedTime}:${l.nutrients?.calories}:${l.imageUrl || ''}`)
            .join('|');
          return prevSig === nextSig ? prev : fetchedLogs;
        });
        setReport(fetchedReport);
      } catch (err) {
        if (!isSilent) {
          setErrorMsg(err instanceof Error ? err.message : 'Unable to load food logs.');
        }
      } finally {
        if (!isSilent) {
          setIsLoading(false);
        }
      }
    },
    [range, refreshLiveStoreEventsFromStorage, selectedDate, syncStoreConnectOrdersToTracker, userId]
  );

  useEffect(() => {
    void loadTracker();
  }, [loadTracker]);

  // Instant silent auto-sync when Add to Cart is clicked (via Chrome Extension, Store Connect, or background poll)
  useEffect(() => {
    function handleCartUpdated() {
      refreshLiveStoreEventsFromStorage();
      const todayLocal = getLocalDateYYYYMMDD();
      if (selectedDate !== todayLocal) {
        setSelectedDate(todayLocal);
      } else {
        void loadTracker({ silent: true });
      }
    }

    function handleExtensionMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      const msg = event.data;
      if (msg?.type === 'NUTRICHECK_AMAZON_SYNC' && Array.isArray(msg.events)) {
        handleCartUpdated();
      }
    }

    function handleStorageEvent(event: StorageEvent) {
      if (event.key && event.key.startsWith(AMAZON_STORAGE_PREFIX)) {
        handleCartUpdated();
      }
    }

    function handleTabVisibleOrFocused() {
      if (userId) {
        window.postMessage(
          { type: 'NUTRICHECK_REQUEST_SYNC', userId },
          window.location.origin
        );
      }
      refreshLiveStoreEventsFromStorage();
      void loadTracker({ silent: true });
    }

    window.addEventListener('nutricheck:cart-updated', handleCartUpdated);
    window.addEventListener('message', handleExtensionMessage);
    window.addEventListener('storage', handleStorageEvent);
    window.addEventListener('focus', handleTabVisibleOrFocused);
    document.addEventListener('visibilitychange', handleTabVisibleOrFocused);

    // Quiet background sync every 3.5s (silent: true => never triggers loading spinner or page flicker)
    const silentTimer = window.setInterval(() => {
      if (userId) {
        window.postMessage(
          { type: 'NUTRICHECK_REQUEST_SYNC', userId },
          window.location.origin
        );
      }
      void loadTracker({ silent: true });
    }, 3500);

    return () => {
      window.removeEventListener('nutricheck:cart-updated', handleCartUpdated);
      window.removeEventListener('message', handleExtensionMessage);
      window.removeEventListener('storage', handleStorageEvent);
      window.removeEventListener('focus', handleTabVisibleOrFocused);
      document.removeEventListener('visibilitychange', handleTabVisibleOrFocused);
      window.clearInterval(silentTimer);
    };
  }, [loadTracker, refreshLiveStoreEventsFromStorage, selectedDate, userId]);

  function applyPreset(p: (typeof ZOMATO_SWIGGY_DEMO_ORDERS)[number]) {
    const now = new Date();
    setManualName(p.name);
    setManualPlatform(p.platform);
    setManualDate(getLocalDateYYYYMMDD(now));
    setManualTime(getLocalTimeHHMM(now));
    setManualSlot(getMealSlotForHour(now.getHours()));
    setManualCalories(String(p.calories));
    setManualProtein(String(p.protein_g));
    setManualCarbs(String(p.carbs_g));
    setManualFat(String(p.fat_g));
    setManualFiber(String(p.fiber_g));
    setManualSugar(String(p.sugar_g));
    setManualSodium(String(p.sodium_mg));
  }

  async function handleQuickSimulateOrder(p: (typeof ZOMATO_SWIGGY_DEMO_ORDERS)[number]) {
    if (!userId) return;
    setIsSimulatingOrder(p.name);
    setErrorMsg(null);
    try {
      const now = new Date();
      const nowDate = getLocalDateYYYYMMDD(now);
      const nowTime = getLocalTimeHHMM(now);
      const currentHour = now.getHours();
      const currentMealSlot = getMealSlotForHour(currentHour);

      const res = await fetch('/api/food-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': userId },
        body: JSON.stringify({
          userId,
          foodName: p.name,
          platform: p.platform,
          mealSlot: currentMealSlot,
          consumedDate: selectedDate || nowDate,
          consumedTime: nowTime,
          local_date: selectedDate || nowDate,
          local_time: nowTime,
          local_hour: currentHour,
          tz_offset_min: now.getTimezoneOffset(),
          consumptionStatus: 'consumed',
          portionMultiplier: 1,
          quantityLabel: '1 order serving',
          imageUrl: p.imageUrl,
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
      await loadTracker({ silent: true });
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

    try {
      const timeStr = manualTime || getLocalTimeHHMM();
      const computedSlot = resolveMealSlotFromTimeStr(timeStr, manualSlot);
      const res = await fetch('/api/food-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': userId },
        body: JSON.stringify({
          userId,
          foodName: manualName.trim(),
          platform: manualPlatform,
          mealSlot: computedSlot,
          consumedDate: manualDate || selectedDate,
          consumedTime: timeStr,
          local_date: manualDate || selectedDate,
          local_time: timeStr,
          consumptionStatus: 'consumed',
          portionMultiplier: 1,
          quantityLabel: '1 serving',
          imageUrl: getDishFallbackImage(manualName.trim()),
          calories: parseFloat(manualCalories) || 0,
          protein_g: parseFloat(manualProtein) || 0,
          carbs_g: manualCarbs.trim() === '' ? undefined : parseFloat(manualCarbs),
          fat_g: parseFloat(manualFat) || 0,
          fiber_g: manualFiber.trim() === '' ? undefined : parseFloat(manualFiber),
          sugar_g: parseFloat(manualSugar) || 0,
          sodium_mg: parseFloat(manualSodium) || 0,
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
      await loadTracker({ silent: true });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to save food log.');
    } finally {
      setIsSubmittingManual(false);
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
      refreshLiveStoreEventsFromStorage();
      if (!log.log_id.startsWith('live_')) {
        const res = await fetch(
          `/api/food-logs/${encodeURIComponent(log.log_id)}?userId=${encodeURIComponent(userId)}`,
          { method: 'DELETE', headers: { 'X-User-Id': userId } }
        );
        if (!res.ok) throw new Error('Unable to delete food log.');
      }
      await loadTracker({ silent: true });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Delete failed.');
    }
  }

  async function handleClearAllTrackerLogs() {
    if (!userId) return;
    setIsClearingAll(true);
    setErrorMsg(null);
    try {
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
      await loadTracker({ silent: true });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to clear tracker.');
    } finally {
      setIsClearingAll(false);
    }
  }

  const consumedLogsInWindow = useMemo(() => {
    if (!report) return [];
    const baseLogs = logs.filter(
      (l) =>
        l.consumptionStatus === 'consumed' &&
        l.consumedDate >= report.startDate &&
        l.consumedDate <= report.endDate
    );

    const existingEventIds = new Set(
      logs.map((l) => l.sourceEventId).filter((id): id is string => Boolean(id))
    );
    const dismissed = readDismissedEventIds(userId);

    const liveFallbackLogs: FoodConsumptionLog[] = [];
    for (const ev of liveStoreEvents) {
      if (!ev || !ev.event_id) continue;
      if (existingEventIds.has(ev.event_id) || dismissed.has(ev.event_id)) continue;

      const evDate = ev.timestamp ? new Date(ev.timestamp) : new Date();
      const validDate = Number.isNaN(evDate.getTime()) ? new Date() : evDate;
      const consumedDate = getLocalDateYYYYMMDD(validDate);
      if (consumedDate < report.startDate || consumedDate > report.endDate) continue;

      const consumedTime = getLocalTimeHHMM(validDate);
      const mealSlot = getMealSlotForHour(validDate.getHours());
      const n = ev.analysis?.nutrition;
      const computedNutrients = {
        calories: Number(n?.calories) || 360,
        protein_g: Number(n?.protein) || 12,
        carbs_g: 44,
        fat_g: Number(n?.fat) || 14,
        saturated_fat_g: 4.5,
        sugar_g: Number(n?.sugars) || 6,
        fiber_g: 4,
        sodium_mg: Number(n?.sodium_mg) || 540,
        potassium_mg: 320,
        calcium_mg: 75,
        iron_mg: 2.1,
        vitamin_c_mg: 9,
      };

      liveFallbackLogs.push({
        log_id: `live_${ev.event_id}`,
        user_id: userId || 'live',
        sourceEventId: ev.event_id,
        foodName: ev.product_title || 'Zomato Dish',
        platform: ev.source_platform || 'Zomato',
        isInstantConsumable: true,
        mealSlot,
        consumedDate,
        consumedTime,
        consumptionStatus: 'consumed',
        portionMultiplier: 1,
        quantityLabel: '1 order serving',
        baseNutrients: computedNutrients,
        nutrients: computedNutrients,
        imageUrl: ev.image_url || getDishFallbackImage(ev.product_title || 'Food'),
        createdAtIso: ev.timestamp || new Date().toISOString(),
      });
    }

    return [...liveFallbackLogs, ...baseLogs];
  }, [logs, report, liveStoreEvents, userId]);

  const hasAnyTrackedFood = consumedLogsInWindow.length > 0;

  const displayNutrients = useMemo(() => {
    if (!report) return null;
    const liveOnly = consumedLogsInWindow.filter((l) => l.log_id.startsWith('live_'));
    if (liveOnly.length === 0) return report.totals;
    const copy = { ...report.totals };
    for (const item of liveOnly) {
      copy.calories += item.nutrients.calories || 0;
      copy.protein_g += item.nutrients.protein_g || 0;
      copy.carbs_g += item.nutrients.carbs_g || 0;
      copy.fat_g += item.nutrients.fat_g || 0;
      copy.saturated_fat_g = (copy.saturated_fat_g || 0) + (item.nutrients.saturated_fat_g || 0);
      copy.sugar_g += item.nutrients.sugar_g || 0;
      copy.fiber_g += item.nutrients.fiber_g || 0;
      copy.sodium_mg += item.nutrients.sodium_mg || 0;
    }
    return copy;
  }, [report, consumedLogsInWindow]);

  // Dynamic 7-day week strip around selectedDate (Sun .. Sat)
  const weekStripDays = useMemo(() => {
    const letters = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    const base = new Date(`${selectedDate}T12:00:00`);
    const validBase = Number.isNaN(base.getTime()) ? new Date() : base;
    const dayOfWeek = validBase.getDay(); // 0 = Sun
    const sunday = new Date(validBase);
    sunday.setDate(validBase.getDate() - dayOfWeek);

    const todayStr = getLocalDateYYYYMMDD();
    const datesWithOrders = new Set(
      logs.filter((l) => l.consumptionStatus === 'consumed').map((l) => l.consumedDate)
    );

    return Array.from({ length: 7 }, (_, idx) => {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + idx);
      const iso = getLocalDateYYYYMMDD(d);
      return {
        letter: letters[idx],
        dayNum: d.getDate(),
        iso,
        isActive: iso === selectedDate,
        isFuture: iso > todayStr,
        hasOrders: datesWithOrders.has(iso),
      };
    });
  }, [logs, selectedDate]);

  const formattedSelectedDate = useMemo(() => {
    const d = new Date(`${selectedDate}T12:00:00`);
    if (Number.isNaN(d.getTime())) return selectedDate;
    return d.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }, [selectedDate]);

  // 3 Nutrition Insights (Protein, Fiber, Sodium) matching reference image
  const nutritionInsights = useMemo(() => {
    if (!displayNutrients || !report) return [];
    const req = report.requirements;

    const proteinRatio = displayNutrients.protein_g / Math.max(1, req.protein_g);
    const proteinStatus =
      proteinRatio >= 0.7 ? { text: 'Good', color: '#15803d', tone: 'good' as const } : { text: 'Low', color: '#b45309', tone: 'warn' as const };

    const fiberRatio = displayNutrients.fiber_g / Math.max(1, req.fiber_g);
    const fiberStatus =
      fiberRatio >= 0.65 ? { text: 'Good', color: '#15803d', tone: 'good' as const } : { text: 'Low', color: '#b45309', tone: 'warn' as const };

    const sodiumRatio = displayNutrients.sodium_mg / Math.max(1, req.sodium_mg);
    const sodiumStatus =
      sodiumRatio > 0.85
        ? { text: 'High', color: '#e11d48', tone: 'high' as const }
        : sodiumRatio > 0.55
        ? { text: 'Moderate', color: '#b45309', tone: 'warn' as const }
        : { text: 'Good', color: '#15803d', tone: 'good' as const };

    return [
      { key: 'protein', label: 'Protein', ...proteinStatus },
      { key: 'fiber', label: 'Fiber', ...fiberStatus },
      { key: 'sodium', label: 'Sodium', ...sodiumStatus },
    ];
  }, [displayNutrients, report]);

  // Actionable personalized suggestion matching reference image
  const personalizedSuggestion = useMemo(() => {
    if (!displayNutrients || !report) {
      return 'Try adding more fiber-rich foods to your next meal.';
    }
    const req = report.requirements;
    if (displayNutrients.fiber_g < req.fiber_g * 0.65) {
      return 'Try adding more fiber-rich foods to your next meal.';
    }
    if (displayNutrients.sodium_mg > req.sodium_mg * 0.85) {
      return 'Your sodium intake is high today — pair your next meal with fresh fruit, curd, or unsalted nuts.';
    }
    if (displayNutrients.protein_g < req.protein_g * 0.7) {
      return `You have ${Math.max(0, Math.round(req.protein_g - displayNutrients.protein_g))}g protein remaining — consider adding dal, paneer, sprouts, or grilled protein.`;
    }
    if (displayNutrients.sugar_g > req.sugar_g) {
      return 'Sugars are slightly over target today — choose unsweetened beverages or whole nuts for your next bite.';
    }
    return 'Great balance today! Keep pairing whole grains, lean protein, and fresh greens in your upcoming meals.';
  }, [displayNutrients, report]);

  // Group consumed logs by time-of-day meal slot (Breakfast, Lunch, Snack, Dinner)
  const groupedMealSlots = useMemo(() => {
    return MEAL_SLOTS.map((slot) => {
      const items = consumedLogsInWindow.filter(
        (item) => resolveMealSlotFromTimeStr(item.consumedTime, item.mealSlot) === slot.key
      );
      const platforms = Array.from(
        new Set(items.map((i) => i.platform).filter(Boolean))
      ).join(' · ');
      return {
        ...slot,
        items,
        platforms: platforms || 'Zomato / Swiggy',
      };
    }).filter((group) => group.items.length > 0);
  }, [consumedLogsInWindow]);

  const qualityBreakdown = report?.qualityBreakdown || null;

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

  // Macro Calorie Share Pie Chart
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

  // Meal Slot / Platform Share Pie Chart
  const mealShareSlices = useMemo(() => {
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

  return (
    <div className="page-shell">
      {/* Greeting Header with Real Doraemon Cartoon Illustration */}
      <div className="doraemon-greeting-banner">
        <div className="doraemon-greeting-left">
          <div className="doraemon-mascot-frame">
            <DoraemonChefCartoon size={80} />
          </div>
          <div>
            <span className="doraemon-speech-tag">
              <Sparkles size={12} />
              <span>DORAEMON SMART DAILY TRACKER</span>
            </span>
            <h1
              style={{
                fontSize: '26px',
                fontWeight: 900,
                color: '#0f172a',
                lineHeight: 1.2,
                margin: 0,
              }}
            >
              {getTimeOfDayGreeting()}
            </h1>
            <p
              style={{
                fontSize: '14px',
                color: '#475569',
                margin: '4px 0 0',
              }}
            >
              Here&apos;s your nutrition summary for today. Orders added to cart come here automatically &amp; categorize by time of day.
            </p>
          </div>
        </div>

        <div className="tracker-header-actions">
          <button
            type="button"
            className="btn-primary"
            style={{ flex: 'none' }}
            onClick={() => {
              const now = new Date();
              setManualDate(selectedDate);
              setManualTime(getLocalTimeHHMM(now));
              setManualSlot(getMealSlotForHour(now.getHours()));
              setShowManualForm((v) => !v);
            }}
          >
            <Plus size={15} />
            <span>{showManualForm ? 'Close Form' : 'Log Order'}</span>
          </button>

          {hasAnyTrackedFood && (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => void handleClearAllTrackerLogs()}
              disabled={isClearingAll}
              title="Reset Daily Tracker"
            >
              <Trash2 size={15} />
              <span>{isClearingAll ? 'Clearing...' : 'Reset'}</span>
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

      {errorMsg && (
        <div className="error-banner" role="alert" style={{ marginBottom: 16 }}>
          <AlertTriangle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Manual / Quick Order Entry Modal Card */}
      {showManualForm && (
        <form
          className="card tracker-manual-card"
          style={{ marginBottom: 20 }}
          onSubmit={handleAddManualFood}
          aria-label="Log Zomato, Swiggy or custom food item"
        >
          <div className="rx-card-head">
            <div>
              <h2 className="card-title">Log Food Order</h2>
              <p className="card-subtitle">
                Pick a quick preset or enter a dish—automatically categorized into Breakfast, Lunch, Snack, or Dinner by time.
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
            {ZOMATO_SWIGGY_DEMO_ORDERS.map((p) => (
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
                Dish Name *
              </label>
              <input
                id="m-food-name"
                type="text"
                required
                className="field-input"
                placeholder="e.g. Veg Biryani"
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
                <option value="Zomato">Zomato</option>
                <option value="Swiggy">Swiggy</option>
                <option value="Swiggy Instamart">Swiggy Instamart</option>
                <option value="Blinkit">Blinkit</option>
                <option value="Amazon Fresh">Amazon Fresh</option>
              </select>
            </div>

            <div className="field">
              <label htmlFor="m-date" className="field-label">
                Date &amp; Order Time
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
                  aria-label="Order Time"
                  type="time"
                  className="field-input"
                  style={{ width: 118 }}
                  value={manualTime}
                  onChange={(e) => {
                    setManualTime(e.target.value);
                    setManualSlot(resolveMealSlotFromTimeStr(e.target.value, manualSlot));
                  }}
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor="m-slot" className="field-label">
                Auto Meal Category
              </label>
              <select
                id="m-slot"
                className="field-input"
                value={manualSlot}
                onChange={(e) => setManualSlot(e.target.value as MealSlot)}
              >
                {MEAL_SLOTS.map((ms) => (
                  <option key={ms.key} value={ms.key}>
                    {ms.label} ({ms.windowHint})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="tracker-nut-grid">
            <div className="field">
              <label htmlFor="m-cal" className="field-label">
                Calories (kcal) *
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
              {isSubmittingManual ? 'Saving...' : 'Save Order'}
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
        <div className="card">
          <div className="rx-loading-state">
            <Loader2 size={18} className="spin-icon" />
            <span>Loading nutrition tracker...</span>
          </div>
        </div>
      ) : (
        <>
          {/* ==================== 1. TODAY'S OVERVIEW CARD ==================== */}
          <section className="todays-overview-card" aria-label="Today's overview">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                flexWrap: 'wrap',
              }}
            >
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Today&apos;s overview
              </h2>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <Calendar size={15} color="#64748b" />
                <input
                  ref={dateInputRef}
                  type="date"
                  aria-label="Select date"
                  className="field-input"
                  style={{ width: 'auto', padding: '5px 10px', fontSize: '13px' }}
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>
            </div>

            <div className="todays-overview-kcal tabular">
              {Math.round(displayNutrients.calories).toLocaleString()} kcal
            </div>
            <div className="todays-overview-target tabular">
              of {Math.round(report.requirements.calories).toLocaleString()} kcal daily target
            </div>

            <div className="todays-overview-bar-track">
              <div
                className="todays-overview-bar-fill"
                style={{
                  width: `${Math.min(
                    100,
                    Math.round(
                      (displayNutrients.calories / Math.max(1, report.requirements.calories)) * 100
                    )
                  )}%`,
                }}
              />
            </div>

            <div className="todays-overview-macros tabular">
              <div className="todays-overview-macro-item">
                <strong>{Math.round(displayNutrients.protein_g)}g</strong>
                <span>Protein</span>
              </div>
              <div className="todays-overview-macro-item">
                <strong>{Math.round(displayNutrients.carbs_g)}g</strong>
                <span>Carbs</span>
              </div>
              <div className="todays-overview-macro-item">
                <strong>{Math.round(displayNutrients.fat_g)}g</strong>
                <span>Fat</span>
              </div>
            </div>
          </section>

          {/* ==================== 2. EATHY BOTANICAL LEAF CARD + DORAEMON CARTOON ==================== */}
          <section
            className="eathy-botanical-stage"
            aria-label="Eathy daily macro and nutrient balance card"
          >
            {/* Left Botanical Green Leaf Branches */}
            <EathyBotanicalLeavesLeft className="eathy-leaf-left" />

            {/* Right Botanical Green Leaf Branches */}
            <EathyBotanicalLeavesRight className="eathy-leaf-right" />

            {/* Cute Flying Doraemon Cartoon Mascot with Bamboo-Copter */}
            <div className="eathy-doraemon-badge" title="Doraemon cheering on your healthy meals!">
              <DoraemonBambooCopterCartoon size={88} />
            </div>

            <div className="eathy-card">
              {/* Top Brand & Date Row */}
              <div className="eathy-brand-row">
                <div className="eathy-brand-left">
                  <div className="eathy-brand-bars">
                    <span
                      className="eathy-brand-bar"
                      style={{ width: 26, background: 'linear-gradient(90deg, #166534, #65a30d)' }}
                    />
                    <span
                      className="eathy-brand-bar"
                      style={{ width: 20, background: 'linear-gradient(90deg, #65a30d, #eab308)' }}
                    />
                    <span
                      className="eathy-brand-bar"
                      style={{ width: 24, background: 'linear-gradient(90deg, #f59e0b, #ea580c)' }}
                    />
                  </div>
                  <span className="eathy-brand-title">Eathy</span>
                </div>

                <button
                  type="button"
                  className="eathy-date-label"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  onClick={() => dateInputRef.current?.showPicker?.()}
                >
                  <span>{formattedSelectedDate}</span>
                  <ChevronDown size={18} color="#173f23" />
                </button>
              </div>

              {/* 7-Day Weekday Strip (S M T W T F S) */}
              <div className="eathy-week-row">
                {weekStripDays.map((d) => (
                  <div key={d.iso} className="eathy-day-col">
                    <span className="eathy-day-letter">{d.letter}</span>
                    <button
                      type="button"
                      onClick={() => setSelectedDate(d.iso)}
                      className={`eathy-day-pill ${d.isActive ? 'is-active' : ''} ${
                        d.isFuture && !d.isActive ? 'is-future' : ''
                      }`}
                    >
                      <span className="eathy-day-num">{d.dayNum}</span>
                      <span
                        className="eathy-day-indicator"
                        style={{
                          backgroundColor: d.isActive
                            ? '#ea580c'
                            : d.hasOrders
                            ? '#16a34a'
                            : 'transparent',
                        }}
                      />
                    </button>
                  </div>
                ))}
              </div>

              {/* Main 2-Column Eathy Grid */}
              <div className="eathy-main-grid">
                {/* Left Column: Protein Gauge Card + Sugars Tile */}
                <div className="eathy-left-stack">
                  <div className="eathy-protein-box">
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        alignSelf: 'flex-start',
                        marginBottom: 8,
                      }}
                    >
                      <Utensils size={17} color="#173f23" />
                      <span style={{ fontWeight: 800, fontSize: '17px', color: '#173f23' }}>
                        Protein
                      </span>
                    </div>

                    {/* Circular Arc Gauge */}
                    <div
                      style={{
                        position: 'relative',
                        width: 148,
                        height: 148,
                        margin: '4px auto',
                      }}
                    >
                      <svg width="148" height="148" viewBox="0 0 100 100">
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          fill="none"
                          stroke="#e6eae3"
                          strokeWidth="9.5"
                          strokeDasharray="195 251.2"
                          strokeLinecap="round"
                          transform="rotate(130 50 50)"
                        />
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          fill="none"
                          stroke="#12b92c"
                          strokeWidth="9.5"
                          strokeDasharray={`${
                            195 *
                            Math.min(
                              1,
                              displayNutrients.protein_g /
                                Math.max(1, report.requirements.protein_g)
                            )
                          } 251.2`}
                          strokeLinecap="round"
                          transform="rotate(130 50 50)"
                        />
                      </svg>
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <span
                          className="tabular"
                          style={{ fontSize: '30px', fontWeight: 900, color: '#12b92c' }}
                        >
                          {Math.max(
                            0,
                            Math.round(report.requirements.protein_g - displayNutrients.protein_g)
                          )}
                        </span>
                      </div>
                    </div>

                    <span style={{ fontSize: '14px', fontWeight: 800, color: '#12b92c' }}>
                      g remaining
                    </span>
                  </div>

                  {/* Sugars Tile under Protein (exact match to Eathy card) */}
                  <div className="eathy-stat-tile">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 6,
                          background: '#eef4ec',
                          color: '#173f23',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          fontWeight: 900,
                        }}
                      >
                        ✦
                      </span>
                      <span style={{ fontWeight: 600, fontSize: '14.5px', color: '#173f23' }}>
                        Sugars
                      </span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      {displayNutrients.sugar_g > report.requirements.sugar_g ? (
                        <>
                          <div
                            className="tabular"
                            style={{ fontSize: '17px', fontWeight: 800, color: '#ea4328' }}
                          >
                            {Math.round(displayNutrients.sugar_g - report.requirements.sugar_g)} g
                          </div>
                          <div style={{ fontSize: '12px', fontWeight: 700, color: '#ea4328' }}>
                            over
                          </div>
                        </>
                      ) : (
                        <>
                          <div
                            className="tabular"
                            style={{ fontSize: '17px', fontWeight: 800, color: '#12b92c' }}
                          >
                            {Math.max(
                              0,
                              Math.round(report.requirements.sugar_g - displayNutrients.sugar_g)
                            )}{' '}
                            g
                          </div>
                          <div style={{ fontSize: '12px', fontWeight: 700, color: '#12b92c' }}>
                            left
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Column: Calories, Carbs, Saturated Fat, Sodium */}
                <div className="eathy-stats-stack">
                  {/* Calories */}
                  <div className="eathy-stat-tile">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <Flame size={18} color="#173f23" fill="#173f23" />
                      <span style={{ fontWeight: 600, fontSize: '14.5px', color: '#173f23' }}>
                        Calories
                      </span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      {displayNutrients.calories > report.requirements.calories ? (
                        <>
                          <div
                            className="tabular"
                            style={{ fontSize: '17px', fontWeight: 800, color: '#ea4328' }}
                          >
                            {Math.round(
                              displayNutrients.calories - report.requirements.calories
                            )}{' '}
                            kcal
                          </div>
                          <div style={{ fontSize: '12px', fontWeight: 700, color: '#ea4328' }}>
                            over
                          </div>
                        </>
                      ) : (
                        <>
                          <div
                            className="tabular"
                            style={{ fontSize: '17px', fontWeight: 800, color: '#12b92c' }}
                          >
                            {Math.max(
                              0,
                              Math.round(
                                report.requirements.calories - displayNutrients.calories
                              )
                            )}{' '}
                            kcal
                          </div>
                          <div style={{ fontSize: '12px', fontWeight: 700, color: '#12b92c' }}>
                            left
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Carbs */}
                  <div className="eathy-stat-tile">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={{ fontSize: '16px', lineHeight: 1 }}>🌿</span>
                      <span style={{ fontWeight: 600, fontSize: '14.5px', color: '#173f23' }}>
                        Carbs
                      </span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      {displayNutrients.carbs_g > report.requirements.carbs_g ? (
                        <>
                          <div
                            className="tabular"
                            style={{ fontSize: '17px', fontWeight: 800, color: '#ea4328' }}
                          >
                            {Math.round(displayNutrients.carbs_g - report.requirements.carbs_g)} g
                          </div>
                          <div style={{ fontSize: '12px', fontWeight: 700, color: '#ea4328' }}>
                            over
                          </div>
                        </>
                      ) : (
                        <>
                          <div
                            className="tabular"
                            style={{ fontSize: '17px', fontWeight: 800, color: '#12b92c' }}
                          >
                            {Math.max(
                              0,
                              Math.round(report.requirements.carbs_g - displayNutrients.carbs_g)
                            )}{' '}
                            g
                          </div>
                          <div style={{ fontSize: '12px', fontWeight: 700, color: '#12b92c' }}>
                            left
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Saturated Fat */}
                  <div className="eathy-stat-tile">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={{ fontSize: '15px', lineHeight: 1 }}>💧</span>
                      <span style={{ fontWeight: 600, fontSize: '14.5px', color: '#173f23' }}>
                        Saturated Fat
                      </span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      {(displayNutrients.saturated_fat_g ?? 0) >
                      (report.requirements.saturated_fat_g || 20) ? (
                        <>
                          <div
                            className="tabular"
                            style={{ fontSize: '17px', fontWeight: 800, color: '#ea4328' }}
                          >
                            {Math.round(
                              (displayNutrients.saturated_fat_g ?? 0) -
                                (report.requirements.saturated_fat_g || 20)
                            )}{' '}
                            g
                          </div>
                          <div style={{ fontSize: '12px', fontWeight: 700, color: '#ea4328' }}>
                            over
                          </div>
                        </>
                      ) : (
                        <>
                          <div
                            className="tabular"
                            style={{ fontSize: '17px', fontWeight: 800, color: '#12b92c' }}
                          >
                            {Math.max(
                              0,
                              Math.round(
                                (report.requirements.saturated_fat_g || 20) -
                                  (displayNutrients.saturated_fat_g ?? 0)
                              )
                            )}{' '}
                            g
                          </div>
                          <div style={{ fontSize: '12px', fontWeight: 700, color: '#12b92c' }}>
                            left
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Sodium */}
                  <div className="eathy-stat-tile">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={{ fontSize: '15px', lineHeight: 1 }}>∴</span>
                      <span style={{ fontWeight: 600, fontSize: '14.5px', color: '#173f23' }}>
                        Sodium
                      </span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      {displayNutrients.sodium_mg > report.requirements.sodium_mg ? (
                        <>
                          <div
                            className="tabular"
                            style={{ fontSize: '17px', fontWeight: 800, color: '#ea4328' }}
                          >
                            {Math.round(
                              displayNutrients.sodium_mg - report.requirements.sodium_mg
                            )}{' '}
                            mg
                          </div>
                          <div style={{ fontSize: '12px', fontWeight: 700, color: '#ea4328' }}>
                            over
                          </div>
                        </>
                      ) : (
                        <>
                          <div
                            className="tabular"
                            style={{ fontSize: '17px', fontWeight: 800, color: '#12b92c' }}
                          >
                            {Math.max(
                              0,
                              Math.round(
                                report.requirements.sodium_mg - displayNutrients.sodium_mg
                              )
                            )}{' '}
                            mg
                          </div>
                          <div style={{ fontSize: '12px', fontWeight: 700, color: '#12b92c' }}>
                            left
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ==================== 3. NUTRITION PIE CHARTS (GOOD VS. BAD, FATS, MACROS, MEAL SLOTS) ==================== */}
          <section style={{ marginBottom: 24 }} aria-label="Nutrition breakdown pie charts">
            <div className="nutrition-insights-head">
              <h2 className="nutrition-insights-title" style={{ margin: 0 }}>
                Consumption &amp; Macro Pie Charts
              </h2>
            </div>

            <BreakdownPieChart
              size="large"
              title="Good vs. Bad Consumed Breakdown"
              subtitle="Proportion of your tracked calories from healthy nutrients vs. saturated fat, sugar & excess sodium"
              slices={goodVsBadSlices}
              centerValue={qualityBreakdown ? `${qualityBreakdown.goodPct}%` : '0%'}
              centerLabel="GOOD INTAKE"
              emptyMessage="Add or order food to see your Good vs. Bad consumption pie chart."
            />

            <div className="tracker-charts-grid-3">
              <BreakdownPieChart
                title="Good vs. Bad Fats"
                subtitle="Unsaturated vs. Saturated Fat"
                slices={fatSlices}
                centerValue={`${Math.round(displayNutrients.fat_g)}g`}
                centerLabel="Total Fat"
                emptyMessage="No fat logged yet."
              />

              <BreakdownPieChart
                title="Macro Calorie Share"
                subtitle="Protein, Carbs & Fat split"
                slices={macroSlices}
                centerValue={`${Math.round(displayNutrients.calories)}`}
                centerLabel="kcal"
                emptyMessage="No macros logged yet."
              />

              <BreakdownPieChart
                title="Meal Time Breakdown"
                subtitle="Breakfast, Lunch, Snack & Dinner"
                slices={mealShareSlices}
                centerValue={`${consumedLogsInWindow.length}`}
                centerLabel="orders"
                emptyMessage="No meal orders yet."
              />
            </div>
          </section>

          {/* ==================== 4. NUTRITION INSIGHTS (3 CARDS) ==================== */}
          <section className="nutrition-insights-section" aria-label="Nutrition insights">
            <div className="nutrition-insights-head">
              <h2 className="nutrition-insights-title" style={{ margin: 0 }}>
                Nutrition insights
              </h2>
            </div>

            <div className="nutrition-insights-grid">
              {nutritionInsights.map((ins) => (
                <div key={ins.key} className="nutrition-insight-card">
                  <div>
                    {ins.tone === 'good' ? (
                      <CheckCircle2 size={18} color="#15803d" />
                    ) : ins.tone === 'warn' ? (
                      <AlertCircle size={18} color="#b45309" />
                    ) : (
                      <AlertTriangle size={18} color="#e11d48" />
                    )}
                  </div>
                  <div className="nutrition-insight-name">{ins.label}</div>
                  <div className="nutrition-insight-status" style={{ color: ins.color }}>
                    {ins.text}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ==================== 5. YOUR FOOD ORDERS (BY TIME OF DAY + DISH PHOTO) ==================== */}
          <section className="food-orders-section" aria-label="Your food orders">
            <div className="nutrition-insights-head">
              <h2 className="nutrition-insights-title" style={{ margin: 0 }}>
                Your food orders
              </h2>
              <span className="sc-count-pill">
                {consumedLogsInWindow.length}{' '}
                {consumedLogsInWindow.length === 1 ? 'order' : 'orders'}
              </span>
            </div>

            {!hasAnyTrackedFood ? (
              <div className="food-orders-card" style={{ padding: '24px 22px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16,
                    flexWrap: 'wrap',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '15.5px', color: '#0f172a' }}>
                      No food orders logged for {formattedSelectedDate} yet
                    </div>
                    <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0' }}>
                      Click &ldquo;Add to Cart&rdquo; on Zomato, Swiggy, Blinkit, or Amazon—or tap a sample dish below to test instant time-based categorization:
                    </p>
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: 10,
                    marginTop: 14,
                  }}
                >
                  {ZOMATO_SWIGGY_DEMO_ORDERS.map((order) => (
                    <button
                      key={order.name}
                      type="button"
                      className="tracker-sim-btn"
                      disabled={isSimulatingOrder !== null}
                      onClick={() => void handleQuickSimulateOrder(order)}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left' }}
                    >
                      <img
                        src={order.imageUrl}
                        alt={order.name}
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 10,
                          objectFit: 'cover',
                          flexShrink: 0,
                        }}
                        referrerPolicy="no-referrer"
                      />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div className="tracker-sim-btn-name">{order.name}</div>
                        <div className="tracker-sim-btn-meta tabular">
                          {order.calories} kcal · {order.platform}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="food-orders-card">
                {groupedMealSlots.map((slotGroup) => (
                  <div key={slotGroup.key} className="food-order-slot-group">
                    <div className="food-order-slot-header">
                      <span className="food-order-slot-name">
                        {slotGroup.label}{' '}
                        <span
                          style={{
                            fontSize: '12px',
                            fontWeight: 600,
                            color: '#64748b',
                            marginLeft: 6,
                          }}
                        >
                          ({slotGroup.windowHint})
                        </span>
                      </span>
                      <span className="food-order-platform-label">{slotGroup.platforms}</span>
                    </div>

                    {slotGroup.items.map((item) => {
                      const imgSrc = item.imageUrl || getDishFallbackImage(item.foodName);
                      return (
                        <div key={item.log_id} className="food-order-item-row">
                          <div className="food-order-item-left">
                            <div className="food-order-thumb">
                              <img
                                src={imgSrc}
                                alt={item.foodName}
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                  const target = e.currentTarget;
                                  const fallback = getDishFallbackImage(item.foodName);
                                  if (target.src !== fallback) {
                                    target.src = fallback;
                                  }
                                }}
                              />
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div className="food-order-dish-name">{item.foodName}</div>
                              <div className="food-order-time tabular">
                                {formatTime12Hour(item.consumedTime)} · {item.platform || 'Zomato'} ·{' '}
                                {slotGroup.label}
                              </div>
                            </div>
                          </div>

                          <div className="food-order-item-right">
                            <span className="food-order-kcal tabular">
                              {Math.round(item.nutrients.calories)} kcal
                            </span>
                            <button
                              type="button"
                              className="cart-remove-btn"
                              aria-label={`Remove ${item.foodName}`}
                              title="Remove order"
                              onClick={() => void handleDeleteLog(item)}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}

                {/* Compact Quick-Add Zomato / Swiggy Dish Strip with Food Images */}
                <div
                  style={{
                    borderTop: '1px dashed rgba(15, 23, 42, 0.1)',
                    padding: '14px 20px 16px',
                    background: 'rgba(248, 250, 252, 0.65)',
                  }}
                >
                  <div
                    style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      color: '#475569',
                      marginBottom: 10,
                    }}
                  >
                    Add another Zomato / Swiggy dish (auto-categorizes into Breakfast, Lunch, Snack or Dinner by current time):
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: 8,
                    }}
                  >
                    {ZOMATO_SWIGGY_DEMO_ORDERS.map((order) => (
                      <button
                        key={order.name}
                        type="button"
                        className="tracker-sim-btn"
                        disabled={isSimulatingOrder !== null}
                        onClick={() => void handleQuickSimulateOrder(order)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 9,
                          textAlign: 'left',
                          padding: '7px 10px',
                        }}
                      >
                        <img
                          src={order.imageUrl}
                          alt={order.name}
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: 8,
                            objectFit: 'cover',
                            flexShrink: 0,
                          }}
                          referrerPolicy="no-referrer"
                        />
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div className="tracker-sim-btn-name" style={{ fontSize: '12.5px' }}>
                            {order.name}
                          </div>
                          <div className="tracker-sim-btn-meta tabular" style={{ fontSize: '11px' }}>
                            + {order.calories} kcal · {order.platform}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* ==================== 6. PERSONALIZED SUGGESTIONS ==================== */}
          <section
            className="personalized-suggestions-card"
            aria-label="Personalized suggestions"
          >
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontWeight: 800,
                  fontSize: '16px',
                  color: '#0f172a',
                  marginBottom: 6,
                }}
              >
                <Sparkles size={17} color="#d97706" />
                <span>Personalized suggestions</span>
              </div>
              <p style={{ fontSize: '14px', color: '#334155', margin: 0 }}>
                {personalizedSuggestion}
              </p>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
