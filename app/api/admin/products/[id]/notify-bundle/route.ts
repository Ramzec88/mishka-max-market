import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendOrderEmail } from '@/lib/email';
import { resolveProductsForOrder, createTokensForProducts } from '@/lib/order-tokens';

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const bundleProductId = params.id;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || '';

    // Load the bundle product
    const { data: bundle } = await supabaseAdmin
      .from('products')
      .select('id, title, bundle_product_ids')
      .eq('id', bundleProductId)
      .single();

    if (!bundle || !bundle.bundle_product_ids?.length) {
      return NextResponse.json({ error: 'Нет включённых товаров в комплекте' }, { status: 400 });
    }

    // Find all paid orders that contain this bundle product
    const { data: allPaidOrders } = await supabaseAdmin
      .from('orders')
      .select('id, email, items')
      .eq('status', 'paid');

    const orders = (allPaidOrders || []).filter((o) =>
      Array.isArray(o.items) && (o.items as string[]).includes(bundleProductId),
    );

    if (!orders || orders.length === 0) {
      return NextResponse.json({ notified: 0, message: 'Покупателей комплекта не найдено' });
    }

    let notified = 0;
    const errors: string[] = [];

    for (const order of orders) {
      try {
        // Resolve all products for this order (includes bundle expansion)
        const products = await resolveProductsForOrder(order.items as string[]);

        // Create tokens only for files that don't have tokens yet (new series)
        const newItems = await createTokensForProducts(order.id, products, siteUrl);

        if (newItems.length === 0) continue; // nothing new for this order

        // Send update email
        await sendOrderEmail({
          to: order.email,
          orderId: order.id,
          items: newItems,
          siteUrl,
          subject: `🆕 Новая серия добавлена в «${bundle.title}»`,
        });

        notified++;
      } catch (err) {
        errors.push(`${order.email}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    return NextResponse.json({ notified, total: orders.length, errors });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
