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

const USERS_STORAGE_KEY = 'nutricheck_users_v1';
const ACTIVE_USER_ID_KEY = 'nutricheck_active_user_id_v1';
const CUSTOM_PRODUCTS_KEY = 'nutricheck_custom_products_v1';

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
  updateProfile: (input: UpdateProfileInput) => Promise<void>;
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

  function upsertCachedUser(user: UserHealthProfile) {
    const clean = normalizeUser(user);
    setUsers((prev) => {
      const idx = prev.findIndex(
        (u) => u.id === clean.id || u.email.toLowerCase() === clean.email.toLowerCase()
      );
      if (idx === -1) return [...prev, clean];
      const next = [...prev];
      next[idx] = { ...next[idx], ...clean };
      return next;
    });
  }

  useEffect(() => {
    if (!activeUserId) return;
    const userId = activeUserId;
    let cancelled = false;
    async function refreshSession() {
      try {
        const res = await fetch(`/api/auth/me/${encodeURIComponent(userId)}`);
        if (!res.ok) return;
        const body = (await res.json()) as { ok?: boolean; user?: UserHealthProfile };
        if (!cancelled && body.ok && body.user) {
          upsertCachedUser(body.user);
        }
      } catch {
        // Offline / static preview mode relies on local cache
      }
    }
    void refreshSession();
    return () => {
      cancelled = true;
    };
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

      const body = (await res.json().catch(() => null)) as {
        ok?: boolean;
        user?: UserHealthProfile;
        error?: string;
      } | null;

      if (res.ok && body?.ok && body.user) {
        upsertCachedUser(body.user);
        setActiveUserId(body.user.id);
        return { ok: true };
      }

      if (res.status >= 400 && res.status < 500 && body?.error) {
        return { ok: false, error: body.error };
      }
    } catch {
      // Fall back to browser storage when running without API server
    }

    if (users.some((u) => u.email.toLowerCase() === cleanEmail)) {
      return {
        ok: false,
        error: 'An account with this email already exists. Please sign in instead.',
      };
    }

    const newUser: UserHealthProfile = {
      id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      fullName: cleanName,
      email: cleanEmail,
      password: input.password,
      age: Math.round(input.age),
      conditions: input.conditions,
      otherConditions: input.otherConditions || [],
      allergies: input.allergies,
      dietaryNotes: input.dietaryNotes.trim(),
      createdAt: new Date().toISOString(),
    };

    setUsers((prev) => [...prev, newUser]);
    setActiveUserId(newUser.id);
    return { ok: true };
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

      const body = (await res.json().catch(() => null)) as {
        ok?: boolean;
        user?: UserHealthProfile;
        storage?: string;
        error?: string;
      } | null;

      if (res.ok && body?.ok && body.user) {
        upsertCachedUser(body.user);
        setActiveUserId(body.user.id);
        return { ok: true };
      }

      // If MongoDB explicitly rejects credentials, respect it immediately;
      // If memory-fallback had no record yet, check legacy localStorage cache as well.
      if (
        res.status >= 400 &&
        res.status < 500 &&
        body?.error &&
        body.storage === 'mongodb'
      ) {
        return { ok: false, error: body.error };
      }

      const cachedFound = users.find((u) => u.email.toLowerCase() === cleanEmail);
      if (cachedFound && cachedFound.password === password) {
        const mergedConditions = Array.from(
          new Set([...(cachedFound.conditions || []), ...(overrides?.conditions || [])])
        );
        const mergedOther = Array.from(
          new Set([...(cachedFound.otherConditions || []), ...(overrides?.otherConditions || [])])
        );
        upsertCachedUser({
          ...cachedFound,
          conditions: mergedConditions,
          otherConditions: mergedOther,
        });
        setActiveUserId(cachedFound.id);
        return { ok: true };
      }

      if (body?.error) {
        return { ok: false, error: body.error };
      }
    } catch {
      // Offline fallback below
    }

    const found = users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (!found) {
      return { ok: false, error: 'No account found with that email address.' };
    }
    if (found.password !== password) {
      return { ok: false, error: 'Incorrect password. Please try again.' };
    }

    const hasConditionOverrides =
      (overrides?.conditions && overrides.conditions.length > 0) ||
      (overrides?.otherConditions && overrides.otherConditions.length > 0);

    if (hasConditionOverrides) {
      const mergedConditions = Array.from(
        new Set([...(found.conditions || []), ...(overrides?.conditions || [])])
      );
      const mergedOther = Array.from(
        new Set([...(found.otherConditions || []), ...(overrides?.otherConditions || [])])
      );
      setUsers((prev) =>
        prev.map((u) =>
          u.id === found.id
            ? {
                ...u,
                conditions: mergedConditions,
                otherConditions: mergedOther,
              }
            : u
        )
      );
    }

    setActiveUserId(found.id);
    return { ok: true };
  }

  function logout() {
    setActiveUserId(null);
  }

  async function updateProfile(input: UpdateProfileInput): Promise<void> {
    if (!activeUserId) return;

    const cleanUpdates = {
      fullName: input.fullName.trim(),
      age: Number.isFinite(input.age) ? Math.round(input.age) : undefined,
      conditions: input.conditions,
      otherConditions: input.otherConditions ?? [],
      allergies: input.allergies,
      dietaryNotes: input.dietaryNotes.trim(),
    };

    setUsers((prev) =>
      prev.map((u) =>
        u.id === activeUserId
          ? {
              ...u,
              fullName: cleanUpdates.fullName || u.fullName,
              age: cleanUpdates.age ?? u.age,
              conditions: cleanUpdates.conditions,
              otherConditions: input.otherConditions ?? u.otherConditions ?? [],
              allergies: cleanUpdates.allergies,
              dietaryNotes: cleanUpdates.dietaryNotes,
            }
          : u
      )
    );

    try {
      const res = await fetch(`/api/users/${encodeURIComponent(activeUserId)}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanUpdates),
      });
      if (res.ok) {
        const body = (await res.json()) as { ok?: boolean; user?: UserHealthProfile };
        if (body.ok && body.user) {
          upsertCachedUser(body.user);
        }
      }
    } catch {
      // Keep local update if backend unreachable
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
