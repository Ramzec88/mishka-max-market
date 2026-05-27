import { supabaseAdmin } from '@/lib/supabase/admin';

export interface AbandonedCartTarget {
  email: string;
  totalAmount: number; // kopecks — amount of the most recent failed order
  attempts: number;
  lastAttempt: string;
  itemIds: string[]; // product IDs from the most recent failed order
}

export async function getAbandonedCartTargets(): Promise<AbandonedCartTarget[]> {
  const [ordersResult, outreachResult] = await Promise.all([
    supabaseAdmin
      .from('orders')
      .select('id, email, status, amount, paid_at, created_at, items')
      .order('created_at', { ascending: false }),
    supabaseAdmin
      .from('admin_outreach')
      .select('email, contacted_at'),
  ]);

  const orders = (ordersResult.data ?? []) as {
    id: string; email: string; status: string; amount: number;
    paid_at: string | null; created_at: string; items: string[];
  }[];

  const contactedMap = new Map<string, string>(
    (outreachResult.data ?? []).map((r) => [r.email, r.contacted_at]),
  );

  // Group orders by email
  const byEmail = new Map<string, typeof orders>();
  for (const o of orders) {
    const list = byEmail.get(o.email) ?? [];
    list.push(o);
    byEmail.set(o.email, list);
  }

  const targets: AbandonedCartTarget[] = [];

  for (const [email, list] of Array.from(byEmail.entries())) {
    const failed = list.filter((o) => o.status === 'canceled' || o.status === 'failed');
    if (failed.length === 0) continue;

    // Skip if they successfully paid (without being contacted first)
    const hasPaid = list.some((o) => o.status === 'paid');
    const contactedAt = contactedMap.get(email);
    if (hasPaid) {
      // Paid after contact = converted, skip. Paid before contact = happy customer, skip.
      continue;
    }

    // Skip if already contacted (letter already sent)
    if (contactedAt) continue;

    // Most recent failed order for item list
    const latestFailed = failed[0];

    targets.push({
      email,
      totalAmount: latestFailed.amount, // use latest order amount, not sum of all attempts
      attempts: failed.length,
      lastAttempt: latestFailed.created_at,
      itemIds: latestFailed.items ?? [],
    });
  }

  // Most recent first
  targets.sort((a, b) => new Date(b.lastAttempt).getTime() - new Date(a.lastAttempt).getTime());
  return targets;
}
