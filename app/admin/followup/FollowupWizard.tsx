'use client';

import { useState, useEffect } from 'react';
import type { Product } from '@/types/product';

type ProductOption = Pick<Product, 'id' | 'title' | 'cover_emoji' | 'letter_s3_key'>;

interface Recipient {
  orderId: string;
  email: string;
  paidAt: string;
  sentAt?: string;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  savedAt: string;
}

const TEMPLATES_KEY = 'mishka_email_templates';

function loadTemplates(): EmailTemplate[] {
  try {
    return JSON.parse(localStorage.getItem(TEMPLATES_KEY) || '[]');
  } catch { return []; }
}

function saveTemplates(tpls: EmailTemplate[]) {
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(tpls));
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

function plural(n: number, one: string, few: string, many: string) {
  const mod10 = n % 10, mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 19) return `${n} ${many}`;
  if (mod10 === 1) return `${n} ${one}`;
  if (mod10 >= 2 && mod10 <= 4) return `${n} ${few}`;
  return `${n} ${many}`;
}

type PageTab = 'mailing' | 'customer';

interface CustomerOrder {
  id: string;
  status: string;
  amount: number;
  items: string[];
  paid_at: string | null;
  created_at: string;
  promo_code: string | null;
  discount_amount: number;
}

interface CustomerFollowup {
  order_id: string;
  product_id: string;
  sent_at: string;
}

