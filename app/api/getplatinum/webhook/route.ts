import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendOrderEmail } from '@/lib/email';
import { verifyGetPlatinumChecksum } from '@/lib/getplatinum';
import { Product } from '@/types/product';
import { getRecommendations } from '@/lib/recommendations';
import { resolveProductsForOrder, createTokensForProducts } from '@/lib/order-tokens';

export const dynamic = 'force-dynamic';

interface PaymentNotification {
  notificationType: number;
  dealId: string;
  isSuccess: boolean;
  checksum: string;
  paymentData?: {
    mdOrder?: number;
    amount?: number;
    currency?: string;
    paymentSystem?: string;
  } | null;
  customParams?: Record<string, unknown>;
  [key: string]: unknown;
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as PaymentNotification;

    const { notificationType, dealId, isSuccess, checksum } = payload;

    if (!dealId || typeof checksum !== 'string') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // Verify checksum
    if (!verifyGetPlatinumChecksum(payload as unknown as Record<string, unknown>, checksum)) {
      console.error('[getplatinum webhook] checksum mismatch for dealId:', dealId);
      return NextResponse.json({ error: 'Checksum mismatch' }, { status: 400 });
    }

    // We only handle notificationType=1 (regular payment)
    if (notificationType !== 1) {
      return NextResponse.json({ ok: true });
    }

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', dealId)
      .single();

    if (orderError || !order) {
      // Unknown order — return 200 to avoid retries
      console.warn('[getplatinum webhook] order not found:', dealId);
      return NextResponse.json({ ok: true });
    }

    // Idempotency guard
    if (order.webhook_processed_at) {
      return NextResponse.json({ ok: true });
    }

    if (isSuccess) {
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
        console.error('[getplatinum webhook] email error:', emailErr);
      }
    } else {
      await supabaseAdmin
        .from('orders')
        .update({
          status: 'canceled',
          webhook_processed_at: new Date().toISOString(),
        })
        .eq('id', order.id);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[getplatinum webhook] error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
