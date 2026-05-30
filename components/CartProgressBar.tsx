'use client';

import { useEffect, useRef, useMemo } from 'react';
import type { DiscountInfo } from '@/lib/discount';
import type { ProductDisplay } from '@/types/product';

interface CartProgressBarProps {
  discountInfo: DiscountInfo;
  allProducts: ProductDisplay[];
  cartItemIds: string[];
  onAddToCart: (id: string) => void;
}

function launchConfetti() {
  if (typeof window === 'undefined') return;
  if (!document.getElementById('pb-confetti-style')) {
    const s = document.createElement('style');
    s.id = 'pb-confetti-style';
    s.textContent = '@keyframes pbfall{0%{transform:translateY(-10px) rotate(0deg);opacity:1}100%{transform:translateY(110vh) rotate(720deg);opacity:0}}';
    document.head.appendChild(s);
  }
  const wrap = document.createElement('div');
  wrap.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9999;overflow:hidden';
  const colors = ['#FF7A3D','#FFD700','#4CAF50','#2196F3','#9C27B0','#E91E63','#FF4081','#00BCD4'];
  for (let i = 0; i < 60; i++) {
    const p = document.createElement('div');
    const c = colors[i % colors.length];
    const x = (Math.random() * 100).toFixed(1);
    const delay = (Math.random() * 0.4).toFixed(2);
    const dur = (1.3 + Math.random() * 0.7).toFixed(2);
    const w = Math.round(6 + Math.random() * 6);
    p.style.cssText = `position:absolute;left:${x}%;top:-10px;width:${w}px;height:${Math.round(w * 0.55)}px;background:${c};border-radius:2px;animation:pbfall ${dur}s ${delay}s ease-in forwards`;
    wrap.appendChild(p);
  }
  document.body.appendChild(wrap);
  setTimeout(() => wrap.remove(), 2500);
}

function statusText(d: DiscountInfo): string {
  if (d.status === 'max') return 'Максимальная скидка −25% — поздравляем!';
  if (d.status === 'mid') {
    if (d.remaining < 50) return 'Один товар — и скидка −25%!';
    if (d.remaining < 100) return `Почти максимум! Осталось ${d.remaining} ₽ до скидки −25%`;
    return `Скидка −15% активирована! До −25% осталось ${d.remaining} ₽`;
  }
  if (d.remaining < 50) return 'Следующий товар откроет скидку −15%!';
  if (d.remaining < 100) return `Совсем чуть-чуть! Осталось ${d.remaining} ₽`;
  return `До скидки −15% осталось ${d.remaining} ₽`;
}

const THEME = {
  none: { bg: '#FFF8F0', bar: 'linear-gradient(90deg,#F4A044,#E8650A)', icon: '🎁', badgeBg: '#FF7A3D', badgeTxt: '#fff', badge: '−15%' },
  mid:  { bg: '#E8F5E9', bar: 'linear-gradient(90deg,#66BB6A,#2E7D32)',  icon: '✅', badgeBg: '#2E7D32', badgeTxt: '#fff', badge: '−15%' },
  max:  { bg: '#E8EAF6', bar: 'linear-gradient(90deg,#7986CB,#283593)',  icon: '🏆', badgeBg: '#283593', badgeTxt: '#fff', badge: '−25%' },
};

