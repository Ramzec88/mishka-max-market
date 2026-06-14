'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export interface HeroSlide {
  key: string;
  content: React.ReactNode;
}

interface Props {
  slides: HeroSlide[];
  intervalMs?: number;
}

export default function HeroCarousel({ slides, intervalMs = 5000 }: Props) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const goTo = useCallback((idx: number) => {
    setCurrent((idx + slides.length) % slides.length);
  }, [slides.length]);

  useEffect(() => {
    if (paused || slides.length < 2) return;
    timerRef.current = setTimeout(() => goTo(current + 1), intervalMs);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [current, paused, intervalMs, goTo, slides.length]);

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      style={{ position: 'relative' }}
    >
      {/* Height anchor: first slide rendered invisible — sets wrapper height */}
      <div style={{ visibility: 'hidden', pointerEvents: 'none' }}>
        {slides[0]?.content}
      </div>

      {/* All slides overlay the anchor, absolutely positioned */}
      {slides.map((slide, idx) => (
        <div
          key={slide.key}
          style={{
            position: 'absolute',
            inset: 0,
            opacity: idx === current ? 1 : 0,
            transition: 'opacity 0.6s ease',
            pointerEvents: idx === current ? 'auto' : 'none',
            overflow: 'hidden',
            borderRadius: 28,
          }}
        >
          {slide.content}
        </div>
      ))}

      {/* Dots */}
      {slides.length > 1 && (
        <div style={{
          position: 'relative',
          zIndex: 3,
          display: 'flex',
          justifyContent: 'center',
          gap: 8,
          paddingTop: 16,
        }}>
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => { setPaused(true); goTo(idx); }}
              aria-label={`Слайд ${idx + 1}`}
              style={{
                width: idx === current ? 24 : 8,
                height: 8,
                borderRadius: 100,
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                background: idx === current ? 'var(--orange, #FF7A3D)' : '#ddd',
                transition: 'width 0.3s, background 0.3s',
              }}
            />
          ))}
        </div>
      )}

      {/* Prev / Next arrows */}
      {slides.length > 1 && (
        <>
          <button
            onClick={() => { setPaused(true); goTo(current - 1); }}
            aria-label="Назад"
            className="carousel-arrow"
            style={{
              position: 'absolute', top: '50%', left: 12,
              transform: 'translateY(-50%)',
              width: 36, height: 36, borderRadius: '50%',
              background: 'rgba(255,255,255,0.85)', border: 'none',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
              zIndex: 4,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <button
            onClick={() => { setPaused(true); goTo(current + 1); }}
            aria-label="Вперёд"
            className="carousel-arrow"
            style={{
              position: 'absolute', top: '50%', right: 12,
              transform: 'translateY(-50%)',
              width: 36, height: 36, borderRadius: '50%',
              background: 'rgba(255,255,255,0.85)', border: 'none',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
              zIndex: 4,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        </>
      )}
    </div>
  );
}
