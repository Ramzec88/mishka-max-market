import type { Metadata } from 'next';
import { Nunito } from 'next/font/google';
import './globals.css';

const nunito = Nunito({
  subsets: ['cyrillic', 'latin'],
  weight: ['400', '600', '700', '800', '900'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Маркет Мишки Макса — песни, сценарии, материалы для детей',
  description:
    'Готовые материалы для детских праздников, развивающих занятий и утренников. Мгновенная отправка на email после оплаты.',
  openGraph: {
    title: 'Маркет Мишки Макса',
    description: 'Готовые материалы для утренников и детских праздников',
    locale: 'ru_RU',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className={nunito.className}>{children}</body>
    </html>
  );
}
