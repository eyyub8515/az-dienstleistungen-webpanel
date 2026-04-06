import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AZ Dienstleistungen Support Panel',
  description: 'Internes Support-Panel für AZ Dienstleistungen',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}