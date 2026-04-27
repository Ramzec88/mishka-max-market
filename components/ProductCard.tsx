'use client';

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
  const priceRubles = Math.round(product.price / 100);
  const priceOldRubles = product.price_old ? Math.round(product.price_old / 100) : null;

  return (
    <div
      className="card"
      onClick={() => onAdd(product.id)}
      style={{
        background: '#fff',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-sm)',
        transition: 'all 0.25s',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-md)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = '';
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-sm)';
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
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 300px"
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
              fontSize: 72,
            }}
          >
            <span>{product.cover_emoji}</span>
          </div>
        )}

        {product.badge && (
          <div
            style={{
              position: 'absolute',
              top: 12,
              left: 12,
              background: 'var(--orange)',
              color: '#fff',
              padding: '5px 11px',
              borderRadius: 100,
              fontSize: 11,
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            {product.badge}
          </div>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: 18, display: 'flex', flexDirection: 'column', flex: 1 }}>
        {product.format && (
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--orange)',
              textTransform: 'uppercase',
              letterSpacing: '0.07em',
              marginBottom: 6,
            }}
          >
            {product.format}
          </div>
        )}
        <h3 style={{ fontSize: 16, fontWeight: 800, lineHeight: 1.3, marginBottom: 6 }}>
          {product.title}
        </h3>
        <p style={{ color: 'var(--ink-soft)', fontSize: 13, lineHeight: 1.5, marginBottom: 14, flex: 1 }}>
          {product.description}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <div>
            <span style={{ fontSize: 20, fontWeight: 900 }}>{priceRubles} ₽</span>
            {priceOldRubles && (
              <span
                style={{
                  textDecoration: 'line-through',
                  color: 'var(--ink-soft)',
                  fontSize: 13,
                  fontWeight: 600,
                  marginLeft: 6,
                }}
              >
                {priceOldRubles} ₽
              </span>
            )}
          </div>
          <button
            style={{
              background: inCart ? 'var(--orange)' : 'var(--ink)',
              color: '#fff',
              padding: '9px 15px',
              borderRadius: 100,
              fontWeight: 700,
              fontSize: 13,
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap',
            }}
            onClick={(e) => { e.stopPropagation(); onAdd(product.id); }}
          >
            {inCart ? '✓ В корзине' : 'В корзину'}
          </button>
        </div>
      </div>
    </div>
  );
}
