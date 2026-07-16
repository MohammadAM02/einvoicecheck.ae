import mongoose from 'mongoose';
import crypto from 'node:crypto';

/**
 * API key record. The raw key is never stored — only its SHA-256 hash.
 * Raw keys have the form `pdk_live_<32 hex chars>` and are shown to the
 * operator exactly once (at seed time).
 */
const apiKeySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    keyHash: { type: String, required: true, unique: true, index: true },
    prefix: { type: String, required: true }, // first chars, for display only
    active: { type: Boolean, default: true, index: true },
    rateLimitPerMinute: { type: Number, default: null }, // null => use global default
    lastUsedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: 'api_keys' }
);

apiKeySchema.statics.hashKey = function hashKey(rawKey) {
  return crypto.createHash('sha256').update(rawKey).digest('hex');
};

/** Generate a fresh raw key + its persisted fields. Raw is returned once. */
apiKeySchema.statics.generate = function generate({ name, rateLimitPerMinute = null }) {
  const raw = `pdk_live_${crypto.randomBytes(16).toString('hex')}`;
  return {
    raw,
    doc: {
      name,
      keyHash: this.hashKey(raw),
      prefix: raw.slice(0, 12),
      rateLimitPerMinute,
      active: true,
    },
  };
};

export const ApiKey =
  mongoose.models.ApiKey || mongoose.model('ApiKey', apiKeySchema);
