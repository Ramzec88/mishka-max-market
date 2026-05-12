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

const BADGE_COLORS: Record<string, { bg: string }> = {
  'хит': { bg: '#FF7A3D' },
  'новинка': { bg: '#3B82F6' },
  'выгодно': { bg: '#16a34a' },
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

  const priceRubles = Math.round(product.price / 100);
  const priceOldRubles = product.price_old ? Math.round(product.price_old / 100) : null;

  const badgeKey = product.badge?.toLowerCase() ?? '';
  const badgeColor = BADGE_COLORS[badgeKey] ?? { bg: '#6b7280' };

  return (
    <div
      onClick={() => onSelect(product)}
      onMouseEnter={() => setCardHovered(true)}
      onMouseLeave={() => setCardHovered(false)}
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

        {product.badge && (
          <div
            style={{
              position: 'absolute',
              top: 10,
              left: 10,
              background: badgeColor.bg,
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

        {product.demo_url && (
          <button
            onClick={(e) => { e.stopPropagation(); onPlay(product); }}
            style={{
              position: 'absolute', inset: 0,
              background: cardHovered ? 'rgba(0,0,0,0.32)' : 'rgba(0,0,0,0)',
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.2s',
            }}
          >
            <div style={{
              width: 52, height: 52, borderRadius: '50%',
              background: 'rgba(255,255,255,0.85)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: cardHovered ? 1 : 0.6,
              transition: 'opacity 0.2s',
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="#FF7A3D" style={{ marginLeft: 3 }}><path d="M8 5v14l11-7z"/></svg>
            </div>
          </button>
        )}
      </div>

      <div style={{ padding: '14px 14px 16px', display: 'flex', flexDirection: 'column', flex: 1 }}>
        {product.format && (
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: '#999',
              textTransform: 'uppercase',
              letterSpacing: '0.07em',
              marginBottom: 5,
            }}
          >
            {product.format}
          </div>
        )}
        <h3
          style={{
            fontSize: 15,
            fontWeight: 700,
            lineHeight: 1.35,
            color: '#1A1A2E',
            marginBottom: 0,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {product.title}
        </h3>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, marginTop: 'auto', paddingTop: 10 }}>
          <span style={{ fontSize: 19, fontWeight: 900, color: 'var(--ink)' }}>{priceRubles} ₽</span>
          {priceOldRubles && (
            <span style={{ textDecoration: 'line-through', color: '#9ca3af', fontSize: 12, fontWeight: 600 }}>
              {priceOldRubles} ₽
            </span>
          )}
        </div>

        <button
          onClick={(e) => { e.stopPropagation(); onAdd(product.id); }}
          style={{
            marginTop: 10,
            width: '100%',
            height: 40,
            borderRadius: 10,
            fontWeight: 700,
            fontSize: 14,
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'inherit',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            background: inCart ? '#16a34a' : 'var(--orange)',
            color: '#fff',
            transition: 'background 0.18s',
          }}
        >
          {inCart ? (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              В корзине
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
              В корзину
            </>
          )}
        </button>
      </div>
    </div>
  );
}
