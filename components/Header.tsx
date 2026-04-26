'use client';

import Link from 'next/link';
import CartButton from './CartButton';

export default function Header() {
  return (
    <header
      style={{
        background: '#fff',
        borderBottom: '1px solid var(--border)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 900, fontSize: 20 }}>
          <div
            style={{
              width: 40,
              height: 40,
              background: 'var(--orange)',
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              color: '#fff',
              fontWeight: 900,
              fontSize: 20,
              flexShrink: 0,
            }}
          >
            М
          </div>
          <span>Мишка Макс</span>
        </Link>
        <CartButton />
      </div>
    </header>
  );
}
