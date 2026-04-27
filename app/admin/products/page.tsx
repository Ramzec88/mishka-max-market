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

const COVER_BG: Record<string, string> = {
  orange: 'linear-gradient(135deg,#FFE4D1,#FFCBA8)',
  lavender: 'linear-gradient(135deg,#E8E0F5,#D4C7ED)',
  green: 'linear-gradient(135deg,#E0F2E4,#C7E8CF)',
  blue: 'linear-gradient(135deg,#E0EBF5,#C7DAED)',
};

function isInShowcase(p: Product) {
  return p.badge !== null || p.category === 'bundles';
}

export default async function AdminProductsPage() {
  const products = await getProducts();

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: '#1a1a1a' }}>Товары</h1>
          <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
            Всего: {products.length} · Активных: {products.filter(p => p.is_active).length} · В витрине: {products.filter(isInShowcase).length}
          </div>
        </div>
        <Link
          href="/admin/products/new"
          style={{ background: '#FF7A3D', color: '#fff', padding: '10px 20px', borderRadius: 8, fontWeight: 700, fontSize: 14, textDecoration: 'none' }}
        >
          + Добавить товар
        </Link>
      </div>

      {/* Hint about showcase */}
      <div style={{ background: '#fffbf5', border: '1px solid #fed7aa', borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: '#92400e' }}>
        ⭐ В секцию <strong>«Популярное»</strong> попадают товары с бейджем (хит / новинка / выгодно) и все <strong>Комплекты</strong>. Показывается первые 5.
      </div>

      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        {products.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>Товаров пока нет</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                {['', 'Название', 'Категория', 'Цена', 'Порядок / Файлы', 'Статус', 'Действия'].map(h => (
                  <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#666', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} style={{ borderBottom: '1px solid #f0f0f0' }}>

                  {/* Thumbnail */}
                  <td style={{ padding: '12px 8px 12px 14px', width: 52 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 8, overflow: 'hidden', flexShrink: 0,
                      background: COVER_BG[product.cover_variant] || COVER_BG.orange,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
                    }}>
                      {product.cover_emoji || '📦'}
                    </div>
                  </td>

                  {/* Title + badge + ID */}
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

                  {/* Category */}
                  <td style={{ padding: '12px 14px', fontSize: 13, color: '#555', whiteSpace: 'nowrap' }}>
                    {CATEGORY_LABELS[product.category] || product.category}
                  </td>

                  {/* Price */}
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

                  {/* Sort order + files */}
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ fontSize: 13, color: '#555' }}>#{product.sort_order}</div>
                    <div style={{ fontSize: 11, color: product.storage_paths.length > 0 ? '#16a34a' : '#aaa', marginTop: 2 }}>
                      {product.storage_paths.length > 0
                        ? `📎 ${product.storage_paths.length} файл${product.storage_paths.length === 1 ? '' : product.storage_paths.length < 5 ? 'а' : 'ов'}`
                        : '— нет файлов'}
                    </div>
                  </td>

                  {/* Status */}
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

                  {/* Actions */}
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <Link href={`/admin/products/${product.id}`}
                        style={{ fontSize: 13, fontWeight: 600, color: '#FF7A3D', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                        Изменить
                      </Link>
                      {product.is_active && <DeactivateButton productId={product.id} />}
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
