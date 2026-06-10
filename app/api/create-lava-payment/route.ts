import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createLavaInvoice, LavaProvider } from '@/lib/lava';
import { isValidLavaEmail, lavaErrorMessage, normalizeLavaEmail } from '@/lib/lava-email';
import { Product } from '@/types/product';
import { calcDiscount, MICRO_MAX_PRICE_RUB } from '@/lib/discount';

const RUB_PER_USD = 76;

function rubToUsd(kopecks: number): number {
  return Math.max(5, Math.round(kopecks / 100 / RUB_PER_USD));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { items, email, promoCode, bumpedItems = [], paymentProvider } = body as {
      items: string[];
      email: string;
      promoCode?: string;
      bumpedItems?: string[];
      paymentProvider?: LavaProvider;
    };
    const bumpedSet = new Set(Array.isArray(bumpedItems) ? bumpedItems : []);

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Корзина пуста' }, { status: 400 });
    }
    const buyerEmail = normalizeLavaEmail(email || '');
    if (!isValidLavaEmail(buyerEmail)) {
      return NextResponse.json(
        {
          error:
            'Укажите email латиницей (например name@gmail.com). Кириллица и пробелы в адресе Lava не принимает.',
        },
        { status: 400 }
      );
    }

    const offerId = process.env.LAVA_OFFER_ID;
    if (!offerId) {
      return NextResponse.json({ error: 'Lava Top не настроен' }, { status: 500 });
    }

    const { data: products, error: productsError } = await supabaseAdmin
      .from('products')
      .select('id, title, price, bump_price, format, category')
      .in('id', items)
      .eq('is_active', true);

    if (productsError || !products || products.length === 0) {
      return NextResponse.json({ error: 'Товары не найдены' }, { status: 400 });
    }

    const foundProducts = (products as (Pick<Product, 'id' | 'title' | 'price' | 'bump_price' | 'format'> & { category: string })[]).map((p) => ({
      ...p,
      effectivePrice: bumpedSet.has(p.id) && p.category !== 'bundles' ? (p.bump_price ?? Math.round(p.price * 0.85)) : p.price,
    }));
    const fullAmount = foundProducts.reduce((sum, p) => sum + p.effectivePrice, 0);

    // Volume discount: bundles excluded (they have their own price), non-bumped for anchor
    const allForDiscount = foundProducts
      .filter(p => p.category !== 'bundles')
      .map(p => ({ id: p.id, price: Math.round(p.effectivePrice / 100), category: p.category }));
    // Anchor = main (non-bump, non-micro, non-bundle) items; otherwise → no discount
    const mainForAnchor = foundProducts
      .filter(p => !bumpedSet.has(p.id) && Math.round(p.effectivePrice / 100) >= MICRO_MAX_PRICE_RUB && p.category !== 'bundles')
      .map(p => ({ id: p.id, price: Math.round(p.effectivePrice / 100), category: p.category }));
    const volumeInfo = calcDiscount(allForDiscount, mainForAnchor);
    const volumeDiscountAmount = volumeInfo ? Math.round(volumeInfo.discountAmount * 100) : 0;
    const volumeDiscountRate = volumeInfo?.discountRate ?? 0;

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
    const applicableAmount = applicableProducts.reduce((s, p) => s + p.effectivePrice, 0);
    const discountAmount = Math.round(applicableAmount * discountPercent / 100);
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
        email: buyerEmail,
        items: foundProducts.map((p) => p.id),
        amount: finalAmount,
        status: 'pending',
        payment_provider: 'lava',
        promo_code: validatedPromoCode,
        discount_amount: discountAmount + volumeDiscountAmount,
        line_items: lineItems,
      })
      .select('id')
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Ошибка создания заказа', detail: orderError?.message }, { status: 500 });
    }

    const origin =
      (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '') ||
      request.headers.get('origin') ||
      `https://${request.headers.get('host')}`;
    const thankYouUrl = `${origin}/thank-you?order=${order.id}`;

    const isForeign = paymentProvider === 'UNLIMINT';
    const currency = isForeign ? 'USD' : 'RUB';
    const amount = isForeign ? rubToUsd(finalAmount) : Math.round(finalAmount / 100);

    const invoice = await createLavaInvoice({
      email: buyerEmail,
      offerId,
      currency,
      amount,
      paymentProvider: paymentProvider || undefined,
      buyerLanguage: 'RU',
      successUrl: thankYouUrl,
      failUrl: thankYouUrl,
      clientUtm: {
        utm_source: 'mishka-max-market',
        utm_medium: 'checkout',
        utm_campaign: 'lava',
        utm_content: order.id,
      },
    });

    await supabaseAdmin
      .from('orders')
      .update({ lava_contract_id: invoice.id })
      .eq('id', order.id);

    return NextResponse.json({ payment_url: invoice.paymentUrl, order_id: order.id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('create-lava-payment error:', message);
    return NextResponse.json({ error: lavaErrorMessage(message) }, { status: 500 });
  }
}
