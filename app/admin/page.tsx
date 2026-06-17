export const dynamic = 'force-dynamic';

import { unstable_noStore as noStore } from 'next/cache';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase/admin';

interface LineItem {
  product_id: string;
  title: string;
  regular_price: number;
  paid_price: number;
  is_bump: boolean;
}

interface OrderRow {
  id: string;
  email: string;
  status: string;
  amount: number;
  items: string[];
  line_items: LineItem[] | null;
  payment_provider: string | null;
  cancellation_reason: string | null;
  promo_code: string | null;
  discount_amount: number;
  email_sent_at: string | null;
  created_at: string;
  paid_at: string | null;
}

interface ProductRow {
  id: string;
  title: string;
}

const PERIOD_LABEL: Record<string, string> = {
  today: 'Сегодня',
  week: '7 дней',
  month: 'Этот месяц',
  all: 'Всё время',
};

function periodFrom(period: string): string | null {
  const now = new Date();
  if (period === 'today') return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  if (period === 'week') return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  if (period === 'month') return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  return null;
}

async function getAllOrders(): Promise<OrderRow[]> {
  noStore();
  const { data } = await supabaseAdmin
    .from('orders')
    .select('id, email, status, amount, items, line_items, payment_provider, cancellation_reason, promo_code, discount_amount, email_sent_at, created_at, paid_at')
    .order('created_at', { ascending: false })
    .limit(2000);
  return (data || []) as OrderRow[];
}

async function getProductTitles(): Promise<Map<string, string>> {
  const { data } = await supabaseAdmin.from('products').select('id, title');
  const map = new Map<string, string>();
  for (const p of (data || []) as ProductRow[]) map.set(p.id, p.title);
  return map;
}

interface ReviewsAgg {
  count: number;
  avg: number;
}

async function getReviewsAgg(from: string | null): Promise<ReviewsAgg> {
  let query = supabaseAdmin.from('reviews').select('rating').eq('is_published', true);
  if (from) query = query.gte('created_at', from);
  const { data } = await query;
  const rows = data || [];
  if (rows.length === 0) return { count: 0, avg: 0 };
  const sum = rows.reduce((s, r: any) => s + r.rating, 0);
  return { count: rows.length, avg: Math.round((sum / rows.length) * 10) / 10 };
}

const CARD: React.CSSProperties = {
  background: '#fff',
  borderRadius: 12,
  padding: '16px 20px',
  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
};

const CARD_LABEL: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: '#aaa',
  textTransform: 'uppercase',
  letterSpacing: 0.5,
  marginBottom: 8,
};

const CARD_VALUE: React.CSSProperties = {
  fontSize: 26,
  fontWeight: 900,
  color: '#1a1a1a',
  lineHeight: 1,
};

const CHIP = (active: boolean): React.CSSProperties => ({
  padding: '6px 14px',
  borderRadius: 100,
  fontSize: 13,
  fontWeight: active ? 700 : 600,
  textDecoration: 'none',
  display: 'inline-block',
  whiteSpace: 'nowrap',
  border: active ? '2px solid #FF7A3D' : '2px solid #e5e7eb',
  background: active ? '#FFF8F3' : '#fff',
  color: active ? '#FF7A3D' : '#555',
});

const CANCEL_REASON: Record<string, string> = {
  payment_canceled: 'Отменён покупателем',
  expired_on_confirmation: 'Не завершил оплату',
  insufficient_funds: 'Недостаточно средств',
  card_expired: 'Карта просрочена',
  fraud_suspected: 'Подозрение на мошенничество',
  general_decline: 'Отказ банка',
  wrong_amount: 'Неверная сумма',
  identification_required: 'Требуется идентификация',
  permission_revoked: 'Доступ отозван',
  unsupported_mobile_operator: 'Оператор не поддерживается',
  rejected_by_payee: 'Отклонён получателем',
  three_d_secure_failed: 'Ошибка 3-D Secure',
  call_issuer: 'Обратитесь в банк',
  cancel_by_merchant: 'Отменён магазином',
};

const PROVIDER_LABEL: Record<string, string> = {
  yookassa: 'ЮKassa',
  lava: 'Lava',
  getplatinum: 'GetPlatinum',
};

interface Props { searchParams: { period?: string } }

