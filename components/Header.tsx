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
      <style>{`
        .header-site-label { display: inline; }
        @media (max-width: 480px) {
          .header-site-label { display: none; }
          .header-logo-text { display: none; }
        }
      `}</style>
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 900, fontSize: 18, textDecoration: 'none', color: 'inherit', flexShrink: 0 }}>
          <div
            style={{
              width: 36,
              height: 36,
              background: 'var(--orange)',
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              color: '#fff',
              fontWeight: 900,
              fontSize: 18,
              flexShrink: 0,
            }}
          >
            М
          </div>
          <span className="header-logo-text">Мишка Макс</span>
        </Link>

        <a
          href="https://mishka-max.ru"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--ink-soft)',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            flexShrink: 0,
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
          </svg>
          <span className="header-site-label">Сайт Мишки Макса</span>
        </a>

        <CartButton />
      </div>
    </header>
  );
}
