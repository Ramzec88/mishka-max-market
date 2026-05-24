'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface PreviewData {
  count: number;
  emails: string[];
  previewHtml: string;
  sample: { email: string; totalAmount: number; attempts: number };
}

export default function AbandonedCartSendButton() {
  const router = useRouter();
  const [step, setStep] = useState<'idle' | 'loading-preview' | 'preview' | 'sending' | 'done' | 'error'>('idle');
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [result, setResult] = useState<{ sent: number; failed: string[] } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [promoDiscount, setPromoDiscount] = useState('');

  function buildPreviewUrl() {
    const params = new URLSearchParams();
    if (promoCode.trim()) params.set('promoCode', promoCode.trim());
    if (promoDiscount.trim()) params.set('promoDiscount', promoDiscount.trim());
    const qs = params.toString();
    return `/api/admin/abandoned-cart/preview${qs ? `?${qs}` : ''}`;
  }

  async function handleBuildPreview() {
    setStep('loading-preview');
    setErrorMsg('');
    try {
      const res = await fetch(buildPreviewUrl());
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ошибка загрузки предпросмотра');
      if (data.count === 0) {
        setStep('idle');
        alert('Нет получателей: все клиенты уже получили письмо или совершили покупку.');
        return;
      }
      setPreview(data);
      setStep('preview');
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : String(e));
      setStep('error');
    }
  }

  async function handleSend() {
    if (!preview) return;
    setStep('sending');
    try {
      const res = await fetch('/api/admin/abandoned-cart/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promoCode: promoCode.trim() || undefined,
          promoDiscount: promoDiscount.trim() ? Number(promoDiscount.trim()) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ошибка отправки');
      setResult(data);
      setStep('done');
      router.refresh();
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : String(e));
      setStep('error');
    }
  }

  function handleClose() {
    setStep('idle');
    setPreview(null);
    setResult(null);
    setErrorMsg('');
  }

  const modalOpen = step === 'preview' || step === 'sending' || step === 'done' || step === 'error';

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={handleBuildPreview}
        disabled={step === 'loading-preview'}
        style={{
          background: step === 'loading-preview' ? '#ffb899' : '#FF7A3D',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          padding: '10px 20px',
          fontWeight: 700,
          fontSize: 14,
          cursor: step === 'loading-preview' ? 'not-allowed' : 'pointer',
          fontFamily: 'inherit',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          whiteSpace: 'nowrap',
        }}
      >
        {step === 'loading-preview' ? (
          <>⏳ Формируем…</>
        ) : (
          <>📧 Сформировать рассылку</>
        )}
      </button>

      {/* Modal overlay */}
      {modalOpen && (
        <div
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(31,27,22,0.55)',
            zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16,
          }}
          onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
        >
          <div style={{
            background: '#fff',
            borderRadius: 16,
            width: '100%',
            maxWidth: 680,
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          }}>
            {/* Modal header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              flexShrink: 0,
            }}>
              <div>
                <div style={{ fontSize: 17, fontWeight: 900, color: '#1a1a1a' }}>
                  {step === 'done' ? '✅ Рассылка отправлена' : step === 'error' ? '⚠️ Ошибка' : '📧 Предпросмотр рассылки'}
                </div>
                {step === 'preview' && preview && (
                  <div style={{ fontSize: 13, color: '#888', marginTop: 3 }}>
                    Готовы отправить: <strong style={{ color: '#1a1a1a' }}>{preview.count}</strong> писем
                  </div>
                )}
              </div>
              <button
                onClick={handleClose}
                style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: '#f3f4f6', border: 'none', cursor: 'pointer',
                  fontSize: 16, display: 'grid', placeItems: 'center', flexShrink: 0,
                  fontFamily: 'inherit',
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

              {/* PREVIEW state */}
              {step === 'preview' && preview && (
                <>
                  {/* Promo code inputs */}
                  <div style={{ marginBottom: 16, background: '#FFF8F3', borderRadius: 10, padding: '14px 16px', border: '1px solid #F0E4D6' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
                      Промокод (необязательно)
                    </div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Код</div>
                        <input
                          type="text"
                          placeholder="MISHKA20"
                          value={promoCode}
                          onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                          style={{
                            border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px',
                            fontSize: 14, fontFamily: 'monospace', width: 140,
                            textTransform: 'uppercase', color: '#FF7A3D', fontWeight: 700,
                          }}
                        />
                      </div>
                      <div>
                        <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Скидка %</div>
                        <input
                          type="number"
                          placeholder="20"
                          min={1}
                          max={99}
                          value={promoDiscount}
                          onChange={(e) => setPromoDiscount(e.target.value)}
                          style={{
                            border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px',
                            fontSize: 14, width: 80,
                          }}
                        />
                      </div>
                      <button
                        onClick={async () => {
                          setStep('loading-preview');
                          try {
                            const res = await fetch(buildPreviewUrl());
                            const data = await res.json();
                            if (!res.ok) throw new Error(data.error || 'Ошибка');
                            setPreview(data);
                            setStep('preview');
                          } catch (e) {
                            setErrorMsg(e instanceof Error ? e.message : String(e));
                            setStep('error');
                          }
                        }}
                        style={{
                          background: '#1a1a1a', color: '#fff', border: 'none',
                          borderRadius: 8, padding: '8px 14px', fontSize: 13,
                          fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        Обновить предпросмотр
                      </button>
                    </div>
                  </div>

                  {/* Recipients */}
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                      Получатели ({preview.count})
                    </div>
                    <div style={{
                      background: '#f9fafb', borderRadius: 8, padding: '10px 14px',
                      maxHeight: 100, overflowY: 'auto',
                      border: '1px solid #e5e7eb',
                    }}>
                      {preview.emails.map((email, i) => (
                        <div key={email} style={{ fontSize: 13, color: '#555', lineHeight: 1.7 }}>
                          {i + 1}. {email}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Email preview */}
                  <div style={{ marginBottom: 4 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                      Пример письма (для {preview.sample.email})
                    </div>
                    <div style={{
                      border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden',
                      height: 360,
                    }}>
                      <iframe
                        srcDoc={preview.previewHtml}
                        style={{ width: '100%', height: '100%', border: 'none' }}
                        title="Предпросмотр письма"
                        sandbox="allow-same-origin"
                      />
                    </div>
                    <div style={{ fontSize: 11, color: '#aaa', marginTop: 6 }}>
                      Тема письма: «Вы не завершили покупку 🧸» · Каждое письмо персонализировано под конкретного получателя
                    </div>
                  </div>
                </>
              )}

              {/* SENDING state */}
              {step === 'sending' && (
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>📨</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#1a1a1a', marginBottom: 8 }}>
                    Отправляем письма…
                  </div>
                  <div style={{ fontSize: 14, color: '#888' }}>
                    Это может занять несколько секунд
                  </div>
                </div>
              )}

              {/* DONE state */}
              {step === 'done' && result && (
                <div style={{ textAlign: 'center', padding: '32px 20px' }}>
                  <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: '#1a1a1a', marginBottom: 8 }}>
                    Готово!
                  </div>
                  <div style={{
                    display: 'inline-flex', gap: 24, marginBottom: 20,
                    background: '#f0fdf4', borderRadius: 12, padding: '16px 32px',
                    border: '1px solid #bbf7d0',
                  }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 28, fontWeight: 900, color: '#16a34a' }}>{result.sent}</div>
                      <div style={{ fontSize: 13, color: '#555' }}>Отправлено</div>
                    </div>
                    {result.failed.length > 0 && (
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 28, fontWeight: 900, color: '#dc2626' }}>{result.failed.length}</div>
                        <div style={{ fontSize: 13, color: '#555' }}>Ошибки</div>
                      </div>
                    )}
                  </div>
                  {result.failed.length > 0 && (
                    <div style={{ fontSize: 13, color: '#dc2626', marginBottom: 12 }}>
                      Не удалось отправить: {result.failed.join(', ')}
                    </div>
                  )}
                  <div style={{ fontSize: 14, color: '#888' }}>
                    Статус в таблице обновился автоматически.
                  </div>
                </div>
              )}

              {/* ERROR state */}
              {step === 'error' && (
                <div style={{ textAlign: 'center', padding: '32px 20px' }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#dc2626', marginBottom: 8 }}>Произошла ошибка</div>
                  <div style={{ fontSize: 14, color: '#888' }}>{errorMsg}</div>
                </div>
              )}
            </div>

            {/* Modal footer */}
            {(step === 'preview' || step === 'done' || step === 'error') && (
              <div style={{
                padding: '16px 24px',
                borderTop: '1px solid #e5e7eb',
                display: 'flex', gap: 10, justifyContent: 'flex-end',
                flexShrink: 0,
              }}>
                <button
                  onClick={handleClose}
                  style={{
                    background: 'transparent', border: '1px solid #e5e7eb',
                    borderRadius: 8, padding: '10px 20px',
                    fontSize: 14, fontWeight: 600, cursor: 'pointer',
                    color: '#666', fontFamily: 'inherit',
                  }}
                >
                  {step === 'done' ? 'Закрыть' : 'Отмена'}
                </button>
                {step === 'preview' && preview && (
                  <button
                    onClick={handleSend}
                    style={{
                      background: '#FF7A3D', color: '#fff',
                      border: 'none', borderRadius: 8,
                      padding: '10px 24px',
                      fontSize: 14, fontWeight: 800,
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    Да, отправить {preview.count} {preview.count === 1 ? 'письмо' : preview.count < 5 ? 'письма' : 'писем'} →
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
