import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'FraterUnion Hotel',
  description: 'FraterUnion Hotel Booking Experience',
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