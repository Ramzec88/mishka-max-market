'use client';

import { useState, useEffect } from 'react';
import { ProductDisplay, Category } from '@/types/product';
import { getCart, addToCart } from '@/lib/cart';
import ProductCard from './ProductCard';
import ProductRow from './ProductRow';
import ProductSheet from './ProductSheet';
import CartButton from './CartButton';
import CartDrawer from './CartDrawer';
import StickyPlayer from './StickyPlayer';

type FilterCategory = 'all' | Category;

const FILTERS: { value: FilterCategory; label: string }[] = [
  { value: 'all', label: 'Все' },
  { value: 'songs', label: 'Песни' },
  { value: 'scenarios', label: 'Сценарии' },
  { value: 'materials', label: 'Материалы' },
  { value: 'bundles', label: 'Комплекты' },
];

interface CatalogProps {
  products: ProductDisplay[];
}

export default function Catalog({ products }: CatalogProps) {
  const [activeCategory, setActiveCategory] = useState<FilterCategory>('all');
  const [search, setSearch] = useState('');
  const [cartIds, setCartIds] = useState<string[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sheetProduct, setSheetProduct] = useState<ProductDisplay | null>(null);
  const [playingProduct, setPlayingProduct] = useState<ProductDisplay | null>(null);

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

  // Showcase: products with a badge or bundles (up to 5, always visible regardless of filter)
  const showcaseProducts = products
    .filter((p) => p.badge !== null || p.category === 'bundles')
    .slice(0, 5);
  const showcaseIds = new Set(showcaseProducts.map((p) => p.id));

  // Catalog list: remaining products (not in showcase), filtered by category + search
  const q = search.trim().toLowerCase();
  const catalogProducts = products
    .filter((p) => !showcaseIds.has(p.id))
    .filter((p) => activeCategory === 'all' || p.category === activeCategory)
    .filter((p) => !q || p.title.toLowerCase().includes(q) || (p.description ?? '').toLowerCase().includes(q));

  return (
    <>
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
            color: '#1A1A2E',
            marginBottom: 12,
          }}
        >
          Маркет <span style={{ color: 'var(--orange)' }}>Мишки Макса</span>
        </h1>
        <p style={{ color: 'var(--ink-soft)', fontSize: 17, maxWidth: 640, margin: '0 auto' }}>
          Готовые материалы для утренников, развивающих занятий и домашних праздников.
          Мгновенная доставка на email сразу после оплаты.
        </p>
        <div style={{ marginTop: 14, display: 'inline-flex', alignItems: 'center', gap: 7, background: 'var(--orange-light)', border: '1.5px solid #FFD4B8', borderRadius: 100, padding: '7px 16px' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--orange)"><path d="M8 5v14l11-7z"/></svg>
          <span style={{ fontSize: 14, color: 'var(--orange)', fontWeight: 700 }}>Некоторые песни можно прослушать прямо на сайте — нажмите на карточку</span>
        </div>
      </section>

      {/* ── Showcase (tiles) ── */}
      {showcaseProducts.length > 0 && (
        <section style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px 44px' }}>
          <h2
            style={{
              fontSize: 17,
              fontWeight: 800,
              color: '#1A1A2E',
              marginBottom: 16,
              letterSpacing: '-0.01em',
            }}
          >
            Популярное
          </h2>
          {/* Horizontal scroll on mobile; fills the row on wide screens */}
          <div
            style={{
              display: 'flex',
              gap: 16,
              overflowX: 'auto',
              scrollSnapType: 'x mandatory',
              WebkitOverflowScrolling: 'touch',
              paddingBottom: 4,
              scrollbarWidth: 'none',
            }}
          >
            {showcaseProducts.map((product) => (
              <div
                key={product.id}
                style={{
                  scrollSnapAlign: 'start',
                  flexShrink: 0,
                  width: 'clamp(220px, 22vw, 260px)',
                }}
              >
                <ProductCard
                  product={product}
                  inCart={cartIds.includes(product.id)}
                  onAdd={handleAdd}
                  onSelect={setSheetProduct}
                  onPlay={setPlayingProduct}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Filters ── */}
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '0 24px 14px',
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

      {/* ── Search ── */}
      <div style={{ maxWidth: 480, margin: '0 auto 20px', padding: '0 24px' }}>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по названию или описанию..."
          style={{
            width: '100%',
            border: '1.5px solid var(--border)',
            borderRadius: 100,
            padding: '12px 20px',
            fontSize: 15,
            outline: 'none',
            fontFamily: 'inherit',
            boxSizing: 'border-box',
            background: '#fff',
          }}
        />
      </div>

      {/* ── Catalog list ── */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px 80px' }}>
        <div
          style={{
            background: '#fff',
            borderRadius: 16,
            border: '1.5px solid var(--border)',
            overflow: 'hidden',
          }}
        >
          {catalogProducts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--ink-soft)' }}>
              В этой категории пока нет товаров
            </div>
          ) : (
            catalogProducts.map((product, idx) => (
              <div
                key={product.id}
                style={{
                  borderBottom:
                    idx < catalogProducts.length - 1 ? '1px solid var(--border)' : 'none',
                }}
              >
                <ProductRow
                  product={product}
                  inCart={cartIds.includes(product.id)}
                  onAdd={handleAdd}
                  onSelect={setSheetProduct}
                  onPlay={setPlayingProduct}
                />
              </div>
            ))
          )}
        </div>
      </div>

      <CartDrawer
        products={products}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />

      <ProductSheet
        product={sheetProduct}
        inCart={sheetProduct ? cartIds.includes(sheetProduct.id) : false}
        onAdd={handleAdd}
        onClose={() => setSheetProduct(null)}
        onPlay={setPlayingProduct}
      />

      <StickyPlayer
        product={playingProduct}
        inCart={playingProduct ? cartIds.includes(playingProduct.id) : false}
        onClose={() => setPlayingProduct(null)}
        onAdd={handleAdd}
      />
    </>
  );
}
