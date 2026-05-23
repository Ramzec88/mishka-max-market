// Этот эндпоинт оставлен для возможного использования в будущем.
// Текущая рассылка управляется вручную через /admin/followup.
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ message: 'Use /admin/followup for manual sending.' });
}
