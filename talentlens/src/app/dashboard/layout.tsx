'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import { LangProvider, useLang } from '@/context/LangContext';
import Onboarding from '@/components/Onboarding';

type PlanInfo = { name: string; displayName: string; maxAssessmentsPerMonth: number } | null;

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const router   = useRouter();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { t } = useLang();
  const [userEmail,   setUserEmail]   = useState('');
  const [userName,    setUserName]    = useState('');
  const [userRole,    setUserRole]    = useState('');
  const [mounted,     setMounted]     = useState(false);
  const [planInfo,    setPlanInfo]    = useState<PlanInfo>(null);
  const [usageCount,  setUsageCount]  = useState(0);

  const isSuperAdmin = userRole === 'SUPERADMIN';

  const NAV = [
    { href: '/dashboard',                  label: t('nav_overview'),    icon: '◈' },
    { href: '/dashboard/assessments',      label: t('nav_assessments'), icon: '☰' },
    { href: '/dashboard/assessments/new',  label: t('nav_new'),         icon: '+' },
    { href: '/dashboard/analytics',        label: 'Аналитика',          icon: '📊' },
    { href: '/dashboard/team',             label: 'Команда',            icon: '👥' },
    { href: '/dashboard/templates',        label: 'Банк вопросов',      icon: '📚' },
    { href: '/dashboard/settings',         label: t('nav_settings'),    icon: '⚙' },
  ];

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) { router.replace('/login'); return; }
    try {
      const p = JSON.parse(atob(token.split('.')[1]));
      setUserEmail(p.email ?? '');
      setUserName((p.email ?? '').split('@')[0]);
      setUserRole(p.role ?? '');
      if (p.exp * 1000 < Date.now()) router.replace('/login');

      // Fetch plan info (non-blocking)
      fetch('/api/plan', { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((res) => {
          if (res.success) {
            setPlanInfo(res.data.plan);
            setUsageCount(res.data.usage.assessmentsThisMonth);
          }
        })
        .catch(() => {});
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
  const sidebarBg = 'linear-gradient(180deg, #0c1526 0%, #0a1020 100%)';

  return (
    <div className="flex flex-col h-full" style={{ background: sidebarBg }}>
      {/* Logo */}
      <div className="px-5 py-5 flex items-center gap-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/40 shrink-0">
          <span className="text-white font-bold text-sm">A</span>
        </div>
        <div className="flex-1">
          <div className="text-white font-bold text-sm leading-none">Aptio</div>
          <div className="text-blue-400/60 text-[10px] mt-0.5">HR Platform</div>
        </div>
        {/* Close button on mobile */}
        {onClose && (
          <button onClick={onClose} className="text-white/30 hover:text-white/80 transition-colors text-lg leading-none">✕</button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
        <div className="text-white/20 text-[9px] font-semibold uppercase tracking-widest px-3 mb-2">{t('nav_menu')}</div>
        {NAV.map(({ href, label, icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 group ${
                active ? 'text-white font-medium' : 'text-white/40 hover:text-white/80 hover:bg-white/5'
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
              {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400" />}
            </Link>
          );
        })}

        {/* SuperAdmin link — only for SUPERADMIN role */}
        {isSuperAdmin && (
          <>
            <div className="text-white/20 text-[9px] font-semibold uppercase tracking-widest px-3 mt-4 mb-2">Администрирование</div>
            {(() => {
              const active = pathname.startsWith('/admin');
              return (
                <Link
                  href="/admin"
                  onClick={onClose}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 group ${
                    active ? 'text-white font-medium' : 'text-white/40 hover:text-white/80 hover:bg-white/5'
                  }`}
                  style={active ? {
                    background: 'linear-gradient(135deg, rgba(139,92,246,0.35) 0%, rgba(139,92,246,0.15) 100%)',
                    border: '1px solid rgba(139,92,246,0.3)',
                    boxShadow: '0 0 20px rgba(139,92,246,0.15)',
                  } : {}}
                >
                  <span className={`text-base w-5 text-center transition-colors ${active ? 'text-violet-400' : 'text-white/25 group-hover:text-white/50'}`}>
                    🛡
                  </span>
                  Суперадмин
                  {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-400" />}
                </Link>
              );
            })()}
          </>
        )}
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-4 space-y-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px' }}>
        {/* Plan badge */}
        {planInfo && !isSuperAdmin && (
          <div className="px-3 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-white/40 text-[10px]">Тариф</span>
              <span className="text-blue-400 text-[10px] font-semibold">{planInfo.displayName}</span>
            </div>
            {planInfo.maxAssessmentsPerMonth > 0 && (
              <>
                <div className="w-full rounded-full overflow-hidden" style={{ height: 3, background: 'rgba(255,255,255,0.08)' }}>
                  <div
                    className="h-full rounded-full bg-blue-500 transition-all"
                    style={{ width: `${Math.min(100, (usageCount / planInfo.maxAssessmentsPerMonth) * 100)}%` }}
                  />
                </div>
                <div className="text-white/20 text-[9px] mt-0.5">{usageCount} / {planInfo.maxAssessmentsPerMonth} оценок/мес</div>
              </>
            )}
          </div>
        )}
        {isSuperAdmin && (
          <div className="px-3 py-1.5 rounded-xl text-center" style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.25)' }}>
            <span className="text-violet-400 text-[10px] font-semibold tracking-wide">SUPERADMIN</span>
          </div>
        )}
        {mounted && (
          <button
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-white/30 hover:text-white/60 hover:bg-white/5 transition-all"
          >
            <span>{isDark ? '☀️' : '🌙'}</span>
            {isDark ? t('theme_light') : t('theme_dark')}
          </button>
        )}
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {userName.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white/70 text-xs font-medium truncate">{userName || 'User'}</div>
            <div className="text-white/25 text-[10px] truncate">{userEmail}</div>
          </div>
          <button onClick={logout} title="Выйти" className="text-white/20 hover:text-red-400 transition-colors text-sm">⏻</button>
        </div>
      </div>
    </div>
  );
}

function Sidebar({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[var(--bg)]">

      {/* ── Desktop sidebar (always visible) ──────────────────────────── */}
      <aside className="hidden lg:flex w-60 flex-col shrink-0 sticky top-0 h-screen overflow-hidden"
             style={{ borderRight: '1px solid rgba(255,255,255,0.06)' }}>
        <SidebarContent />
      </aside>

      {/* ── Mobile sidebar (overlay) ──────────────────────────────────── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/60 lg:hidden"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              className="fixed inset-y-0 left-0 z-50 w-72 lg:hidden overflow-hidden"
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              style={{ borderRight: '1px solid rgba(255,255,255,0.06)' }}
            >
              <SidebarContent onClose={() => setMobileOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Main ──────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 sticky top-0 z-30 bg-[var(--bg)] border-b border-[var(--border)]">
          <button onClick={() => setMobileOpen(true)}
            className="w-9 h-9 flex flex-col items-center justify-center gap-1.5 rounded-xl hover:bg-[var(--surface)] transition-colors">
            <span className="w-5 h-0.5 bg-[var(--text)] rounded-full" />
            <span className="w-5 h-0.5 bg-[var(--text)] rounded-full" />
            <span className="w-3 h-0.5 bg-[var(--text)] rounded-full self-start" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
              <span className="text-white font-bold text-xs">A</span>
            </div>
            <span className="font-bold text-[var(--text)] text-sm">Aptio</span>
          </div>
        </header>

        <main className="flex-1 overflow-auto page-enter">{children}</main>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <LangProvider>
      <Sidebar>{children}</Sidebar>
      <Onboarding />
    </LangProvider>
  );
}
