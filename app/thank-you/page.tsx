import { Suspense } from 'react';
import ThankYouContent from './ThankYouContent';

export default function ThankYouPage() {
  return (
    <Suspense
      fallback={
        <div style={{ maxWidth: 600, margin: '80px auto', padding: '0 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
          <p style={{ color: 'var(--ink-soft)' }}>Загружаем ваш заказ…</p>
        </div>
      }
    >
      <ThankYouContent />
    </Suspense>
  );
}
