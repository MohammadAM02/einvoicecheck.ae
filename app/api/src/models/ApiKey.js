import { createHash, randomBytes } from 'node:crypto';
import mongoose from 'mongoose';

const apiKeySchema = new mongoose.Schema(
  {
    keyHash: { type: String, required: true, unique: true, index: true },
    prefix: { type: String, required: true },
    name: { type: String, required: true },
    active: { type: Boolean, default: true },
    rateLimitPerMinute: { type: Number, default: null },
    lastUsedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

/**
 * SHA-256 hash of a raw API key string. The raw key is never persisted —
 * only this hash is stored.
 */
apiKeySchema.statics.hashKey = function hashKey(raw) {
  return createHash('sha256').update(raw).digest('hex');
};

/**
 * Generate a raw API key and its document. The raw key is returned exactly
 * once — the caller must store it; only its hash is persisted.
 *
 * @param {{ name: string, rateLimitPerMinute?: number }} opts
 * @returns {{ raw: string, doc: object }}
 */
apiKeySchema.statics.generate = function generate({ name, rateLimitPerMinute = null }) {
  const prefix = 'evc';
  const secret = randomBytes(24).toString('base64url');
  const raw = `${prefix}_${secret}`;
  const keyHash = this.hashKey(raw);
  const doc = {
    keyHash,
    prefix,
    name,
    active: true,
    rateLimitPerMinute,
  };
  return { raw, doc };
};

export const ApiKey = mongoose.models.ApiKey || mongoose.model('ApiKey', apiKeySchema);
