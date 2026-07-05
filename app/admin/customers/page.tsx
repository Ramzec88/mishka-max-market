export const dynamic = 'force-dynamic';

import { unstable_noStore as noStore } from 'next/cache';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { detectAzbukaSeries, buildAzbukaStatuses, segmentIdForStage } from '@/lib/azbuka-funnel';

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
  created_at: string;
  paid_at: string | null;
}

interface ProductRow {
  id: string;
  title: string;
  price: number;
  category: string;
  bundle_product_ids: string[];
  is_bundle: boolean;
}

async function getPaidOrders(): Promise<OrderRow[]> {
  noStore();
  const { data } = await supabaseAdmin
    .from('orders')
    .select('id, email, status, amount, items, line_items, created_at, paid_at')
    .eq('status', 'paid')
    .order('created_at', { ascending: false })
    .limit(3000);
  return (data || []) as OrderRow[];
}

async function getProducts(): Promise<ProductRow[]> {
  const { data } = await supabaseAdmin
    .from('products')
    .select('id, title, price, category, bundle_product_ids, is_bundle');
  return (data || []) as ProductRow[];
}

interface CustomerProduct {
  id: string;
  title: string;
  qty: number;
  revenue: number;
}

interface Customer {
  email: string;
  ordersCount: number;
  totalSpent: number;
  lastPurchase: string;
  products: Map<string, CustomerProduct>;
  ownedIds: Set<string>;
}

function buildCustomers(orders: OrderRow[], productMap: Map<string, ProductRow>): Map<string, Customer> {
  const customers = new Map<string, Customer>();

  for (const o of orders) {
    const cur = customers.get(o.email) || {
      email: o.email,
      ordersCount: 0,
      totalSpent: 0,
      lastPurchase: o.created_at,
      products: new Map<string, CustomerProduct>(),
      ownedIds: new Set<string>(),
    };
    cur.ordersCount += 1;
    cur.totalSpent += o.amount;
    if (o.created_at > cur.lastPurchase) cur.lastPurchase = o.created_at;

    const addProduct = (id: string, title: string, revenue: number) => {
      const p = cur.products.get(id) || { id, title, qty: 0, revenue: 0 };
      p.qty += 1;
      p.revenue += revenue;
      cur.products.set(id, p);
      cur.ownedIds.add(id);
      const product = productMap.get(id);
      if (product) for (const childId of product.bundle_product_ids) cur.ownedIds.add(childId);
    };

    if (o.line_items && o.line_items.length > 0) {
      for (const li of o.line_items) addProduct(li.product_id, li.title, li.paid_price);
    } else if (o.items && o.items.length > 0) {
      const share = Math.round(o.amount / o.items.length);
      for (const id of o.items) addProduct(id, productMap.get(id)?.title || id, share);
    }

    customers.set(o.email, cur);
  }

  return customers;
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

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit', timeZone: 'Europe/Moscow' });
}

interface Props { searchParams: { email?: string; product?: string; sort?: string } }

