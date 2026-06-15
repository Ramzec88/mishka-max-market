import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getTokenExpiry } from '@/lib/tokens';

export const dynamic = 'force-dynamic';

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const newExpiry = getTokenExpiry().toISOString();

    // Fetch current max_downloads per token so we can increment individually
    const { data: tokens, error: fetchError } = await supabaseAdmin
      .from('download_tokens')
      .select('token, max_downloads')
      .eq('order_id', params.id);

    if (fetchError) throw fetchError;
    if (!tokens || tokens.length === 0) {
      return NextResponse.json({ error: 'Токены не найдены' }, { status: 404 });
    }

    // Increase each token's limit by 5 and extend expiry
    for (const t of tokens) {
      const { error } = await supabaseAdmin
        .from('download_tokens')
        .update({ max_downloads: t.max_downloads + 5, expires_at: newExpiry })
        .eq('token', t.token);
      if (error) throw error;
    }

    return NextResponse.json({ ok: true, updated: tokens.length });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
