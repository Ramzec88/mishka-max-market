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
    url: 'https://market.mishka-max.ru',
    siteName: 'Маркет Мишки Макса',
    images: [
      {
        url: 'https://market.mishka-max.ru/og.png',
        width: 1200,
        height: 630,
        alt: 'Маркет Мишки Макса — материалы для детских праздников',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Маркет Мишки Макса',
    description: 'Готовые материалы для утренников и детских праздников',
    images: ['https://market.mishka-max.ru/og.png'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className={nunito.className}>{children}</body>
    </html>
  );
}
