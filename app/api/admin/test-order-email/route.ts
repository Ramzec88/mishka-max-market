import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendOrderEmail, DownloadItem } from '@/lib/email';
import { resolveProductsForOrder } from '@/lib/order-tokens';
import { getRecommendations } from '@/lib/recommendations';
import { Product } from '@/types/product';

// Previews the real order-delivery template/grouping for a product (or bundle) without
// creating an order or real download tokens — links are non-functional placeholders,
// this is purely for checking the email layout before a real customer sees it.
export async function POST(request: NextRequest) {
  try {
    const { productId, to } = await request.json() as { productId?: string; to?: string };
    if (!productId) return NextResponse.json({ error: 'Выберите товар' }, { status: 400 });
    if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      return NextResponse.json({ error: 'Некорректный email' }, { status: 400 });
    }

    const resolved = await resolveProductsForOrder([productId]);
    if (resolved.length === 0) {
      return NextResponse.json({ error: 'Товар не найден или у него нет файлов' }, { status: 404 });
    }

    const fakeOrderId = crypto.randomUUID();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || '';

    const items: DownloadItem[] = [];
    for (const { product, allowedPaths } of resolved) {
      const filePaths = allowedPaths ?? product.storage_paths;
      for (const filePath of filePaths) {
        items.push({
          title: product.title,
          format: product.format,
          fileName: filePath.split('/').pop() || filePath,
          downloadUrl: '#test-link-not-functional',
          productId: product.id,
        });
      }
    }

    if (items.length === 0) {
      return NextResponse.json({ error: 'У этого товара нет файлов для скачивания' }, { status: 400 });
    }

    const { data: allProducts } = await supabaseAdmin
      .from('products')
      .select('*')
      .eq('is_active', true);
    const recommendations = getRecommendations([productId], (allProducts ?? []) as Product[]);

    await sendOrderEmail({
      to,
      orderId: fakeOrderId,
      items,
      siteUrl,
      recommendations: recommendations.map((p) => ({
        title: p.title,
        price: p.price,
        emoji: p.cover_emoji ?? '🎵',
        url: `${siteUrl}/?product=${p.id}`,
      })),
      subject: '[ТЕСТ] Ваши материалы от Мишки Макса 🧸',
    });

    return NextResponse.json({ ok: true, itemCount: items.length });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
