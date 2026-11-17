import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import mongoose from 'mongoose';
import {
  CartEventModel,
  FoodLogModel,
  PrescriptionModel,
  UserModel,
  connectMongoDB,
} from './mongodb.mjs';

const VALID_CONDITIONS = new Set([
  'diabetes',
  'hypertension',
  'heart_disease',
  'kidney_disease',
  'obesity',
]);

// Fallback in-memory store used only when MONGODB_URI is not set/reachable in preview
const memoryUsersById = new Map();
const memoryUsersByEmail = new Map();

export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(String(password), salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, keyHex] = storedHash.split(':');
  if (!salt || !keyHex) return false;
  try {
    const keyBuf = Buffer.from(keyHex, 'hex');
    const derivedBuf = scryptSync(String(password), salt, 64);
    if (keyBuf.length !== derivedBuf.length) return false;
    return timingSafeEqual(keyBuf, derivedBuf);
  } catch {
    return false;
  }
}

function cleanStringArray(arr) {
  if (!Array.isArray(arr)) return [];
  const seen = new Set();
  const out = [];
  for (const item of arr) {
    const clean = String(item || '').trim();
    if (clean && !seen.has(clean.toLowerCase())) {
      seen.add(clean.toLowerCase());
      out.push(clean);
    }
  }
  return out;
}

function cleanConditions(arr) {
  if (!Array.isArray(arr)) return [];
  return Array.from(
    new Set(arr.map((c) => String(c || '').trim()).filter((c) => VALID_CONDITIONS.has(c)))
  );
}

export function sanitizeUserDoc(doc) {
  if (!doc) return null;
  const rawId = doc._id ? String(doc._id) : String(doc.id);
  return {
    id: rawId,
    ...(doc.legacyId ? { legacyId: String(doc.legacyId) } : {}),
    fullName: String(doc.fullName || '').trim(),
    email: String(doc.email || '').trim().toLowerCase(),
    age: Number(doc.age) || 30,
    conditions: cleanConditions(doc.conditions),
    otherConditions: cleanStringArray(doc.otherConditions),
    allergies: cleanStringArray(doc.allergies),
    dietaryNotes: String(doc.dietaryNotes || '').trim(),
    createdAt: doc.createdAt
      ? new Date(doc.createdAt).toISOString()
      : new Date().toISOString(),
  };
}

async function migrateUserOwnedRecords(fromUserId, toUserId) {
  const fromId = String(fromUserId || '').trim();
  const toId = String(toUserId || '').trim();
  if (!fromId || !toId || fromId === toId) return;

  for (const Model of [PrescriptionModel, CartEventModel, FoodLogModel]) {
    try {
      await Model.updateMany({ userId: fromId }, { $set: { userId: toId } });
    } catch {
      // Ignore individual duplicate-key edge cases on already-synced items
    }
  }
}

async function findUserDoc(cleanId, fallbackEmail = '') {
  if (mongoose.Types.ObjectId.isValid(cleanId)) {
    const byId = await UserModel.findById(cleanId);
    if (byId) return byId;
  }
  if (cleanId) {
    const byLegacy = await UserModel.findOne({ legacyId: cleanId });
    if (byLegacy) return byLegacy;
  }
  const cleanEmail = String(fallbackEmail || '').trim().toLowerCase();
  if (cleanEmail) {
    const byEmail = await UserModel.findOne({ email: cleanEmail });
    if (byEmail) return byEmail;
  }
  return null;
}

