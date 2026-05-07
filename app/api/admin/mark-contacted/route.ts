import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  const body = await request.formData();
  const email = body.get('email') as string | null;
  const action = body.get('action') as string | null; // 'mark' | 'unmark'

  if (!email) return NextResponse.redirect(new URL('/admin/orders?view=needs-help', request.url));

  if (action === 'unmark') {
    await supabaseAdmin.from('admin_outreach').delete().eq('email', email);
  } else {
    await supabaseAdmin.from('admin_outreach').upsert({ email, contacted_at: new Date().toISOString() });
  }

  return NextResponse.redirect(new URL('/admin/orders?view=needs-help', request.url));
}
