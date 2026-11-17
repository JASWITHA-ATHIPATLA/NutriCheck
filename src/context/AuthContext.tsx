import React, { createContext, useContext, useEffect, useState } from 'react';
import type {
  CatalogProduct,
  HealthCondition,
  PersonalizedCheckResult,
  UserHealthProfile,
} from '../types';
import {
  SEEDED_CATALOG_PRODUCTS,
  evaluateProductForProfile,
} from '../utils/healthProfileEngine';
import { buildNonJsonErrorMessage, readJsonResponse } from '../utils/safeFetchJson';

const USERS_STORAGE_KEY = 'nutricheck_users_v1';
const ACTIVE_USER_ID_KEY = 'nutricheck_active_user_id_v1';
const CUSTOM_PRODUCTS_KEY = 'nutricheck_custom_products_v1';
const AMAZON_STORAGE_PREFIX = 'nutricheck_amazon_events_v1_';

interface RegisterInput {
  fullName: string;
  email: string;
  password: string;
  age: number;
  conditions: HealthCondition[];
  otherConditions?: string[];
  allergies: string[];
  dietaryNotes: string;
}

interface UpdateProfileInput {
  fullName: string;
  age: number;
  conditions: HealthCondition[];
  otherConditions?: string[];
  allergies: string[];
  dietaryNotes: string;
}

interface LoginOverrides {
  conditions?: HealthCondition[];
  otherConditions?: string[];
}

interface AuthActionResult {
  ok: boolean;
  error?: string;
}

interface AuthContextValue {
  currentUser: UserHealthProfile | null;
  products: CatalogProduct[];
  register: (input: RegisterInput) => Promise<AuthActionResult>;
  login: (
    email: string,
    password: string,
    overrides?: LoginOverrides
  ) => Promise<AuthActionResult>;
  logout: () => void;
  updateProfile: (input: UpdateProfileInput) => Promise<AuthActionResult>;
  addCustomProduct: (product: Omit<CatalogProduct, 'id' | 'isCustom'>) => CatalogProduct;
  evaluateProduct: (product: CatalogProduct) => PersonalizedCheckResult;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readJsonStorage<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function normalizeUser(user: UserHealthProfile): UserHealthProfile {
  return {
    ...user,
    conditions: Array.isArray(user.conditions) ? user.conditions : [],
    otherConditions: Array.isArray(user.otherConditions) ? user.otherConditions : [],
    allergies: Array.isArray(user.allergies) ? user.allergies : [],
    dietaryNotes: user.dietaryNotes || '',
  };
}

function migrateLocalUserStorage(oldId: string, newId: string) {
  if (!oldId || !newId || oldId === newId) return;
  try {
    const oldKey = `${AMAZON_STORAGE_PREFIX}${oldId}`;
    const newKey = `${AMAZON_STORAGE_PREFIX}${newId}`;
    const oldRaw = window.localStorage.getItem(oldKey);
    if (!oldRaw) return;
    const oldEvents = JSON.parse(oldRaw);
    if (!Array.isArray(oldEvents) || oldEvents.length === 0) return;

    const existingRaw = window.localStorage.getItem(newKey);
    const existingEvents = existingRaw ? JSON.parse(existingRaw) : [];
    const mergedMap = new Map<string, Record<string, unknown>>();
    for (const ev of Array.isArray(existingEvents) ? existingEvents : []) {
      if (ev?.event_id) mergedMap.set(ev.event_id, ev);
    }
    for (const ev of oldEvents) {
      if (ev?.event_id && !mergedMap.has(ev.event_id)) {
        mergedMap.set(ev.event_id, { ...ev, user_id: newId });
      }
    }
    window.localStorage.setItem(newKey, JSON.stringify(Array.from(mergedMap.values()).slice(0, 30)));
    window.localStorage.removeItem(oldKey);
  } catch {
    // ignore storage errors
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = useState<UserHealthProfile[]>(() =>
    typeof window !== 'undefined'
      ? readJsonStorage<UserHealthProfile[]>(USERS_STORAGE_KEY, []).map(normalizeUser)
      : []
  );

  const [activeUserId, setActiveUserId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      return window.localStorage.getItem(ACTIVE_USER_ID_KEY);
    } catch {
      return null;
    }
  });

  const [customProducts, setCustomProducts] = useState<CatalogProduct[]>(() =>
    typeof window !== 'undefined'
      ? readJsonStorage<CatalogProduct[]>(CUSTOM_PRODUCTS_KEY, [])
      : []
  );

