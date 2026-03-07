import type { AppProps } from 'next/app';
import Head from 'next/head';
import { useEffect } from 'react';
import PwaInstallPrompt from '../src/components/PwaInstallPrompt';
import '../src/index.css';

export default function MyApp({ Component, pageProps }: AppProps) {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;

    const onLoad = async () => {
      try {
        await navigator.serviceWorker.register('/service-worker.js', { scope: '/' });
      } catch (error) {
        console.error('Service worker registration failed:', error);
      }
    };

    window.addEventListener('load', onLoad);
    return () => window.removeEventListener('load', onLoad);
  }, []);

  return (
    <>
      <Head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#000000" />
        <meta name="application-name" content="Joestore" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Joestore" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png" />
      </Head>
      <PwaInstallPrompt />
      <Component {...pageProps} />
    </>
  );
}
