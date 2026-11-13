import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { AmazonConnectView } from './components/AmazonConnectView';
import { AnalysisResult } from './components/AnalysisResult';
import { CartPanel } from './components/CartPanel';
import { CatalogGroceryDemo } from './components/CatalogGroceryDemo';
import { ModelMetricsView } from './components/ModelMetricsView';
import { NutritionForm } from './components/NutritionForm';
import { type ActiveTab, TopBar } from './components/TopBar';
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

const EMPTY_FORM: NutritionFormValues = {
  food_name: '',
  calories: '',
  sugars: '',
  fat: '',
  protein: '',
  sodium_mg: '',
};

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('analyzer');
  const [formValues, setFormValues] = useState<NutritionFormValues>(EMPTY_FORM);
  const [samples, setSamples] = useState<SampleFood[]>([]);
  const [selectedSampleName, setSelectedSampleName] = useState('');
  const [report, setReport] = useState<EvaluationReport | null>(null);
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

  const [amazonEvents, setAmazonEvents] = useState<AmazonCartEvent[]>([]);
  const [isSubmittingAmazon, setIsSubmittingAmazon] = useState(false);
  const [amazonError, setAmazonError] = useState<string | null>(null);
  const seenEventIdsRef = useRef<Set<string>>(new Set());
  const initializedEventsRef = useRef(false);

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

      if (!response.ok) {
        const errBody = await response.json().catch(() => null);
        throw new Error(errBody?.detail || `API returned status ${response.status}`);
      }

      const data: PredictionResult = await response.json();
      setPrediction(data);
      if (autoAddAlert) {
        pushToCartWithAlert(data);
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Failed to analyze nutrition values.';
      setFormError(msg);
    } finally {
      setIsAnalyzing(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadInitialData() {
      try {
        const [samplesRes, metricsRes, eventsRes, foodsRes] = await Promise.all([
          fetch('/api/samples'),
          fetch('/api/metrics'),
          fetch('/api/amazon/cart-events'),
          fetch('/api/foods?limit=8'),
        ]);

        if (!cancelled && samplesRes.ok) {
          const sampleData: SampleFood[] = await samplesRes.json();
          setSamples(sampleData);
        }
        if (!cancelled && metricsRes.ok) {
          const metricsData: EvaluationReport = await metricsRes.json();
          setReport(metricsData);
        } else if (!cancelled) {
          setMetricsError('Unable to load model evaluation report from API.');
        }

        if (!cancelled && eventsRes.ok) {
          const evData: AmazonCartEvent[] = await eventsRes.json();
          evData.forEach((ev) => seenEventIdsRef.current.add(ev.event_id));
          initializedEventsRef.current = true;
          setAmazonEvents(evData);
        }

        if (!cancelled && foodsRes.ok) {
          const foodData: CatalogFoodItem[] = await foodsRes.json();
          setCatalogItems(foodData);
        }
      } catch {
        if (!cancelled) {
          setMetricsError(
            'Could not reach the FastAPI backend. Ensure uvicorn is running on port 8001.'
          );
        }
      }
    }

    loadInitialData();

    const params = new URLSearchParams(window.location.search);
    const itemName = params.get('item') || params.get('food');
    const calParam = params.get('calories');
    const sugParam = params.get('sugars');
    const fatParam = params.get('fat');
    const proParam = params.get('protein');
    const sodParam = params.get('sodium_mg');

    if (itemName && calParam && sugParam && fatParam && proParam && sodParam) {
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
    } else if (itemName) {
      setActiveTab('amazon');
      void handleAnalyzeAmazonText({
        product_title: itemName,
        nutrition_text: params.get('nutrition') || '',
      });
    }

    return () => {
      cancelled = true;
    };
  }, []);

  // Live search across the 2,158 cleaned CSV foods
  useEffect(() => {
    const controller = new AbortController();
    const handle = window.setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/foods?q=${encodeURIComponent(catalogQuery)}&limit=8`,
          { signal: controller.signal }
        );
        if (res.ok) {
          const list: CatalogFoodItem[] = await res.json();
          setCatalogItems(list);
        }
      } catch {
        // Ignore abort errors
      }
    }, 150);

    return () => {
      controller.abort();
      window.clearTimeout(handle);
    };
  }, [catalogQuery]);

  // Poll for live Amazon extension Add-to-Cart events every 3s
  useEffect(() => {
    const timer = window.setInterval(async () => {
      try {
        const res = await fetch('/api/amazon/cart-events');
        if (!res.ok) return;
        const latest: AmazonCartEvent[] = await res.json();
        setAmazonEvents(latest);

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
          const newest = unseen[0];
          applyPredictionToForm(newest.analysis);
          pushToCartWithAlert(newest.analysis, `amz-${newest.event_id}`);
        }
      } catch {
        // Ignore transient polling hiccups
      }
    }, 3000);

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
      const res = await fetch('/api/amazon/add-to-cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          source: 'amazon_web_intake',
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.detail || `API returned status ${res.status}`);
      }
      const ev = data as AmazonCartEvent;
      seenEventIdsRef.current.add(ev.event_id);
      setAmazonEvents((prev) => [ev, ...prev.filter((p) => p.event_id !== ev.event_id)]);
      applyPredictionToForm(ev.analysis);
      pushToCartWithAlert(ev.analysis, `amz-${ev.event_id}`);
    } catch (err) {
      setAmazonError(
        err instanceof Error ? err.message : 'Unable to analyze Amazon item.'
      );
    } finally {
      setIsSubmittingAmazon(false);
    }
  }

  async function handleDeleteAmazonEvent(eventId: string) {
    setAmazonEvents((prev) => prev.filter((e) => e.event_id !== eventId));
    await fetch(`/api/amazon/cart-events/${eventId}`, { method: 'DELETE' }).catch(
      () => {}
    );
  }

  async function handleClearAmazonEvents() {
    setAmazonEvents([]);
    await fetch('/api/amazon/cart-events', { method: 'DELETE' }).catch(() => {});
  }

  function handleInspectEventInAnalyzer(ev: AmazonCartEvent) {
    applyPredictionToForm(ev.analysis);
    setActiveAlert({ ...ev.analysis.cart_alert, itemId: `amz-${ev.event_id}` });
    setActiveTab('analyzer');
  }

  function handleRemoveCartItem(id: string) {
    setCartItems((prev) => prev.filter((item) => item.id !== id));
    if (activeAlert?.itemId === id) {
      setActiveAlert(null);
    }
  }

  function handleJumpToCart() {
    setActiveTab('analyzer');
    requestAnimationFrame(() => {
      document
        .getElementById('demo-cart-section')
        ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }

  const bestMetric = report?.model_comparison.find(
    (m) => m.model === report.best_model
  );

  return (
    <div className="app-shell">
      <TopBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        cartCount={cartItems.length}
        amazonCount={amazonEvents.length}
        onJumpToCart={handleJumpToCart}
      />

      {activeTab === 'analyzer' && (
        <section className="hero-banner" aria-label="HealthGuard Overview">
          <div className="hero-inner">
            <div>
              <div className="hero-eyebrow">
                <Sparkles size={15} />
                <span>WHO / FDA Nutrient Profiling · Scikit-learn ML</span>
              </div>
              <h1 className="hero-title">
                Welcome to
                <span className="hero-title-gradient">HealthGuard</span>
              </h1>
              <p className="hero-desc">
                Click Add to Cart on any grocery item—or connect Amazon via the
                browser extension—to automatically analyze calories, sugar, fat,
                protein, and sodium with instant Healthy, Moderate, or Unhealthy
                alerts.
              </p>
              <div className="hero-cta-row">
                <button
                  type="button"
                  className="hero-btn-primary"
                  onClick={() =>
                    document
                      .getElementById('grocery-cart-demo')
                      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }
                >
                  <span>Try Add-to-Cart Analyzer</span>
                  <ArrowRight size={16} />
                </button>
                <button
                  type="button"
                  className="hero-btn-secondary"
                  onClick={() =>
                    document
                      .getElementById('manual-analyzer-section')
                      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }
                >
                  <span>Enter Nutrition Manually</span>
                </button>
              </div>
            </div>

            <div className="hero-stat-card">
              <div className="hero-stat-heading">
                Verified Model Evaluation
              </div>
              <div className="hero-stat-value">
                {bestMetric
                  ? `${(bestMetric.accuracy * 100).toFixed(2)}% Accuracy`
                  : 'Random Forest'}
              </div>
              <div className="hero-stat-sub">
                {report
                  ? `${report.best_model} · ${report.cleaning_summary.cleaned_rows.toLocaleString()} cleaned foods`
                  : 'Trained on cleaned nutrition CSVs'}
              </div>
              <div className="hero-tier-row">
                <span className="hero-tier-item">
                  <span className="dot dot-healthy" aria-hidden="true" />
                  Healthy
                </span>
                <span className="hero-tier-item">
                  <span className="dot dot-moderate" aria-hidden="true" />
                  Moderate
                </span>
                <span className="hero-tier-item">
                  <span className="dot dot-unhealthy" aria-hidden="true" />
                  Unhealthy
                </span>
              </div>
            </div>
          </div>
        </section>
      )}

      <main className="main-container">
        {activeTab === 'analyzer' ? (
          <>
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
          </>
        ) : activeTab === 'amazon' ? (
          <>
            <div className="page-header">
              <div>
                <h1 className="page-title">Amazon Add-to-Cart Integration</h1>
                <p className="page-subtitle">
                  Intercept Amazon browser Add to Cart clicks via the Chrome
                  extension or paste a product from the Amazon mobile app.
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
          </>
        ) : (
          <>
            <div className="page-header">
              <div>
                <h1 className="page-title">
                  Dataset Cleaning, EDA &amp; Model Comparison
                </h1>
                <p className="page-subtitle">
                  Verified Scikit-learn training pipeline across 5 cleaned
                  nutrition datasets.
                </p>
              </div>
            </div>
            <ModelMetricsView report={report} error={metricsError} />
          </>
        )}
      </main>
    </div>
  );
}
