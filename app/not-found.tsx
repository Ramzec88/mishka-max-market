import Link from 'next/link';

export default function NotFound() {
  return (
    <div
      style={{
        maxWidth: 600,
        margin: '80px auto',
        padding: '0 24px',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: 80, marginBottom: 16 }}>🧸</div>
      <h1
        style={{
          fontSize: 'clamp(32px, 5vw, 56px)',
          fontWeight: 900,
          letterSpacing: '-0.02em',
          marginBottom: 12,
        }}
      >
        <span style={{ color: 'var(--orange)' }}>404</span>
      </h1>
      <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 12 }}>Страница не найдена</h2>
      <p style={{ color: 'var(--ink-soft)', marginBottom: 32, lineHeight: 1.6 }}>
        Возможно, ссылка устарела или страница была перемещена.
      </p>
      <Link
        href="/"
        style={{
          display: 'inline-block',
          background: 'var(--orange)',
          color: '#fff',
          padding: '14px 32px',
          borderRadius: 100,
          fontWeight: 800,
          fontSize: 16,
        }}
      >
        Вернуться в каталог
      </Link>
    </div>
  );
}
