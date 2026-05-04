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
  onPlay: (product: ProductDisplay) => void;
}

export default function ProductSheet({ product, inCart, onAdd, onClose, onPlay }: Props) {
  const [visible, setVisible] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const startY = useRef(0);

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

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

  useEffect(() => {
    if (!product) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [product, onClose]);

  if (!product && !visible) return null;
  if (!product) return null;

  const priceRubles = Math.round(product.price / 100);
  const priceOldRubles = product.price_old ? Math.round(product.price_old / 100) : null;

  const panelStyle = isDesktop
    ? {
        position: 'fixed' as const,
        top: '50%',
        left: '50%',
        transform: visible
          ? 'translate(-50%, -50%) scale(1)'
          : 'translate(-50%, -50%) scale(0.95)',
        opacity: visible ? 1 : 0,
        zIndex: 201,
        background: '#fff',
        borderRadius: 20,
        width: 'min(520px, 90vw)',
        maxHeight: '85vh',
        overflowY: 'auto' as const,
        transition: 'transform 0.22s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.22s',
        boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
      }
    : {
        position: 'fixed' as const,
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 201,
        background: '#fff',
        borderRadius: '20px 20px 0 0',
        maxHeight: '82vh',
        overflowY: 'auto' as const,
        transform: visible ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 0.32s cubic-bezier(0.32, 0.72, 0, 1)',
      };

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

      <div
        style={panelStyle}
        onTouchStart={(e) => { if (!isDesktop) startY.current = e.touches[0].clientY; }}
        onTouchEnd={(e) => { if (!isDesktop && e.changedTouches[0].clientY - startY.current > 60) onClose(); }}
      >
        {/* Mobile drag handle / Desktop close button */}
        {isDesktop ? (
          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '16px 16px 0' }}>
            <button
              onClick={onClose}
              style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'var(--border)',
                border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, color: 'var(--ink-soft)',
                fontFamily: 'inherit',
              }}
            >
              ✕
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 0 8px' }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: '#E0D8D0' }} />
          </div>
        )}

        {/* Cover */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20, marginTop: isDesktop ? 8 : 0 }}>
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
                  top: 10, left: 10,
                  background: 'var(--orange)',
                  color: '#fff',
                  borderRadius: 100,
                  padding: '3px 9px',
                  fontSize: 10, fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                {product.badge}
              </div>
            )}
          </div>
        </div>

        {/* Demo listen button */}
        {product.demo_url && (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>
            <button
              onClick={() => { onPlay(product); onClose(); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'var(--orange-light)',
                border: '1.5px solid var(--orange)',
                color: 'var(--orange)',
                borderRadius: 100, padding: '10px 24px',
                fontWeight: 700, fontSize: 15,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--orange)"><path d="M8 5v14l11-7z"/></svg>
              Слушать демо
            </button>
          </div>
        )}

        {/* Content */}
        <div style={{ padding: '0 24px 40px' }}>
          {product.format && (
            <div
              style={{
                fontSize: 11, fontWeight: 700,
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
              fontSize: 20, fontWeight: 900,
              color: '#1A1A2E',
              lineHeight: 1.3,
              marginBottom: 12,
              textAlign: 'center',
            }}
          >
            {product.title}
          </h2>

          {product.description && (
            <div
              className="product-desc"
              dangerouslySetInnerHTML={{ __html: product.description }}
              style={{
                fontSize: 15,
                color: 'var(--ink-soft)',
                lineHeight: 1.65,
                marginBottom: 28,
              }}
            />
          )}
          <style>{`
            .product-desc ul { padding-left: 20px; margin: 4px 0; }
            .product-desc ol { padding-left: 20px; margin: 4px 0; }
            .product-desc li { margin: 2px 0; }
            .product-desc p  { margin: 4px 0; }
          `}</style>

          {/* Price + CTA */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
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

          {/* Альтернативная оплата */}
          {(product.boosty_url || product.lava_url) && (
            <div style={{ marginTop: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                <span style={{ fontSize: 12, color: 'var(--ink-soft)', whiteSpace: 'nowrap' }}>
                  Visa / Mastercard не из России
                </span>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {product.boosty_url && (
                  <a
                    href={product.boosty_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                      background: '#FFF2F0', border: '1.5px solid #F7422A',
                      color: '#C4280E', borderRadius: 100,
                      padding: '12px 20px', fontWeight: 700, fontSize: 15,
                      textDecoration: 'none', fontFamily: 'inherit',
                    }}
                  >
                    <span style={{
                      width: 24, height: 24, borderRadius: '50%',
                      background: '#F7422A', color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 900, flexShrink: 0,
                    }}>B</span>
                    Купить через Boosty
                  </a>
                )}
                {product.lava_url && (
                  <a
                    href={product.lava_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                      background: '#F3F0FF', border: '1.5px solid #7B61FF',
                      color: '#5B41DF', borderRadius: 100,
                      padding: '12px 20px', fontWeight: 700, fontSize: 15,
                      textDecoration: 'none', fontFamily: 'inherit',
                    }}
                  >
                    <span style={{
                      width: 24, height: 24, borderRadius: '50%',
                      background: '#7B61FF', color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M13.5 0.67C13.5 0.67 14.24 3.32 14.24 5.47C14.24 7.53 12.89 9.2 10.83 9.2C8.76 9.2 7.2 7.53 7.2 5.47L7.23 5.1C5.21 7.51 4 10.61 4 14C4 18.42 7.58 22 12 22C16.42 22 20 18.42 20 14C20 8.61 17.41 3.8 13.5 0.67ZM11.71 19C9.93 19 8.49 17.6 8.49 15.86C8.49 14.24 9.53 13.1 11.3 12.74C13.07 12.38 14.9 11.53 15.86 10.1C16.2 11.1 16.39 12.18 16.39 13.3C16.39 16.44 14.34 19 11.71 19Z"/>
                      </svg>
                    </span>
                    Купить через Lava Top
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
