export const dynamic = 'force-dynamic';

import { unstable_noStore as noStore } from 'next/cache';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase/admin';
import ReviewModerationRow from './ReviewModerationRow';

interface Review {
  id: string;
  order_id: string;
  product_id: string;
  email: string;
  name: string | null;
  rating: number;
  body: string | null;
  is_published: boolean;
  created_at: string;
  products: { title: string } | null;
}

export default async function AdminReviewsPage() {
  noStore();

  const { data } = await supabaseAdmin
    .from('reviews')
    .select('*, products(title)')
    .order('created_at', { ascending: false });

  const reviews = (data || []) as Review[];
  const pending = reviews.filter((r) => !r.is_published);
  const published = reviews.filter((r) => r.is_published);

  const NAV_LINK: React.CSSProperties = {
    fontSize: 14, fontWeight: 600, color: '#FF7A3D', textDecoration: 'none',
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px', fontFamily: 'Arial, Helvetica, sans-serif' }}>
      {/* Nav */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <Link href="/admin/products" style={NAV_LINK}>← Товары</Link>
        <Link href="/admin/orders" style={NAV_LINK}>Заказы</Link>
        <Link href="/admin/followup" style={NAV_LINK}>Рассылки</Link>
      </div>

      <h1 style={{ fontSize: 24, fontWeight: 900, color: '#1a1a1a', marginBottom: 24 }}>
        Отзывы
        {pending.length > 0 && (
          <span style={{
            marginLeft: 10, background: '#FF7A3D', color: '#fff',
            borderRadius: 100, padding: '2px 10px', fontSize: 14, fontWeight: 700,
          }}>
            {pending.length} новых
          </span>
        )}
      </h1>

      {reviews.length === 0 && (
        <div style={{ color: '#888', textAlign: 'center', padding: '48px 0' }}>
          Отзывов пока нет. Они появятся, когда покупатели начнут их оставлять.
        </div>
      )}

      {pending.length > 0 && (
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1a1a1a', marginBottom: 12 }}>
            Ожидают модерации ({pending.length})
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {pending.map((r) => (
              <ReviewModerationRow key={r.id} review={r} />
            ))}
          </div>
        </section>
      )}

      {published.length > 0 && (
        <section>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1a1a1a', marginBottom: 12 }}>
            Опубликованные ({published.length})
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {published.map((r) => (
              <ReviewModerationRow key={r.id} review={r} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
