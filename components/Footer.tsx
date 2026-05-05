import Link from 'next/link';

const SOCIALS = [
  {
    href: 'https://t.me/+7-oGjM-AgbcxNWQ6',
    label: 'Telegram',
    color: '#29A8E0',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.941z"/>
      </svg>
    ),
  },
  {
    href: 'https://max.ru/mishka_max',
    label: 'Max',
    color: '#FF7A3D',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.5 14h-2l-2.5-4-2.5 4h-2l3.5-5.5L7.5 5h2l2.5 3.5L14.5 5h2l-3 5.5L16.5 16z"/>
      </svg>
    ),
  },
  {
    href: 'https://mishka-max.ru/me/',
    label: 'Taplink',
    color: '#6C63FF',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M13 3a1 1 0 1 0-2 0v8H3a1 1 0 1 0 0 2h8v8a1 1 0 1 0 2 0v-8h8a1 1 0 1 0 0-2h-8V3z"/>
      </svg>
    ),
  },
];

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
      {/* Social links */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {SOCIALS.map((s) => (
          <a
            key={s.label}
            href={s.href}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              color: s.color,
              background: `${s.color}14`,
              border: `1.5px solid ${s.color}40`,
              borderRadius: 100,
              padding: '7px 16px',
              fontSize: 13,
              fontWeight: 700,
              textDecoration: 'none',
              transition: 'opacity 0.15s',
            }}
          >
            {s.icon}
            {s.label}
          </a>
        ))}
      </div>

      <p>© 2026 ИП Васюков А.И. · ИНН 320203526914</p>
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