export default function FollowupWizard({ products }: { products: ProductOption[] }) {
  const [pageTab, setPageTab] = useState<PageTab>('mailing');

  // Customer lookup state
  const [lookupEmail, setLookupEmail] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const [customerOrders, setCustomerOrders] = useState<CustomerOrder[] | null>(null);
  const [customerFollowups, setCustomerFollowups] = useState<CustomerFollowup[]>([]);

  async function handleLookup() {
    if (!lookupEmail.trim()) return;
    setLookupLoading(true);
    setLookupError('');
    setCustomerOrders(null);
    setCustomerFollowups([]);
    try {
      const res = await fetch('/api/admin/followup/customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: lookupEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ошибка');
      setCustomerOrders(data.orders);
      setCustomerFollowups(data.followups);
    } catch (err) {
      setLookupError(err instanceof Error ? err.message : String(err));
    } finally {
      setLookupLoading(false);
    }
  }

  const productId_map = Object.fromEntries(products.map(p => [p.id, p.title]));

  const [productId, setProductId] = useState('');
  const [step, setStep] = useState<Step>('select');

  const [newRecipients, setNewRecipients] = useState<Recipient[]>([]);
  const [repeatRecipients, setRepeatRecipients] = useState<Recipient[]>([]);
  const [selectedNewOrderIds, setSelectedNewOrderIds] = useState<Set<string>>(new Set());
  const [includeAlreadySent, setIncludeAlreadySent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showRepeat, setShowRepeat] = useState(false);

  const [subject, setSubject] = useState('🐻 Письмо от Мишки Макса — продолжаем учить буквы?');
  const [letterBody, setLetterBody] = useState('');
  const [skipAttachment, setSkipAttachment] = useState(false);

  const [require7Days, setRequire7Days] = useState(true);

  const [collecting, setCollecting] = useState(false);
  const [collectError, setCollectError] = useState('');

  const [testEmail, setTestEmail] = useState('');
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState<'ok' | 'error' | null>(null);
  const [testError, setTestError] = useState('');

  const [sendProgress, setSendProgress] = useState(0);
  const [sendTotal, setSendTotal] = useState(0);
  const [sendErrors, setSendErrors] = useState<string[]>([]);

  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [saveTemplateName, setSaveTemplateName] = useState('');
  const [showSaveForm, setShowSaveForm] = useState(false);

  useEffect(() => {
    setTemplates(loadTemplates());
  }, []);

  function handleLoadTemplate(id: string) {
    setSelectedTemplateId(id);
    const tpl = templates.find(t => t.id === id);
    if (!tpl) return;
    setSubject(tpl.subject);
    setLetterBody(tpl.body);
  }

  function handleSaveTemplate() {
    if (!saveTemplateName.trim()) return;
    const tpl: EmailTemplate = {
      id: Date.now().toString(),
      name: saveTemplateName.trim(),
      subject,
      body: letterBody,
      savedAt: new Date().toISOString(),
    };
    const updated = [tpl, ...templates];
    saveTemplates(updated);
    setTemplates(updated);
    setSaveTemplateName('');
    setShowSaveForm(false);
    setSelectedTemplateId(tpl.id);
  }

  function handleDeleteTemplate(id: string) {
    const updated = templates.filter(t => t.id !== id);
    saveTemplates(updated);
    setTemplates(updated);
    if (selectedTemplateId === id) setSelectedTemplateId('');
  }

  const selectedProduct = products.find((p) => p.id === productId) ?? null;

  const selectedNewRecipients = newRecipients.filter((r) => selectedNewOrderIds.has(r.orderId));
  const activeRecipients = includeAlreadySent
    ? [...selectedNewRecipients, ...repeatRecipients]
    : selectedNewRecipients;

  async function handleCollect() {
    if (!productId) return;
    setCollecting(true);
    setCollectError('');
    setStep('select');
    setIncludeAlreadySent(false);

    try {
      const res = await fetch('/api/admin/followup/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, require7Days }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ошибка');

      const newR: Recipient[] = data.newRecipients || [];
      setNewRecipients(newR);
      setSelectedNewOrderIds(new Set(newR.map((r: Recipient) => r.orderId)));
      setRepeatRecipients(data.repeatRecipients || []);
      setLetterBody(DEFAULT_BODY(selectedProduct?.title ?? ''));
      setShowNew(true);
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
    setSendTotal(activeRecipients.length);
    setSendErrors([]);

    try {
      const res = await fetch('/api/admin/followup/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId, letterBody, subject, skipAttachment, includeAlreadySent, require7Days,
          selectedOrderIds: Array.from(selectedNewOrderIds),
        }),
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

  async function handleTestSend() {
    if (!testEmail.trim() || !letterBody.trim()) return;
    setTestSending(true);
    setTestResult(null);
    setTestError('');
    try {
      const res = await fetch('/api/admin/followup/send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, letterBody, subject, skipAttachment, testEmail: testEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ошибка');
      setTestResult('ok');
    } catch (err) {
      setTestResult('error');
      setTestError(err instanceof Error ? err.message : String(err));
    } finally {
      setTestSending(false);
    }
  }

  function handleReset() {
    setStep('select');
    setProductId('');
    setNewRecipients([]);
    setRepeatRecipients([]);
    setSelectedNewOrderIds(new Set());
    setIncludeAlreadySent(false);
    setShowNew(false);
    setShowRepeat(false);
    setSendErrors([]);
  }

  const totalAfterCollect = newRecipients.length + repeatRecipients.length;

  const STATUS_LABEL: Record<string, { label: string; color: string }> = {
    paid:     { label: 'Оплачен',  color: '#16a34a' },
    pending:  { label: 'Ожидает', color: '#92400e' },
    canceled: { label: 'Отменён', color: '#888' },
    failed:   { label: 'Ошибка',  color: '#dc2626' },
  };

  return (
    <div style={{ maxWidth: 780, margin: '0 auto' }}>
      <h1 style={{ fontSize: 24, fontWeight: 900, color: '#1a1a1a', marginBottom: 6 }}>
        Письма Мишки Макса
      </h1>

      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {([
          { id: 'mailing', label: 'Рассылка' },
          { id: 'customer', label: '🔍 Покупатель' },
        ] as const).map(tab => (
          <button
            key={tab.id}
            onClick={() => setPageTab(tab.id)}
            style={{
              padding: '8px 20px', borderRadius: 8, border: 'none',
              fontFamily: 'inherit', fontWeight: 700, fontSize: 14, cursor: 'pointer',
              background: pageTab === tab.id ? '#FF7A3D' : '#f3f4f6',
              color: pageTab === tab.id ? '#fff' : '#555',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Customer lookup tab ── */}
      {pageTab === 'customer' && (
        <div>
          <div style={CARD}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#555', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Поиск по email
            </div>
            <form onSubmit={e => { e.preventDefault(); handleLookup(); }} style={{ display: 'flex', gap: 8 }}>
              <input
                value={lookupEmail}
                onChange={e => setLookupEmail(e.target.value)}
                placeholder="email покупателя..."
                type="email"
                style={{ ...INPUT, flex: 1 }}
              />
              <button
                type="submit"
                disabled={!lookupEmail.trim() || lookupLoading}
                style={{
                  background: lookupLoading ? '#ffb899' : '#FF7A3D',
                  color: '#fff', border: 'none', borderRadius: 8,
                  padding: '9px 20px', fontWeight: 700, fontSize: 14,
                  cursor: lookupLoading ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap',
                }}
              >
                {lookupLoading ? 'Ищем...' : 'Найти'}
              </button>
            </form>
            {lookupError && <div style={{ marginTop: 10, color: '#dc2626', fontSize: 13 }}>{lookupError}</div>}
          </div>

          {customerOrders !== null && (
            <>
              {/* Orders */}
              <div style={CARD}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#555', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Заказы — {customerOrders.length > 0
                    ? `${customerOrders.length} шт · оплачено ${customerOrders.filter(o => o.status === 'paid').reduce((s, o) => s + o.amount, 0) / 100} ₽`
                    : 'не найдено'}
                </div>
                {customerOrders.length === 0 ? (
                  <div style={{ color: '#aaa', fontSize: 14 }}>Заказов нет</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {customerOrders.map(order => {
                      const s = STATUS_LABEL[order.status] || { label: order.status, color: '#888' };
                      return (
                        <div key={order.id} style={{ borderRadius: 8, border: '1px solid #f0f0f0', padding: '12px 14px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' }}>
                            <div>
                              <span style={{ fontWeight: 700, fontSize: 15, color: s.color }}>{(order.amount / 100).toLocaleString('ru-RU')} ₽</span>
                              <span style={{ marginLeft: 10, fontSize: 12, fontWeight: 700, background: '#f3f4f6', borderRadius: 100, padding: '2px 8px', color: s.color }}>{s.label}</span>
                              {order.promo_code && order.discount_amount > 0 && (
                                <span style={{ marginLeft: 8, fontSize: 12, color: '#16a34a', fontWeight: 600 }}>
                                  промокод {order.promo_code} −{(order.discount_amount / 100).toLocaleString('ru-RU')} ₽
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: 12, color: '#aaa', whiteSpace: 'nowrap' }}>
                              {order.paid_at ? formatDate(order.paid_at) : formatDate(order.created_at)}
                            </div>
                          </div>
                          <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {(order.items || []).map((id: string) => (
                              <span key={id} style={{ fontSize: 11, background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 6, padding: '2px 8px', color: '#555' }}>
                                {productId_map[id] || id}
                              </span>
                            ))}
                          </div>
                          <div style={{ marginTop: 6, fontSize: 11, color: '#ccc' }}>#{order.id}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Followup emails */}
              <div style={CARD}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#555', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Письма Мишки — {customerFollowups.length > 0 ? `отправлено ${customerFollowups.length} шт` : 'не отправлялись'}
                </div>
                {customerFollowups.length === 0 ? (
                  <div style={{ color: '#aaa', fontSize: 14 }}>Писем по этому адресу не было</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {customerFollowups.map((f, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: 8, background: '#f9fafb', flexWrap: 'wrap', gap: 4 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a' }}>
                          ✉️ {productId_map[f.product_id] || f.product_id}
                        </div>
                        <div style={{ fontSize: 12, color: '#888' }}>{formatDate(f.sent_at)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Mailing tab ── */}
      {pageTab === 'mailing' && (
      <><p style={{ fontSize: 13, color: '#888', marginBottom: 24 }}>
        Выберите товар, соберите аудиторию, проверьте письмо и отправьте.
      </p>

      {/* ── Шаг 1: выбор серии ── */}
      <div style={CARD}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#555', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Шаг 1 — Выберите товар
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <select
            value={productId}
            onChange={(e) => { setProductId(e.target.value); setStep('select'); setNewRecipients([]); setRepeatRecipients([]); }}
            style={{ ...INPUT, flex: 1 }}
            disabled={step === 'sending'}
          >
            <option value="">— выберите товар —</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.cover_emoji ? `${p.cover_emoji} ` : ''}{p.title}
              </option>
            ))}
            <option disabled>──────────────</option>
            <option value="__all__">⚠️ Всем уникальным покупателям</option>
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

        {/* Фильтр по дате */}
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
          <label style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 14px', borderRadius: 8, cursor: step === 'sending' ? 'default' : 'pointer',
            border: `1px solid ${require7Days ? '#bbf7d0' : '#fed7aa'}`,
            background: require7Days ? '#f0fdf4' : '#fff7ed',
            fontSize: 13, fontWeight: 600,
            color: require7Days ? '#166534' : '#92400E',
            userSelect: 'none',
          }}>
            <input
              type="checkbox"
              checked={require7Days}
              onChange={(e) => { setRequire7Days(e.target.checked); setStep('select'); setNewRecipients([]); setRepeatRecipients([]); }}
              disabled={step === 'sending'}
              style={{ width: 15, height: 15 }}
            />
            {require7Days
              ? '📅 Только покупки 7+ дней назад'
              : '📋 Все покупатели серии (без фильтра по дате)'}
          </label>
          <span style={{ fontSize: 12, color: '#aaa' }}>
            {require7Days
              ? 'Стандартный follow-up через неделю после покупки'
              : 'Рассылка по всей базе этой серии'}
          </span>
        </div>

        {collectError && (
          <div style={{ marginTop: 10, fontSize: 13, color: '#dc2626' }}>⚠ {collectError}</div>
        )}

        {/* Результат сбора */}
        {step !== 'select' && totalAfterCollect === 0 && !collecting && (
          <div style={{ marginTop: 14, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '12px 16px', fontSize: 14, color: '#16a34a', fontWeight: 600 }}>
            Покупателей этой серии пока нет.
          </div>
        )}

        {step !== 'select' && totalAfterCollect > 0 && (
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>

            {/* Новые */}
            <div style={{
              border: `1px solid ${newRecipients.length > 0 ? '#bbf7d0' : '#e5e7eb'}`,
              borderRadius: 8, overflow: 'hidden',
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                background: newRecipients.length > 0 ? '#f0fdf4' : '#f9fafb',
                flexWrap: 'wrap',
              }}>
                <div style={{
                  minWidth: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: selectedNewOrderIds.size > 0 ? '#16a34a' : '#d1d5db',
                  color: '#fff', fontWeight: 900, fontSize: 16, flexShrink: 0,
                }}>
                  {selectedNewOrderIds.size > 0
                    ? (selectedNewOrderIds.size < newRecipients.length
                        ? `${selectedNewOrderIds.size}/${newRecipients.length}`
                        : newRecipients.length)
                    : newRecipients.length}
                </div>
                <div style={{ flex: 1, fontSize: 14, color: '#1a1a1a', minWidth: 0 }}>
                  {newRecipients.length > 0
                    ? <>
                        <strong>
                          {selectedNewOrderIds.size < newRecipients.length && selectedNewOrderIds.size > 0
                            ? `Выбрано ${selectedNewOrderIds.size} из ${newRecipients.length}`
                            : plural(newRecipients.length, 'новый адрес', 'новых адреса', 'новых адресов')}
                        </strong>
                        {' '}— ещё не получали письмо по этой серии
                      </>
                    : <span style={{ color: '#888' }}>Новых адресов нет — все уже получали письмо</span>
                  }
                </div>
                {newRecipients.length > 0 && step === 'preview' && (
                  <button
                    onClick={() => {
                      if (selectedNewOrderIds.size === newRecipients.length) {
                        setSelectedNewOrderIds(new Set());
                      } else {
                        setSelectedNewOrderIds(new Set(newRecipients.map(r => r.orderId)));
                      }
                    }}
                    style={{ background: 'none', border: '1px solid #16a34a', borderRadius: 6, cursor: 'pointer', fontSize: 12, color: '#16a34a', fontWeight: 600, whiteSpace: 'nowrap', padding: '3px 10px' }}>
                    {selectedNewOrderIds.size === newRecipients.length ? 'Снять все' : 'Выбрать все'}
                  </button>
                )}
                {newRecipients.length > 0 && (
                  <button onClick={() => setShowNew(v => !v)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#16a34a', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {showNew ? '▲ Скрыть' : '▼ Список'}
                  </button>
                )}
              </div>
              {showNew && newRecipients.length > 0 && (
                <div style={{ maxHeight: 240, overflowY: 'auto', background: '#fff', padding: '4px 14px' }}>
                  {newRecipients.map((r) => {
                    const checked = selectedNewOrderIds.has(r.orderId);
                    return (
                      <label key={r.orderId} style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '6px 0', borderBottom: '1px solid #f0f0f0',
                        cursor: step === 'preview' ? 'pointer' : 'default',
                        background: checked ? 'transparent' : '#fafafa',
                      }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={step !== 'preview'}
                          onChange={() => {
                            setSelectedNewOrderIds(prev => {
                              const next = new Set(prev);
                              if (next.has(r.orderId)) next.delete(r.orderId);
                              else next.add(r.orderId);
                              return next;
                            });
                          }}
                          style={{ width: 15, height: 15, flexShrink: 0, accentColor: '#16a34a' }}
                        />
                        <span style={{ flex: 1, fontSize: 13, color: checked ? '#1a1a1a' : '#aaa', textDecoration: checked ? 'none' : 'line-through' }}>
                          {r.email}
                        </span>
                        <span style={{ color: '#aaa', marginLeft: 8, whiteSpace: 'nowrap', fontSize: 12 }}>
                          оплата {formatDate(r.paidAt)}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Уже получали */}
            {repeatRecipients.length > 0 && (
              <div style={{ border: `1px solid ${includeAlreadySent ? '#fed7aa' : '#e5e7eb'}`, borderRadius: 8, overflow: 'hidden' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                  background: includeAlreadySent ? '#fff7ed' : '#f9fafb',
                }}>
                  <div style={{
                    minWidth: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: includeAlreadySent ? '#FF7A3D' : '#9ca3af',
                    color: '#fff', fontWeight: 900, fontSize: 16,
                  }}>
                    {repeatRecipients.length}
                  </div>
                  <div style={{ flex: 1, fontSize: 14, color: '#1a1a1a' }}>
                    <strong>{plural(repeatRecipients.length, 'адрес', 'адреса', 'адресов')}</strong> уже получали письмо по этой серии
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: step === 'preview' ? 'pointer' : 'default', whiteSpace: 'nowrap' }}>
                    <input
                      type="checkbox"
                      checked={includeAlreadySent}
                      onChange={(e) => setIncludeAlreadySent(e.target.checked)}
                      disabled={step !== 'preview'}
                      style={{ width: 15, height: 15 }}
                    />
                    <span style={{ fontSize: 13, fontWeight: 600, color: includeAlreadySent ? '#FF7A3D' : '#555' }}>
                      Включить в рассылку
                    </span>
                  </label>
                  <button onClick={() => setShowRepeat(v => !v)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#888', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {showRepeat ? '▲ Скрыть' : '▼ Список'}
                  </button>
                </div>
                {showRepeat && (
                  <div style={{ maxHeight: 180, overflowY: 'auto', background: '#fff', padding: '8px 14px' }}>
                    {repeatRecipients.map((r) => (
                      <div key={r.orderId} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #f0f0f0', fontSize: 13 }}>
                        <span>{r.email}</span>
                        <span style={{ color: '#aaa', marginLeft: 12, whiteSpace: 'nowrap' }}>
                          последнее письмо {r.sentAt ? formatDate(r.sentAt) : '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Итог */}
            {step === 'preview' && (
              <div style={{ fontSize: 13, color: '#5A4F45', paddingLeft: 4 }}>
                Итого будет отправлено: <strong style={{ color: '#FF7A3D' }}>{activeRecipients.length}</strong> писем
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Шаг 2: редактирование письма ── */}
      {(step === 'preview' || step === 'sending' || step === 'done') && activeRecipients.length > 0 && (
        <>
          <div style={CARD}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#555', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Шаг 2 — Письмо
            </div>

            {/* Шаблоны */}
            <div style={{ marginBottom: 20, background: '#f9fafb', borderRadius: 10, padding: '12px 14px', border: '1px solid #e5e7eb' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
                📋 Шаблоны писем
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <select
                  value={selectedTemplateId}
                  onChange={e => handleLoadTemplate(e.target.value)}
                  disabled={step !== 'preview' || templates.length === 0}
                  style={{ ...INPUT, flex: 1, minWidth: 180, background: '#fff', fontSize: 13 }}
                >
                  <option value="">{templates.length === 0 ? '— нет сохранённых шаблонов —' : '— выбрать шаблон —'}</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                {selectedTemplateId && step === 'preview' && (
                  <button
                    type="button"
                    onClick={() => handleDeleteTemplate(selectedTemplateId)}
                    title="Удалить шаблон"
                    style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '7px 12px', fontSize: 13, color: '#dc2626', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}
                  >
                    🗑 Удалить
                  </button>
                )}
                {step === 'preview' && !showSaveForm && (
                  <button
                    type="button"
                    onClick={() => setShowSaveForm(true)}
                    style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '7px 12px', fontSize: 13, color: '#555', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}
                  >
                    💾 Сохранить как шаблон
                  </button>
                )}
              </div>
              {showSaveForm && step === 'preview' && (
                <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="text"
                    value={saveTemplateName}
                    onChange={e => setSaveTemplateName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSaveTemplate()}
                    placeholder="Название шаблона, например: Серия 1 — follow-up"
                    autoFocus
                    style={{ ...INPUT, flex: 1, fontSize: 13 }}
                  />
                  <button
                    type="button"
                    onClick={handleSaveTemplate}
                    disabled={!saveTemplateName.trim()}
                    style={{ background: saveTemplateName.trim() ? '#FF7A3D' : '#ffb899', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: saveTemplateName.trim() ? 'pointer' : 'not-allowed', whiteSpace: 'nowrap' }}
                  >
                    Сохранить
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowSaveForm(false); setSaveTemplateName(''); }}
                    style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: 20, padding: '0 4px' }}
                  >
                    ×
                  </button>
                </div>
              )}
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

          {/* ── Тест-отправка ── */}
          {step === 'preview' && (
            <div style={{ ...CARD, background: '#f9fafb', border: '1px solid #e5e7eb' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#555', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                📧 Тест-отправка
              </div>
              <div style={{ fontSize: 13, color: '#888', marginBottom: 12 }}>
                Отправьте себе одно письмо с темой «[ТЕСТ] …», чтобы убедиться, что оно приходит и выглядит правильно.
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="email"
                  value={testEmail}
                  onChange={e => { setTestEmail(e.target.value); setTestResult(null); }}
                  placeholder="ваш@email.ru"
                  style={{ ...INPUT, flex: 1 }}
                />
                <button
                  type="button"
                  onClick={handleTestSend}
                  disabled={testSending || !testEmail.trim() || !letterBody.trim()}
                  style={{
                    background: testSending ? '#e5e7eb' : '#4b5563',
                    color: '#fff', border: 'none', borderRadius: 8,
                    padding: '9px 18px', fontSize: 13, fontWeight: 700,
                    cursor: (testSending || !testEmail.trim()) ? 'not-allowed' : 'pointer',
                    whiteSpace: 'nowrap', flexShrink: 0,
                  }}
                >
                  {testSending ? 'Отправляем...' : 'Отправить тест'}
                </button>
              </div>
              {testResult === 'ok' && (
                <div style={{ marginTop: 10, fontSize: 13, color: '#16a34a', fontWeight: 600 }}>
                  ✅ Тестовое письмо отправлено на {testEmail} — проверьте почту
                </div>
              )}
              {testResult === 'error' && (
                <div style={{ marginTop: 10, fontSize: 13, color: '#dc2626' }}>
                  ❌ {testError}
                </div>
              )}
            </div>
          )}

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
                Отправить {plural(activeRecipients.length, 'письмо', 'письма', 'писем')}
              </button>
            </div>
          )}

          {step === 'sending' && (
            <div style={{ ...CARD, background: '#FFF8F3', border: '1px solid #F0E4D6', textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>📨</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#1a1a1a' }}>Отправляем письма...</div>
              <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>Не закрывайте страницу</div>
            </div>
          )}

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
      </>)}
    </div>
  );
}
