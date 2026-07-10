import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'InstaDown — Download Instagram Photos & Reels in HD',
  description:
    'Download any public Instagram post, photo, carousel, or Reel in the highest quality. Free, fast, and no login required. Paste the Instagram link and download instantly.',
  keywords:
    'instagram downloader, download instagram reels, download instagram photos, instagram video download, HD instagram download',
  openGraph: {
    title: 'InstaDown — Download Instagram Photos & Reels in HD',
    description: 'Download any public Instagram post in high quality. No login required.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#07070f" />
      </head>
      <body>{children}</body>
    </html>
  );
}
