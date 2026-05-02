import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();
    if (!code?.trim()) {
      return NextResponse.json({ error: 'Код не указан' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('promo_codes')
      .select('code, description, discount_percent, max_uses, uses_count, expires_at, is_active')
      .eq('code', code.trim().toUpperCase())
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Промокод не найден' }, { status: 404 });
    }
    if (!data.is_active) {
      return NextResponse.json({ error: 'Промокод недействителен' }, { status: 400 });
    }
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Срок действия промокода истёк' }, { status: 400 });
    }
    if (data.max_uses !== null && data.uses_count >= data.max_uses) {
      return NextResponse.json({ error: 'Промокод исчерпал лимит использований' }, { status: 400 });
    }

    return NextResponse.json({
      code: data.code,
      description: data.description,
      discount_percent: data.discount_percent,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
