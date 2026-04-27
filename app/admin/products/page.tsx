export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { Product } from '@/types/product';
import DeactivateButton from './DeactivateButton';

async function getProducts(): Promise<Product[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('products')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error || !data) return [];
    return data as Product[];
  } catch {
    return [];
  }
}

const CATEGORY_LABELS: Record<string, string> = {
  songs: 'Песни',
  scenarios: 'Сценарии',
  materials: 'Материалы',
  bundles: 'Комплекты',
};

export default async function AdminProductsPage() {
  const products = await getProducts();

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 24,
        }}
      >
        <h1 style={{ fontSize: 24, fontWeight: 900, color: '#1a1a1a' }}>Товары</h1>
        <Link
          href="/admin/products/new"
          style={{
            background: '#FF7A3D',
            color: '#fff',
            padding: '10px 20px',
            borderRadius: 8,
            fontWeight: 700,
            fontSize: 14,
            textDecoration: 'none',
          }}
        >
          + Добавить товар
        </Link>
      </div>

      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          overflow: 'hidden',
        }}
      >
        {products.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>
            Товаров пока нет
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <th
                  style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#666', textTransform: 'uppercase' }}
                >
                  Название
                </th>
                <th
                  style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#666', textTransform: 'uppercase' }}
                >
                  Цена (₽)
                </th>
                <th
                  style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#666', textTransform: 'uppercase' }}
                >
                  Категория
                </th>
                <th
                  style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#666', textTransform: 'uppercase' }}
                >
                  Статус
                </th>
                <th
                  style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#666', textTransform: 'uppercase' }}
                >
                  Действия
                </th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr
                  key={product.id}
                  style={{ borderBottom: '1px solid #f0f0f0' }}
                >
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#1a1a1a' }}>
                      {product.cover_emoji && (
                        <span style={{ marginRight: 8 }}>{product.cover_emoji}</span>
                      )}
                      {product.title}
                    </div>
                    <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{product.id}</div>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: 14, color: '#333' }}>
                    {(product.price / 100).toLocaleString('ru-RU')} ₽
                    {product.price_old && (
                      <span style={{ marginLeft: 8, color: '#aaa', textDecoration: 'line-through', fontSize: 12 }}>
                        {(product.price_old / 100).toLocaleString('ru-RU')} ₽
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: 14, color: '#555' }}>
                    {CATEGORY_LABELS[product.category] || product.category}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '3px 10px',
                        borderRadius: 100,
                        fontSize: 12,
                        fontWeight: 700,
                        background: product.is_active ? '#dcfce7' : '#f3f4f6',
                        color: product.is_active ? '#16a34a' : '#888',
                      }}
                    >
                      {product.is_active ? 'Активен' : 'Скрыт'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <Link
                        href={`/admin/products/${product.id}`}
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: '#FF7A3D',
                          textDecoration: 'none',
                        }}
                      >
                        Редактировать
                      </Link>
                      {product.is_active && (
                        <DeactivateButton productId={product.id} />
                      )}
                    </div>
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
