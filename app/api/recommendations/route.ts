import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getRecommendations } from '@/lib/recommendations';
import { Product } from '@/types/product';

export async function GET(request: NextRequest) {
  const orderId = request.nextUrl.searchParams.get('order');
  if (!orderId) {
    return NextResponse.json({ error: 'Missing order' }, { status: 400 });
  }

  const { data: order } = await supabaseAdmin
    .from('orders')
    .select('items, status')
    .eq('id', orderId)
    .single();

  if (!order || order.status !== 'paid') {
    return NextResponse.json([]);
  }

  const purchasedIds: string[] = Array.isArray(order.items) ? order.items : [];

  const { data: allProducts } = await supabaseAdmin
    .from('products')
    .select('id, title, price, price_old, category, is_bundle, cover_emoji, cover_variant, badge, format, recommended_product_ids, is_active, sort_order')
    .eq('is_active', true)
    .order('sort_order');

  const recommendations = getRecommendations(
    purchasedIds,
    (allProducts ?? []) as Product[],
  );

  return NextResponse.json(
    recommendations.map((p) => ({
      id: p.id,
      title: p.title,
      price: p.price,
      price_old: p.price_old,
      category: p.category,
      cover_emoji: p.cover_emoji,
      cover_variant: p.cover_variant,
      badge: p.badge,
      format: p.format,
    })),
  );
}
