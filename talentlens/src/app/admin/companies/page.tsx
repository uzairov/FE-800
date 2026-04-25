'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Plan {
  id:          string;
  name:        string;
  displayName: string;
  priceUsd:    number;
}

interface CompanyRow {
  id:                   string;
  name:                 string;
  adminEmail:           string | null;
  registeredAt:         string;
  currentPlan:          string;
  planName:             string;
  planId:               string | null;
  paymentStatus:        string;
  overdueAmount:        number;
  assessmentsThisMonth: number;
  lastActivityAt:       string | null;
  userCount:            number;
  isBlocked:            boolean;
}

interface AdminCompaniesData {
  companies: CompanyRow[];
  stats: {
    totalCompanies:  number;
    activeCompanies: number;
    mrr:             number;
    totalOverdue:    number;
  };
  plans: Plan[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Visual config
// ─────────────────────────────────────────────────────────────────────────────

const PLAN_BADGE: Record<string, { bg: string; border: string; text: string }> = {
  free:         { bg: 'rgba(148,163,184,0.10)', border: 'rgba(148,163,184,0.30)', text: '#cbd5e1' },
  starter:      { bg: 'rgba(59,130,246,0.10)',  border: 'rgba(59,130,246,0.30)',  text: '#60a5fa' },
  professional: { bg: 'rgba(139,92,246,0.10)',  border: 'rgba(139,92,246,0.30)',  text: '#a78bfa' },
  enterprise:   { bg: 'rgba(245,158,11,0.10)',  border: 'rgba(245,158,11,0.30)',  text: '#fbbf24' },
};

const PAYMENT_BADGE: Record<string, { icon: string; label: string; bg: string; border: string; text: string }> = {
  active:  { icon: '✓', label: 'Активна',     bg: 'rgba(16,185,129,0.10)', border: 'rgba(16,185,129,0.30)', text: '#34d399' },
  pending: { icon: '⚠', label: 'Ожидание',    bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.30)', text: '#fbbf24' },
  overdue: { icon: '✕', label: 'Просрочена',  bg: 'rgba(239,68,68,0.10)',  border: 'rgba(239,68,68,0.30)',  text: '#f87171' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Toast
// ─────────────────────────────────────────────────────────────────────────────

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
      style={
        type === 'ok'
          ? { background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.35)', color: '#34d399', backdropFilter: 'blur(12px)' }
          : { background: 'rgba(239,68,68,0.15)',  border: '1px solid rgba(239,68,68,0.35)',  color: '#f87171', backdropFilter: 'blur(12px)' }
      }
    >
      {msg}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Stat card
// ─────────────────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon, color, suffix }: {
  label: string;
  value: number;
  icon:  string;
  color: string;
  suffix?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-4 sm:p-5"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium" style={{ color: '#94a3b8' }}>{label}</span>
        <span className="text-xl">{icon}</span>
      </div>
      <div className="text-2xl sm:text-3xl font-bold tabular-nums" style={{ color }}>
        {suffix === '$' && '$'}{value.toLocaleString('ru')}{suffix && suffix !== '$' && suffix}
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function AdminCompaniesPage() {
  const router = useRouter();
  const [data,    setData]    = useState<AdminCompaniesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast,   setToast]   = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);

  // Filters
  const [search,        setSearch]        = useState('');
  const [planFilter,    setPlanFilter]    = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [dateFrom,      setDateFrom]      = useState('');
  const [dateTo,        setDateTo]        = useState('');

  const [actioningId, setActioningId] = useState<string | null>(null);

  // ── Auth check ───────────────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('accessToken') ?? sessionStorage.getItem('accessToken');
    if (!token) { router.replace('/login'); return; }
    try {
      const p = JSON.parse(atob(token.split('.')[1]));
      if (p.role !== 'SUPERADMIN') { router.replace('/dashboard'); return; }
    } catch { router.replace('/login'); }
  }, [router]);

  // ── Fetch data ───────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    const token  = localStorage.getItem('accessToken') ?? sessionStorage.getItem('accessToken');
    const params = new URLSearchParams();
    if (search)        params.set('search',        search);
    if (planFilter)    params.set('plan',          planFilter);
    if (paymentFilter) params.set('paymentStatus', paymentFilter);
    if (dateFrom)      params.set('dateFrom',      dateFrom);
    if (dateTo)        params.set('dateTo',        dateTo);

