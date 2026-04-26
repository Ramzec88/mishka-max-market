'use client';

import { useState } from 'react';
import Link from 'next/link';

interface CheckoutFormProps {
  total: number;
  items: string[];
  onSuccess: (confirmationToken: string, orderId: string) => void;
  onError: (msg: string) => void;
}

export default function CheckoutForm({ total, items, onSuccess, onError }: CheckoutFormProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

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
        body: JSON.stringify({ items, email }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Ошибка при создании платежа');
      }

      const { confirmation_token, order_id } = await res.json();
      onSuccess(confirmation_token, order_id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Неизвестная ошибка';
      onError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
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
          width: '100%',
          padding: '14px 16px',
          border: '1.5px solid var(--border)',
          borderRadius: 12,
          fontFamily: 'inherit',
          fontSize: 15,
          marginBottom: 12,
          outline: 'none',
          transition: 'border-color 0.2s',
        }}
        onFocus={(e) => (e.target.style.borderColor = 'var(--orange)')}
        onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
      />
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 14,
          fontSize: 18,
          fontWeight: 900,
        }}
      >
        <span>Итого:</span>
        <span>{total} ₽</span>
      </div>
      <button
        type="submit"
        disabled={loading}
        style={{
          width: '100%',
          background: 'var(--orange)',
          color: '#fff',
          padding: 16,
          borderRadius: 100,
          fontSize: 16,
          fontWeight: 800,
          border: 'none',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontFamily: 'inherit',
          opacity: loading ? 0.6 : 1,
          transition: 'all 0.2s',
        }}
      >
        {loading ? 'Создаём платёж...' : 'Перейти к оплате'}
      </button>
      <p style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 10, textAlign: 'center', lineHeight: 1.4 }}>
        Нажимая кнопку, вы принимаете условия{' '}
        <Link href="/offer" style={{ color: 'var(--orange)', textDecoration: 'underline' }}>
          оферты
        </Link>{' '}
        и соглашаетесь на обработку персональных данных
      </p>
    </form>
  );
}
