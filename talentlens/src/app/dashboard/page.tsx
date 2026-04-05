'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { apiFetch } from '@/lib/client-fetch';
import { useLang } from '@/context/LangContext';

const STATUS_COLOR: Record<string, string> = {
  CREATED:     'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  LINK_OPENED: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  IN_PROGRESS: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  COMPLETED:   'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
};

// ── Live pulse dot ────────────────────────────────────────────────────────────
function PulseDot({ color = '#3b82f6' }: { color?: string }) {
  return (
    <span className="relative inline-flex w-2.5 h-2.5">
      <motion.span
        className="absolute inline-flex h-full w-full rounded-full opacity-75"
        style={{ background: color }}
        animate={{ scale: [1, 2.2, 1], opacity: [0.7, 0, 0.7] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
      />
      <span className="relative inline-flex rounded-full w-2.5 h-2.5" style={{ background: color }} />
    </span>
  );
}

// ── Count-up number animation ─────────────────────────────────────────────────
function CountUp({ target, duration = 1.2 }: { target: number; duration?: number }) {
  const [value, setValue] = useState(0);
  const frameRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);
  const prevTarget = useRef(0);

  useEffect(() => {
    if (target === prevTarget.current) return;
    const from = prevTarget.current;
    prevTarget.current = target;
    startRef.current = null;

    function tick(ts: number) {
      if (!startRef.current) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const progress = Math.min(elapsed / (duration * 1000), 1);
      // ease out cubic
      const ease = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(from + (target - from) * ease));
      if (progress < 1) frameRef.current = requestAnimationFrame(tick);
    }

    frameRef.current = requestAnimationFrame(tick);
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); };
  }, [target, duration]);

  return <>{value}</>;
}

// ── Stat card ─────────────────────────────────────────────────────────────────
const STAT_META = [
  {
    gradient: 'linear-gradient(135deg, rgba(59,130,246,0.12) 0%, rgba(37,99,235,0.06) 100%)',
    borderColor: 'rgba(59,130,246,0.2)',
    iconBg: 'rgba(59,130,246,0.15)',
    iconColor: '#3b82f6',
    pulseColor: '#3b82f6',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
        <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
        <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd"/>
      </svg>
    ),
  },
  {
    gradient: 'linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(5,150,105,0.06) 100%)',
    borderColor: 'rgba(16,185,129,0.2)',
    iconBg: 'rgba(16,185,129,0.15)',
    iconColor: '#10b981',
    pulseColor: '#10b981',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
      </svg>
    ),
  },
  {
    gradient: 'linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(217,119,6,0.06) 100%)',
    borderColor: 'rgba(245,158,11,0.2)',
    iconBg: 'rgba(245,158,11,0.15)',
    iconColor: '#f59e0b',
    pulseColor: '#f59e0b',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/>
      </svg>
    ),
  },
];

interface Assessment {
  id: string;
  candidateName: string;
  status: string;
  createdAt: string;
  position: { name: string };
}

