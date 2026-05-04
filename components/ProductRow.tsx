'use client';

import { useState, useEffect } from 'react';
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
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

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

      <div style={{ flexShrink: 0 }}>
        <button
          onClick={(e) => { e.stopPropagation(); onAdd(product.id); }}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: isDesktop ? 6 : 0,
            background: inCart ? '#16a34a' : 'var(--orange)',
            border: 'none',
            color: '#fff',
            borderRadius: 100,
            padding: isDesktop ? '7px 14px' : '0',
            width: isDesktop ? 'auto' : 36,
            height: 36,
            fontWeight: 700, fontSize: 13,
            cursor: 'pointer', fontFamily: 'inherit',
            transition: 'all 0.18s', whiteSpace: 'nowrap', flexShrink: 0,
          }}
        >
          {inCart ? (
            <>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><polyline points="20 6 9 17 4 12"/></svg>
              {isDesktop && <span>В корзине</span>}
            </>
          ) : (
            <>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
              {isDesktop && <span>В корзину</span>}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
