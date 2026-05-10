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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const productId = params.get('product');
    if (!productId) return;
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    setSheetProduct(product);
    if (params.get('add') === '1') {
      handleAdd(productId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products]);

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
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px 0' }}>
        <div style={{
          background: '#fff',
          borderRadius: 28,
          boxShadow: '0 4px 32px rgba(0,0,0,0.07)',
          padding: 'clamp(28px, 5vw, 52px)',
          display: 'flex',
          alignItems: 'center',
          gap: 'clamp(24px, 4vw, 56px)',
          overflow: 'hidden',
          position: 'relative',
        }}>
          {/* Left */}
          <div style={{ flex: '1 1 0', minWidth: 0 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: '#FFF7ED', border: '1.5px solid #FFD4B8',
              borderRadius: 100, padding: '6px 14px', marginBottom: 20,
            }}>
              <span style={{ fontSize: 14 }}>🧸</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#C2410C' }}>Для заботливых мам и креативных педагогов</span>
            </div>
            <h1 style={{
              fontSize: 'clamp(28px, 4vw, 52px)',
              fontWeight: 900,
              lineHeight: 1.1,
              letterSpacing: '-0.03em',
              color: '#0F0F1A',
              margin: '0 0 16px',
            }}>
              Готовые решения для<br />увлекательных занятий<br />и ярких{' '}
              <span style={{ background: 'linear-gradient(90deg, #FF7A3D, #FF4D6D)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                праздников
              </span>
            </h1>
            <p style={{ fontSize: 16, color: '#555', lineHeight: 1.6, margin: '0 0 28px', maxWidth: 420 }}>
              Сценарии, песни и развивающие материалы, которые экономят ваше время
              и делают каждый праздник особенным. Доставка на email сразу после оплаты.
            </p>
            <button
              onClick={() => document.getElementById('catalog-section')?.scrollIntoView({ behavior: 'smooth' })}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: '#0F0F1A', color: '#fff',
                border: 'none', borderRadius: 100,
                padding: '14px 28px', fontSize: 15, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit',
                boxShadow: '0 4px 16px rgba(15,15,26,0.25)',
                transition: 'transform 0.15s, box-shadow 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 20px rgba(15,15,26,0.3)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'none'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 16px rgba(15,15,26,0.25)'; }}
            >
              Открыть каталог
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </button>
          </div>

          {/* Right — mascot */}
          <div style={{ flexShrink: 0, width: 'clamp(180px, 28vw, 320px)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {/* Blob */}
            <div style={{
              width: 'clamp(160px, 24vw, 280px)',
              height: 'clamp(160px, 24vw, 280px)',
              borderRadius: '60% 40% 55% 45% / 50% 60% 40% 50%',
              background: 'linear-gradient(135deg, #F5EFE6, #EDE0D4)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              position: 'relative',
              boxShadow: '0 8px 40px rgba(180,130,90,0.18)',
            }}>
              <span style={{ fontSize: 'clamp(52px, 8vw, 88px)', lineHeight: 1 }}>🐻</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#6B4C2A', marginTop: 6 }}>3D Макс</span>
            </div>

            {/* Floating music card */}
            <div style={{
              position: 'absolute', top: '4%', right: '0%',
              background: '#fff', borderRadius: 14,
              boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
              padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
            </div>

            {/* Floating doc card */}
            <div style={{
              position: 'absolute', bottom: '6%', left: '0%',
              background: '#fff', borderRadius: 14,
              boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
              padding: '8px 12px',
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FF7A3D" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            </div>
          </div>
        </div>
      </section>

      {/* ── Showcase (tiles) ── */}
      {showcaseProducts.length > 0 && (
        <section style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px 44px' }}>
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
        id="catalog-section"
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '32px 24px 14px',
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setActiveCategory(f.value)}
            style={{
              background: activeCategory === f.value ? '#0F0F1A' : '#fff',
              border: `1.5px solid ${activeCategory === f.value ? '#0F0F1A' : 'var(--border)'}`,
              color: activeCategory === f.value ? '#fff' : 'var(--ink-soft)',
              padding: '9px 18px',
              borderRadius: 100,
              fontWeight: 700,
              fontSize: 14,
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.15s',
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
