import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const body = await req.json() as { is_published?: boolean; admin_reply?: string | null };
    const update: Record<string, unknown> = {};

    if (typeof body.is_published === 'boolean') update.is_published = body.is_published;

    if ('admin_reply' in body) {
      const reply = body.admin_reply?.trim() || null;
      update.admin_reply = reply;
      update.admin_reply_at = reply ? new Date().toISOString() : null;
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'Нет данных для обновления' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('reviews')
      .update(update)
      .eq('id', params.id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { error } = await supabaseAdmin
      .from('reviews')
      .delete()
      .eq('id', params.id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
