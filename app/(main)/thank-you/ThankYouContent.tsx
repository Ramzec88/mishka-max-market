'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { OrderStatus } from '@/types/order';
import { clearCart, addToCart } from '@/lib/cart';

const LAVA_SESSION_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

function recoverOrderId(): string | null {
  try {
    const v = sessionStorage.getItem('lava_pending_order');
    if (v) return v;
  } catch { /* ignore */ }
  try {
    const raw = localStorage.getItem('lava_payment_session');
    if (raw) {
      const parsed = JSON.parse(raw) as { id?: string; ts?: number };
      if (parsed.id && parsed.ts && Date.now() - parsed.ts < LAVA_SESSION_TTL_MS) {
        return parsed.id;
      }
    }
  } catch { /* ignore */ }
  return null;
}

function clearPaymentSession() {
  try { sessionStorage.removeItem('lava_pending_order'); } catch { /* ignore */ }
  try { localStorage.removeItem('lava_payment_session'); } catch { /* ignore */ }
}

const LARGE_FILE_BYTES = 50 * 1024 * 1024;

interface DownloadLink {
  token: string;
  product_id: string;
  product_title?: string;
  file_name: string;
  expires_at: string;
  downloads_remaining: number;
  file_size_bytes?: number | null;
}

interface RecommendedProduct {
  id: string;
  title: string;
  price: number;
  price_old: number | null;
  category: string;
  cover_emoji: string | null;
  cover_variant: string;
  badge: string | null;
  format: string | null;
}

interface EcommerceProduct {
  id: string;
  name: string;
  price: number;
}

interface CloudLink {
  product_id: string;
  product_title: string;
  cloud_url: string;
}

interface OrderStatusResponse {
  status: OrderStatus;
  amount?: number;
  promo_code?: string | null;
  discount_amount?: number;
  cancellation_reason?: string | null;
  ecommerce_products?: EcommerceProduct[];
  download_links?: DownloadLink[];
  cloud_links?: CloudLink[];
}

const CANCEL_MESSAGES: Record<string, { title: string; body: string }> = {
  payment_canceled:        { title: 'Платёж отменён', body: 'Вы отменили оплату. Вернитесь в каталог и попробуйте снова.' },
  expired_on_confirmation: { title: 'Время на оплату вышло', body: 'Вы не завершили оплату вовремя. Попробуйте снова — корзина сохранена.' },
  insufficient_funds:      { title: 'Недостаточно средств', body: 'На карте не хватает средств. Попробуйте другую карту или пополните баланс.' },
  card_expired:            { title: 'Карта просрочена', body: 'Срок действия карты истёк. Используйте другую карту.' },
  fraud_suspected:         { title: 'Платёж заблокирован банком', body: 'Ваш банк заблокировал транзакцию как подозрительную. Свяжитесь с банком или используйте другую карту.' },
  card_not_supported:      { title: 'Карта не поддерживается', body: 'К сожалению, иностранные карты не принимаются. Попробуйте российскую карту или другой способ оплаты.' },
  country_forbidden:       { title: 'Оплата из вашей страны недоступна', body: 'Платёжная система не поддерживает карты из вашей страны. Попробуйте другой способ оплаты или напишите нам.' },
  '3ds_failed':            { title: 'Не удалось подтвердить платёж', body: 'Банк не смог подтвердить платёж (3D-Secure). Попробуйте снова или используйте другую карту.' },
  call_issuer:             { title: 'Требуется звонок в банк', body: 'Ваш банк требует дополнительного подтверждения. Позвоните на горячую линию банка и повторите оплату.' },
  rejected_by_payee:       { title: 'Платёж отклонён', body: 'Платёжная система отклонила транзакцию. Попробуйте другую карту или напишите нам.' },
  internal_timeout:        { title: 'Технический сбой', body: 'Произошла техническая ошибка. Попробуйте снова через несколько минут.' },
};