export default function DashboardPage() {
  const { t } = useLang();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [total,   setTotal]   = useState(0);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    apiFetch<{ assessments: Assessment[]; total: number }>('/api/assessments?limit=5&sort=createdAt&dir=desc')
      .then((res) => { if (res.success) { setAssessments(res.data.assessments); setTotal(res.data.total); } })
      .finally(() => setLoading(false));
  }, []);

  const completed  = assessments.filter((a) => a.status === 'COMPLETED').length;
  const inProgress = assessments.filter((a) => a.status === 'IN_PROGRESS').length;

  const statCards = [
    { label: t('stat_total'),    value: total,      meta: STAT_META[0] },
    { label: t('stat_done'),     value: completed,  meta: STAT_META[1] },
    { label: t('stat_progress'), value: inProgress, meta: STAT_META[2] },
  ];

  return (
    <div className="p-8 page-enter relative overflow-hidden">

      {/* ── Ambient background glow ─────────────────────────────────────── */}
      <motion.div
        className="absolute -top-24 -right-24 w-96 h-96 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse, rgba(59,130,246,0.07) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}
        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-8 relative">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-[var(--text)]">{t('page_overview')}</h1>
            <PulseDot color="#3b82f6" />
          </div>
          <p className="text-sm text-[var(--text-muted)]">{t('welcome')}</p>
        </div>
        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
          <Link
            href="/dashboard/assessments/new"
            className="relative overflow-hidden bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors shadow-lg shadow-blue-600/20 flex items-center gap-2"
          >
            <span className="text-base leading-none">+</span>
            {t('btn_new').replace('+ ', '')}
          </Link>
        </motion.div>
      </div>

      {/* ── Stat cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {statCards.map(({ label, value, meta }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: i * 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ y: -2, transition: { duration: 0.2 } }}
            className="relative overflow-hidden rounded-2xl p-5 cursor-default"
            style={{ background: meta.gradient, border: `1px solid ${meta.borderColor}` }}
          >
            {/* Shimmer on hover */}
            <motion.div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.06) 50%, transparent 60%)',
                backgroundSize: '200% 100%',
              }}
              animate={{ backgroundPosition: ['-200% 0', '300% 0'] }}
              transition={{ duration: 3, delay: 1 + i * 0.4, repeat: Infinity, repeatDelay: 3 }}
            />

            <div className="flex items-start justify-between mb-3 relative">
              <p className="text-sm font-medium text-[var(--text-muted)]">{label}</p>
              <motion.div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: meta.iconBg, color: meta.iconColor }}
                animate={{ rotate: [0, 3, -3, 0] }}
                transition={{ duration: 4, delay: i * 0.5, repeat: Infinity, ease: 'easeInOut' }}
              >
                {meta.icon}
              </motion.div>
            </div>

            <div className="flex items-end gap-2 relative">
              <p className="text-4xl font-black" style={{ color: meta.iconColor }}>
                {mounted ? <CountUp target={value} duration={1.0 + i * 0.15} /> : value}
              </p>
              {i === 2 && inProgress > 0 && (
                <span className="mb-1.5">
                  <PulseDot color={meta.pulseColor} />
                </span>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Recent assessments ──────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="bg-[var(--surface)] border border-[var(--border-strong)] rounded-2xl overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <h2 className="font-semibold text-[var(--text)]">{t('recent')}</h2>
          <Link href="/dashboard/assessments" className="text-sm text-blue-600 hover:underline">{t('all')}</Link>
        </div>

        {loading ? (
          <div className="p-12 flex justify-center">
            <motion.div
              className="w-8 h-8 rounded-full border-2 border-blue-500/30 border-t-blue-500"
              animate={{ rotate: 360 }}
              transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
            />
          </div>
        ) : assessments.length === 0 ? (
          <div className="p-14 text-center">
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              className="text-5xl mb-4"
            >🚀</motion.div>
            <p className="text-sm text-[var(--text-muted)] mb-3">{t('no_assessments')}</p>
            <Link href="/dashboard/assessments/new" className="text-sm text-blue-600 hover:underline font-medium">
              {t('create_first')}
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--bg)]">
                {[t('col_candidate'), t('col_position'), t('col_status'), t('col_date'), ''].map((h, i) => (
                  <th key={i} className="text-left px-6 py-3 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {assessments.map((a, i) => (
                  <motion.tr
                    key={a.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + i * 0.06, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    className="border-b border-[var(--border)] hover:bg-[var(--bg)] transition-colors group"
                  >
                    <td className="px-6 py-3 font-medium text-[var(--text)]">{a.candidateName}</td>
                    <td className="px-6 py-3 text-[var(--text-muted)]">{a.position.name}</td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLOR[a.status]}`}>
                        {a.status === 'IN_PROGRESS' && <PulseDot color="#f59e0b" />}
                        {t(`status_${a.status}` as Parameters<typeof t>[0])}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-[var(--text-faint)] text-xs tabular-nums">
                      {new Date(a.createdAt).toLocaleDateString('ru-RU')}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <Link
                        href={`/dashboard/assessments/${a.id}`}
                        className="text-xs text-blue-600 hover:underline font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        {t('open')}
                      </Link>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        )}
      </motion.div>
    </div>
  );
}
