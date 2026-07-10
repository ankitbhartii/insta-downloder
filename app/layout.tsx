import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'InstaDown — Download Instagram Photos & Reels',
  description: 'Download any Instagram post, photo, or Reel in full quality. Free, fast, no login required.',
  keywords: 'instagram downloader, download instagram reels, instagram photo downloader, HD instagram download',
  openGraph: {
    title: 'InstaDown — Download Instagram Photos & Reels',
    description: 'Download any Instagram post in full quality. Free & open source.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#ffffff" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
