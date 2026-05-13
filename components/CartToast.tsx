'use client';

import { useEffect, useRef } from 'react';

interface CartToastProps {
  visible: boolean;
  productTitle: string;
  cartCount: number;
  cartTotal: number;
  onGoToCart: () => void;
  onHide: () => void;
}

export default function CartToast({ visible, productTitle, cartCount, cartTotal, onGoToCart, onHide }: CartToastProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => onHide(), 3500);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [visible, productTitle]);

  return (
    <>
      <style>{`
        @media (max-width: 768px) { .cart-toast { display: none !important; } }
      `}</style>
      <div
        className="cart-toast"
        style={{
          position: 'fixed',
          bottom: 28,
          right: 28,
          zIndex: 400,
          background: 'var(--ink)',
          color: '#fff',
          borderRadius: 16,
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          boxShadow: '0 8px 30px rgba(0,0,0,0.25)',
          transform: visible ? 'translateY(0)' : 'translateY(90px)',
          opacity: visible ? 1 : 0,
          transition: 'transform 0.3s ease, opacity 0.3s ease',
          pointerEvents: visible ? 'auto' : 'none',
          maxWidth: 340,
        }}
      >
        {/* Icon */}
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: 'var(--orange)', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 17,
        }}>
          🛒
        </div>

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 13, fontWeight: 700, color: '#fff',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {productTitle}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>
            {cartCount} {cartCount === 1 ? 'товар' : cartCount < 5 ? 'товара' : 'товаров'} · {(cartTotal / 100).toLocaleString('ru-RU')} ₽
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={() => { onGoToCart(); onHide(); }}
          style={{
            background: 'var(--orange)',
            border: 'none',
            borderRadius: 100,
            padding: '8px 14px',
            fontSize: 13,
            fontWeight: 700,
            color: '#fff',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            fontFamily: 'inherit',
          }}
        >
          Оформить →
        </button>

        {/* Close */}
        <button
          onClick={onHide}
          style={{
            background: 'none', border: 'none',
            color: 'rgba(255,255,255,0.4)', cursor: 'pointer',
            fontSize: 20, padding: '0 2px', flexShrink: 0,
            lineHeight: 1, fontFamily: 'inherit',
          }}
        >
          ×
        </button>
      </div>
    </>
  );
}
