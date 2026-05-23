'use client';

import { useState } from 'react';

export default function TriggerFollowupButton() {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [result, setResult] = useState('');

  async function handleClick() {
    setState('loading');
    try {
      const res = await fetch('/api/cron/followup', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Ошибка');
      setResult(`Отправлено: ${json.sent}`);
      setState('done');
      setTimeout(() => { setState('idle'); setResult(''); }, 4000);
    } catch (err) {
      setResult(err instanceof Error ? err.message : 'Ошибка');
      setState('error');
      setTimeout(() => { setState('idle'); setResult(''); }, 4000);
    }
  }

  const label = state === 'loading'
    ? 'Отправка...'
    : state === 'done'
    ? `✓ ${result}`
    : state === 'error'
    ? `✗ ${result}`
    : 'Запустить сейчас';

  const bg = state === 'done' ? '#16a34a' : state === 'error' ? '#dc2626' : '#FF7A3D';

  return (
    <button
      onClick={handleClick}
      disabled={state === 'loading'}
      style={{
        background: bg, color: '#fff',
        border: 'none', borderRadius: 10,
        padding: '10px 20px', fontWeight: 700, fontSize: 14,
        cursor: state === 'loading' ? 'not-allowed' : 'pointer',
        whiteSpace: 'nowrap', transition: 'background 0.2s',
        opacity: state === 'loading' ? 0.7 : 1,
      }}
    >
      {label}
    </button>
  );
}
