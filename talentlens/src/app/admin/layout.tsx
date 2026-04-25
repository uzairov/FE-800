'use client';

import { useTokenRefresh } from '@/hooks/useTokenRefresh';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  // Without this hook the access token never refreshes on /admin pages,
  // so it expires after 15 minutes and every API call returns 401 — which
  // looks like the user being kicked back to /login.
  useTokenRefresh();
  return <>{children}</>;
}
