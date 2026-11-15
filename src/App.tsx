import React, { useEffect, useRef, useState } from 'react';
import {
  ExternalLink,
  ShoppingBag,
  X,
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
import { Footer } from './components/Footer';
import { TopBar } from './components/TopBar';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AddProductPage } from './pages/AddProductPage';
import { DashboardPage } from './pages/DashboardPage';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { ProfilePage } from './pages/ProfilePage';
import { RegisterPage } from './pages/RegisterPage';
import { ScanPacketPage } from './pages/ScanPacketPage';
import { evaluateProfileAlertsForValues } from './utils/healthProfileEngine';
import { analyzeAmazonItemLocally } from './utils/localNutritionEngine';
import type { AmazonCartEvent } from './types';

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

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function RequireAuth({ children }: { children: React.ReactElement }) {
  const { currentUser } = useAuth();
  const location = useLocation();
  if (!currentUser) {
    return (
      <Navigate
        to="/login"
        state={{ from: `${location.pathname}${location.search}` }}
        replace
      />
    );
  }
  return children;
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

function NutriCheckShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();

  const [amazonEvents, setAmazonEvents] = useState<AmazonCartEvent[]>(() =>
    typeof window !== 'undefined' ? readStoredAmazonEvents() : []
  );
  const [isSubmittingAmazon, setIsSubmittingAmazon] = useState(false);
  const [amazonError, setAmazonError] = useState<string | null>(null);
  const [popupEvent, setPopupEvent] = useState<AmazonCartEvent | null>(null);

  const seenEventIdsRef = useRef<Set<string>>(new Set());
  const initializedEventsRef = useRef(false);
  const backendAvailableRef = useRef<boolean>(true);
  const popupTimerRef = useRef<number | null>(null);

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

  function triggerTopPopup(ev: AmazonCartEvent) {
    setPopupEvent(ev);
    if (popupTimerRef.current) {
      window.clearTimeout(popupTimerRef.current);
    }
    popupTimerRef.current = window.setTimeout(() => {
      setPopupEvent((curr) => (curr?.event_id === ev.event_id ? null : curr));
    }, 18000);
  }

  useEffect(() => {
    let cancelled = false;

    const params = new URLSearchParams(window.location.search);
    const itemName = params.get('item') || params.get('food');
    const urlImage = params.get('image_url') || undefined;
    const urlIngredients = params.get('ingredients') || undefined;

    const initialStored = readStoredAmazonEvents();
    initialStored.forEach((ev) => seenEventIdsRef.current.add(ev.event_id));

    async function loadInitialEvents() {
      try {
        const eventsRes = await fetch('/api/amazon/cart-events').catch(() => null);
        backendAvailableRef.current = Boolean(eventsRes && eventsRes.ok);

        let loadedEvents: AmazonCartEvent[] = [...initialStored];
        if (!cancelled && eventsRes?.ok) {
          const apiEvents: AmazonCartEvent[] = await eventsRes.json();
          mergeAmazonEvents(apiEvents);
          loadedEvents = apiEvents.length > 0 ? apiEvents : initialStored;
        }

        loadedEvents.forEach((ev) => seenEventIdsRef.current.add(ev.event_id));
        initializedEventsRef.current = true;

        if (!cancelled && itemName) {
          const matchingExisting = loadedEvents.find(
            (ev) => ev.product_title.toLowerCase() === itemName.toLowerCase()
          );
          if (matchingExisting) {
            triggerTopPopup(matchingExisting);
            navigate('/amazon');
          } else {
            navigate('/amazon');
            void handleAnalyzeAmazonText({
              product_title: itemName,
              nutrition_text: params.get('nutrition') || '',
              ingredients_text: urlIngredients,
              image_url: urlImage,
            });
          }
        }
      } catch {
        if (!cancelled) {
          backendAvailableRef.current = false;
        }
      }
    }

    void loadInitialEvents();

    return () => {
      cancelled = true;
    };
  }, []);

  // Listen to real-time Chrome Extension tab bridge sync (works on Vercel & localhost)
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
        triggerTopPopup(unseen[0]);
      }
    }

    window.addEventListener('message', handleBridgeMessage);
    window.postMessage({ type: 'NUTRICHECK_REQUEST_SYNC' }, window.location.origin);
    return () => window.removeEventListener('message', handleBridgeMessage);
  }, []);

  // Poll backend for live store extension events when local Python backend is running
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
          triggerTopPopup(unseen[0]);
        }
      } catch {
        // Ignore transient polling hiccups
      }
    }, 2000);

    return () => window.clearInterval(timer);
  }, []);

  async function handleAnalyzeAmazonText(payload: {
    product_title: string;
    nutrition_text: string;
    ingredients_text?: string;
    product_url?: string;
    image_url?: string;
    source_platform?: string;
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
          const candidate = (await res.json()) as AmazonCartEvent;
          if (candidate.status === 'analyzed') {
            ev = candidate;
          }
        } else if (res && res.status === 422) {
          const errBody = await res.json().catch(() => null);
          throw new Error(errBody?.detail || `Invalid product input (${res.status})`);
        }
      }

      if (!ev) {
        ev = await analyzeAmazonItemLocally(payload);
      }

      if (payload.image_url && !ev.image_url) {
        ev.image_url = payload.image_url;
      }
      if (payload.source_platform && !ev.source_platform) {
        ev.source_platform = payload.source_platform;
      }

      seenEventIdsRef.current.add(ev.event_id);
      mergeAmazonEvents([ev]);
      triggerTopPopup(ev);
    } catch (err) {
      setAmazonError(
        err instanceof Error ? err.message : 'Unable to analyze store item.'
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
    if (popupEvent?.event_id === eventId) {
      setPopupEvent(null);
    }
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
    setPopupEvent(null);
    writeStoredAmazonEvents([]);
    window.postMessage({ type: 'NUTRICHECK_CLEAR_AMAZON_EVENTS' }, window.location.origin);
    await fetch('/api/amazon/cart-events', { method: 'DELETE' }).catch(() => {});
  }

  const showTopPopup = Boolean(currentUser && popupEvent);
  const popupStore = popupEvent ? inferStorePlatform(popupEvent) : '';
  const popupAnalysis = popupEvent?.analysis || null;
  const popupProfile =
    popupEvent && popupAnalysis
      ? evaluateProfileAlertsForValues(
          {
            productName: popupEvent.product_title,
            calories: popupAnalysis.nutrition.calories,
            sugars: popupAnalysis.nutrition.sugars,
            sodium_mg: popupAnalysis.nutrition.sodium_mg,
            fat: popupAnalysis.nutrition.fat,
            ingredientsText: popupEvent.ingredients_text || '',
            baseScore: popupAnalysis.health_score,
          },
          currentUser
        )
      : null;

  return (
    <div className="app-shell">
      <ScrollToTop />
      <TopBar />

      {/* Top Add-to-Cart Floating Popup */}
      {showTopPopup && popupEvent && (
        <div
          className="atc-top-popup"
          role="dialog"
          aria-label="Added to Cart Health Alert"
          aria-live="polite"
        >
          <div className="atc-top-popup-bar">
            <div className="atc-top-popup-brand">
              <ShoppingBag size={14} />
              <span>Added to Cart · {popupStore}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {popupProfile ? (
                <span
                  className={`risk-tag ${
                    popupProfile.riskLevel === 'LOW RISK'
                      ? 'is-low'
                      : popupProfile.riskLevel === 'MODERATE RISK'
                      ? 'is-moderate'
                      : 'is-high'
                  }`}
                >
                  {popupProfile.riskLevel}
                </span>
              ) : (
                <span className="risk-tag is-moderate">NEEDS NUTRITION</span>
              )}
              <button
                type="button"
                className="atc-top-popup-close"
                aria-label="Dismiss popup"
                onClick={() => setPopupEvent(null)}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="atc-top-popup-body">
            {popupEvent.image_url && (
              <div className="atc-top-popup-thumb">
                <img
                  src={popupEvent.image_url}
                  alt={popupEvent.product_title}
                  referrerPolicy="no-referrer"
                />
              </div>
            )}

            <div className="atc-top-popup-info">
              <div className="atc-top-popup-title">{popupEvent.product_title}</div>

              {popupEvent.ingredients_text && (
                <div className="atc-top-popup-ingredients">
                  <strong>Ingredients:</strong>{' '}
                  {popupEvent.ingredients_text.replace(/^ingredients\s*[:\-]?\s*/i, '')}
                </div>
              )}

              {popupAnalysis ? (
                <div className="atc-top-popup-macros">
                  <span>{Math.round(popupAnalysis.nutrition.calories)} kcal</span>
                  <span>·</span>
                  <span>{popupAnalysis.nutrition.sugars}g sugar</span>
                  <span>·</span>
                  <span>{popupAnalysis.nutrition.fat}g fat</span>
                  <span>·</span>
                  <span>{Math.round(popupAnalysis.nutrition.sodium_mg)}mg Na</span>
                </div>
              ) : (
                <p className="card-subtitle" style={{ marginTop: 4 }}>
                  {popupEvent.message}
                </p>
              )}

              {popupProfile && (
                <div className="atc-top-popup-note">
                  {popupProfile.alerts[0]}
                </div>
              )}
            </div>
          </div>

          <div className="atc-top-popup-actions">
            {location.pathname !== '/amazon' && location.pathname !== '/connect' && (
              <button
                type="button"
                className="nc-btn-primary"
                style={{ padding: '7px 14px', fontSize: '13px' }}
                onClick={() => navigate('/amazon')}
              >
                <span>View in Store Connect</span>
                <ExternalLink size={13} />
              </button>
            )}
            <button
              type="button"
              className="btn-secondary"
              style={{ padding: '7px 14px', fontSize: '13px' }}
              onClick={() => setPopupEvent(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      <main className="app-main">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route
            path="/dashboard"
            element={
              <RequireAuth>
                <DashboardPage />
              </RequireAuth>
            }
          />
          <Route
            path="/dashboard/:productId"
            element={
              <RequireAuth>
                <ProductDetailPage />
              </RequireAuth>
            }
          />
          <Route
            path="/add-product"
            element={
              <RequireAuth>
                <AddProductPage />
              </RequireAuth>
            }
          />
          <Route
            path="/profile"
            element={
              <RequireAuth>
                <ProfilePage />
              </RequireAuth>
            }
          />
          <Route
            path="/scan"
            element={
              <RequireAuth>
                <ScanPacketPage />
              </RequireAuth>
            }
          />
          <Route
            path="/amazon"
            element={
              <RequireAuth>
                <div className="page-shell">
                  <div className="page-header">
                    <div>
                      <h1 className="page-title">Store Connect</h1>
                      <p className="page-subtitle">
                        Added to cart products from Amazon, Flipkart, Swiggy Instamart,
                        Zomato, and Blinkit with product images, ingredients, and
                        personalized health alerts.
                      </p>
                    </div>
                  </div>
                  <AmazonConnectView
                    events={amazonEvents}
                    isSubmitting={isSubmittingAmazon}
                    submitError={amazonError}
                    onAnalyzeAmazonText={handleAnalyzeAmazonText}
                    onDeleteEvent={handleDeleteAmazonEvent}
                    onClearEvents={handleClearAmazonEvents}
                  />
                </div>
              </RequireAuth>
            }
          />
          <Route path="/connect" element={<Navigate to="/amazon" replace />} />
          <Route path="/analyzer" element={<Navigate to="/" replace />} />
          <Route path="/models" element={<Navigate to="/" replace />} />
          <Route path="/about" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <NutriCheckShell />
      </BrowserRouter>
    </AuthProvider>
  );
}
