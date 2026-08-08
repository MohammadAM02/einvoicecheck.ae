// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { createElement as h } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
}));

import { Chrome } from '@/components/Chrome';

afterEach(() => cleanup());

describe('mobile navigation stacking', () => {
  it('keeps the primary nav above page content stacking contexts', () => {
    render(h(Chrome, null, h('main', null, 'Page content')));

    const nav = screen.getByRole('navigation', { name: 'Primary navigation' });
    expect(Number(nav.style.zIndex)).toBeGreaterThan(10);
  });
});
