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

interface ProductRowProps {
  product: ProductDisplay;
  inCart: boolean;
  onAdd: (id: string) => void;
  onSelect: (product: ProductDisplay) => void;
  onPlay: (product: ProductDisplay) => void;
}

export default function ProductRow({ product, inCart, onAdd, onSelect, onPlay }: ProductRowProps) {
  const [hovered, setHovered] = useState(false);

  const priceRubles = Math.round(product.price / 100);
  const priceOldRubles = product.price_old ? Math.round(product.price_old / 100) : null;

  return (
    <div
      onClick={() => onSelect(product)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '12px 20px',
        background: hovered ? 'rgba(255, 122, 61, 0.04)' : 'transparent',
        transition: 'background 0.15s',
        cursor: 'pointer',
      }}
    >
      {/* Thumbnail 48×48 */}
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 10,
          flexShrink: 0,
          overflow: 'hidden',
          background: coverBg[product.cover_variant] || coverBg.orange,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 22,
          position: 'relative',
        }}
      >
        {product.cover_url ? (
          <Image
            src={product.cover_url}
            alt={product.title}
            fill
            style={{ objectFit: 'cover' }}
            sizes="48px"
            unoptimized
          />
        ) : (
          product.cover_emoji || '📦'
        )}
        {/* Play overlay */}
        {product.demo_url && (
          <button
            onClick={(e) => { e.stopPropagation(); onPlay(product); }}
            style={{
              position: 'absolute', inset: 0,
              background: 'rgba(0,0,0,0.4)',
              border: 'none', borderRadius: 10,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: hovered ? 1 : 0,
              transition: 'opacity 0.15s',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff" style={{ marginLeft: 2 }}><path d="M8 5v14l11-7z"/></svg>
          </button>
        )}
      </div>

      {/* Title + meta */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontWeight: 700,
            fontSize: 15,
            color: '#1A1A2E',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {product.title}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
          {product.badge && (
            <span
              style={{
                background: 'var(--orange)',
                color: '#fff',
                borderRadius: 100,
                padding: '1px 8px',
                fontSize: 10,
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              {product.badge}
            </span>
          )}
          {product.format && (
            <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
              {product.format}
            </span>
          )}
        </div>
      </div>

      {/* Price */}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontWeight: 800, fontSize: 16, color: '#1A1A2E' }}>
          {priceRubles} ₽
        </div>
        {priceOldRubles && (
          <div style={{ fontSize: 12, color: 'var(--ink-soft)', textDecoration: 'line-through' }}>
            {priceOldRubles} ₽
          </div>
        )}
      </div>

      {/* External pay + cart buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        {product.boosty_url && (
          <a
            href={product.boosty_url}
            target="_blank"
            rel="noopener noreferrer"
            title="Купить через Boosty (Visa/Mastercard)"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 30, height: 30, borderRadius: '50%',
              background: '#F7422A', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              textDecoration: 'none', fontSize: 11, fontWeight: 900,
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
              width: 30, height: 30, borderRadius: '50%',
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
          onClick={(e) => { e.stopPropagation(); onAdd(product.id); }}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: inCart ? 'var(--orange)' : (hovered ? 'var(--orange)' : '#fff'),
            border: `1.5px solid ${inCart || hovered ? 'var(--orange)' : 'var(--border)'}`,
            color: inCart || hovered ? '#fff' : 'var(--ink-soft)',
            borderRadius: 100, padding: '7px 14px',
            fontWeight: 700, fontSize: 13,
            cursor: 'pointer', fontFamily: 'inherit',
            transition: 'all 0.18s', whiteSpace: 'nowrap', flexShrink: 0,
          }}
        >
          {inCart ? (
            <>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              В корзине
            </>
          ) : (
            <>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
              В корзину
            </>
          )}
        </button>
      </div>
    </div>
  );
}
