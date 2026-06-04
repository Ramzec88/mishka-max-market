import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendOrderEmail } from '@/lib/email';
import { Product } from '@/types/product';
import { getRecommendations } from '@/lib/recommendations';
import { resolveProductsForOrder, createTokensForProducts } from '@/lib/order-tokens';

interface LavaWebhookPayload {
  eventType: 'payment.success' | 'payment.failed' | string;
  contractId: string;
  buyer: { email: string };
  amount: number;
  currency: string;
  status: string;
  errorMessage?: string;
  product?: { id: string; title: string };
  timestamp?: string;
}

export async function POST(request: NextRequest) {
  try {
    const payload: LavaWebhookPayload = await request.json();
    const { eventType, contractId } = payload;

    if (!eventType || !contractId) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('lava_contract_id', contractId)
      .single();

    if (orderError || !order) {
      // Неизвестный контракт — отвечаем 200 чтобы Lava не ретраила
      return NextResponse.json({ ok: true });
    }

    // Идемпотентность
    if (order.webhook_processed_at) {
      return NextResponse.json({ ok: true });
    }

    if (eventType === 'payment.success') {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || '';
      const itemIds: string[] = order.items;

      const products = await resolveProductsForOrder(itemIds);
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
        });
        await supabaseAdmin
          .from('orders')
          .update({ email_sent_at: new Date().toISOString() })
          .eq('id', order.id);
      } catch (emailErr) {
        console.error('Email send error:', emailErr);
      }
    } else if (eventType === 'payment.failed') {
      await supabaseAdmin
        .from('orders')
        .update({
          status: 'failed',
          webhook_processed_at: new Date().toISOString(),
          cancellation_reason: payload.errorMessage || null,
        })
        .eq('id', order.id);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('lava webhook error:', err);
    // Возвращаем 500 чтобы Lava повторила попытку
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
