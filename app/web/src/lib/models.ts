import crypto from 'node:crypto';
import mongoose, { Schema, type Model, type Types } from 'mongoose';
import type { PlanId, SubscriptionStatus } from './plans';

export type ApiKeyDoc = {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  name: string;
  keyHash: string;
  prefix: string;
  active: boolean;
  rateLimitPerMinute: number | null;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type ApiKeyModel = Model<ApiKeyDoc> & {
  hashKey(raw: string): string;
  generate(input: { name: string; userId: Types.ObjectId; rateLimitPerMinute?: number | null }): {
    raw: string;
    doc: Omit<ApiKeyDoc, '_id' | 'createdAt' | 'updatedAt' | 'lastUsedAt' | 'revokedAt'>;
  };
};

const apiKeySchema = new Schema<ApiKeyDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true },
    keyHash: { type: String, required: true, unique: true, index: true },
    prefix: { type: String, required: true },
    active: { type: Boolean, default: true, index: true },
    rateLimitPerMinute: { type: Number, default: null },
    lastUsedAt: { type: Date, default: null },
    revokedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: 'api_keys' },
);

function hashKey(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

function generate(input: { name: string; userId: Types.ObjectId; rateLimitPerMinute?: number | null }) {
  const raw = `pdk_live_${crypto.randomBytes(16).toString('hex')}`;
  return {
    raw,
    doc: {
      userId: input.userId,
      name: input.name,
      keyHash: hashKey(raw),
      prefix: raw.slice(0, 12),
      rateLimitPerMinute: input.rateLimitPerMinute ?? null,
      active: true,
    },
  };
}

Object.assign(apiKeySchema.statics, { hashKey, generate });

export const ApiKey =
  (mongoose.models.ApiKey as ApiKeyModel) ??
  mongoose.model<ApiKeyDoc, ApiKeyModel>('ApiKey', apiKeySchema);

export type UserDoc = {
  _id: Types.ObjectId;
  email: string;
  passwordHash: string;
  plan: PlanId;
  subscriptionStatus: SubscriptionStatus;
  paypalSubscriptionId: string | null;
  paypalPayerId: string | null;
  paypalPlanId: string | null;
  currentPeriodEnd: Date | null;
  lastPaymentStatus: 'succeeded' | 'failed' | null;
  createdAt: Date;
  updatedAt: Date;
};

const userSchema = new Schema<UserDoc>(
  {
    email: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    plan: { type: String, default: 'trial', index: true },
    subscriptionStatus: { type: String, default: 'none', index: true },
    paypalSubscriptionId: { type: String, default: null, index: true },
    paypalPayerId: { type: String, default: null, index: true },
    paypalPlanId: { type: String, default: null },
    currentPeriodEnd: { type: Date, default: null },
    lastPaymentStatus: { type: String, default: null },
  },
  { timestamps: true, collection: 'users' },
);

export const User =
  (mongoose.models.User as Model<UserDoc>) ?? mongoose.model<UserDoc>('User', userSchema);

export type UsageEventDoc = {
  _id: Types.ObjectId;
  keyId: Types.ObjectId;
  endpoint: string;
  method: string;
  statusCode: number;
  outcome: 'valid' | 'invalid' | 'error';
  timestamp: Date;
};

const usageEventSchema = new Schema<UsageEventDoc>(
  {
    keyId: { type: Schema.Types.ObjectId, ref: 'ApiKey', required: true, index: true },
    endpoint: { type: String, required: true },
    method: { type: String, required: true },
    statusCode: { type: Number, required: true },
    outcome: { type: String, required: true, index: true },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { collection: 'usage_events' },
);

export const UsageEvent =
  (mongoose.models.UsageEvent as Model<UsageEventDoc>) ??
  mongoose.model<UsageEventDoc>('UsageEvent', usageEventSchema);

export type WebhookEventDoc = {
  _id: Types.ObjectId;
  webhookId: string;
  type: string;
  receivedAt: Date;
};

const webhookEventSchema = new Schema<WebhookEventDoc>(
  {
    webhookId: { type: String, required: true, unique: true, index: true },
    type: { type: String, required: true },
    receivedAt: { type: Date, default: Date.now },
  },
  { collection: 'webhook_events' },
);

export const WebhookEvent =
  (mongoose.models.WebhookEvent as Model<WebhookEventDoc>) ??
  mongoose.model<WebhookEventDoc>('WebhookEvent', webhookEventSchema);
