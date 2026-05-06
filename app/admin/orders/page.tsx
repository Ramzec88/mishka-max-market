export const dynamic = 'force-dynamic';

import { unstable_noStore as noStore } from 'next/cache';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase/admin';

const CANCEL_REASON: Record<string, string> = {
  payment_canceled:        'Отменён покупателем',
  expired_on_confirmation: 'Не завершил оплату',
  insufficient_funds:      'Недостаточно средств',
  card_expired:            'Карта просрочена',
  fraud_suspected:         'Подозрение на мошенничество',
  general_decline:         'Отказ банка',
  wrong_amount:            'Неверная сумма',
  identification_required: 'Требуется идентификация',
  permission_revoked:      'Доступ отозван',
  unsupported_mobile_operator: 'Оператор не поддерживается',
  rejected_by_payee:       'Отклонён получателем',
  three_d_secure_failed:   'Ошибка 3-D Secure',
  call_issuer:             'Обратитесь в банк',
  cancel_by_merchant:      'Отменён магазином',
};

interface Order {
  id: string;
  email: string;
  status: string;
  amount: number;
  items: string[];
  paid_at: string | null;
  email_sent_at: string | null;
  created_at: string;
  cancellation_reason: string | null;
  promo_code: string | null;
  discount_amount: number;
}

async function getOrders(email?: string): Promise<Order[]> {
  noStore();
  let query = supabaseAdmin
    .from('orders')
    .select('id, email, status, amount, items, paid_at, email_sent_at, created_at, cancellation_reason, promo_code, discount_amount')
    .order('created_at', { ascending: false })
    .limit(200);

  if (email) query = query.ilike('email', `%${email}%`);

  const { data } = await query;
  return (data || []) as Order[];
}

interface NeedHelpRow {
  email: string;
  attempts: number;
  lastAttempt: string;
  totalAmount: number; // sum of attempted amounts
}

function buildNeedHelp(orders: Order[]): NeedHelpRow[] {
  const byEmail = new Map<string, Order[]>();
  for (const o of orders) {
    const list = byEmail.get(o.email) || [];
    list.push(o);
    byEmail.set(o.email, list);
  }

  const result: NeedHelpRow[] = [];
  for (const email of Array.from(byEmail.keys())) {
    const list = byEmail.get(email)!;
    const hasPaid = list.some((o: Order) => o.status === 'paid');
    if (hasPaid) continue;
    const failed = list.filter((o: Order) => o.status === 'canceled' || o.status === 'failed');
    if (failed.length === 0) continue;
    result.push({
      email,
      attempts: failed.length,
      lastAttempt: failed[0].created_at,
      totalAmount: failed.reduce((s: number, o: Order) => s + o.amount, 0),
    });
  }
  // sort by last attempt desc
  result.sort((a, b) => new Date(b.lastAttempt).getTime() - new Date(a.lastAttempt).getTime());
  return result;
}

const STATUS_LABEL: Record<string, { label: string; bg: string; color: string }> = {
  paid:    { label: 'Оплачен',  bg: '#dcfce7', color: '#16a34a' },
  pending: { label: 'Ожидает', bg: '#fef9c3', color: '#854d0e' },
  canceled:{ label: 'Отменён', bg: '#f3f4f6', color: '#888' },
  failed:  { label: 'Ошибка',  bg: '#fee2e2', color: '#dc2626' },
};

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}

const TAB_STYLE = (active: boolean): React.CSSProperties => ({
  padding: '8px 20px',
  borderRadius: 8,
  fontWeight: 700,
  fontSize: 14,
  cursor: 'pointer',
  border: 'none',
  textDecoration: 'none',
  display: 'inline-block',
  background: active ? '#FF7A3D' : '#f3f4f6',
  color: active ? '#fff' : '#555',
});

interface Props { searchParams: { email?: string; view?: string } }

