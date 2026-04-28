'use client';

import { useState } from 'react';

interface Props {
  productId: string;
}

export default function DeactivateButton({ productId }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleDeactivate() {
    if (!confirm('Деактивировать товар?')) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/products/${productId}`, { method: 'DELETE' });
      if (res.ok) {
        window.location.reload();
      } else {
        const data = await res.json();
        alert(data.error || 'Ошибка при деактивации');
        setLoading(false);
      }
    } catch {
      alert('Ошибка сети');
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleDeactivate}
      disabled={loading}
      style={{
        background: 'transparent',
        border: '1px solid #e5e7eb',
        borderRadius: 6,
        padding: '4px 10px',
        fontSize: 12,
        fontWeight: 600,
        cursor: loading ? 'not-allowed' : 'pointer',
        color: '#888',
      }}
    >
      {loading ? '...' : 'Деактивировать'}
    </button>
  );
}
