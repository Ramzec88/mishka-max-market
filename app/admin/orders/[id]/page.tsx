export const dynamic = 'force-dynamic';

import { unstable_noStore as noStore } from 'next/cache';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase/admin';
import OrderActions from './OrderActions';

interface Props { params: { id: string } }

function fmt(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default async function OrderDetailPage({ params }: Props) {
  noStore();

  const { data: order } = await supabaseAdmin
    .from('orders')
    .select('*')
    .eq('id', params.id)
    .single();

  if (!order) notFound();

  const { data: tokens } = await supabaseAdmin
    .from('download_tokens')
    .select('token, product_id, file_path, downloads_count, max_downloads, expires_at')
    .eq('order_id', params.id)
    .order('created_at');

  const productIds = Array.from(new Set((tokens || []).map((t) => t.product_id)));
  const { data: products } = await supabaseAdmin
    .from('products')
    .select('id, title')
    .in('id', productIds);

  const productMap = new Map((products || []).map((p) => [p.id, p.title]));

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || '';

  const STATUS_LABEL: Record<string, { label: string; bg: string; color: string }> = {
    paid:    { label: 'Оплачен',  bg: '#dcfce7', color: '#16a34a' },
    pending: { label: 'Ожидает', bg: '#fef9c3', color: '#854d0e' },
    canceled:{ label: 'Отменён', bg: '#f3f4f6', color: '#888' },
    failed:  { label: 'Ошибка',  bg: '#fee2e2', color: '#dc2626' },
  };
  const s = STATUS_LABEL[order.status] || { label: order.status, bg: '#f3f4f6', color: '#888' };

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

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div style={{ marginBottom: 20 }}>
        <Link href="/admin/orders" style={{ fontSize: 13, color: '#888', textDecoration: 'none' }}>← Все заказы</Link>
      </div>

      {/* Order info */}
      <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h1 style={{ fontSize: 18, fontWeight: 900, color: '#1a1a1a' }}>Заказ</h1>
          <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: 100, fontSize: 13, fontWeight: 700, background: s.bg, color: s.color }}>
            {s.label}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px', fontSize: 14 }}>
          {[
            ['ID заказа', order.id],
            ['Email', order.email],
            ['Сумма', `${(order.amount / 100).toLocaleString('ru-RU')} ₽`],
            ['Товаров', `${order.items?.length || 0} шт.`],
            ['Создан', fmt(order.created_at)],
            ['Оплачен', fmt(order.paid_at)],
            ['Письмо отправлено', fmt(order.email_sent_at)],
            ['YooKassa ID', order.yookassa_payment_id || '—'],
            ...(order.cancellation_reason ? [['Причина отмены', CANCEL_REASON[order.cancellation_reason] ?? order.cancellation_reason]] : []),
          ].map(([label, value]) => (
            <div key={label}>
              <div style={{ fontSize: 11, color: '#aaa', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>{label}</div>
              <div style={{ color: '#1a1a1a', wordBreak: 'break-all' }}>{value}</div>
            </div>
          ))}
        </div>

        <OrderActions orderId={order.id} isPaid={order.status === 'paid'} />
      </div>

      {/* Download tokens */}
      <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 16, color: '#1a1a1a' }}>
          Ссылки для скачивания ({tokens?.length || 0})
        </h2>

        {!tokens || tokens.length === 0 ? (
          <div style={{ color: '#aaa', fontSize: 14 }}>Токены не созданы — заказ не оплачен или ошибка вебхука.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                {['Товар / Файл', 'Скачиваний', 'Истекает', 'Действие'].map(h => (
                  <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#666', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(tokens || []).map((t) => {
                const expired = new Date(t.expires_at) < new Date();
                const exhausted = t.downloads_count >= t.max_downloads;
                return (
                  <tr key={t.token} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '10px 10px' }}>
                      <div style={{ fontWeight: 600, color: '#1a1a1a' }}>{productMap.get(t.product_id) || t.product_id}</div>
                      <div style={{ color: '#aaa', marginTop: 2 }}>{t.file_path.split('/').pop()}</div>
                    </td>
                    <td style={{ padding: '10px 10px' }}>
                      <span style={{ color: exhausted ? '#dc2626' : '#16a34a', fontWeight: 700 }}>
                        {t.downloads_count}/{t.max_downloads}
                      </span>
                    </td>
                    <td style={{ padding: '10px 10px', color: expired ? '#dc2626' : '#555', whiteSpace: 'nowrap' }}>
                      {expired ? '⚠ ' : ''}{fmt(t.expires_at)}
                    </td>
                    <td style={{ padding: '10px 10px' }}>
                      {!expired && !exhausted ? (
                        <a href={`${siteUrl}/api/download/${t.token}`} target="_blank"
                          style={{ color: '#FF7A3D', fontWeight: 600, fontSize: 12, textDecoration: 'none' }}>
                          Скачать ↗
                        </a>
                      ) : (
                        <span style={{ color: '#aaa', fontSize: 12 }}>{exhausted ? 'Лимит' : 'Истёк'}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
