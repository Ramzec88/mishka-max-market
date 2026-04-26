'use client';

import { useState, useRef, ChangeEvent, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Product, Category, CoverVariant } from '@/types/product';

interface Props {
  product?: Product;
}

const LABEL_STYLE: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 600,
  color: '#555',
  marginBottom: 6,
};

const INPUT_STYLE: React.CSSProperties = {
  width: '100%',
  border: '1px solid #e5e7eb',
  borderRadius: 8,
  padding: '9px 13px',
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
  background: '#fff',
};

const FIELD: React.CSSProperties = { marginBottom: 18 };

export default function ProductForm({ product }: Props) {
  const router = useRouter();
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

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
    }
  }

  function removeStoragePath(path: string) {
    setStoragePaths((prev) => prev.filter((p) => p !== path));
  }

  async function uploadFiles(productId: string): Promise<string[]> {
    const keys: string[] = [];
    for (const file of selectedFiles) {
      const res = await fetch('/api/admin/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          fileName: file.name,
          contentType: file.type || 'application/octet-stream',
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `Ошибка получения URL для ${file.name}`);
      }

      const { url, key } = await res.json();

      const putRes = await fetch(url, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
      });

      if (!putRes.ok) {
        throw new Error(`Ошибка загрузки файла ${file.name}`);
      }

      keys.push(key);
    }
    return keys;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const productId = isEdit ? product!.id : id;

      // Upload new files first
      let newKeys: string[] = [];
      if (selectedFiles.length > 0) {
        newKeys = await uploadFiles(productId);
      }

      const allPaths = [...storagePaths, ...newKeys];

      const body = {
        id: productId,
        title,
        description: description || null,
        price: Number(price),
        price_old: priceOld ? Number(priceOld) : null,
        category,
        cover_emoji: coverEmoji || null,
        cover_variant: coverVariant,
        badge: badge || null,
        format: format || null,
        storage_paths: allPaths,
        is_active: isActive,
        sort_order: Number(sortOrder) || 0,
      };

      const url = isEdit ? `/api/admin/products/${productId}` : '/api/admin/products';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Ошибка сохранения');
        return;
      }

      router.push('/admin/products');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          padding: '32px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          maxWidth: 720,
          margin: '0 auto',
        }}
      >
        <h2 style={{ fontSize: 20, fontWeight: 900, color: '#1a1a1a', marginBottom: 28 }}>
          {isEdit ? 'Редактировать товар' : 'Новый товар'}
        </h2>

        {/* ID */}
        <div style={FIELD}>
          <label style={LABEL_STYLE}>ID (slug)</label>
          <input
            type="text"
            value={id}
            onChange={(e) => setId(e.target.value)}
            disabled={isEdit}
            required
            placeholder="songs-graduation"
            style={{ ...INPUT_STYLE, background: isEdit ? '#f9fafb' : '#fff', color: isEdit ? '#888' : '#1a1a1a' }}
          />
        </div>

        {/* Title */}
        <div style={FIELD}>
          <label style={LABEL_STYLE}>Название</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            style={INPUT_STYLE}
          />
        </div>

        {/* Description */}
        <div style={FIELD}>
          <label style={LABEL_STYLE}>Описание</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            style={{ ...INPUT_STYLE, resize: 'vertical' }}
          />
        </div>

        {/* Price row */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 18 }}>
          <div style={{ flex: 1 }}>
            <label style={LABEL_STYLE}>Цена (₽)</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
              min={0}
              step={1}
              placeholder="599"
              style={INPUT_STYLE}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={LABEL_STYLE}>Старая цена (₽, необязательно)</label>
            <input
              type="number"
              value={priceOld}
              onChange={(e) => setPriceOld(e.target.value)}
              min={0}
              step={1}
              placeholder="799"
              style={INPUT_STYLE}
            />
          </div>
        </div>

        {/* Category */}
        <div style={FIELD}>
          <label style={LABEL_STYLE}>Категория</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as Category)}
            style={INPUT_STYLE}
          >
            <option value="songs">Песни</option>
            <option value="scenarios">Сценарии</option>
            <option value="materials">Материалы</option>
            <option value="bundles">Комплекты</option>
          </select>
        </div>

        {/* Cover row */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 18 }}>
          <div style={{ flex: 1 }}>
            <label style={LABEL_STYLE}>Эмодзи обложки</label>
            <input
              type="text"
              value={coverEmoji}
              onChange={(e) => setCoverEmoji(e.target.value)}
              placeholder="🎵"
              style={INPUT_STYLE}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={LABEL_STYLE}>Вариант обложки</label>
            <select
              value={coverVariant}
              onChange={(e) => setCoverVariant(e.target.value as CoverVariant)}
              style={INPUT_STYLE}
            >
              <option value="orange">orange</option>
              <option value="lavender">lavender</option>
              <option value="green">green</option>
              <option value="blue">blue</option>
            </select>
          </div>
        </div>

        {/* Badge */}
        <div style={FIELD}>
          <label style={LABEL_STYLE}>Бейдж</label>
          <select
            value={badge}
            onChange={(e) => setBadge(e.target.value)}
            style={INPUT_STYLE}
          >
            <option value="">— нет —</option>
            <option value="хит">хит</option>
            <option value="новинка">новинка</option>
            <option value="выгодно">выгодно</option>
          </select>
        </div>

        {/* Format */}
        <div style={FIELD}>
          <label style={LABEL_STYLE}>Формат</label>
          <input
            type="text"
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            placeholder="MP3 + тексты"
            style={INPUT_STYLE}
          />
        </div>

        {/* Sort order + is_active row */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 18, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label style={LABEL_STYLE}>Порядок сортировки</label>
            <input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              min={0}
              step={1}
              style={INPUT_STYLE}
            />
          </div>
          <div style={{ flex: 1, paddingBottom: 10 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                style={{ width: 18, height: 18, cursor: 'pointer' }}
              />
              <span style={{ fontSize: 14, fontWeight: 600, color: '#555' }}>Активен</span>
            </label>
          </div>
        </div>

        {/* Files section */}
        <div
          style={{
            borderTop: '1px solid #e5e7eb',
            paddingTop: 24,
            marginTop: 8,
            marginBottom: 24,
          }}
        >
          <label style={{ ...LABEL_STYLE, marginBottom: 12 }}>Файлы товара</label>

          {storagePaths.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 8, fontWeight: 600 }}>
                Текущие файлы:
              </div>
              {storagePaths.map((path) => (
                <div
                  key={path}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 12px',
                    background: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    borderRadius: 6,
                    marginBottom: 6,
                  }}
                >
                  <span style={{ fontSize: 13, color: '#333', wordBreak: 'break-all' }}>
                    {path.split('/').pop() || path}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeStoragePath(path)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#dc2626',
                      fontSize: 16,
                      lineHeight: 1,
                      padding: '0 4px',
                      flexShrink: 0,
                      marginLeft: 8,
                    }}
                    title="Удалить файл"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{
              background: 'transparent',
              border: '1px dashed #d1d5db',
              borderRadius: 8,
              padding: '10px 20px',
              fontSize: 13,
              fontWeight: 600,
              color: '#666',
              cursor: 'pointer',
              width: '100%',
            }}
          >
            + Добавить файлы
          </button>

          {selectedFiles.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 6, fontWeight: 600 }}>
                Выбраны для загрузки:
              </div>
              {selectedFiles.map((f) => (
                <div
                  key={f.name}
                  style={{
                    fontSize: 13,
                    color: '#333',
                    padding: '4px 0',
                    borderBottom: '1px solid #f0f0f0',
                  }}
                >
                  {f.name}
                  <span style={{ marginLeft: 8, color: '#aaa', fontSize: 11 }}>
                    ({(f.size / 1024).toFixed(0)} KB)
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div
            style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#dc2626',
              borderRadius: 8,
              padding: '10px 14px',
              fontSize: 14,
              marginBottom: 20,
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={() => router.push('/admin/products')}
            style={{
              background: 'transparent',
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              padding: '11px 24px',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              color: '#666',
            }}
          >
            Отмена
          </button>
          <button
            type="submit"
            disabled={loading}
            style={{
              background: loading ? '#ffb899' : '#FF7A3D',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '11px 28px',
              fontSize: 14,
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </div>
    </form>
  );
}
