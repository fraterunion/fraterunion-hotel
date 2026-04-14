import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Los Vagones',
  description: 'Los Vagones',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-MX">
      <body>{children}</body>
    </html>
  );
}
