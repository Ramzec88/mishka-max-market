import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendOrderEmail } from '@/lib/email';
import { YooKassaWebhookPayload } from '@/types/yookassa';
import { Product } from '@/types/product';
import { getRecommendations } from '@/lib/recommendations';
import { resolveProductsForOrder, createTokensForProducts } from '@/lib/order-tokens';

export async function POST(request: NextRequest) {
  try {
    const payload: YooKassaWebhookPayload = await request.json();
    const { event, object: payment } = payload;

    if (!event || !payment?.id) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // Находим заказ по payment_id
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('yookassa_payment_id', payment.id)
      .single();

    if (orderError || !order) {
      // Заказ не найден — возможно тест, отвечаем 200 чтобы YooKassa не ретраила
      return NextResponse.json({ ok: true });
    }

    // Идемпотентность — если уже обработан, пропускаем
    if (order.webhook_processed_at) {
      return NextResponse.json({ ok: true });
    }

    if (event === 'payment.succeeded') {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || '';
      const itemIds: string[] = order.items;

      // Resolve purchased products + expand bundle_product_ids into included products
      const products = await resolveProductsForOrder(itemIds);

      // Create download tokens (idempotent — skips already-existing file paths)
      const downloadItems = await createTokensForProducts(order.id, products, siteUrl);

      await supabaseAdmin
        .from('orders')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          webhook_processed_at: new Date().toISOString(),
        })
        .eq('id', order.id);

      if (order.promo_code) {
        await supabaseAdmin.rpc('increment_promo_uses', { promo_code_val: order.promo_code });
      }

      const { data: allProducts } = await supabaseAdmin
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      const recommendations = getRecommendations(itemIds, (allProducts ?? []) as Product[]);

      const allProductsMap = new Map((allProducts ?? []).map((p) => [p.id, p]));
      const reviewItems = itemIds
        .map((id) => allProductsMap.get(id))
        .filter(Boolean)
        .map((p) => ({ productId: p!.id, title: p!.title }));

      try {
        await sendOrderEmail({
          to: order.email,
          orderId: order.id,
          items: downloadItems,
          siteUrl,
          recommendations: recommendations.map((p) => ({
            title: p.title,
            price: p.price,
            emoji: p.cover_emoji ?? '🎵',
            url: `${siteUrl}/?product=${p.id}`,
          })),
          reviewItems,
        });
        await supabaseAdmin
          .from('orders')
          .update({ email_sent_at: new Date().toISOString() })
          .eq('id', order.id);
      } catch (emailErr) {
        console.error('Email send error:', emailErr);
      }
    } else if (event === 'payment.canceled') {
      await supabaseAdmin
        .from('orders')
        .update({
          status: 'canceled',
          webhook_processed_at: new Date().toISOString(),
          cancellation_reason: payment.cancellation_details?.reason ?? null,
        })
        .eq('id', order.id);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('webhook error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
