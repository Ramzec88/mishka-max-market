'use client';

import { useState } from 'react';

export default function OrderActions({ orderId, isPaid }: { orderId: string; isPaid: boolean }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleResend() {
    if (!confirm('Отправить письмо со ссылками на скачивание повторно?')) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/resend-email`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) setResult('✓ Письмо отправлено');
      else setResult(`Ошибка: ${data.error}`);
    } catch {
      setResult('Ошибка сети');
    } finally {
      setLoading(false);
    }
  }

  if (!isPaid) return null;

  return (
    <div style={{ marginTop: 24 }}>
      <button
        onClick={handleResend}
        disabled={loading}
        style={{
          background: loading ? '#ffb899' : '#FF7A3D', color: '#fff',
          border: 'none', borderRadius: 8, padding: '10px 24px',
          fontWeight: 700, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? 'Отправляем...' : '📧 Отправить письмо повторно'}
      </button>
      {result && (
        <div style={{
          marginTop: 10, padding: '8px 14px', borderRadius: 8, fontSize: 14,
          background: result.startsWith('✓') ? '#dcfce7' : '#fee2e2',
          color: result.startsWith('✓') ? '#16a34a' : '#dc2626',
        }}>
          {result}
        </div>
      )}
    </div>
  );
}
