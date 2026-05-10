import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div style={{
        background: 'linear-gradient(90deg, #4F46E5, #7C3AED)',
        color: '#fff',
        textAlign: 'center',
        padding: '9px 16px',
        fontSize: 13,
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
        </svg>
        Оплата картами Visa / Mastercard не из РФ доступна через Boosty или Lava Top
      </div>
      <Header />
      <main>{children}</main>
      <Footer />
    </>
  );
}
