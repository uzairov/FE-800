'use client';

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Decodes JWT payload without verification (client-side only — exp check).
 */
function getTokenExp(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return typeof payload.exp === 'number' ? payload.exp : null;
  } catch {
    return null;
  }
}

/**
 * Returns token from localStorage or sessionStorage (localStorage takes priority).
 */
function getStoredToken(key: string): { token: string; store: Storage } | null {
  if (typeof window === 'undefined') return null;
  const ls = localStorage.getItem(key);
  if (ls) return { token: ls, store: localStorage };
  const ss = sessionStorage.getItem(key);
  if (ss) return { token: ss, store: sessionStorage };
  return null;
}

/**
 * Silent token refresh hook.
 * - Reads access token, calculates time until expiry
 * - Schedules a refresh 60s before expiry
 * - On refresh: rotates both tokens (body or cookie)
 * - On failure: clears tokens and redirects to /login
 */
export function useTokenRefresh() {
  const router = useRouter();

  const refresh = useCallback(async () => {
    const stored = getStoredToken('refreshToken');
    const body   = stored ? JSON.stringify({ refreshToken: stored.token }) : '{}';

    try {
      const res  = await fetch('/api/auth/refresh', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        credentials: 'include', // send cookie for rememberMe flow
      });
      const json = await res.json();

      if (!json.success) {
        // Token invalid — logout
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        sessionStorage.removeItem('accessToken');
        sessionStorage.removeItem('refreshToken');
        router.replace('/login');
        return;
      }

      const { accessToken, refreshToken: newRefresh } = json.data;

      // Store in the same place as before
      const store = stored?.store ?? localStorage;
      store.setItem('accessToken', accessToken);
      if (newRefresh) store.setItem('refreshToken', newRefresh);
    } catch {
      // Network error — will retry on next schedule
    }
  }, [router]);

  useEffect(() => {
    let timerId: ReturnType<typeof setTimeout>;

    function schedule() {
      const stored = getStoredToken('accessToken');
      if (!stored) return;

      const exp = getTokenExp(stored.token);
      if (!exp) return;

      const msUntilExpiry  = exp * 1000 - Date.now();
      const msUntilRefresh = msUntilExpiry - 60_000; // 1 min before expiry

      if (msUntilRefresh <= 0) {
        // Already expired or about to — refresh immediately
        refresh().then(schedule);
        return;
      }

      timerId = setTimeout(async () => {
        await refresh();
        schedule(); // re-schedule after rotation
      }, msUntilRefresh);
    }

    schedule();
    return () => clearTimeout(timerId);
  }, [refresh]);
}
