'use client';

import React from 'react';
import { Shield, Server, Clock, Lock } from 'lucide-react';

export const ContactGuarantees: React.FC = () => {
  const mode = process.env.NEXT_PUBLIC_SLA_MODE || 'beta';
  const items = [
    { icon: Lock, title: 'Zero Data Retention', desc: 'Invoice payloads are processed in-memory for verification and immediately discarded. No payloads are stored in persistent databases or logs.', color: 'var(--accent)' },
    { icon: Server, title: mode === 'production' ? '99.95% Uptime (SLA)' : '99.7% Uptime (Beta)', desc: mode === 'production' ? 'Monitored via automated probes with public status page.' : 'Monitored via automated probes across database and caching layers.', color: 'var(--success)' },
    { icon: Clock, title: mode === 'production' ? '<50ms P99 Latency' : 'Sub-50ms Latency (Beta)', desc: mode === 'production' ? 'SLA-backed latency from the 99th percentile of all requests.' : 'In-memory rule execution ensures high throughput for CI and real-time ERP exports.', color: 'var(--accent)' },
    { icon: Shield, title: 'SHA-256 Key Security', desc: 'API keys are stored strictly as SHA-256 hashes. Plaintext keys are generated once at initialization and never stored.', color: 'var(--success)' },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
      {items.map((item) => (
        <div key={item.title} className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <item.icon style={{ width: 16, height: 16, color: item.color }} />
            <span style={{ color: item.color, fontWeight: 700, fontSize: 12, fontFamily: 'var(--font-code)' }}>{item.title}</span>
          </div>
          <p className="muted" style={{ margin: 0 }}>{item.desc}</p>
        </div>
      ))}
    </div>
  );
};
