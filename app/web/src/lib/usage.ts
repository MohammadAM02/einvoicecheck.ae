import type { Types } from 'mongoose';
import { connectMongo } from './db';
import { ApiKey, UsageEvent } from './models';
import { PLANS, type PlanId } from './plans';

export type UsagePoint = { date: string; valid: number; invalid: number; error: number; total: number };

export type UsageSummary = {
  days: UsagePoint[];
  totals: { today: number; last30Days: number; allTime: number };
  outcomes: { valid: number; invalid: number; error: number };
  quota: { plan: PlanId; monthlyQuota: number; used: number; remaining: number; overage: number };
};

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Usage, aggregated from the Mongo `UsageEvent` metering events app/api writes.
 * This collection is the SOURCE OF TRUTH for consumption — Dodo has no metering
 * primitive and we do not pretend otherwise.
 */
export async function usageSummary(
  userId: Types.ObjectId,
  plan: PlanId,
  windowDays = 30,
): Promise<UsageSummary> {
  await connectMongo();
  const keys = await ApiKey.find({ userId }).select('_id').lean();
  const keyIds = keys.map((k) => k._id);

  const now = new Date();
  const since = new Date(now.getTime() - (windowDays - 1) * 86_400_000);
  since.setUTCHours(0, 0, 0, 0);

  const [rows, allTime] = await Promise.all([
    keyIds.length
      ? UsageEvent.aggregate<{ _id: { day: string; outcome: string }; count: number }>([
          { $match: { keyId: { $in: keyIds }, timestamp: { $gte: since } } },
          {
            $group: {
              _id: {
                day: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
                outcome: '$outcome',
              },
              count: { $sum: 1 },
            },
          },
        ])
      : Promise.resolve([]),
    keyIds.length ? UsageEvent.countDocuments({ keyId: { $in: keyIds } }) : Promise.resolve(0),
  ]);

  const byDay = new Map<string, UsagePoint>();
  for (let i = 0; i < windowDays; i += 1) {
    const d = new Date(since.getTime() + i * 86_400_000);
    byDay.set(isoDay(d), { date: isoDay(d), valid: 0, invalid: 0, error: 0, total: 0 });
  }
  const outcomes = { valid: 0, invalid: 0, error: 0 };

  for (const row of rows) {
    const point = byDay.get(row._id.day);
    const outcome = row._id.outcome as 'valid' | 'invalid' | 'error';
    if (point && outcome in point) {
      point[outcome] += row.count;
      point.total += row.count;
    }
    if (outcome in outcomes) outcomes[outcome] += row.count;
  }

  const days = [...byDay.values()];
  const todayKey = isoDay(now);
  const today = byDay.get(todayKey)?.total ?? 0;
  const last30Days = days.reduce((sum, d) => sum + d.total, 0);

  const monthlyQuota = PLANS[plan].monthlyQuota;
  return {
    days,
    totals: { today, last30Days, allTime },
    outcomes,
    quota: {
      plan,
      monthlyQuota,
      used: last30Days,
      remaining: Math.max(0, monthlyQuota - last30Days),
      overage: Math.max(0, last30Days - monthlyQuota),
    },
  };
}
