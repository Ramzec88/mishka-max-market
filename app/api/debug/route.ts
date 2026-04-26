import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Временный диагностический endpoint — удалить после отладки
export async function GET() {
  const results: Record<string, unknown> = {};

  // 1. Проверяем env vars (только наличие, не значения)
  results.env = {
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_KEY: !!process.env.SUPABASE_SERVICE_KEY,
    YOOKASSA_SHOP_ID: !!process.env.YOOKASSA_SHOP_ID,
    YOOKASSA_SECRET_KEY: !!process.env.YOOKASSA_SECRET_KEY,
  };

  // 2. Проверяем подключение к Supabase через anon key
  try {
    const client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data, error } = await client.from('products').select('id').limit(1);
    results.supabase_anon = error
      ? { ok: false, error: error.message, code: error.code }
      : { ok: true, rows: data?.length };
  } catch (e) {
    results.supabase_anon = { ok: false, error: String(e) };
  }

  // 3. Проверяем подключение через service key + insert в orders
  try {
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Просто проверяем что таблица существует — не вставляем
    const { error } = await admin.from('orders').select('id').limit(1);
    results.supabase_admin_orders = error
      ? { ok: false, error: error.message, code: error.code }
      : { ok: true };
  } catch (e) {
    results.supabase_admin_orders = { ok: false, error: String(e) };
  }

  return NextResponse.json(results);
}
