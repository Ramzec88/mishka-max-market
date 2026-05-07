'use client';

import { useState } from 'react';

export default function CopyEmailButton({ email }: { email: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      style={{
        fontSize: 13, fontWeight: 700,
        background: copied ? '#dcfce7' : '#FF7A3D',
        color: copied ? '#16a34a' : '#fff',
        padding: '6px 14px', borderRadius: 8,
        border: 'none', cursor: 'pointer',
        whiteSpace: 'nowrap', fontFamily: 'inherit',
        transition: 'all 0.2s',
      }}
    >
      {copied ? '✓ Скопировано' : 'Копировать email'}
    </button>
  );
}
