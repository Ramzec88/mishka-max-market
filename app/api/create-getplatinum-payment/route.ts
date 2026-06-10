import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createGetPlatinumPayment } from '@/lib/getplatinum';
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
      .select('id, title, price, bump_price, format, category')
      .in('id', items)
      .eq('is_active', true);

    if (productsError || !products || products.length === 0) {
      return NextResponse.json({ error: 'Товары не найдены в базе данных' }, { status: 400 });
    }

    const foundProducts = (
      products as (Pick<Product, 'id' | 'title' | 'price' | 'bump_price' | 'format'> & {
        category: string;
      })[]
    ).map((p) => ({
      ...p,
      effectivePrice: bumpedSet.has(p.id) ? (p.bump_price ?? Math.round(p.price * 0.85)) : p.price,
    }));

    const fullAmount = foundProducts.reduce((sum, p) => sum + p.effectivePrice, 0);

    const allForDiscount = foundProducts
      .filter((p) => p.category !== 'bundles')
      .map((p) => ({ id: p.id, price: Math.round(p.effectivePrice / 100), category: p.category }));
    const mainForAnchor = foundProducts
      .filter(
        (p) =>
          !bumpedSet.has(p.id) &&
          Math.round(p.effectivePrice / 100) >= MICRO_MAX_PRICE_RUB &&
          p.category !== 'bundles',
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
        payment_provider: 'getplatinum',
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

    const origin =
      (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '') ||
      request.headers.get('origin') ||
      `https://${request.headers.get('host')}`;

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || origin;
    const thankYouUrl = `${origin}/thank-you?order=${order.id}`;
    const notificationUrl = `${siteUrl}/api/getplatinum/webhook`;

    // Build receipt positions — distribute discount proportionally across items
    const totalBeforeDiscount = foundProducts.reduce((s, p) => s + Math.round(p.effectivePrice * (1 - volumeDiscountRate)), 0);
    const totalDiscount = discountAmount;
    let distributed = 0;

    const positions = foundProducts.map((p, idx) => {
      const basePrice = Math.round(p.effectivePrice * (1 - volumeDiscountRate));
      let itemPrice: number;
      if (totalDiscount === 0 || totalBeforeDiscount === 0) {
        itemPrice = basePrice;
      } else if (idx === foundProducts.length - 1) {
        itemPrice = Math.max(1, finalAmount - distributed);
      } else {
        itemPrice = Math.max(1, Math.round((basePrice * (totalBeforeDiscount - totalDiscount)) / totalBeforeDiscount));
        distributed += itemPrice;
      }
      return {
        prefix: 41, // Обучение
        name: p.title.slice(0, 128),
        price: itemPrice,
        quantity: 1,
        vat: 'none' as const,
      };
    });

    const payment = await createGetPlatinumPayment({
      dealId: order.id,
      amount: finalAmount,
      positions,
      email,
      notificationUrl,
      successUrl: thankYouUrl,
      failUrl: thankYouUrl,
    });

    return NextResponse.json({ payment_url: payment.formUrl, order_id: order.id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('create-getplatinum-payment error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
