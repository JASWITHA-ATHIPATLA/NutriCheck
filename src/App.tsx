import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
} from 'lucide-react';
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { AmazonConnectView } from './components/AmazonConnectView';
import { AnalysisResult } from './components/AnalysisResult';
import { CartPanel } from './components/CartPanel';
import { CatalogGroceryDemo } from './components/CatalogGroceryDemo';
import { Footer } from './components/Footer';
import { ModelMetricsView } from './components/ModelMetricsView';
import { NutritionForm } from './components/NutritionForm';
import { TopBar } from './components/TopBar';
import { AboutPage } from './pages/AboutPage';
import { HomePage } from './pages/HomePage';
import { ScanPacketPage } from './pages/ScanPacketPage';
import {
  FALLBACK_REPORT,
  FALLBACK_SAMPLES,
  analyzeAmazonItemLocally,
  analyzeNutritionLocally,
  searchOpenFoodFactsClient,
} from './utils/localNutritionEngine';
import type {
  AmazonCartEvent,
  CartAlert,
  CartItem,
  CatalogFoodItem,
  EvaluationReport,
  HealthLabel,
  NutritionFormValues,
  PredictionResult,
  SampleFood,
} from './types';

const AMAZON_STORAGE_KEY = 'nutricheck_amazon_events_v1';

