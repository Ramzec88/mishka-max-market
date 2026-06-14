import { supabaseAdmin } from '@/lib/supabase/admin';
import ReviewForm from './ReviewForm';

interface Props {
  searchParams: { order?: string; product?: string };
}

export const dynamic = 'force-dynamic';

export default async function ReviewPage({ searchParams }: Props) {
  const { order: orderId, product: productId } = searchParams;

  const baseStyle: React.CSSProperties = {
    minHeight: '100vh',
    background: '#FFFAF4',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    padding: '48px 16px',
    fontFamily: 'Arial, Helvetica, sans-serif',
  };

  const cardStyle: React.CSSProperties = {
    background: '#fff',
    borderRadius: 24,
    padding: '40px 32px',
    maxWidth: 520,
    width: '100%',
    boxShadow: '0 4px 24px rgba(0,0,0,0.07)',
  };

  if (!orderId || !productId) {
    return (
      <div style={baseStyle}>
        <div style={cardStyle}>
          <div style={{ textAlign: 'center', color: '#888' }}>Ссылка недействительна.</div>
        </div>
      </div>
    );
  }

  // Validate order exists and is paid
  const { data: order } = await supabaseAdmin
    .from('orders')
    .select('id, email, items, status')
    .eq('id', orderId)
    .single();

  if (!order || order.status !== 'paid') {
    return (
      <div style={baseStyle}>
        <div style={cardStyle}>
          <div style={{ textAlign: 'center', color: '#888' }}>Заказ не найден или не оплачен.</div>
        </div>
      </div>
    );
  }

  // Check order contains the product (or a bundle that includes it)
  const items: string[] = Array.isArray(order.items) ? order.items : [];
  const { data: bundles } = await supabaseAdmin
    .from('products')
    .select('id')
    .contains('bundle_product_ids', [productId]);
  const bundleIds = (bundles || []).map((b: { id: string }) => b.id);
  const eligible = items.includes(productId) || items.some(id => bundleIds.includes(id));

  if (!eligible) {
    return (
      <div style={baseStyle}>
        <div style={cardStyle}>
          <div style={{ textAlign: 'center', color: '#888' }}>Этот товар не входит в ваш заказ.</div>
        </div>
      </div>
    );
  }

  // Fetch product name
  const { data: product } = await supabaseAdmin
    .from('products')
    .select('title')
    .eq('id', productId)
    .single();

  // Check if already submitted
  const { data: existing } = await supabaseAdmin
    .from('reviews')
    .select('id, rating, body, name')
    .eq('order_id', orderId)
    .eq('product_id', productId)
    .single();

  return (
    <div style={baseStyle}>
      <div style={cardStyle}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{
              width: 44, height: 44, background: '#FF7A3D', borderRadius: '50%',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 900, fontSize: 22,
            }}>М</div>
            <span style={{ fontSize: 20, fontWeight: 900, color: '#1F1B16' }}>Мишка Макс</span>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: '#1F1B16', margin: 0 }}>
            {existing ? 'Изменить отзыв' : 'Оставить отзыв'}
          </h1>
          <p style={{ color: '#888', fontSize: 14, marginTop: 8 }}>
            Ваше мнение помогает другим педагогам
          </p>
        </div>

        {existing ? (
          <div>
            <div style={{
              background: '#FFF8F3', borderRadius: 12, padding: '16px 20px', marginBottom: 24,
              border: '1px solid #FFE4D1',
            }}>
              <div style={{ fontSize: 13, color: '#888', marginBottom: 6 }}>Ваш текущий отзыв</div>
              <div style={{ fontSize: 22, color: '#FF7A3D', marginBottom: 4 }}>
                {'★'.repeat(existing.rating)}{'☆'.repeat(5 - existing.rating)}
              </div>
              {existing.name && <div style={{ fontWeight: 700, fontSize: 14, color: '#1F1B16' }}>{existing.name}</div>}
              {existing.body && <div style={{ fontSize: 14, color: '#5A4F45', marginTop: 4 }}>{existing.body}</div>}
            </div>
            <ReviewForm
              orderId={orderId}
              productId={productId}
              productTitle={product?.title ?? productId}
            />
          </div>
        ) : (
          <ReviewForm
            orderId={orderId}
            productId={productId}
            productTitle={product?.title ?? productId}
          />
        )}
      </div>
    </div>
  );
}
