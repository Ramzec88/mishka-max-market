import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

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
    .select('id, status, email')
    .eq('id', id)
    .single();

  if (error || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  const response: { status: string; download_links?: unknown[] } = {
    status: order.status,
  };

  // Если заказ оплачен, возвращаем ссылки для скачивания
  if (order.status === 'paid') {
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

      response.download_links = tokens.map((t) => ({
        token: t.token,
        product_id: t.product_id,
        product_title: productMap.get(t.product_id) || t.product_id,
        file_name: t.file_path.split('/').pop() || t.file_path,
        expires_at: t.expires_at,
        downloads_remaining: t.max_downloads - t.downloads_count,
      }));
    }
  }

  return NextResponse.json(response);
}
