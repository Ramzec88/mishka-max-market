import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getAbandonedCartTargets } from '@/lib/abandoned-cart-targets';

export async function GET() {
  try {
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

    const templatePath = join(process.cwd(), 'emails', 'abandoned-cart.html');
    let previewHtml = readFileSync(templatePath, 'utf-8');
    previewHtml = previewHtml
      .replace('{{ITEMS_HTML}}', itemsHtml || '<tr><td style="padding:10px 0;color:#888;font-size:14px;">Материалы из каталога</td></tr>')
      .replace('{{AMOUNT}}', Math.round(sample.totalAmount / 100).toLocaleString('ru-RU'))
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
