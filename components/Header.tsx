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
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <style>{`
        .header-site-label { display: inline; }
        .header-search { display: block; }
        @media (max-width: 480px) {
          .header-site-label { display: none; }
          .header-logo-text { display: none; }
          .header-search { display: none; }
        }
      `}</style>
      <div
        style={{
          maxWidth: 1200,
          width: '100%',
          padding: '12px 16px',
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          alignItems: 'center',
          gap: 12,
        }}
      >
        {/* Left: logo + site link */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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
        </div>

        {/* Center: search */}
        <div className="header-search" style={{ width: 'clamp(160px, 30vw, 360px)', position: 'relative' }}>
          <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#999', display: 'flex', alignItems: 'center' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </div>
          <input
            type="search"
            placeholder="Поиск..."
            onChange={(e) => {
              const value = e.target.value;
              (window as any).__catalogSearch = value;
              window.dispatchEvent(new CustomEvent('catalog-search', { detail: value }));
            }}
            style={{
              border: '1.5px solid var(--border)',
              borderRadius: 100,
              padding: '8px 16px 8px 36px',
              fontSize: 14,
              background: '#f9f9f9',
              width: '100%',
              outline: 'none',
              fontFamily: 'inherit',
            }}
          />
        </div>

        {/* Right: cart */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <CartButton />
        </div>
      </div>
    </header>
  );
}
