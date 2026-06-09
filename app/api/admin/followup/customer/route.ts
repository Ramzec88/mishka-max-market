import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json() as { email: string };
    if (!email?.trim()) return NextResponse.json({ error: 'email обязателен' }, { status: 400 });

    const normalizedEmail = email.trim().toLowerCase();

    const [ordersRes, followupsRes] = await Promise.all([
      supabaseAdmin
        .from('orders')
        .select('id, status, amount, items, paid_at, created_at, promo_code, discount_amount')
        .ilike('email', normalizedEmail)
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .from('followup_emails')
        .select('order_id, product_id, sent_at')
        .ilike('email', normalizedEmail)
        .order('sent_at', { ascending: false }),
    ]);

    return NextResponse.json({
      orders: ordersRes.data ?? [],
      followups: followupsRes.data ?? [],
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
