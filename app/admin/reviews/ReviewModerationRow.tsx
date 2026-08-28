'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Review } from '@/types/review';

type ReviewWithProduct = Review & { products: { title: string } | null };

export default function ReviewModerationRow({ review }: { review: ReviewWithProduct }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState(review.admin_reply ?? '');

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

  async function saveReply() {
    setLoading(true);
    await fetch(`/api/admin/reviews/${review.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ admin_reply: replyText }),
    });
    router.refresh();
    setLoading(false);
    setReplyOpen(false);
  }

  async function removeReply() {
    if (!confirm('Удалить ответ администратора?')) return;
    setLoading(true);
    await fetch(`/api/admin/reviews/${review.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ admin_reply: '' }),
    });
    setReplyText('');
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

          {review.admin_reply && !replyOpen && (
            <div style={{
              marginTop: 10, background: '#FFF8F3', border: '1px solid #F0E4D6',
              borderRadius: 8, padding: '10px 14px',
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#FF7A3D', marginBottom: 4 }}>
                🐻 Ответ Мишки Макса
              </div>
              <div style={{ fontSize: 13, color: '#3D3530', lineHeight: 1.5 }}>{review.admin_reply}</div>
              <div style={{ marginTop: 8, display: 'flex', gap: 12 }}>
                <button
                  onClick={() => setReplyOpen(true)}
                  style={{ background: 'none', border: 'none', padding: 0, color: '#FF7A3D', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  Изменить
                </button>
                <button
                  onClick={removeReply}
                  style={{ background: 'none', border: 'none', padding: 0, color: '#DC2626', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  Удалить ответ
                </button>
              </div>
            </div>
          )}

          {replyOpen && (
            <div style={{ marginTop: 10 }}>
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Ваш ответ — увидят все посетители сайта под этим отзывом"
                rows={3}
                style={{
                  width: '100%', boxSizing: 'border-box', border: '1.5px solid #e5e7eb', borderRadius: 8,
                  padding: '8px 12px', fontSize: 13, fontFamily: 'inherit', outline: 'none', resize: 'vertical',
                }}
              />
              <div style={{ marginTop: 6, display: 'flex', gap: 8 }}>
                <button
                  onClick={saveReply}
                  disabled={loading || !replyText.trim()}
                  style={{
                    background: '#FF7A3D', color: '#fff', border: 'none', borderRadius: 8,
                    padding: '6px 14px', fontWeight: 700, fontSize: 13, fontFamily: 'inherit',
                    cursor: loading || !replyText.trim() ? 'not-allowed' : 'pointer',
                  }}
                >
                  Сохранить ответ
                </button>
                <button
                  onClick={() => { setReplyOpen(false); setReplyText(review.admin_reply ?? ''); }}
                  style={{ background: '#f3f4f6', color: '#555', border: 'none', borderRadius: 8, padding: '6px 14px', fontWeight: 700, fontSize: 13, fontFamily: 'inherit', cursor: 'pointer' }}
                >
                  Отмена
                </button>
              </div>
            </div>
          )}

          {!review.admin_reply && !replyOpen && (
            <button
              onClick={() => setReplyOpen(true)}
              style={{
                marginTop: 8, background: '#fff', border: '1px solid #FFD4B8', color: '#FF7A3D',
                borderRadius: 8, padding: '5px 12px', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              💬 Ответить от имени администратора
            </button>
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
