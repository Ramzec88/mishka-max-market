'use client';

import { useState } from 'react';

export default function SettingsPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  async function handleTestEmail(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/admin/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: email }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult({ ok: true, message: `✓ Письмо отправлено на ${email}` });
      } else {
        setResult({ ok: false, message: `Ошибка: ${data.error}${data.config ? ` (SMTP: ${JSON.stringify(data.config)})` : ''}` });
      }
    } catch {
      setResult({ ok: false, message: 'Ошибка сети' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 640, margin: '40px auto', padding: '0 24px', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Настройки</h1>
      <p style={{ color: '#888', marginBottom: 32, fontSize: 14 }}>Диагностика и проверка работы сервисов</p>

      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 24, marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>📧 Проверка SMTP-почты</h2>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 16, lineHeight: 1.5 }}>
          Отправит тестовое письмо, чтобы убедиться что почтовый сервер настроен корректно.
          Если письмо не пришло — проверьте переменные окружения <code>SMTP_HOST</code>, <code>SMTP_PORT</code>,{' '}
          <code>SMTP_USER</code>, <code>SMTP_PASSWORD</code>, <code>SMTP_FROM</code>.
        </p>
        <form onSubmit={handleTestEmail} style={{ display: 'flex', gap: 10 }}>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Ваш email для теста"
            required
            style={{
              flex: 1, padding: '10px 14px', borderRadius: 8,
              border: '1.5px solid #e5e7eb', fontSize: 14, fontFamily: 'inherit',
              outline: 'none',
            }}
          />
          <button
            type="submit"
            disabled={loading}
            style={{
              background: loading ? '#ffb899' : '#FF7A3D', color: '#fff',
              border: 'none', borderRadius: 8, padding: '10px 20px',
              fontWeight: 700, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', whiteSpace: 'nowrap',
            }}
          >
            {loading ? 'Отправка...' : 'Отправить тест'}
          </button>
        </form>

        {result && (
          <div style={{
            marginTop: 12, padding: '10px 14px', borderRadius: 8, fontSize: 13,
            background: result.ok ? '#dcfce7' : '#fee2e2',
            color: result.ok ? '#166534' : '#dc2626',
            wordBreak: 'break-all',
          }}>
            {result.message}
          </div>
        )}
      </div>

      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>📋 Что проверить если письма не приходят</h2>
        <ol style={{ fontSize: 13, color: '#555', lineHeight: 2, paddingLeft: 20, margin: 0 }}>
          <li>Нажмите «Отправить тест» выше — если ошибка, значит SMTP не настроен</li>
          <li>В Vercel / хостинге проверьте переменные: <code>SMTP_HOST</code>, <code>SMTP_PORT</code>, <code>SMTP_USER</code>, <code>SMTP_PASSWORD</code></li>
          <li>В списке заказов смотрите колонку «Письмо» — если «— не отправлено», значит вебхук не смог отправить</li>
          <li>На странице заказа нажмите «📧 Отправить письмо повторно» — письмо уйдёт сразу</li>
          <li>Если SMTP работает но письма всё равно не доходят — проверьте SPF/DKIM записи домена отправителя</li>
        </ol>
      </div>
    </div>
  );
}
