import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendOrderEmail } from '@/lib/email';
import { verifyRobokassaResultSignature, getOrderIdFromRobokassaPayload } from '@/lib/robokassa';
import { Product } from '@/types/product';
import { getRecommendations } from '@/lib/recommendations';
import { resolveProductsForOrder, createTokensForProducts } from '@/lib/order-tokens';

export const dynamic = 'force-dynamic';

// Robokassa calls ResultURL only on a successful payment (no explicit "failed" notification —
// an abandoned/declined payment just never calls this, and the order stays pending until the
// stale-pending-order cron expires it). The dashboard's transfer method (GET or POST) is a
// per-merchant setting, so both are handled here.
async function handleResult(payload: Record<string, string>): Promise<NextResponse> {
  const { OutSum, InvId, SignatureValue } = payload;
  const orderId = getOrderIdFromRobokassaPayload(payload);

  if (!OutSum || !InvId || !SignatureValue || !orderId) {
    return new NextResponse('bad request', { status: 400 });
  }

  if (!verifyRobokassaResultSignature(payload)) {
    console.error('[robokassa webhook] signature mismatch for order:', orderId);
    return new NextResponse('bad sign', { status: 400 });
  }

  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single();

  if (orderError || !order) {
    console.warn('[robokassa webhook] order not found:', orderId);
    return new NextResponse(`OK${InvId}`);
  }

  if (order.webhook_processed_at) {
    return new NextResponse(`OK${InvId}`);
  }

  const paidKopecks = Math.round(parseFloat(OutSum) * 100);
  if (!Number.isFinite(paidKopecks) || Math.abs(paidKopecks - order.amount) > 1) {
    console.error('[robokassa webhook] amount mismatch', { orderId, paidKopecks, expected: order.amount });
    return new NextResponse('amount mismatch', { status: 400 });
  }

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
  const cloudItems = itemIds
    .map((id) => allProductsMap.get(id))
    .filter((p) => p && (p as Product & { cloud_url?: string }).cloud_url)
    .map((p) => ({ title: p!.title, cloudUrl: (p as Product & { cloud_url: string }).cloud_url }));

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
      cloudItems: cloudItems.length > 0 ? cloudItems : undefined,
    });
    await supabaseAdmin
      .from('orders')
      .update({ email_sent_at: new Date().toISOString() })
      .eq('id', order.id);
  } catch (emailErr) {
    console.error('[robokassa webhook] email error:', emailErr);
  }

  return new NextResponse(`OK${InvId}`);
}

function paramsToRecord(params: URLSearchParams): Record<string, string> {
  const record: Record<string, string> = {};
  params.forEach((value, key) => { record[key] = value; });
  return record;
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let payload: Record<string, string>;
    if (contentType.includes('application/json')) {
      payload = await request.json();
    } else {
      payload = paramsToRecord(new URLSearchParams(await request.text()));
    }
    return await handleResult(payload);
  } catch (err) {
    console.error('[robokassa webhook] error:', err);
    return new NextResponse('error', { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    return await handleResult(paramsToRecord(request.nextUrl.searchParams));
  } catch (err) {
    console.error('[robokassa webhook] error:', err);
    return new NextResponse('error', { status: 500 });
  }
}
