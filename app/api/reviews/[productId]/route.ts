import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(
  _req: NextRequest,
  { params }: { params: { productId: string } },
) {
  const { productId } = params;

  try {
    const { data, error } = await supabaseAdmin
      .from('reviews')
      .select('id, name, rating, body, created_at')
      .eq('product_id', productId)
      .eq('is_published', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[reviews/productId] supabase error', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ reviews: data ?? [] });
  } catch (err) {
    console.error('[reviews/productId] unexpected error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
