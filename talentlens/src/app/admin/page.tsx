'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Types ────────────────────────────────────────────────────────────────────

type Plan = {
  id: string;
  name: string;
  displayName: string;
  maxAssessmentsPerMonth: number;
  maxUsers: number;
  hasAiAssistant: boolean;
  priceUsd: number;
  features: string[];
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
type Tab = 'overview' | 'companies';
type StatusFilter = 'all' | 'active' | 'blocked';

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ msg, type, onDone }: { msg: string; type: 'ok' | 'err'; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.95 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl text-sm font-medium shadow-2xl"
      style={type === 'ok'
        ? { background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.35)', color: '#34d399', backdropFilter: 'blur(12px)' }
        : { background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.35)', color: '#f87171', backdropFilter: 'blur(12px)' }}
    >
      {msg}
    </motion.div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon, color, loading }: {
  label: string; value: number; icon: string; color: string; loading: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-5"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-white/40 text-xs font-medium">{label}</span>
        <span className="text-xl">{icon}</span>
      </div>
      {loading ? (
        <div className="h-9 w-20 rounded-lg animate-pulse" style={{ background: 'rgba(255,255,255,0.08)' }} />
      ) : (
        <motion.div
          key={value}
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-3xl font-bold tabular-nums"
          style={{ color }}
        >
          {value.toLocaleString('ru')}
        </motion.div>
      )}
    </motion.div>
  );
}

// ─── Bar chart with hover tooltip ────────────────────────────────────────────

