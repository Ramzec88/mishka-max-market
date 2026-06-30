import { NextRequest, NextResponse } from 'next/server';
import { expireStalePendingOrders } from '@/lib/expire-pending-orders';

export const dynamic = 'force-dynamic';

function isAuthorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // защита не настроена — не блокируем
  return req.headers.get('authorization') === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const expired = await expireStalePendingOrders();
    return NextResponse.json({ expiredCount: expired.length, expired });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
