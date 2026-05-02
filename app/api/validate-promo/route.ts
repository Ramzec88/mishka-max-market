import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    const { code, items } = await request.json() as { code: string; items?: string[] };
    if (!code?.trim()) {
      return NextResponse.json({ error: 'Код не указан' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('promo_codes')
      .select('code, discount_percent, applicable_product_ids, max_uses, uses_count, expires_at, is_active')
      .eq('code', code.trim().toUpperCase())
      .single();

    if (error || !data) return NextResponse.json({ error: 'Промокод не найден' }, { status: 404 });
    if (!data.is_active) return NextResponse.json({ error: 'Промокод недействителен' }, { status: 400 });
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Срок действия промокода истёк' }, { status: 400 });
    }
    if (data.max_uses !== null && data.uses_count >= data.max_uses) {
      return NextResponse.json({ error: 'Промокод исчерпал лимит использований' }, { status: 400 });
    }

    const applicableIds: string[] | null =
      data.applicable_product_ids?.length > 0 ? data.applicable_product_ids : null;

    // Если код ограничен по товарам — проверяем, есть ли в корзине хотя бы один
    if (applicableIds && items?.length) {
      const hasMatch = items.some((id) => applicableIds.includes(id));
      if (!hasMatch) {
        return NextResponse.json({ error: 'Промокод не действует на товары в вашей корзине' }, { status: 400 });
      }
    }

    // Считаем скидку в копейках по применимым товарам
    let discountAmount = 0;
    if (data.discount_percent > 0 && items?.length) {
      const { data: products } = await supabaseAdmin
        .from('products')
        .select('id, price')
        .in('id', items);

      const applicable = applicableIds
        ? (products || []).filter((p) => applicableIds.includes(p.id))
        : (products || []);

      const applicableTotal = applicable.reduce((s, p) => s + p.price, 0);
      discountAmount = Math.round(applicableTotal * data.discount_percent / 100);
    }

    return NextResponse.json({
      code: data.code,
      discount_percent: data.discount_percent,
      discount_amount: discountAmount,       // в копейках
      applicable_to_all: !applicableIds,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
