'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const NAV = [
  { href: '/dashboard', label: 'Обзор', icon: '◈' },
  { href: '/dashboard/assessments', label: 'Оценки', icon: '☰' },
  { href: '/dashboard/assessments/new', label: 'Новая оценка', icon: '+' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) { router.replace('/login'); return; }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      setUserEmail(payload.email ?? '');
      if (payload.exp * 1000 < Date.now()) {
        router.replace('/login');
      }
    } catch { router.replace('/login'); }
  }, [router]);

  function logout() {
    const rt = localStorage.getItem('refreshToken');
    if (rt) {
      fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: rt }),
      });
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    router.push('/login');
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-gray-100 flex flex-col shrink-0">
        <div className="px-5 py-4 border-b border-gray-100">
          <span className="font-bold text-blue-600 text-lg tracking-tight">TalentLens</span>
        </div>

        <nav className="flex-1 py-4 space-y-0.5 px-2">
          {NAV.map(({ href, label, icon }) => {
            const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  active
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <span className="text-base w-4 text-center">{icon}</span>
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="px-4 py-4 border-t border-gray-100">
          <p className="text-xs text-gray-400 truncate mb-2">{userEmail}</p>
          <button
            onClick={logout}
            className="text-xs text-gray-500 hover:text-red-600 transition-colors"
          >
            Выйти
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
