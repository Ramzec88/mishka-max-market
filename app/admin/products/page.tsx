export const dynamic = 'force-dynamic';

import { unstable_noStore as noStore } from 'next/cache';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { Product } from '@/types/product';
import ProductsTable from './ProductsTable';

async function getProducts(): Promise<Product[]> {
  noStore();
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

      <ProductsTable products={products} />
    </div>
  );
}
