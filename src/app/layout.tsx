import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import './globals.css';

const inter = Inter({ subsets: ['latin'], display: 'swap' });

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: 'Dad Insurance | Life Insurance Made Simple',
  description: 'Get personalized life insurance estimates in under 2 minutes. Compare rates from top-rated carriers.',
  other: {
    'impact-site-verification': '5e19d904-fef6-40fb-b24e-b53aeefd03e2',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="dns-prefetch" href="https://utt.impactcdn.com" />
        <link rel="dns-prefetch" href="https://connect.facebook.net" />
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: 'none' }}
            src="https://www.facebook.com/tr?id=897943992763325&ev=PageView&noscript=1"
            alt=""
          />
        </noscript>
      </head>
      <body className={inter.className}>
        {children}
        <Script
          id="impact-stat"
          strategy="lazyOnload"
          dangerouslySetInnerHTML={{
            __html: `(function(i,m,p,a,c,t){c.ire_o=p;c[p]=c[p]||function(){(c[p].a=c[p].a||[]).push(arguments)};t=a.createElement(m);var z=a.getElementsByTagName(m)[0];t.async=1;t.src=i;z.parentNode.insertBefore(t,z)})('https://utt.impactcdn.com/P-A7018085-61bb-4054-8257-8771b0239f5d1.js','script','impactStat',document,window);impactStat('transformLinks');impactStat('trackImpression');`,
          }}
        />
        <Script
          id="meta-pixel"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','897943992763325');fbq('track','PageView');`,
          }}
        />
      </body>
    </html>
  );
}
