'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle2, 
  ChevronDown, 
  Building2, 
  Code2, 
  ShieldCheck,
  ArrowRight
} from 'lucide-react';
import { PLANS } from '@/lib/plans';
import { GUARDRAIL } from '@/lib/site';
import { HeroValidator } from './HeroValidator';
import { WorkflowTerminal } from './WorkflowTerminal';
import { ContactGuarantees } from './ContactGuarantees';
import { AuthModal } from './AuthModal';

const WHO_ITS_FOR = [
  {
    icon: Code2,
    title: 'SaaS & ERP Vendors',
    description: 'Embed preflight UBL 2.1 and PINT AE validation directly into your billing pipeline before transmitting to ASPs.',
  },
  {
    icon: Building2,
    title: 'Enterprise Accounting Teams',
    description: 'Catch TRN formatting errors, tax breakdown discrepancies, and arithmetic mismatches in high-volume batch runs.',
  },
  {
    icon: ShieldCheck,
    title: 'Tax Consultants & Auditors',
    description: 'Provide clients with deterministic preflight verification reports before official FTA submission windows close.',
  },
];

const FAQS = [
  {
    q: 'Is einvoicecheck.ae an FTA-accredited Service Provider (ASP)?',
    a: 'No. einvoicecheck.ae provides standalone, deterministic preflight validation. It checks your XML/JSON against UBL 2.1 and PINT AE specifications before you submit to an accredited provider.',
  },
  {
    q: 'Does my invoice payload leave my server or get stored?',
    a: 'Validation checks occur via stateless API calls or client-side web tools. Invoice payloads are processed in-memory and are never written to database records or persistent storage.',
  },
  {
    q: 'How does rate limiting work on the free trial?',
    a: 'The free trial includes 100 validations per month capped at 10 requests per minute. Upgrading to Starter or Pro increases throughput instantly.',
  },
  {
    q: 'What invoice formats are supported?',
    a: 'We support official UBL 2.1 XML, PINT AE XML structures, and our canonical JSON schema representation.',
  },
];

