"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Todo({ children }: { children: string }) {
  return (
    <mark
      style={{
        background: "#fef08a",
        color: "#111827",
        fontWeight: 600,
        padding: "1px 6px",
        borderRadius: 4,
        border: "1px dashed #a16207",
        fontSize: "0.92em",
      }}
    >
      {children}
    </mark>
  );
}

export function GuardrailNotice() {
  return null;
}

const NAVLINKS = [
  { href: "/tools/uae-e-invoice-validator", label: "Validate" },
  { href: "/pricing", label: "Pricing" },
  { href: "/docs", label: "Docs" },
  { href: "/blog", label: "Blog" },
];

export function Chrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLanding = pathname === "/";

  return (
    <div className="app-shell">
      <div className="app-card">
        {isLanding && (
          <div className="bg-layer">
            <div className="bg-gradient"></div>
            <div className="bg-grid"></div>
            <div className="bg-orb bg-orb-1"></div>
            <div className="bg-orb bg-orb-2"></div>
          </div>
        )}

        {/* Navbar */}
        <nav className="navbar">
          <Link href="/" className="nav-brand" style={{ textDecoration: "none" }}>
            <div className="nav-logo">
              <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M32 4L58 18V46L32 60L6 46V18L32 4Z" stroke="#0EA5C4" strokeWidth="1.5" fill="none" />
                <path d="M32 8L54 20V44L32 56L10 44V20L32 8Z" fill="rgba(14,165,196,0.08)" stroke="none" />
                <rect x="21" y="24" width="14" height="2" rx="1" fill="#0EA5C4" opacity="0.6" />
                <rect x="21" y="29" width="22" height="2" rx="1" fill="#0EA5C4" opacity="0.9" />
                <rect x="21" y="34" width="18" height="2" rx="1" fill="#0EA5C4" opacity="0.5" />
                <rect x="21" y="39" width="10" height="2" rx="1" fill="#0EA5C4" opacity="0.8" />
                <path d="M38 32L41 35L47 29" stroke="#0EA5C4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="nav-wordmark">einvoicecheck.ae</span>
          </Link>

          <div className="nav-links">
            {NAVLINKS.map((link) => (
              <Link key={link.href} href={link.href} className="nav-text-link">
                {link.label}
              </Link>
            ))}
            <Link href="/login" className="nav-btn nav-btn-outline btn-cut-border">
              <span>Sign In</span>
            </Link>
            <Link href="/signup" className="nav-btn nav-btn-filled btn-cut">
              Get API Key
            </Link>
          </div>
        </nav>

        {/* Main Content */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {children}
        </div>
      </div>
    </div>
  );
}
