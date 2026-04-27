'use client';

import { useState, useRef, ChangeEvent, FormEvent } from 'react';
import { Product, Category, CoverVariant } from '@/types/product';

interface Props {
  product?: Product;
}

const LABEL: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 600, color: '#555', marginBottom: 6,
};
const INPUT: React.CSSProperties = {
  width: '100%', border: '1px solid #e5e7eb', borderRadius: 8,
  padding: '9px 13px', fontSize: 14, outline: 'none', boxSizing: 'border-box', background: '#fff',
};
const CARD: React.CSSProperties = {
  background: '#fff', borderRadius: 12, padding: 24,
  marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
};

// Transliterate + sanitize filename for safe S3 key
function sanitizeFileName(name: string): string {
  const map: Record<string, string> = {
    а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'yo',ж:'zh',з:'z',и:'i',й:'y',
    к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',
    х:'kh',ц:'ts',ч:'ch',ш:'sh',щ:'shch',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya',
  };
  const ext = name.includes('.') ? '.' + name.split('.').pop() : '';
  const base = name.slice(0, name.lastIndexOf('.') === -1 ? name.length : name.lastIndexOf('.'));
  const transliterated = base
    .toLowerCase()
    .split('')
    .map(c => map[c] ?? c)
    .join('')
    .replace(/[^a-z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return (transliterated || 'file') + ext;
}

async function uploadFileXHR(
  url: string,
  file: File,
  contentType: string,
  onProgress: (pct: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.setRequestHeader('Content-Type', contentType);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100);
        resolve();
      } else {
        reject(new Error(`S3 ответил ${xhr.status}: ${xhr.responseText.slice(0, 200)}`));
      }
    };
    xhr.onerror = () => reject(new Error('Сетевая ошибка при загрузке файла'));
    xhr.send(file);
  });
}

async function getUploadUrl(productId: string, fileName: string, contentType: string) {
  const res = await fetch('/api/admin/upload-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId, fileName, contentType }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Ошибка получения URL загрузки (${res.status})`);
  }
  return res.json() as Promise<{ url: string; key: string }>;
}

