import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { generateToken, getTokenExpiry } from '@/lib/tokens';
import { sendOrderEmail, DownloadItem } from '@/lib/email';
import { getFileSizeBytes } from '@/lib/storage';
import { Product } from '@/types/product';

interface LavaWebhookPayload {
  eventType: 'payment.success' | 'payment.failed' | string;
  contractId: string;
  buyer: { email: string };
  amount: number;
  currency: string;
  status: string;
  errorMessage?: string;
  product?: { id: string; title: string };
  timestamp?: string;
}

function checkWebhookAuth(request: NextRequest): boolean {
  const secret = process.env.LAVA_WEBHOOK_API_KEY;
  if (!secret) return true;

  const xApiKey = request.headers.get('x-api-key') || '';
  return xApiKey === secret;
}

export async function POST(request: NextRequest) {
  if (!checkWebhookAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const payload: LavaWebhookPayload = await request.json();
    const { eventType, contractId } = payload;

    if (!eventType || !contractId) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('lava_contract_id', contractId)
      .single();

    if (orderError || !order) {
      // Неизвестный контракт — отвечаем 200 чтобы Lava не ретраила
      return NextResponse.json({ ok: true });
    }

    // Идемпотентность
    if (order.webhook_processed_at) {
      return NextResponse.json({ ok: true });
    }

    if (eventType === 'payment.success') {
      const itemIds: string[] = order.items;
      const { data: products } = await supabaseAdmin
        .from('products')
        .select('id, title, format, storage_paths')
        .in('id', itemIds);

      const productList = (products || []) as Pick<Product, 'id' | 'title' | 'format' | 'storage_paths'>[];
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
          if (tokenError) console.error('download_tokens insert error:', tokenError);

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

      await supabaseAdmin
        .from('orders')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          webhook_processed_at: new Date().toISOString(),
        })
        .eq('id', order.id);

      if (order.promo_code) {
        await supabaseAdmin.rpc('increment_promo_uses', { promo_code_val: order.promo_code });
      }

      try {
        await sendOrderEmail({ to: order.email, orderId: order.id, items: downloadItems, siteUrl });
        await supabaseAdmin
          .from('orders')
          .update({ email_sent_at: new Date().toISOString() })
          .eq('id', order.id);
      } catch (emailErr) {
        console.error('Email send error:', emailErr);
      }
    } else if (eventType === 'payment.failed') {
      await supabaseAdmin
        .from('orders')
        .update({
          status: 'failed',
          webhook_processed_at: new Date().toISOString(),
          cancellation_reason: payload.errorMessage || null,
        })
        .eq('id', order.id);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('lava webhook error:', err);
    // Возвращаем 500 чтобы Lava повторила попытку
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
