export const dynamic = 'force-dynamic';

import { unstable_noStore as noStore } from 'next/cache';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase/admin';
import CopyEmailButton from '@/components/admin/CopyEmailButton';
import MarkContactedButton from '@/components/admin/MarkContactedButton';
import AbandonedCartSendButton from '@/components/admin/AbandonedCartSendButton';
import ExpireStaleOrdersButton from '@/components/admin/ExpireStaleOrdersButton';

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
  'The bank card is past its expiration date': 'Карта просрочена',
  'The transaction was canceled due to the confirmation timeout': 'Не завершил оплату',
  'Insufficient funds': 'Недостаточно средств',
  'Payment was declined': 'Отказ банка',
  'Card not supported': 'Карта не поддерживается',
  '3DS verification failed': 'Ошибка 3-D Secure',
};

interface LineItem {
  product_id: string;
  title: string;
  regular_price: number; // kopecks
  paid_price: number;    // kopecks
  is_bump: boolean;
}

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
  line_items: LineItem[] | null;
}

function dateFrom(period: string): string | null {
  const now = new Date();
  if (period === 'today') {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  }
  if (period === 'week') {
    return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  }
  if (period === 'month') {
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  }
  return null;
}

async function getOrders(opts: {
  email?: string;
  date?: string;
  status?: string;
}): Promise<Order[]> {
  noStore();
  let query = supabaseAdmin
    .from('orders')
    .select('id, email, status, amount, items, paid_at, email_sent_at, created_at, cancellation_reason, promo_code, discount_amount, line_items')
    .order('created_at', { ascending: false })
    .limit(500);

  if (opts.email) query = query.ilike('email', `%${opts.email}%`);

  const from = opts.date ? dateFrom(opts.date) : null;
  if (from) query = query.gte('created_at', from);

  if (opts.status === 'paid') {
    query = query.eq('status', 'paid');
  } else if (opts.status === 'problem') {
    query = query.in('status', ['canceled', 'failed']);
  }

  const { data } = await query;
  return (data || []) as Order[];
}

async function getContactedEmails(): Promise<Map<string, string>> {
  const { data } = await supabaseAdmin
    .from('admin_outreach')
    .select('email, contacted_at');
  const map = new Map<string, string>();
  for (const row of (data || [])) map.set(row.email, row.contacted_at);
  return map;
}

interface NeedHelpRow {
  email: string;
  attempts: number;
  lastAttempt: string;
  totalAmount: number;
  convertedAt: string | null; // paid_at of the order placed after the outreach letter
}

