import mongoose from 'mongoose';

const usageEventSchema = new mongoose.Schema(
  {
    keyId: { type: mongoose.Schema.Types.ObjectId, ref: 'ApiKey', required: true, index: true },
    endpoint: { type: String, required: true },
    method: { type: String, required: true, enum: ['GET', 'POST'] },
    statusCode: { type: Number, required: true },
    outcome: { type: String, required: true, enum: ['valid', 'invalid', 'error'] },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

export const UsageEvent = mongoose.models.UsageEvent || mongoose.model('UsageEvent', usageEventSchema);
