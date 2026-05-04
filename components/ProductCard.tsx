'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ProductDisplay } from '@/types/product';

const coverBg: Record<string, string> = {
  orange: 'linear-gradient(135deg, var(--orange-light), #FFE4D1)',
  lavender: 'linear-gradient(135deg, #E8E0F5, #D4C7ED)',
  green: 'linear-gradient(135deg, #E0F2E4, #C7E8CF)',
  blue: 'linear-gradient(135deg, #E0EBF5, #C7DAED)',
};

interface ProductCardProps {
  product: ProductDisplay;
  inCart: boolean;
  onAdd: (id: string) => void;
  onSelect: (product: ProductDisplay) => void;
  onPlay: (product: ProductDisplay) => void;
}

export default function ProductCard({ product, inCart, onAdd, onSelect, onPlay }: ProductCardProps) {
  const [cardHovered, setCardHovered] = useState(false);
  const [btnHovered, setBtnHovered] = useState(false);

  const priceRubles = Math.round(product.price / 100);
  const priceOldRubles = product.price_old ? Math.round(product.price_old / 100) : null;

  return (
    <div
      onClick={() => onSelect(product)}
      onMouseEnter={() => setCardHovered(true)}
      onMouseLeave={() => { setCardHovered(false); setBtnHovered(false); }}
      style={{
        cursor: 'pointer',
        background: '#fff',
        borderRadius: 16,
        border: '1.5px solid var(--border)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        transform: cardHovered ? 'translateY(-5px)' : 'none',
        boxShadow: cardHovered
          ? '0 12px 36px rgba(0,0,0,0.11)'
          : '0 2px 8px rgba(0,0,0,0.04)',
        transition: 'transform 0.22s, box-shadow 0.22s',
      }}
    >
      {/* Cover — 1:1 */}
      <div style={{ aspectRatio: '1/1', position: 'relative', overflow: 'hidden' }}>
        {product.cover_url ? (
          <Image
            src={product.cover_url}
            alt={product.title}
            fill
            style={{ objectFit: 'cover' }}
            sizes="(max-width: 640px) 50vw, 260px"
            unoptimized
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              background: coverBg[product.cover_variant] || coverBg.orange,
              display: 'grid',
              placeItems: 'center',
              fontSize: 64,
            }}
          >
            <span>{product.cover_emoji || '📦'}</span>
          </div>
        )}

        {/* Badge */}
        {product.badge && (
          <div
            style={{
              position: 'absolute',
              top: 10,
              left: 10,
              background: 'var(--orange)',
              color: '#fff',
              padding: '4px 10px',
              borderRadius: 100,
              fontSize: 10,
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            {product.badge}
          </div>
        )}

        {/* Play overlay */}
        {product.demo_url && (
          <button
            onClick={(e) => { e.stopPropagation(); onPlay(product); }}
            style={{
              position: 'absolute', inset: 0,
              background: 'rgba(0,0,0,0.32)',
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: cardHovered ? 1 : 0,
              transition: 'opacity 0.2s',
            }}
          >
            <div style={{
              width: 52, height: 52, borderRadius: '50%',
              background: 'rgba(255,255,255,0.92)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="#FF7A3D" style={{ marginLeft: 3 }}><path d="M8 5v14l11-7z"/></svg>
            </div>
          </button>
        )}

      </div>

      {/* Body */}
      <div style={{ padding: '14px 14px 16px', display: 'flex', flexDirection: 'column', flex: 1 }}>
        {product.format && (
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: 'var(--orange)',
              textTransform: 'uppercase',
              letterSpacing: '0.07em',
              marginBottom: 5,
            }}
          >
            {product.format}
          </div>
        )}
        <h3 style={{ fontSize: 14, fontWeight: 800, lineHeight: 1.35, color: '#1A1A2E', marginBottom: 0 }}>
          {product.title}
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 'auto', paddingTop: 10 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
            <span style={{ fontSize: 17, fontWeight: 900, color: '#1A1A2E' }}>{priceRubles} ₽</span>
            {priceOldRubles && (
              <span style={{ textDecoration: 'line-through', color: 'var(--ink-soft)', fontSize: 12, fontWeight: 600 }}>
                {priceOldRubles} ₽
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {product.boosty_url && (
              <a
                href={product.boosty_url}
                target="_blank"
                rel="noopener noreferrer"
                title="Купить через Boosty (Visa/Mastercard)"
                onClick={(e) => e.stopPropagation()}
                style={{
                  width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                  background: '#F7422A', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  textDecoration: 'none', fontSize: 11, fontWeight: 900,
                  letterSpacing: '-0.01em',
                }}
              >
                B
              </a>
            )}
            {product.lava_url && (
              <a
                href={product.lava_url}
                target="_blank"
                rel="noopener noreferrer"
                title="Купить через Lava Top (Visa/Mastercard)"
                onClick={(e) => e.stopPropagation()}
                style={{
                  width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                  background: '#7B61FF', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  textDecoration: 'none',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M13.5 0.67C13.5 0.67 14.24 3.32 14.24 5.47C14.24 7.53 12.89 9.2 10.83 9.2C8.76 9.2 7.2 7.53 7.2 5.47L7.23 5.1C5.21 7.51 4 10.61 4 14C4 18.42 7.58 22 12 22C16.42 22 20 18.42 20 14C20 8.61 17.41 3.8 13.5 0.67ZM11.71 19C9.93 19 8.49 17.6 8.49 15.86C8.49 14.24 9.53 13.1 11.3 12.74C13.07 12.38 14.9 11.53 15.86 10.1C16.2 11.1 16.39 12.18 16.39 13.3C16.39 16.44 14.34 19 11.71 19Z"/>
                </svg>
              </a>
            )}
            <button
              onMouseEnter={() => setBtnHovered(true)}
              onMouseLeave={() => setBtnHovered(false)}
              onClick={(e) => { e.stopPropagation(); onAdd(product.id); }}
              style={{
                background: inCart ? 'var(--orange)' : 'transparent',
                color: inCart ? '#fff' : 'var(--orange)',
                border: `2px solid var(--orange)`,
                borderRadius: 100,
                padding: '5px 10px',
                fontWeight: 800,
                fontSize: 13,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: (btnHovered && !inCart) || inCart ? 5 : 0,
                transition: 'all 0.18s',
                fontFamily: 'inherit',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                overflow: 'hidden',
                maxWidth: (btnHovered && !inCart) || inCart ? 130 : 32,
              }}
            >
              {inCart ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  <span>В корзине</span>
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
                  {btnHovered && <span>В корзину</span>}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
