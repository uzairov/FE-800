'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';

const NAV = [
  { href: '/dashboard',                  label: 'Обзор',        icon: '◈' },
  { href: '/dashboard/assessments',      label: 'Оценки',       icon: '☰' },
  { href: '/dashboard/assessments/new',  label: 'Новая оценка', icon: '+' },
  { href: '/dashboard/settings',         label: 'Настройки',    icon: '⚙' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName]   = useState('');
  const [mounted, setMounted]     = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) { router.replace('/login'); return; }
    try {
      const p = JSON.parse(atob(token.split('.')[1]));
      setUserEmail(p.email ?? '');
      setUserName((p.email ?? '').split('@')[0]);
      if (p.exp * 1000 < Date.now()) router.replace('/login');
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
      <aside className="w-60 flex flex-col shrink-0 relative"
             style={{
               background: isDark
                 ? 'linear-gradient(180deg, #0c1526 0%, #0a1020 100%)'
                 : 'linear-gradient(180deg, #0f172a 0%, #0a1020 100%)',
               borderRight: '1px solid rgba(255,255,255,0.06)',
             }}>

        {/* Logo */}
        <div className="px-5 py-5 flex items-center gap-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/40 shrink-0">
            <span className="text-white font-bold text-sm">T</span>
          </div>
          <div>
            <div className="text-white font-bold text-sm leading-none">TalentLens</div>
            <div className="text-blue-400/60 text-[10px] mt-0.5">HR Platform</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-3 space-y-0.5">
          <div className="text-white/20 text-[9px] font-semibold uppercase tracking-widest px-3 mb-2">Меню</div>
          {NAV.map(({ href, label, icon }) => {
            const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 group ${
                  active
                    ? 'text-white font-medium'
                    : 'text-white/40 hover:text-white/80 hover:bg-white/5'
                }`}
                style={active ? {
                  background: 'linear-gradient(135deg, rgba(37,99,235,0.35) 0%, rgba(37,99,235,0.15) 100%)',
                  border: '1px solid rgba(37,99,235,0.3)',
                  boxShadow: '0 0 20px rgba(37,99,235,0.15)',
                } : {}}
              >
                <span className={`text-base w-5 text-center transition-colors ${active ? 'text-blue-400' : 'text-white/25 group-hover:text-white/50'}`}>
                  {icon}
                </span>
                {label}
                {active && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400"/>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="px-3 pb-4 space-y-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px' }}>
          {/* Theme toggle */}
          {mounted && (
            <button
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-white/30 hover:text-white/60 hover:bg-white/5 transition-all"
            >
              <span>{isDark ? '☀️' : '🌙'}</span>
              {isDark ? 'Светлая тема' : 'Тёмная тема'}
            </button>
          )}

          {/* User */}
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {userName.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white/70 text-xs font-medium truncate">{userName || 'User'}</div>
              <div className="text-white/25 text-[10px] truncate">{userEmail}</div>
            </div>
            <button onClick={logout} title="Выйти" className="text-white/20 hover:text-red-400 transition-colors text-sm">
              ⏻
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main ─────────────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-auto page-enter">{children}</main>
    </div>
  );
}
