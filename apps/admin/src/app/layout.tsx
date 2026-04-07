import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'FraterUnion Admin',
  description: 'FraterUnion Hotel Admin Panel',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}