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

function NutriCheckShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();

  const [amazonEvents, setAmazonEvents] = useState<AmazonCartEvent[]>(() =>
    typeof window !== 'undefined' ? readStoredAmazonEvents() : []
  );
  const [isSubmittingAmazon, setIsSubmittingAmazon] = useState(false);
  const [amazonError, setAmazonError] = useState<string | null>(null);
  const [amazonNotice, setAmazonNotice] = useState<{
    level: 'success' | 'warning' | 'danger' | 'info';
    title: string;
    message: string;
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

  function inferStorePlatform(ev: AmazonCartEvent): string {
    if (ev.source_platform) return ev.source_platform;
    const hay = `${ev.product_url || ''} ${ev.source || ''}`.toLowerCase();
    if (hay.includes('flipkart')) return 'Flipkart';
    if (hay.includes('instamart')) return 'Swiggy Instamart';
    if (hay.includes('swiggy')) return 'Swiggy';
    if (hay.includes('zomato')) return 'Zomato';
    if (hay.includes('blinkit')) return 'Blinkit';
    if (hay.includes('amazon')) return 'Amazon';
    return 'Store';
  }

  function handleIncomingAmazonEvent(ev: AmazonCartEvent, showBanner = true) {
    const storeName = inferStorePlatform(ev);
    if (ev.status === 'analyzed' && ev.analysis) {
      if (showBanner) {
        const verdictWord =
          ev.analysis.classification === 'Healthy'
            ? 'Good'
            : ev.analysis.classification === 'Moderate'
            ? 'Moderate'
            : 'Not Good';
        setAmazonNotice({
          level: ev.analysis.cart_alert.level,
          title: `${storeName} Item Checked: ${verdictWord} (${ev.analysis.health_score}/100)`,
          message: ev.message || `${ev.product_title} — ${ev.analysis.explanation}`,
        });
      }
      return;
    }

    if (showBanner) {
      setAmazonNotice({
        level: 'warning',
        title: `${storeName} Item Captured: ${ev.product_title}`,
        message:
          ev.message ||
          `Nutrition label numbers were not found on the ${storeName} page. Open Store Connect to paste label numbers or ingredients.`,
      });
    }
  }

  useEffect(() => {
    let cancelled = false;

    const params = new URLSearchParams(window.location.search);
    const itemName = params.get('item') || params.get('food');

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
            handleIncomingAmazonEvent(matchingExisting, true);
            navigate('/amazon');
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
        handleIncomingAmazonEvent(unseen[0], true);
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
          handleIncomingAmazonEvent(unseen[0], true);
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

      seenEventIdsRef.current.add(ev.event_id);
      mergeAmazonEvents([ev]);
      handleIncomingAmazonEvent(ev, true);
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

  const showLiveNotice = Boolean(
    currentUser && amazonNotice && location.pathname !== '/'
  );

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
              {location.pathname !== '/amazon' && location.pathname !== '/connect' && (
                <button
                  type="button"
                  className="alert-dismiss-btn"
                  onClick={() => navigate('/amazon')}
                >
                  Open Store Connect
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
                      <h1 className="page-title">Online Store &amp; Food Extension</h1>
                      <p className="page-subtitle">
                        Analyze products directly on Amazon, Flipkart, Swiggy Instamart,
                        Zomato, and Blinkit personalized to your health profile.
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
