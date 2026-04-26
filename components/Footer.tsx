import Link from 'next/link';

export default function Footer() {
  return (
    <footer
      style={{
        background: '#fff',
        borderTop: '1px solid var(--border)',
        padding: '40px 24px',
        textAlign: 'center',
        color: 'var(--ink-soft)',
        fontSize: 14,
      }}
    >
      <p>© 2026 ИП Роман · ИНН [номер]</p>
      <p style={{ marginTop: 8 }}>
        <Link href="/offer" style={{ color: 'var(--orange)', textDecoration: 'underline' }}>
          Оферта
        </Link>
        {' · '}
        <Link href="/privacy" style={{ color: 'var(--orange)', textDecoration: 'underline' }}>
          Политика конфиденциальности
        </Link>
        {' · '}
        <Link href="/contacts" style={{ color: 'var(--orange)', textDecoration: 'underline' }}>
          Контакты
        </Link>
      </p>
    </footer>
  );
}
