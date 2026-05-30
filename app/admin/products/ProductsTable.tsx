'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Product } from '@/types/product';
import { getPublicUrl } from '@/lib/storage';
import DeactivateButton from './DeactivateButton';
import CopyLinkButtons from './CopyLinkButtons';

const CATEGORY_LABELS: Record<string, string> = {
  songs: 'Песни',
  scenarios: 'Сценарии',
  materials: 'Материалы',
  bundles: 'Комплекты',
};

const COVER_BG: Record<string, string> = {
  orange: 'linear-gradient(135deg,#FFE4D1,#FFCBA8)',
  lavender: 'linear-gradient(135deg,#E8E0F5,#D4C7ED)',
  green: 'linear-gradient(135deg,#E0F2E4,#C7E8CF)',
  blue: 'linear-gradient(135deg,#E0EBF5,#C7DAED)',
};

function isInShowcase(p: Product) {
  return p.badge !== null || p.category === 'bundles';
}

function ProductRow({ product }: { product: Product }) {
  return (
    <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
      <td style={{ padding: '12px 8px 12px 14px', width: 52 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 8, overflow: 'hidden', flexShrink: 0,
          background: COVER_BG[product.cover_variant] || COVER_BG.orange,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
        }}>
          {product.cover_image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={getPublicUrl(product.cover_image)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            product.cover_emoji || '📦'
          )}
        </div>
      </td>

      <td style={{ padding: '12px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 700, fontSize: 14, color: '#1a1a1a' }}>{product.title}</span>
          {product.badge && (
            <span style={{ background: '#FF7A3D', color: '#fff', borderRadius: 100, padding: '2px 8px', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
              {product.badge}
            </span>
          )}
          {isInShowcase(product) && (
            <span title="Показывается в «Популярном»" style={{ fontSize: 14 }}>⭐</span>
          )}
        </div>
        <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>{product.id}</div>
        {product.format && (
          <div style={{ fontSize: 11, color: '#FF7A3D', marginTop: 1, fontWeight: 600 }}>{product.format}</div>
        )}
      </td>

      <td style={{ padding: '12px 14px', fontSize: 13, color: '#555', whiteSpace: 'nowrap' }}>
        {CATEGORY_LABELS[product.category] || product.category}
      </td>

      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a' }}>
          {(product.price / 100).toLocaleString('ru-RU')} ₽
        </div>
        {product.price_old && (
          <div style={{ fontSize: 11, color: '#aaa', textDecoration: 'line-through' }}>
            {(product.price_old / 100).toLocaleString('ru-RU')} ₽
          </div>
        )}
      </td>

      <td style={{ padding: '12px 14px' }}>
        <div style={{ fontSize: 13, color: '#555' }}>#{product.sort_order}</div>
        <div style={{ fontSize: 11, color: product.storage_paths.length > 0 ? '#16a34a' : '#aaa', marginTop: 2 }}>
          {product.storage_paths.length > 0
            ? `📎 ${product.storage_paths.length} файл${product.storage_paths.length === 1 ? '' : product.storage_paths.length < 5 ? 'а' : 'ов'}`
            : '— нет файлов'}
        </div>
      </td>

      <td style={{ padding: '12px 14px' }}>
        <span style={{
          display: 'inline-block', padding: '3px 10px', borderRadius: 100,
          fontSize: 12, fontWeight: 700,
          background: product.is_active ? '#dcfce7' : '#f3f4f6',
          color: product.is_active ? '#16a34a' : '#888',
        }}>
          {product.is_active ? 'Активен' : 'Скрыт'}
        </span>
      </td>

      <td style={{ padding: '12px 14px' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <Link href={`/admin/products/${product.id}`}
            style={{ fontSize: 13, fontWeight: 600, color: '#FF7A3D', textDecoration: 'none', whiteSpace: 'nowrap' }}>
            Изменить
          </Link>
          {product.is_active && <DeactivateButton productId={product.id} />}
          {product.is_active && <CopyLinkButtons productId={product.id} />}
        </div>
      </td>
    </tr>
  );
}

const TABLE_HEADERS = ['', 'Название', 'Категория', 'Цена', 'Порядок / Файлы', 'Статус', 'Действия'];

function ProductTable({ rows, dimHeaders }: { rows: Product[]; dimHeaders?: boolean }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
          {TABLE_HEADERS.map(h => (
            <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: dimHeaders ? '#aaa' : '#666', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map(p => <ProductRow key={p.id} product={p} />)}
      </tbody>
    </table>
  );
}

export default function ProductsTable({ products }: { products: Product[] }) {
  const [query, setQuery] = useState('');
  const [archiveOpen, setArchiveOpen] = useState(false);

  const q = query.trim().toLowerCase();
  const active = products.filter(p => p.is_active);
  const archived = products.filter(p => !p.is_active);

  const filtered = q ? active.filter(p => p.title.toLowerCase().includes(q)) : active;
  const filteredArchived = q ? archived.filter(p => p.title.toLowerCase().includes(q)) : archived;

  return (
    <>
      <div style={{ marginBottom: 12 }}>
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Поиск по названию..."
          style={{
            width: '100%',
            padding: '10px 14px',
            border: '1.5px solid #e5e7eb',
            borderRadius: 10,
            fontFamily: 'inherit',
            fontSize: 14,
            outline: 'none',
            boxSizing: 'border-box',
            transition: 'border-color 0.2s',
          }}
          onFocus={e => (e.target.style.borderColor = '#FF7A3D')}
          onBlur={e => (e.target.style.borderColor = '#e5e7eb')}
        />
      </div>

      {/* Active products */}
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>
            {q ? 'Ничего не найдено среди активных' : 'Активных товаров пока нет'}
          </div>
        ) : (
          <ProductTable rows={filtered} />
        )}
      </div>

      {/* Archive */}
      {(archived.length > 0) && (
        <div style={{ marginTop: 20 }}>
          <button
            type="button"
            onClick={() => setArchiveOpen(o => !o)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'inherit', padding: '4px 0', marginBottom: 8,
            }}
          >
            <span style={{
              display: 'inline-block', fontSize: 10, color: '#aaa',
              transition: 'transform 0.2s',
              transform: archiveOpen ? 'rotate(90deg)' : 'rotate(0deg)',
            }}>▶</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#aaa' }}>
              Архив — скрытые товары ({filteredArchived.length}{q && filteredArchived.length !== archived.length ? ` из ${archived.length}` : ''})
            </span>
          </button>

          {archiveOpen && (
            <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden', opacity: 0.8 }}>
              {filteredArchived.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: '#aaa', fontSize: 13 }}>Ничего не найдено</div>
              ) : (
                <ProductTable rows={filteredArchived} dimHeaders />
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