function buildNeedHelp(orders: Order[], contactedMap: Map<string, string>): NeedHelpRow[] {
  const byEmail = new Map<string, Order[]>();
  for (const o of orders) {
    const list = byEmail.get(o.email) || [];
    list.push(o);
    byEmail.set(o.email, list);
  }

  const result: NeedHelpRow[] = [];
  for (const email of Array.from(byEmail.keys())) {
    const list = byEmail.get(email)!;
    const failed = list.filter((o) => o.status === 'canceled' || o.status === 'failed');
    if (failed.length === 0) continue;

    const contactedAt = contactedMap.get(email) ?? null;

    // Conversion: a paid order placed strictly after the outreach letter
    let convertedAt: string | null = null;
    if (contactedAt) {
      const conversion = list.find(
        (o) => o.status === 'paid' && o.paid_at && new Date(o.paid_at) > new Date(contactedAt),
      );
      if (conversion) convertedAt = conversion.paid_at;
    }

    // If they paid but NOT as a tracked conversion (paid before contact or without contact)
    // they're already happy customers — skip them
    const hasPaid = list.some((o) => o.status === 'paid');
    if (hasPaid && !convertedAt) continue;

    result.push({
      email,
      attempts: failed.length,
      lastAttempt: failed[0].created_at,
      totalAmount: failed.reduce((s, o) => s + o.amount, 0),
      convertedAt,
    });
  }

  // Unconverted first (need attention), converted last; within each group sort by date desc
  result.sort((a, b) => {
    if (!!a.convertedAt !== !!b.convertedAt) return a.convertedAt ? 1 : -1;
    return new Date(b.lastAttempt).getTime() - new Date(a.lastAttempt).getTime();
  });
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
  return new Date(iso).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Moscow' });
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

function buildUrl(current: Record<string, string>, overrides: Record<string, string | undefined>) {
  const params = new URLSearchParams(current);
  for (const [k, v] of Object.entries(overrides)) {
    if (v === undefined || v === '') params.delete(k);
    else params.set(k, v);
  }
  return `/admin/orders?${params.toString()}`;
}

const CHIP = (active: boolean): React.CSSProperties => ({
  padding: '6px 14px',
  borderRadius: 100,
  fontSize: 13,
  fontWeight: active ? 700 : 600,
  cursor: 'pointer',
  textDecoration: 'none',
  display: 'inline-block',
  whiteSpace: 'nowrap',
  border: active ? '2px solid #FF7A3D' : '2px solid #e5e7eb',
  background: active ? '#FFF8F3' : '#fff',
  color: active ? '#FF7A3D' : '#555',
  transition: 'all 0.15s',
});

interface Props { searchParams: { email?: string; view?: string; date?: string; status?: string } }

export default async function AdminOrdersPage({ searchParams }: Props) {
  const emailFilter = searchParams.email?.trim() || '';
  const view        = searchParams.view   || 'all';
  const dateFilter  = searchParams.date   || '';
  const statusFilter = searchParams.status || '';

  const currentParams: Record<string, string> = { view };
  if (emailFilter)  currentParams.email  = emailFilter;
  if (dateFilter)   currentParams.date   = dateFilter;
  if (statusFilter) currentParams.status = statusFilter;

  // For needs-help we always fetch all orders (no date/status filter on that query)
  const [filteredOrders, allForNeedsHelp, contactedMap] = await Promise.all([
    getOrders({ email: emailFilter, date: dateFilter || undefined, status: statusFilter || undefined }),
    view === 'needs-help'
      ? getOrders({})
      : Promise.resolve([] as Order[]),
    getContactedEmails(),
  ]);

  const needHelpRows = buildNeedHelp(
    view === 'needs-help' ? allForNeedsHelp : filteredOrders,
    contactedMap,
  );
  const displayedOrders = view === 'all' ? filteredOrders : [];

  const hasAnyFilter = emailFilter || dateFilter || statusFilter;

  // ── Stats ──
  const paidOrders = filteredOrders.filter(o => o.status === 'paid');
  const ordersWithBump = paidOrders.filter(o => o.line_items?.some(li => li.is_bump));
  const bumpRevenue = paidOrders.reduce((sum, o) => {
    return sum + (o.line_items?.filter(li => li.is_bump).reduce((s, li) => s + li.paid_price, 0) ?? 0);
  }, 0);
  const bumpConversion = paidOrders.length > 0 ? Math.round(ordersWithBump.length / paidOrders.length * 100) : 0;

  const discountOrders = paidOrders.filter(o => !o.promo_code && o.discount_amount > 0);
  const totalDiscountGiven = discountOrders.reduce((s, o) => s + o.discount_amount, 0);
  const discountRevenue = discountOrders.reduce((s, o) => s + o.amount, 0);
  const discountConversion = paidOrders.length > 0 ? Math.round(discountOrders.length / paidOrders.length * 100) : 0;

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: '#1a1a1a' }}>Заказы</h1>

          {view === 'all' && (
            <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
              Найдено: {filteredOrders.length} · Оплачено: {filteredOrders.filter(o => o.status === 'paid').length}
              {filteredOrders.filter(o => o.status === 'paid').length > 0 && (
                <> · Сумма: {(filteredOrders.filter(o => o.status === 'paid').reduce((s, o) => s + o.amount, 0) / 100).toLocaleString('ru-RU')} ₽</>
              )}
            </div>
          )}
          {view === 'needs-help' && (() => {
            const pending   = needHelpRows.filter(r => !r.convertedAt).length;
            const converted = needHelpRows.filter(r => r.convertedAt).length;
            const contacted = needHelpRows.filter(r => contactedMap.has(r.email)).length;
            return (
              <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                Ждут: {pending}
                {contacted > 0 && (
                  <> · Написали: {contacted} · <span style={{ color: '#16a34a', fontWeight: 700 }}>Оплатили после письма: {converted}</span>
                    {contacted > 0 && <> ({Math.round(converted / contacted * 100)}%)</>}
                  </>
                )}
              </div>
            );
          })()}
        </div>
        {view === 'needs-help' && needHelpRows.filter(r => !r.convertedAt).length > 0 && (
          <AbandonedCartSendButton />
        )}
      </div>

      {/* ── Stat cards (only in all-orders view) ── */}
      {view === 'all' && paidOrders.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 16 }}>
          {/* Bump card */}
          <div style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', borderLeft: '4px solid #FF7A3D' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
              Допродажа (bump)
            </div>
            <div style={{ fontSize: 26, fontWeight: 900, color: '#1a1a1a', lineHeight: 1 }}>
              {(bumpRevenue / 100).toLocaleString('ru-RU')} ₽
            </div>
            <div style={{ fontSize: 13, color: '#888', marginTop: 6 }}>
              {ordersWithBump.length} из {paidOrders.length} заказов
              <span style={{
                marginLeft: 8, display: 'inline-block',
                background: bumpConversion >= 20 ? '#dcfce7' : bumpConversion >= 10 ? '#fef9c3' : '#f3f4f6',
                color: bumpConversion >= 20 ? '#16a34a' : bumpConversion >= 10 ? '#92400e' : '#888',
                borderRadius: 100, padding: '1px 8px', fontSize: 12, fontWeight: 700,
              }}>
                {bumpConversion}%
              </span>
            </div>
          </div>

          {/* Progress bar / volume discount card */}
          <div style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', borderLeft: '4px solid #6366f1' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
              Прогресс-бар (скидки)
            </div>
            <div style={{ fontSize: 26, fontWeight: 900, color: '#1a1a1a', lineHeight: 1 }}>
              {(discountRevenue / 100).toLocaleString('ru-RU')} ₽
            </div>
            <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>
              {discountOrders.length} заказов со скидкой
              <span style={{
                marginLeft: 8, display: 'inline-block',
                background: discountConversion >= 30 ? '#dcfce7' : discountConversion >= 15 ? '#fef9c3' : '#f3f4f6',
                color: discountConversion >= 30 ? '#16a34a' : discountConversion >= 15 ? '#92400e' : '#888',
                borderRadius: 100, padding: '1px 8px', fontSize: 12, fontWeight: 700,
              }}>
                {discountConversion}%
              </span>
            </div>
            <div style={{ fontSize: 13, color: '#888', marginTop: 2 }}>
              Отдано скидок: {(totalDiscountGiven / 100).toLocaleString('ru-RU')} ₽
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <Link href="/admin/orders?view=all" style={TAB_STYLE(view === 'all')}>
          Все заказы
        </Link>
        <Link
          href="/admin/orders?view=needs-help"
          style={{ ...TAB_STYLE(view === 'needs-help'), display: 'inline-flex', alignItems: 'center', gap: 7 }}
        >
          {needHelpRows.filter(r => !r.convertedAt).length > 0 && (
            <span style={{
              background: view === 'needs-help' ? 'rgba(255,255,255,0.3)' : '#FF7A3D',
              color: '#fff', borderRadius: 100, padding: '1px 7px',
              fontSize: 11, fontWeight: 800,
            }}>
              {needHelpRows.filter(r => !r.convertedAt).length}
            </span>
          )}
          Нужна помощь
        </Link>
      </div>

      {/* ── View: all orders ── */}
      {view === 'all' && (
        <>
          {/* Search + filters */}
          <div style={{ background: '#fff', borderRadius: 12, padding: '16px', marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            {/* Search row */}
            <form method="GET" action="/admin/orders">
              <input type="hidden" name="view" value="all" />
              {dateFilter   && <input type="hidden" name="date"   value={dateFilter} />}
              {statusFilter && <input type="hidden" name="status" value={statusFilter} />}
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <input
                  name="email"
                  defaultValue={emailFilter}
                  placeholder="Поиск по email покупателя..."
                  style={{ flex: 1, border: '1px solid #e5e7eb', borderRadius: 8, padding: '9px 13px', fontSize: 14, outline: 'none' }}
                />
                <button type="submit"
                  style={{ background: '#FF7A3D', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 20px', fontWeight: 700, fontSize: 14, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  Найти
                </button>
                {hasAnyFilter && (
                  <a href="/admin/orders?view=all"
                    style={{ background: '#f3f4f6', color: '#555', border: 'none', borderRadius: 8, padding: '9px 16px', fontWeight: 600, fontSize: 14, cursor: 'pointer', textDecoration: 'none', display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
                    Сбросить
                  </a>
                )}
              </div>
            </form>

            {/* Date chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#aaa', alignSelf: 'center', marginRight: 2 }}>Период:</span>
              <Link href={buildUrl(currentParams, { date: undefined })} style={CHIP(!dateFilter)}>Все время</Link>
              <Link href={buildUrl(currentParams, { date: 'today' })}  style={CHIP(dateFilter === 'today')}>Сегодня</Link>
              <Link href={buildUrl(currentParams, { date: 'week' })}   style={CHIP(dateFilter === 'week')}>7 дней</Link>
              <Link href={buildUrl(currentParams, { date: 'month' })}  style={CHIP(dateFilter === 'month')}>Этот месяц</Link>
            </div>

            {/* Status chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#aaa', alignSelf: 'center', marginRight: 2 }}>Статус:</span>
              <Link href={buildUrl(currentParams, { status: undefined })}       style={CHIP(!statusFilter)}>Все</Link>
              <Link href={buildUrl(currentParams, { status: 'paid' })}          style={{ ...CHIP(statusFilter === 'paid'), ...(statusFilter === 'paid' ? { borderColor: '#16a34a', color: '#16a34a', background: '#f0fdf4' } : {}) }}>Только оплаченные</Link>
              <Link href={buildUrl(currentParams, { status: 'problem' })}       style={{ ...CHIP(statusFilter === 'problem'), ...(statusFilter === 'problem' ? { borderColor: '#dc2626', color: '#dc2626', background: '#fef2f2' } : {}) }}>Только проблемные</Link>
              <div style={{ marginLeft: 'auto' }}>
                <ExpireStaleOrdersButton />
              </div>
            </div>
          </div>

          <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            {displayedOrders.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>Заказов не найдено</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
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
                            <div
                              style={{ fontSize: 11, color: '#aaa', marginTop: 3, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                              title={CANCEL_REASON[order.cancellation_reason] ?? order.cancellation_reason}
                            >
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
        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          {needHelpRows.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>
              Все покупатели с отменёнными заказами позже совершили успешную покупку
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  {['Email', 'Попыток', 'Последняя попытка', 'Сумма попыток', 'Статус письма', ''].map(h => (
                    <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#666', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {needHelpRows.map((row) => {
                  const contactedAt = contactedMap.get(row.email) || null;
                  const isConverted = !!row.convertedAt;
                  const rowBg = isConverted ? '#fffbeb' : contactedAt ? '#f0fdf4' : undefined;
                  return (
                    <tr key={row.email} style={{ borderBottom: '1px solid #f0f0f0', background: rowBg }}>
                      <td style={{ padding: '12px 14px', fontSize: 14, color: '#1a1a1a', fontWeight: 600 }}>
                        {isConverted && <span style={{ marginRight: 6 }}>🎉</span>}
                        {row.email}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ display: 'inline-block', background: '#fee2e2', color: '#dc2626', borderRadius: 100, padding: '2px 10px', fontSize: 12, fontWeight: 800 }}>
                          {row.attempts}×
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 13, color: '#888' }}>{formatDate(row.lastAttempt)}</td>
                      <td style={{ padding: '12px 14px', fontSize: 14, fontWeight: 700, color: '#1a1a1a' }}>
                        {(row.totalAmount / 100).toLocaleString('ru-RU')} ₽
                      </td>
                      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                        {isConverted ? (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            background: 'linear-gradient(135deg, #fef9c3, #fef08a)',
                            color: '#92400e',
                            border: '1px solid #fcd34d',
                            borderRadius: 100, padding: '5px 14px',
                            fontSize: 12, fontWeight: 800,
                          }}>
                            🎉 Оплачено {formatDate(row.convertedAt)}
                          </span>
                        ) : (
                          <MarkContactedButton email={row.email} isMarked={!!contactedAt} contactedAt={contactedAt} />
                        )}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {!isConverted && <CopyEmailButton email={row.email} />}
                          <a
                            href={`/admin/orders?view=all&email=${encodeURIComponent(row.email)}`}
                            style={{ fontSize: 13, fontWeight: 600, color: '#FF7A3D', padding: '6px 14px', borderRadius: 8, textDecoration: 'none', whiteSpace: 'nowrap', border: '1px solid #FF7A3D' }}
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
