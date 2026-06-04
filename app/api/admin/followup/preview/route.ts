import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { productId, require7Days = true } = await req.json() as {
      productId: string;
      require7Days?: boolean;
    };
    if (!productId) return NextResponse.json({ error: 'productId обязателен' }, { status: 400 });

    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Also find bundles that contain this series so bundle buyers are included
    const { data: bundles } = await supabaseAdmin
      .from('products')
      .select('id')
      .contains('bundle_product_ids', [productId]);
    const bundleIds = (bundles || []).map((b: { id: string }) => b.id);
    const allMatchingIds = new Set([productId, ...bundleIds]);

    let query = supabaseAdmin
      .from('orders')
      .select('id, email, items, paid_at')
      .eq('status', 'paid');

    if (require7Days) query = query.lte('paid_at', cutoff);

    const { data: orders, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const matching = (orders || []).filter((o) =>
      Array.isArray(o.items) && o.items.some((id: string) => allMatchingIds.has(id)),
    );

    if (matching.length === 0) {
      return NextResponse.json({ newCount: 0, repeatCount: 0, newRecipients: [], repeatRecipients: [] });
    }

    const orderIds = matching.map((o) => o.id);

    const { data: alreadySent } = await supabaseAdmin
      .from('followup_emails')
      .select('order_id, sent_at')
      .eq('product_id', productId)
      .in('order_id', orderIds);

    const sentMap = new Map(
      (alreadySent || []).map((r: { order_id: string; sent_at: string }) => [r.order_id, r.sent_at]),
    );

    const newEmailSet = new Set<string>();
    const repeatEmailSet = new Set<string>();
    const newRecipients: { orderId: string; email: string; paidAt: string }[] = [];
    const repeatRecipients: { orderId: string; email: string; paidAt: string; sentAt: string }[] = [];

    for (const o of matching) {
      if (sentMap.has(o.id)) {
        if (!repeatEmailSet.has(o.email)) {
          repeatEmailSet.add(o.email);
          repeatRecipients.push({ orderId: o.id, email: o.email, paidAt: o.paid_at, sentAt: sentMap.get(o.id)! });
        }
      } else {
        if (!newEmailSet.has(o.email)) {
          newEmailSet.add(o.email);
          newRecipients.push({ orderId: o.id, email: o.email, paidAt: o.paid_at });
        }
      }
    }

    return NextResponse.json({
      newCount: newRecipients.length,
      repeatCount: repeatRecipients.length,
      newRecipients,
      repeatRecipients,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
