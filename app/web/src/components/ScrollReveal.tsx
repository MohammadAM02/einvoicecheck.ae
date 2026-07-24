'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  threshold?: number;
}

export function ScrollReveal({
  children,
  className = '',
  delay = 0,
  threshold = 0.1,
}: ScrollRevealProps) {
  const [isRevealed, setIsRevealed] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsRevealed(true);
          observer.unobserve(el);
        }
      },
      { threshold, rootMargin: '0px 0px -40px 0px' },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return (
    <div
      ref={ref}
      className={`scroll-reveal${delay ? ` delay-${delay}` : ''} ${className}${isRevealed ? ' revealed' : ''}`}
      style={delay ? { transitionDelay: `${delay * 100}ms` } : undefined}
    >
      {children}
    </div>
  );
}

/**
 * FAQ accordion component.
 * Pass an array of { q, a } and get an interactive accordion.
 */
export function FaqAccordion({
  items,
}: {
  items: { q: string; a: ReactNode }[];
}) {
  return (
    <div className="faq-list">
      {items.map((item, i) => (
        <FaqItem key={i} question={item.q} defaultOpen={i === 0}>
          {item.a}
        </FaqItem>
      ))}
    </div>
  );
}

function FaqItem({
  question,
  children,
  defaultOpen = false,
}: {
  question: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={`faq-item${open ? ' open' : ''}`}>
      <button
        className="faq-question"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        {question}
        <span className="arrow">▾</span>
      </button>
      <div className="faq-answer">
        <div className="faq-answer-inner">{children}</div>
      </div>
    </div>
  );
}
