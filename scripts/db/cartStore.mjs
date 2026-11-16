import { CartEventModel, connectMongoDB } from './mongodb.mjs';

// Per-user in-memory fallback used only when MONGODB_URI is not configured
const memoryCartByUser = new Map();

function sanitizeCartEvent(doc) {
  if (!doc) return null;
  const plain = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  return {
    event_id: plain.event_id,
    user_id: plain.userId || plain.user_id || undefined,
    timestamp: plain.timestamp,
    source: plain.source || 'store_browser_extension',
    source_platform: plain.source_platform || 'Online Store',
    status: plain.status || 'analyzed',
    product_title: plain.product_title || 'Food Item',
    product_url: plain.product_url ?? null,
    image_url: plain.image_url ?? null,
    nutrition_source: plain.nutrition_source || 'Analyzed',
    matched_food: plain.matched_food ?? null,
    message: plain.message ?? null,
    analysis: plain.analysis ?? null,
    ingredients_text: plain.ingredients_text ?? null,
    ingredient_scan: plain.ingredient_scan ?? null,
  };
}

export async function listCartEventsForUser(userId) {
  const cleanUserId = String(userId || '').trim();
  if (!cleanUserId) return [];

  const mongo = await connectMongoDB();
  if (mongo.connected) {
    const docs = await CartEventModel.find({ userId: cleanUserId })
      .sort({ timestamp: -1 })
      .limit(30)
      .lean();
    return docs.map(sanitizeCartEvent);
  }

  return [...(memoryCartByUser.get(cleanUserId) || [])];
}

export async function saveCartEventForUser(userId, ev) {
  const cleanUserId = String(userId || '').trim();
  if (!cleanUserId) {
    return { ...ev, user_id: undefined };
  }

  const record = { ...ev, user_id: cleanUserId };
  const mongo = await connectMongoDB();
  if (mongo.connected) {
    await CartEventModel.findOneAndUpdate(
      { userId: cleanUserId, event_id: record.event_id },
      {
        $set: {
          userId: cleanUserId,
          event_id: record.event_id,
          timestamp: record.timestamp,
          source: record.source,
          source_platform: record.source_platform,
          status: record.status,
          product_title: record.product_title,
          product_url: record.product_url ?? null,
          image_url: record.image_url ?? null,
          nutrition_source: record.nutrition_source,
          matched_food: record.matched_food ?? null,
          message: record.message ?? null,
          analysis: record.analysis ?? null,
          ingredients_text: record.ingredients_text ?? null,
          ingredient_scan: record.ingredient_scan ?? null,
        },
      },
      { upsert: true, new: true }
    );
    return record;
  }

  const prev = memoryCartByUser.get(cleanUserId) || [];
  const next = [record, ...prev.filter((item) => item.event_id !== record.event_id)].slice(0, 30);
  memoryCartByUser.set(cleanUserId, next);
  return record;
}

export async function getCartEventForUser(userId, eventId) {
  const cleanUserId = String(userId || '').trim();
  const cleanEventId = String(eventId || '').trim();
  if (!cleanUserId || !cleanEventId) return null;

  const mongo = await connectMongoDB();
  if (mongo.connected) {
    const doc = await CartEventModel.findOne({
      userId: cleanUserId,
      event_id: cleanEventId,
    }).lean();
    return sanitizeCartEvent(doc);
  }

  const list = memoryCartByUser.get(cleanUserId) || [];
  return list.find((e) => e.event_id === cleanEventId) || null;
}

export async function deleteCartEventForUser(userId, eventId) {
  const cleanUserId = String(userId || '').trim();
  const cleanEventId = String(eventId || '').trim();
  if (!cleanUserId || !cleanEventId) return;

  const mongo = await connectMongoDB();
  if (mongo.connected) {
    await CartEventModel.deleteOne({ userId: cleanUserId, event_id: cleanEventId });
    return;
  }

  const prev = memoryCartByUser.get(cleanUserId) || [];
  memoryCartByUser.set(
    cleanUserId,
    prev.filter((ev) => ev.event_id !== cleanEventId)
  );
}

export async function clearCartEventsForUser(userId) {
  const cleanUserId = String(userId || '').trim();
  if (!cleanUserId) return;

  const mongo = await connectMongoDB();
  if (mongo.connected) {
    await CartEventModel.deleteMany({ userId: cleanUserId });
    return;
  }

  memoryCartByUser.set(cleanUserId, []);
}
