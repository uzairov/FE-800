'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

// ─── Types ────────────────────────────────────────────────────────────────────

type Plan = {
  id: string;
  name: string;
  displayName: string;
  maxAssessmentsPerMonth: number;
  maxUsers: number;
  hasAiAssistant: boolean;
  priceUsd: number;
};

type Company = {
  id: string;
  name: string;
  isBlocked: boolean;
  plan: { id: string; name: string; displayName: string } | null;
  userCount: number;
  assessCount: number;
  createdAt: string;
};

type Stats = { totalCompanies: number; totalUsers: number; totalAssessments: number };
type TimelinePoint = { date: string; count: number };

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: string; color: string }) {
  return (
    <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-white/40 text-xs font-medium">{label}</span>
        <span className="text-lg">{icon}</span>
      </div>
      <div className="text-3xl font-bold" style={{ color }}>{value.toLocaleString()}</div>
    </div>
  );
}

// ─── Mini bar chart ───────────────────────────────────────────────────────────

function MiniChart({ data }: { data: TimelinePoint[] }) {
  if (!data.length) return <div className="text-white/20 text-sm text-center py-8">Нет данных за 30 дней</div>;
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="flex items-end gap-1 h-24">
      {data.map((d) => (
        <div
          key={d.date}
          title={`${d.date}: ${d.count}`}
          className="flex-1 rounded-t-sm transition-all hover:opacity-80"
          style={{ height: `${(d.count / max) * 100}%`, background: 'rgba(99,179,237,0.6)', minHeight: 2 }}
        />
      ))}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const router = useRouter();

  const [stats,     setStats]     = useState<Stats>({ totalCompanies: 0, totalUsers: 0, totalAssessments: 0 });
  const [timeline,  setTimeline]  = useState<TimelinePoint[]>([]);
  const [plans,     setPlans]     = useState<Plan[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [total,     setTotal]     = useState(0);
  const [page,      setPage]      = useState(1);
  const [search,    setSearch]    = useState('');
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');

  // Patch state
  const [patchLoading, setPatchLoading] = useState<string | null>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

  const fetchData = useCallback(async (p = 1, q = search) => {
    setLoading(true);
    setError('');
    try {
      const tk = localStorage.getItem('accessToken') ?? '';
      const params = new URLSearchParams({ page: String(p), limit: '20', search: q });
      const res = await fetch(`/api/admin?${params}`, { headers: { Authorization: `Bearer ${tk}` } });
      const json = await res.json();
      if (!json.success) { setError(json.error ?? 'Ошибка'); return; }
      setStats(json.data.stats);
      setTimeline(json.data.timeline);
      setPlans(json.data.plans);
      setCompanies(json.data.companies);
      setTotal(json.data.total);
      setPage(json.data.page);
    } catch {
      setError('Ошибка сети');
    } finally {
      setLoading(false);
    }
  }, [search]);

  // Auth check + initial load
  useEffect(() => {
    const tk = localStorage.getItem('accessToken');
    if (!tk) { router.replace('/login'); return; }
    try {
      const p = JSON.parse(atob(tk.split('.')[1]));
      if (p.role !== 'SUPERADMIN') { router.replace('/dashboard'); return; }
      if (p.exp * 1000 < Date.now()) { router.replace('/login'); return; }
    } catch { router.replace('/login'); return; }
    fetchData(1, '');
  }, [router, fetchData]);

  async function patchCompany(companyId: string, patch: { planId?: string; isBlocked?: boolean }) {
    setPatchLoading(companyId);
    try {
      const tk = localStorage.getItem('accessToken') ?? '';
      const res = await fetch('/api/admin/companies', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tk}` },
        body: JSON.stringify({ companyId, ...patch }),
      });
      const json = await res.json();
      if (!json.success) { alert(json.error ?? 'Ошибка'); return; }
      // Refresh
      await fetchData(page);
    } finally {
      setPatchLoading(null);
    }
  }

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="min-h-screen p-6 lg:p-8" style={{ background: 'linear-gradient(160deg, #060a12 0%, #0a1020 60%, #070b14 100%)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Суперадмин панель</h1>
          <p className="text-white/30 text-sm mt-1">Управление компаниями и тарифами платформы</p>
        </div>
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-white/50 hover:text-white/80 transition-all"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          ← Дашборд
        </button>
      </div>

      {error && (
        <div className="rounded-xl px-4 py-3 mb-6 text-sm text-red-400"
             style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard label="Компаний" value={stats.totalCompanies} icon="🏢" color="#60a5fa" />
        <StatCard label="Пользователей" value={stats.totalUsers} icon="👥" color="#34d399" />
        <StatCard label="Оценок всего" value={stats.totalAssessments} icon="📋" color="#a78bfa" />
      </div>

      {/* Chart */}
      <div className="rounded-2xl p-5 mb-8" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="text-white/50 text-xs font-medium mb-4">Новые оценки за 30 дней</div>
        <MiniChart data={timeline} />
      </div>

      {/* Plans reference */}
      <div className="rounded-2xl p-5 mb-8" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="text-white/50 text-xs font-medium mb-4">Тарифные планы</div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {plans.map((pl) => (
            <div key={pl.id} className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="text-white font-semibold text-sm">{pl.displayName}</div>
              <div className="text-white/30 text-xs mt-1">${pl.priceUsd}/мес</div>
              <div className="text-white/25 text-xs">
                {pl.maxAssessmentsPerMonth === -1 ? '∞' : pl.maxAssessmentsPerMonth} оценок, {pl.maxUsers === -1 ? '∞' : pl.maxUsers} польз.
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Companies table */}
      <div className="rounded-2xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
        {/* Search */}
        <div className="p-4 flex gap-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <input
            type="text"
            placeholder="Поиск по компаниям..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchData(1)}
            className="flex-1 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}
          />
          <button
            onClick={() => fetchData(1)}
            className="px-4 py-2.5 rounded-xl text-sm text-white/70 hover:text-white transition-all"
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            Найти
          </button>
          <div className="text-white/25 text-xs self-center ml-1">{total} компаний</div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-white/30 text-sm">Загрузка...</div>
        ) : companies.length === 0 ? (
          <div className="py-12 text-center text-white/30 text-sm">Ничего не найдено</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {['Компания', 'Тариф', 'Польз.', 'Оценок', 'Статус', 'Зарег.', 'Действия'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-white/30 font-medium text-xs">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {companies.map((c) => (
                  <motion.tr
                    key={c.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                    className="hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="text-white font-medium">{c.name}</div>
                      <div className="text-white/25 text-[10px] font-mono">{c.id.slice(0, 8)}…</div>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={c.plan?.id ?? ''}
                        disabled={!!patchLoading}
                        onChange={(e) => patchCompany(c.id, { planId: e.target.value })}
                        className="rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500/40"
                        style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
                      >
                        <option value="">— Без плана —</option>
                        {plans.map((pl) => (
                          <option key={pl.id} value={pl.id}>{pl.displayName}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-white/50">{c.userCount}</td>
                    <td className="px-4 py-3 text-white/50">{c.assessCount}</td>
                    <td className="px-4 py-3">
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                        style={c.isBlocked
                          ? { background: 'rgba(239,68,68,0.15)', color: '#f87171' }
                          : { background: 'rgba(52,211,153,0.15)', color: '#34d399' }
                        }
                      >
                        {c.isBlocked ? 'Заблокирован' : 'Активен'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white/30 text-[11px]">
                      {new Date(c.createdAt).toLocaleDateString('ru')}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        disabled={patchLoading === c.id}
                        onClick={() => patchCompany(c.id, { isBlocked: !c.isBlocked })}
                        className="px-3 py-1 rounded-lg text-[11px] font-medium transition-all disabled:opacity-40"
                        style={c.isBlocked
                          ? { background: 'rgba(52,211,153,0.15)', color: '#34d399', border: '1px solid rgba(52,211,153,0.3)' }
                          : { background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)' }
                        }
                      >
                        {patchLoading === c.id ? '...' : c.isBlocked ? 'Разблокировать' : 'Заблокировать'}
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 flex items-center justify-between" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <button
              onClick={() => fetchData(page - 1)}
              disabled={page <= 1 || loading}
              className="px-3 py-1.5 rounded-lg text-xs text-white/50 hover:text-white/80 disabled:opacity-30 transition-all"
              style={{ background: 'rgba(255,255,255,0.06)' }}
            >
              ← Пред.
            </button>
            <span className="text-white/30 text-xs">Стр. {page} / {totalPages}</span>
            <button
              onClick={() => fetchData(page + 1)}
              disabled={page >= totalPages || loading}
              className="px-3 py-1.5 rounded-lg text-xs text-white/50 hover:text-white/80 disabled:opacity-30 transition-all"
              style={{ background: 'rgba(255,255,255,0.06)' }}
            >
              След. →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
