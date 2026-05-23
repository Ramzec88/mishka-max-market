export const dynamic = 'force-dynamic';

import { unstable_noStore as noStore } from 'next/cache';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase/admin';
import TriggerFollowupButton from './TriggerFollowupButton';

interface FollowupRow {
  id: string;
  order_id: string;
  email: string;
  sent_at: string;
}

interface PendingRow {
  id: string;
  email: string;
  items: string[];
  paid_at: string;
}

async function getSentFollowups(): Promise<FollowupRow[]> {
  noStore();
  const { data } = await supabaseAdmin
    .from('followup_emails')
    .select('id, order_id, email, sent_at')
    .order('sent_at', { ascending: false })
    .limit(200);
  return (data || []) as FollowupRow[];
}

async function getPendingOrders(): Promise<PendingRow[]> {
  noStore();
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabaseAdmin
    .from('orders')
    .select('id, email, items, paid_at')
    .eq('status', 'paid')
    .lte('paid_at', cutoff)
    .not('id', 'in', `(select order_id from followup_emails)`)
    .order('paid_at', { ascending: false });
  return (data || []) as PendingRow[];
}

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

export default async function AdminFollowupPage() {
  const [sent, pending] = await Promise.all([getSentFollowups(), getPendingOrders()]);

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: '#1a1a1a', margin: 0 }}>
            Письма Мишки Макса
          </h1>
          <p style={{ fontSize: 13, color: '#888', marginTop: 6, marginBottom: 0 }}>
            Автоматически отправляется через 7 дней после покупки. Cron запускается каждый день в 09:00 UTC.
          </p>
        </div>
        <TriggerFollowupButton />
      </div>

      {/* Pending */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: '#1a1a1a', margin: 0 }}>
            Ожидают отправки
          </h2>
          {pending.length > 0 && (
            <span style={{
              background: '#FF7A3D', color: '#fff',
              borderRadius: 100, padding: '2px 10px',
              fontSize: 12, fontWeight: 800,
            }}>
              {pending.length}
            </span>
          )}
        </div>

        {pending.length === 0 ? (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '16px 20px', fontSize: 14, color: '#16a34a', fontWeight: 600 }}>
            Нет заказов, ожидающих follow-up письма
          </div>
        ) : (
          <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  {['Email', 'Товары', 'Оплачен', 'Дней прошло', ''].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#666', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pending.map((row) => {
                  const daysSince = Math.floor((Date.now() - new Date(row.paid_at).getTime()) / 86400000);
                  return (
                    <tr key={row.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '12px 14px', fontSize: 14, color: '#1a1a1a' }}>{row.email}</td>
                      <td style={{ padding: '12px 14px', fontSize: 13, color: '#5A4F45' }}>
                        {(row.items || []).join(', ')}
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 12, color: '#888', whiteSpace: 'nowrap' }}>
                        {formatDate(row.paid_at)}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          background: daysSince >= 14 ? '#fee2e2' : '#fef9c3',
                          color: daysSince >= 14 ? '#dc2626' : '#854d0e',
                          borderRadius: 100, padding: '2px 10px',
                          fontSize: 12, fontWeight: 700,
                        }}>
                          {daysSince} дн.
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <Link href={`/admin/orders/${row.id}`}
                          style={{ fontSize: 13, fontWeight: 600, color: '#FF7A3D', textDecoration: 'none' }}>
                          Заказ
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Sent */}
      <div>
        <h2 style={{ fontSize: 16, fontWeight: 800, color: '#1a1a1a', marginBottom: 12 }}>
          Отправлено ({sent.length})
        </h2>

        {sent.length === 0 ? (
          <div style={{ background: '#f9fafb', borderRadius: 10, padding: '16px 20px', fontSize: 14, color: '#888' }}>
            Писем ещё не отправлено
          </div>
        ) : (
          <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  {['Email', 'Отправлено', ''].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#666', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sent.map((row) => (
                  <tr key={row.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '11px 14px', fontSize: 14, color: '#1a1a1a' }}>{row.email}</td>
                    <td style={{ padding: '11px 14px', fontSize: 12, color: '#16a34a', whiteSpace: 'nowrap', fontWeight: 600 }}>
                      ✓ {formatDate(row.sent_at)}
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      <Link href={`/admin/orders/${row.order_id}`}
                        style={{ fontSize: 13, fontWeight: 600, color: '#FF7A3D', textDecoration: 'none' }}>
                        Заказ
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
