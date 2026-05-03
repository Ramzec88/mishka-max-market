import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { deleteS3Objects } from '@/lib/storage';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data, error } = await supabaseAdmin
      .from('products')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const deleteKeys: string[] = Array.isArray(body._deleteKeys) ? body._deleteKeys : [];

    const updates: Record<string, unknown> = {
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
      boosty_url: body.boosty_url || null,
      lava_url: body.lava_url || null,
      is_active: Boolean(body.is_active),
      sort_order: Number(body.sort_order) || 0,
    };

    const { data, error } = await supabaseAdmin
      .from('products')
      .update(updates)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (deleteKeys.length > 0) {
      try { await deleteS3Objects(deleteKeys); } catch { /* non-critical */ }
    }

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data, error } = await supabaseAdmin
      .from('products')
      .update({ is_active: false })
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
