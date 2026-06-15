import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('reviews')
      .select('id, name, rating, body, created_at, product_id, products(title)')
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('[reviews/latest] supabase error', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Flatten the nested products join
    const reviews = (data ?? []).map((r: any) => ({
      id: r.id,
      name: r.name,
      rating: r.rating,
      body: r.body,
      created_at: r.created_at,
      product_id: r.product_id,
      product_title: (r.products as { title: string } | null)?.title ?? '',
    }));

    return NextResponse.json({ reviews });
  } catch (err) {
    console.error('[reviews/latest] unexpected error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
