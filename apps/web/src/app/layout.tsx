import './globals.css';
import type { Metadata } from 'next';
import { hotelConfig } from '@fraterunion/config';

export const metadata: Metadata = {
  title: `${hotelConfig.hotelShortName} · Reservas`,
  description: hotelConfig.heroSubtitle,
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
