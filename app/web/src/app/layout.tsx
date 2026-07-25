import type { Metadata } from "next";
import { Inter, DM_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Chrome } from "@/components/Chrome";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-dm-sans",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  title: "einvoicecheck.ae — UAE E-Invoice Validation API",
  description: "Preflight validation engine for UAE PINT AE & UBL 2.1 e-invoices.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${dmSans.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <Chrome>{children}</Chrome>
      </body>
    </html>
  );
}
