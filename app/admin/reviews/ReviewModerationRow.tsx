'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Review {
  id: string;
  order_id: string;
  product_id: string;
  email: string;
  name: string | null;
  rating: number;
  body: string | null;
  is_published: boolean;
  created_at: string;
  products: { title: string } | null;
}

export default function ReviewModerationRow({ review }: { review: Review }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const date = new Date(review.created_at).toLocaleDateString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });

  async function toggle() {
    setLoading(true);
    await fetch(`/api/admin/reviews/${review.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_published: !review.is_published }),
    });
    router.refresh();
    setLoading(false);
  }

  async function remove() {
    if (!confirm('Удалить отзыв?')) return;
    setLoading(true);
    await fetch(`/api/admin/reviews/${review.id}`, { method: 'DELETE' });
    router.refresh();
    setLoading(false);
  }

  const stars = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);

  return (
    <div style={{
      background: '#fff',
      borderRadius: 12,
      padding: '16px 20px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      borderLeft: `4px solid ${review.is_published ? '#16a34a' : '#FF7A3D'}`,
      opacity: loading ? 0.6 : 1,
    }}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* Content */}
        <div style={{ flex: 1, minWidth: 240 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 18, color: '#FF7A3D' }}>{stars}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a' }}>
              {review.name || '(без имени)'}
            </span>
            <span style={{ fontSize: 12, color: '#aaa' }}>{review.email}</span>
            <span style={{ fontSize: 12, color: '#bbb' }}>{date}</span>
          </div>
          <div style={{ fontSize: 13, color: '#888', marginBottom: 6 }}>
            {review.products?.title ?? review.product_id}
          </div>
          {review.body && (
            <div style={{ fontSize: 14, color: '#3D3530', lineHeight: 1.5 }}>{review.body}</div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }}>
          <button
            onClick={toggle}
            disabled={loading}
            style={{
              padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontWeight: 700, fontSize: 13, fontFamily: 'inherit',
              background: review.is_published ? '#f3f4f6' : '#16a34a',
              color: review.is_published ? '#555' : '#fff',
            }}
          >
            {review.is_published ? 'Снять' : 'Опубликовать'}
          </button>
          <button
            onClick={remove}
            disabled={loading}
            style={{
              padding: '6px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: '#FEF2F2', color: '#DC2626', fontWeight: 700, fontSize: 13,
              fontFamily: 'inherit',
            }}
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