  function upsertCachedUser(user: UserHealthProfile, replaceId?: string) {
    const clean = normalizeUser(user);
    setUsers((prev) => {
      const idx = prev.findIndex(
        (u) =>
          u.id === clean.id ||
          (replaceId && u.id === replaceId) ||
          u.email.toLowerCase() === clean.email.toLowerCase()
      );
      if (idx === -1) return [...prev, clean];
      const merged = { ...prev[idx], ...clean };
      if (JSON.stringify(prev[idx]) === JSON.stringify(merged)) {
        return prev;
      }
      const next = [...prev];
      next[idx] = merged;
      return next;
    });
    if (replaceId && replaceId !== clean.id) {
      migrateLocalUserStorage(replaceId, clean.id);
      setActiveUserId((curr) => (curr === replaceId ? clean.id : curr));
    }
  }

  useEffect(() => {
    if (!activeUserId) return;
    const userId = activeUserId;
    let cancelled = false;

    async function refreshSession() {
      try {
        const res = await fetch(`/api/auth/me/${encodeURIComponent(userId)}`);
        if (res.ok) {
          const { data: body } = await readJsonResponse<{
            ok?: boolean;
            user?: UserHealthProfile;
          }>(res);
          if (!cancelled && body?.ok && body.user) {
            upsertCachedUser(body.user, userId);
          }
          return;
        }

        // Auto-migrate legacy client-cached user (e.g. user-...) to MongoDB
        if (res.status === 404) {
          const cached = users.find((u) => u.id === userId);
          if (cached && cached.email) {
            const syncRes = await fetch('/api/auth/sync', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                legacyId: cached.id,
                fullName: cached.fullName,
                email: cached.email,
                password: cached.password,
                age: cached.age,
                conditions: cached.conditions,
                otherConditions: cached.otherConditions || [],
                allergies: cached.allergies,
                dietaryNotes: cached.dietaryNotes,
              }),
            });
            if (syncRes.ok) {
              const { data: syncBody } = await readJsonResponse<{
                ok?: boolean;
                user?: UserHealthProfile;
              }>(syncRes);
              if (!cancelled && syncBody?.ok && syncBody.user) {
                upsertCachedUser(syncBody.user, userId);
              }
            }
          }
        }
      } catch {
        // Offline / static preview mode relies on local cache
      }
    }

    void refreshSession();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeUserId]);

  useEffect(() => {
    try {
      window.localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    } catch {
      // ignore quota errors
    }
  }, [users]);

  useEffect(() => {
    try {
      if (activeUserId) {
        window.localStorage.setItem(ACTIVE_USER_ID_KEY, activeUserId);
      } else {
        window.localStorage.removeItem(ACTIVE_USER_ID_KEY);
      }
    } catch {
      // ignore
    }
  }, [activeUserId]);

  useEffect(() => {
    try {
      window.localStorage.setItem(CUSTOM_PRODUCTS_KEY, JSON.stringify(customProducts));
    } catch {
      // ignore
    }
  }, [customProducts]);

  const currentUser = users.find((u) => u.id === activeUserId) || null;
  const products = [...customProducts, ...SEEDED_CATALOG_PRODUCTS];

  async function register(input: RegisterInput): Promise<AuthActionResult> {
    const cleanEmail = input.email.trim().toLowerCase();
    const cleanName = input.fullName.trim();

    if (!cleanName) return { ok: false, error: 'Please enter your full name.' };
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { ok: false, error: 'Please enter a valid email address.' };
    }
    if (input.password.length < 6) {
      return { ok: false, error: 'Password must be at least 6 characters.' };
    }
    if (!Number.isFinite(input.age) || input.age < 1 || input.age > 120) {
      return { ok: false, error: 'Please enter a valid age (1–120).' };
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: cleanName,
          email: cleanEmail,
          password: input.password,
          age: Math.round(input.age),
          conditions: input.conditions,
          otherConditions: input.otherConditions || [],
          allergies: input.allergies,
          dietaryNotes: input.dietaryNotes.trim(),
        }),
      });

      const { data: body } = await readJsonResponse<{
        ok?: boolean;
        user?: UserHealthProfile;
        error?: string;
      }>(res);

      if (res.ok && body?.ok && body.user) {
        upsertCachedUser(body.user);
        setActiveUserId(body.user.id);
        return { ok: true };
      }

      return {
        ok: false,
        error: body?.error || buildNonJsonErrorMessage(res, 'Unable to create account in backend'),
      };
    } catch {
      return {
        ok: false,
        error: 'Unable to reach NutriCheck backend server to save your account.',
      };
    }
  }

  async function login(
    email: string,
    password: string,
    overrides?: LoginOverrides
  ): Promise<AuthActionResult> {
    const cleanEmail = email.trim().toLowerCase();

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          password,
          conditions: overrides?.conditions,
          otherConditions: overrides?.otherConditions,
        }),
      });

      const { data: body } = await readJsonResponse<{
        ok?: boolean;
        user?: UserHealthProfile;
        storage?: string;
        reason?: string;
        error?: string;
      }>(res);

      if (res.ok && body?.ok && body.user) {
        upsertCachedUser(body.user);
        setActiveUserId(body.user.id);
        return { ok: true };
      }

      // If MongoDB rejected password for an existing account, fail immediately
      if (body?.reason === 'invalid_password') {
        return { ok: false, error: body.error || 'Incorrect password. Please try again.' };
      }

      // If user only existed in legacy browser localStorage, migrate them into MongoDB now
      const cachedFound = users.find((u) => u.email.toLowerCase() === cleanEmail);
      if (cachedFound && (!cachedFound.password || cachedFound.password === password)) {
        const mergedConditions = Array.from(
          new Set([...(cachedFound.conditions || []), ...(overrides?.conditions || [])])
        );
        const mergedOther = Array.from(
          new Set([...(cachedFound.otherConditions || []), ...(overrides?.otherConditions || [])])
        );

        const syncRes = await fetch('/api/auth/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            legacyId: cachedFound.id,
            fullName: cachedFound.fullName,
            email: cachedFound.email,
            password,
            age: cachedFound.age,
            conditions: mergedConditions,
            otherConditions: mergedOther,
            allergies: cachedFound.allergies,
            dietaryNotes: cachedFound.dietaryNotes,
          }),
        });
        const { data: syncBody } = await readJsonResponse<{
          ok?: boolean;
          user?: UserHealthProfile;
          error?: string;
        }>(syncRes);

        if (syncRes.ok && syncBody?.ok && syncBody.user) {
          upsertCachedUser(syncBody.user, cachedFound.id);
          setActiveUserId(syncBody.user.id);
          return { ok: true };
        }

        if (syncBody?.error) {
          return { ok: false, error: syncBody.error };
        }
      }

      return {
        ok: false,
        error: body?.error || buildNonJsonErrorMessage(res, 'Sign in failed'),
      };
    } catch {
      return {
        ok: false,
        error: 'Unable to reach NutriCheck backend server to sign in.',
      };
    }
  }

  function logout() {
    setActiveUserId(null);
  }

  async function updateProfile(input: UpdateProfileInput): Promise<AuthActionResult> {
    if (!activeUserId) {
      return { ok: false, error: 'No signed-in user session.' };
    }

    const targetUser = users.find((u) => u.id === activeUserId);
    const cleanUpdates = {
      fullName: input.fullName.trim(),
      age: Number.isFinite(input.age) ? Math.round(input.age) : undefined,
      conditions: input.conditions,
      otherConditions: input.otherConditions ?? [],
      allergies: input.allergies,
      dietaryNotes: input.dietaryNotes.trim(),
      ...(targetUser?.email ? { email: targetUser.email } : {}),
      ...(targetUser?.password ? { password: targetUser.password } : {}),
    };

    try {
      const res = await fetch(`/api/users/${encodeURIComponent(activeUserId)}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanUpdates),
      });

      const { data: body } = await readJsonResponse<{
        ok?: boolean;
        user?: UserHealthProfile;
        error?: string;
      }>(res);

      if (res.ok && body?.ok && body.user) {
        upsertCachedUser(body.user, activeUserId);
        return { ok: true };
      }

      return {
        ok: false,
        error: body?.error || buildNonJsonErrorMessage(res, 'Unable to save profile details to backend'),
      };
    } catch {
      return {
        ok: false,
        error: 'Network error: unable to reach backend server to save your profile.',
      };
    }
  }

  function addCustomProduct(
    product: Omit<CatalogProduct, 'id' | 'isCustom'>
  ): CatalogProduct {
    const slug = product.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40);
    const created: CatalogProduct = {
      ...product,
      id: `${slug || 'custom-product'}-${Date.now().toString(36)}`,
      isCustom: true,
    };
    setCustomProducts((prev) => [created, ...prev]);
    return created;
  }

  function evaluateProduct(product: CatalogProduct): PersonalizedCheckResult {
    return evaluateProductForProfile(product, currentUser);
  }

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        products,
        register,
        login,
        logout,
        updateProfile,
        addCustomProduct,
        evaluateProduct,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return ctx;
}
