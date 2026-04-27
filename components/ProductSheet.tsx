'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { ProductDisplay } from '@/types/product';

const coverBg: Record<string, string> = {
  orange: 'linear-gradient(135deg, var(--orange-light), #FFE4D1)',
  lavender: 'linear-gradient(135deg, #E8E0F5, #D4C7ED)',
  green: 'linear-gradient(135deg, #E0F2E4, #C7E8CF)',
  blue: 'linear-gradient(135deg, #E0EBF5, #C7DAED)',
};

interface Props {
  product: ProductDisplay | null;
  inCart: boolean;
  onAdd: (id: string) => void;
  onClose: () => void;
}

export default function ProductSheet({ product, inCart, onAdd, onClose }: Props) {
  const [visible, setVisible] = useState(false);
  const startY = useRef(0);

  useEffect(() => {
    if (product) {
      requestAnimationFrame(() => setVisible(true));
      document.body.style.overflow = 'hidden';
    } else {
      setVisible(false);
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [product]);

  // Keep rendered during close animation
  if (!product && !visible) return null;
  if (!product) return null;

  const priceRubles = Math.round(product.price / 100);
  const priceOldRubles = product.price_old ? Math.round(product.price_old / 100) : null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.45)',
          zIndex: 200,
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.28s',
        }}
      />

      {/* Sheet */}
      <div
        onTouchStart={(e) => { startY.current = e.touches[0].clientY; }}
        onTouchEnd={(e) => { if (e.changedTouches[0].clientY - startY.current > 60) onClose(); }}
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 201,
          background: '#fff',
          borderRadius: '20px 20px 0 0',
          maxHeight: '82vh',
          overflowY: 'auto',
          transform: visible ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.32s cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 0 8px' }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: '#E0D8D0' }} />
        </div>

        {/* Cover */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <div
            style={{
              width: 160,
              height: 160,
              borderRadius: 16,
              overflow: 'hidden',
              background: coverBg[product.cover_variant] || coverBg.orange,
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 64,
            }}
          >
            {product.cover_url ? (
              <Image src={product.cover_url} alt={product.title} fill style={{ objectFit: 'cover' }} unoptimized />
            ) : (
              product.cover_emoji || '📦'
            )}
            {product.badge && (
              <div
                style={{
                  position: 'absolute',
                  top: 10,
                  left: 10,
                  background: 'var(--orange)',
                  color: '#fff',
                  borderRadius: 100,
                  padding: '3px 9px',
                  fontSize: 10,
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                {product.badge}
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '0 24px 40px' }}>
          {product.format && (
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--orange)',
                textTransform: 'uppercase',
                letterSpacing: '0.07em',
                marginBottom: 8,
                textAlign: 'center',
              }}
            >
              {product.format}
            </div>
          )}

          <h2
            style={{
              fontSize: 20,
              fontWeight: 900,
              color: '#1A1A2E',
              lineHeight: 1.3,
              marginBottom: 12,
              textAlign: 'center',
            }}
          >
            {product.title}
          </h2>

          {product.description && (
            <p
              style={{
                fontSize: 15,
                color: 'var(--ink-soft)',
                lineHeight: 1.65,
                marginBottom: 28,
              }}
            >
              {product.description}
            </p>
          )}

          {/* Price + CTA */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              background: 'var(--cream)',
              border: '1.5px solid var(--border)',
              borderRadius: 16,
              padding: '16px 20px',
            }}
          >
            <div style={{ flexShrink: 0 }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#1A1A2E', lineHeight: 1 }}>
                {priceRubles} ₽
              </div>
              {priceOldRubles && (
                <div style={{ fontSize: 13, color: 'var(--ink-soft)', textDecoration: 'line-through', marginTop: 2 }}>
                  {priceOldRubles} ₽
                </div>
              )}
            </div>

            <button
              onClick={() => { onAdd(product.id); onClose(); }}
              style={{
                flexShrink: 0,
                background: inCart ? '#E8F5E9' : 'var(--orange)',
                color: inCart ? '#2E7D32' : '#fff',
                border: 'none',
                borderRadius: 100,
                padding: '14px 20px',
                fontWeight: 800,
                fontSize: 16,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.2s',
              }}
            >
              {inCart ? '✓ В корзине' : 'В корзину'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