function BarChart({ data }: { data: TimelinePoint[] }) {
  const [hovered, setHovered] = useState<number | null>(null);

  if (!data.length) {
    return <div className="text-white/20 text-sm text-center py-10">Нет данных за 30 дней</div>;
  }

  const max = Math.max(...data.map(d => d.count), 1);
  // Show only every 5th date label to avoid clutter
  const labelStep = Math.max(1, Math.floor(data.length / 6));

  return (
    <div>
      <div className="flex items-end gap-1 h-28 mb-1">
        {data.map((d, i) => (
          <div key={d.date} className="flex-1 flex flex-col justify-end relative group"
            onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}>
            {hovered === i && (
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded-lg text-[10px] font-medium whitespace-nowrap z-10"
                style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)' }}>
                {d.count}
              </div>
            )}
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${(d.count / max) * 100}%` }}
              transition={{ duration: 0.6, delay: i * 0.01, ease: 'easeOut' }}
              className="w-full rounded-t-sm min-h-[2px] transition-colors"
              style={{
                background: hovered === i
                  ? 'rgba(99,179,237,1)'
                  : 'rgba(99,179,237,0.5)',
              }}
            />
          </div>
        ))}
      </div>
      {/* Date labels */}
      <div className="flex items-start">
        {data.map((d, i) => (
          <div key={d.date} className="flex-1 text-center">
            {i % labelStep === 0 && (
              <span className="text-white/20 text-[9px]">
                {d.date.slice(5)} {/* MM-DD */}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Plan card ────────────────────────────────────────────────────────────────

const PLAN_COLORS: Record<string, string> = {
  free:         '#6b7280',
  starter:      '#3b82f6',
  professional: '#8b5cf6',
  enterprise:   '#f59e0b',
};

function PlanCard({ plan, companyCount }: { plan: Plan; companyCount: number }) {
  const color = PLAN_COLORS[plan.name] ?? '#6b7280';
  return (
    <div className="rounded-2xl p-4 space-y-3"
      style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${color}30` }}>
      <div className="flex items-start justify-between">
        <div>
          <div className="font-semibold text-white text-sm">{plan.displayName}</div>
          <div className="text-white/30 text-xs mt-0.5">
            {plan.priceUsd === 0 ? 'Бесплатно' : `$${plan.priceUsd}/мес`}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs font-bold" style={{ color }}>{companyCount}</div>
          <div className="text-white/20 text-[10px]">компаний</div>
        </div>
      </div>
      <div className="space-y-1 text-xs text-white/35">
        <div className="flex justify-between">
          <span>Оценок/мес</span>
          <span style={{ color }}>{plan.maxAssessmentsPerMonth === -1 ? '∞' : plan.maxAssessmentsPerMonth}</span>
        </div>
        <div className="flex justify-between">
          <span>Пользователей</span>
          <span style={{ color }}>{plan.maxUsers === -1 ? '∞' : plan.maxUsers}</span>
        </div>
        <div className="flex justify-between">
          <span>AI-ассистент</span>
          <span style={{ color: plan.hasAiAssistant ? '#34d399' : '#6b7280' }}>
            {plan.hasAiAssistant ? '✓ Да' : '— Нет'}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Skeleton row ─────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      {[140, 100, 40, 40, 80, 70, 100].map((w, i) => (
        <td key={i} className="px-4 py-3.5">
          <div className="h-4 rounded-md animate-pulse"
            style={{ width: w, background: 'rgba(255,255,255,0.06)' }} />
        </td>
      ))}
    </tr>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const router = useRouter();

  const [stats,        setStats]        = useState<Stats>({ totalCompanies: 0, totalUsers: 0, totalAssessments: 0 });
  const [timeline,     setTimeline]     = useState<TimelinePoint[]>([]);
  const [plans,        setPlans]        = useState<Plan[]>([]);
  const [companies,    setCompanies]    = useState<Company[]>([]);
  const [total,        setTotal]        = useState(0);
  const [page,         setPage]         = useState(1);
  const [search,       setSearch]       = useState('');
  const [loading,      setLoading]      = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [tab,          setTab]          = useState<Tab>('overview');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [planFilter,   setPlanFilter]   = useState('');
  const [patchLoading, setPatchLoading] = useState<string | null>(null);
  const [toast,        setToast]        = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── data fetching ───────────────────────────────────────────────────────────

  const fetchData = useCallback(async (p = 1, q = search, replace = false) => {
    replace ? setLoading(true) : setTableLoading(true);
    try {
      const tk = localStorage.getItem('accessToken') ?? sessionStorage.getItem('accessToken') ?? '';
      const params = new URLSearchParams({ page: String(p), limit: '20', search: q });
      const res = await fetch(`/api/admin?${params}`, { headers: { Authorization: `Bearer ${tk}` } });
      const json = await res.json();
      if (!json.success) { setToast({ msg: json.error ?? 'Ошибка загрузки', type: 'err' }); return; }
      setStats(json.data.stats);
      setTimeline(json.data.timeline);
      setPlans(json.data.plans);
      setCompanies(json.data.companies);
      setTotal(json.data.total);
      setPage(json.data.page);
    } catch {
      setToast({ msg: 'Ошибка сети', type: 'err' });
    } finally {
      setLoading(false);
      setTableLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const tk = localStorage.getItem('accessToken');
    if (!tk) { router.replace('/login'); return; }
    try {
      const p = JSON.parse(atob(tk.split('.')[1]));
      if (p.role !== 'SUPERADMIN') { router.replace('/dashboard'); return; }
      if (p.exp * 1000 < Date.now()) { router.replace('/login'); return; }
    } catch { router.replace('/login'); return; }
    fetchData(1, '', true);
  }, [router, fetchData]);

  // Debounced search
  useEffect(() => {
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => fetchData(1), 400);
    return () => { if (searchRef.current) clearTimeout(searchRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // ── patch ───────────────────────────────────────────────────────────────────

  async function patchCompany(companyId: string, patch: { planId?: string; isBlocked?: boolean }) {
    setPatchLoading(companyId);
    // Optimistic update
    setCompanies(prev => prev.map(c => {
      if (c.id !== companyId) return c;
      if (patch.isBlocked !== undefined) return { ...c, isBlocked: patch.isBlocked! };
      if (patch.planId !== undefined) {
        const found = plans.find(p => p.id === patch.planId);
        return { ...c, plan: found ? { id: found.id, name: found.name, displayName: found.displayName } : null };
      }
      return c;
    }));
    try {
      const tk = localStorage.getItem('accessToken') ?? sessionStorage.getItem('accessToken') ?? '';
      const res = await fetch('/api/admin/companies', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tk}` },
        body: JSON.stringify({ companyId, ...patch }),
      });
      const json = await res.json();
      if (!json.success) {
        setToast({ msg: json.error ?? 'Ошибка', type: 'err' });
        fetchData(page); // revert via fresh fetch
      } else {
        setToast({
          msg: patch.isBlocked === true ? 'Компания заблокирована'
             : patch.isBlocked === false ? 'Компания разблокирована'
             : 'Тариф обновлён',
          type: 'ok',
        });
      }
    } catch {
      setToast({ msg: 'Ошибка сети', type: 'err' });
      fetchData(page);
    } finally {
      setPatchLoading(null);
    }
  }

  // ── derived ─────────────────────────────────────────────────────────────────

  const totalPages = Math.ceil(total / 20);

  // Client-side status + plan filter (on top of server search)
  const filteredCompanies = companies.filter(c => {
    if (statusFilter === 'active'  && c.isBlocked)  return false;
    if (statusFilter === 'blocked' && !c.isBlocked) return false;
    if (planFilter && c.plan?.id !== planFilter)     return false;
    return true;
  });

  // Plan distribution for plan cards
  const planCounts = plans.reduce<Record<string, number>>((acc, pl) => {
    acc[pl.id] = companies.filter(c => c.plan?.id === pl.id).length;
    return acc;
  }, {});

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(160deg, #060a12 0%, #0a1020 60%, #070b14 100%)' }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 px-6 lg:px-8 py-4 flex items-center justify-between"
        style={{ background: 'rgba(6,10,18,0.85)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/dashboard')}
            className="flex items-center gap-1.5 text-white/30 hover:text-white/70 transition-colors text-sm">
            ← Дашборд
          </button>
          <div className="w-px h-5" style={{ background: 'rgba(255,255,255,0.1)' }} />
          <div>
            <span className="text-white font-bold text-base">Суперадмин</span>
            <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-semibold"
              style={{ background: 'rgba(139,92,246,0.15)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.3)' }}>
              SUPERADMIN
            </span>
          </div>
        </div>
        <button onClick={() => fetchData(page, search, false)}
          disabled={loading || tableLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-white/40 hover:text-white/70 transition-all disabled:opacity-30"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
          ↻ Обновить
        </button>
      </div>

      <div className="px-6 lg:px-8 py-6">

        {/* ── Tabs ─────────────────────────────────────────────────────────── */}
        <div className="flex gap-1 mb-8 p-1 rounded-2xl w-fit"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
          {(['overview', 'companies'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="px-5 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={tab === t
                ? { background: 'rgba(255,255,255,0.1)', color: '#fff' }
                : { color: 'rgba(255,255,255,0.35)' }}>
              {t === 'overview' ? '📊 Обзор' : '🏢 Компании'}
            </button>
          ))}
        </div>

        {/* ── TAB: Overview ───────────────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          {tab === 'overview' && (
            <motion.div key="overview"
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="space-y-6">

              {/* Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard label="Компаний" value={stats.totalCompanies} icon="🏢" color="#60a5fa" loading={loading} />
                <StatCard label="Пользователей" value={stats.totalUsers} icon="👥" color="#34d399" loading={loading} />
                <StatCard label="Оценок всего" value={stats.totalAssessments} icon="📋" color="#a78bfa" loading={loading} />
              </div>

              {/* Chart */}
              <div className="rounded-2xl p-5"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="text-white/50 text-xs font-medium">Новые оценки за 30 дней</div>
                  {timeline.length > 0 && (
                    <div className="text-white/30 text-xs">
                      Всего: {timeline.reduce((s, d) => s + d.count, 0)}
                    </div>
                  )}
                </div>
                {loading ? (
                  <div className="h-28 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
                ) : (
                  <BarChart data={timeline} />
                )}
              </div>

              {/* Plans grid */}
              <div>
                <div className="text-white/40 text-xs font-medium uppercase tracking-widest mb-3">Тарифные планы</div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {loading
                    ? [1,2,3,4].map(i => (
                        <div key={i} className="h-36 rounded-2xl animate-pulse"
                          style={{ background: 'rgba(255,255,255,0.04)' }} />
                      ))
                    : plans.map(pl => (
                        <PlanCard key={pl.id} plan={pl} companyCount={planCounts[pl.id] ?? 0} />
                      ))
                  }
                </div>
              </div>
            </motion.div>
          )}

          {/* ── TAB: Companies ──────────────────────────────────────────────── */}
          {tab === 'companies' && (
            <motion.div key="companies"
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>

              {/* Toolbar */}
              <div className="flex flex-wrap gap-3 mb-4 items-center">
                {/* Search */}
                <div className="relative flex-1 min-w-48">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25 text-sm">🔍</span>
                  <input type="text" value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Поиск по названию..."
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-white placeholder:text-white/20 outline-none"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
                </div>

                {/* Status filter */}
                <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                  {(['all', 'active', 'blocked'] as StatusFilter[]).map(f => (
                    <button key={f} onClick={() => setStatusFilter(f)}
                      className="px-3 py-2 text-xs font-medium transition-all"
                      style={statusFilter === f
                        ? { background: 'rgba(255,255,255,0.12)', color: '#fff' }
                        : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.35)' }}>
                      {f === 'all' ? 'Все' : f === 'active' ? 'Активные' : 'Заблокированные'}
                    </button>
                  ))}
                </div>

                {/* Plan filter */}
                <select value={planFilter} onChange={e => setPlanFilter(e.target.value)}
                  className="rounded-xl px-3 py-2 text-xs text-white/60 outline-none"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <option value="">Все тарифы</option>
                  {plans.map(pl => (
                    <option key={pl.id} value={pl.id}>{pl.displayName}</option>
                  ))}
                </select>

                <div className="text-white/25 text-xs ml-auto">
                  {filteredCompanies.length} из {total}
                </div>
              </div>

              {/* Table */}
              <div className="rounded-2xl overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                        {['Компания', 'Тариф', 'Польз.', 'Оценок', 'Статус', 'Зарег.', 'Действия'].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-white/25 font-medium text-xs tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {tableLoading
                        ? [1,2,3,4,5].map(i => <SkeletonRow key={i} />)
                        : filteredCompanies.length === 0
                        ? (
                          <tr>
                            <td colSpan={7} className="px-4 py-12 text-center text-white/25 text-sm">
                              Ничего не найдено
                            </td>
                          </tr>
                        )
                        : filteredCompanies.map((c, idx) => (
                          <motion.tr
                            key={c.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: idx * 0.02 }}
                            className="group transition-colors"
                            style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                          >
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                                  style={{ background: 'rgba(99,179,237,0.15)', color: '#60a5fa' }}>
                                  {c.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div className="text-white font-medium text-sm">{c.name}</div>
                                  <div className="text-white/20 text-[10px] font-mono">{c.id.slice(0, 10)}…</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3.5">
                              <select
                                value={c.plan?.id ?? ''}
                                disabled={!!patchLoading}
                                onChange={e => patchCompany(c.id, { planId: e.target.value || undefined })}
                                className="rounded-lg px-2 py-1.5 text-xs text-white outline-none cursor-pointer disabled:opacity-50"
                                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
                              >
                                <option value="">— Без плана —</option>
                                {plans.map(pl => (
                                  <option key={pl.id} value={pl.id}>{pl.displayName}</option>
                                ))}
                              </select>
                            </td>
                            <td className="px-4 py-3.5 text-white/45 tabular-nums">{c.userCount}</td>
                            <td className="px-4 py-3.5 text-white/45 tabular-nums">{c.assessCount}</td>
                            <td className="px-4 py-3.5">
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold"
                                style={c.isBlocked
                                  ? { background: 'rgba(239,68,68,0.15)', color: '#f87171' }
                                  : { background: 'rgba(52,211,153,0.12)', color: '#34d399' }}>
                                {c.isBlocked ? '✕ Заблокирован' : '✓ Активен'}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-white/25 text-[11px] tabular-nums">
                              {new Date(c.createdAt).toLocaleDateString('ru', { day: '2-digit', month: 'short', year: '2-digit' })}
                            </td>
                            <td className="px-4 py-3.5">
                              <button
                                disabled={patchLoading === c.id}
                                onClick={() => patchCompany(c.id, { isBlocked: !c.isBlocked })}
                                className="px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all disabled:opacity-40 whitespace-nowrap"
                                style={c.isBlocked
                                  ? { background: 'rgba(52,211,153,0.12)', color: '#34d399', border: '1px solid rgba(52,211,153,0.25)' }
                                  : { background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}
                              >
                                {patchLoading === c.id
                                  ? <span className="inline-flex gap-1">
                                      {[0,1,2].map(i => (
                                        <motion.span key={i} className="w-1 h-1 rounded-full bg-current inline-block"
                                          animate={{ opacity: [0.3, 1, 0.3] }}
                                          transition={{ duration: 0.8, delay: i * 0.15, repeat: Infinity }} />
                                      ))}
                                    </span>
                                  : c.isBlocked ? 'Разблокировать' : 'Заблокировать'
                                }
                              </button>
                            </td>
                          </motion.tr>
                        ))
                      }
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="px-4 py-3 flex items-center justify-between"
                    style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <button onClick={() => fetchData(page - 1)}
                      disabled={page <= 1 || tableLoading}
                      className="px-3 py-1.5 rounded-lg text-xs text-white/40 hover:text-white/70 disabled:opacity-25 transition-all"
                      style={{ background: 'rgba(255,255,255,0.06)' }}>
                      ← Пред.
                    </button>
                    <span className="text-white/25 text-xs">
                      Стр. {page} / {totalPages} · {total} компаний
                    </span>
                    <button onClick={() => fetchData(page + 1)}
                      disabled={page >= totalPages || tableLoading}
                      className="px-3 py-1.5 rounded-lg text-xs text-white/40 hover:text-white/70 disabled:opacity-25 transition-all"
                      style={{ background: 'rgba(255,255,255,0.06)' }}>
                      След. →
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <Toast key={toast.msg} msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
