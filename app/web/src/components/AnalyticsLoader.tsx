'use client';

import '@/lib/analytics';
import { useEffect } from 'react';

export const AnalyticsLoader = () => {
  useEffect(() => {
    // The import above already attaches to window, but this ensures it runs on client
  }, []);
  return null;
};
