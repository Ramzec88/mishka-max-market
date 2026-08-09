'use client';

import { useState, useEffect, useRef } from 'react';

interface BannerRow {
  id: string;
  desktop_image_key: string;
  mobile_image_key: string;
  desktop_url: string;
  mobile_url: string;
  link_url: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

const CARD: React.CSSProperties = {
  background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 24, marginBottom: 24,
};
const INPUT: React.CSSProperties = {
  border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '10px 14px', fontSize: 14,
  outline: 'none', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit',
};

async function uploadFile(file: File, key: string): Promise<void> {
  const res = await fetch('/api/admin/upload-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, contentType: file.type || 'application/octet-stream' }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Ошибка получения URL загрузки (${res.status})`);
  }
  const { url } = await res.json();
  const putRes = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
    body: file,
  });
  if (!putRes.ok) throw new Error(`Ошибка загрузки в хранилище: ${putRes.status}`);
}

function extOf(file: File): string {
  return (file.name.split('.').pop() || 'jpg').toLowerCase();
}

export default function BannerManager() {
  const [banners, setBanners] = useState<BannerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');

  const [desktopFile, setDesktopFile] = useState<File | null>(null);
  const [mobileFile, setMobileFile] = useState<File | null>(null);
  const [desktopPreview, setDesktopPreview] = useState<string | null>(null);
  const [mobilePreview, setMobilePreview] = useState<string | null>(null);
  const [linkUrl, setLinkUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [formError, setFormError] = useState('');

  const [busyId, setBusyId] = useState<string | null>(null);

  const desktopInputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);

  async function loadBanners() {
    setLoading(true);
    setListError('');
    try {
      const res = await fetch('/api/admin/banners');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ошибка загрузки списка баннеров');
      setBanners(data);
    } catch (err) {
      setListError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadBanners(); }, []);

  function handleDesktopChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setDesktopFile(file);
    setDesktopPreview(file ? URL.createObjectURL(file) : null);
  }

  function handleMobileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setMobileFile(file);
    setMobilePreview(file ? URL.createObjectURL(file) : null);
  }

  function resetForm() {
    setDesktopFile(null);
    setMobileFile(null);
    setDesktopPreview(null);
    setMobilePreview(null);
    setLinkUrl('');
    if (desktopInputRef.current) desktopInputRef.current.value = '';
    if (mobileInputRef.current) mobileInputRef.current.value = '';
  }

  async function handleAddBanner() {
    setFormError('');
    if (!desktopFile || !mobileFile) {
      setFormError('Загрузите обе картинки — для десктопа (1200×600) и для мобильной версии (900×1200)');
      return;
    }
    setUploading(true);
    try {
      const folder = crypto.randomUUID();
      const desktopKey = `banners/${folder}/desktop.${extOf(desktopFile)}`;
      const mobileKey = `banners/${folder}/mobile.${extOf(mobileFile)}`;

      await uploadFile(desktopFile, desktopKey);
      await uploadFile(mobileFile, mobileKey);

      const res = await fetch('/api/admin/banners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          desktop_image_key: desktopKey,
          mobile_image_key: mobileKey,
          link_url: linkUrl.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ошибка сохранения баннера');

      resetForm();
      await loadBanners();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : String(err));
    } finally {
      setUploading(false);
    }
  }

  async function handleToggleActive(banner: BannerRow) {
    setBusyId(banner.id);
    try {
      const res = await fetch(`/api/admin/banners/${banner.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !banner.is_active }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Ошибка');
      await loadBanners();
    } catch (err) {
      setListError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(banner: BannerRow) {
    if (!confirm('Удалить баннер навсегда? Картинки будут удалены из хранилища.')) return;
    setBusyId(banner.id);
    try {
      const res = await fetch(`/api/admin/banners/${banner.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Ошибка');
      await loadBanners();
    } catch (err) {
      setListError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div style={CARD}>
      <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>🖼️ Баннеры на главной странице</h2>
      <p style={{ fontSize: 13, color: '#888', marginBottom: 16, lineHeight: 1.5 }}>
        Показываются в карусели на главной, сразу после основного приветствия. Точные размеры — десктоп <b>1200×600 px</b> (2:1), мобильная версия <b>900×1200 px</b> (3:4) — картинка меньшего/другого размера подстроится, но без искажений лучше придерживаться этих пропорций.
      </p>

      {/* ── Форма добавления ── */}
      <div style={{ background: '#f9fafb', border: '1px dashed #d1d5db', borderRadius: 10, padding: 16, marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 6 }}>
              Десктоп (1200×600)
            </label>
            {desktopPreview && (
              <img src={desktopPreview} alt="" style={{ width: '100%', aspectRatio: '2/1', objectFit: 'cover', borderRadius: 8, marginBottom: 6, border: '1px solid #e5e7eb' }} />
            )}
            <input ref={desktopInputRef} type="file" accept="image/*" onChange={handleDesktopChange} style={{ fontSize: 12 }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 6 }}>
              Мобильная (900×1200)
            </label>
            {mobilePreview && (
              <img src={mobilePreview} alt="" style={{ width: '100%', maxWidth: 140, aspectRatio: '3/4', objectFit: 'cover', borderRadius: 8, marginBottom: 6, border: '1px solid #e5e7eb' }} />
            )}
            <input ref={mobileInputRef} type="file" accept="image/*" onChange={handleMobileChange} style={{ fontSize: 12 }} />
          </div>
        </div>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 6 }}>
          Ссылка при клике (необязательно)
        </label>
        <input
          type="text"
          value={linkUrl}
          onChange={(e) => setLinkUrl(e.target.value)}
          placeholder="/?product=... или полный https://..."
          style={{ ...INPUT, marginBottom: 12 }}
        />
        {formError && (
          <div style={{ background: '#fee2e2', color: '#dc2626', borderRadius: 8, padding: '8px 12px', fontSize: 13, marginBottom: 12 }}>
            {formError}
          </div>
        )}
        <button
          onClick={handleAddBanner}
          disabled={uploading}
          style={{
            background: uploading ? '#ffb899' : '#FF7A3D', color: '#fff', border: 'none', borderRadius: 8,
            padding: '10px 20px', fontWeight: 700, fontSize: 14, cursor: uploading ? 'not-allowed' : 'pointer',
          }}
        >
          {uploading ? 'Загрузка...' : '+ Добавить баннер'}
        </button>
      </div>

      {/* ── Список баннеров ── */}
      {listError && (
        <div style={{ background: '#fee2e2', color: '#dc2626', borderRadius: 8, padding: '8px 12px', fontSize: 13, marginBottom: 12 }}>
          {listError}
        </div>
      )}
      {loading ? (
        <p style={{ fontSize: 13, color: '#aaa' }}>Загрузка...</p>
      ) : banners.length === 0 ? (
        <p style={{ fontSize: 13, color: '#aaa' }}>Баннеров пока нет</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {banners.map((b) => (
            <div
              key={b.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                border: '1px solid #e5e7eb', borderRadius: 10, padding: 10,
                opacity: b.is_active ? 1 : 0.55,
              }}
            >
              <img src={b.desktop_url} alt="" style={{ width: 90, aspectRatio: '2/1', objectFit: 'cover', borderRadius: 6, flexShrink: 0, background: '#f3f4f6' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>
                  {b.is_active ? '✅ Показывается' : '🚫 Скрыт'}
                </div>
                <div style={{ fontSize: 12, color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {b.link_url ? `Ссылка: ${b.link_url}` : 'Без ссылки'}
                </div>
              </div>
              <button
                onClick={() => handleToggleActive(b)}
                disabled={busyId === b.id}
                style={{
                  background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8,
                  padding: '7px 12px', fontSize: 12, fontWeight: 600, color: '#555',
                  cursor: busyId === b.id ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap',
                }}
              >
                {b.is_active ? 'Скрыть' : 'Показать'}
              </button>
              <button
                onClick={() => handleDelete(b)}
                disabled={busyId === b.id}
                style={{
                  background: '#fff', border: '1px solid #fecaca', borderRadius: 8,
                  padding: '7px 12px', fontSize: 12, fontWeight: 600, color: '#dc2626',
                  cursor: busyId === b.id ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap',
                }}
              >
                Удалить
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
