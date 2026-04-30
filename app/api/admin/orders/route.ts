import { NextRequest, NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  noStore();
  const email = request.nextUrl.searchParams.get('email') || '';

  let query = supabaseAdmin
    .from('orders')
    .select('id, email, status, amount, items, paid_at, email_sent_at, created_at')
    .order('created_at', { ascending: false })
    .limit(100);

  if (email) {
    query = query.ilike('email', `%${email}%`);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
