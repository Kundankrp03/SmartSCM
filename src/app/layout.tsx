import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import Sidebar from '@/components/Sidebar';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'SmartSCM - Smart Inventory & Supply Chain Management',
  description: 'AI-driven demand forecasting, real-time stock levels, supplier rating metrics, and automated system alerts.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body style={bodyContainerStyle}>
        <Sidebar />
        <main style={mainContentStyle}>
          {children}
        </main>
      </body>
    </html>
  );
}

const bodyContainerStyle: React.CSSProperties = {
  display: 'flex',
  minHeight: '100vh',
  width: '100vw',
  background: 'var(--background)',
  overflow: 'hidden',
};

const mainContentStyle: React.CSSProperties = {
  flex: 1,
  height: '100vh',
  overflowY: 'auto',
  padding: '32px',
  display: 'flex',
  flexDirection: 'column',
  gap: '24px',
};
