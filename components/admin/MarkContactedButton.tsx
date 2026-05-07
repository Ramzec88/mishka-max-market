'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  email: string;
  isMarked: boolean;
  contactedAt: string | null;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function MarkContactedButton({ email, isMarked, contactedAt }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function toggle(action: 'mark' | 'unmark') {
    setLoading(true);
    await fetch('/api/admin/mark-contacted', {
      method: 'POST',
      body: new URLSearchParams({ email, action }),
    });
    router.refresh();
    setLoading(false);
  }

  if (isMarked && contactedAt) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          background: '#dcfce7', color: '#16a34a',
          borderRadius: 100, padding: '4px 12px',
          fontSize: 12, fontWeight: 700,
        }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          Письмо отправлено {formatDate(contactedAt)}
        </span>
        <button
          onClick={() => toggle('unmark')}
          disabled={loading}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', fontSize: 12, padding: 0 }}
          title="Снять отметку"
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => toggle('mark')}
      disabled={loading}
      style={{
        fontSize: 13, fontWeight: 700,
        background: '#dcfce7', color: '#16a34a',
        padding: '6px 14px', borderRadius: 8,
        border: '1px solid #86efac', cursor: loading ? 'default' : 'pointer',
        whiteSpace: 'nowrap', fontFamily: 'inherit',
        opacity: loading ? 0.6 : 1,
      }}
    >
      {loading ? '...' : 'Отметить ✓'}
    </button>
  );
}
