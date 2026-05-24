import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getRecommendations } from '@/lib/recommendations';
import { Product } from '@/types/product';

export async function GET(request: NextRequest) {
  const itemsParam = request.nextUrl.searchParams.get('items');
  if (!itemsParam) return NextResponse.json([]);

  const cartIds = itemsParam.split(',').map((s) => s.trim()).filter(Boolean);
  if (cartIds.length === 0) return NextResponse.json([]);

  const { data: allProducts } = await supabaseAdmin
    .from('products')
    .select('id, title, price, bump_price, category, cover_emoji, cover_variant, format, recommended_product_ids, is_active, sort_order')
    .eq('is_active', true)
    .order('sort_order');

  const recommendations = getRecommendations(
    cartIds,
    (allProducts ?? []) as Product[],
  );

  return NextResponse.json(
    recommendations.map((p) => ({
      id: p.id,
      title: p.title,
      price: p.price,
      bump_price: p.bump_price,
      cover_emoji: p.cover_emoji,
      cover_variant: p.cover_variant,
      format: p.format,
    })),
  );
}
