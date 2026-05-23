'use client';

import { useState } from 'react';
import type { Product } from '@/types/product';

type ProductOption = Pick<Product, 'id' | 'title' | 'cover_emoji' | 'letter_s3_key'>;

interface Recipient {
  orderId: string;
  email: string;
  paidAt: string;
}

type Step = 'select' | 'preview' | 'sending' | 'done';

const DEFAULT_BODY = (title: string) =>
  `Привет! Это Мишка Макс 🐻

Ты купил(а) серию «${title}» — и это здорово! Надеюсь, вам с малышом очень понравилось учить буквы вместе со мной.

Я написал тебе личное письмо — загляни в приложение к этому письму. Там сюрприз для твоего маленького читателя! 🎁

А ещё — мы с буквами очень скучаем и ждём вас снова!`;

const CARD: React.CSSProperties = {
  background: '#fff',
  borderRadius: 12,
  padding: 24,
  marginBottom: 20,
  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
};

const INPUT: React.CSSProperties = {
  width: '100%',
  border: '1px solid #e5e7eb',
  borderRadius: 8,
  padding: '9px 13px',
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
  background: '#fff',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function FollowupWizard({ products }: { products: ProductOption[] }) {
  const [productId, setProductId] = useState('');
  const [step, setStep] = useState<Step>('select');

  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [showEmails, setShowEmails] = useState(false);

  const [subject, setSubject] = useState('🐻 Письмо от Мишки Макса — продолжаем учить буквы?');
  const [letterBody, setLetterBody] = useState('');
  const [skipAttachment, setSkipAttachment] = useState(false);

  const [collecting, setCollecting] = useState(false);
  const [collectError, setCollectError] = useState('');

  const [sendProgress, setSendProgress] = useState(0);
  const [sendTotal, setSendTotal] = useState(0);
  const [sendErrors, setSendErrors] = useState<string[]>([]);

  const selectedProduct = products.find((p) => p.id === productId) ?? null;

  async function handleCollect() {
    if (!productId) return;
    setCollecting(true);
    setCollectError('');
    setStep('select');

    try {
      const res = await fetch('/api/admin/followup/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ошибка');

      setRecipients(data.recipients || []);
      setLetterBody(DEFAULT_BODY(selectedProduct?.title ?? ''));
      setStep('preview');
    } catch (err) {
      setCollectError(err instanceof Error ? err.message : String(err));
    } finally {
      setCollecting(false);
    }
  }

  async function handleSend() {
    setStep('sending');
    setSendProgress(0);
    setSendTotal(recipients.length);
    setSendErrors([]);

    try {
      const res = await fetch('/api/admin/followup/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, letterBody, subject, skipAttachment }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ошибка');

      setSendProgress(data.sent ?? 0);
      setSendErrors(data.errors ?? []);
      setStep('done');
    } catch (err) {
      setSendErrors([err instanceof Error ? err.message : String(err)]);
      setStep('done');
    }
  }

  function handleReset() {
    setStep('select');
    setProductId('');
    setRecipients([]);
    setShowEmails(false);
    setSendErrors([]);
  }

  return (
    <div style={{ maxWidth: 780, margin: '0 auto' }}>
      <h1 style={{ fontSize: 24, fontWeight: 900, color: '#1a1a1a', marginBottom: 6 }}>
        Письма Мишки Макса
      </h1>
      <p style={{ fontSize: 13, color: '#888', marginBottom: 24 }}>
        Выберите серию, соберите аудиторию, проверьте письмо и отправьте.
      </p>

      {/* ── Шаг 1: выбор серии ── */}
      <div style={CARD}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#555', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Шаг 1 — Выберите серию
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <select
            value={productId}
            onChange={(e) => { setProductId(e.target.value); setStep('select'); setRecipients([]); }}
            style={{ ...INPUT, flex: 1 }}
            disabled={step === 'sending'}
          >
            <option value="">— выберите серию —</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.cover_emoji ? `${p.cover_emoji} ` : ''}{p.title}
              </option>
            ))}
          </select>
          <button
            onClick={handleCollect}
            disabled={!productId || collecting || step === 'sending'}
            style={{
              background: collecting ? '#ffb899' : '#FF7A3D',
              color: '#fff', border: 'none', borderRadius: 8,
              padding: '9px 20px', fontWeight: 700, fontSize: 14,
              cursor: (!productId || collecting) ? 'not-allowed' : 'pointer',
              whiteSpace: 'nowrap', flexShrink: 0,
            }}
          >
            {collecting ? 'Собираем...' : 'Собрать данные'}
          </button>
        </div>

        {collectError && (
          <div style={{ marginTop: 10, fontSize: 13, color: '#dc2626' }}>⚠ {collectError}</div>
        )}

        {/* Итог сбора */}
        {step !== 'select' && recipients.length === 0 && !collecting && (
          <div style={{ marginTop: 14, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '12px 16px', fontSize: 14, color: '#16a34a', fontWeight: 600 }}>
            Нет новых адресов — по этой серии все уже получили письмо.
          </div>
        )}

        {step !== 'select' && recipients.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ background: '#FFF0E8', borderRadius: 8, padding: '10px 18px', fontSize: 22, fontWeight: 900, color: '#FF7A3D' }}>
                {recipients.length}
              </div>
              <div style={{ fontSize: 14, color: '#3D3530', lineHeight: 1.4 }}>
                <strong>адресов</strong>, которым ещё не отправлялось письмо<br />
                по серии <strong>«{selectedProduct?.title}»</strong>
              </div>
            </div>

            <button
              onClick={() => setShowEmails((v) => !v)}
              style={{ marginTop: 10, background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#FF7A3D', fontWeight: 600, padding: 0 }}
            >
              {showEmails ? '▲ Скрыть список' : '▼ Показать список адресов'}
            </button>

            {showEmails && (
              <div style={{ marginTop: 8, maxHeight: 200, overflowY: 'auto', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: 12 }}>
                {recipients.map((r) => (
                  <div key={r.orderId} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #f0f0f0', fontSize: 13 }}>
                    <span style={{ color: '#1a1a1a' }}>{r.email}</span>
                    <span style={{ color: '#aaa', marginLeft: 12, whiteSpace: 'nowrap' }}>оплата {formatDate(r.paidAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Шаг 2: редактирование письма ── */}
      {(step === 'preview' || step === 'sending' || step === 'done') && recipients.length > 0 && (
        <>
          <div style={CARD}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#555', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Шаг 2 — Письмо
            </div>

            {/* Тема */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#555', marginBottom: 6 }}>
                Тема письма
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                style={INPUT}
                disabled={step !== 'preview'}
              />
            </div>

            {/* Вложение */}
            {selectedProduct?.letter_s3_key ? (
              <div style={{ marginBottom: 16 }}>
                <div style={{
                  padding: '10px 14px', borderRadius: skipAttachment ? '8px 8px 0 0' : 8,
                  background: skipAttachment ? '#f9fafb' : '#f0fdf4',
                  border: `1px solid ${skipAttachment ? '#e5e7eb' : '#bbf7d0'}`,
                  fontSize: 13, display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <span style={{ fontSize: 20 }}>{skipAttachment ? '🚫' : '📎'}</span>
                  <span style={{ color: skipAttachment ? '#888' : '#166534', flex: 1 }}>
                    {skipAttachment
                      ? <s>{selectedProduct.letter_s3_key.split('/').pop()}</s>
                      : <><strong>{selectedProduct.letter_s3_key.split('/').pop()}</strong> — будет прикреплено к каждому письму</>
                    }
                  </span>
                </div>
                <label style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 14px',
                  background: skipAttachment ? '#fef2f2' : '#f9fafb',
                  border: `1px solid ${skipAttachment ? '#fecaca' : '#e5e7eb'}`,
                  borderTop: 'none', borderRadius: '0 0 8px 8px',
                  cursor: step === 'preview' ? 'pointer' : 'default',
                  fontSize: 13, fontWeight: 600,
                  color: skipAttachment ? '#dc2626' : '#555',
                }}>
                  <input
                    type="checkbox"
                    checked={skipAttachment}
                    onChange={(e) => setSkipAttachment(e.target.checked)}
                    disabled={step !== 'preview'}
                    style={{ width: 15, height: 15 }}
                  />
                  Отправить без вложения
                </label>
              </div>
            ) : (
              <div style={{
                marginBottom: 16, padding: '10px 14px', borderRadius: 8,
                background: '#fff7ed', border: '1px solid #fed7aa',
                fontSize: 13, display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <span style={{ fontSize: 20 }}>⚠️</span>
                <span style={{ color: '#92400E' }}>
                  PDF-письмо не загружено для этой серии — письма уйдут без вложения.
                  Загрузить можно в карточке товара.
                </span>
              </div>
            )}

            {/* Текст письма */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#555', marginBottom: 6 }}>
                Текст письма
                <span style={{ fontWeight: 400, color: '#aaa', marginLeft: 8 }}>
                  (абзацы разделяйте пустой строкой)
                </span>
              </label>
              <textarea
                value={letterBody}
                onChange={(e) => setLetterBody(e.target.value)}
                rows={10}
                style={{ ...INPUT, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6 }}
                disabled={step !== 'preview'}
              />
            </div>

            {/* Превью — как выглядит разбивка на абзацы */}
            {letterBody && step === 'preview' && (
              <div style={{ marginTop: 16, background: '#FFF8F3', border: '1px solid #F0E4D6', borderRadius: 8, padding: '16px 20px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
                  Предпросмотр текста
                </div>
                {letterBody.split(/\n\n+/).map((para, i) => (
                  <p key={i} style={{ margin: '0 0 12px', fontSize: 14, lineHeight: 1.7, color: '#3D3530' }}>
                    {para.split('\n').map((line, j) => (
                      <span key={j}>{line}{j < para.split('\n').length - 1 && <br />}</span>
                    ))}
                  </p>
                ))}
              </div>
            )}
          </div>

          {/* ── Кнопка отправки ── */}
          {step === 'preview' && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button onClick={handleReset}
                style={{ background: 'transparent', border: '1px solid #e5e7eb', borderRadius: 8, padding: '11px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer', color: '#666' }}>
                Отмена
              </button>
              <button
                onClick={handleSend}
                disabled={!letterBody.trim() || !subject.trim()}
                style={{
                  background: (!letterBody.trim() || !subject.trim()) ? '#ffb899' : '#FF7A3D',
                  color: '#fff', border: 'none', borderRadius: 8,
                  padding: '11px 28px', fontSize: 14, fontWeight: 700,
                  cursor: (!letterBody.trim() || !subject.trim()) ? 'not-allowed' : 'pointer',
                }}
              >
                Отправить {recipients.length} письм{recipients.length === 1 ? 'о' : recipients.length < 5 ? 'а' : ''}
              </button>
            </div>
          )}

          {/* ── Прогресс отправки ── */}
          {step === 'sending' && (
            <div style={{ ...CARD, background: '#FFF8F3', border: '1px solid #F0E4D6', textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>📨</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#1a1a1a' }}>Отправляем письма...</div>
              <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>Не закрывайте страницу</div>
            </div>
          )}

          {/* ── Результат ── */}
          {step === 'done' && (
            <div style={{ ...CARD, border: `1px solid ${sendErrors.length === 0 ? '#bbf7d0' : '#fed7aa'}` }}>
              <div style={{ fontSize: 32, marginBottom: 12, textAlign: 'center' }}>
                {sendErrors.length === 0 ? '✅' : '⚠️'}
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#1a1a1a', marginBottom: 6, textAlign: 'center' }}>
                Отправлено: {sendProgress} из {sendTotal}
              </div>
              {sendErrors.length > 0 && (
                <div style={{ marginTop: 12, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#dc2626', marginBottom: 6 }}>Ошибки ({sendErrors.length}):</div>
                  {sendErrors.map((e, i) => (
                    <div key={i} style={{ fontSize: 12, color: '#dc2626', marginBottom: 2 }}>{e}</div>
                  ))}
                </div>
              )}
              <div style={{ textAlign: 'center', marginTop: 20 }}>
                <button onClick={handleReset}
                  style={{ background: '#FF7A3D', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 28px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                  Новая рассылка
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
