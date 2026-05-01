import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { ProductInsert } from '@/types/product';

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('products')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const product: ProductInsert = {
      id: body.id,
      title: body.title,
      description: body.description || null,
      price: Math.round(Number(body.price) * 100),
      price_old: body.price_old ? Math.round(Number(body.price_old) * 100) : null,
      category: body.category,
      cover_emoji: body.cover_emoji || null,
      cover_image: body.cover_image || null,
      cover_variant: body.cover_variant || 'orange',
      badge: body.badge && body.badge !== '' ? body.badge : null,
      format: body.format || null,
      storage_paths: body.storage_paths || [],
      demo_url: body.demo_url || null,
      is_active: Boolean(body.is_active),
      sort_order: Number(body.sort_order) || 0,
    };

    const { data, error } = await supabaseAdmin
      .from('products')
      .insert(product)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
