'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin/login');
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <nav
        style={{
          background: '#fff',
          borderBottom: '1px solid #e5e7eb',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          gap: 24,
          height: 56,
        }}
      >
        <span style={{ fontWeight: 900, fontSize: 17, color: '#1a1a1a', marginRight: 8 }}>
          Мишка Макс — Админ
        </span>
        <Link
          href="/admin/products"
          style={{ fontWeight: 600, fontSize: 14, color: '#FF7A3D', textDecoration: 'none' }}
        >
          Товары
        </Link>
        <Link
          href="/admin/orders"
          style={{ fontWeight: 600, fontSize: 14, color: '#FF7A3D', textDecoration: 'none' }}
        >
          Заказы
        </Link>
        <div style={{ marginLeft: 'auto' }}>
          <button
            onClick={handleLogout}
            style={{
              background: 'transparent',
              border: '1px solid #e5e7eb',
              borderRadius: 6,
              padding: '6px 14px',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              color: '#666',
            }}
          >
            Выйти
          </button>
        </div>
      </nav>
      <div style={{ padding: '24px' }}>{children}</div>
    </div>
  );
}
