import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SESSION_COOKIE_NAME, userFromToken } from '@/lib/auth';
import { listKeys } from '@/lib/keys';
import { usageSummary } from '@/lib/usage';
import { PLANS } from '@/lib/plans';
import { isBillingConfigured } from '@/lib/dodo';
import { DashboardClient } from '@/components/DashboardClient';

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'API keys, usage and plan for your einvoicecheck.ae account.',
  robots: { index: false, follow: false },
};

// Never prerender: this page reads Mongo and the session cookie.
export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  const user = await userFromToken(token);
  if (!user) redirect('/login');

  const [keys, usage] = await Promise.all([
    listKeys(user._id),
    usageSummary(user._id, user.plan),
  ]);

  return (
    <DashboardClient
      email={user.email}
      plan={user.plan}
      planName={PLANS[user.plan].name}
      subscriptionStatus={user.subscriptionStatus}
      cancelAtPeriodEnd={user.cancelAtPeriodEnd}
      currentPeriodEnd={user.currentPeriodEnd ? new Date(user.currentPeriodEnd).toISOString() : null}
      hasSubscription={Boolean(user.dodoSubscriptionId)}
      billingConfigured={isBillingConfigured()}
      keys={keys}
      usage={usage}
    />
  );
}
