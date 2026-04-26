import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createPayment } from '@/lib/yookassa';
import { Product } from '@/types/product';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { items, email } = body as { items: string[]; email: string };

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Корзина пуста' }, { status: 400 });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Некорректный email' }, { status: 400 });
    }

    // Загружаем актуальные цены из БД (нельзя доверять клиенту)
    const { data: products, error: productsError } = await supabaseAdmin
      .from('products')
      .select('id, title, price, format')
      .in('id', items)
      .eq('is_active', true);

    if (productsError || !products || products.length === 0) {
      console.error('Products fetch error:', productsError);
      return NextResponse.json({ error: 'Товары не найдены в базе данных' }, { status: 400 });
    }

    const foundProducts = products as Pick<Product, 'id' | 'title' | 'price' | 'format'>[];
    const amount = foundProducts.reduce((sum, p) => sum + p.price, 0);

    // Создаём заказ в БД
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        email,
        items: foundProducts.map((p) => p.id),
        amount,
        status: 'pending',
      })
      .select('id')
      .single();

    if (orderError || !order) {
      console.error('Order creation error:', orderError);
      return NextResponse.json({
        error: 'Ошибка создания заказа',
        detail: orderError?.message,
        code: orderError?.code,
      }, { status: 500 });
    }

    // Создаём платёж в YooKassa
    const payment = await createPayment({
      orderId: order.id,
      amount,
      email,
      description: `Маркет Мишки Макса — заказ ${order.id.slice(0, 8)}`,
      receiptItems: foundProducts.map((p) => ({
        description: p.title,
        amount: p.price,
        quantity: 1,
      })),
    });

    // Сохраняем yookassa_payment_id
    await supabaseAdmin
      .from('orders')
      .update({ yookassa_payment_id: payment.id })
      .eq('id', order.id);

    const confirmationToken =
      payment.confirmation && 'confirmation_token' in payment.confirmation
        ? (payment.confirmation as { confirmation_token: string }).confirmation_token
        : null;

    return NextResponse.json({
      confirmation_token: confirmationToken,
      order_id: order.id,
    });
  } catch (err: unknown) {
    // Логируем полную ошибку и возвращаем её текст клиенту для диагностики
    console.error('create-payment error:', err);
    const message =
      err instanceof Error ? err.message : JSON.stringify(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
