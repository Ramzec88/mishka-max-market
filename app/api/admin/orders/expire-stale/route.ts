import { NextResponse } from 'next/server';
import { expireStalePendingOrders } from '@/lib/expire-pending-orders';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const expired = await expireStalePendingOrders();
    return NextResponse.json({ expiredCount: expired.length, expired });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