export default function ProductForm({ product }: Props) {
  const isEdit = Boolean(product);

  const [id, setId] = useState(product?.id ?? '');
  const [title, setTitle] = useState(product?.title ?? '');
  const [description, setDescription] = useState(product?.description ?? '');
  const [price, setPrice] = useState(product ? String(product.price / 100) : '');
  const [priceOld, setPriceOld] = useState(product?.price_old ? String(product.price_old / 100) : '');
  const [category, setCategory] = useState<Category>(product?.category ?? 'songs');
  const [coverEmoji, setCoverEmoji] = useState(product?.cover_emoji ?? '');
  const [coverVariant, setCoverVariant] = useState<CoverVariant>(product?.cover_variant ?? 'orange');
  const [badge, setBadge] = useState(product?.badge ?? '');
  const [format, setFormat] = useState(product?.format ?? '');
  const [sortOrder, setSortOrder] = useState(product ? String(product.sort_order) : '0');
  const [isActive, setIsActive] = useState(product?.is_active ?? true);
  const [storagePaths, setStoragePaths] = useState<string[]>(product?.storage_paths ?? []);
  const [coverImageKey, setCoverImageKey] = useState<string | null>(product?.cover_image ?? null);

  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  // Upload state (only active during submit)
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  function handleCoverChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || e.target.files.length === 0) return;
    const newFiles = Array.from(e.target.files); // capture before input reset
    setSelectedFiles(prev => [...prev, ...newFiles]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function removeNewFile(idx: number) {
    setSelectedFiles(prev => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    setUploadStatus(null);
    setUploadProgress(0);

    try {
      const productId = isEdit ? product!.id : id.trim();
      if (!productId) throw new Error('ID товара обязателен');

      // --- Upload cover ---
      let newCoverKey = coverImageKey;
      if (coverFile) {
        setUploadStatus('Загрузка обложки...');
        setUploadProgress(0);
        const ext = coverFile.name.split('.').pop() || 'jpg';
        const ct = coverFile.type || 'image/jpeg';
        const { url, key } = await getUploadUrl(productId, `cover.${ext}`, ct);
        await uploadFileXHR(url, coverFile, ct, setUploadProgress);
        newCoverKey = key;
      }

      // --- Upload product files ---
      const newFileKeys: string[] = [];
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const safeFileName = sanitizeFileName(file.name);
        const ct = file.type || 'application/octet-stream';
        setUploadStatus(`Загрузка файла ${i + 1} из ${selectedFiles.length}: ${file.name}`);
        setUploadProgress(0);
        const { url, key } = await getUploadUrl(productId, safeFileName, ct);
        await uploadFileXHR(url, file, ct, setUploadProgress);
        newFileKeys.push(key);
      }

      // --- Save to DB ---
      setUploadStatus('Сохранение товара...');
      setUploadProgress(100);

      const body: Record<string, unknown> = {
        id: productId, title,
        description: description || null,
        price: Number(price),
        price_old: priceOld ? Number(priceOld) : null,
        category,
        cover_emoji: coverEmoji || null,
        cover_variant: coverVariant,
        badge: badge || null,
        format: format || null,
        storage_paths: [...storagePaths, ...newFileKeys],
        is_active: isActive,
        sort_order: Number(sortOrder) || 0,
      };
      if (newCoverKey) body.cover_image = newCoverKey;

      const res = await fetch(
        isEdit ? `/api/admin/products/${productId}` : '/api/admin/products',
        { method: isEdit ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Ошибка сохранения (${res.status})`);

      window.location.href = '/admin/products';
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setUploadStatus(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Основное */}
      <div style={CARD}>
        <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 20, color: '#1a1a1a' }}>Основное</h2>

        <div style={{ marginBottom: 18 }}>
          <label style={LABEL}>ID (slug)</label>
          <input type="text" value={id} onChange={e => setId(e.target.value)}
            disabled={isEdit} required placeholder="songs-graduation"
            style={{ ...INPUT, background: isEdit ? '#f9fafb' : '#fff', color: isEdit ? '#888' : '#1a1a1a' }} />
          {!isEdit && <div style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>Только латиница и дефисы. Нельзя изменить после создания.</div>}
        </div>

        <div style={{ marginBottom: 18 }}>
          <label style={LABEL}>Название</label>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} required style={INPUT} />
        </div>

        <div style={{ marginBottom: 18 }}>
          <label style={LABEL}>Описание</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} style={{ ...INPUT, resize: 'vertical' }} />
        </div>

        <div style={{ display: 'flex', gap: 16, marginBottom: 18 }}>
          <div style={{ flex: 1 }}>
            <label style={LABEL}>Цена (₽)</label>
            <input type="number" value={price} onChange={e => setPrice(e.target.value)} required min={0} style={INPUT} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={LABEL}>Старая цена (₽)</label>
            <input type="number" value={priceOld} onChange={e => setPriceOld(e.target.value)} min={0} placeholder="Необязательно" style={INPUT} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <label style={LABEL}>Категория</label>
            <select value={category} onChange={e => setCategory(e.target.value as Category)} style={INPUT}>
              <option value="songs">Песни</option>
              <option value="scenarios">Сценарии</option>
              <option value="materials">Материалы</option>
              <option value="bundles">Комплекты</option>
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={LABEL}>Формат</label>
            <input type="text" value={format} onChange={e => setFormat(e.target.value)} placeholder="MP3 + тексты" style={INPUT} />
          </div>
        </div>
      </div>

      {/* Обложка */}
      <div style={CARD}>
        <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 16, color: '#1a1a1a' }}>Обложка (1:1)</h2>
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
          <div style={{ width: 120, height: 120, borderRadius: 12, overflow: 'hidden', flexShrink: 0, border: '1px solid #e5e7eb', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {coverPreview
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={coverPreview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : coverImageKey
                ? <span style={{ fontSize: 11, color: '#888', textAlign: 'center', padding: 8 }}>Загружено ✓</span>
                : <span style={{ fontSize: 32 }}>🖼️</span>
            }
          </div>
          <div style={{ flex: 1 }}>
            <input ref={coverInputRef} type="file" accept="image/*" onChange={handleCoverChange} style={{ display: 'none' }} />
            <button type="button" onClick={() => coverInputRef.current?.click()}
              style={{ border: '1px dashed #d1d5db', background: 'none', borderRadius: 8, padding: '10px 18px', fontSize: 13, fontWeight: 600, color: '#666', cursor: 'pointer', marginBottom: 8 }}>
              {coverImageKey || coverFile ? 'Заменить обложку' : '+ Выбрать обложку'}
            </button>
            {coverFile && <div style={{ fontSize: 12, color: '#555', marginBottom: 6 }}>✓ {coverFile.name} ({(coverFile.size / 1024).toFixed(0)} КБ)</div>}
            <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={LABEL}>Цвет-заглушка</label>
                <select value={coverVariant} onChange={e => setCoverVariant(e.target.value as CoverVariant)} style={INPUT}>
                  <option value="orange">Оранжевый</option>
                  <option value="lavender">Лавандовый</option>
                  <option value="green">Зелёный</option>
                  <option value="blue">Синий</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={LABEL}>Эмодзи-заглушка</label>
                <input type="text" value={coverEmoji} onChange={e => setCoverEmoji(e.target.value)} placeholder="🎵" style={INPUT} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Оформление */}
      <div style={CARD}>
        <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 16, color: '#1a1a1a' }}>Оформление</h2>
        <div style={{ display: 'flex', gap: 16, marginBottom: 18 }}>
          <div style={{ flex: 1 }}>
            <label style={LABEL}>Бейдж</label>
            <select value={badge} onChange={e => setBadge(e.target.value)} style={INPUT}>
              <option value="">— нет —</option>
              <option value="хит">хит</option>
              <option value="новинка">новинка</option>
              <option value="выгодно">выгодно</option>
            </select>
            <div style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>
              ⭐ Товар с бейджем (или категория «Комплекты») попадает в секцию <strong>«Популярное»</strong> на главной.
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <label style={LABEL}>Порядок</label>
            <input type="number" value={sortOrder} onChange={e => setSortOrder(e.target.value)} min={0} style={INPUT} />
            <div style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>Меньше = выше в списке.</div>
          </div>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
          <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} style={{ width: 18, height: 18 }} />
          <span style={{ fontSize: 14, fontWeight: 600, color: '#555' }}>Активен (показывается в каталоге)</span>
        </label>
      </div>

      {/* Файлы для скачивания */}
      <div style={CARD}>
        <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 16, color: '#1a1a1a' }}>Файлы для скачивания</h2>

        {storagePaths.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Сохранённые в S3
            </div>
            {storagePaths.map((path) => (
              <div key={path} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 6, marginBottom: 6 }}>
                <span style={{ fontSize: 13 }}>✅</span>
                <span style={{ fontSize: 13, color: '#333', flex: 1, wordBreak: 'break-all' }}>{path.split('/').pop() || path}</span>
                <button type="button" onClick={() => setStoragePaths(p => p.filter(x => x !== path))}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: 18, lineHeight: 1, padding: '0 4px', flexShrink: 0 }}>
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {selectedFiles.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Будут загружены при сохранении ({selectedFiles.length} шт.)
            </div>
            {selectedFiles.map((f, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: '#fffbf5', border: '1px solid #fed7aa', borderRadius: 6, marginBottom: 6 }}>
                <span style={{ fontSize: 13 }}>📎</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: '#333', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</div>
                  <div style={{ fontSize: 11, color: '#aaa' }}>{(f.size / 1024 / 1024).toFixed(1)} МБ → {sanitizeFileName(f.name)}</div>
                </div>
                <button type="button" onClick={() => removeNewFile(idx)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: 18, lineHeight: 1, padding: '0 4px', flexShrink: 0 }}>
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <input ref={fileInputRef} type="file" multiple onChange={handleFileChange} style={{ display: 'none' }} />
        <button type="button" onClick={() => fileInputRef.current?.click()}
          style={{ background: 'transparent', border: '1px dashed #d1d5db', borderRadius: 8, padding: '12px 20px', fontSize: 13, fontWeight: 600, color: '#666', cursor: 'pointer', width: '100%' }}>
          + Добавить файлы для скачивания
        </button>
        <div style={{ fontSize: 11, color: '#aaa', marginTop: 6 }}>
          MP3, PDF и др. Имена с кириллицей переводятся автоматически.
        </div>
      </div>

      {/* Upload progress (visible only during save) */}
      {uploadStatus && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #fed7aa' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#333', marginBottom: 10 }}>{uploadStatus}</div>
          <div style={{ width: '100%', height: 8, background: '#f0f0f0', borderRadius: 100, overflow: 'hidden' }}>
            <div style={{ width: `${uploadProgress}%`, height: '100%', background: '#FF7A3D', transition: 'width 0.3s ease', borderRadius: 100 }} />
          </div>
          <div style={{ fontSize: 12, color: '#aaa', marginTop: 4, textAlign: 'right' }}>{uploadProgress}%</div>
        </div>
      )}

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 8, padding: '14px 16px', fontSize: 14, marginBottom: 16, lineHeight: 1.5 }}>
          <strong>Ошибка:</strong> {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
        <button type="button" onClick={() => { window.location.href = '/admin/products'; }} disabled={loading}
          style={{ background: 'transparent', border: '1px solid #e5e7eb', borderRadius: 8, padding: '11px 24px', fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', color: '#666' }}>
          Отмена
        </button>
        <button type="submit" disabled={loading}
          style={{ background: loading ? '#ffb899' : '#FF7A3D', color: '#fff', border: 'none', borderRadius: 8, padding: '11px 28px', fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', minWidth: 140 }}>
          {loading ? 'Подождите...' : 'Сохранить'}
        </button>
      </div>
    </form>
  );
}
