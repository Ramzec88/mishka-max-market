'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { OrderStatus } from '@/types/order';
import { clearCart } from '@/lib/cart';

interface DownloadLink {
  token: string;
  product_id: string;
  product_title?: string;
  file_path: string;
  expires_at: string;
  downloads_remaining: number;
}

interface OrderStatusResponse {
  status: OrderStatus;
  download_links?: DownloadLink[];
}

export default function ThankYouContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('order');

  const [status, setStatus] = useState<OrderStatus | null>(null);
  const [links, setLinks] = useState<DownloadLink[]>([]);
  const [polling, setPolling] = useState(true);
  const [retryKey, setRetryKey] = useState(0);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || '';

  useEffect(() => {
    clearCart();
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
            if (!cancelled) setLinks(downloadLinks);
            if (downloadLinks.length > 0) {
              if (!cancelled) setPolling(false);
              return;
            }
          }
          if (data.status === 'canceled' || data.status === 'failed') {
            if (!cancelled) setPolling(false);
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

  const handleRetry = useCallback(() => {
    setRetryKey((k) => k + 1);
  }, []);

  if (!orderId) {
    return (
      <div style={{ maxWidth: 600, margin: '80px auto', padding: '0 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>❌</div>
        <h1 style={{ fontSize: 28, fontWeight: 900, marginBottom: 12 }}>Заказ не найден</h1>
        <p style={{ color: 'var(--ink-soft)', marginBottom: 24 }}>
          Ссылка недействительна. Проверьте письмо на email или обратитесь в поддержку.
        </p>
        <Link
          href="/"
          style={{
            display: 'inline-block', background: 'var(--orange)', color: '#fff',
            padding: '14px 28px', borderRadius: 100, fontWeight: 800, fontSize: 16,
          }}
        >
          На главную
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

      {!polling && (status === 'canceled' || status === 'failed') && (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>❌</div>
          <h1 style={{ fontSize: 28, fontWeight: 900, marginBottom: 12 }}>Платёж не прошёл</h1>
          <p style={{ color: 'var(--ink-soft)', marginBottom: 24 }}>
            Оплата была отменена или отклонена банком. Попробуйте снова.
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
      )}

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

          <div style={{ background: '#fff', borderRadius: 'var(--radius-lg)', padding: 24, boxShadow: 'var(--shadow-sm)' }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 16 }}>Ваши файлы</h2>
            {links.length === 0 ? (
              <div>
                <p style={{ color: 'var(--ink-soft)', fontSize: 14, marginBottom: 16 }}>
                  Ссылки ещё не появились. Проверьте email или нажмите кнопку ниже.
                </p>
                <button
                  onClick={handleRetry}
                  style={{
                    background: 'var(--orange)', color: '#fff',
                    padding: '10px 20px', borderRadius: 100,
                    fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer',
                  }}
                >
                  Обновить ссылки
                </button>
              </div>
            ) : links.map((link) => (
              <div key={link.token}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  gap: 12, padding: '14px 0', borderBottom: '1px solid var(--border)',
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>
                    {link.product_title || link.product_id}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>
                    осталось скачиваний: {link.downloads_remaining}
                  </div>
                </div>
                <a href={`${siteUrl}/api/download/${link.token}`}
                  style={{
                    background: 'var(--orange)', color: '#fff',
                    padding: '10px 18px', borderRadius: 100,
                    fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap', flexShrink: 0,
                  }}
                >
                  Скачать
                </a>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 24, textAlign: 'center' }}>
            <Link href="/" style={{ color: 'var(--orange)', fontWeight: 700, fontSize: 15, textDecoration: 'underline' }}>
              Вернуться в каталог
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
