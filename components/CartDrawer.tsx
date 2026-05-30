'use client';

import { useState, useEffect } from 'react';
import { ProductDisplay } from '@/types/product';
import { getCart, addToCart, removeFromCart, purgeStaleCart } from '@/lib/cart';
import { calcDiscount } from '@/lib/discount';
import CheckoutForm from './CheckoutForm';
import CartProgressBar from './CartProgressBar';
import YooKassaWidget from './YooKassaWidget';

interface CartDrawerProps {
  products: ProductDisplay[];
  isOpen: boolean;
  onClose: () => void;
}

export default function CartDrawer({ products, isOpen, onClose }: CartDrawerProps) {
  const [cartIds, setCartIds] = useState<string[]>([]);
  const [checkoutState, setCheckoutState] = useState<{
    confirmationToken: string;
    orderId: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const validIds = products.map((p) => p.id);
    const before = getCart();
    const cleaned = purgeStaleCart(validIds);
    setCartIds(cleaned);
    if (cleaned.length !== before.length) {
      window.dispatchEvent(new Event('cart-updated'));
    }

    const sync = () => setCartIds(getCart());
    window.addEventListener('cart-updated', sync);
    return () => window.removeEventListener('cart-updated', sync);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isOpen) {
      setCartIds(getCart());
      setCheckoutState(null);
      setError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleOpenCart = () => {
      setCartIds(getCart());
      setCheckoutState(null);
      setError(null);
      // CartDrawer doesn't control isOpen directly here — parent handles it via event
    };
    window.addEventListener('open-cart', handleOpenCart);
    return () => window.removeEventListener('open-cart', handleOpenCart);
  }, []);

  function handleRemove(id: string) {
    const updated = removeFromCart(id);
    setCartIds(updated);
    window.dispatchEvent(new Event('cart-updated'));
  }

  function handleCheckoutSuccess(confirmationToken: string, orderId: string) {
    setCheckoutState({ confirmationToken, orderId });
    setError(null);
  }

  const cartItems = cartIds.map((id) => products.find((p) => p.id === id)).filter(Boolean) as ProductDisplay[];
  const total = cartItems.reduce((sum, p) => sum + Math.round(p.price / 100), 0);

  const cartItemsForDiscount = cartItems.map(p => ({ id: p.id, price: Math.round(p.price / 100), category: p.category }));
  const discountInfo = calcDiscount(cartItemsForDiscount);

  function handleAddToCart(id: string) {
    const updated = addToCart(id);
    setCartIds(updated);
    window.dispatchEvent(new Event('cart-updated'));
  }

  return (
    <>
      {/* Overlay — отключаем клик пока открыт виджет оплаты */}
      <div
        onClick={checkoutState ? undefined : onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(31, 27, 22, 0.4)',
          zIndex: 100,
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'all' : 'none',
          transition: 'opacity 0.25s',
          cursor: checkoutState ? 'default' : 'pointer',
        }}
      />

      {/* Drawer */}
      <aside
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          width: '100%',
          maxWidth: 440,
          height: '100vh',
          background: 'var(--cream)',
          zIndex: 101,
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#fff',
          }}
        >
          <div style={{ fontSize: 20, fontWeight: 900 }}>
            {checkoutState ? 'Оплата' : 'Ваш заказ'}
          </div>
          {checkoutState ? (
            <div style={{ fontSize: 12, color: 'var(--ink-soft)', maxWidth: 180, textAlign: 'right', lineHeight: 1.4 }}>
              Завершите оплату в форме ниже
            </div>
          ) : (
            <button
              onClick={onClose}
              style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'var(--border)', display: 'grid',
                placeItems: 'center', fontSize: 18, fontWeight: 700,
                border: 'none', cursor: 'pointer',
                transition: 'all 0.2s', fontFamily: 'inherit',
              }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Body — единая скроллируемая зона */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {checkoutState ? (
            <YooKassaWidget
              confirmationToken={checkoutState.confirmationToken}
              orderId={checkoutState.orderId}
            />
          ) : cartItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--ink-soft)' }}>
              <div style={{ fontSize: 64, marginBottom: 16 }}>🧸</div>
              <p>Корзина пуста</p>
              <p style={{ marginTop: 8, fontSize: 14 }}>Выберите материалы из каталога</p>
            </div>
          ) : (
            <>
              {/* Товары в корзине */}
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                В корзине
              </div>
              {cartItems.map((product) => {
                const priceRub = Math.round(product.price / 100);
                const discountedPrice = discountInfo && discountInfo.discountRate > 0
                  ? Math.round(priceRub * (1 - discountInfo.discountRate))
                  : null;
                return (
                  <div
                    key={product.id}
                    style={{
                      display: 'flex',
                      gap: 14,
                      padding: '14px 0',
                      borderBottom: '1px solid var(--border)',
                    }}
                  >
                    <div
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 10,
                        flexShrink: 0,
                        overflow: 'hidden',
                        background: 'var(--orange-light)',
                        display: 'grid',
                        placeItems: 'center',
                        fontSize: 26,
                      }}
                    >
                      {product.cover_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={product.cover_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        product.cover_emoji || '📦'
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 3, lineHeight: 1.3 }}>{product.title}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {discountedPrice !== null ? (
                          <>
                            <span style={{ fontWeight: 800, color: '#2E7D32', fontSize: 14 }}>{discountedPrice} ₽</span>
                            <span style={{ fontSize: 12, color: '#aaa', textDecoration: 'line-through' }}>{priceRub} ₽</span>
                          </>
                        ) : (
                          <span style={{ fontWeight: 800, color: 'var(--orange)', fontSize: 14 }}>{priceRub} ₽</span>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemove(product.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--ink-soft)',
                          fontSize: 12,
                          textDecoration: 'underline',
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                          padding: 0,
                          marginTop: 3,
                        }}
                      >
                        удалить
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Прогресс-бар скидок */}
              {discountInfo && (
                <div style={{ marginTop: 16 }}>
                  <CartProgressBar
                    discountInfo={discountInfo}
                    allProducts={products}
                    cartItemIds={cartIds}
                    onAddToCart={handleAddToCart}
                  />
                </div>
              )}

              {/* Форма оформления */}
              <div style={{ marginTop: 8 }}>
                {error && (
                  <div
                    style={{
                      background: '#FFF1F0',
                      border: '1px solid #FFB3AE',
                      borderRadius: 12,
                      padding: '12px 16px',
                      marginBottom: 12,
                      fontSize: 14,
                      color: '#C0392B',
                    }}
                  >
                    {error}
                  </div>
                )}
                <CheckoutForm
                  total={total}
                  items={cartIds}
                  cartItemsForDiscount={cartItemsForDiscount}
                  onSuccess={handleCheckoutSuccess}
                  onError={setError}
                />
              </div>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