export default function CartProgressBar({ discountInfo: d, allProducts, cartItemIds, onAddToCart }: CartProgressBarProps) {
  const prevStatus = useRef<string>(d.status);
  const confettiFired = useRef(false);

  useEffect(() => {
    if (d.status === 'max' && prevStatus.current !== 'max' && !confettiFired.current) {
      const key = 'pb_confetti_fired';
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, '1');
        confettiFired.current = true;
        launchConfetti();
      }
    }
    prevStatus.current = d.status;
  }, [d.status]);

  const theme = THEME[d.status];

  // tier1 marker position as % of bar (0 to tier2)
  const marker1Pos = Math.min(96, (d.tier1 / d.tier2) * 100);
  const marker1Reached = d.cartTotal >= d.tier1;
  const marker2Reached = d.status === 'max';

  // Recommendations: products not in cart, price <= remaining * 1.5, closest first, max 3
  const recs = useMemo(() => {
    if (d.remaining <= 0 || d.remaining > 300) return [];
    return allProducts
      .filter(p => !cartItemIds.includes(p.id) && Math.round(p.price / 100) <= d.remaining * 1.5)
      .sort((a, b) => {
        const da = Math.abs(Math.round(a.price / 100) - d.remaining);
        const db = Math.abs(Math.round(b.price / 100) - d.remaining);
        return da - db;
      })
      .slice(0, 3);
  }, [allProducts, cartItemIds, d.remaining]);

  return (
    <div style={{
      background: theme.bg,
      borderRadius: 14,
      padding: '12px 14px',
      marginBottom: 16,
      transition: 'background 0.4s',
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 18 }}>{theme.icon}</span>
        <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: '#1a1a1a', lineHeight: 1.3 }}>
          {statusText(d)}
        </span>
        <span style={{
          flexShrink: 0,
          fontSize: 12, fontWeight: 800,
          padding: '3px 8px', borderRadius: 100,
          background: theme.badgeBg, color: theme.badgeTxt,
          transition: 'background 0.4s',
        }}>
          {theme.badge}
        </span>
      </div>

      {/* Bar track */}
      <div style={{ position: 'relative', height: 10, borderRadius: 100, background: 'rgba(0,0,0,0.1)', overflow: 'visible' }}>
        {/* Fill */}
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0,
          width: `${d.progress}%`,
          borderRadius: 100,
          background: theme.bar,
          transition: 'width 0.5s ease-out, background 0.4s',
        }} />

        {/* Marker 1 — tier1 (−15%) */}
        <div style={{
          position: 'absolute',
          left: `${marker1Pos}%`,
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: 18, height: 18,
          borderRadius: '50%',
          background: marker1Reached ? '#fff' : '#ccc',
          boxShadow: marker1Reached ? '0 1px 4px rgba(0,0,0,0.25)' : 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10,
          zIndex: 2,
          transition: 'all 0.3s',
        }}>
          <span style={{ fontSize: 8, lineHeight: 1 }}>🏷</span>
        </div>

        {/* Marker 2 — tier2 (−25%) */}
        <div style={{
          position: 'absolute',
          right: 0,
          top: '50%',
          transform: 'translate(50%, -50%)',
          width: 18, height: 18,
          borderRadius: '50%',
          background: marker2Reached ? '#fff' : '#ccc',
          boxShadow: marker2Reached ? '0 1px 4px rgba(0,0,0,0.25)' : 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 2,
          transition: 'all 0.3s',
        }}>
          <span style={{ fontSize: 10, lineHeight: 1 }}>⭐</span>
        </div>
      </div>

      {/* Tier labels under bar */}
      <div style={{ position: 'relative', marginTop: 6, height: 14 }}>
        <span style={{
          position: 'absolute',
          left: `${marker1Pos}%`,
          transform: 'translateX(-50%)',
          fontSize: 10, color: marker1Reached ? '#2E7D32' : '#999', fontWeight: 700,
          whiteSpace: 'nowrap',
        }}>
          {d.tier1} ₽
        </span>
        <span style={{
          position: 'absolute',
          right: 0,
          transform: 'translateX(50%)',
          fontSize: 10, color: marker2Reached ? '#283593' : '#999', fontWeight: 700,
          whiteSpace: 'nowrap',
        }}>
          1000 ₽
        </span>
      </div>

      {/* Recommendations */}
      {recs.length > 0 && (
        <div style={{ marginTop: 12, borderTop: '1px solid rgba(0,0,0,0.08)', paddingTop: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>
            Добавьте до скидки
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {recs.map(p => {
              const priceRub = Math.round(p.price / 100);
              const diff = priceRub - d.remaining;
              return (
                <div key={p.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: 'rgba(255,255,255,0.7)', borderRadius: 10, padding: '8px 10px',
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                    background: 'var(--orange-light)', display: 'grid', placeItems: 'center', fontSize: 20,
                    overflow: 'hidden',
                  }}>
                    {p.cover_url
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={p.cover_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : (p.cover_emoji ?? '📦')}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#1a1a1a', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--orange)', fontWeight: 800 }}>
                      {priceRub} ₽
                      {diff > 0 && <span style={{ fontSize: 11, color: '#888', fontWeight: 400, marginLeft: 4 }}>+{diff} ₽ сверх порога</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => onAddToCart(p.id)}
                    style={{
                      background: 'var(--orange)', color: '#fff',
                      border: 'none', borderRadius: 100,
                      padding: '6px 12px', fontSize: 11, fontWeight: 700,
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
        </div>
      )}
    </div>
  );
}
