'use client';

import { Product } from '@/types/product';

const coverStyles: Record<string, React.CSSProperties> = {
  orange: { background: 'linear-gradient(135deg, var(--orange-light), #FFE4D1)' },
  lavender: { background: 'linear-gradient(135deg, #E8E0F5, #D4C7ED)' },
  green: { background: 'linear-gradient(135deg, #E0F2E4, #C7E8CF)' },
  blue: { background: 'linear-gradient(135deg, #E0EBF5, #C7DAED)' },
};

interface ProductCardProps {
  product: Product;
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
      {/* Cover */}
      <div
        style={{
          aspectRatio: '4/3',
          ...coverStyles[product.cover_variant],
          display: 'grid',
          placeItems: 'center',
          fontSize: 64,
          position: 'relative',
        }}
      >
        {product.badge && (
          <div
            style={{
              position: 'absolute',
              top: 14,
              left: 14,
              background: '#fff',
              padding: '6px 12px',
              borderRadius: 100,
              fontSize: 12,
              fontWeight: 800,
              color: 'var(--ink)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            {product.badge}
          </div>
        )}
        <span>{product.cover_emoji}</span>
      </div>

      {/* Body */}
      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', flex: 1 }}>
        {product.format && (
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--orange)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: 8,
            }}
          >
            {product.format}
          </div>
        )}
        <h3 style={{ fontSize: 18, fontWeight: 800, lineHeight: 1.3, marginBottom: 8 }}>
          {product.title}
        </h3>
        <p style={{ color: 'var(--ink-soft)', fontSize: 14, marginBottom: 16, flex: 1 }}>
          {product.description}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <span style={{ fontSize: 22, fontWeight: 900 }}>{priceRubles} ₽</span>
            {priceOldRubles && (
              <span
                style={{
                  textDecoration: 'line-through',
                  color: 'var(--ink-soft)',
                  fontSize: 14,
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
              padding: '10px 16px',
              borderRadius: 100,
              fontWeight: 700,
              fontSize: 14,
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap',
            }}
            onClick={(e) => {
              e.stopPropagation();
              onAdd(product.id);
            }}
          >
            {inCart ? '✓ В корзине' : 'В корзину'}
          </button>
        </div>
      </div>
    </div>
  );
}
