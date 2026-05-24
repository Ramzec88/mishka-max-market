import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getAbandonedCartTargets } from '@/lib/abandoned-cart-targets';
import { sendAbandonedCartEmail } from '@/lib/email';

export async function POST() {
  try {
    const targets = await getAbandonedCartTargets();

    if (targets.length === 0) {
      return NextResponse.json({ sent: 0, failed: [] });
    }

    // Fetch all products needed
    const allItemIds = Array.from(new Set(targets.flatMap((t) => t.itemIds)));
    const { data: products } = await supabaseAdmin
      .from('products')
      .select('id, title, price, cover_emoji')
      .in('id', allItemIds.length > 0 ? allItemIds : ['__none__']);

    const productMap = new Map(
      (products ?? []).map((p) => [p.id, p as { id: string; title: string; price: number; cover_emoji: string | null }]),
    );

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mishka-max.ru';

    let sent = 0;
    const failed: string[] = [];
    const now = new Date().toISOString();

    for (const target of targets) {
      try {
        const items = target.itemIds
          .map((id) => productMap.get(id))
          .filter(Boolean)
          .map((p) => ({ title: p!.title, price: p!.price, emoji: p!.cover_emoji }));

        await sendAbandonedCartEmail({
          to: target.email,
          items,
          totalAmount: target.totalAmount,
          siteUrl,
        });

        // Mark as contacted
        await supabaseAdmin
          .from('admin_outreach')
          .upsert({ email: target.email, contacted_at: now });

        sent++;
      } catch {
        failed.push(target.email);
      }
    }

    return NextResponse.json({ sent, failed });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
