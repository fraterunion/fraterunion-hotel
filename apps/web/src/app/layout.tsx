export const metadata = { title: 'FraterUnion Hotel Web', description: 'Public hotel booking website' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en"><body style={{ fontFamily: 'Arial, sans-serif', margin: 0, padding: 24 }}>{children}</body></html>
  );
}
