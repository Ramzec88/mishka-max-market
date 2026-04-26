'use client';

import { useEffect, useState } from 'react';
import { getCart } from '@/lib/cart';

interface CartButtonProps {
  onClick?: () => void;
}

export default function CartButton({ onClick }: CartButtonProps) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const updateCount = () => setCount(getCart().length);
    updateCount();
    window.addEventListener('cart-updated', updateCount);
    return () => window.removeEventListener('cart-updated', updateCount);
  }, []);

  function handleClick() {
    if (onClick) {
      onClick();
    } else {
      window.dispatchEvent(new Event('open-cart'));
    }
  }

  return (
    <button
      onClick={handleClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background: 'var(--orange)',
        color: '#fff',
        padding: '10px 18px',
        borderRadius: 100,
        fontWeight: 700,
        fontSize: 15,
        border: 'none',
        cursor: 'pointer',
        transition: 'all 0.2s',
        fontFamily: 'inherit',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--orange-dark)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--orange)')}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="21" r="1" />
        <circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
      </svg>
      Корзина
      <span
        style={{
          background: '#fff',
          color: 'var(--orange)',
          borderRadius: 100,
          minWidth: 22,
          height: 22,
          display: 'grid',
          placeItems: 'center',
          fontSize: 13,
          fontWeight: 800,
          padding: '0 6px',
        }}
      >
        {count}
      </span>
    </button>
  );
}
