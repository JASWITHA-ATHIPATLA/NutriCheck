import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { FoodLogModel, connectMongoDB } from './mongodb.mjs';

const DATA_DIR = process.env.VERCEL
  ? '/tmp/.nutricheck-data'
  : path.resolve(process.cwd(), '.nutricheck-data');
const FALLBACK_FILE = path.join(DATA_DIR, 'food_logs.json');

function loadLocalMap() {
  try {
    if (!existsSync(FALLBACK_FILE)) return {};
    const parsed = JSON.parse(readFileSync(FALLBACK_FILE, 'utf-8'));
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveLocalMap(data) {
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(FALLBACK_FILE, JSON.stringify(data, null, 2));
  } catch {
    // ignore disk errors
  }
}

function sanitizeFoodLog(doc) {
  if (!doc) return null;
  const plain = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  return {
    log_id: plain.log_id,
    userId: plain.userId,
    sourceEventId: plain.sourceEventId || null,
    foodName: plain.foodName || 'Food Item',
    platform: plain.platform || 'Manual',
    isInstantConsumable: plain.isInstantConsumable !== false,
    mealSlot: ['breakfast', 'lunch', 'snack', 'dinner'].includes(plain.mealSlot)
      ? plain.mealSlot
      : 'lunch',
    consumedDate: plain.consumedDate || new Date().toISOString().slice(0, 10),
    consumedTime: plain.consumedTime || '12:30',
    consumptionStatus: ['pending_confirmation', 'consumed', 'skipped'].includes(
      plain.consumptionStatus
    )
      ? plain.consumptionStatus
      : 'consumed',
    portionMultiplier: Number(plain.portionMultiplier) || 1,
    quantityLabel: plain.quantityLabel || '1 serving',
    baseNutrients: plain.baseNutrients || plain.nutrients || {},
    nutrients: plain.nutrients || {},
    ingredientsText: plain.ingredientsText || '',
    imageUrl: plain.imageUrl || null,
    createdAtIso: plain.createdAtIso || new Date().toISOString(),
  };
}

export async function listFoodLogsForUser(userId) {
  const cleanUserId = String(userId || '').trim();
  if (!cleanUserId) return [];

  const mongo = await connectMongoDB();
  if (mongo.connected) {
    const docs = await FoodLogModel.find({ userId: cleanUserId })
      .sort({ consumedDate: -1, consumedTime: -1, createdAtIso: -1 })
      .limit(500)
      .lean();
    return docs.map(sanitizeFoodLog).filter(Boolean);
  }

  const store = loadLocalMap();
  const list = Array.isArray(store[cleanUserId]) ? store[cleanUserId] : [];
  return list
    .map(sanitizeFoodLog)
    .filter(Boolean)
    .sort((a, b) =>
      `${b.consumedDate}T${b.consumedTime}`.localeCompare(`${a.consumedDate}T${a.consumedTime}`)
    );
}

export async function getFoodLogBySourceEvent(userId, sourceEventId) {
  const cleanUserId = String(userId || '').trim();
  const cleanSource = String(sourceEventId || '').trim();
  if (!cleanUserId || !cleanSource) return null;

  const mongo = await connectMongoDB();
  if (mongo.connected) {
    const doc = await FoodLogModel.findOne({
      userId: cleanUserId,
      sourceEventId: cleanSource,
    }).lean();
    return sanitizeFoodLog(doc);
  }

  const store = loadLocalMap();
  const list = Array.isArray(store[cleanUserId]) ? store[cleanUserId] : [];
  return sanitizeFoodLog(list.find((l) => l.sourceEventId === cleanSource));
}

export async function saveFoodLogForUser(userId, record) {
  const cleanUserId = String(userId || '').trim();
  if (!cleanUserId) throw new Error('Missing userId.');

  const normalized = sanitizeFoodLog({ ...record, userId: cleanUserId });
  const mongo = await connectMongoDB();
  if (mongo.connected) {
    await FoodLogModel.findOneAndUpdate(
      { userId: cleanUserId, log_id: normalized.log_id },
      { $set: normalized },
      { upsert: true, new: true }
    );
    return normalized;
  }

  const store = loadLocalMap();
  const prev = Array.isArray(store[cleanUserId]) ? store[cleanUserId] : [];
  store[cleanUserId] = [
    normalized,
    ...prev.filter((l) => l.log_id !== normalized.log_id),
  ].slice(0, 500);
  saveLocalMap(store);
  return normalized;
}

export async function getFoodLogById(userId, logId) {
  const cleanUserId = String(userId || '').trim();
  const cleanId = String(logId || '').trim();
  if (!cleanUserId || !cleanId) return null;

  const mongo = await connectMongoDB();
  if (mongo.connected) {
    const doc = await FoodLogModel.findOne({ userId: cleanUserId, log_id: cleanId }).lean();
    return sanitizeFoodLog(doc);
  }

  const store = loadLocalMap();
  const list = Array.isArray(store[cleanUserId]) ? store[cleanUserId] : [];
  return sanitizeFoodLog(list.find((l) => l.log_id === cleanId));
}

export async function deleteFoodLogForUser(userId, logId) {
  const cleanUserId = String(userId || '').trim();
  const cleanId = String(logId || '').trim();
  if (!cleanUserId || !cleanId) return false;

  const mongo = await connectMongoDB();
  if (mongo.connected) {
    const res = await FoodLogModel.deleteOne({ userId: cleanUserId, log_id: cleanId });
    return (res?.deletedCount || 0) > 0;
  }

  const store = loadLocalMap();
  const prev = Array.isArray(store[cleanUserId]) ? store[cleanUserId] : [];
  const next = prev.filter((l) => l.log_id !== cleanId);
  store[cleanUserId] = next;
  saveLocalMap(store);
  return next.length < prev.length;
}

export async function clearFoodLogsForUser(userId) {
  const cleanUserId = String(userId || '').trim();
  if (!cleanUserId) return false;

  const mongo = await connectMongoDB();
  if (mongo.connected) {
    await FoodLogModel.deleteMany({ userId: cleanUserId });
    return true;
  }

  const store = loadLocalMap();
  delete store[cleanUserId];
  saveLocalMap(store);
  return true;
}
