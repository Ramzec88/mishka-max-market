import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { productId } = await req.json() as { productId: string };
    if (!productId) return NextResponse.json({ error: 'productId обязателен' }, { status: 400 });

    // All paid orders containing this product
    const { data: orders, error } = await supabaseAdmin
      .from('orders')
      .select('id, email, items, paid_at')
      .eq('status', 'paid');

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const matching = (orders || []).filter((o) =>
      Array.isArray(o.items) && o.items.includes(productId),
    );

    if (matching.length === 0) {
      return NextResponse.json({ newCount: 0, repeatCount: 0, newRecipients: [], repeatRecipients: [] });
    }

    const orderIds = matching.map((o) => o.id);

    // Which ones already got a follow-up for this product?
    const { data: alreadySent } = await supabaseAdmin
      .from('followup_emails')
      .select('order_id, sent_at')
      .eq('product_id', productId)
      .in('order_id', orderIds);

    const sentMap = new Map(
      (alreadySent || []).map((r: { order_id: string; sent_at: string }) => [r.order_id, r.sent_at]),
    );

    // Deduplicate by email within each group
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
