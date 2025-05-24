import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '../src/global.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Secrets Agent',
  description: 'Advanced Secrets Management Platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
} 