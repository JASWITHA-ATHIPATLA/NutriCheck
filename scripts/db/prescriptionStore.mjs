import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { PrescriptionModel, connectMongoDB } from './mongodb.mjs';
import {
  buildActivePrescriptionProfile,
  refreshPrescriptionStatuses,
} from '../rules/prescriptionAlertEngine.mjs';

const DATA_DIR = process.env.VERCEL
  ? '/tmp/.nutricheck-data'
  : path.resolve(process.cwd(), '.nutricheck-data');
const FALLBACK_FILE = path.join(DATA_DIR, 'prescriptions.json');

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
    // ignore disk errors in restricted env
  }
}

function sanitizePrescription(doc) {
  if (!doc) return null;
  const plain = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  return refreshPrescriptionStatuses({
    prescription_id: plain.prescription_id,
    userId: plain.userId,
    fileName: plain.fileName || 'Prescription',
    fileType: plain.fileType || 'jpg',
    uploadedAt: plain.uploadedAt,
    patientName: plain.patientName || '',
    patientNameConfidence: plain.patientNameConfidence || 'medium',
    prescriptionDate: plain.prescriptionDate,
    prescriptionDateConfidence: plain.prescriptionDateConfidence || 'medium',
    rawOcrText: plain.rawOcrText || '',
    ocrProvider: plain.ocrProvider || 'google_cloud_vision_document_text + gemini_vision',
    ocrConfidence: typeof plain.ocrConfidence === 'number' ? plain.ocrConfidence : null,
    pagesCount: Number(plain.pagesCount) || 1,
    ocrPages: Array.isArray(plain.ocrPages) ? plain.ocrPages : [],
    handwritingQuality: plain.handwritingQuality || 'clear',
    overallConfidence: plain.overallConfidence || 'high',
    doctorVerificationRecommended: Boolean(plain.doctorVerificationRecommended),
    verifiedByUser: plain.verifiedByUser !== false,
    imageQualityWarnings: Array.isArray(plain.imageQualityWarnings) ? plain.imageQualityWarnings : [],
    conditions: Array.isArray(plain.conditions) ? plain.conditions : [],
    medicines: Array.isArray(plain.medicines) ? plain.medicines : [],
    dietaryRestrictions: Array.isArray(plain.dietaryRestrictions) ? plain.dietaryRestrictions : [],
    dietaryRestrictionItems: Array.isArray(plain.dietaryRestrictionItems)
      ? plain.dietaryRestrictionItems
      : [],
    notes: plain.notes || '',
  });
}

export async function listPrescriptionsForUser(userId) {
  const cleanUserId = String(userId || '').trim();
  if (!cleanUserId) return [];

  const mongo = await connectMongoDB();
  if (mongo.connected) {
    const docs = await PrescriptionModel.find({ userId: cleanUserId })
      .sort({ uploadedAt: -1 })
      .lean();
    return docs.map(sanitizePrescription).filter(Boolean);
  }

  const store = loadLocalMap();
  const list = Array.isArray(store[cleanUserId]) ? store[cleanUserId] : [];
  return list.map(sanitizePrescription).filter(Boolean);
}

export async function getActivePrescriptionSummaryForUser(userId) {
  const list = await listPrescriptionsForUser(userId);
  return buildActivePrescriptionProfile(list);
}

export async function savePrescriptionForUser(userId, record) {
  const cleanUserId = String(userId || '').trim();
  if (!cleanUserId) throw new Error('Missing userId.');

  const normalized = sanitizePrescription({ ...record, userId: cleanUserId });
  const mongo = await connectMongoDB();
  if (mongo.connected) {
    await PrescriptionModel.findOneAndUpdate(
      { userId: cleanUserId, prescription_id: normalized.prescription_id },
      { $set: normalized },
      { upsert: true, new: true }
    );
    return normalized;
  }

  const store = loadLocalMap();
  const prev = Array.isArray(store[cleanUserId]) ? store[cleanUserId] : [];
  store[cleanUserId] = [
    normalized,
    ...prev.filter((p) => p.prescription_id !== normalized.prescription_id),
  ];
  saveLocalMap(store);
  return normalized;
}

export async function updatePrescriptionForUser(userId, prescriptionId, updates) {
  const cleanUserId = String(userId || '').trim();
  const cleanId = String(prescriptionId || '').trim();
  if (!cleanUserId || !cleanId) return null;

  const list = await listPrescriptionsForUser(cleanUserId);
  const existing = list.find((p) => p.prescription_id === cleanId);
  if (!existing) return null;

  const merged = {
    ...existing,
    ...(updates.prescriptionDate ? { prescriptionDate: updates.prescriptionDate } : {}),
    ...(Array.isArray(updates.conditions) ? { conditions: updates.conditions } : {}),
    ...(Array.isArray(updates.medicines) ? { medicines: updates.medicines } : {}),
    ...(Array.isArray(updates.dietaryRestrictions)
      ? { dietaryRestrictions: updates.dietaryRestrictions }
      : {}),
    ...(updates.notes !== undefined ? { notes: String(updates.notes || '') } : {}),
  };

  return savePrescriptionForUser(cleanUserId, merged);
}

export async function deletePrescriptionForUser(userId, prescriptionId) {
  const cleanUserId = String(userId || '').trim();
  const cleanId = String(prescriptionId || '').trim();
  if (!cleanUserId || !cleanId) return false;

  const mongo = await connectMongoDB();
  if (mongo.connected) {
    const res = await PrescriptionModel.deleteOne({
      userId: cleanUserId,
      prescription_id: cleanId,
    });
    return (res?.deletedCount || 0) > 0;
  }

  const store = loadLocalMap();
  const prev = Array.isArray(store[cleanUserId]) ? store[cleanUserId] : [];
  const next = prev.filter((p) => p.prescription_id !== cleanId);
  store[cleanUserId] = next;
  saveLocalMap(store);
  return next.length < prev.length;
}
