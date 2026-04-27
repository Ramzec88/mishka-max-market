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
}

export default function ProductCard({ product, inCart, onAdd }: ProductCardProps) {
  const [cardHovered, setCardHovered] = useState(false);
  const [btnHovered, setBtnHovered] = useState(false);

  const priceRubles = Math.round(product.price / 100);
  const priceOldRubles = product.price_old ? Math.round(product.price_old / 100) : null;

  return (
    <div
      onMouseEnter={() => setCardHovered(true)}
      onMouseLeave={() => { setCardHovered(false); setBtnHovered(false); }}
      style={{
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
          <button
            onMouseEnter={() => setBtnHovered(true)}
            onMouseLeave={() => setBtnHovered(false)}
            onClick={() => onAdd(product.id)}
            style={{
              background: inCart ? 'var(--orange)' : (btnHovered ? 'var(--ink)' : 'var(--orange-light)'),
              color: inCart || btnHovered ? '#fff' : 'var(--orange)',
              border: 'none',
              borderRadius: 100,
              padding: '6px 12px',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              transition: 'all 0.18s',
              fontFamily: 'inherit',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            <span>{inCart ? '✓' : '+'}</span>
            <span>{inCart ? 'В корзине' : 'В корзину'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
