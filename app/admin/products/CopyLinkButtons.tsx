'use client';

import { useState } from 'react';

export default function CopyLinkButtons({ productId }: { productId: string }) {
  const [copied, setCopied] = useState<'link' | 'cart' | null>(null);

  function copy(url: string, type: 'link' | 'cart') {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  const base = typeof window !== 'undefined' ? window.location.origin : 'https://mishka-max.ru';
  const linkUrl = `${base}/?product=${productId}`;
  const cartUrl = `${base}/?product=${productId}&add=1`;

  const btnStyle = {
    fontSize: 12,
    fontWeight: 600,
    padding: '4px 10px',
    borderRadius: 6,
    border: '1.5px solid #e5e7eb',
    background: '#f9fafb',
    color: '#555',
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
    fontFamily: 'inherit',
    transition: 'all 0.15s',
  };

  return (
    <>
      <button style={btnStyle} onClick={() => copy(linkUrl, 'link')}>
        {copied === 'link' ? '✓ Скопировано' : '🔗 Ссылка'}
      </button>
      <button style={btnStyle} onClick={() => copy(cartUrl, 'cart')}>
        {copied === 'cart' ? '✓ Скопировано' : '🛒 +корзина'}
      </button>
    </>
  );
}
