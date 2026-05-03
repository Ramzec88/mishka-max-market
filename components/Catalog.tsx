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

    const product = products.find((p) => p.id === id);
    if (product) {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        ecommerce: {
          currencyCode: 'RUB',
          add: {
            products: [{
              id: product.id,
              name: product.title,
              price: product.price / 100,
              category: product.category ?? undefined,
              quantity: 1,
            }],
          },
        },
      });
    }
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

      {/* ── Баннер для международных покупателей ── */}
      {products.some(p => p.boosty_url || p.lava_url) && (
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px 28px' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
            background: '#F0F4FF', border: '1.5px solid #C7D7FF',
            borderRadius: 12, padding: '12px 18px',
          }}>
            <span style={{ fontSize: 20 }}>💳</span>
            <span style={{ fontSize: 14, color: '#3B4A7A', lineHeight: 1.5, flex: 1 }}>
              <strong>Карта Visa / Mastercard не из России?</strong> Выбирайте товары с кнопками{' '}
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, verticalAlign: 'middle' }}>
                <span style={{ width: 20, height: 20, borderRadius: '50%', background: '#F7422A', color: '#fff', fontSize: 9, fontWeight: 900, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>B</span>
                <span style={{ fontSize: 12, color: '#3B4A7A', fontWeight: 700 }}>Boosty</span>
              </span>{' '}или{' '}
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, verticalAlign: 'middle' }}>
                <span style={{ width: 20, height: 20, borderRadius: '50%', background: '#7B61FF', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M13.5 0.67C13.5 0.67 14.24 3.32 14.24 5.47C14.24 7.53 12.89 9.2 10.83 9.2C8.76 9.2 7.2 7.53 7.2 5.47L7.23 5.1C5.21 7.51 4 10.61 4 14C4 18.42 7.58 22 12 22C16.42 22 20 18.42 20 14C20 8.61 17.41 3.8 13.5 0.67ZM11.71 19C9.93 19 8.49 17.6 8.49 15.86C8.49 14.24 9.53 13.1 11.3 12.74C13.07 12.38 14.9 11.53 15.86 10.1C16.2 11.1 16.39 12.18 16.39 13.3C16.39 16.44 14.34 19 11.71 19Z"/>
                  </svg>
                </span>
                <span style={{ fontSize: 12, color: '#3B4A7A', fontWeight: 700 }}>Lava Top</span>
              </span>{' '}
              — и оплачивайте напрямую через них.
            </span>
          </div>
        </div>
      )}

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
