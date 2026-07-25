'use client';

import React from 'react';
import Link from 'next/link';

export function Todo({ children }: { children: string }) {
  return (
    <mark
      className="todo"
      style={{
        background: '#fef08a',
        color: '#111827',
        fontWeight: 600,
        padding: '1px 6px',
        borderRadius: 4,
        border: '1px dashed #a16207',
        fontSize: '0.92em',
      }}
    >
      {children}
    </mark>
  );
}

export function GuardrailNotice() {
  return null;
}

export function SiteHeader() {
  return null;
}

export function SiteFooter() {
  return null;
}

export function Chrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full bg-[#0B0F14] text-[#E8EEF5] flex flex-col">
      {/* Navigation Header */}
      <header className="w-full border-b border-slate-800/80 bg-[#0B0F14]/90 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-lg font-bold text-white tracking-tight">
            <span className="text-cyan-400">einvoicecheck</span>.ae
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
            <Link href="/tools/uae-e-invoice-validator" className="hover:text-white transition-colors">
              Validate
            </Link>
            <Link href="/pricing" className="hover:text-white transition-colors">
              Pricing
            </Link>
            <Link href="/docs" className="hover:text-white transition-colors">
              Docs
            </Link>
            <Link href="/blog" className="hover:text-white transition-colors">
              Blog
            </Link>
          </nav>

          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
              Sign In
            </Link>
            <Link
              href="/signup"
              className="px-4 py-2 rounded-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs transition-colors shadow-sm"
            >
              Start For Free
            </Link>
          </div>
        </div>
      </header>

      {/* Main Page Content */}
      <main className="w-full flex-1">{children}</main>
    </div>
  );
}
