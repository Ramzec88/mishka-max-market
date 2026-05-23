import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendFollowupEmail } from '@/lib/email';
import { getRecommendations } from '@/lib/recommendations';
import type { Product } from '@/types/product';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Called by Vercel Cron (vercel.json) once a day.
// Also callable manually by admin via POST to /api/cron/followup
// with header  Authorization: Bearer <CRON_SECRET>
export async function GET(req: NextRequest) {
  return handleFollowup(req);
}

export async function POST(req: NextRequest) {
  return handleFollowup(req);
}

async function handleFollowup(req: NextRequest) {
  // Auth check — Vercel Cron sends the secret automatically;
  // manual admin calls must send it too.
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mishka-max.ru';

  // 1. Find paid orders that are 7+ days old and haven't received a follow-up yet
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: orders, error: ordersError } = await supabaseAdmin
    .from('orders')
    .select('id, email, items, paid_at')
    .eq('status', 'paid')
    .lte('paid_at', cutoff)
    .not('id', 'in', `(select order_id from followup_emails)`)
    .order('paid_at', { ascending: true })
    .limit(50); // process in batches to stay within timeout

  if (ordersError) {
    console.error('[followup cron] fetch orders error', ordersError);
    return NextResponse.json({ error: ordersError.message }, { status: 500 });
  }

  if (!orders || orders.length === 0) {
    return NextResponse.json({ sent: 0, message: 'No orders pending follow-up' });
  }

  // 2. Load all active products for recommendations
  const { data: allProducts } = await supabaseAdmin
    .from('products')
    .select('*')
    .eq('is_active', true);

  const productMap = new Map<string, Product>(
    (allProducts || []).map((p: Product) => [p.id, p]),
  );

  let sent = 0;
  const errors: string[] = [];

  for (const order of orders) {
    const purchasedIds: string[] = Array.isArray(order.items) ? order.items : [];
    const purchasedProducts = purchasedIds
      .map((id: string) => productMap.get(id))
      .filter(Boolean) as Product[];

    // Use the first purchased product as the "main" product in the letter
    const mainProduct = purchasedProducts[0];
    const productTitle = mainProduct?.title ?? 'серию с Мишкой Максом';

    // Build recommendations — exclude already purchased
    const recommendedProducts = getRecommendations(
      purchasedIds,
      Array.from(productMap.values()),
      3,
    );

    const recommendations = recommendedProducts.map((p) => ({
      title: p.title,
      price: p.price,
      emoji: p.cover_emoji || '🐻',
      url: `${siteUrl}/?product=${p.id}`,
    }));

    try {
      await sendFollowupEmail({
        to: order.email,
        productTitle,
        letterS3Key: mainProduct?.letter_s3_key ?? null,
        siteUrl,
        recommendations,
      });

      // Record as sent
      await supabaseAdmin
        .from('followup_emails')
        .insert({ order_id: order.id, email: order.email });

      sent++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[followup cron] failed for order ${order.id}:`, msg);
      errors.push(`${order.id}: ${msg}`);
    }
  }

  return NextResponse.json({ sent, errors: errors.length > 0 ? errors : undefined });
}
