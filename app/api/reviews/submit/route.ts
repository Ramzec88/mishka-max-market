import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { orderId, productId, name, rating, body } = await req.json() as {
      orderId: string;
      productId: string;
      name?: string;
      rating: number;
      body?: string;
    };

    if (!orderId || !productId) {
      return NextResponse.json({ error: 'orderId и productId обязательны' }, { status: 400 });
    }
    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Оценка должна быть от 1 до 5' }, { status: 400 });
    }

    // Validate order is paid and belongs to request
    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('id, email, items, status')
      .eq('id', orderId)
      .single();

    if (!order || order.status !== 'paid') {
      return NextResponse.json({ error: 'Заказ не найден или не оплачен' }, { status: 400 });
    }

    // Validate order contains the product (or bundle that includes it)
    const items: string[] = Array.isArray(order.items) ? order.items : [];
    const { data: bundles } = await supabaseAdmin
      .from('products')
      .select('id')
      .contains('bundle_product_ids', [productId]);
    const bundleIds = (bundles || []).map((b: { id: string }) => b.id);
    const eligible = items.includes(productId) || items.some(id => bundleIds.includes(id));

    if (!eligible) {
      return NextResponse.json({ error: 'Этот товар не входит в ваш заказ' }, { status: 403 });
    }

    // Upsert review (allow updating existing)
    const { error } = await supabaseAdmin
      .from('reviews')
      .upsert(
        {
          order_id: orderId,
          product_id: productId,
          email: order.email,
          name: name || null,
          rating,
          body: body || null,
          is_published: false,
        },
        { onConflict: 'order_id,product_id' },
      );

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
