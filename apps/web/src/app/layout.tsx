import './globals.css';
import type { Metadata } from 'next';
import { hotelConfig } from '@fraterunion/config';

export const metadata: Metadata = {
  title: `${hotelConfig.hotelShortName} · Reservas`,
  description: hotelConfig.heroSubtitle,
  icons: {
    icon: [{ url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' }],
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es-MX">
      <body>{children}</body>
    </html>
  );
}
