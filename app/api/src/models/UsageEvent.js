import mongoose from 'mongoose';

/**
 * Usage-metering event. One document is written per billable call
 * (currently every POST /v1/validate). GET /usage aggregates these.
 */
const usageEventSchema = new mongoose.Schema(
  {
    keyId: { type: mongoose.Schema.Types.ObjectId, ref: 'ApiKey', required: true, index: true },
    endpoint: { type: String, required: true },
    method: { type: String, required: true },
    statusCode: { type: Number, required: true },
    // 'valid' | 'invalid' | 'error' — validation outcome (or transport error)
    outcome: { type: String, required: true, index: true },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { collection: 'usage_events' }
);

usageEventSchema.index({ keyId: 1, timestamp: -1 });

export const UsageEvent =
  mongoose.models.UsageEvent || mongoose.model('UsageEvent', usageEventSchema);
