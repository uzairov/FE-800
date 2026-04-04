'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';

const NAV = [
  { href: '/dashboard',                   label: 'Обзор',       icon: '◈' },
  { href: '/dashboard/assessments',       label: 'Оценки',      icon: '☰' },
  { href: '/dashboard/assessments/new',  label: 'Новая оценка', icon: '+' },
  { href: '/dashboard/settings',          label: 'Настройки',   icon: '⚙' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname  = usePathname();
  const router    = useRouter();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [userEmail, setUserEmail] = useState('');
  const [mounted, setMounted]     = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) { router.replace('/login'); return; }
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      setUserEmail(payload.email ?? '');
      if (payload.exp * 1000 < Date.now()) router.replace('/login');
    } catch { router.replace('/login'); }
  }, [router]);

  function logout() {
    const rt = localStorage.getItem('refreshToken');
    if (rt) fetch('/api/auth/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken: rt }) });
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    router.push('/login');
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <div className="flex min-h-screen bg-[var(--bg)]">
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside className="w-56 bg-[var(--surface)] border-r border-[var(--border)] flex flex-col shrink-0 shadow-sm">
        {/* Logo */}
        <div className="px-5 py-4 border-b border-[var(--border)]">
          <span className="font-bold text-blue-600 text-lg tracking-tight">TalentLens</span>
          <span className="ml-1 text-[10px] font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full align-middle">BETA</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 space-y-0.5 px-2">
          {NAV.map(({ href, label, icon }) => {
            const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150 ${
                  active
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-[var(--text-muted)] hover:bg-[var(--border)] hover:text-[var(--text)]'
                }`}
              >
                <span className="text-base w-4 text-center">{icon}</span>
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom: theme toggle + user */}
        <div className="px-4 py-4 border-t border-[var(--border)] space-y-3">
          {/* Dark mode toggle */}
          {mounted && (
            <button
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-[var(--text-muted)] hover:bg-[var(--border)] transition-colors"
            >
              <span className="text-base">{isDark ? '☀️' : '🌙'}</span>
              {isDark ? 'Светлая тема' : 'Тёмная тема'}
            </button>
          )}

          {/* User info */}
          <div>
            <p className="text-xs text-[var(--text-faint)] truncate mb-1">{userEmail}</p>
            <button
              onClick={logout}
              className="text-xs text-[var(--text-muted)] hover:text-red-500 transition-colors"
            >
              Выйти
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main ─────────────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-auto page-enter">{children}</main>
    </div>
  );
}
