'use client';

import { useState, useEffect, useRef } from 'react';
import { ProductDisplay, Category } from '@/types/product';
import { getCart, addToCart } from '@/lib/cart';
import { playDemoUrl } from '@/lib/demo-audio';
import ProductCard from './ProductCard';
import ProductRow from './ProductRow';
import ProductSheet from './ProductSheet';
import CartButton from './CartButton';
import HeroCarousel from './HeroCarousel';
import CartDrawer from './CartDrawer';
import StickyPlayer from './StickyPlayer';
import CartToast from './CartToast';
import ReviewsFeed from './ReviewsFeed';

const SECTIONS: { category: Category; label: string; icon: string }[] = [
  { category: 'songs', label: 'Песни', icon: '🎵' },
  { category: 'scenarios', label: 'Сценарии', icon: '🎭' },
  { category: 'materials', label: 'Материалы', icon: '📚' },
  { category: 'bundles', label: 'Комплекты', icon: '🎁' },
];

interface LatestReview {
  id: string;
  name: string | null;
  rating: number;
  body: string | null;
  created_at: string;
  product_id: string;
  product_title: string;
}

interface CatalogProps {
  products: ProductDisplay[];
  latestReviews?: LatestReview[];
}

export default function Catalog({ products, latestReviews }: CatalogProps) {
  const [activeSection, setActiveSection] = useState<'all' | Category>('all');
  const [search, setSearch] = useState(() =>
    typeof window !== 'undefined' ? ((window as any).__catalogSearch ?? '') : ''
  );
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [cartIds, setCartIds] = useState<string[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sheetProduct, setSheetProduct] = useState<ProductDisplay | null>(null);
  const [playingProduct, setPlayingProduct] = useState<ProductDisplay | null>(null);
  const [toast, setToast] = useState<{ visible: boolean; productTitle: string; cartCount: number; cartTotal: number }>({
    visible: false, productTitle: '', cartCount: 0, cartTotal: 0,
  });
  const showcaseRef = useRef<HTMLDivElement>(null);

  function handlePlay(product: ProductDisplay) {
    if (product.demo_url) playDemoUrl(product.demo_url);
    setPlayingProduct(product);
  }

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
    const handler = (e: Event) => setSearch((e as CustomEvent<string>).detail);
    window.addEventListener('catalog-search', handler as EventListener);
    return () => window.removeEventListener('catalog-search', handler as EventListener);
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

  useEffect(() => {
    const el = showcaseRef.current;
    if (!el) return;
    const t1 = setTimeout(() => el.scrollTo({ left: 100, behavior: 'smooth' }), 1000);
    const t2 = setTimeout(() => el.scrollTo({ left: 0, behavior: 'smooth' }), 1700);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  function handleAdd(id: string) {
    const updated = addToCart(id);
    setCartIds(updated);
    window.dispatchEvent(new Event('cart-updated'));

    const product = products.find((p) => p.id === id);
    if (product) {
      const total = updated.reduce((sum, pid) => {
        const p = products.find((x) => x.id === pid);
        return sum + (p?.price ?? 0);
      }, 0);
      setToast({ visible: true, productTitle: product.title, cartCount: updated.length, cartTotal: total });
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
    } else {
      setDrawerOpen(true);
    }
  }

  const showcaseProducts = products
    .filter((p) => p.badge !== null || p.category === 'bundles')
    .slice(0, 5);

  const q = search.trim().toLowerCase();
  const isSearching = q.length > 0;
  const inSectionsMode = !isSearching && activeSection === 'all';

  const filteredProducts = products
    .filter((p) => activeSection === 'all' || p.category === activeSection)
    .filter((p) => !q || p.title.toLowerCase().includes(q) || (p.description ?? '').toLowerCase().includes(q));

  const ViewToggle = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <button
        onClick={() => setViewMode('grid')}
        style={{
          background: viewMode === 'grid' ? 'var(--orange)' : '#fff',
          border: '1.5px solid ' + (viewMode === 'grid' ? 'var(--orange)' : 'var(--border)'),
          color: viewMode === 'grid' ? '#fff' : 'var(--ink-soft)',
          borderRadius: 8,
          padding: '6px 10px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          transition: 'all 0.15s',
        }}
        title="Сетка"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <rect x="3" y="3" width="7" height="7" rx="1"/>
          <rect x="14" y="3" width="7" height="7" rx="1"/>
          <rect x="3" y="14" width="7" height="7" rx="1"/>
          <rect x="14" y="14" width="7" height="7" rx="1"/>
        </svg>
      </button>
      <button
        onClick={() => setViewMode('list')}
        style={{
          background: viewMode === 'list' ? 'var(--orange)' : '#fff',
          border: '1.5px solid ' + (viewMode === 'list' ? 'var(--orange)' : 'var(--border)'),
          color: viewMode === 'list' ? '#fff' : 'var(--ink-soft)',
          borderRadius: 8,
          padding: '6px 10px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          transition: 'all 0.15s',
        }}
        title="Список"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <rect x="3" y="4" width="18" height="3" rx="1"/>
          <rect x="3" y="10.5" width="18" height="3" rx="1"/>
          <rect x="3" y="17" width="18" height="3" rx="1"/>
        </svg>
      </button>
    </div>
  );

  return (
    <>
      <style>{`
        .section-grid { grid-template-columns: repeat(4, 1fr); }
        @media (max-width: 900px) { .section-grid { grid-template-columns: repeat(3, 1fr); } }
        @media (max-width: 580px) { .section-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 600px) {
          .hero-inner { flex-direction: column !important; }
          .hero-mascot { display: none !important; }
          .carousel-arrow { display: none !important; }
        }
      `}</style>

      <div style={{ position: 'fixed', top: 16, right: 24, zIndex: 49, display: 'none' }}>
        <CartButton onClick={() => setDrawerOpen(true)} />
      </div>

      {/* Hero Carousel */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px 0' }}>
        <HeroCarousel
          intervalMs={5000}
          slides={[
            {
              key: 'main',
              content: (
                <div className="hero-inner" style={{
                  background: '#fff',
                  borderRadius: 28,
                  boxShadow: '0 4px 32px rgba(0,0,0,0.07)',
                  padding: 'clamp(28px, 5vw, 52px)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'clamp(24px, 4vw, 56px)',
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
                      color: 'var(--ink)',
                      margin: '0 0 16px',
                    }}>
                      Готовые решения для<br />
                      <span style={{ background: 'linear-gradient(90deg, #FF7A3D, #FF4D6D)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        увлекательных занятий
                      </span>
                      <br />и ярких праздников
                    </h1>
                    <p style={{ fontSize: 16, color: 'var(--ink-soft)', lineHeight: 1.6, margin: '0 0 28px', maxWidth: 420 }}>
                      Авторские игры, песни и сценарии, которые сэкономят вам время
                      и подарят детям радость. Мгновенная доставка на email после оплаты.
                    </p>
                    <button
                      onClick={() => document.getElementById('showcase-section')?.scrollIntoView({ behavior: 'smooth' })}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 8,
                        background: 'var(--orange)', color: '#fff',
                        border: 'none', borderRadius: 100,
                        padding: '14px 28px', fontSize: 15, fontWeight: 700,
                        cursor: 'pointer', fontFamily: 'inherit',
                        boxShadow: '0 4px 16px rgba(255,122,61,0.35)',
                        transition: 'transform 0.15s, box-shadow 0.15s',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 20px rgba(255,122,61,0.5)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'none'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 16px rgba(255,122,61,0.35)'; }}
                    >
                      Открыть каталог
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    </button>
                  </div>
                  {/* Right — mascot */}
                  <div className="hero-mascot" style={{ flexShrink: 0, width: 'clamp(260px, 36vw, 440px)', position: 'relative' }}>
                    <div style={{
                      position: 'absolute',
                      top: '50%', left: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: '55%', height: '55%',
                      borderRadius: '60% 40% 55% 45% / 50% 60% 40% 50%',
                      background: 'linear-gradient(135deg, #F5EFE6, #EDE0D4)',
                      boxShadow: '0 8px 40px rgba(180,130,90,0.18)',
                    }} />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/3d_maks.png" alt="3D Макс" style={{
                      display: 'block', width: '100%', height: 'auto',
                      objectFit: 'contain', position: 'relative', zIndex: 1,
                    }} />
                  </div>
                </div>
              ),
            },
            {
              key: 'azbuka',
              content: (
                <a
                  href="/?product=azbuka-s-mishkoy-maksom-polnyy-kurs-izucheniya-bukv-8-seriy"
                  style={{ display: 'block', position: 'absolute', inset: 0, borderRadius: 28, overflow: 'hidden', background: '#87CEEB' }}
                >
                  <picture style={{ position: 'absolute', inset: 0, display: 'block' }}>
                    <source media="(max-width: 600px)" srcSet="/hero-azbuka-mobile.png?v=3" />
                    <source media="(min-width: 601px)" srcSet="/hero-azbuka.png?v=3" />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/hero-azbuka.png?v=3"
                      alt="Азбука Мишки Макса"
                      style={{
                        position: 'absolute',
                        inset: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        objectPosition: 'center',
                        display: 'block',
                      }}
                    />
                  </picture>
                </a>
              ),
            },
          ]}
        />
      </section>

      {/* ── Showcase (tiles) ── */}
      {showcaseProducts.length > 0 && (
        <section id="showcase-section" style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px 44px' }}>
          <h2 style={{ fontSize: 17, fontWeight: 800, color: 'var(--ink)', marginBottom: 16, letterSpacing: '-0.01em' }}>
            Популярное
          </h2>
          <div
            ref={showcaseRef}
            style={{
              display: 'flex',
              gap: 16,
              overflowX: 'auto',
              scrollSnapType: 'x mandatory',
              WebkitOverflowScrolling: 'touch',
              paddingBottom: 4,
              scrollbarWidth: 'none',
              WebkitMaskImage: 'linear-gradient(to right, black 75%, transparent 100%)',
              maskImage: 'linear-gradient(to right, black 75%, transparent 100%)',
            }}
          >
            {showcaseProducts.map((product) => (
              <div key={product.id} style={{ scrollSnapAlign: 'start', flexShrink: 0, width: 'clamp(220px, 22vw, 260px)' }}>
                <ProductCard
                  product={product}
                  inCart={cartIds.includes(product.id)}
                  onAdd={handleAdd}
                  onSelect={setSheetProduct}
                  onPlay={handlePlay}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Catalog sections ── */}
      <div id="catalog-section" style={{ maxWidth: 1200, margin: '0 auto', padding: '8px 24px 80px' }}>

        {inSectionsMode ? (
          /* Sections view */
          <>
            {SECTIONS.map((section) => {
              const categoryProducts = products.filter((p) => p.category === section.category);
              if (categoryProducts.length === 0) return null;
              return (
                <section key={section.category} style={{ marginBottom: 40 }}>
                  {/* Section header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
                      <span>{section.icon}</span> {section.label}
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-soft)', marginLeft: 4 }}>
                        {categoryProducts.length}
                      </span>
                    </h2>
                    <ViewToggle />
                  </div>

                  {/* Products */}
                  {viewMode === 'grid' ? (
                    <div className="section-grid" style={{ display: 'grid', gap: 16 }}>
                      {categoryProducts.slice(0, 4).map((p) => (
                        <ProductCard
                          key={p.id}
                          product={p}
                          inCart={cartIds.includes(p.id)}
                          onAdd={handleAdd}
                          onSelect={setSheetProduct}
                          onPlay={handlePlay}
                        />
                      ))}
                      {categoryProducts.length > 4 && (
                        <div
                          onClick={() => setActiveSection(section.category)}
                          style={{
                            cursor: 'pointer',
                            background: 'var(--orange-light)',
                            borderRadius: 16,
                            border: '2px dashed var(--orange)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 10,
                            padding: 24,
                          }}
                        >
                          <span style={{ fontSize: 38, fontWeight: 900, color: 'var(--orange)', lineHeight: 1 }}>
                            +{categoryProducts.length - 4}
                          </span>
                          <span style={{ fontSize: 13, color: 'var(--ink-soft)', fontWeight: 600 }}>
                            ещё товаров
                          </span>
                          <button
                            onClick={(e) => { e.stopPropagation(); setActiveSection(section.category); }}
                            style={{
                              marginTop: 4,
                              background: 'var(--orange)',
                              color: '#fff',
                              border: 'none',
                              borderRadius: 100,
                              padding: '10px 22px',
                              fontWeight: 700,
                              fontSize: 14,
                              cursor: 'pointer',
                              fontFamily: 'inherit',
                              boxShadow: '0 4px 12px rgba(255,122,61,0.3)',
                            }}
                          >
                            Показать все
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ background: '#fff', borderRadius: 16, border: '1.5px solid var(--border)', overflow: 'hidden' }}>
                      {categoryProducts.slice(0, 4).map((p, idx) => (
                        <div key={p.id} style={{ borderBottom: idx < Math.min(categoryProducts.length, 4) - 1 ? '1px solid var(--border)' : 'none' }}>
                          <ProductRow
                            product={p}
                            inCart={cartIds.includes(p.id)}
                            onAdd={handleAdd}
                            onSelect={setSheetProduct}
                            onPlay={handlePlay}
                          />
                        </div>
                      ))}
                      {categoryProducts.length > 4 && (
                        <div style={{ borderTop: '1px solid var(--border)', padding: '14px 16px', display: 'flex', justifyContent: 'center' }}>
                          <button
                            onClick={() => setActiveSection(section.category)}
                            style={{
                              background: 'var(--orange)', color: '#fff',
                              border: 'none', borderRadius: 100,
                              padding: '10px 24px', fontWeight: 700, fontSize: 14,
                              cursor: 'pointer', fontFamily: 'inherit',
                              boxShadow: '0 4px 12px rgba(255,122,61,0.3)',
                            }}
                          >
                            Ещё +{categoryProducts.length - 4} товара
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </section>
              );
            })}
          </>
        ) : (
          /* Category / Search view */
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              {activeSection !== 'all' && (
                <button
                  onClick={() => setActiveSection('all')}
                  style={{
                    background: '#fff',
                    border: '1.5px solid var(--border)',
                    borderRadius: 100,
                    padding: '8px 16px',
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    color: 'var(--ink-soft)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  ← Назад
                </button>
              )}
              <h2 style={{ fontWeight: 800, fontSize: 18, color: 'var(--ink)', flex: 1, margin: 0 }}>
                {isSearching
                  ? `Поиск: «${search}»`
                  : SECTIONS.find((s) => s.category === activeSection)?.label}
                <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink-soft)', marginLeft: 8 }}>
                  {filteredProducts.length}
                </span>
              </h2>
              <ViewToggle />
            </div>

            {filteredProducts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--ink-soft)' }}>
                Ничего не найдено
              </div>
            ) : viewMode === 'grid' ? (
              <div className="section-grid" style={{ display: 'grid', gap: 16 }}>
                {filteredProducts.map((p) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    inCart={cartIds.includes(p.id)}
                    onAdd={handleAdd}
                    onSelect={setSheetProduct}
                    onPlay={handlePlay}
                  />
                ))}
              </div>
            ) : (
              <div style={{ background: '#fff', borderRadius: 16, border: '1.5px solid var(--border)', overflow: 'hidden' }}>
                {filteredProducts.map((p, idx) => (
                  <div key={p.id} style={{ borderBottom: idx < filteredProducts.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <ProductRow
                      product={p}
                      inCart={cartIds.includes(p.id)}
                      onAdd={handleAdd}
                      onSelect={setSheetProduct}
                      onPlay={handlePlay}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Reviews feed — before footer */}
      {latestReviews && latestReviews.length > 0 && (
        <ReviewsFeed reviews={latestReviews} />
      )}

      <CartDrawer products={products} isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />

      <ProductSheet
        product={sheetProduct}
        inCart={sheetProduct ? cartIds.includes(sheetProduct.id) : false}
        onAdd={handleAdd}
        onClose={() => setSheetProduct(null)}
        onPlay={handlePlay}
      />

      <StickyPlayer
        product={playingProduct}
        inCart={playingProduct ? cartIds.includes(playingProduct.id) : false}
        onClose={() => setPlayingProduct(null)}
        onAdd={handleAdd}
      />

      <CartToast
        visible={toast.visible}
        productTitle={toast.productTitle}
        cartCount={toast.cartCount}
        cartTotal={toast.cartTotal}
        onGoToCart={() => setDrawerOpen(true)}
        onHide={() => setToast((t) => ({ ...t, visible: false }))}
      />
    </>
  );
}
