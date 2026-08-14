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

function isoDay(d: Date): string { return d.toISOString().slice(0, 10); }

/** Mongo usage events are the source of truth. PayPal processes payments, not usage metering. */
export async function usageSummary(
  userId: Types.ObjectId,
  plan: PlanId,
  windowDays = 30,
  now: Date = new Date(),
): Promise<UsageSummary> {
  await connectMongo();
  const keys = await ApiKey.find({ userId }).select('_id').lean();
  const keyIds = keys.map((key) => key._id);
  const since = new Date(now.getTime() - (windowDays - 1) * 86_400_000);
  since.setUTCHours(0, 0, 0, 0);
  // Quota period is the current UTC calendar month (first instant of month,
  // including a 31st day when applicable); the 30-day window stays the graph.
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const keyFilter = keyIds.length ? { keyId: { $in: keyIds } } : null;

  const [rows, allTime, monthCount] = await Promise.all([
    keyIds.length
      ? UsageEvent.aggregate<{ _id: { day: string; outcome: string }; count: number }>([
          { $match: { keyId: { $in: keyIds }, timestamp: { $gte: since } } },
          { $group: { _id: { day: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } }, outcome: '$outcome' }, count: { $sum: 1 } } },
        ])
      : Promise.resolve([]),
    keyFilter ? UsageEvent.countDocuments(keyFilter) : Promise.resolve(0),
    keyFilter ? UsageEvent.countDocuments({ ...keyFilter, timestamp: { $gte: monthStart } }) : Promise.resolve(0),
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
    if (point && outcome in point) { point[outcome] += row.count; point.total += row.count; }
    if (outcome in outcomes) outcomes[outcome] += row.count;
  }

  const days = [...byDay.values()];
  const last30Days = days.reduce((sum, day) => sum + day.total, 0);
  const monthlyQuota = PLANS[plan].monthlyQuota;
  return {
    days,
    totals: { today: byDay.get(isoDay(now))?.total ?? 0, last30Days, allTime },
    outcomes,
    quota: {
      plan,
      monthlyQuota,
      // Quota used/remaining/overage come from the current UTC calendar month
      // (A-020); the 30-day `days` graph and lifetime `allTime` are preserved.
      used: monthCount,
      remaining: Math.max(0, monthlyQuota - monthCount),
      overage: Math.max(0, monthCount - monthlyQuota),
    },
  };
}
