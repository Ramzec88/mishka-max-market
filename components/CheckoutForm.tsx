'use client';

import { useState } from 'react';
import Link from 'next/link';

interface CheckoutFormProps {
  total: number;
  items: string[];
  onSuccess: (confirmationToken: string, orderId: string) => void;
  onError: (msg: string) => void;
}

interface PromoData {
  code: string;
  description: string | null;
  discount_percent: number;
}

export default function CheckoutForm({ total, items, onSuccess, onError }: CheckoutFormProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const [promoInput, setPromoInput] = useState('');
  const [promoChecking, setPromoChecking] = useState(false);
  const [promoData, setPromoData] = useState<PromoData | null>(null);
  const [promoError, setPromoError] = useState('');

  const discountAmount = promoData ? Math.round(total * promoData.discount_percent / 100) : 0;
  const finalTotal = total - discountAmount;

  async function handleApplyPromo() {
    if (!promoInput.trim()) return;
    setPromoChecking(true);
    setPromoError('');
    setPromoData(null);
    try {
      const res = await fetch('/api/validate-promo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: promoInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPromoError(data.error || 'Промокод не подходит');
      } else {
        setPromoData(data);
      }
    } catch {
      setPromoError('Ошибка проверки промокода');
    } finally {
      setPromoChecking(false);
    }
  }

  function handleRemovePromo() {
    setPromoData(null);
    setPromoInput('');
    setPromoError('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      onError('Укажите корректный email — на него придут купленные файлы');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, email, promoCode: promoData?.code ?? null }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Ошибка при создании платежа');
      }
      const { confirmation_token, order_id } = await res.json();
      onSuccess(confirmation_token, order_id);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Email */}
      <label
        htmlFor="emailInput"
        style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--ink-soft)', marginBottom: 6 }}
      >
        Email для получения файлов
      </label>
      <input
        id="emailInput"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="your@email.ru"
        required
        style={{
          width: '100%', padding: '14px 16px',
          border: '1.5px solid var(--border)', borderRadius: 12,
          fontFamily: 'inherit', fontSize: 15, marginBottom: 12,
          outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box',
        }}
        onFocus={(e) => (e.target.style.borderColor = 'var(--orange)')}
        onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
      />

      {/* Промокод */}
      {!promoData ? (
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={promoInput}
              onChange={(e) => { setPromoInput(e.target.value.toUpperCase()); setPromoError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleApplyPromo())}
              placeholder="Промокод"
              style={{
                flex: 1, padding: '10px 14px',
                border: `1.5px solid ${promoError ? '#fca5a5' : 'var(--border)'}`,
                borderRadius: 10, fontFamily: 'inherit', fontSize: 14,
                outline: 'none', boxSizing: 'border-box',
              }}
            />
            <button
              type="button"
              onClick={handleApplyPromo}
              disabled={promoChecking || !promoInput.trim()}
              style={{
                background: 'var(--orange-light)', color: 'var(--orange)',
                border: '1.5px solid #FFD4B8', borderRadius: 10,
                padding: '10px 14px', fontWeight: 700, fontSize: 13,
                cursor: promoChecking || !promoInput.trim() ? 'not-allowed' : 'pointer',
                whiteSpace: 'nowrap', fontFamily: 'inherit', flexShrink: 0,
                opacity: !promoInput.trim() ? 0.5 : 1,
              }}
            >
              {promoChecking ? '...' : 'Применить'}
            </button>
          </div>
          {promoError && (
            <div style={{ fontSize: 12, color: '#dc2626', marginTop: 5 }}>{promoError}</div>
          )}
        </div>
      ) : (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: '#f0fdf4', border: '1.5px solid #86efac',
          borderRadius: 10, padding: '10px 14px', marginBottom: 14,
        }}>
          <div>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#16a34a' }}>
              ✓ {promoData.code}
            </span>
            {promoData.discount_percent > 0 && (
              <span style={{ fontSize: 12, color: '#16a34a', marginLeft: 6 }}>
                — скидка {promoData.discount_percent}%
              </span>
            )}
            {promoData.description && (
              <div style={{ fontSize: 11, color: '#15803d', marginTop: 2 }}>{promoData.description}</div>
            )}
          </div>
          <button
            type="button"
            onClick={handleRemovePromo}
            style={{ background: 'none', border: 'none', color: '#16a34a', cursor: 'pointer', fontSize: 18, fontFamily: 'inherit', padding: '0 4px' }}
          >
            ×
          </button>
        </div>
      )}

      {/* Итого */}
      <div style={{ marginBottom: 14 }}>
        {promoData && discountAmount > 0 && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: 'var(--ink-soft)', marginBottom: 4 }}>
              <span>Сумма</span>
              <span>{total} ₽</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#16a34a', marginBottom: 6 }}>
              <span>Скидка {promoData.discount_percent}%</span>
              <span>−{discountAmount} ₽</span>
            </div>
          </>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 18, fontWeight: 900 }}>
          <span>Итого:</span>
          <span>{finalTotal} ₽</span>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        style={{
          width: '100%', background: 'var(--orange)', color: '#fff',
          padding: 16, borderRadius: 100, fontSize: 16, fontWeight: 800,
          border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
          fontFamily: 'inherit', opacity: loading ? 0.6 : 1, transition: 'all 0.2s',
        }}
      >
        {loading ? 'Создаём платёж...' : 'Перейти к оплате'}
      </button>
      <p style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 10, textAlign: 'center', lineHeight: 1.4 }}>
        Нажимая кнопку, вы принимаете условия{' '}
        <Link href="/offer" style={{ color: 'var(--orange)', textDecoration: 'underline' }}>оферты</Link>{' '}
        и соглашаетесь на обработку персональных данных
      </p>
    </form>
  );
}
