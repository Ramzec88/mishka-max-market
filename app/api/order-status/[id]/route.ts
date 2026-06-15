import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getFileSizeBytes } from '@/lib/storage';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  if (!id) {
    return NextResponse.json({ error: 'Missing order id' }, { status: 400 });
  }

  const { data: order, error } = await supabaseAdmin
    .from('orders')
    .select('id, status, email, amount, items, promo_code, discount_amount, cancellation_reason')
    .eq('id', id)
    .single();

  if (error || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  const response: {
    status: string;
    amount?: number;
    promo_code?: string | null;
    discount_amount?: number;
    cancellation_reason?: string | null;
    ecommerce_products?: { id: string; name: string; price: number }[];
    download_links?: unknown[];
    cloud_links?: { product_id: string; product_title: string; cloud_url: string }[];
  } = {
    status: order.status,
  };

  if (order.status === 'canceled' || order.status === 'failed') {
    response.cancellation_reason = order.cancellation_reason ?? null;
  }

  // Если заказ оплачен, возвращаем ссылки для скачивания и данные для ecommerce
  if (order.status === 'paid') {
    response.amount = order.amount;
    response.promo_code = order.promo_code;
    response.discount_amount = order.discount_amount;

    const itemIds: string[] = Array.isArray(order.items) ? order.items : [];
    if (itemIds.length > 0) {
      const { data: products } = await supabaseAdmin
        .from('products')
        .select('id, title, price, cloud_url')
        .in('id', itemIds);
      response.ecommerce_products = (products || []).map((p) => ({
        id: p.id,
        name: p.title,
        price: Math.round(p.price / 100),
      }));
      const cloudProducts = (products || []).filter((p) => p.cloud_url);
      if (cloudProducts.length > 0) {
        response.cloud_links = cloudProducts.map((p) => ({
          product_id: p.id,
          product_title: p.title,
          cloud_url: p.cloud_url as string,
        }));
      }
    }

    const { data: tokens } = await supabaseAdmin
      .from('download_tokens')
      .select('token, product_id, file_path, expires_at, downloads_count, max_downloads')
      .eq('order_id', id);

    if (tokens && tokens.length > 0) {
      const productIds = tokens.map((t) => t.product_id);
      const { data: products } = await supabaseAdmin
        .from('products')
        .select('id, title')
        .in('id', productIds);

      const productMap = new Map((products || []).map((p) => [p.id, p.title]));

      response.download_links = await Promise.all(tokens.map(async (t) => ({
        token: t.token,
        product_id: t.product_id,
        product_title: productMap.get(t.product_id) || t.product_id,
        file_name: t.file_path.split('/').pop() || t.file_path,
        expires_at: t.expires_at,
        downloads_remaining: t.max_downloads - t.downloads_count,
        file_size_bytes: await getFileSizeBytes(t.file_path),
      })));
    }
  }

  return NextResponse.json(response);
}
