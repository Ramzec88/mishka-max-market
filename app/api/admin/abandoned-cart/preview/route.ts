import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getAbandonedCartTargets } from '@/lib/abandoned-cart-targets';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const promoCode = searchParams.get('promoCode') || '';
    const promoDiscount = Number(searchParams.get('promoDiscount') || '0');

    const targets = await getAbandonedCartTargets();

    if (targets.length === 0) {
      return NextResponse.json({ count: 0, emails: [], previewHtml: '' });
    }

    // Collect all unique product IDs across all targets
    const allItemIds = Array.from(new Set(targets.flatMap((t) => t.itemIds)));

    const { data: products } = await supabaseAdmin
      .from('products')
      .select('id, title, price, cover_emoji')
      .in('id', allItemIds.length > 0 ? allItemIds : ['__none__']);

    const productMap = new Map(
      (products ?? []).map((p) => [p.id, p as { id: string; title: string; price: number; cover_emoji: string | null }]),
    );

    // Build preview for the first target
    const sample = targets[0];
    const sampleItems = sample.itemIds
      .map((id) => productMap.get(id))
      .filter(Boolean) as { id: string; title: string; price: number; cover_emoji: string | null }[];

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mishka-max.ru';

    const itemsHtml = sampleItems
      .map(
        (item) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #F5EDE3;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="width:36px;font-size:26px;vertical-align:middle;">${item.cover_emoji ?? '📦'}</td>
            <td style="vertical-align:middle;padding:0 12px;">
              <div style="font-weight:700;font-size:14px;color:#1F1B16;">${item.title}</div>
            </td>
            <td style="width:80px;text-align:right;vertical-align:middle;font-weight:700;font-size:14px;color:#FF7A3D;white-space:nowrap;">
              ${Math.round(item.price / 100)} ₽
            </td>
          </tr>
        </table>
      </td>
    </tr>`,
      )
      .join('');

    const promoBlock =
      promoCode && promoDiscount > 0
        ? `
          <tr>
            <td style="padding:8px 40px 20px;">
              <div style="background:linear-gradient(135deg,#FFF7ED 0%,#FFEDD5 100%);border:1.5px dashed #FF7A3D;border-radius:14px;padding:18px 24px;text-align:center;">
                <div style="font-size:13px;color:#92400E;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px;">🎁 Скидка ${promoDiscount}% по промокоду</div>
                <div style="font-size:28px;font-weight:900;color:#FF7A3D;letter-spacing:2px;font-family:monospace,monospace;">${promoCode.toUpperCase()}</div>
                <div style="font-size:12px;color:#B45309;margin-top:8px;">Введите при оформлении заказа</div>
              </div>
            </td>
          </tr>`
        : '';

    const templatePath = join(process.cwd(), 'emails', 'abandoned-cart.html');
    let previewHtml = readFileSync(templatePath, 'utf-8');
    previewHtml = previewHtml
      .replace('{{ITEMS_HTML}}', itemsHtml || '<tr><td style="padding:10px 0;color:#888;font-size:14px;">Материалы из каталога</td></tr>')
      .replace('{{AMOUNT}}', Math.round(sample.totalAmount / 100).toLocaleString('ru-RU'))
      .replace('{{PROMO_BLOCK}}', promoBlock)
      .replace(/\{\{SITE_URL\}\}/g, siteUrl);

    return NextResponse.json({
      count: targets.length,
      emails: targets.map((t) => t.email),
      previewHtml,
      sample: {
        email: sample.email,
        totalAmount: sample.totalAmount,
        attempts: sample.attempts,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