export default function ThankYouContent() {
  const searchParams = useSearchParams();
  const orderIdFromQuery = searchParams.get('order');
  const [orderId, setOrderId] = useState<string | null>(orderIdFromQuery);
  const [orderResolved, setOrderResolved] = useState(!!orderIdFromQuery);

  useEffect(() => {
    if (orderIdFromQuery) {
      setOrderId(orderIdFromQuery);
      setOrderResolved(true);
      clearPaymentSession();
      return;
    }

    const recovered = recoverOrderId();
    if (recovered) {
      setOrderId(recovered);
      clearPaymentSession();
      try {
        const url = new URL(window.location.href);
        url.searchParams.set('order', recovered);
        window.history.replaceState(null, '', url.pathname + url.search);
      } catch { /* ignore */ }
    }

    setOrderResolved(true);
  }, [orderIdFromQuery]);

  const [status, setStatus] = useState<OrderStatus | null>(null);
  const [links, setLinks] = useState<DownloadLink[]>([]);
  const [cloudLinks, setCloudLinks] = useState<CloudLink[]>([]);
  const [polling, setPolling] = useState(true);
  const [retryKey, setRetryKey] = useState(0);
  const [cancelReason, setCancelReason] = useState<string | null>(null);
  const ymFired = useRef(false);
  const [recommendations, setRecommendations] = useState<RecommendedProduct[]>([]);
  const [addedToCart, setAddedToCart] = useState<Set<string>>(new Set());

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || '';

  useEffect(() => {
    clearCart();
    window.dispatchEvent(new Event('cart-updated'));
  }, []);

  useEffect(() => {
    if (!orderId) {
      setPolling(false);
      return;
    }

    setPolling(true);
    let count = 0;
    const MAX_ATTEMPTS = 20;
    let timer: ReturnType<typeof setTimeout>;
    let cancelled = false;

    async function poll() {
      if (cancelled) return;
      try {
        const res = await fetch(`/api/order-status/${orderId}`);
        if (res.ok) {
          const data: OrderStatusResponse = await res.json();
          if (!cancelled) setStatus(data.status);

          if (data.status === 'paid') {
            const downloadLinks = data.download_links || [];
            const cloudLinksData = data.cloud_links || [];
            if (!cancelled) setLinks(downloadLinks);
            if (!cancelled) setCloudLinks(cloudLinksData);

            // Отправляем ecommerce-событие в Яндекс Метрику ровно один раз
            if (!ymFired.current && data.amount != null && data.ecommerce_products?.length) {
              ymFired.current = true;
              window.dataLayer = window.dataLayer || [];
              const actionField: Record<string, unknown> = {
                id: orderId,
                revenue: Math.round(data.amount / 100),
              };
              if (data.promo_code) actionField.coupon = data.promo_code;
              window.dataLayer.push({
                ecommerce: {
                  currencyCode: 'RUB',
                  purchase: {
                    actionField,
                    products: data.ecommerce_products.map((p) => ({
                      id: p.id,
                      name: p.name,
                      price: p.price,
                      quantity: 1,
                    })),
                  },
                },
              });
            }

            // Останавливаем поллинг если есть хоть что-то для покупателя (файлы или облако)
            if (downloadLinks.length > 0 || cloudLinksData.length > 0) {
              if (!cancelled) setPolling(false);
              return;
            }
          }
          if (data.status === 'canceled' || data.status === 'failed') {
            if (!cancelled) {
              setCancelReason(data.cancellation_reason ?? null);
              setPolling(false);
            }
            return;
          }
        }
      } catch {
        // continue polling
      }

      count++;
      if (!cancelled && count < MAX_ATTEMPTS) {
        timer = setTimeout(poll, 3000);
      } else if (!cancelled) {
        setPolling(false);
      }
    }

    poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [orderId, retryKey]);

  useEffect(() => {
    if (status === 'paid' && orderId) {
      fetch(`/api/recommendations?order=${orderId}`)
        .then((r) => r.ok ? r.json() : [])
        .then((data) => Array.isArray(data) && setRecommendations(data))
        .catch(() => {});
    }
  }, [status, orderId]);

  const handleAddToCart = useCallback((productId: string) => {
    addToCart(productId);
    window.dispatchEvent(new Event('cart-updated'));
    setAddedToCart((prev) => new Set(prev).add(productId));
  }, []);

  const handleRetry = useCallback(() => {
    setRetryKey((k) => k + 1);
  }, []);

  if (!orderResolved) {
    return (
      <div style={{ maxWidth: 600, margin: '80px auto', padding: '0 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
        <p style={{ color: 'var(--ink-soft)' }}>Загружаем ваш заказ…</p>
      </div>
    );
  }

  if (!orderId) {
    return (
      <div style={{ maxWidth: 520, margin: '80px auto', padding: '0 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
        <h1 style={{ fontSize: 28, fontWeight: 900, marginBottom: 12 }}>Оплата прошла успешно!</h1>
        <p style={{ color: 'var(--ink-soft)', fontSize: 16, lineHeight: 1.6, marginBottom: 24 }}>
          Файлы уже готовятся — в течение нескольких минут вы получите письмо со ссылками для скачивания.
        </p>
        <p style={{ color: 'var(--ink-soft)', fontSize: 14, marginBottom: 32 }}>
          Не нашли письмо? Проверьте папку «Спам». Если письмо не пришло в течение 10 минут — напишите нам на{' '}
          <a href="mailto:info@mishka-max.ru" style={{ color: 'var(--orange)' }}>info@mishka-max.ru</a>
        </p>
        <Link
          href="/"
          style={{
            display: 'inline-block', background: 'var(--orange)', color: '#fff',
            padding: '14px 32px', borderRadius: 100, fontWeight: 800, textDecoration: 'none', fontSize: 15,
          }}
        >
          Вернуться в каталог
        </Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 600, margin: '60px auto', padding: '0 24px' }}>
      {polling && (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
          <h1 style={{ fontSize: 28, fontWeight: 900, marginBottom: 12 }}>Обрабатываем платёж…</h1>
          <p style={{ color: 'var(--ink-soft)' }}>Подождите несколько секунд, не закрывайте страницу.</p>
        </div>
      )}

      {!polling && status === 'pending' && (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📬</div>
          <h1 style={{ fontSize: 28, fontWeight: 900, marginBottom: 12 }}>Обработка занимает чуть больше времени</h1>
          <p style={{ color: 'var(--ink-soft)', marginBottom: 24, lineHeight: 1.6 }}>
            Проверьте email через пару минут — ссылки для скачивания придут туда.
            Если письма нет — напишите:{' '}
            <a href="mailto:info@mishka-max.ru" style={{ color: 'var(--orange)' }}>info@mishka-max.ru</a>
          </p>
          <button
            onClick={handleRetry}
            style={{
              background: 'var(--orange)', color: '#fff',
              padding: '12px 24px', borderRadius: 100,
              fontWeight: 700, fontSize: 15, border: 'none', cursor: 'pointer',
            }}
          >
            Проверить снова
          </button>
        </div>
      )}

      {!polling && (status === 'canceled' || status === 'failed') && (() => {
        const msg = (cancelReason && CANCEL_MESSAGES[cancelReason]) || {
          title: 'Платёж не прошёл',
          body: 'Оплата была отменена или отклонена. Попробуйте снова или напишите нам.',
        };
        return (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>❌</div>
            <h1 style={{ fontSize: 26, fontWeight: 900, marginBottom: 12 }}>{msg.title}</h1>
            <p style={{ color: 'var(--ink-soft)', marginBottom: 8, lineHeight: 1.6 }}>
              {msg.body}
            </p>
            <p style={{ color: 'var(--ink-soft)', fontSize: 13, marginBottom: 28 }}>
              Остались вопросы?{' '}
              <a href="mailto:info@mishka-max.ru" style={{ color: 'var(--orange)', fontWeight: 700 }}>
                info@mishka-max.ru
              </a>
            </p>
            <Link href="/"
              style={{
                display: 'inline-block', background: 'var(--orange)', color: '#fff',
                padding: '14px 28px', borderRadius: 100, fontWeight: 800, fontSize: 16,
              }}
            >
              Вернуться в каталог
            </Link>
          </div>
        );
      })()}

      {!polling && status === 'paid' && (
        <div>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
            <h1 style={{ fontSize: 32, fontWeight: 900, marginBottom: 12 }}>Спасибо за покупку!</h1>
            <p style={{ color: 'var(--ink-soft)', fontSize: 16, lineHeight: 1.6 }}>
              Ссылки для скачивания отправлены на ваш email.<br />
              Они также доступны здесь в течение 7 дней.
            </p>
          </div>

          {/* Облачные ссылки — основной блок когда нет файлов */}
          {links.length === 0 && cloudLinks.length > 0 && (
            <div style={{ background: '#EFF6FF', borderRadius: 'var(--radius-lg)', padding: 24, boxShadow: 'var(--shadow-sm)', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 4, color: '#1a1a1a' }}>☁️ Ваши материалы в облаке</h2>
              <p style={{ color: '#4B70B3', fontSize: 14, marginBottom: 16, lineHeight: 1.5 }}>
                Ссылка на папку с материалами также отправлена вам на email.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {cloudLinks.map((cl) => (
                  <div key={cl.product_id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    gap: 12, padding: '12px 0', borderBottom: '1px solid #DBEAFE',
                  }}>
                    <div style={{ fontWeight: 600, fontSize: 15, color: '#1a1a1a' }}>{cl.product_title}</div>
                    <a
                      href={cl.cloud_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        background: '#4F87FF', color: '#fff',
                        padding: '10px 22px', borderRadius: 100,
                        fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap', flexShrink: 0,
                        textDecoration: 'none',
                      }}
                    >
                      Открыть папку ↗
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Файлы для скачивания */}
          {links.length > 0 && (
          <div style={{ background: '#fff', borderRadius: 'var(--radius-lg)', padding: 24, boxShadow: 'var(--shadow-sm)' }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 16 }}>Ваши файлы</h2>
            {(() => {
              // группируем по product_id
              const groups = new Map<string, { title: string; files: DownloadLink[] }>();
              for (const link of links) {
                const key = link.product_id;
                if (!groups.has(key)) {
                  groups.set(key, { title: link.product_title || link.product_id, files: [] });
                }
                groups.get(key)!.files.push(link);
              }
              return Array.from(groups.entries()).map(([productId, group]) => (
                <div key={productId} style={{ marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 10 }}>
                    {group.title}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {group.files.map((link) => (
                      <div key={link.token}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                          <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
                            {link.file_name}
                            {link.file_size_bytes != null && (
                              <span style={{ marginLeft: 6, fontSize: 11 }}>
                                · {(link.file_size_bytes / 1024 / 1024).toFixed(0)} МБ
                              </span>
                            )}
                            <span style={{ marginLeft: 6, fontSize: 11 }}>
                              ({link.downloads_remaining} скач.)
                            </span>
                          </div>
                          <a
                            href={`${siteUrl}/api/download/${link.token}`}
                            style={{
                              background: 'var(--orange)', color: '#fff',
                              padding: '8px 16px', borderRadius: 100,
                              fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap', flexShrink: 0,
                              textDecoration: 'none',
                            }}
                          >
                            Скачать
                          </a>
                        </div>
                        {link.file_size_bytes != null && link.file_size_bytes > LARGE_FILE_BYTES && (
                          <div style={{
                            marginTop: 6, padding: '8px 12px',
                            background: '#FFF7ED', border: '1px solid #FED7AA',
                            borderRadius: 8, fontSize: 13, color: '#92400E', lineHeight: 1.4,
                          }}>
                            ⏳ Файл крупный ({(link.file_size_bytes / 1024 / 1024).toFixed(0)} МБ) — скачивание может занять несколько минут. Не закрывайте страницу и дождитесь полной загрузки.
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ));
            })()}

            {/* Облачные ссылки дополнительно к файлам */}
            {cloudLinks.length > 0 && (
              <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                <h3 style={{ fontSize: 15, fontWeight: 800, color: '#1a1a1a', marginBottom: 12 }}>
                  ☁️ Материалы в облаке
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {cloudLinks.map((cl) => (
                    <div key={cl.product_id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                    }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: '#1a1a1a' }}>{cl.product_title}</div>
                      <a
                        href={cl.cloud_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          background: '#4F87FF', color: '#fff',
                          padding: '8px 16px', borderRadius: 100,
                          fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap', flexShrink: 0,
                          textDecoration: 'none',
                        }}
                      >
                        Открыть папку ↗
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          )}

          {/* Отзыв */}
          {(() => {
            const purchasedProducts = new Map<string, string>();
            for (const l of links) purchasedProducts.set(l.product_id, l.product_title || l.product_id);
            for (const cl of cloudLinks) purchasedProducts.set(cl.product_id, cl.product_title || cl.product_id);
            const productList = Array.from(purchasedProducts.entries());
            if (productList.length === 0) return null;

            return (
              <div style={{
                marginTop: 20, background: '#FFF8F3', border: '1.5px solid #FFE4D1',
                borderRadius: 16, padding: 24, textAlign: 'center',
              }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>⭐</div>
                <h3 style={{ fontSize: 17, fontWeight: 900, color: '#1a1a1a', marginBottom: 8 }}>
                  Понравились материалы?
                </h3>
                <p style={{ fontSize: 14, color: 'var(--ink-soft)', lineHeight: 1.6, marginBottom: 16 }}>
                  Оставьте отзыв прямо сейчас — это займёт минуту и поможет другим педагогам выбрать нужные материалы.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {productList.map(([id, title]) => (
                    <a
                      key={id}
                      href={`/review?order=${orderId}&product=${id}`}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                        background: '#fff', border: '1px solid #FFD4B8',
                        padding: '12px 18px', borderRadius: 100,
                        fontWeight: 700, fontSize: 14, color: '#1a1a1a', textDecoration: 'none',
                      }}
                    >
                      <span style={{ textAlign: 'left' }}>{title}</span>
                      <span style={{ color: '#FF7A3D', flexShrink: 0, whiteSpace: 'nowrap' }}>Оставить отзыв →</span>
                    </a>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Рекомендации */}
          {recommendations.length > 0 && (
            <div style={{
              marginTop: 20,
              background: '#fff',
              border: '1.5px solid #F0E4D6',
              borderRadius: 16,
              padding: 24,
            }}>
              <h3 style={{ fontSize: 16, fontWeight: 900, color: '#1a1a1a', marginBottom: 16 }}>
                Вам также может понравиться
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {recommendations.map((rec) => (
                  <div key={rec.id} style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '12px 0',
                    borderBottom: '1px solid var(--border)',
                  }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: 10, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 26,
                      background: rec.cover_variant === 'lavender' ? 'linear-gradient(135deg,#E8E0F5,#D4C7ED)'
                        : rec.cover_variant === 'green' ? 'linear-gradient(135deg,#E0F2E4,#C7E8CF)'
                        : rec.cover_variant === 'blue' ? 'linear-gradient(135deg,#E0EBF5,#C7DAED)'
                        : 'linear-gradient(135deg,#FFE4D1,#FFCBA8)',
                    }}>
                      {rec.cover_emoji ?? '🎵'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#1a1a1a', marginBottom: 2 }}>{rec.title}</div>
                      <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
                        {Math.round(rec.price / 100)} ₽
                        {rec.price_old && (
                          <span style={{ marginLeft: 6, textDecoration: 'line-through', color: '#bbb', fontSize: 12 }}>
                            {Math.round(rec.price_old / 100)} ₽
                          </span>
                        )}
                      </div>
                    </div>
                    {addedToCart.has(rec.id) ? (
                      <Link
                        href="/"
                        style={{
                          background: '#22c55e', color: '#fff',
                          padding: '8px 16px', borderRadius: 100,
                          fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap',
                          textDecoration: 'none', flexShrink: 0,
                        }}
                      >
                        В корзине →
                      </Link>
                    ) : (
                      <button
                        onClick={() => handleAddToCart(rec.id)}
                        style={{
                          background: 'var(--orange)', color: '#fff',
                          padding: '8px 16px', borderRadius: 100,
                          fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap',
                          border: 'none', cursor: 'pointer', flexShrink: 0,
                        }}
                      >
                        В корзину
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Кросс-сейл блок */}
          <div style={{
            marginTop: 20,
            background: 'linear-gradient(135deg, #FFF8F3 0%, #FFF1E8 100%)',
            border: '1.5px solid #FFD4B8',
            borderRadius: 16,
            padding: 24,
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', top: -20, right: -20,
              width: 100, height: 100, borderRadius: '50%',
              background: 'rgba(255,122,61,0.08)',
            }} />
            <div style={{ fontSize: 28, marginBottom: 10 }}>🎓</div>
            <h3 style={{ fontSize: 17, fontWeight: 900, color: '#1a1a1a', marginBottom: 8, lineHeight: 1.3 }}>
              Материалы для занятий — уже в нашем канале
            </h3>
            <p style={{ fontSize: 14, color: 'var(--ink-soft)', lineHeight: 1.6, marginBottom: 16 }}>
              Пока файлы летят вам на почту — загляните в <strong style={{ color: '#1a1a1a' }}>Кладовую педагога</strong>.
              Там мы каждую неделю делимся бесплатными песнями, сценариями и идеями для занятий.
              Подпишитесь сейчас, чтобы не пропустить следующие обновления и специальные предложения только для участников канала.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <a
                href="https://t.me/mishka_max/245"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: '#2CA5E0', color: '#fff',
                  padding: '12px 20px', borderRadius: 100,
                  fontWeight: 700, fontSize: 14, textDecoration: 'none',
                  justifyContent: 'center',
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.941z"/>
                </svg>
                Подписаться в Telegram
              </a>
              <a
                href="https://max.ru/id320203526914_4_bot"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: '#fff', color: '#FF7A3D',
                  border: '1.5px solid #FFD4B8',
                  padding: '12px 20px', borderRadius: 100,
                  fontWeight: 700, fontSize: 14, textDecoration: 'none',
                  justifyContent: 'center',
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M21 2H3C1.9 2 1 2.9 1 4v16l4-4h16c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H5v-2h14v2zm0-3H5V9h14v2zm0-3H5V6h14v2z"/>
                </svg>
                Подписаться в Max
              </a>
            </div>
          </div>

          <div style={{ marginTop: 20, textAlign: 'center' }}>
            <Link href="/" style={{ color: 'var(--orange)', fontWeight: 700, fontSize: 15, textDecoration: 'underline' }}>
              Вернуться в каталог
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