export default async function AdminDashboardPage({ searchParams }: Props) {
  const period = searchParams.period && PERIOD_LABEL[searchParams.period] ? searchParams.period : 'week';
  const from = periodFrom(period);

  const [allOrders, productTitles] = await Promise.all([getAllOrders(), getProductTitles()]);

  const inPeriod = (o: OrderRow) => !from || o.created_at >= from;
  const ordersInPeriod = allOrders.filter(inPeriod);
  const paid = ordersInPeriod.filter((o) => o.status === 'paid');
  const failed = ordersInPeriod.filter((o) => o.status === 'canceled' || o.status === 'failed');
  const reviewsAgg = await getReviewsAgg(from);

  // ── KPI: revenue / AOV / conversion ──
  const revenue = paid.reduce((s, o) => s + o.amount, 0);
  const aov = paid.length > 0 ? Math.round(revenue / paid.length) : 0;
  const totalAttempts = paid.length + failed.length;
  const conversion = totalAttempts > 0 ? Math.round((paid.length / totalAttempts) * 100) : 0;

  // ── New vs returning customers ──
  const firstPaidAtByEmail = new Map<string, string>();
  for (const o of allOrders) {
    if (o.status !== 'paid' || !o.paid_at) continue;
    const cur = firstPaidAtByEmail.get(o.email);
    if (!cur || o.paid_at < cur) firstPaidAtByEmail.set(o.email, o.paid_at);
  }
  const paidEmailsInPeriod = new Set(paid.map((o) => o.email));
  let newCustomers = 0;
  for (const email of Array.from(paidEmailsInPeriod)) {
    const first = firstPaidAtByEmail.get(email);
    if (first && (!from || first >= from)) newCustomers += 1;
  }
  const returningCustomers = paidEmailsInPeriod.size - newCustomers;

  // ── Email delivery health ──
  const emailSentCount = paid.filter((o) => o.email_sent_at).length;
  const emailHealthPct = paid.length > 0 ? Math.round((emailSentCount / paid.length) * 100) : 100;

  // ── Provider breakdown ──
  const providerMap = new Map<string, number>();
  for (const o of paid) {
    const provider = o.payment_provider || 'yookassa';
    providerMap.set(provider, (providerMap.get(provider) || 0) + o.amount);
  }
  const providerBreakdown = Array.from(providerMap.entries()).sort((a, b) => b[1] - a[1]);

  // ── Top products ──
  const productAgg = new Map<string, { title: string; revenue: number; qty: number }>();
  for (const o of paid) {
    if (o.line_items && o.line_items.length > 0) {
      for (const li of o.line_items) {
        const cur = productAgg.get(li.product_id) || { title: li.title, revenue: 0, qty: 0 };
        cur.revenue += li.paid_price;
        cur.qty += 1;
        productAgg.set(li.product_id, cur);
      }
    } else if (o.items && o.items.length > 0) {
      const share = Math.round(o.amount / o.items.length);
      for (const id of o.items) {
        const cur = productAgg.get(id) || { title: productTitles.get(id) || id, revenue: 0, qty: 0 };
        cur.revenue += share;
        cur.qty += 1;
        productAgg.set(id, cur);
      }
    }
  }
  const topProducts = Array.from(productAgg.entries())
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 5);

  // ── Failed-order reasons ──
  const reasonMap = new Map<string, number>();
  for (const o of failed) {
    const key = o.cancellation_reason || 'неизвестно';
    reasonMap.set(key, (reasonMap.get(key) || 0) + 1);
  }
  const topReasons = Array.from(reasonMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // ── Promo code impact ──
  const promoOrders = paid.filter((o) => o.promo_code);
  const nonPromoOrders = paid.filter((o) => !o.promo_code);
  const promoShare = paid.length > 0 ? Math.round((promoOrders.length / paid.length) * 100) : 0;
  const promoDiscountGiven = promoOrders.reduce((s, o) => s + (o.discount_amount || 0), 0);
  const promoRevenue = promoOrders.reduce((s, o) => s + o.amount, 0);
  const aovPromo = promoOrders.length > 0 ? Math.round(promoRevenue / promoOrders.length) : 0;
  const aovNonPromo = nonPromoOrders.length > 0
    ? Math.round(nonPromoOrders.reduce((s, o) => s + o.amount, 0) / nonPromoOrders.length)
    : 0;

  const promoCodeMap = new Map<string, { count: number; revenue: number; discount: number }>();
  for (const o of promoOrders) {
    const code = o.promo_code as string;
    const cur = promoCodeMap.get(code) || { count: 0, revenue: 0, discount: 0 };
    cur.count += 1;
    cur.revenue += o.amount;
    cur.discount += o.discount_amount || 0;
    promoCodeMap.set(code, cur);
  }
  const topPromoCodes = Array.from(promoCodeMap.entries()).sort((a, b) => b[1].count - a[1].count).slice(0, 5);

  // ── Daily revenue trend (last 14 days, independent of period filter) ──
  const days: { label: string; revenue: number }[] = [];
  const now = new Date();
  for (let i = 13; i >= 0; i--) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const dayEnd = new Date(day.getTime() + 24 * 60 * 60 * 1000);
    const dayRevenue = allOrders
      .filter((o) => o.status === 'paid' && o.paid_at && new Date(o.paid_at) >= day && new Date(o.paid_at) < dayEnd)
      .reduce((s, o) => s + o.amount, 0);
    days.push({ label: day.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }), revenue: dayRevenue });
  }
  const maxDayRevenue = Math.max(1, ...days.map((d) => d.revenue));

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: '#1a1a1a' }}>Дашборд</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          {Object.entries(PERIOD_LABEL).map(([key, label]) => (
            <Link key={key} href={`/admin?period=${key}`} style={CHIP(period === key)}>
              {label}
            </Link>
          ))}
        </div>
      </div>

      {/* ── KPI cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 16 }}>
        <div style={{ ...CARD, borderLeft: '4px solid #16a34a' }}>
          <div style={CARD_LABEL}>Выручка</div>
          <div style={CARD_VALUE}>{(revenue / 100).toLocaleString('ru-RU')} ₽</div>
          <div style={{ fontSize: 13, color: '#888', marginTop: 6 }}>{paid.length} оплаченных заказов</div>
        </div>

        <div style={{ ...CARD, borderLeft: '4px solid #FF7A3D' }}>
          <div style={CARD_LABEL}>Средний чек</div>
          <div style={CARD_VALUE}>{(aov / 100).toLocaleString('ru-RU')} ₽</div>
          <div style={{ fontSize: 13, color: '#888', marginTop: 6 }}>на заказ</div>
        </div>

        <div style={{ ...CARD, borderLeft: '4px solid #6366f1' }}>
          <div style={CARD_LABEL}>Конверсия в оплату</div>
          <div style={CARD_VALUE}>{conversion}%</div>
          <div style={{ fontSize: 13, color: '#888', marginTop: 6 }}>{paid.length} из {totalAttempts} попыток</div>
        </div>

        <div style={{ ...CARD, borderLeft: '4px solid #0ea5e9' }}>
          <div style={CARD_LABEL}>Покупатели</div>
          <div style={CARD_VALUE}>{paidEmailsInPeriod.size}</div>
          <div style={{ fontSize: 13, color: '#888', marginTop: 6 }}>
            новых {newCustomers} · повторных {returningCustomers}
          </div>
        </div>

        <div style={{ ...CARD, borderLeft: emailHealthPct >= 95 ? '4px solid #16a34a' : '4px solid #dc2626' }}>
          <div style={CARD_LABEL}>Письма доставлены</div>
          <div style={CARD_VALUE}>{emailHealthPct}%</div>
          <div style={{ fontSize: 13, color: '#888', marginTop: 6 }}>{emailSentCount} из {paid.length}</div>
        </div>

        <div style={{ ...CARD, borderLeft: '4px solid #f59e0b' }}>
          <div style={CARD_LABEL}>Отзывы</div>
          <div style={CARD_VALUE}>{reviewsAgg.count > 0 ? `★ ${reviewsAgg.avg}` : '—'}</div>
          <div style={{ fontSize: 13, color: '#888', marginTop: 6 }}>{reviewsAgg.count} опубликовано</div>
        </div>
      </div>

      {/* ── Revenue trend ── */}
      <div style={{ ...CARD, marginBottom: 16 }}>
        <div style={CARD_LABEL}>Выручка по дням (14 дней)</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 120, marginTop: 8 }}>
          {days.map((d, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div
                title={`${d.label}: ${(d.revenue / 100).toLocaleString('ru-RU')} ₽`}
                style={{
                  width: '100%',
                  maxWidth: 28,
                  height: Math.max(2, Math.round((d.revenue / maxDayRevenue) * 90)),
                  background: d.revenue > 0 ? '#FF7A3D' : '#f0f0f0',
                  borderRadius: 4,
                }}
              />
              <span style={{ fontSize: 10, color: '#aaa', whiteSpace: 'nowrap' }}>{d.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Promo code impact ── */}
      <div style={{ ...CARD, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
          <div style={CARD_LABEL}>Влияние промокодов</div>
          <Link href="/admin/promo-codes" style={{ fontSize: 12, fontWeight: 700, color: '#FF7A3D', textDecoration: 'none' }}>
            Управление промокодами →
          </Link>
        </div>
        {promoOrders.length === 0 ? (
          <div style={{ fontSize: 13, color: '#aaa' }}>Промокоды не использовались за период</div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 22, fontWeight: 900, color: '#1a1a1a' }}>{promoShare}%</div>
                <div style={{ fontSize: 12, color: '#888' }}>заказов со скидкой ({promoOrders.length} из {paid.length})</div>
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 900, color: '#1a1a1a' }}>{(promoDiscountGiven / 100).toLocaleString('ru-RU')} ₽</div>
                <div style={{ fontSize: 12, color: '#888' }}>отдано скидок</div>
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 900, color: '#1a1a1a' }}>{(aovPromo / 100).toLocaleString('ru-RU')} ₽</div>
                <div style={{ fontSize: 12, color: '#888' }}>средний чек с промокодом</div>
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 900, color: aovPromo >= aovNonPromo ? '#16a34a' : '#dc2626' }}>
                  {(aovNonPromo / 100).toLocaleString('ru-RU')} ₽
                </div>
                <div style={{ fontSize: 12, color: '#888' }}>средний чек без промокода</div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {topPromoCodes.map(([code, c]) => (
                <div key={code} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, borderTop: '1px solid #f0f0f0', paddingTop: 8 }}>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#16a34a', fontSize: 13 }}>{code}</span>
                  <span style={{ fontSize: 13, color: '#888' }}>
                    {c.count}× · выручка <b style={{ color: '#1a1a1a' }}>{(c.revenue / 100).toLocaleString('ru-RU')} ₽</b>
                    {' '}· скидок <b style={{ color: '#1a1a1a' }}>{(c.discount / 100).toLocaleString('ru-RU')} ₽</b>
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
        {/* ── Top products ── */}
        <div style={CARD}>
          <div style={{ ...CARD_LABEL, marginBottom: 12 }}>Топ товаров за период</div>
          {topProducts.length === 0 ? (
            <div style={{ fontSize: 13, color: '#aaa' }}>Нет продаж за период</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {topProducts.map(([id, p]) => (
                <div key={id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
                  <span style={{ fontSize: 14, color: '#1a1a1a', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.title}
                  </span>
                  <span style={{ fontSize: 13, color: '#888', whiteSpace: 'nowrap' }}>
                    {p.qty}× · <b style={{ color: '#1a1a1a' }}>{(p.revenue / 100).toLocaleString('ru-RU')} ₽</b>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Provider breakdown ── */}
        <div style={CARD}>
          <div style={{ ...CARD_LABEL, marginBottom: 12 }}>Способы оплаты</div>
          {providerBreakdown.length === 0 ? (
            <div style={{ fontSize: 13, color: '#aaa' }}>Нет данных за период</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {providerBreakdown.map(([provider, sum]) => (
                <div key={provider} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 14, color: '#1a1a1a', fontWeight: 600 }}>
                    {PROVIDER_LABEL[provider] || provider}
                  </span>
                  <span style={{ fontSize: 13, color: '#888' }}>
                    <b style={{ color: '#1a1a1a' }}>{(sum / 100).toLocaleString('ru-RU')} ₽</b>
                    {' '}({Math.round((sum / Math.max(1, revenue)) * 100)}%)
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Failure reasons ── */}
        <div style={CARD}>
          <div style={{ ...CARD_LABEL, marginBottom: 12 }}>Причины отказов ({failed.length})</div>
          {topReasons.length === 0 ? (
            <div style={{ fontSize: 13, color: '#aaa' }}>Нет отказов за период</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {topReasons.map(([reason, count]) => (
                <div key={reason} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 13, color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {CANCEL_REASON[reason] || reason}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#dc2626' }}>{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ marginTop: 20, display: 'flex', gap: 12 }}>
        <Link href="/admin/orders" style={{ fontSize: 13, fontWeight: 700, color: '#FF7A3D', textDecoration: 'none' }}>
          Все заказы →
        </Link>
        <Link href="/admin/orders?view=needs-help" style={{ fontSize: 13, fontWeight: 700, color: '#FF7A3D', textDecoration: 'none' }}>
          Брошенные корзины →
        </Link>
      </div>
    </div>
  );
}
