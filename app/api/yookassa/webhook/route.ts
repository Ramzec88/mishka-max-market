import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { generateToken, getTokenExpiry } from '@/lib/tokens';
import { sendOrderEmail, DownloadItem } from '@/lib/email';
import { getFileSizeBytes } from '@/lib/storage';
import { YooKassaWebhookPayload } from '@/types/yookassa';
import { Product } from '@/types/product';

export async function POST(request: NextRequest) {
  try {
    const payload: YooKassaWebhookPayload = await request.json();
    const { event, object: payment } = payload;

    if (!event || !payment?.id) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // Находим заказ по payment_id
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('yookassa_payment_id', payment.id)
      .single();

    if (orderError || !order) {
      // Заказ не найден — возможно тест, отвечаем 200 чтобы YooKassa не ретраила
      return NextResponse.json({ ok: true });
    }

    // Идемпотентность — если уже обработан, пропускаем
    if (order.webhook_processed_at) {
      return NextResponse.json({ ok: true });
    }

    if (event === 'payment.succeeded') {
      // Обновляем статус заказа
      await supabaseAdmin
        .from('orders')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          webhook_processed_at: new Date().toISOString(),
        })
        .eq('id', order.id);

      // Загружаем продукты
      const itemIds: string[] = order.items;
      const { data: products } = await supabaseAdmin
        .from('products')
        .select('id, title, format, storage_paths')
        .in('id', itemIds);

      const productList = (products || []) as Pick<Product, 'id' | 'title' | 'format' | 'storage_paths'>[];

      // Создаём токены скачивания (один токен на продукт/файл)
      const downloadItems: DownloadItem[] = [];
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || '';

      for (const product of productList) {
        const filePaths =
          product.storage_paths.length > 0
            ? product.storage_paths
            : [`products/${product.id}/placeholder`];

        for (const filePath of filePaths) {
          const token = generateToken();
          const expiresAt = getTokenExpiry();

          const { error: tokenError } = await supabaseAdmin.from('download_tokens').insert({
            token,
            order_id: order.id,
            product_id: product.id,
            file_path: filePath,
            expires_at: expiresAt.toISOString(),
            downloads_count: 0,
            max_downloads: 5,
          });
          if (tokenError) {
            console.error('download_tokens insert error:', tokenError);
          }

          const fileName = filePath.split('/').pop() || filePath;
          const fileSizeBytes = await getFileSizeBytes(filePath) ?? undefined;
          downloadItems.push({
            title: product.title,
            format: product.format,
            fileName,
            downloadUrl: `${siteUrl}/api/download/${token}`,
            fileSizeBytes,
          });
        }
      }

      // Отправляем email с ссылками
      try {
        await sendOrderEmail({
          to: order.email,
          orderId: order.id,
          items: downloadItems,
          siteUrl,
        });

        await supabaseAdmin
          .from('orders')
          .update({ email_sent_at: new Date().toISOString() })
          .eq('id', order.id);
      } catch (emailErr) {
        console.error('Email send error:', emailErr);
        // Не фейлим webhook из-за ошибки email — файлы доступны через thank-you страницу
      }
    } else if (event === 'payment.canceled') {
      await supabaseAdmin
        .from('orders')
        .update({
          status: 'canceled',
          webhook_processed_at: new Date().toISOString(),
        })
        .eq('id', order.id);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('webhook error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
