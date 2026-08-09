import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { deleteS3Objects } from '@/lib/storage';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const body = await request.json();
    const update: Record<string, unknown> = {};

    if (typeof body.is_active === 'boolean') update.is_active = body.is_active;
    if ('link_url' in body) update.link_url = body.link_url?.trim() || null;
    if (typeof body.sort_order === 'number') update.sort_order = body.sort_order;

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'Нет данных для обновления' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('banners')
      .update(update)
      .eq('id', params.id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { data: banner } = await supabaseAdmin
      .from('banners')
      .select('desktop_image_key, mobile_image_key')
      .eq('id', params.id)
      .single();

    const { error } = await supabaseAdmin
      .from('banners')
      .delete()
      .eq('id', params.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    if (banner) {
      try { await deleteS3Objects([banner.desktop_image_key, banner.mobile_image_key]); } catch { /* non-critical */ }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