function readStoredAmazonEvents(): AmazonCartEvent[] {
  try {
    const raw = window.localStorage.getItem(AMAZON_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStoredAmazonEvents(events: AmazonCartEvent[]) {
  try {
    window.localStorage.setItem(AMAZON_STORAGE_KEY, JSON.stringify(events.slice(0, 30)));
  } catch {
    // ignore quota errors
  }
}

const EMPTY_FORM: NutritionFormValues = {
  food_name: '',
  calories: '',
  sugars: '',
  fat: '',
  protein: '',
  sodium_mg: '',
};

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function NutriCheckShell() {
  const navigate = useNavigate();
  const location = useLocation();

  const [formValues, setFormValues] = useState<NutritionFormValues>(EMPTY_FORM);
  const [samples, setSamples] = useState<SampleFood[]>(FALLBACK_SAMPLES);
  const [selectedSampleName, setSelectedSampleName] = useState('');
  const [report, setReport] = useState<EvaluationReport | null>(FALLBACK_REPORT);
  const [metricsError, setMetricsError] = useState<string | null>(null);

  const [catalogItems, setCatalogItems] = useState<CatalogFoodItem[]>([]);
  const [catalogQuery, setCatalogQuery] = useState('');
  const [analyzingGroceryItem, setAnalyzingGroceryItem] = useState<string | null>(null);

  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [activeAlert, setActiveAlert] = useState<
    (CartAlert & { itemId?: string }) | null
  >(null);

  const [amazonEvents, setAmazonEvents] = useState<AmazonCartEvent[]>(() =>
    typeof window !== 'undefined' ? readStoredAmazonEvents() : []
  );
  const [isSubmittingAmazon, setIsSubmittingAmazon] = useState(false);
  const [amazonError, setAmazonError] = useState<string | null>(null);
  const [amazonNotice, setAmazonNotice] = useState<{
    level: 'success' | 'warning' | 'danger' | 'info';
    title: string;
    message: string;
    needsNutrition?: boolean;
  } | null>(null);
  const seenEventIdsRef = useRef<Set<string>>(new Set());
  const initializedEventsRef = useRef(false);
  const backendAvailableRef = useRef<boolean>(true);

  function mergeAmazonEvents(incoming: AmazonCartEvent[]) {
    if (!incoming.length) return;
    setAmazonEvents((prev) => {
      const byId = new Map<string, AmazonCartEvent>();
      for (const ev of [...incoming, ...prev]) {
        if (ev?.event_id && !byId.has(ev.event_id)) {
          byId.set(ev.event_id, ev);
        }
      }
      const merged = Array.from(byId.values())
        .sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''))
        .slice(0, 30);
      writeStoredAmazonEvents(merged);
      return merged;
    });
  }

  function pushToCartWithAlert(res: PredictionResult, customId?: string) {
    const id = customId || `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newItem: CartItem = {
      id,
      food_name: res.food_name,
      classification: res.classification,
      health_score: res.health_score,
      calories: res.nutrition.calories,
      sugars: res.nutrition.sugars,
      fat: res.nutrition.fat,
      protein: res.nutrition.protein,
      sodium_mg: res.nutrition.sodium_mg,
      cart_alert: res.cart_alert,
    };

    setCartItems((prev) => {
      if (prev.some((item) => item.id === id)) return prev;
      return [newItem, ...prev];
    });
    setActiveAlert({ ...res.cart_alert, itemId: id });
  }

  function applyPredictionToForm(res: PredictionResult) {
    setPrediction(res);
    setFormValues({
      food_name: res.food_name,
      calories: String(res.nutrition.calories),
      sugars: String(res.nutrition.sugars),
      fat: String(res.nutrition.fat),
      protein: String(res.nutrition.protein),
      sodium_mg: String(res.nutrition.sodium_mg),
    });
  }

  function handleIncomingAmazonEvent(ev: AmazonCartEvent, showBanner = true) {
    if (ev.status === 'analyzed' && ev.analysis) {
      applyPredictionToForm(ev.analysis);
      pushToCartWithAlert(ev.analysis, `amz-${ev.event_id}`);
      if (showBanner) {
        setAmazonNotice({
          level: ev.analysis.cart_alert.level,
          title: `Amazon Add-to-Cart Analyzed: ${ev.analysis.classification} (${ev.analysis.health_score}/100)`,
          message: `${ev.product_title} — ${ev.analysis.explanation}`,
          needsNutrition: false,
        });
      }
      return;
    }

    setPrediction(null);
    setFormValues({
      ...EMPTY_FORM,
      food_name: ev.product_title,
    });
    if (showBanner) {
      setAmazonNotice({
        level: 'warning',
        title: `Amazon Item Captured: ${ev.product_title}`,
        message:
          ev.message ||
          'Nutrition label numbers were not found on the Amazon page. Enter nutrition values below or paste label text to classify.',
        needsNutrition: true,
      });
    }
  }

  async function runPrediction(
    payload: {
      food_name: string;
      calories: number;
      sugars: number;
      fat: number;
      protein: number;
      sodium_mg: number;
    },
    autoAddAlert = false
  ) {
    setIsAnalyzing(true);
    setFormError(null);
    try {
      const response = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data: PredictionResult = await response.json();
        setPrediction(data);
        if (autoAddAlert) {
          pushToCartWithAlert(data);
        }
        return;
      }

      if (response.status === 422) {
        const errBody = await response.json().catch(() => null);
        throw new Error(errBody?.detail || `Invalid nutrition input (${response.status})`);
      }

      // Static Vercel fallback when Python backend is not hosted
      const localRes = analyzeNutritionLocally(payload);
      setPrediction(localRes);
      if (autoAddAlert) {
        pushToCartWithAlert(localRes);
      }
    } catch (err) {
      if (err instanceof TypeError || (err instanceof Error && /failed to fetch|network/i.test(err.message))) {
        const localRes = analyzeNutritionLocally(payload);
        setPrediction(localRes);
        if (autoAddAlert) {
          pushToCartWithAlert(localRes);
        }
      } else {
        setFormError(
          err instanceof Error ? err.message : 'Failed to analyze nutrition values.'
        );
      }
    } finally {
      setIsAnalyzing(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    const params = new URLSearchParams(window.location.search);
    const itemName = params.get('item') || params.get('food');
    const calParam = params.get('calories');
    const sugParam = params.get('sugars');
    const fatParam = params.get('fat');
    const proParam = params.get('protein');
    const sodParam = params.get('sodium_mg');
    const hasCalorieParams = Boolean(
      itemName && calParam && sugParam && fatParam && proParam && sodParam
    );

    const initialStored = readStoredAmazonEvents();
    initialStored.forEach((ev) => seenEventIdsRef.current.add(ev.event_id));

    async function loadInitialData() {
      try {
        const [samplesRes, metricsRes, eventsRes, foodsRes] = await Promise.all([
          fetch('/api/samples').catch(() => null),
          fetch('/api/metrics').catch(() => null),
          fetch('/api/amazon/cart-events').catch(() => null),
          fetch('/api/foods?limit=8').catch(() => null),
        ]);

        const apiOnline = Boolean(samplesRes && samplesRes.ok);
        backendAvailableRef.current = apiOnline;

        if (!cancelled && samplesRes?.ok) {
          const sampleData: SampleFood[] = await samplesRes.json();
          setSamples(sampleData);
        }

        if (!cancelled && metricsRes?.ok) {
          const metricsData: EvaluationReport = await metricsRes.json();
          setReport(metricsData);
          setMetricsError(null);
        } else if (!cancelled) {
          setReport(FALLBACK_REPORT);
          setMetricsError(null);
        }

        let loadedEvents: AmazonCartEvent[] = [...initialStored];
        if (!cancelled && eventsRes?.ok) {
          const apiEvents: AmazonCartEvent[] = await eventsRes.json();
          mergeAmazonEvents(apiEvents);
          loadedEvents = apiEvents.length > 0 ? apiEvents : initialStored;
        }

        loadedEvents.forEach((ev) => seenEventIdsRef.current.add(ev.event_id));
        initializedEventsRef.current = true;

        const analyzedItems: CartItem[] = loadedEvents
          .filter((ev) => ev.status === 'analyzed' && ev.analysis !== null)
          .map((ev) => {
            const a = ev.analysis!;
            return {
              id: `amz-${ev.event_id}`,
              food_name: a.food_name,
              classification: a.classification,
              health_score: a.health_score,
              calories: a.nutrition.calories,
              sugars: a.nutrition.sugars,
              fat: a.nutrition.fat,
              protein: a.nutrition.protein,
              sodium_mg: a.nutrition.sodium_mg,
              cart_alert: a.cart_alert,
            };
          });
        if (!cancelled && analyzedItems.length > 0) {
          setCartItems((prev) => {
            const existingIds = new Set(prev.map((p) => p.id));
            return [
              ...prev,
              ...analyzedItems.filter((item) => !existingIds.has(item.id)),
            ];
          });
        }

        if (!cancelled && !hasCalorieParams && !itemName && loadedEvents.length > 0) {
          handleIncomingAmazonEvent(loadedEvents[0], false);
        }

        if (!cancelled && foodsRes?.ok) {
          const foodData: CatalogFoodItem[] = await foodsRes.json();
          setCatalogItems(foodData);
        } else if (!cancelled) {
          const clientFoods = await searchOpenFoodFactsClient('', 8);
          setCatalogItems(clientFoods);
        }

        if (!cancelled && itemName && !hasCalorieParams) {
          const matchingExisting = loadedEvents.find(
            (ev) => ev.product_title.toLowerCase() === itemName.toLowerCase()
          );
          if (matchingExisting) {
            handleIncomingAmazonEvent(matchingExisting, true);
            if (matchingExisting.status === 'needs_nutrition') {
              navigate('/amazon');
            }
          } else {
            navigate('/amazon');
            void handleAnalyzeAmazonText({
              product_title: itemName,
              nutrition_text: params.get('nutrition') || '',
            });
          }
        }
      } catch {
        if (!cancelled) {
          backendAvailableRef.current = false;
          setReport(FALLBACK_REPORT);
        }
      }
    }

    loadInitialData();

    if (hasCalorieParams && itemName) {
      const payload = {
        food_name: itemName,
        calories: Number(calParam),
        sugars: Number(sugParam),
        fat: Number(fatParam),
        protein: Number(proParam),
        sodium_mg: Number(sodParam),
      };
      if (!Object.values(payload).some((v) => typeof v === 'number' && Number.isNaN(v))) {
        setFormValues({
          food_name: payload.food_name,
          calories: String(payload.calories),
          sugars: String(payload.sugars),
          fat: String(payload.fat),
          protein: String(payload.protein),
          sodium_mg: String(payload.sodium_mg),
        });
        void runPrediction(payload, true);
      }
    }

    return () => {
      cancelled = true;
    };
  }, []);

  // Listen to real-time Chrome Extension tab bridge sync (works on Vercel & localhost!)
  useEffect(() => {
    function handleBridgeMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      const msg = event.data;
      if (!msg || msg.type !== 'NUTRICHECK_AMAZON_SYNC' || !Array.isArray(msg.events)) return;

      const incoming = msg.events as AmazonCartEvent[];
      if (incoming.length === 0) return;

      const unseen = incoming.filter((ev) => ev?.event_id && !seenEventIdsRef.current.has(ev.event_id));
      incoming.forEach((ev) => ev?.event_id && seenEventIdsRef.current.add(ev.event_id));
      mergeAmazonEvents(incoming);

      if (unseen.length > 0) {
        handleIncomingAmazonEvent(unseen[0], true);
      }
    }

    window.addEventListener('message', handleBridgeMessage);
    window.postMessage({ type: 'NUTRICHECK_REQUEST_SYNC' }, window.location.origin);
    return () => window.removeEventListener('message', handleBridgeMessage);
  }, []);

  // Live search across local dataset + Open Food Facts
  useEffect(() => {
    const controller = new AbortController();
    const handle = window.setTimeout(async () => {
      try {
        if (backendAvailableRef.current) {
          const res = await fetch(
            `/api/foods?q=${encodeURIComponent(catalogQuery)}&limit=8`,
            { signal: controller.signal }
          );
          if (res.ok) {
            const list: CatalogFoodItem[] = await res.json();
            setCatalogItems(list);
            return;
          }
          backendAvailableRef.current = false;
        }
        const clientList = await searchOpenFoodFactsClient(catalogQuery, 8);
        setCatalogItems(clientList);
      } catch {
        if (!controller.signal.aborted) {
          const clientList = await searchOpenFoodFactsClient(catalogQuery, 8);
          setCatalogItems(clientList);
        }
      }
    }, 260);

    return () => {
      controller.abort();
      window.clearTimeout(handle);
    };
  }, [catalogQuery]);

  // Poll backend for live Amazon extension Add-to-Cart events when Python backend is running
  useEffect(() => {
    const timer = window.setInterval(async () => {
      if (!backendAvailableRef.current) return;
      try {
        const res = await fetch('/api/amazon/cart-events');
        if (!res.ok) {
          if (res.status === 404 || res.status === 405) {
            backendAvailableRef.current = false;
          }
          return;
        }
        const latest: AmazonCartEvent[] = await res.json();
        mergeAmazonEvents(latest);

        if (!initializedEventsRef.current) {
          latest.forEach((ev) => seenEventIdsRef.current.add(ev.event_id));
          initializedEventsRef.current = true;
          return;
        }

        const unseen = latest.filter(
          (ev) => !seenEventIdsRef.current.has(ev.event_id)
        );
        if (unseen.length > 0) {
          unseen.forEach((ev) => seenEventIdsRef.current.add(ev.event_id));
          handleIncomingAmazonEvent(unseen[0], true);
        }
      } catch {
        // Ignore transient polling hiccups
      }
    }, 2000);

    return () => window.clearInterval(timer);
  }, []);

  async function handleCatalogAddToCart(item: CatalogFoodItem) {
    setAnalyzingGroceryItem(item.food);
    setSelectedSampleName('');
    setFormValues({
      food_name: item.food,
      calories: String(item.calories),
      sugars: String(item.sugars),
      fat: String(item.fat),
      protein: String(item.protein),
      sodium_mg: String(item.sodium_mg),
    });

    await runPrediction(
      {
        food_name: item.food,
        calories: item.calories,
        sugars: item.sugars,
        fat: item.fat,
        protein: item.protein,
        sodium_mg: item.sodium_mg,
      },
      true
    );

    setAnalyzingGroceryItem(null);
    requestAnimationFrame(() => {
      document
        .getElementById('live-analysis-anchor')
        ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }

  function handleFieldChange(field: keyof NutritionFormValues, value: string) {
    setSelectedSampleName('');
    setFormValues((prev) => ({ ...prev, [field]: value }));
  }

  function applySample(sample: SampleFood) {
    setSelectedSampleName(sample.food);
    setFormValues({
      food_name: sample.food,
      calories: String(sample.calories),
      sugars: String(sample.sugars),
      fat: String(sample.fat),
      protein: String(sample.protein),
      sodium_mg: String(sample.sodium_mg),
    });
    void runPrediction({
      food_name: sample.food,
      calories: sample.calories,
      sugars: sample.sugars,
      fat: sample.fat,
      protein: sample.protein,
      sodium_mg: sample.sodium_mg,
    });
  }

  function handleSelectSample(foodName: string) {
    if (!foodName) {
      setSelectedSampleName('');
      return;
    }
    const found = samples.find((s) => s.food === foodName);
    if (found) {
      applySample(found);
    }
  }

  function handleQuickPreset(label: HealthLabel) {
    const found = samples.find((s) => s.dataset_label === label);
    if (found) {
      applySample(found);
      return;
    }

    const fallback: Record<HealthLabel, SampleFood> = {
      Healthy: {
        food: 'Broccoli Cooked',
        calories: 98,
        sugars: 3.9,
        fat: 1.1,
        protein: 6.7,
        sodium_mg: 100,
        dataset_label: 'Healthy',
        source_group: 'fallback',
      },
      Moderate: {
        food: 'Pepperoni Pizza Slice',
        calories: 308,
        sugars: 4.2,
        fat: 12.6,
        protein: 12.7,
        sodium_mg: 700,
        dataset_label: 'Moderate',
        source_group: 'fallback',
      },
      Unhealthy: {
        food: 'Root Beer',
        calories: 202,
        sugars: 52.3,
        fat: 0,
        protein: 0,
        sodium_mg: 68,
        dataset_label: 'Unhealthy',
        source_group: 'fallback',
      },
    };
    applySample(fallback[label]);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const calories = Number(formValues.calories);
    const sugars = Number(formValues.sugars);
    const fat = Number(formValues.fat);
    const protein = Number(formValues.protein);
    const sodium_mg = Number(formValues.sodium_mg);

    if (
      [calories, sugars, fat, protein, sodium_mg].some(
        (v) => Number.isNaN(v) || v < 0
      )
    ) {
      setFormError('Please enter valid non-negative numeric values for all nutrients.');
      return;
    }

    void runPrediction({
      food_name: formValues.food_name.trim() || 'Custom Food Item',
      calories,
      sugars,
      fat,
      protein,
      sodium_mg,
    });
  }

  function handleReset() {
    setFormValues(EMPTY_FORM);
    setSelectedSampleName('');
    setPrediction(null);
    setFormError(null);
  }

  async function handleAnalyzeAmazonText(payload: {
    product_title: string;
    nutrition_text: string;
    product_url?: string;
  }) {
    setIsSubmittingAmazon(true);
    setAmazonError(null);
    try {
      let ev: AmazonCartEvent | null = null;
      if (backendAvailableRef.current) {
        const res = await fetch('/api/amazon/add-to-cart', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...payload,
            source: 'amazon_web_intake',
          }),
        }).catch(() => null);
        if (res?.ok) {
          ev = (await res.json()) as AmazonCartEvent;
        } else if (res && res.status === 422) {
          const errBody = await res.json().catch(() => null);
          throw new Error(errBody?.detail || `Invalid product input (${res.status})`);
        }
      }

      if (!ev) {
        ev = await analyzeAmazonItemLocally(payload);
      }

      seenEventIdsRef.current.add(ev.event_id);
      mergeAmazonEvents([ev]);
      handleIncomingAmazonEvent(ev, true);
    } catch (err) {
      setAmazonError(
        err instanceof Error ? err.message : 'Unable to analyze Amazon item.'
      );
    } finally {
      setIsSubmittingAmazon(false);
    }
  }

  async function handleDeleteAmazonEvent(eventId: string) {
    setAmazonEvents((prev) => {
      const next = prev.filter((e) => e.event_id !== eventId);
      writeStoredAmazonEvents(next);
      return next;
    });
    window.postMessage(
      { type: 'NUTRICHECK_DELETE_AMAZON_EVENT', eventId },
      window.location.origin
    );
    await fetch(`/api/amazon/cart-events/${eventId}`, { method: 'DELETE' }).catch(
      () => {}
    );
  }

  async function handleClearAmazonEvents() {
    setAmazonEvents([]);
    writeStoredAmazonEvents([]);
    window.postMessage({ type: 'NUTRICHECK_CLEAR_AMAZON_EVENTS' }, window.location.origin);
    await fetch('/api/amazon/cart-events', { method: 'DELETE' }).catch(() => {});
  }

  function handleInspectEventInAnalyzer(ev: AmazonCartEvent) {
    if (ev.analysis) {
      applyPredictionToForm(ev.analysis);
      setActiveAlert({ ...ev.analysis.cart_alert, itemId: `amz-${ev.event_id}` });
      navigate('/analyzer');
      requestAnimationFrame(() => {
        document
          .getElementById('live-analysis-anchor')
          ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
      return;
    }

    setPrediction(null);
    setFormValues({
      ...EMPTY_FORM,
      food_name: ev.product_title,
    });
    navigate('/analyzer');
    requestAnimationFrame(() => {
      document
        .getElementById('manual-analyzer-section')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function handleRemoveCartItem(id: string) {
    setCartItems((prev) => prev.filter((item) => item.id !== id));
    if (activeAlert?.itemId === id) {
      setActiveAlert(null);
    }
  }

  const showLiveNotice = amazonNotice && location.pathname !== '/';

  return (
    <div className="app-shell">
      <ScrollToTop />
      <TopBar />

      {showLiveNotice && amazonNotice && (
        <div className="main-container" style={{ paddingBottom: 0 }}>
          <div
            className={`amazon-live-banner level-${amazonNotice.level}`}
            role="status"
            aria-live="polite"
          >
            <div className="cart-alert-body">
              {amazonNotice.level === 'success' ? (
                <CheckCircle2 size={20} />
              ) : amazonNotice.level === 'danger' ? (
                <ShieldAlert size={20} />
              ) : (
                <AlertTriangle size={20} />
              )}
              <div>
                <div className="cart-alert-title">{amazonNotice.title}</div>
                <p className="cart-alert-msg">{amazonNotice.message}</p>
              </div>
            </div>
            <div className="cart-alert-actions">
              {amazonNotice.needsNutrition && (
                <button
                  type="button"
                  className="alert-dismiss-btn"
                  onClick={() => navigate('/analyzer')}
                >
                  Enter Nutrition
                </button>
              )}
              {location.pathname !== '/amazon' && (
                <button
                  type="button"
                  className="alert-dismiss-btn"
                  onClick={() => navigate('/amazon')}
                >
                  Open Amazon Feed
                </button>
              )}
              <button
                type="button"
                className="alert-dismiss-btn"
                onClick={() => setAmazonNotice(null)}
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="app-main">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/scan" element={<ScanPacketPage />} />
          <Route
            path="/analyzer"
            element={
              <div className="page-shell">
                <div className="page-header">
                  <div>
                    <h1 className="page-title">Food Nutrition Analyzer &amp; Cart</h1>
                    <p className="page-subtitle">
                      Search packaged grocery items online or enter label numbers to
                      check health score, nutrient flags, and cart alerts.
                    </p>
                  </div>
                </div>

                <CatalogGroceryDemo
                  items={catalogItems}
                  searchQuery={catalogQuery}
                  analyzingFoodName={analyzingGroceryItem}
                  onSearchChange={setCatalogQuery}
                  onAddToCartClick={handleCatalogAddToCart}
                />

                <div id="manual-analyzer-section" className="analyzer-grid">
                  <NutritionForm
                    values={formValues}
                    samples={samples}
                    selectedSampleName={selectedSampleName}
                    isAnalyzing={isAnalyzing}
                    errorMessage={formError}
                    onChange={handleFieldChange}
                    onSelectSample={handleSelectSample}
                    onQuickPreset={handleQuickPreset}
                    onSubmit={handleSubmit}
                    onReset={handleReset}
                  />

                  <div id="live-analysis-anchor" className="result-column">
                    <CartPanel
                      activeAlert={activeAlert}
                      cartItems={cartItems}
                      onDismissAlert={() => setActiveAlert(null)}
                      onRemoveItem={handleRemoveCartItem}
                      onClearCart={() => {
                        setCartItems([]);
                        setActiveAlert(null);
                      }}
                    />

                    <AnalysisResult
                      result={prediction}
                      isAnalyzing={isAnalyzing}
                      onAddToCart={(res) => pushToCartWithAlert(res)}
                      onQuickPreset={handleQuickPreset}
                    />
                  </div>
                </div>
              </div>
            }
          />
          <Route
            path="/amazon"
            element={
              <div className="page-shell">
                <div className="page-header">
                  <div>
                    <h1 className="page-title">Amazon Add-to-Cart Integration</h1>
                    <p className="page-subtitle">
                      Intercept Amazon browser Add to Cart clicks via the Chrome
                      extension or analyze a copied Amazon grocery title.
                    </p>
                  </div>
                </div>
                <AmazonConnectView
                  events={amazonEvents}
                  isSubmitting={isSubmittingAmazon}
                  submitError={amazonError}
                  onAnalyzeAmazonText={handleAnalyzeAmazonText}
                  onInspectEventInAnalyzer={handleInspectEventInAnalyzer}
                  onDeleteEvent={handleDeleteAmazonEvent}
                  onClearEvents={handleClearAmazonEvents}
                />
              </div>
            }
          />
          <Route
            path="/models"
            element={
              <div className="page-shell">
                <div className="page-header">
                  <div>
                    <h1 className="page-title">
                      Dataset Cleaning, EDA &amp; Model Comparison
                    </h1>
                    <p className="page-subtitle">
                      Verified Scikit-learn training pipeline across 5 cleaned nutrition
                      datasets.
                    </p>
                  </div>
                </div>
                <ModelMetricsView report={report} error={metricsError} />
              </div>
            }
          />
          <Route path="/about" element={<AboutPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <NutriCheckShell />
    </BrowserRouter>
  );
}