export default async function AdminOrdersPage({ searchParams }: Props) {
  const emailFilter = searchParams.email?.trim() || '';
  const view = searchParams.view || 'all';

  // For "needs help" we need all orders (no email filter)
  const allOrders = await getOrders(view === 'all' ? emailFilter : undefined);
  const needHelpRows = buildNeedHelp(allOrders);

  const displayedOrders = view === 'all' ? allOrders : [];

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: '#1a1a1a' }}>Заказы</h1>
          {view === 'all' && (
            <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
              Найдено: {allOrders.length} · Оплачено: {allOrders.filter(o => o.status === 'paid').length}
            </div>
          )}
          {view === 'needs-help' && (
            <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
              Покупатели с незавершёнными попытками без успешной оплаты: {needHelpRows.length}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <Link href="/admin/orders?view=all" style={TAB_STYLE(view === 'all')}>
          Все заказы
        </Link>
        <Link href="/admin/orders?view=needs-help" style={{ ...TAB_STYLE(view === 'needs-help'), display: 'inline-flex', alignItems: 'center', gap: 7 }}>
          {needHelpRows.length > 0 && (
            <span style={{
              background: view === 'needs-help' ? 'rgba(255,255,255,0.3)' : '#FF7A3D',
              color: '#fff',
              borderRadius: 100,
              padding: '1px 7px',
              fontSize: 11,
              fontWeight: 800,
            }}>
              {needHelpRows.length}
            </span>
          )}
          Нужна помощь
        </Link>
      </div>

      {/* ── View: all orders ── */}
      {view === 'all' && (
        <>
          <form method="GET" action="/admin/orders" style={{ marginBottom: 16 }}>
            <input type="hidden" name="view" value="all" />
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                name="email"
                defaultValue={emailFilter}
                placeholder="Поиск по email покупателя..."
                style={{ flex: 1, border: '1px solid #e5e7eb', borderRadius: 8, padding: '9px 13px', fontSize: 14, outline: 'none' }}
              />
              <button type="submit"
                style={{ background: '#FF7A3D', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 20px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                Найти
              </button>
              {emailFilter && (
                <a href="/admin/orders"
                  style={{ background: '#f3f4f6', color: '#555', border: 'none', borderRadius: 8, padding: '9px 16px', fontWeight: 600, fontSize: 14, cursor: 'pointer', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
                  Сбросить
                </a>
              )}
            </div>
          </form>

          <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
            {displayedOrders.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>Заказов не найдено</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                    {['Email', 'Сумма', 'Промокод', 'Статус', 'Оплачен', 'Письмо', ''].map(h => (
                      <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#666', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayedOrders.map((order) => {
                    const s = STATUS_LABEL[order.status] || { label: order.status, bg: '#f3f4f6', color: '#888' };
                    return (
                      <tr key={order.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                        <td style={{ padding: '12px 14px', fontSize: 14, color: '#1a1a1a' }}>{order.email}</td>
                        <td style={{ padding: '12px 14px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                          {(order.amount / 100).toLocaleString('ru-RU')} ₽
                        </td>
                        <td style={{ padding: '12px 14px', fontSize: 13 }}>
                          {order.promo_code ? (
                            <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#16a34a', fontSize: 13 }}>
                              {order.promo_code}
                              {order.discount_amount > 0 && (
                                <span style={{ fontWeight: 400, color: '#888', fontFamily: 'inherit' }}>
                                  {' '}−{(order.discount_amount / 100).toLocaleString('ru-RU')} ₽
                                </span>
                              )}
                            </span>
                          ) : <span style={{ color: '#ccc' }}>—</span>}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 100, fontSize: 12, fontWeight: 700, background: s.bg, color: s.color }}>
                            {s.label}
                          </span>
                          {order.cancellation_reason && (
                            <div style={{ fontSize: 11, color: '#aaa', marginTop: 3, whiteSpace: 'nowrap' }}>
                              {CANCEL_REASON[order.cancellation_reason] ?? order.cancellation_reason}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '12px 14px', fontSize: 12, color: '#888', whiteSpace: 'nowrap' }}>
                          {formatDate(order.paid_at)}
                        </td>
                        <td style={{ padding: '12px 14px', fontSize: 12, whiteSpace: 'nowrap' }}>
                          {order.email_sent_at
                            ? <span style={{ color: '#16a34a' }}>✓ {formatDate(order.email_sent_at)}</span>
                            : <span style={{ color: '#aaa' }}>— не отправлено</span>}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <Link href={`/admin/orders/${order.id}`}
                            style={{ fontSize: 13, fontWeight: 600, color: '#FF7A3D', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                            Подробнее
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* ── View: needs help ── */}
      {view === 'needs-help' && (
        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
          {needHelpRows.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>
              Все покупатели с отменёнными заказами позже совершили успешную покупку
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  {['Email', 'Попыток', 'Последняя попытка', 'Сумма попыток', ''].map(h => (
                    <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#666', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {needHelpRows.map((row) => {
                  const subject = encodeURIComponent('Мишка Макс — помощь с покупкой');
                  const body = encodeURIComponent(
                    `Здравствуйте!\n\nЗаметили, что у вас возникли трудности при оплате на сайте mishka-max.ru/market.\n\nМы готовы помочь — напишите нам, и мы подберём удобный способ оплаты.\n\nС уважением,\nМишка Макс`
                  );
                  return (
                    <tr key={row.email} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '12px 14px', fontSize: 14, color: '#1a1a1a', fontWeight: 600 }}>
                        {row.email}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          display: 'inline-block',
                          background: '#fee2e2', color: '#dc2626',
                          borderRadius: 100, padding: '2px 10px',
                          fontSize: 12, fontWeight: 800,
                        }}>
                          {row.attempts}×
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 13, color: '#888' }}>
                        {formatDate(row.lastAttempt)}
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 14, fontWeight: 700, color: '#1a1a1a' }}>
                        {(row.totalAmount / 100).toLocaleString('ru-RU')} ₽
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <a
                            href={`mailto:${row.email}?subject=${subject}&body=${body}`}
                            style={{
                              fontSize: 13, fontWeight: 700,
                              background: '#FF7A3D', color: '#fff',
                              padding: '6px 14px', borderRadius: 8,
                              textDecoration: 'none', whiteSpace: 'nowrap',
                            }}
                          >
                            Написать
                          </a>
                          <a
                            href={`/admin/orders?view=all&email=${encodeURIComponent(row.email)}`}
                            style={{
                              fontSize: 13, fontWeight: 600,
                              color: '#FF7A3D',
                              padding: '6px 14px', borderRadius: 8,
                              textDecoration: 'none', whiteSpace: 'nowrap',
                              border: '1px solid #FF7A3D',
                            }}
                          >
                            Все заказы
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
