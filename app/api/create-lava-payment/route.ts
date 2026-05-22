import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createLavaInvoice, LavaCurrency } from '@/lib/lava';
import { isValidLavaEmail, lavaErrorMessage, normalizeLavaEmail } from '@/lib/lava-email';
import { Product } from '@/types/product';

function getLavaCurrency(): LavaCurrency {
  const c = (process.env.LAVA_CURRENCY || 'USD').toUpperCase();
  if (c === 'RUB' || c === 'USD' || c === 'EUR') return c;
  return 'USD';
}

/** Сумма корзины в копейках (RUB) → сумма для Lava в валюте оффера */
function lavaAmountFromKopecks(kopecks: number, currency: LavaCurrency): number {
  if (currency === 'RUB') return Math.round(kopecks / 100);
  const rub = kopecks / 100;
  const rateEnv = currency === 'EUR' ? process.env.LAVA_RUB_PER_EUR : process.env.LAVA_RUB_PER_USD;
  const rate = Number(rateEnv || '95');
  if (!Number.isFinite(rate) || rate <= 0) return Math.max(1, Math.round(rub / 95));
  return Math.max(1, Math.round(rub / rate));
}

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
      .select('id, title, price, format')
      .in('id', items)
      .eq('is_active', true);

    if (productsError || !products || products.length === 0) {
      return NextResponse.json({ error: 'Товары не найдены' }, { status: 400 });
    }

    const foundProducts = products as Pick<Product, 'id' | 'title' | 'price' | 'format'>[];
    const fullAmount = foundProducts.reduce((sum, p) => sum + p.price, 0);

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

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        email: buyerEmail,
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

    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '');
    if (!siteUrl) {
      console.warn('create-lava-payment: NEXT_PUBLIC_SITE_URL не задан — Lava не сможет вернуть покупателя на /thank-you');
    }
    const thankYouUrl = siteUrl ? `${siteUrl}/thank-you?order=${order.id}` : undefined;

    const currency = getLavaCurrency();
    const invoice = await createLavaInvoice({
      email: buyerEmail,
      offerId,
      currency,
      buyerLanguage: 'RU',
      ...(thankYouUrl ? { successUrl: thankYouUrl, failUrl: thankYouUrl } : {}),
      clientUtm: {
        utm_source: 'mishka-max-market',
        utm_medium: 'checkout',
        utm_campaign: 'lava',
        utm_content: order.id,
      },
      ...(process.env.LAVA_PERIODICITY === 'MONTHLY' ? { periodicity: 'MONTHLY' as const } : {}),
      ...(process.env.LAVA_DYNAMIC_PRICE === 'true'
        ? { amount: lavaAmountFromKopecks(finalAmount, currency) }
        : {}),
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
