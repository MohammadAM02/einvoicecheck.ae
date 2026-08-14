import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Types } from 'mongoose';
import { startStack, stopStack, resetData } from './helpers/stack';
import { ApiKey, UsageEvent } from '@/lib/models';
import { signup } from '@/lib/auth';
import { usageSummary } from '@/lib/usage';
import { PLANS } from '@/lib/plans';

const OUTCOME = 'valid' as const;

async function seedEvents(timestamps: (string | Date)[]) {
  const key = await ApiKey.findOne({ userId });
  const keyId = key!._id;
  await UsageEvent.insertMany(
    timestamps.map((ts) => ({
      keyId,
      endpoint: '/v1/preflight',
      method: 'POST',
      statusCode: 200,
      outcome: OUTCOME,
      timestamp: new Date(ts),
    })),
  );
}

let userId: Types.ObjectId;
beforeAll(async () => {
  await startStack();
});
afterAll(async () => {
  await stopStack();
});
beforeEach(async () => {
  await resetData();
  const { user } = await signup('usage@example.com', 'correct horse battery');
  userId = user._id;
});

describe('usage quota uses the current UTC calendar month (A-020)', () => {
  it('quota used counts the current UTC calendar month; allTime stays lifetime', async () => {
    // Previous month (within 30 days): counts toward the graph + allTime, not quota.
    // Current month: counts toward quota, the graph, and allTime.
    await seedEvents(['2026-01-15T10:00:00Z', '2026-01-20T10:00:00Z', '2026-02-05T10:00:00Z', '2026-02-09T10:00:00Z']);
    const fixedNow = new Date('2026-02-10T12:00:00Z');

    const s = await usageSummary(userId, 'trial', 30, fixedNow);

    expect(s.quota.used).toBe(2);
    expect(s.quota.remaining).toBe(PLANS.trial.monthlyQuota - 2);
    expect(s.quota.overage).toBe(0);
    expect(s.totals.allTime).toBe(4);
    expect(s.totals.last30Days).toBe(4);
    expect(s.totals.today).toBe(0);
    expect(s.days).toHaveLength(30);
  });

  it('a 31-day month counts day 31 toward quota; the graph window is independent', async () => {
    // 2026-03-01 falls outside the 30-day graph window from 2026-03-31 but
    // inside the March quota month; 2026-03-31 is the 31st day of the month.
    await seedEvents(['2026-03-01T08:00:00Z', '2026-03-31T22:00:00Z', '2026-02-28T10:00:00Z']);
    const fixedNow = new Date('2026-03-31T23:00:00Z');

    const s = await usageSummary(userId, 'trial', 30, fixedNow);

    expect(s.quota.used).toBe(2);
    expect(s.totals.allTime).toBe(3);
    expect(s.totals.last30Days).toBe(1);
    expect(s.days).toHaveLength(30);
  });

  it('month boundary: the first instant of the month counts, the last of the prior month does not', async () => {
    await seedEvents(['2026-02-01T00:00:00.000Z', '2026-01-31T23:59:59.999Z']);
    const fixedNow = new Date('2026-02-01T12:00:00Z');

    const s = await usageSummary(userId, 'trial', 30, fixedNow);

    expect(s.quota.used).toBe(1);
    expect(s.quota.overage).toBe(0);
    expect(s.totals.allTime).toBe(2);
  });

  it('remaining and overage derive from the current month against the plan quota', async () => {
    const quota = PLANS.trial.monthlyQuota;
    const events = Array.from({ length: quota + 3 }, (_, i) => `2026-02-${String((i % 27) + 1).padStart(2, '0')}T10:00:00Z`);
    await seedEvents(events);
    const fixedNow = new Date('2026-02-28T12:00:00Z');

    const s = await usageSummary(userId, 'trial', 30, fixedNow);

    expect(s.quota.used).toBe(quota + 3);
    expect(s.quota.remaining).toBe(0);
    expect(s.quota.overage).toBe(3);
  });
});
