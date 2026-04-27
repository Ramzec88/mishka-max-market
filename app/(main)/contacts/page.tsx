import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Контакты — Маркет Мишки Макса',
};

export default function ContactsPage() {
  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '48px 24px 80px' }}>
      <h1 style={{ fontSize: 32, fontWeight: 900, marginBottom: 32 }}>Контакты и реквизиты</h1>

      <div
        style={{
          background: '#fff',
          borderRadius: 'var(--radius-lg)',
          padding: 32,
          boxShadow: 'var(--shadow-sm)',
          marginBottom: 24,
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 16 }}>Реквизиты ИП</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            {[
              ['Наименование', 'ИП Васюков Алексей Игоревич'],
              ['Сокращённое', 'ИП Васюков А.И.'],
              ['ИНН', '320203526914'],
              ['ОГРНИП', '321325600053361'],
              ['Дата регистрации ОГРНИП', '01.12.2021'],
['Налоговый режим', 'УСН'],
            ].map(([label, value]) => (
              <tr key={label} style={{ borderBottom: '1px solid var(--border)' }}>
                <td
                  style={{
                    padding: '12px 0',
                    fontSize: 14,
                    color: 'var(--ink-soft)',
                    width: '40%',
                    fontWeight: 600,
                  }}
                >
                  {label}
                </td>
                <td style={{ padding: '12px 0', fontSize: 14, fontWeight: 700 }}>{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div
        style={{
          background: '#fff',
          borderRadius: 'var(--radius-lg)',
          padding: 32,
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 16 }}>Связаться с нами</h2>
        <p style={{ color: 'var(--ink-soft)', lineHeight: 1.7, marginBottom: 12 }}>
          По вопросам заказов, возвратов и технической поддержки:
        </p>
        <a
          href="mailto:info@mishka-max.ru"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: 'var(--orange)',
            color: '#fff',
            padding: '12px 24px',
            borderRadius: 100,
            fontWeight: 700,
            fontSize: 15,
          }}
        >
          ✉️ info@mishka-max.ru
        </a>
        <p style={{ color: 'var(--ink-soft)', fontSize: 13, marginTop: 12, lineHeight: 1.5 }}>
          Отвечаем в течение 24 часов в рабочие дни.
        </p>
      </div>
    </div>
  );
}
