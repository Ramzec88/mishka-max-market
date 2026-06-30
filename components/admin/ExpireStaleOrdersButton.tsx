'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ExpireStaleOrdersButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/orders/expire-stale', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ошибка');
      alert(
        data.expiredCount > 0
          ? `Переведено в «Ошибка»: ${data.expiredCount} зависших заказов.`
          : 'Нет зависших заказов старше 3 часов.',
      );
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      title="Перевести заказы в статусе «Ожидает» старше 3 часов в «Ошибка»"
      style={{
        background: loading ? '#f3f4f6' : '#fff',
        color: '#555',
        border: '1px solid #e5e7eb',
        borderRadius: 8,
        padding: '9px 16px',
        fontWeight: 600,
        fontSize: 13,
        cursor: loading ? 'not-allowed' : 'pointer',
        fontFamily: 'inherit',
        whiteSpace: 'nowrap',
      }}
    >
      {loading ? '⏳ Обработка…' : '🧹 Очистить зависшие'}
    </button>
  );
}
