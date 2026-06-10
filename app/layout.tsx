import type { Metadata } from 'next';
import { Nunito } from 'next/font/google';
import Script from 'next/script';
import './globals.css';

const nunito = Nunito({
  subsets: ['cyrillic', 'latin'],
  weight: ['400', '600', '700', '800', '900'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Маркет Мишки Макса — цифровые материалы для обучения детей',
  description:
    'Цифровые материалы для обучения с Мишкой Максом. Учим буквы, читаем, развиваемся. Мгновенная отправка на email после оплаты.',
  openGraph: {
    title: 'Маркет Мишки Макса — цифровые материалы для обучения детей',
    description: 'Цифровые материалы для обучения с Мишкой Максом',
    locale: 'ru_RU',
    type: 'website',
    url: 'https://market.mishka-max.ru',
    siteName: 'Маркет Мишки Макса',
    images: [
      {
        url: 'https://market.mishka-max.ru/og.png',
        width: 1200,
        height: 630,
        alt: 'Маркет Мишки Макса — цифровые материалы для обучения детей',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Маркет Мишки Макса — цифровые материалы для обучения детей',
    description: 'Цифровые материалы для обучения с Мишкой Максом',
    images: ['https://market.mishka-max.ru/og.png'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className={nunito.className}>
        {children}
        <Script id="ym-init" strategy="afterInteractive">{`
          (function(m,e,t,r,i,k,a){
            m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
            m[i].l=1*new Date();
            for(var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r){return;}}
            k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)
          })(window,document,'script','https://mc.yandex.ru/metrika/tag.js?id=109020798','ym');
          ym(109020798,'init',{
            webvisor: true,
            clickmap: true,
            ecommerce: true,
            accurateTrackBounce: true,
            trackLinks: true
          });
          window.dataLayer = window.dataLayer || [];
        `}</Script>
        <noscript>
          <img src="https://mc.yandex.ru/watch/109020798" style={{position:'absolute',left:-9999}} alt="" />
        </noscript>
      </body>
    </html>
  );
}