    try {
      const res  = await fetch(`/api/admin/companies?${params}`, {
        headers: { Authorization: `Bearer ${token ?? ''}` },
      });
      const json = await res.json();
      if (json.success) setData(json.data);
      else              setToast({ msg: json.error ?? 'Ошибка загрузки', type: 'err' });
    } catch {
      setToast({ msg: 'Ошибка сети', type: 'err' });
    }
    setLoading(false);
  }, [search, planFilter, paymentFilter, dateFrom, dateTo]);

  useEffect(() => {
    const timer = setTimeout(load, 300); // debounce
    return () => clearTimeout(timer);
  }, [load]);

  // ── Actions ──────────────────────────────────────────────────────────
  async function changePlan(companyId: string, planId: string) {
    const token = localStorage.getItem('accessToken') ?? sessionStorage.getItem('accessToken');
    setActioningId(companyId);
    const res  = await fetch('/api/admin/companies', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token ?? ''}` },
      body:    JSON.stringify({ companyId, planId }),
    });
    setActioningId(null);
    if (res.ok) {
      setToast({ msg: 'Тариф обновлён', type: 'ok' });
      load();
    } else {
      setToast({ msg: 'Не удалось обновить тариф', type: 'err' });
    }
  }

  async function toggleBlock(companyId: string, currently: boolean) {
    if (!confirm(currently ? 'Разморозить компанию?' : 'Заморозить компанию?')) return;
    const token = localStorage.getItem('accessToken') ?? sessionStorage.getItem('accessToken');
    setActioningId(companyId);
    const res  = await fetch('/api/admin/companies', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token ?? ''}` },
      body:    JSON.stringify({ companyId, isBlocked: !currently }),
    });
    setActioningId(null);
    if (res.ok) {
      setToast({ msg: currently ? 'Разморожено' : 'Заморожено', type: 'ok' });
      load();
    } else {
      setToast({ msg: 'Действие не удалось', type: 'err' });
    }
  }

  async function sendReminder(companyId: string) {
    const token = localStorage.getItem('accessToken') ?? sessionStorage.getItem('accessToken');
    setActioningId(companyId);
    const res  = await fetch(`/api/admin/companies/${companyId}/reminder`, {
      method:  'POST',
      headers: { Authorization: `Bearer ${token ?? ''}` },
    });
    setActioningId(null);
    const json = await res.json();
    if (json.success) setToast({ msg: `Напоминание отправлено на ${json.data.to}`, type: 'ok' });
    else              setToast({ msg: json.error ?? 'Ошибка отправки', type: 'err' });
  }

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen text-white" style={{ background: '#0A0E27' }}>
      {/* Header */}
      <header
        className="sticky top-0 z-30 px-4 sm:px-8 py-4 flex items-center gap-3 sm:gap-4"
        style={{ background: 'rgba(10,14,39,0.85)', borderBottom: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(16px)' }}
      >
        <Link href="/admin" className="text-sm transition-colors" style={{ color: '#94a3b8' }}>
          ← Админ
        </Link>
        <div className="h-5 w-px" style={{ background: 'rgba(255,255,255,0.10)' }} />
        <h1 className="text-base sm:text-lg font-bold">Клиенты</h1>
        <button
          onClick={load}
          className="ml-auto text-xs px-3 py-1.5 rounded-lg transition-colors"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', color: '#94a3b8' }}
        >
          ↻ Обновить
        </button>
      </header>

      <main className="p-4 sm:p-8 max-w-7xl mx-auto">
        {/* ── Stats ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <StatCard label="Компаний всего"      value={data?.stats.totalCompanies   ?? 0} icon="🏢" color="#fff" />
          <StatCard label="Активных за 30 дней" value={data?.stats.activeCompanies  ?? 0} icon="📈" color="#34d399" />
          <StatCard label="MRR"                 value={data?.stats.mrr              ?? 0} icon="💰" color="#60a5fa" suffix="$" />
          <StatCard label="Задолженность"       value={data?.stats.totalOverdue     ?? 0} icon="⚠"  color="#f87171" suffix="$" />
        </div>

        {/* ── Filters ────────────────────────────────────────────────── */}
        <div
          className="rounded-2xl p-4 mb-4"
          style={{ background: '#141830', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="🔍 Название компании..."
              className="rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)', color: '#fff' }}
            />
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)', color: '#fff' }}
            >
              <option value="" style={{ background: '#141830' }}>Все тарифы</option>
              <option value="free"         style={{ background: '#141830' }}>Free</option>
              <option value="starter"      style={{ background: '#141830' }}>Starter</option>
              <option value="professional" style={{ background: '#141830' }}>Pro</option>
              <option value="enterprise"   style={{ background: '#141830' }}>Enterprise</option>
            </select>
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)', color: '#fff' }}
            >
              <option value=""        style={{ background: '#141830' }}>Все статусы оплаты</option>
              <option value="active"  style={{ background: '#141830' }}>Активна</option>
              <option value="pending" style={{ background: '#141830' }}>Ожидание</option>
              <option value="overdue" style={{ background: '#141830' }}>Просрочена</option>
            </select>
            <div className="flex gap-2">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="flex-1 rounded-xl px-3 py-2 text-sm min-w-0 focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)', color: '#fff' }}
              />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="flex-1 rounded-xl px-3 py-2 text-sm min-w-0 focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)', color: '#fff' }}
              />
            </div>
          </div>
        </div>

        {/* ── Table ──────────────────────────────────────────────────── */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: '#141830', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          {loading ? (
            <div className="p-12 flex justify-center">
              <motion.div
                className="w-8 h-8 rounded-full border-2 border-blue-500/30 border-t-blue-500"
                animate={{ rotate: 360 }}
                transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
              />
            </div>
          ) : !data || data.companies.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-4xl mb-3">🏢</p>
              <p className="text-sm" style={{ color: '#94a3b8' }}>Компаний не найдено</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[1200px]">
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
                    {[
                      'Компания', 'Email админа', 'Регистрация', 'Тариф',
                      'Статус оплаты', 'Долг', 'Оценок/мес', 'Активность', 'Действия',
                    ].map((h) => (
                      <th
                        key={h}
                        className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wide"
                        style={{ color: '#64748b' }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.companies.map((c) => {
                    const planConf = PLAN_BADGE[c.planName] ?? PLAN_BADGE.free;
                    const payConf  = PAYMENT_BADGE[c.paymentStatus] ?? PAYMENT_BADGE.active;
                    return (
                      <tr
                        key={c.id}
                        className="transition-colors"
                        style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', opacity: c.isBlocked ? 0.45 : 1 }}
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium text-white">{c.name}</div>
                          <div className="text-xs" style={{ color: '#64748b' }}>{c.userCount} польз.</div>
                        </td>
                        <td className="px-4 py-3 text-xs" style={{ color: '#94a3b8' }}>
                          {c.adminEmail ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-xs tabular-nums" style={{ color: '#64748b' }}>
                          {new Date(c.registeredAt).toLocaleDateString('ru-RU')}
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={c.planId ?? ''}
                            onChange={(e) => changePlan(c.id, e.target.value)}
                            disabled={actioningId === c.id}
                            className="text-xs font-medium px-2.5 py-1 rounded-full focus:outline-none cursor-pointer"
                            style={{ background: planConf.bg, border: `1px solid ${planConf.border}`, color: planConf.text }}
                          >
                            <option value="" style={{ background: '#141830', color: '#fff' }}>Free</option>
                            {data.plans.map((p) => (
                              <option key={p.id} value={p.id} style={{ background: '#141830', color: '#fff' }}>
                                {p.displayName}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full"
                            style={{ background: payConf.bg, border: `1px solid ${payConf.border}`, color: payConf.text }}
                          >
                            <span>{payConf.icon}</span>{payConf.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs tabular-nums">
                          {c.overdueAmount > 0 ? (
                            <span style={{ color: '#f87171', fontWeight: 600 }}>${c.overdueAmount}</span>
                          ) : (
                            <span style={{ color: '#64748b' }}>—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs tabular-nums text-white">
                          {c.assessmentsThisMonth}
                        </td>
                        <td className="px-4 py-3 text-xs tabular-nums" style={{ color: '#64748b' }}>
                          {c.lastActivityAt
                            ? new Date(c.lastActivityAt).toLocaleDateString('ru-RU')
                            : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 flex-wrap">
                            <Link
                              href={`/admin?company=${c.id}`}
                              className="text-xs px-2 py-1 rounded-md transition-colors"
                              style={{ background: 'rgba(255,255,255,0.04)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)' }}
                            >
                              Просмотр
                            </Link>
                            <button
                              onClick={() => sendReminder(c.id)}
                              disabled={actioningId === c.id}
                              className="text-xs px-2 py-1 rounded-md transition-colors disabled:opacity-40"
                              style={{ background: 'rgba(245,158,11,0.10)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.25)' }}
                            >
                              Напомнить
                            </button>
                            <button
                              onClick={() => toggleBlock(c.id, c.isBlocked)}
                              disabled={actioningId === c.id}
                              className="text-xs px-2 py-1 rounded-md transition-colors disabled:opacity-40"
                              style={
                                c.isBlocked
                                  ? { background: 'rgba(16,185,129,0.10)', color: '#34d399', border: '1px solid rgba(16,185,129,0.25)' }
                                  : { background: 'rgba(239,68,68,0.10)',  color: '#f87171', border: '1px solid rgba(239,68,68,0.25)' }
                              }
                            >
                              {c.isBlocked ? 'Разморозить' : 'Заморозить'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      <AnimatePresence>
        {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
      </AnimatePresence>
    </div>
  );
}
