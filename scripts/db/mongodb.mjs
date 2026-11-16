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
