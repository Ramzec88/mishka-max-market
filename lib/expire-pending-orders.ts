import { supabaseAdmin } from '@/lib/supabase/admin';

// Заказы, которые "висят" в pending дольше этого срока — значит платёж не
// завершился и колбэк от платёжной системы не пришёл (ушёл со страницы,
// сбой сети и т.п.). Переводим их в failed, чтобы они не накапливались.
export const PENDING_TIMEOUT_HOURS = 3;

export async function expireStalePendingOrders() {
  const cutoff = new Date(Date.now() - PENDING_TIMEOUT_HOURS * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabaseAdmin
    .from('orders')
    .update({
      status: 'failed',
      cancellation_reason: 'Истёк срок ожидания оплаты (платёж не подтверждён)',
    })
    .eq('status', 'pending')
    .lt('created_at', cutoff)
    .select('id, email, created_at');

  if (error) throw new Error(error.message);
  return data ?? [];
}
