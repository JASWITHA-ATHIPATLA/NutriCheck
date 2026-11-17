import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
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
import { DailyTrackerPage } from './pages/DailyTrackerPage';
import { DashboardPage } from './pages/DashboardPage';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { NutritionLimitsPage } from './pages/NutritionLimitsPage';
import { PrescriptionsPage } from './pages/PrescriptionsPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { ProfilePage } from './pages/ProfilePage';
import { RegisterPage } from './pages/RegisterPage';
import { ScanPacketPage } from './pages/ScanPacketPage';
import { evaluateProfileAlertsForValues } from './utils/healthProfileEngine';
import { analyzeAmazonItemLocally } from './utils/localNutritionEngine';
import { evaluateProductAgainstActiveProfileClient } from './utils/prescriptionUtils';
import type { ActivePrescriptionSummary, AmazonCartEvent } from './types';

const LEGACY_AMAZON_STORAGE_KEY = 'nutricheck_amazon_events_v1';

function getAmazonStorageKey(userId: string): string {
  return `${LEGACY_AMAZON_STORAGE_KEY}_${userId}`;
}

function readStoredAmazonEvents(userId: string | null | undefined): AmazonCartEvent[] {
  if (!userId) return [];
  try {
    // Clean up legacy shared global key so items never leak across accounts
    window.localStorage.removeItem(LEGACY_AMAZON_STORAGE_KEY);
    const raw = window.localStorage.getItem(getAmazonStorageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((ev) => ev && (!ev.user_id || ev.user_id === userId));
  } catch {
    return [];
  }
}

function writeStoredAmazonEvents(userId: string | null | undefined, events: AmazonCartEvent[]) {
  if (!userId) return;
  try {
    window.localStorage.setItem(
      getAmazonStorageKey(userId),
      JSON.stringify(events.slice(0, 30))
    );
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

function formatRxConditionPhrase(
  warnings: Array<{ conditionKey?: string; conditionName?: string }>
): string {
  if (!Array.isArray(warnings) || warnings.length === 0) {
    return 'an active health condition';
  }
  const medical = warnings.filter(
    (w) =>
      w &&
      w.conditionName &&
      !String(w.conditionKey || '').startsWith('avoid_') &&
      !String(w.conditionKey || '').startsWith('low_') &&
      !String(w.conditionKey || '').startsWith('soft_')
  );
  const source = medical.length > 0 ? medical : warnings;
  const names: string[] = [];
  const seen = new Set<string>();
  for (const w of source) {
    const raw = String(w?.conditionName || '').trim();
    if (!raw) continue;
    const key = raw.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      names.push(raw);
    }
  }
  if (names.length === 0) return 'an active health condition';
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
}

function NutriCheckShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const activeUserId = currentUser?.id || null;

  const [amazonEvents, setAmazonEvents] = useState<AmazonCartEvent[]>(() =>
    typeof window !== 'undefined' && activeUserId
      ? readStoredAmazonEvents(activeUserId)
      : []
  );
  const [isSubmittingAmazon, setIsSubmittingAmazon] = useState(false);
  const [amazonError, setAmazonError] = useState<string | null>(null);
  const [popupEvent, setPopupEvent] = useState<AmazonCartEvent | null>(null);
  const [activePrescriptionSummary, setActivePrescriptionSummary] =
    useState<ActivePrescriptionSummary | null>(null);

  const seenEventIdsRef = useRef<Set<string>>(new Set());
  const initializedEventsRef = useRef(false);
  const backendAvailableRef = useRef<boolean>(true);
  const popupTimerRef = useRef<number | null>(null);

  function mergeAmazonEvents(incoming: AmazonCartEvent[], userId: string | null) {
    if (!incoming.length || !userId) return;
    const userFiltered = incoming
      .filter((ev) => ev?.event_id && (!ev.user_id || ev.user_id === userId))
      .map((ev) => ({ ...ev, user_id: ev.user_id || userId }));
    if (!userFiltered.length) return;

    setAmazonEvents((prev) => {
      const byId = new Map<string, AmazonCartEvent>();
      for (const ev of [...userFiltered, ...prev]) {
        if (ev?.event_id && (!ev.user_id || ev.user_id === userId) && !byId.has(ev.event_id)) {
          byId.set(ev.event_id, ev);
        }
      }
      const merged = Array.from(byId.values())
        .sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''))
        .slice(0, 30);

      const unchanged =
        merged.length === prev.length &&
        merged.every(
          (item, i) =>
            item.event_id === prev[i]?.event_id &&
            item.timestamp === prev[i]?.timestamp &&
            item.status === prev[i]?.status &&
            item.queued_food_log_id === prev[i]?.queued_food_log_id &&
            item.analysis?.health_score === prev[i]?.analysis?.health_score
        );
      if (unchanged) return prev;

      writeStoredAmazonEvents(userId, merged);
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

  // Sync active user ID to Chrome extension bridge & reload per-user cart + active prescriptions
  useEffect(() => {
    let cancelled = false;

    seenEventIdsRef.current = new Set();
    initializedEventsRef.current = false;
    setPopupEvent(null);
    setAmazonError(null);

    window.postMessage(
      { type: 'NUTRICHECK_SET_ACTIVE_USER', userId: activeUserId },
      window.location.origin
    );

    if (!activeUserId) {
      setAmazonEvents([]);
      setActivePrescriptionSummary(null);
      window.postMessage(
        { type: 'NUTRICHECK_SYNC_PRESCRIPTIONS', userId: null, summary: null },
        window.location.origin
      );
      return () => {
        cancelled = true;
      };
    }

    fetch(`/api/prescriptions/active?userId=${encodeURIComponent(activeUserId)}`, {
      headers: { 'X-User-Id': activeUserId },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((summary) => {
        if (cancelled || !summary) return;
        setActivePrescriptionSummary(summary);
        window.postMessage(
          { type: 'NUTRICHECK_SYNC_PRESCRIPTIONS', userId: activeUserId, summary },
          window.location.origin
        );
      })
      .catch(() => {});

    const initialStored = readStoredAmazonEvents(activeUserId);
    initialStored.forEach((ev) => seenEventIdsRef.current.add(ev.event_id));
    setAmazonEvents(initialStored);

    const params = new URLSearchParams(window.location.search);
    const itemName = params.get('item') || params.get('food');
    const urlImage = params.get('image_url') || undefined;
    const urlIngredients = params.get('ingredients') || undefined;

    async function loadInitialEvents() {
      if (!activeUserId) return;
      try {
        const eventsRes = await fetch(
          `/api/amazon/cart-events?userId=${encodeURIComponent(activeUserId)}`,
          { headers: { 'X-User-Id': activeUserId } }
        ).catch(() => null);
        backendAvailableRef.current = Boolean(eventsRes && eventsRes.ok);

        let loadedEvents: AmazonCartEvent[] = [...initialStored];
        if (!cancelled && eventsRes?.ok) {
          const apiEvents: AmazonCartEvent[] = await eventsRes.json();
          mergeAmazonEvents(apiEvents, activeUserId);
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
  }, [activeUserId]);

  // Listen to real-time Chrome Extension tab bridge sync strictly for the active user
  useEffect(() => {
    function handleBridgeMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      const msg = event.data;
      if (!msg) return;
      if (msg.type === 'NUTRICHECK_SYNC_PRESCRIPTIONS') {
        if (!activeUserId || msg.userId === activeUserId || msg.userId === null) {
          const nextSummary = msg.summary || null;
          setActivePrescriptionSummary((prev) => {
            if (prev === nextSummary) return prev;
            if (prev && nextSummary && JSON.stringify(prev) === JSON.stringify(nextSummary)) {
              return prev;
            }
            return nextSummary;
          });
        }
        return;
      }
      if (msg.type !== 'NUTRICHECK_AMAZON_SYNC' || !Array.isArray(msg.events)) return;
      if (!activeUserId) return;

      const incoming = (msg.events as AmazonCartEvent[]).filter(
        (ev) => ev?.event_id && ev.user_id && ev.user_id === activeUserId
      );
      if (incoming.length === 0) return;

      const unseen = incoming.filter((ev) => !seenEventIdsRef.current.has(ev.event_id));
      incoming.forEach((ev) => seenEventIdsRef.current.add(ev.event_id));
      mergeAmazonEvents(incoming, activeUserId);

      if (unseen.length > 0) {
        triggerTopPopup(unseen[0]);
      }
    }

    window.addEventListener('message', handleBridgeMessage);
    if (activeUserId) {
      window.postMessage(
        { type: 'NUTRICHECK_REQUEST_SYNC', userId: activeUserId },
        window.location.origin
      );
    }
    return () => window.removeEventListener('message', handleBridgeMessage);
  }, [activeUserId]);

  // Poll backend strictly for active user's Store Connect events
  useEffect(() => {
    if (!activeUserId) return;
    const timer = window.setInterval(async () => {
      if (!backendAvailableRef.current) return;
      try {
        const res = await fetch(
          `/api/amazon/cart-events?userId=${encodeURIComponent(activeUserId)}`,
          { headers: { 'X-User-Id': activeUserId } }
        );
        if (!res.ok) {
          if (res.status === 404 || res.status === 405) {
            backendAvailableRef.current = false;
          }
          return;
        }
        const latest: AmazonCartEvent[] = await res.json();
        mergeAmazonEvents(latest, activeUserId);

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
  }, [activeUserId]);

  async function handleAnalyzeAmazonText(payload: {
    product_title: string;
    nutrition_text: string;
    ingredients_text?: string;
    product_url?: string;
    image_url?: string;
    source_platform?: string;
  }) {
    if (!activeUserId) return;
    setIsSubmittingAmazon(true);
    setAmazonError(null);
    try {
      let ev: AmazonCartEvent | null = null;
      if (backendAvailableRef.current) {
        const res = await fetch('/api/amazon/add-to-cart', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Id': activeUserId,
          },
          body: JSON.stringify({
            ...payload,
            user_id: activeUserId,
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
        ev = await analyzeAmazonItemLocally({
          ...payload,
          user_id: activeUserId,
        });
      }

      ev.user_id = activeUserId;
      if (payload.image_url && !ev.image_url) {
        ev.image_url = payload.image_url;
      }
      if (payload.source_platform && !ev.source_platform) {
        ev.source_platform = payload.source_platform;
      }

      seenEventIdsRef.current.add(ev.event_id);
      mergeAmazonEvents([ev], activeUserId);
      triggerTopPopup(ev);
    } catch (err) {
      setAmazonError(
        err instanceof Error ? err.message : 'Unable to analyze store item.'
      );
    } finally {
      setIsSubmittingAmazon(false);
    }
  }

  async function handleUpdateAmazonEvent(
    eventId: string,
    payload: {
      product_title: string;
      ingredients_text?: string;
      nutrition_text?: string;
      calories?: number;
      sugars?: number;
      fat?: number;
      protein?: number;
      sodium_mg?: number;
      image_url?: string;
      product_url?: string;
      source_platform?: string;
    }
  ) {
    if (!activeUserId) return;
    const existing = amazonEvents.find((e) => e.event_id === eventId);
    const mergedPayload = {
      product_title: payload.product_title || existing?.product_title || 'Food Item',
      ingredients_text: payload.ingredients_text,
      nutrition_text: payload.nutrition_text,
      calories: payload.calories,
      sugars: payload.sugars,
      fat: payload.fat,
      protein: payload.protein,
      sodium_mg: payload.sodium_mg,
      image_url: payload.image_url || existing?.image_url || undefined,
      product_url: payload.product_url || existing?.product_url || undefined,
      source_platform: payload.source_platform || existing?.source_platform || undefined,
      user_id: activeUserId,
    };

    let updated: AmazonCartEvent | null = null;
    if (backendAvailableRef.current) {
      const res = await fetch(
        `/api/amazon/cart-events/${encodeURIComponent(eventId)}?userId=${encodeURIComponent(activeUserId)}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Id': activeUserId,
          },
          body: JSON.stringify(mergedPayload),
        }
      ).catch(() => null);
      if (res?.ok) {
        updated = (await res.json()) as AmazonCartEvent;
      }
    }

    if (!updated) {
      updated = await analyzeAmazonItemLocally({
        ...mergedPayload,
        event_id: eventId,
        user_id: activeUserId,
        skipGenericFallback: true,
      });
    }

    updated.user_id = activeUserId;
    if (existing?.image_url && !updated.image_url) updated.image_url = existing.image_url;
    if (existing?.product_url && !updated.product_url) updated.product_url = existing.product_url;
    if (existing?.source_platform && !updated.source_platform) {
      updated.source_platform = existing.source_platform;
    }

    const finalUpdated = updated;
    setAmazonEvents((prev) => {
      const existsInPrev = prev.some((e) => e.event_id === eventId);
      const next = existsInPrev
        ? prev.map((e) => (e.event_id === eventId ? finalUpdated : e))
        : [finalUpdated, ...prev];
      writeStoredAmazonEvents(activeUserId, next);
      return next;
    });

    if (popupEvent?.event_id === eventId) {
      setPopupEvent(finalUpdated);
    }

    window.postMessage(
      { type: 'NUTRICHECK_UPDATE_AMAZON_EVENT', event: finalUpdated },
      window.location.origin
    );
  }

  async function handleDeleteAmazonEvent(eventId: string) {
    if (!activeUserId) return;
    setAmazonEvents((prev) => {
      const next = prev.filter((e) => e.event_id !== eventId);
      writeStoredAmazonEvents(activeUserId, next);
      return next;
    });
    if (popupEvent?.event_id === eventId) {
      setPopupEvent(null);
    }
    window.postMessage(
      { type: 'NUTRICHECK_DELETE_AMAZON_EVENT', eventId, userId: activeUserId },
      window.location.origin
    );
    await fetch(
      `/api/amazon/cart-events/${encodeURIComponent(eventId)}?userId=${encodeURIComponent(activeUserId)}`,
      { method: 'DELETE', headers: { 'X-User-Id': activeUserId } }
    ).catch(() => {});
  }

  async function handleClearAmazonEvents() {
    if (!activeUserId) return;
    setAmazonEvents([]);
    setPopupEvent(null);
    writeStoredAmazonEvents(activeUserId, []);
    window.postMessage(
      { type: 'NUTRICHECK_CLEAR_AMAZON_EVENTS', userId: activeUserId },
      window.location.origin
    );
    await fetch(
      `/api/amazon/cart-events?userId=${encodeURIComponent(activeUserId)}`,
      { method: 'DELETE', headers: { 'X-User-Id': activeUserId } }
    ).catch(() => {});
  }

  async function handleCancelPopupProduct(ev: AmazonCartEvent) {
    setPopupEvent(null);
    await handleDeleteAmazonEvent(ev.event_id);
    if (activeUserId && ev.queued_food_log_id) {
      await fetch(
        `/api/food-logs/${encodeURIComponent(ev.queued_food_log_id)}?userId=${encodeURIComponent(activeUserId)}`,
        { method: 'DELETE', headers: { 'X-User-Id': activeUserId } }
      ).catch(() => {});
    }
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

  const hasUploadedPrescription =
    activePrescriptionSummary === null
      ? Boolean(popupEvent?.prescription_alerts?.hasWarnings)
      : activePrescriptionSummary.activeConditions.length > 0 ||
        activePrescriptionSummary.dietaryRestrictions.length > 0;

  const popupRxAlert =
    popupEvent && hasUploadedPrescription
      ? popupEvent.prescription_alerts?.hasWarnings
        ? popupEvent.prescription_alerts
        : evaluateProductAgainstActiveProfileClient({
            productTitle: popupEvent.product_title,
            ingredientsText: popupEvent.ingredients_text || '',
            nutrition: popupAnalysis?.nutrition || null,
            activeConditions: activePrescriptionSummary?.activeConditions || [],
            dietaryRestrictions: activePrescriptionSummary?.dietaryRestrictions || [],
          })
      : null;

  const showRxWarningPopup = Boolean(
    popupRxAlert?.hasWarnings && popupRxAlert.warnings.length > 0
  );

  return (
    <div className="app-shell">
      <ScrollToTop />
      <TopBar />

      {/* Top Add-to-Cart Floating Popup */}
      {showTopPopup && popupEvent && showRxWarningPopup && popupRxAlert && (
        <div
          className="atc-top-popup is-rx-warning"
          role="dialog"
          aria-label="NutriCheck – Health Alert"
          aria-live="polite"
        >
          <div className="atc-rx-warn-header">
            <div className="atc-rx-warn-brand">
              <AlertTriangle size={18} className="atc-rx-warn-icon" />
              <span>NutriCheck – Health Alert</span>
            </div>
            <span className="atc-rx-warn-badge">Health warning</span>
          </div>

          <div className="atc-rx-warn-headline">Be careful with this product!</div>

          <p className="atc-rx-warn-copy">
            Your recent prescription mentions{' '}
            <strong>{formatRxConditionPhrase(popupRxAlert.warnings)}</strong>.
          </p>
          <p className="atc-rx-warn-copy">
            You are trying to add {popupEvent.product_title} to your {popupStore} cart.
          </p>
          <p className="atc-rx-warn-copy">
            Consider whether this product is suitable for your current health condition.
          </p>

          <p className="atc-rx-warn-disclaimer">
            This is a precautionary reminder, not a medical diagnosis or a confirmed food
            restriction.
          </p>

          <div className="atc-rx-warn-actions">
            <button
              type="button"
              className="atc-rx-warn-cancel"
              onClick={() => void handleCancelPopupProduct(popupEvent)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="atc-rx-warn-continue"
              onClick={() => setPopupEvent(null)}
            >
              Continue Anyway
            </button>
          </div>
        </div>
      )}

      {showTopPopup && popupEvent && !showRxWarningPopup && (
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
                  {popupEvent.ingredients_text.replace(
                    /^ingredients(?:\s*\/\s*dish\s*notes)?\s*[:\-]?\s*/i,
                    ''
                  )}
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

              {popupEvent.queued_food_log_id && (
                <div className="atc-tracker-note">
                  Added to{' '}
                  <button
                    type="button"
                    className="sc-text-link-btn"
                    onClick={() => {
                      setPopupEvent(null);
                      navigate('/tracker');
                    }}
                  >
                    Daily Food Tracker →
                  </button>{' '}
                  for consumption confirmation.
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
            path="/limits"
            element={
              <RequireAuth>
                <NutritionLimitsPage events={amazonEvents} />
              </RequireAuth>
            }
          />
          <Route
            path="/scan"
            element={
              <RequireAuth>
                <ScanPacketPage onSavePacketToStoreConnect={handleUpdateAmazonEvent} />
              </RequireAuth>
            }
          />
          <Route
            path="/prescriptions"
            element={
              <RequireAuth>
                <PrescriptionsPage
                  onProfileSynced={setActivePrescriptionSummary}
                />
              </RequireAuth>
            }
          />
          <Route
            path="/tracker"
            element={
              <RequireAuth>
                <DailyTrackerPage />
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
                        Shop smarter. Make healthier choices.
                      </p>
                    </div>
                  </div>
                  <AmazonConnectView
                    events={amazonEvents}
                    activePrescriptions={activePrescriptionSummary}
                    isSubmitting={isSubmittingAmazon}
                    submitError={amazonError}
                    onAnalyzeAmazonText={handleAnalyzeAmazonText}
                    onUpdateEvent={handleUpdateAmazonEvent}
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
