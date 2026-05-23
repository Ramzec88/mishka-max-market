import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

// Returns the list of recipients who haven't received a follow-up for this product yet.
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

    // Filter: items must contain productId
    const matching = (orders || []).filter((o) =>
      Array.isArray(o.items) && o.items.includes(productId),
    );

    if (matching.length === 0) {
      return NextResponse.json({ count: 0, emails: [] });
    }

    const orderIds = matching.map((o) => o.id);

    // Which ones already got a follow-up for this product?
    const { data: alreadySent } = await supabaseAdmin
      .from('followup_emails')
      .select('order_id')
      .eq('product_id', productId)
      .in('order_id', orderIds);

    const sentSet = new Set((alreadySent || []).map((r: { order_id: string }) => r.order_id));

    const pending = matching.filter((o) => !sentSet.has(o.id));

    // Deduplicate by email (one email may have multiple orders for same product)
    const emailSet = new Set<string>();
    const result: { orderId: string; email: string; paidAt: string }[] = [];
    for (const o of pending) {
      if (!emailSet.has(o.email)) {
        emailSet.add(o.email);
        result.push({ orderId: o.id, email: o.email, paidAt: o.paid_at });
      }
    }

    return NextResponse.json({ count: result.length, recipients: result });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
