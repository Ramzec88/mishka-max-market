import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendOrderEmail, DownloadItem } from '@/lib/email';
import { getFileSizeBytes } from '@/lib/storage';

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, email, status')
      .eq('id', params.id)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Заказ не найден' }, { status: 404 });
    }
    if (order.status !== 'paid') {
      return NextResponse.json({ error: 'Заказ не оплачен' }, { status: 400 });
    }

    const { data: tokens } = await supabaseAdmin
      .from('download_tokens')
      .select('token, product_id, file_path')
      .eq('order_id', params.id);

    if (!tokens || tokens.length === 0) {
      return NextResponse.json({ error: 'Токены не найдены' }, { status: 404 });
    }

    const productIds = [...new Set(tokens.map((t) => t.product_id))];
    const { data: products } = await supabaseAdmin
      .from('products')
      .select('id, title, format')
      .in('id', productIds);

    const productMap = new Map((products || []).map((p) => [p.id, p]));
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || '';

    const items: DownloadItem[] = await Promise.all(
      tokens.map(async (t) => {
        const product = productMap.get(t.product_id);
        const fileSizeBytes = await getFileSizeBytes(t.file_path) ?? undefined;
        return {
          title: product?.title || t.product_id,
          format: product?.format || null,
          fileName: t.file_path.split('/').pop() || t.file_path,
          downloadUrl: `${siteUrl}/api/download/${t.token}`,
          fileSizeBytes,
        };
      })
    );

    await sendOrderEmail({ to: order.email, orderId: order.id, items, siteUrl });

    await supabaseAdmin
      .from('orders')
      .update({ email_sent_at: new Date().toISOString() })
      .eq('id', order.id);

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('resend-email error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
