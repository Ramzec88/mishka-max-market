import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { buildRobokassaPaymentUrl } from '@/lib/robokassa';
import { Product } from '@/types/product';
import { calcDiscount, MICRO_MAX_PRICE_RUB } from '@/lib/discount';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { items, email, promoCode, bumpedItems = [] } = body as {
      items: string[];
      email: string;
      promoCode?: string;
      bumpedItems?: string[];
    };
    const bumpedSet = new Set(Array.isArray(bumpedItems) ? bumpedItems : []);

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Корзина пуста' }, { status: 400 });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Некорректный email' }, { status: 400 });
    }

    const { data: products, error: productsError } = await supabaseAdmin
      .from('products')
      .select('id, title, price, bump_price, format, category, is_bundle')
      .in('id', items)
      .eq('is_active', true);

    if (productsError || !products || products.length === 0) {
      return NextResponse.json({ error: 'Товары не найдены в базе данных' }, { status: 400 });
    }

    const foundProducts = (
      products as (Pick<Product, 'id' | 'title' | 'price' | 'bump_price' | 'format' | 'category' | 'is_bundle'>)[]
    ).map((p) => ({
      ...p,
      effectivePrice: bumpedSet.has(p.id) && !p.is_bundle ? (p.bump_price ?? Math.round(p.price * 0.85)) : p.price,
    }));

    const fullAmount = foundProducts.reduce((sum, p) => sum + p.effectivePrice, 0);

    const allForDiscount = foundProducts
      .filter((p) => !p.is_bundle)
      .map((p) => ({ id: p.id, price: Math.round(p.effectivePrice / 100), category: p.category }));
    const mainForAnchor = foundProducts
      .filter(
        (p) =>
          !bumpedSet.has(p.id) &&
          Math.round(p.effectivePrice / 100) >= MICRO_MAX_PRICE_RUB &&
          !p.is_bundle,
      )
      .map((p) => ({ id: p.id, price: Math.round(p.effectivePrice / 100), category: p.category }));
    const volumeInfo = calcDiscount(allForDiscount, mainForAnchor);
    const volumeDiscountAmount = volumeInfo ? Math.round(volumeInfo.discountAmount * 100) : 0;
    const volumeDiscountRate = volumeInfo?.discountRate ?? 0;

    let discountPercent = 0;
    let validatedPromoCode: string | null = null;
    let applicableProductIds: string[] | null = null;

    if (promoCode?.trim()) {
      const { data: promo } = await supabaseAdmin
        .from('promo_codes')
        .select(
          'code, discount_percent, applicable_product_ids, max_uses, uses_count, expires_at, is_active',
        )
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
        applicableProductIds =
          promo.applicable_product_ids?.length > 0
            ? (promo.applicable_product_ids as string[])
            : null;
      }
    }

    const applicableProducts = applicableProductIds
      ? foundProducts.filter((p) => applicableProductIds!.includes(p.id))
      : foundProducts;
    const applicableAmount = applicableProducts.reduce((s, p) => s + p.effectivePrice, 0);
    const discountAmount = Math.round((applicableAmount * discountPercent) / 100);
    const finalAmount = Math.max(fullAmount - volumeDiscountAmount - discountAmount, 100);

    const lineItems = foundProducts.map((p) => ({
      product_id: p.id,
      title: p.title,
      regular_price: p.price,
      paid_price: Math.round(p.effectivePrice * (1 - volumeDiscountRate)),
      is_bump: bumpedSet.has(p.id),
    }));

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        email,
        items: foundProducts.map((p) => p.id),
        amount: finalAmount,
        status: 'pending',
        payment_provider: 'robokassa',
        promo_code: validatedPromoCode,
        discount_amount: discountAmount + volumeDiscountAmount,
        line_items: lineItems,
      })
      .select('id')
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Ошибка создания заказа', detail: orderError?.message },
        { status: 500 },
      );
    }

    const description = foundProducts.length === 1
      ? foundProducts[0].title.slice(0, 100)
      : `Заказ №${order.id.slice(0, 8)} — ${foundProducts.length} товара`;

    const payment_url = buildRobokassaPaymentUrl({
      amountKopecks: finalAmount,
      description,
      email,
      orderId: order.id,
    });

    return NextResponse.json({ payment_url, order_id: order.id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('create-robokassa-payment error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
