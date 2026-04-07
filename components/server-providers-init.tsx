'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useSettingsStore } from '@/lib/store/settings';

/**
 * Fetches server-configured providers on mount and on each navigation.
 * Re-fetches after login so provider config is available on the first authenticated page.
 * Renders nothing — purely a side-effect component.
 */
export function ServerProvidersInit() {
  const fetchServerProviders = useSettingsStore((state) => state.fetchServerProviders);
  const pathname = usePathname();
  const lastFetchedPathRef = useRef<string | null>(null);

  useEffect(() => {
    // Skip re-fetch if we already fetched for this pathname (avoids duplicate calls
    // when the component re-renders without a real navigation).
    if (lastFetchedPathRef.current === pathname) return;
    lastFetchedPathRef.current = pathname;
    fetchServerProviders();
  }, [pathname, fetchServerProviders]);

  return null;
}
