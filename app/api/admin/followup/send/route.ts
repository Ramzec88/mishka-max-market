import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendFollowupEmail } from '@/lib/email';
import { getRecommendations } from '@/lib/recommendations';
import type { Product } from '@/types/product';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { productId, letterBody, subject, skipAttachment, includeAlreadySent, require7Days = true } = await req.json() as {
      productId: string;
      letterBody: string;
      subject: string;
      skipAttachment?: boolean;
      includeAlreadySent?: boolean;
      require7Days?: boolean;
    };

    if (!productId || !letterBody) {
      return NextResponse.json({ error: 'productId и letterBody обязательны' }, { status: 400 });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mishka-max.ru';
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: productData } = await supabaseAdmin
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();

    const targetProduct = productData as Product | null;

    const { data: allProductsData } = await supabaseAdmin
      .from('products')
      .select('*')
      .eq('is_active', true);

    const allProducts = (allProductsData || []) as Product[];
    const productMap = new Map(allProducts.map((p) => [p.id, p]));

    const isAll = productId === '__all__';

    let ordersQuery = supabaseAdmin
      .from('orders')
      .select('id, email, items')
      .eq('status', 'paid');

    if (require7Days) ordersQuery = ordersQuery.lte('paid_at', cutoff);

    const { data: orders } = await ordersQuery;
    let matching = orders || [];

    if (!isAll) {
      const { data: bundles } = await supabaseAdmin
        .from('products')
        .select('id')
        .contains('bundle_product_ids', [productId]);
      const bundleIds = (bundles || []).map((b: { id: string }) => b.id);
      const allMatchingIds = new Set([productId, ...bundleIds]);
      matching = matching.filter((o) =>
        Array.isArray(o.items) && o.items.some((id: string) => allMatchingIds.has(id)),
      );
    }

    if (matching.length === 0) return NextResponse.json({ sent: 0 });

    // When includeAlreadySent=false — filter out already-sent orders
    let pending = matching;
    if (!includeAlreadySent) {
      const orderIds = matching.map((o) => o.id);
      const { data: alreadySent } = await supabaseAdmin
        .from('followup_emails')
        .select('order_id')
        .eq('product_id', productId)
        .in('order_id', orderIds);
      const sentSet = new Set((alreadySent || []).map((r: { order_id: string }) => r.order_id));
      pending = matching.filter((o) => !sentSet.has(o.id));
    }

    // Deduplicate by email
    const emailToOrder = new Map<string, string>();
    for (const o of pending) {
      if (!emailToOrder.has(o.email)) emailToOrder.set(o.email, o.id);
    }

    let sent = 0;
    const errors: string[] = [];

    for (const [email, orderId] of Array.from(emailToOrder.entries())) {
      const order = matching.find((o) => o.id === orderId);
      const purchasedIds: string[] = order?.items ?? [];
      const recommended = getRecommendations(purchasedIds, Array.from(productMap.values()), 3);
      const recommendations = recommended.map((p) => ({
        title: p.title,
        price: p.price,
        emoji: p.cover_emoji || '🐻',
        url: `${siteUrl}/?product=${p.id}`,
      }));

      try {
        await sendFollowupEmail({
          to: email,
          letterBody,
          letterS3Key: skipAttachment ? null : (targetProduct?.letter_s3_key ?? null),
          siteUrl,
          subject: subject || '🐻 Письмо от Мишки Макса',
          recommendations,
        });

        // Upsert: update sent_at if record already exists (repeat send case)
        await supabaseAdmin
          .from('followup_emails')
          .upsert(
            { order_id: orderId, email, product_id: productId, sent_at: new Date().toISOString() },
            { onConflict: 'order_id,product_id' },
          );

        sent++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[followup send] failed for ${email}:`, msg);
        errors.push(`${email}: ${msg}`);
      }
    }

    return NextResponse.json({ sent, errors: errors.length ? errors : undefined });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
