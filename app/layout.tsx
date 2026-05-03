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
      <body className={nunito.className}>
        {children}
        <Script id="ym-init" strategy="afterInteractive">{`
          window.dataLayer = window.dataLayer || [];
          (function(m,e,t,r,i,k,a){
            m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
            m[i].l=1*new Date();
            for(var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r){return;}}
            k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)
          })(window,document,'script','https://mc.yandex.ru/metrika/tag.js?id=109020798','ym');
          ym(109020798,'init',{
            webvisor: true,
            clickmap: true,
            ecommerce: "dataLayer",
            accurateTrackBounce: true,
            trackLinks: true
          });
        `}</Script>
        <noscript>
          <img src="https://mc.yandex.ru/watch/109020798" style={{position:'absolute',left:-9999}} alt="" />
        </noscript>
      </body>
    </html>
  );
}