export default async function AdminCustomersPage({ searchParams }: Props) {
  const emailFilter = searchParams.email?.trim().toLowerCase() || '';
  const productFilter = searchParams.product?.trim().toLowerCase() || '';

  const [orders, products] = await Promise.all([getPaidOrders(), getProducts()]);
  const productMap = new Map(products.map((p) => [p.id, p]));
  const allCustomers = buildCustomers(orders, productMap);

  // ── Detect the Azbuka series + its bundle generically ──
  const { seriesProducts, seriesIds, azbukaBundle } = detectAzbukaSeries(products);
  const azbukaStatuses = seriesIds.length > 0 ? buildAzbukaStatuses(orders, products, seriesIds) : [];
  const azbukaFunnel = seriesIds.map((_, i) =>
    azbukaStatuses.filter((s) => s.ownedCount >= i + 1 || s.completed).length,
  );
  const stoppedByStage = seriesIds.map((_, i) =>
    azbukaStatuses.filter((s) => !s.completed && !s.hasGap && s.ownedCount === i + 1).length,
  );
  const azbukaCompletedCount = azbukaStatuses.filter((s) => s.completed).length;
  const azbukaGapCount = azbukaStatuses.filter((s) => s.hasGap && !s.completed).length;

  // ── Customers table (filterable, sorted by spend) ──
  let customerList = Array.from(allCustomers.values());
  if (emailFilter) customerList = customerList.filter((c) => c.email.toLowerCase().includes(emailFilter));
  if (productFilter) {
    customerList = customerList.filter((c) =>
      Array.from(c.products.values()).some((p) => p.title.toLowerCase().includes(productFilter)),
    );
  }
  customerList.sort((a, b) => b.totalSpent - a.totalSpent);
  const topCustomers = customerList.slice(0, 100);

  const sortedProductTitles = Array.from(new Set(products.map((p) => p.title))).sort((a, b) =>
    a.localeCompare(b, 'ru'),
  );

  const statusByEmail = new Map(azbukaStatuses.map((s) => [s.email, s]));

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <h1 style={{ fontSize: 24, fontWeight: 900, color: '#1a1a1a', marginBottom: 20 }}>Клиенты</h1>

      {/* ── KPI strip ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 20 }}>
        <div style={{ ...CARD, borderLeft: '4px solid #0ea5e9' }}>
          <div style={CARD_LABEL}>Уникальных покупателей</div>
          <div style={CARD_VALUE}>{allCustomers.size}</div>
        </div>
        <div style={{ ...CARD, borderLeft: '4px solid #16a34a' }}>
          <div style={CARD_LABEL}>Среднее число заказов</div>
          <div style={CARD_VALUE}>
            {allCustomers.size > 0
              ? (Array.from(allCustomers.values()).reduce((s, c) => s + c.ordersCount, 0) / allCustomers.size).toFixed(1)
              : '0'}
          </div>
        </div>
        <div style={{ ...CARD, borderLeft: '4px solid #FF7A3D' }}>
          <div style={CARD_LABEL}>Повторные покупатели</div>
          <div style={CARD_VALUE}>
            {Array.from(allCustomers.values()).filter((c) => c.ordersCount > 1).length}
          </div>
        </div>
      </div>

      {/* ── Azbuka series funnel ── */}
      {seriesIds.length > 0 && (
        <div style={{ ...CARD, marginBottom: 20 }}>
          <div style={{ ...CARD_LABEL, marginBottom: 12 }}>
            Воронка серии «Учим буквы с Мишкой Максом»
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
            {seriesProducts.map((p, i) => {
              const count = azbukaFunnel[i];
              const max = Math.max(1, azbukaFunnel[0] || 1);
              return (
                <div key={p.id} style={{ textAlign: 'center', minWidth: 70 }}>
                  <div
                    style={{
                      height: Math.max(4, Math.round((count / max) * 80)),
                      width: 36,
                      margin: '0 auto',
                      background: '#FF7A3D',
                      borderRadius: 6,
                    }}
                    title={`Серия ${p.num}: ${count} покупателей`}
                  />
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#1a1a1a', marginTop: 6 }}>{count}</div>
                  <div style={{ fontSize: 11, color: '#888' }}>Серия {p.num}</div>
                  {stoppedByStage[i] > 0 && (
                    <>
                      <div style={{ fontSize: 10, color: '#dc2626', marginTop: 2 }}>
                        −{stoppedByStage[i]} остановились
                      </div>
                      <Link
                        href={`/admin/followup?segment=${segmentIdForStage(i + 1)}`}
                        style={{ display: 'inline-block', marginTop: 3, fontSize: 10, fontWeight: 700, color: '#FF7A3D', textDecoration: 'none' }}
                      >
                        ✉️ Написать
                      </Link>
                    </>
                  )}
                </div>
              );
            })}
            <div style={{ textAlign: 'center', minWidth: 90 }}>
              <div
                style={{
                  height: Math.max(4, Math.round((azbukaCompletedCount / Math.max(1, azbukaFunnel[0] || 1)) * 80)),
                  width: 36,
                  margin: '0 auto',
                  background: '#16a34a',
                  borderRadius: 6,
                }}
                title={`Завершили: ${azbukaCompletedCount}`}
              />
              <div style={{ fontSize: 13, fontWeight: 800, color: '#16a34a', marginTop: 6 }}>{azbukaCompletedCount}</div>
              <div style={{ fontSize: 11, color: '#888' }}>
                {azbukaBundle ? 'Все серии / комплект' : 'Все серии'}
              </div>
            </div>
          </div>
          <div style={{ fontSize: 12, color: '#888', lineHeight: 1.6 }}>
            Всего вовлечено в серию: <b style={{ color: '#1a1a1a' }}>{azbukaStatuses.length}</b> чел.
            {' · '}завершили все части{azbukaBundle ? ' или купили комплект' : ''}: <b style={{ color: '#16a34a' }}>{azbukaCompletedCount}</b>
            {azbukaGapCount > 0 && (
              <> {' · '}купили серии не по порядку (есть пропуски): <b style={{ color: '#888' }}>{azbukaGapCount}</b></>
            )}
            <br />
            «Остановились» под каждой серией — купили подряд именно до этой части и не пошли дальше (и не взяли комплект).
            {azbukaBundle && (
              <> Можно адресно предложить им комплект «{azbukaBundle.title}» ({(azbukaBundle.price / 100).toLocaleString('ru-RU')} ₽).</>
            )}
          </div>
        </div>
      )}

      {/* ── Top customers table ── */}
      <div style={CARD}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
          <div style={CARD_LABEL}>Покупатели (топ {topCustomers.length} по сумме)</div>
          <form method="GET" action="/admin/customers" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input
              name="email"
              defaultValue={emailFilter}
              placeholder="Поиск по email..."
              style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '7px 12px', fontSize: 13, outline: 'none' }}
            />
            <input
              name="product"
              defaultValue={searchParams.product || ''}
              list="product-options"
              placeholder="Поиск по товару..."
              style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '7px 12px', fontSize: 13, outline: 'none' }}
            />
            <datalist id="product-options">
              {sortedProductTitles.map((title) => (
                <option key={title} value={title} />
              ))}
            </datalist>
            <button type="submit" style={{ background: '#FF7A3D', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 16px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              Найти
            </button>
            {(emailFilter || productFilter) && (
              <a href="/admin/customers" style={{ fontSize: 13, color: '#888', alignSelf: 'center', textDecoration: 'none' }}>Сбросить</a>
            )}
          </form>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                {['Email', 'Заказов', 'Сумма', 'Товары', 'Азбука', 'Последняя покупка', ''].map((h) => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#666', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {topCustomers.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: 30, textAlign: 'center', color: '#888' }}>Покупатели не найдены</td></tr>
              ) : topCustomers.map((c) => {
                const productTitles = Array.from(c.products.values()).map((p) => `${p.title} (×${p.qty})`).join(', ');
                const azStatus = statusByEmail.get(c.email);
                return (
                  <tr key={c.email} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '10px 12px', fontSize: 13, color: '#1a1a1a' }}>{c.email}</td>
                    <td style={{ padding: '10px 12px', fontSize: 13 }}>{c.ordersCount}</td>
                    <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 700 }}>{(c.totalSpent / 100).toLocaleString('ru-RU')} ₽</td>
                    <td
                      style={{ padding: '10px 12px', fontSize: 12, color: '#666', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      title={productTitles}
                    >
                      {c.products.size} тов. — {productTitles}
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 12, whiteSpace: 'nowrap' }}>
                      {!azStatus ? (
                        <span style={{ color: '#ccc' }}>—</span>
                      ) : azStatus.completed ? (
                        <span style={{ background: '#dcfce7', color: '#16a34a', borderRadius: 100, padding: '2px 8px', fontWeight: 700 }}>
                          ✓ завершил
                        </span>
                      ) : azStatus.hasGap ? (
                        <span style={{ background: '#f3f4f6', color: '#888', borderRadius: 100, padding: '2px 8px', fontWeight: 700 }}>
                          с пропуском
                        </span>
                      ) : (
                        <span style={{ background: '#fef9c3', color: '#92400e', borderRadius: 100, padding: '2px 8px', fontWeight: 700 }}>
                          остановился на {azStatus.ownedCount}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 12, color: '#888', whiteSpace: 'nowrap' }}>{formatDate(c.lastPurchase)}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <Link href={`/admin/orders?view=all&email=${encodeURIComponent(c.email)}`} style={{ fontSize: 12, fontWeight: 600, color: '#FF7A3D', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                        Заказы →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
