import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Chrome } from '@/components/Chrome';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'einvoicecheck.ae — UAE E-Invoice Validation API',
  description: 'Preflight validation engine for UAE PINT AE & UBL 2.1 e-invoices.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-[#0B0F14] text-[#E8EEF5] antialiased min-h-screen w-full`}>
        <Chrome>{children}</Chrome>
      </body>
    </html>
  );
}
