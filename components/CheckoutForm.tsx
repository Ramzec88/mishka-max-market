'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { clearCart } from '@/lib/cart';
import { calcDiscount } from '@/lib/discount';

interface CheckoutFormProps {
  total: number;
  items: string[];
  cartItemsForDiscount: { id: string; price: number; category: string }[];
  onSuccess: (confirmationToken: string, orderId: string) => void;
  onError: (msg: string) => void;
  onBumpedItemsChange?: (items: { id: string; price: number; category: string }[]) => void;
  onBumpRecsLoaded?: (ids: string[]) => void;
}

interface PromoData {
  code: string;
  discount_percent: number;
  discount_amount: number; // kopecks
  applicable_to_all: boolean;
}

interface BumpProduct {
  id: string;
  title: string;
  price: number; // kopecks
  bump_price: number | null; // kopecks
  category: string;
  cover_emoji: string | null;
  cover_variant: string;
  cover_url: string | null;
  format: string | null;
}

const RUB_PER_USD = 76;
const MIN_USD = 5;
const MIN_RUB = RUB_PER_USD * MIN_USD; // 380 ₽

type PaymentMethod = 'yookassa' | 'lava';

export default function CheckoutForm({ total, items, cartItemsForDiscount, onSuccess, onError, onBumpedItemsChange, onBumpRecsLoaded }: CheckoutFormProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('yookassa');
  const [formError, setFormError] = useState('');

  const [promoInput, setPromoInput] = useState('');
  const [promoChecking, setPromoChecking] = useState(false);
  const [promoData, setPromoData] = useState<PromoData | null>(null);
  const [promoError, setPromoError] = useState('');

  const [bumpRecs, setBumpRecs] = useState<BumpProduct[]>([]);
  const [bumpedItems, setBumpedItems] = useState<string[]>([]);
  const [showMinModal, setShowMinModal] = useState(false);
  const [bypassMinCheck, setBypassMinCheck] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (items.length === 0) return;
    fetch(`/api/cart-recommendations?items=${encodeURIComponent(items.join(','))}`)
      .then((r) => r.ok ? r.json() : [])
      .then((data) => {
        if (!Array.isArray(data)) return;
        setBumpRecs(data);
        onBumpRecsLoaded?.(data.map((r: BumpProduct) => r.id));
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.join(',')]);

  // Notify CartDrawer about bumped items so it can update the progress bar
  useEffect(() => {
    if (!onBumpedItemsChange) return;
    const bumped = bumpedItems.map(id => {
      const rec = bumpRecs.find(r => r.id === id);
      if (!rec) return null;
      const price = rec.bump_price ?? Math.round(rec.price * 0.85);
      return { id: rec.id, price: Math.round(price / 100), category: rec.category ?? 'songs' };
    }).filter((x): x is { id: string; price: number; category: string } => x !== null);
    onBumpedItemsChange(bumped);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bumpedItems.join(','), bumpRecs.map(r => r.id).join(',')]);

  const effectiveBumpPrice = (rec: BumpProduct) =>
    rec.bump_price ?? Math.round(rec.price * 0.85);

  const visibleBumpRecs = bumpRecs.filter((r) => !bumpedItems.includes(r.id));
  const bumpExtraKopecks = bumpedItems.reduce((sum, id) => {
    const rec = bumpRecs.find((r) => r.id === id);
    return sum + (rec ? effectiveBumpPrice(rec) : 0);
  }, 0);
  const effectiveTotal = total + Math.round(bumpExtraKopecks / 100);

  // Volume discount from progress-bar tiers (recomputed when bumps change)
  const allItemsForDiscount = [
    ...cartItemsForDiscount,
    ...bumpedItems.map(id => {
      const rec = bumpRecs.find(r => r.id === id);
      return rec ? { id: rec.id, price: Math.round(effectiveBumpPrice(rec) / 100), category: rec.category ?? 'songs' } : null;
    }).filter((x): x is { id: string; price: number; category: string } => x !== null),
  ];
  // Anchor from main cart items only — bumps contribute to total but don't raise the tier
  const volumeInfo = calcDiscount(allItemsForDiscount, cartItemsForDiscount);
  const volumeDiscountAmount = volumeInfo?.discountAmount ?? 0;
  const volumeDiscountRate = volumeInfo?.discountRate ?? 0;

  const discountAmount = promoData ? Math.round(promoData.discount_amount / 100) : 0;
  const finalTotal = effectiveTotal - volumeDiscountAmount - discountAmount;

  async function handleApplyPromo() {
    if (!promoInput.trim()) return;
    setPromoChecking(true);
    setPromoError('');
    setPromoData(null);
    try {
      const res = await fetch('/api/validate-promo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: promoInput.trim(), items }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPromoError(data.error || 'Промокод не подходит');
      } else {
        setPromoData(data);
      }
    } catch {
      setPromoError('Ошибка проверки промокода');
    } finally {
      setPromoChecking(false);
    }
  }

  function handleRemovePromo() {
    setPromoData(null);
    setPromoInput('');
    setPromoError('');
  }

  function handleError(msg: string) {
    setFormError(msg);
    onError(msg);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    const trimmedEmail = email.trim().toLowerCase();
    const emailOk =
      /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(trimmedEmail) &&
      !/[^\x00-\x7F]/.test(trimmedEmail);
    if (!emailOk) {
      handleError('Укажите email латиницей (например name@gmail.com) — на него придут файлы');
      return;
    }
    if (paymentMethod === 'lava' && finalTotal < MIN_RUB && !bypassMinCheck) {
      setShowMinModal(true);
      return;
    }
    setLoading(true);
    try {
      if (paymentMethod === 'lava') {
        const paymentProvider = 'UNLIMINT';
        const res = await fetch('/api/create-lava-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: [...items, ...bumpedItems], email: trimmedEmail, promoCode: promoData?.code ?? null, bumpedItems, paymentProvider }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Ошибка при создании платежа');
        }
        const { payment_url, order_id } = await res.json();
        if (order_id) {
          const payload = JSON.stringify({ id: order_id, ts: Date.now() });
          try { sessionStorage.setItem('lava_pending_order', order_id); } catch { /* ignore */ }
          try { localStorage.setItem('lava_payment_session', payload); } catch { /* ignore */ }
        }
        // Очищаем корзину до редиректа — чтобы счётчик сбросился сразу
        clearCart();
        window.dispatchEvent(new Event('cart-updated'));
        window.location.href = payment_url;
      } else {
        const res = await fetch('/api/create-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: [...items, ...bumpedItems], email: trimmedEmail, promoCode: promoData?.code ?? null, bumpedItems }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Ошибка при создании платежа');
        }
        const { confirmation_token, order_id } = await res.json();
        onSuccess(confirmation_token, order_id);
      }
    } catch (err) {
      handleError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
      setBypassMinCheck(false);
    }
  }

  const usdAmount = Math.max(MIN_USD, Math.round(finalTotal / RUB_PER_USD));
  const shortfall = MIN_RUB - finalTotal;

  return (
    <>
      {/* Модальное окно: минимальный платёж $5 */}
      {showMinModal && (
        <div
          onClick={() => setShowMinModal(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: 20, padding: 28,
              maxWidth: 360, width: '100%',
              boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
            }}
          >
            <div style={{ fontSize: 40, textAlign: 'center', marginBottom: 12 }}>💳</div>
            <h3 style={{ fontSize: 18, fontWeight: 900, textAlign: 'center', marginBottom: 8 }}>
              Минимальный платёж — $5
            </h3>
            <p style={{ fontSize: 14, color: 'var(--ink-soft)', textAlign: 'center', lineHeight: 1.6, marginBottom: 8 }}>
              Иностранные карты принимают платежи от <strong>$5</strong>.
              Ваша сумма — <strong>${Math.round(finalTotal / RUB_PER_USD)} ({finalTotal} ₽)</strong>.
            </p>
            <p style={{ fontSize: 13, color: 'var(--ink-soft)', textAlign: 'center', lineHeight: 1.5, marginBottom: 20 }}>
              Добавьте товаров ещё на <strong style={{ color: 'var(--orange)' }}>{shortfall} ₽</strong> — или оплатите через российскую карту.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                type="button"
                onClick={() => setShowMinModal(false)}
                style={{
                  background: 'var(--orange)', color: '#fff',
                  border: 'none', borderRadius: 100,
                  padding: '13px 20px', fontWeight: 800, fontSize: 15,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Добавить товары
              </button>
              <button
                type="button"
                onClick={() => { setShowMinModal(false); setBypassMinCheck(true); setTimeout(() => { formRef.current?.requestSubmit(); }, 0); }}
                style={{
                  background: '#f3f4f6', color: '#555',
                  border: 'none', borderRadius: 100,
                  padding: '13px 20px', fontWeight: 700, fontSize: 14,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Всё равно оплатить
              </button>
            </div>
          </div>
        </div>
      )}

    <form ref={formRef} onSubmit={handleSubmit}>
      {/* Способ оплаты */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-soft)', marginBottom: 8 }}>
          Способ оплаты
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {([
            { id: 'yookassa', icon: '🏦', label: 'Российская карта', sub: 'МИР, Visa, MC' },
            { id: 'lava',     icon: '💳', label: 'Иностранная карта', sub: 'Visa, Mastercard · USD' },
          ] as const).map(({ id, icon, label, sub }) => (
            <button
              key={id}
              type="button"
              onClick={() => setPaymentMethod(id)}
              style={{
                padding: '10px 6px',
                borderRadius: 12,
                border: `2px solid ${paymentMethod === id ? 'var(--orange)' : 'var(--border)'}`,
                background: paymentMethod === id ? 'var(--orange-light)' : '#fff',
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.15s',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 18, marginBottom: 2 }}>{icon}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: paymentMethod === id ? 'var(--orange)' : 'var(--ink)', lineHeight: 1.2 }}>
                {label}
              </div>
              <div style={{ fontSize: 10, color: 'var(--ink-soft)', marginTop: 2 }}>{sub}</div>
            </button>
          ))}
        </div>
        {paymentMethod === 'lava' && finalTotal < MIN_RUB && (
          <div style={{
            marginTop: 8, padding: '8px 12px',
            background: '#FFF7ED', border: '1px solid #FED7AA',
            borderRadius: 10, fontSize: 12, color: '#92400E', lineHeight: 1.5,
          }}>
            ⚠️ Минимум $5 — добавьте товаров ещё на <strong>{MIN_RUB - finalTotal} ₽</strong>
          </div>
        )}
      </div>

      {/* Email */}
      <label
        htmlFor="emailInput"
        style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--ink-soft)', marginBottom: 6 }}
      >
        Email для получения файлов
      </label>
      <input
        id="emailInput"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="your@email.ru"
        required
        style={{
          width: '100%', padding: '14px 16px',
          border: '1.5px solid var(--border)', borderRadius: 12,
          fontFamily: 'inherit', fontSize: 15, marginBottom: 12,
          outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box',
        }}
        onFocus={(e) => (e.target.style.borderColor = 'var(--orange)')}
        onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
      />

      {/* Промокод */}
      {!promoData ? (
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={promoInput}
              onChange={(e) => { setPromoInput(e.target.value.toUpperCase()); setPromoError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleApplyPromo())}
              placeholder="Промокод"
              style={{
                flex: 1, padding: '10px 14px',
                border: `1.5px solid ${promoError ? '#fca5a5' : 'var(--border)'}`,
                borderRadius: 10, fontFamily: 'inherit', fontSize: 14,
                outline: 'none', boxSizing: 'border-box',
              }}
            />
            <button
              type="button"
              onClick={handleApplyPromo}
              disabled={promoChecking || !promoInput.trim()}
              style={{
                background: 'var(--orange-light)', color: 'var(--orange)',
                border: '1.5px solid #FFD4B8', borderRadius: 10,
                padding: '10px 14px', fontWeight: 700, fontSize: 13,
                cursor: promoChecking || !promoInput.trim() ? 'not-allowed' : 'pointer',
                whiteSpace: 'nowrap', fontFamily: 'inherit', flexShrink: 0,
                opacity: !promoInput.trim() ? 0.5 : 1,
              }}
            >
              {promoChecking ? '...' : 'Применить'}
            </button>
          </div>
          {promoError && (
            <div style={{ fontSize: 12, color: '#dc2626', marginTop: 5 }}>{promoError}</div>
          )}
        </div>
      ) : (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: '#f0fdf4', border: '1.5px solid #86efac',
          borderRadius: 10, padding: '10px 14px', marginBottom: 14,
        }}>
          <div>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#16a34a' }}>
              ✓ {promoData.code}
            </span>
            {promoData.discount_percent > 0 && (
              <span style={{ fontSize: 12, color: '#16a34a', marginLeft: 6 }}>
                — скидка {promoData.discount_percent}%
              </span>
            )}
            {!promoData.applicable_to_all && (
              <div style={{ fontSize: 11, color: '#15803d', marginTop: 2 }}>Скидка на выбранные товары</div>
            )}
          </div>
          <button
            type="button"
            onClick={handleRemovePromo}
            style={{ background: 'none', border: 'none', color: '#16a34a', cursor: 'pointer', fontSize: 18, fontFamily: 'inherit', padding: '0 4px' }}
          >
            ×
          </button>
        </div>
      )}

      {/* Order Bump */}
      {visibleBumpRecs.length > 0 && (
        <div style={{
          marginBottom: 14,
          border: '1.5px dashed #FFD4B8',
          borderRadius: 12,
          padding: '12px 14px',
          background: '#FFF8F3',
        }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--orange)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            🎁 Добавьте к заказу со скидкой
          </div>
          {visibleBumpRecs.map((rec) => {
            const showPrice = effectiveBumpPrice(rec);
            const hasBumpDiscount = showPrice < rec.price;
            return (
              <div key={rec.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 0',
                borderTop: '1px solid #FFE8D6',
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 8, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22, overflow: 'hidden',
                  background: rec.cover_variant === 'lavender' ? 'linear-gradient(135deg,#E8E0F5,#D4C7ED)'
                    : rec.cover_variant === 'green' ? 'linear-gradient(135deg,#E0F2E4,#C7E8CF)'
                    : rec.cover_variant === 'blue' ? 'linear-gradient(135deg,#E0EBF5,#C7DAED)'
                    : 'linear-gradient(135deg,#FFE4D1,#FFCBA8)',
                }}>
                  {rec.cover_url
                    ? <img src={rec.cover_url} alt={rec.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : (rec.cover_emoji ?? '🎵')}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a', lineHeight: 1.3 }}>{rec.title}</div>
                  <div style={{ fontSize: 12, marginTop: 2 }}>
                    {hasBumpDiscount && (
                      <span style={{ textDecoration: 'line-through', color: '#bbb', marginRight: 4 }}>
                        {Math.round(rec.price / 100)} ₽
                      </span>
                    )}
                    <span style={{ fontWeight: 800, color: hasBumpDiscount ? 'var(--orange)' : 'var(--ink)' }}>
                      {Math.round(showPrice / 100)} ₽
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setBumpedItems((prev) => [...prev, rec.id])}
                  style={{
                    background: 'var(--orange)', color: '#fff',
                    border: 'none', borderRadius: 100,
                    padding: '7px 14px', fontSize: 12, fontWeight: 700,
                    cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                    fontFamily: 'inherit',
                  }}
                >
                  + Добавить
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Добавленные bump-товары */}
      {bumpedItems.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          {bumpedItems.map((id) => {
            const rec = bumpRecs.find((r) => r.id === id);
            if (!rec) return null;
            const price = effectiveBumpPrice(rec);
            return (
              <div key={id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                fontSize: 13, color: '#16a34a', marginBottom: 4,
              }}>
                <span>✓ {rec.title}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 700 }}>+{Math.round(price / 100)} ₽</span>
                  <button
                    type="button"
                    onClick={() => setBumpedItems((prev) => prev.filter((x) => x !== id))}
                    style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: 16, padding: '0 2px', fontFamily: 'inherit' }}
                  >
                    ×
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Итого */}
      <div style={{ marginBottom: 14 }}>
        {(volumeDiscountAmount > 0 || (promoData && discountAmount > 0)) && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: 'var(--ink-soft)', marginBottom: 4 }}>
            <span>Сумма</span>
            <span>{effectiveTotal} ₽</span>
          </div>
        )}
        {volumeDiscountAmount > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#2E7D32', fontWeight: 700, marginBottom: 4 }}>
            <span>Скидка {Math.round(volumeDiscountRate * 100)}% 🎉</span>
            <span>−{volumeDiscountAmount} ₽</span>
          </div>
        )}
        {(promoData && discountAmount > 0) && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#16a34a', marginBottom: 4 }}>
            <span>Промокод {promoData.discount_percent}%</span>
            <span>−{discountAmount} ₽</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 18, fontWeight: 900 }}>
          <span>Итого:</span>
          <span style={{ color: volumeDiscountAmount > 0 ? '#2E7D32' : 'inherit' }}>{finalTotal} ₽</span>
        </div>
      </div>

      {formError && (
        <div style={{
          background: '#FFF1F0', border: '1px solid #FFB3AE',
          borderRadius: 10, padding: '10px 14px', marginBottom: 12,
          fontSize: 13, color: '#C0392B', lineHeight: 1.4,
        }}>
          {formError}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        style={{
          width: '100%', background: 'var(--orange)', color: '#fff',
          padding: 16, borderRadius: 100, fontSize: 16, fontWeight: 800,
          border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
          fontFamily: 'inherit', opacity: loading ? 0.6 : 1, transition: 'all 0.2s',
        }}
      >
        {loading
          ? (paymentMethod !== 'yookassa' ? 'Переходим к оплате...' : 'Создаём платёж...')
          : 'Перейти к оплате'}
      </button>
      <p style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 10, textAlign: 'center', lineHeight: 1.4 }}>
        Нажимая кнопку, вы принимаете условия{' '}
        <Link href="/offer" style={{ color: 'var(--orange)', textDecoration: 'underline' }}>оферты</Link>{' '}
        и соглашаетесь на обработку персоналэнных данных
      </p>
    </form>
    </>
  );
}
