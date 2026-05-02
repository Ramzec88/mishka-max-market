'use client';

import { useState, useEffect, FormEvent } from 'react';

interface PromoCode {
  id: string;
  code: string;
  description: string | null;
  discount_percent: number;
  max_uses: number | null;
  uses_count: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

const INPUT: React.CSSProperties = {
  border: '1px solid #e5e7eb', borderRadius: 8, padding: '9px 13px',
  fontSize: 14, outline: 'none', background: '#fff', width: '100%', boxSizing: 'border-box',
  fontFamily: 'inherit',
};

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

export default function PromoCodesPage() {
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [discountPercent, setDiscountPercent] = useState('0');
  const [maxUses, setMaxUses] = useState('');
  const [expiresAt, setExpiresAt] = useState('');

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/promo-codes');
      const data = await res.json();
      setCodes(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      const res = await fetch('/api/admin/promo-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          description: description || null,
          discount_percent: Number(discountPercent),
          max_uses: maxUses ? Number(maxUses) : null,
          expires_at: expiresAt || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setFormError(data.error || 'Ошибка'); return; }
      setShowForm(false);
      setCode(''); setDescription(''); setDiscountPercent('0'); setMaxUses(''); setExpiresAt('');
      load();
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(id: string, current: boolean) {
    await fetch(`/api/admin/promo-codes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !current }),
    });
    load();
  }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: '#1a1a1a' }}>Промокоды</h1>
          <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
            Активных: {codes.filter(c => c.is_active).length} · Всего: {codes.length}
          </div>
        </div>
        <button
          onClick={() => { setShowForm(v => !v); setFormError(''); }}
          style={{ background: '#FF7A3D', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          {showForm ? 'Отмена' : '+ Создать промокод'}
        </button>
      </div>

      {/* Форма создания */}
      {showForm && (
        <form onSubmit={handleCreate} style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 16, color: '#1a1a1a' }}>Новый промокод</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#666', marginBottom: 5 }}>Код *</label>
              <input value={code} onChange={e => setCode(e.target.value.toUpperCase())} required placeholder="VK10" style={INPUT} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#666', marginBottom: 5 }}>Скидка %</label>
              <input type="number" value={discountPercent} onChange={e => setDiscountPercent(e.target.value)} min={0} max={100} style={INPUT} />
              <div style={{ fontSize: 11, color: '#aaa', marginTop: 3 }}>0 = только отслеживание</div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#666', marginBottom: 5 }}>Лимит использований</label>
              <input type="number" value={maxUses} onChange={e => setMaxUses(e.target.value)} min={1} placeholder="Без ограничений" style={INPUT} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#666', marginBottom: 5 }}>Описание (для себя)</label>
              <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Реклама ВКонтакте" style={INPUT} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#666', marginBottom: 5 }}>Действует до</label>
              <input type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} style={INPUT} />
            </div>
          </div>
          {formError && <div style={{ fontSize: 13, color: '#dc2626', marginBottom: 12 }}>⚠ {formError}</div>}
          <button type="submit" disabled={saving} style={{ background: saving ? '#ffb899' : '#FF7A3D', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontWeight: 700, fontSize: 14, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
            {saving ? 'Создаём...' : 'Создать'}
          </button>
        </form>
      )}

      {/* Таблица */}
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#aaa' }}>Загрузка...</div>
        ) : codes.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#aaa' }}>
            Промокодов пока нет. Создайте первый!
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                {['Код', 'Описание', 'Скидка', 'Использований', 'До', 'Статус', ''].map(h => (
                  <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#666', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {codes.map(c => (
                <tr key={c.id} style={{ borderBottom: '1px solid #f0f0f0', opacity: c.is_active ? 1 : 0.5 }}>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 15, color: '#1a1a1a', letterSpacing: '0.05em' }}>{c.code}</span>
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: 13, color: '#555' }}>{c.description || '—'}</td>
                  <td style={{ padding: '12px 14px', fontWeight: 700, color: c.discount_percent > 0 ? '#16a34a' : '#888' }}>
                    {c.discount_percent > 0 ? `${c.discount_percent}%` : 'Без скидки'}
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: 13 }}>
                    <span style={{ fontWeight: 700, color: c.max_uses !== null && c.uses_count >= c.max_uses ? '#dc2626' : '#1a1a1a' }}>
                      {c.uses_count}
                    </span>
                    {c.max_uses !== null && <span style={{ color: '#aaa' }}> / {c.max_uses}</span>}
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: 13, color: c.expires_at && new Date(c.expires_at) < new Date() ? '#dc2626' : '#555', whiteSpace: 'nowrap' }}>
                    {fmtDate(c.expires_at)}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 100, fontSize: 12, fontWeight: 700, background: c.is_active ? '#dcfce7' : '#f3f4f6', color: c.is_active ? '#16a34a' : '#888' }}>
                      {c.is_active ? 'Активен' : 'Отключён'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <button
                      onClick={() => toggleActive(c.id, c.is_active)}
                      style={{ fontSize: 13, fontWeight: 600, color: c.is_active ? '#dc2626' : '#16a34a', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit' }}
                    >
                      {c.is_active ? 'Отключить' : 'Включить'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
