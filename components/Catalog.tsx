'use client';

import { useState, useEffect } from 'react';
import { Product, Category } from '@/types/product';
import { getCart, addToCart } from '@/lib/cart';
import ProductCard from './ProductCard';
import CartButton from './CartButton';
import CartDrawer from './CartDrawer';

type FilterCategory = 'all' | Category;

const FILTERS: { value: FilterCategory; label: string }[] = [
  { value: 'all', label: 'Все' },
  { value: 'songs', label: 'Песни' },
  { value: 'scenarios', label: 'Сценарии' },
  { value: 'materials', label: 'Материалы' },
  { value: 'bundles', label: 'Комплекты' },
];

interface CatalogProps {
  products: Product[];
}

export default function Catalog({ products }: CatalogProps) {
  const [activeCategory, setActiveCategory] = useState<FilterCategory>('all');
  const [cartIds, setCartIds] = useState<string[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const sync = () => setCartIds(getCart());
    sync();
    window.addEventListener('cart-updated', sync);
    return () => window.removeEventListener('cart-updated', sync);
  }, []);

  useEffect(() => {
    const handleOpen = () => setDrawerOpen(true);
    window.addEventListener('open-cart', handleOpen);
    return () => window.removeEventListener('open-cart', handleOpen);
  }, []);

  function handleAdd(id: string) {
    const updated = addToCart(id);
    setCartIds(updated);
    window.dispatchEvent(new Event('cart-updated'));
    setDrawerOpen(true);
  }

  const filtered =
    activeCategory === 'all' ? products : products.filter((p) => p.category === activeCategory);

  return (
    <>
      {/* CartButton wired to open drawer */}
      <div style={{ position: 'fixed', top: 16, right: 24, zIndex: 49, display: 'none' }}>
        <CartButton onClick={() => setDrawerOpen(true)} />
      </div>

      {/* Hero */}
      <section
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '48px 24px 32px',
          textAlign: 'center',
        }}
      >
        <h1
          style={{
            fontSize: 'clamp(28px, 4vw, 44px)',
            fontWeight: 900,
            letterSpacing: '-0.02em',
            marginBottom: 12,
          }}
        >
          Маркет <span style={{ color: 'var(--orange)' }}>Мишки Макса</span>
        </h1>
        <p style={{ color: 'var(--ink-soft)', fontSize: 17, maxWidth: 640, margin: '0 auto' }}>
          Готовые материалы для утренников, развивающих занятий и домашних праздников.
          Мгновенная доставка на email сразу после оплаты.
        </p>
      </section>

      {/* Filters */}
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '0 24px 24px',
          display: 'flex',
          gap: 10,
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}
      >
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setActiveCategory(f.value)}
            style={{
              background: activeCategory === f.value ? 'var(--orange)' : '#fff',
              border: `1.5px solid ${activeCategory === f.value ? 'var(--orange)' : 'var(--border)'}`,
              color: activeCategory === f.value ? '#fff' : 'var(--ink-soft)',
              padding: '10px 18px',
              borderRadius: 100,
              fontWeight: 700,
              fontSize: 14,
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.2s',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Product grid */}
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '0 24px 80px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 24,
        }}
      >
        {filtered.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            inCart={cartIds.includes(product.id)}
            onAdd={handleAdd}
          />
        ))}
        {filtered.length === 0 && (
          <div
            style={{
              gridColumn: '1 / -1',
              textAlign: 'center',
              padding: '60px 20px',
              color: 'var(--ink-soft)',
            }}
          >
            В этой категории пока нет товаров
          </div>
        )}
      </div>

      {/* Cart Drawer */}
      <CartDrawer
        products={products}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </>
  );
}