export async function registerUser(input) {
  const fullName = String(input?.fullName || '').trim();
  const email = String(input?.email || '').trim().toLowerCase();
  const password = String(input?.password || '');
  const age = Number(input?.age);
  const legacyId = String(input?.legacyId || '').trim() || null;

  if (!fullName) {
    return { ok: false, status: 400, error: 'Please enter your full name.' };
  }
  if (!email || !email.includes('@')) {
    return { ok: false, status: 400, error: 'Please enter a valid email address.' };
  }
  if (password.length < 6) {
    return { ok: false, status: 400, error: 'Password must be at least 6 characters.' };
  }
  if (!Number.isFinite(age) || age < 1 || age > 120) {
    return { ok: false, status: 400, error: 'Please enter a valid age (1–120).' };
  }

  const conditions = cleanConditions(input?.conditions);
  const otherConditions = cleanStringArray(input?.otherConditions);
  const allergies = cleanStringArray(input?.allergies);
  const dietaryNotes = String(input?.dietaryNotes || '').trim();
  const passwordHash = hashPassword(password);

  const mongo = await connectMongoDB();
  if (mongo.connected) {
    const existing = await UserModel.findOne({ email }).lean();
    if (existing) {
      return {
        ok: false,
        status: 409,
        error: 'An account with this email already exists. Please sign in instead.',
      };
    }

    const created = await UserModel.create({
      fullName,
      email,
      passwordHash,
      age: Math.round(age),
      conditions,
      otherConditions,
      allergies,
      dietaryNotes,
      ...(legacyId ? { legacyId } : {}),
    });

    const sanitized = sanitizeUserDoc(created);
    if (legacyId) {
      await migrateUserOwnedRecords(legacyId, sanitized.id);
    }

    return {
      ok: true,
      status: 201,
      storage: 'mongodb',
      user: sanitized,
    };
  }

  if (memoryUsersByEmail.has(email)) {
    return {
      ok: false,
      status: 409,
      error: 'An account with this email already exists. Please sign in instead.',
    };
  }

  const fallbackUser = {
    id: legacyId || `user-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    fullName,
    email,
    passwordHash,
    age: Math.round(age),
    conditions,
    otherConditions,
    allergies,
    dietaryNotes,
    createdAt: new Date().toISOString(),
  };
  memoryUsersById.set(fallbackUser.id, fallbackUser);
  memoryUsersByEmail.set(email, fallbackUser);

  return {
    ok: true,
    status: 201,
    storage: 'memory-fallback',
    user: sanitizeUserDoc(fallbackUser),
  };
}

export async function syncOrUpsertUser(input) {
  const fullName = String(input?.fullName || '').trim();
  const email = String(input?.email || '').trim().toLowerCase();
  const rawPassword = String(input?.password || '');
  const legacyId = String(input?.legacyId || input?.id || '').trim() || null;
  const ageRaw = Number(input?.age);
  const age = Number.isFinite(ageRaw) && ageRaw >= 1 && ageRaw <= 120 ? Math.round(ageRaw) : 30;

  if (!email || !email.includes('@')) {
    return { ok: false, status: 400, error: 'Valid user email is required to sync account.' };
  }

  const conditions = cleanConditions(input?.conditions);
  const otherConditions = cleanStringArray(input?.otherConditions);
  const allergies = cleanStringArray(input?.allergies);
  const dietaryNotes = String(input?.dietaryNotes || '').trim();

  const mongo = await connectMongoDB();
  if (mongo.connected) {
    let doc = await findUserDoc(legacyId || '', email);
    if (doc) {
      if (legacyId && !mongoose.Types.ObjectId.isValid(legacyId) && !doc.legacyId) {
        doc.legacyId = legacyId;
      }
      if (fullName) doc.fullName = fullName;
      if (Number.isFinite(ageRaw) && ageRaw >= 1 && ageRaw <= 120) doc.age = Math.round(ageRaw);
      if (Array.isArray(input?.conditions)) doc.conditions = conditions;
      if (Array.isArray(input?.otherConditions)) doc.otherConditions = otherConditions;
      if (Array.isArray(input?.allergies)) doc.allergies = allergies;
      if (input?.dietaryNotes !== undefined) doc.dietaryNotes = dietaryNotes;
      await doc.save();

      const sanitized = sanitizeUserDoc(doc);
      if (legacyId && legacyId !== sanitized.id) {
        await migrateUserOwnedRecords(legacyId, sanitized.id);
      }

      return {
        ok: true,
        status: 200,
        storage: 'mongodb',
        migratedFromId: legacyId && legacyId !== sanitized.id ? legacyId : undefined,
        user: sanitized,
      };
    }

    const passwordHash = hashPassword(
      rawPassword.length >= 6 ? rawPassword : randomBytes(16).toString('hex')
    );
    const created = await UserModel.create({
      fullName: fullName || email.split('@')[0] || 'NutriCheck User',
      email,
      passwordHash,
      age,
      conditions,
      otherConditions,
      allergies,
      dietaryNotes,
      ...(legacyId && !mongoose.Types.ObjectId.isValid(legacyId) ? { legacyId } : {}),
    });

    const sanitized = sanitizeUserDoc(created);
    if (legacyId && legacyId !== sanitized.id) {
      await migrateUserOwnedRecords(legacyId, sanitized.id);
    }

    return {
      ok: true,
      status: 201,
      storage: 'mongodb',
      migratedFromId: legacyId && legacyId !== sanitized.id ? legacyId : undefined,
      user: sanitized,
    };
  }

  return {
    ok: false,
    status: 503,
    reason: mongo.reason || 'mongodb_disconnected',
    error: mongo.reason
      ? `MongoDB is not connected on the backend (${mongo.reason}).`
      : 'MongoDB is not currently connected on the backend.',
  };
}

export async function loginUser(input) {
  const email = String(input?.email || '').trim().toLowerCase();
  const password = String(input?.password || '');
  const overrideConditions = cleanConditions(input?.conditions);
  const overrideOther = cleanStringArray(input?.otherConditions);

  if (!email || !password) {
    return { ok: false, status: 400, error: 'Please enter email and password.' };
  }

  const mongo = await connectMongoDB();
  if (mongo.connected) {
    const found = await UserModel.findOne({ email });
    if (!found) {
      return {
        ok: false,
        status: 401,
        storage: 'mongodb',
        reason: 'not_found',
        error: 'No account found with that email address.',
      };
    }
    if (!verifyPassword(password, found.passwordHash)) {
      return {
        ok: false,
        status: 401,
        storage: 'mongodb',
        reason: 'invalid_password',
        error: 'Incorrect password. Please try again.',
      };
    }

    if (overrideConditions.length > 0 || overrideOther.length > 0) {
      found.conditions = Array.from(
        new Set([...cleanConditions(found.conditions), ...overrideConditions])
      );
      found.otherConditions = cleanStringArray([
        ...(found.otherConditions || []),
        ...overrideOther,
      ]);
      await found.save();
    }

    return {
      ok: true,
      status: 200,
      storage: 'mongodb',
      user: sanitizeUserDoc(found),
    };
  }

  const found = memoryUsersByEmail.get(email);
  if (!found) {
    return { ok: false, status: 401, error: 'No account found with that email address.' };
  }
  if (!verifyPassword(password, found.passwordHash)) {
    return { ok: false, status: 401, error: 'Incorrect password. Please try again.' };
  }

  if (overrideConditions.length > 0 || overrideOther.length > 0) {
    found.conditions = Array.from(
      new Set([...cleanConditions(found.conditions), ...overrideConditions])
    );
    found.otherConditions = cleanStringArray([
      ...(found.otherConditions || []),
      ...overrideOther,
    ]);
  }

  return {
    ok: true,
    status: 200,
    storage: 'memory-fallback',
    user: sanitizeUserDoc(found),
  };
}

export async function getUserById(userId) {
  const cleanId = String(userId || '').trim();
  if (!cleanId) return null;

  const mongo = await connectMongoDB();
  if (mongo.connected) {
    let found = null;
    if (mongoose.Types.ObjectId.isValid(cleanId)) {
      found = await UserModel.findById(cleanId).lean();
    }
    if (!found) {
      found = await UserModel.findOne({ legacyId: cleanId }).lean();
    }
    return found ? { user: sanitizeUserDoc(found), storage: 'mongodb' } : null;
  }

  const mem = memoryUsersById.get(cleanId);
  if (mem) {
    return { user: sanitizeUserDoc(mem), storage: 'memory-fallback' };
  }

  return {
    user: null,
    unavailable: true,
    storage: 'unavailable',
    reason: mongo.reason || 'MongoDB is not currently connected on the backend.',
  };
}

export async function updateUserProfile(userId, input) {
  const cleanId = String(userId || '').trim();
  if (!cleanId) {
    return { ok: false, status: 400, error: 'Missing user ID.' };
  }

  const updates = {};
  if (input?.fullName && String(input.fullName).trim()) {
    updates.fullName = String(input.fullName).trim();
  }
  if (input?.age !== undefined) {
    const numAge = Number(input.age);
    if (Number.isFinite(numAge) && numAge >= 1 && numAge <= 120) {
      updates.age = Math.round(numAge);
    }
  }
  if (Array.isArray(input?.conditions)) {
    updates.conditions = cleanConditions(input.conditions);
  }
  if (Array.isArray(input?.otherConditions)) {
    updates.otherConditions = cleanStringArray(input.otherConditions);
  }
  if (Array.isArray(input?.allergies)) {
    updates.allergies = cleanStringArray(input.allergies);
  }
  if (input?.dietaryNotes !== undefined) {
    updates.dietaryNotes = String(input.dietaryNotes || '').trim();
  }

  const mongo = await connectMongoDB();
  if (mongo.connected) {
    const fallbackEmail = String(input?.email || '').trim().toLowerCase();
    const existingDoc = await findUserDoc(cleanId, fallbackEmail);

    if (existingDoc) {
      Object.assign(existingDoc, updates);
      if (!mongoose.Types.ObjectId.isValid(cleanId) && !existingDoc.legacyId) {
        existingDoc.legacyId = cleanId;
      }
      await existingDoc.save();

      const sanitized = sanitizeUserDoc(existingDoc);
      if (cleanId !== sanitized.id) {
        await migrateUserOwnedRecords(cleanId, sanitized.id);
      }

      return {
        ok: true,
        status: 200,
        storage: 'mongodb',
        migratedFromId: cleanId !== sanitized.id ? cleanId : undefined,
        user: sanitized,
      };
    }

    // Auto-migrate locally cached account into MongoDB if email is provided
    if (fallbackEmail && fallbackEmail.includes('@')) {
      return await syncOrUpsertUser({
        ...input,
        legacyId: cleanId,
        email: fallbackEmail,
        fullName: updates.fullName || input?.fullName || fallbackEmail.split('@')[0],
        age: updates.age ?? input?.age ?? 30,
      });
    }

    return { ok: false, status: 404, error: 'User not found.' };
  }

  const existing = memoryUsersById.get(cleanId);
  if (!existing) {
    return { ok: false, status: 404, error: 'User not found.' };
  }
  Object.assign(existing, updates);
  return {
    ok: true,
    status: 200,
    storage: 'memory-fallback',
    user: sanitizeUserDoc(existing),
  };
}
