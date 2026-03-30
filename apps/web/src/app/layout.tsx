import type { Metadata } from 'next';

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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
