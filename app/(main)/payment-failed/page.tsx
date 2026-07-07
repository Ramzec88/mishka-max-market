import Link from 'next/link';

// Robokassa's dashboard forbids query params on a GET-method Fail/Success URL, so unlike
// the other payment providers we can't distinguish success/failure via a query marker on
// /thank-you — instead FailURL is a dedicated static path. Robokassa has no explicit
// "payment failed" webhook either: a declined/abandoned payment never touches our backend,
// so nothing needs to happen server-side here — this page is a pure static message.
export default function PaymentFailedPage() {
  return (
    <div style={{ maxWidth: 520, margin: '80px auto', padding: '0 24px', textAlign: 'center' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>❌</div>
      <h1 style={{ fontSize: 26, fontWeight: 900, marginBottom: 12 }}>Платёж не прошёл</h1>
      <p style={{ color: 'var(--ink-soft)', marginBottom: 8, lineHeight: 1.6 }}>
        Оплата была отменена или отклонена банком. Попробуйте снова или напишите нам.
      </p>
      <p style={{ color: 'var(--ink-soft)', fontSize: 13, marginBottom: 28 }}>
        Остались вопросы?{' '}
        <a href="mailto:info@mishka-max.ru" style={{ color: 'var(--orange)', fontWeight: 700 }}>
          info@mishka-max.ru
        </a>
      </p>
      <Link href="/"
        style={{
          display: 'inline-block', background: 'var(--orange)', color: '#fff',
          padding: '14px 28px', borderRadius: 100, fontWeight: 800, fontSize: 16, textDecoration: 'none',
        }}
      >
        Вернуться в каталог
      </Link>
    </div>
  );
}
