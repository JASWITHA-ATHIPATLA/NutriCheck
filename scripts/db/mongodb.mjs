import 'dotenv/config';
import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    age: {
      type: Number,
      required: true,
      min: 1,
      max: 120,
    },
    conditions: {
      type: [String],
      default: [],
    },
    otherConditions: {
      type: [String],
      default: [],
    },
    allergies: {
      type: [String],
      default: [],
    },
    legacyId: {
      type: String,
      default: null,
      index: true,
    },
    dietaryNotes: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    collection: 'users',
    timestamps: true,
  }
);

export const UserModel = mongoose.models.User || mongoose.model('User', UserSchema);

const CartEventSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    event_id: {
      type: String,
      required: true,
    },
    timestamp: {
      type: String,
      required: true,
    },
    source: {
      type: String,
      default: 'store_browser_extension',
    },
    source_platform: {
      type: String,
      default: 'Online Store',
    },
    status: {
      type: String,
      enum: ['analyzed', 'needs_nutrition'],
      default: 'analyzed',
    },
    product_title: {
      type: String,
      required: true,
    },
    product_url: {
      type: String,
      default: null,
    },
    image_url: {
      type: String,
      default: null,
    },
    nutrition_source: {
      type: String,
      default: 'Analyzed',
    },
    matched_food: {
      type: String,
      default: null,
    },
    message: {
      type: String,
      default: null,
    },
    analysis: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    ingredients_text: {
      type: String,
      default: null,
    },
    ingredient_scan: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    prescription_alerts: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    tracker_eligibility: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    queued_food_log_id: {
      type: String,
      default: null,
    },
  },
  {
    collection: 'cart_events',
    timestamps: true,
  }
);

CartEventSchema.index({ userId: 1, event_id: 1 }, { unique: true });
CartEventSchema.index({ userId: 1, timestamp: -1 });

export const CartEventModel =
  mongoose.models.CartEvent || mongoose.model('CartEvent', CartEventSchema);

const PrescriptionConditionSubSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    canonicalKey: { type: String, default: '' },
    category: { type: String, enum: ['acute', 'chronic'], default: 'acute' },
    validDays: { type: Number, default: 7, min: 1, max: 365 },
    prescribedDate: { type: String, required: true },
    expiresAt: { type: String, required: true },
    status: {
      type: String,
      enum: ['active', 'expired', 'dismissed'],
      default: 'active',
    },
    confidence: { type: String, enum: ['high', 'medium', 'low'], default: 'high' },
    needsVerification: { type: Boolean, default: false },
    uncertaintyReason: { type: String, default: '' },
    sourceSnippet: { type: String, default: '' },
  },
  { _id: false }
);

const PrescriptionMedicineSubSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    dosage: { type: String, default: '' },
    frequency: { type: String, default: '' },
    duration: { type: String, default: '' },
    confidence: { type: String, enum: ['high', 'medium', 'low'], default: 'high' },
    needsVerification: { type: Boolean, default: false },
    uncertaintyReason: { type: String, default: '' },
    note: { type: String, default: '' },
  },
  { _id: false }
);

const PrescriptionOcrPageSubSchema = new mongoose.Schema(
  {
    pageNumber: { type: Number, default: 1 },
    fileName: { type: String, default: '' },
    rawText: { type: String, default: '' },
    confidence: { type: Number, default: null },
    lowConfidenceWordCount: { type: Number, default: 0 },
    sharpnessScore: { type: Number, default: null },
    isBlurry: { type: Boolean, default: false },
    warnings: { type: [String], default: [] },
  },
  { _id: false }
);

const PrescriptionSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    prescription_id: { type: String, required: true },
    fileName: { type: String, default: 'Prescription' },
    fileType: { type: String, enum: ['pdf', 'jpg', 'png', 'manual'], default: 'jpg' },
    uploadedAt: { type: String, required: true },
    patientName: { type: String, default: '', trim: true },
    patientNameConfidence: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
    prescriptionDate: { type: String, required: true },
    prescriptionDateConfidence: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
    rawOcrText: { type: String, default: '' },
    ocrProvider: { type: String, default: 'google_cloud_vision_document_text + gemini_vision' },
    ocrConfidence: { type: Number, default: null },
    pagesCount: { type: Number, default: 1, min: 1 },
    ocrPages: { type: [PrescriptionOcrPageSubSchema], default: [] },
    handwritingQuality: {
      type: String,
      enum: ['clear', 'partially_unclear', 'unreadable'],
      default: 'clear',
    },
    overallConfidence: { type: String, enum: ['high', 'medium', 'low'], default: 'high' },
    doctorVerificationRecommended: { type: Boolean, default: false },
    verifiedByUser: { type: Boolean, default: true },
    imageQualityWarnings: { type: [String], default: [] },
    conditions: { type: [PrescriptionConditionSubSchema], default: [] },
    medicines: { type: [PrescriptionMedicineSubSchema], default: [] },
    dietaryRestrictions: { type: [String], default: [] },
    dietaryRestrictionItems: { type: [mongoose.Schema.Types.Mixed], default: [] },
    notes: { type: String, default: '' },
  },
  {
    collection: 'prescriptions',
    timestamps: true,
  }
);

PrescriptionSchema.index({ userId: 1, prescription_id: 1 }, { unique: true });
PrescriptionSchema.index({ userId: 1, uploadedAt: -1 });

export const PrescriptionModel =
  mongoose.models.Prescription || mongoose.model('Prescription', PrescriptionSchema);

const FoodLogSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    log_id: { type: String, required: true },
    sourceEventId: { type: String, default: null },
    foodName: { type: String, required: true, trim: true },
    platform: { type: String, default: 'Manual' },
    isInstantConsumable: { type: Boolean, default: true },
    mealSlot: {
      type: String,
      enum: ['breakfast', 'lunch', 'snack', 'dinner'],
      default: 'lunch',
    },
    consumedDate: { type: String, required: true, index: true },
    consumedTime: { type: String, default: '12:30' },
    consumptionStatus: {
      type: String,
      enum: ['pending_confirmation', 'consumed', 'skipped'],
      default: 'consumed',
    },
    portionMultiplier: { type: Number, default: 1, min: 0.1, max: 20 },
    quantityLabel: { type: String, default: '1 serving' },
    baseNutrients: { type: mongoose.Schema.Types.Mixed, default: {} },
    nutrients: { type: mongoose.Schema.Types.Mixed, default: {} },
    ingredientsText: { type: String, default: '' },
    imageUrl: { type: String, default: null },
    createdAtIso: { type: String, required: true },
  },
  {
    collection: 'food_logs',
    timestamps: true,
  }
);

FoodLogSchema.index({ userId: 1, log_id: 1 }, { unique: true });
FoodLogSchema.index({ userId: 1, consumedDate: -1 });

export const FoodLogModel =
  mongoose.models.FoodLog || mongoose.model('FoodLog', FoodLogSchema);

function getMongoUri() {
  return String(process.env.MONGODB_URI || process.env.MONGO_URI || '').trim();
}

function getDbName() {
  return String(process.env.MONGODB_DB_NAME || 'nutricheck').trim() || 'nutricheck';
}

export function getMongoStatus() {
  const uri = getMongoUri();
  return {
    configured: Boolean(uri),
    connected: mongoose.connection.readyState === 1,
    readyState: mongoose.connection.readyState,
    dbName: mongoose.connection.name || getDbName(),
  };
}

export async function connectMongoDB() {
  const uri = getMongoUri();
  if (!uri) {
    return {
      connected: false,
      configured: false,
      reason: 'MONGODB_URI is not configured.',
    };
  }

  if (mongoose.connection.readyState === 1) {
    return { connected: true, configured: true };
  }

  if (!globalThis.__nutricheckMongoPromise) {
    globalThis.__nutricheckMongoPromise = mongoose
      .connect(uri, {
        dbName: getDbName(),
        serverSelectionTimeoutMS: 5000,
        maxPoolSize: 10,
      })
      .then(() => {
        console.log(`[NutriCheck] MongoDB connected (${getDbName()})`);
        return { connected: true, configured: true };
      })
      .catch((err) => {
        globalThis.__nutricheckMongoPromise = null;
        console.warn(`[NutriCheck] MongoDB connection unavailable: ${err.message}`);
        return {
          connected: false,
          configured: true,
          reason: err.message,
        };
      });
  }

  return globalThis.__nutricheckMongoPromise;
}
