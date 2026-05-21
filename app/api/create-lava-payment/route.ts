import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createLavaInvoice } from '@/lib/lava';
import { Product } from '@/types/product';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { items, email, promoCode } = body as {
      items: string[];
      email: string;
      promoCode?: string;
    };

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Корзина пуста' }, { status: 400 });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Некорректный email' }, { status: 400 });
    }

    const offerId = process.env.LAVA_OFFER_ID;
    if (!offerId) {
      return NextResponse.json({ error: 'Lava Top не настроен' }, { status: 500 });
    }

    // Загружаем актуальные цены из БД
    const { data: products, error: productsError } = await supabaseAdmin
      .from('products')
      .select('id, title, price, format')
      .in('id', items)
      .eq('is_active', true);

    if (productsError || !products || products.length === 0) {
      return NextResponse.json({ error: 'Товары не найдены' }, { status: 400 });
    }

    const foundProducts = products as Pick<Product, 'id' | 'title' | 'price' | 'format'>[];
    const fullAmount = foundProducts.reduce((sum, p) => sum + p.price, 0);

    // Промокод
    let discountPercent = 0;
    let validatedPromoCode: string | null = null;
    let applicableProductIds: string[] | null = null;

    if (promoCode?.trim()) {
      const { data: promo } = await supabaseAdmin
        .from('promo_codes')
        .select('code, discount_percent, applicable_product_ids, max_uses, uses_count, expires_at, is_active')
        .eq('code', promoCode.trim().toUpperCase())
        .single();

      const isValid =
        promo &&
        promo.is_active &&
        (!promo.expires_at || new Date(promo.expires_at) >= new Date()) &&
        (promo.max_uses === null || promo.uses_count < promo.max_uses);

      if (isValid) {
        discountPercent = promo.discount_percent;
        validatedPromoCode = promo.code;
        applicableProductIds = promo.applicable_product_ids?.length > 0
          ? promo.applicable_product_ids as string[]
          : null;
      }
    }

    const applicableProducts = applicableProductIds
      ? foundProducts.filter((p) => applicableProductIds!.includes(p.id))
      : foundProducts;
    const applicableAmount = applicableProducts.reduce((s, p) => s + p.price, 0);
    const discountAmount = Math.round(applicableAmount * discountPercent / 100);
    const finalAmount = Math.max(fullAmount - discountAmount, 100);

    // Создаём заказ
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        email,
        items: foundProducts.map((p) => p.id),
        amount: finalAmount,
        status: 'pending',
        payment_provider: 'lava',
        promo_code: validatedPromoCode,
        discount_amount: discountAmount,
      })
      .select('id')
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Ошибка создания заказа', detail: orderError?.message }, { status: 500 });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || '';

    // Создаём инвойс в Lava Top (сумма в рублях)
    const invoice = await createLavaInvoice({
      email,
      offerId,
      currency: 'RUB',
      amount: Math.round(finalAmount / 100),
      successUrl: `${siteUrl}/thank-you?order=${order.id}`,
      failUrl: `${siteUrl}/thank-you?order=${order.id}`,
    });

    // Сохраняем lava_contract_id
    await supabaseAdmin
      .from('orders')
      .update({ lava_contract_id: invoice.id })
      .eq('id', order.id);

    return NextResponse.json({ payment_url: invoice.paymentUrl, order_id: order.id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('create-lava-payment error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
