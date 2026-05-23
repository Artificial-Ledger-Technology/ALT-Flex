import type { Metadata } from 'next';
import { Inter, Outfit } from 'next/font/google';
import '../styles/globals.css';

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'AltFlex AEGIS v3.0',
  description:
    'Adaptive Exploit & Governance Intelligence System — Dual-engine Web3 security intelligence platform',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable}`} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
