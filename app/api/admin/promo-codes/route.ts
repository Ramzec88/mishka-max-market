import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('promo_codes')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const code = body.code?.trim().toUpperCase();
    if (!code) return NextResponse.json({ error: 'Код обязателен' }, { status: 400 });

    const { data, error } = await supabaseAdmin
      .from('promo_codes')
      .insert({
        code,
        description: body.description?.trim() || null,
        discount_percent: Number(body.discount_percent) || 0,
        max_uses: body.max_uses ? Number(body.max_uses) : null,
        expires_at: body.expires_at || null,
        applicable_product_ids: Array.isArray(body.applicable_product_ids) && body.applicable_product_ids.length > 0
          ? body.applicable_product_ids
          : null,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      const msg = error.code === '23505' ? 'Такой код уже существует' : error.message;
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
