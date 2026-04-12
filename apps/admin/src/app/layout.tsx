import './globals.css';
import type { Metadata } from 'next';
import { hotelConfig } from '@fraterunion/config';

export const metadata: Metadata = {
  title: `${hotelConfig.hotelShortName} · Admin`,
  description: `Admin console for ${hotelConfig.hotelName}.`,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {process.env.NODE_ENV === 'development' ? (
          <div
            className="pointer-events-none fixed left-0 right-0 top-0 z-[9999] h-1 bg-red-500"
            aria-hidden
            title="Tailwind smoke test — remove from layout.tsx after confirming styles"
          />
        ) : null}
        {children}
      </body>
    </html>
  );
}