export default function HomeClient() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('signup');

  const triggerAuth = (mode: 'login' | 'signup') => {
    setAuthMode(mode);
    setAuthOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#0B0F14] text-[#E8EEF5] space-y-16 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      
      {/* 1. Hero Header Section */}
      <section className="text-center max-w-3xl mx-auto space-y-6 pt-4">
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
          Validate UAE E-Invoices <br className="hidden sm:inline" />
          <span className="text-cyan-400">Before Your ASP Does</span>
        </h1>
        <p className="text-slate-400 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
          Catch TRN formatting errors, VAT calculation discrepancies, and line item mismatches instantly. 47+ deterministic rules built for PINT AE & UBL 2.1.
        </p>
        <div className="pt-2 flex flex-col items-center gap-3">
          <button
            onClick={() => triggerAuth('signup')}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-sm transition-all shadow-lg shadow-cyan-500/20"
          >
            Get Free API Key <ArrowRight className="w-4 h-4" />
          </button>
          <p className="text-xs text-slate-500">
            Standalone preflight validator • Not FTA-accredited
          </p>
        </div>
      </section>

      {/* 2. Interactive Hero Validator Box */}
      <section className="max-w-4xl mx-auto bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-2xl">
        <HeroValidator onOpenAuth={() => triggerAuth('signup')} />
      </section>

      {/* 3. Interactive Workflow Terminal */}
      <section className="max-w-4xl mx-auto">
        <WorkflowTerminal />
      </section>

      {/* 4. Who It's For (Strict 3-Column Grid) */}
      <section className="space-y-8 max-w-6xl mx-auto">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100">
            Built for UAE Systems & Tech Teams
          </h2>
          <p className="text-slate-400 text-sm">
            Deterministic validation tailored for software engineers and finance operators.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {WHO_ITS_FOR.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div 
                key={idx}
                className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-6 flex flex-col justify-start hover:border-slate-700 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-cyan-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-100 mb-2">{item.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{item.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* 5. Social Proof Metrics (Strict 4-Column Grid) */}
      <section className="border-y border-slate-800/80 bg-slate-900/30 py-8 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center max-w-5xl mx-auto">
          <div className="space-y-1">
            <div className="text-2xl sm:text-3xl font-bold text-cyan-400">47</div>
            <div className="text-[11px] uppercase tracking-wider text-slate-400">Deterministic Rules</div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl sm:text-3xl font-bold text-cyan-400">PINT AE</div>
            <div className="text-[11px] uppercase tracking-wider text-slate-400">Specification Checked</div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl sm:text-3xl font-bold text-cyan-400">&lt;50ms</div>
            <div className="text-[11px] uppercase tracking-wider text-slate-400">Engine Latency</div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl sm:text-3xl font-bold text-cyan-400">0</div>
            <div className="text-[11px] uppercase tracking-wider text-slate-400">Persistent Storage</div>
          </div>
        </div>
      </section>

      {/* 6. Pricing Grid (Strict 3-Column Grid) */}
      <section className="space-y-8 max-w-5xl mx-auto" id="pricing">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100">
            Simple, Transparent Pricing
          </h2>
          <p className="text-slate-400 text-sm">
            No mandatory enterprise sales calls. Start in 60 seconds.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {/* Trial */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 flex flex-col justify-between">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-100">{PLANS.trial.name}</h3>
              <div className="text-3xl font-bold text-slate-100">{PLANS.trial.priceLabel}</div>
              <p className="text-xs text-slate-400">No credit card required</p>

              <ul className="space-y-2.5 text-xs text-slate-300 pt-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                  {PLANS.trial.monthlyQuota} validations / mo
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                  {PLANS.trial.rateLimitPerMinute} req / min rate limit
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                  Full 47-rule validation engine
                </li>
              </ul>
            </div>
            <button 
              onClick={() => triggerAuth('signup')} 
              className="mt-6 w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-semibold rounded-lg transition-colors"
            >
              Get Started Free
            </button>
          </div>

          {/* Starter */}
          <div className="bg-slate-900/90 border-2 border-cyan-500/60 rounded-xl p-6 flex flex-col justify-between relative shadow-xl shadow-cyan-500/10">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-cyan-500 text-slate-950 text-[10px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wider">
              Most Popular
            </div>
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-100">{PLANS.starter.name}</h3>
              <div className="text-3xl font-bold text-slate-100">{PLANS.starter.priceLabel}<span className="text-xs font-normal text-slate-400">/mo</span></div>
              <p className="text-xs text-slate-400">Production access</p>

              <ul className="space-y-2.5 text-xs text-slate-300 pt-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                  {PLANS.starter.monthlyQuota.toLocaleString()} validations / mo
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                  {PLANS.starter.rateLimitPerMinute} req / min rate limit
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                  API Key management dashboard
                </li>
              </ul>
            </div>
            <button 
              onClick={() => triggerAuth('signup')} 
              className="mt-6 w-full py-2.5 px-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-semibold rounded-lg transition-colors"
            >
              Start Starter Plan
            </button>
          </div>

          {/* Pro */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 flex flex-col justify-between">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-100">{PLANS.pro.name}</h3>
              <div className="text-3xl font-bold text-slate-100">{PLANS.pro.priceLabel}<span className="text-xs font-normal text-slate-400">/mo</span></div>
              <p className="text-xs text-slate-400">High volume ERPs</p>

              <ul className="space-y-2.5 text-xs text-slate-300 pt-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                  {PLANS.pro.monthlyQuota.toLocaleString()} validations / mo
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                  {PLANS.pro.rateLimitPerMinute} req / min rate limit
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                  Priority API routing
                </li>
              </ul>
            </div>
            <button 
              onClick={() => triggerAuth('signup')} 
              className="mt-6 w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-semibold rounded-lg transition-colors"
            >
              Start Pro Plan
            </button>
          </div>
        </div>
      </section>

      {/* 7. Guarantees */}
      <section className="max-w-4xl mx-auto">
        <ContactGuarantees />
      </section>

      {/* 8. FAQ Accordion */}
      <section className="max-w-2xl mx-auto space-y-6">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100 text-center">
          Frequently Asked Questions
        </h2>
        <div className="space-y-3">
          {FAQS.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div 
                key={idx} 
                className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full px-5 py-3.5 text-left flex items-center justify-between text-slate-200 text-sm font-medium hover:text-white transition-colors"
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="px-5 pb-4 text-slate-400 text-xs leading-relaxed border-t border-slate-800/40 pt-3"
                    >
                      {faq.a}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </section>

      {/* 9. Footer Disclaimer */}
      <footer className="text-center max-w-2xl mx-auto pt-8 border-t border-slate-800/60">
        <p className="text-[11px] text-slate-500 leading-relaxed">
          {GUARDRAIL}
        </p>
      </footer>

      {/* 10. Auth Modal */}
      <AuthModal 
        isOpen={authOpen} 
        mode={authMode} 
        onClose={() => setAuthOpen(false)} 
      />
    </div>
  );
}

