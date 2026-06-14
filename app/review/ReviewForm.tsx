'use client';

import { useState } from 'react';

interface Props {
  orderId: string;
  productId: string;
  productTitle: string;
}

export default function ReviewForm({ orderId, productId, productTitle }: Props) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [name, setName] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) { setError('Пожалуйста, выберите оценку'); return; }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/reviews/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, productId, name: name.trim(), rating, body: body.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ошибка');
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка отправки');
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px' }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🐻</div>
        <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1F1B16', marginBottom: 8 }}>Спасибо за отзыв!</h2>
        <p style={{ color: '#5A4F45', fontSize: 15 }}>Он появится на сайте после проверки.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 480, margin: '0 auto' }}>
      <p style={{ fontSize: 14, color: '#888', marginBottom: 24 }}>
        Товар: <strong style={{ color: '#1F1B16' }}>{productTitle}</strong>
      </p>

      {/* Stars */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#5A4F45', marginBottom: 10 }}>Ваша оценка *</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHover(star)}
              onMouseLeave={() => setHover(0)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                fontSize: 38,
                lineHeight: 1,
                color: star <= (hover || rating) ? '#FF7A3D' : '#ddd',
                transition: 'color 0.15s',
              }}
            >
              ★
            </button>
          ))}
        </div>
        {rating > 0 && (
          <div style={{ fontSize: 13, color: '#888', marginTop: 6 }}>
            {['', 'Очень плохо', 'Плохо', 'Нормально', 'Хорошо', 'Отлично!'][rating]}
          </div>
        )}
      </div>

      {/* Name */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#5A4F45', marginBottom: 6 }}>
          Ваше имя
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Например: Мария"
          maxLength={80}
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: '10px 14px', borderRadius: 10, border: '1.5px solid #E5E7EB',
            fontSize: 15, fontFamily: 'inherit', outline: 'none',
          }}
        />
      </div>

      {/* Body */}
      <div style={{ marginBottom: 24 }}>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#5A4F45', marginBottom: 6 }}>
          Ваш отзыв
        </label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Расскажите, как вам материал..."
          maxLength={2000}
          rows={4}
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: '10px 14px', borderRadius: 10, border: '1.5px solid #E5E7EB',
            fontSize: 15, fontFamily: 'inherit', outline: 'none', resize: 'vertical',
          }}
        />
      </div>

      {error && (
        <div style={{ marginBottom: 16, padding: '10px 14px', background: '#FEF2F2', borderRadius: 8, color: '#DC2626', fontSize: 14 }}>
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        style={{
          width: '100%', padding: '14px', borderRadius: 12, border: 'none',
          background: submitting ? '#ccc' : '#FF7A3D', color: '#fff',
          fontSize: 16, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer',
          fontFamily: 'inherit',
        }}
      >
        {submitting ? 'Отправляем...' : 'Отправить отзыв'}
      </button>
    </form>
  );
}
