interface LatestReview {
  id: string;
  name: string | null;
  rating: number;
  body: string | null;
  created_at: string;
  product_id: string;
  product_title: string;
}

interface Props {
  reviews: LatestReview[];
}

function StarRating({ rating }: { rating: number }) {
  return (
    <span aria-label={`${rating} из 5`} style={{ fontSize: 14, letterSpacing: 1 }}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} style={{ color: '#FF7A3D' }}>
          {i < rating ? '★' : '☆'}
        </span>
      ))}
    </span>
  );
}

function relativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'сегодня';
  if (days === 1) return 'вчера';
  if (days < 7) return `${days} дн. назад`;
  if (days < 30) return `${Math.floor(days / 7)} нед. назад`;
  if (days < 365) return `${Math.floor(days / 30)} мес. назад`;
  return `${Math.floor(days / 365)} г. назад`;
}

export default function ReviewsFeed({ reviews }: Props) {
  if (!reviews || reviews.length === 0) return null;

  return (
    <section style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px 48px' }}>
      <h2
        style={{
          fontSize: 18,
          fontWeight: 800,
          color: 'var(--ink)',
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        Отзывы покупателей
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-soft)' }}>
          {reviews.length}
        </span>
      </h2>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          maxHeight: 480,
          overflowY: 'auto',
          paddingRight: 4,
        }}
      >
        {reviews.map((review) => (
          <div
            key={review.id}
            style={{
              background: '#fff',
              borderLeft: '3px solid #FF7A3D',
              borderRadius: 10,
              padding: 14,
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            }}
          >
            {/* Product title */}
            {review.product_title && (
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#FF7A3D',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  marginBottom: 6,
                }}
              >
                {review.product_title}
              </div>
            )}

            {/* Meta row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
              <StarRating rating={review.rating} />
              <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>
                {review.name || 'Аноним'}
              </span>
              <span style={{ fontSize: 12, color: 'var(--ink-soft)', marginLeft: 'auto' }}>
                {relativeDate(review.created_at)}
              </span>
            </div>

            {/* Body */}
            {review.body && (
              <p style={{ fontSize: 14, color: 'var(--ink-soft)', lineHeight: 1.55, margin: 0 }}>
                {review.body}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
