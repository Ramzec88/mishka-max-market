import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getPublicUrl } from '@/lib/storage';
import { Banner } from '@/types/banner';

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('banners')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const withUrls = (data as Banner[]).map((b) => ({
      ...b,
      desktop_url: getPublicUrl(b.desktop_image_key),
      mobile_url: getPublicUrl(b.mobile_image_key),
    }));

    return NextResponse.json(withUrls);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.desktop_image_key || !body.mobile_image_key) {
      return NextResponse.json({ error: 'Нужны обе картинки — для десктопа и для мобильной версии' }, { status: 400 });
    }

    const { data: existing } = await supabaseAdmin
      .from('banners')
      .select('sort_order')
      .order('sort_order', { ascending: false })
      .limit(1)
      .single();
    const nextSortOrder = (existing?.sort_order ?? -1) + 1;

    const { data, error } = await supabaseAdmin
      .from('banners')
      .insert({
        desktop_image_key: body.desktop_image_key,
        mobile_image_key: body.mobile_image_key,
        link_url: body.link_url?.trim() || null,
        is_active: true,
        sort_order: nextSortOrder,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
