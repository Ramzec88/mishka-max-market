import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createPayment } from '@/lib/yookassa';
import { Product } from '@/types/product';

function applyDiscount(
  items: { description: string; amount: number; quantity: number }[],
  discountAmount: number,
) {
  if (discountAmount === 0) return items;
  const total = items.reduce((s, i) => s + i.amount, 0);
  const after = total - discountAmount;
  let distributed = 0;
  return items.map((item, idx) => {
    if (idx === items.length - 1) {
      return { ...item, amount: after - distributed };
    }
    const price = Math.round((item.amount * after) / total);
    distributed += price;
    return { ...item, amount: price };
  });
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
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Некорректный email' }, { status: 400 });
    }

    // Загружаем актуальные цены из БД
    const { data: products, error: productsError } = await supabaseAdmin
      .from('products')
      .select('id, title, price, format')
      .in('id', items)
      .eq('is_active', true);

    if (productsError || !products || products.length === 0) {
      return NextResponse.json({ error: 'Товары не найдены в базе данных' }, { status: 400 });
    }

    const foundProducts = products as Pick<Product, 'id' | 'title' | 'price' | 'format'>[];
    const fullAmount = foundProducts.reduce((sum, p) => sum + p.price, 0);

    // Валидируем промокод на сервере
    let discountPercent = 0;
    let validatedPromoCode: string | null = null;

    if (promoCode?.trim()) {
      const { data: promo } = await supabaseAdmin
        .from('promo_codes')
        .select('code, discount_percent, max_uses, uses_count, expires_at, is_active')
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
      }
    }

    const discountAmount = Math.round(fullAmount * discountPercent / 100);
    const finalAmount = Math.max(fullAmount - discountAmount, 100); // минимум 1 рубль

    // Создаём заказ
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        email,
        items: foundProducts.map((p) => p.id),
        amount: finalAmount,
        status: 'pending',
        promo_code: validatedPromoCode,
        discount_amount: discountAmount,
      })
      .select('id')
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Ошибка создания заказа', detail: orderError?.message }, { status: 500 });
    }

    // Строим позиции чека с учётом скидки
    const receiptItemsRaw = foundProducts.map((p) => ({
      description: p.title,
      amount: p.price,
      quantity: 1,
    }));
    const receiptItems = applyDiscount(receiptItemsRaw, discountAmount);

    // Создаём платёж в YooKassa
    const payment = await createPayment({
      orderId: order.id,
      amount: finalAmount,
      email,
      description: `Маркет Мишки Макса — заказ ${order.id.slice(0, 8)}`,
      receiptItems,
    });

    await supabaseAdmin
      .from('orders')
      .update({ yookassa_payment_id: payment.id })
      .eq('id', order.id);

    const confirmationToken =
      payment.confirmation && 'confirmation_token' in payment.confirmation
        ? (payment.confirmation as { confirmation_token: string }).confirmation_token
        : null;

    return NextResponse.json({ confirmation_token: confirmationToken, order_id: order.id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('create-payment error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
