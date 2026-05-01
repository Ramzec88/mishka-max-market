'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { ProductDisplay } from '@/types/product';

const coverBg: Record<string, string> = {
  orange: 'linear-gradient(135deg, var(--orange-light), #FFE4D1)',
  lavender: 'linear-gradient(135deg, #E8E0F5, #D4C7ED)',
  green: 'linear-gradient(135deg, #E0F2E4, #C7E8CF)',
  blue: 'linear-gradient(135deg, #E0EBF5, #C7DAED)',
};

function fmt(secs: number) {
  if (!isFinite(secs)) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

interface Props {
  product: ProductDisplay | null;
  inCart: boolean;
  onClose: () => void;
  onAdd: (id: string) => void;
}

export default function StickyPlayer({ product, inCart, onClose, onAdd }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (product?.demo_url) {
      audio.src = product.demo_url;
      audio.load();
      setCurrentTime(0);
      setDuration(0);
      audio.play().then(() => { setPlaying(true); setVisible(true); }).catch(() => setVisible(true));
    } else {
      audio.pause();
      audio.src = '';
      setPlaying(false);
      setVisible(false);
    }
  }, [product]);

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play().then(() => setPlaying(true)).catch(() => {});
    }
  }

  function handleSeek(e: React.ChangeEvent<HTMLInputElement>) {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Number(e.target.value);
  }

  function handleClose() {
    const audio = audioRef.current;
    if (audio) { audio.pause(); audio.src = ''; }
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setVisible(false);
    onClose();
  }

  return (
    <>
      <audio
        ref={audioRef}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime ?? 0)}
        onDurationChange={() => setDuration(audioRef.current?.duration ?? 0)}
        onEnded={() => setPlaying(false)}
      />

      <div
        style={{
          position: 'fixed',
          bottom: 0, left: 0, right: 0,
          zIndex: 300,
          transform: visible && product ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.32s cubic-bezier(0.32, 0.72, 0, 1)',
          pointerEvents: visible && product ? 'auto' : 'none',
        }}
      >
        {product && (
          <div
            style={{
              background: '#1A1A2E',
              borderTop: '2px solid #FF7A3D',
              padding: '10px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            {/* Cover */}
            <div
              style={{
                width: 44, height: 44, borderRadius: 8, flexShrink: 0,
                overflow: 'hidden', position: 'relative',
                background: coverBg[product.cover_variant] || coverBg.orange,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
              }}
            >
              {product.cover_url ? (
                <Image src={product.cover_url} alt={product.title} fill style={{ objectFit: 'cover' }} unoptimized />
              ) : (product.cover_emoji || '🎵')}
            </div>

            {/* Title + time */}
            <div style={{ minWidth: 0, flexShrink: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {product.title}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 1 }}>
                Демо · {fmt(currentTime)} / {fmt(duration)}
              </div>
            </div>

            {/* Progress */}
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.1}
              value={currentTime}
              onChange={handleSeek}
              style={{ flex: 1, minWidth: 40, maxWidth: 220, accentColor: '#FF7A3D', cursor: 'pointer' }}
            />

            {/* Play/Pause */}
            <button
              onClick={togglePlay}
              style={{
                width: 40, height: 40, borderRadius: '50%',
                background: '#FF7A3D', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: playing ? 14 : 16, flexShrink: 0, color: '#fff',
                fontFamily: 'inherit',
              }}
            >
              {playing ? '⏸' : '▶'}
            </button>

            {/* В корзину */}
            <button
              onClick={() => onAdd(product.id)}
              style={{
                background: inCart ? 'rgba(255,255,255,0.15)' : 'transparent',
                border: '1.5px solid rgba(255,255,255,0.35)',
                borderRadius: 100, padding: '6px 14px',
                fontSize: 13, fontWeight: 700, color: '#fff',
                cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', gap: 4,
              }}
            >
              {inCart ? '✓ В корзине' : '+ В корзину'}
            </button>

            {/* Close */}
            <button
              onClick={handleClose}
              style={{
                background: 'none', border: 'none',
                color: 'rgba(255,255,255,0.45)', cursor: 'pointer',
                fontSize: 22, padding: '0 2px', flexShrink: 0,
                lineHeight: 1, fontFamily: 'inherit',
              }}
            >
              ×
            </button>
          </div>
        )}
      </div>
    </>
  );
}
