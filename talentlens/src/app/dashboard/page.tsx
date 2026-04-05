'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { apiFetch } from '@/lib/client-fetch';
import { useLang } from '@/context/LangContext';

const STATUS_COLOR: Record<string, string> = {
  CREATED:     'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  LINK_OPENED: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  IN_PROGRESS: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  COMPLETED:   'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
};

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

  useEffect(() => {
    apiFetch<{ assessments: Assessment[]; total: number }>('/api/assessments?limit=5&sort=createdAt&dir=desc')
      .then((res) => { if (res.success) { setAssessments(res.data.assessments); setTotal(res.data.total); } })
      .finally(() => setLoading(false));
  }, []);

  const completed  = assessments.filter((a) => a.status === 'COMPLETED').length;
  const inProgress = assessments.filter((a) => a.status === 'IN_PROGRESS').length;

  const statCards = [
    { label: t('stat_total'),    value: total,      icon: '📋', color: 'text-blue-600' },
    { label: t('stat_done'),     value: completed,   icon: '✅', color: 'text-emerald-600' },
    { label: t('stat_progress'), value: inProgress,  icon: '⏳', color: 'text-amber-600' },
  ];

  return (
    <div className="p-8 page-enter">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">{t('page_overview')}</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">{t('welcome')}</p>
        </div>
        <Link
          href="/dashboard/assessments/new"
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-lg shadow-blue-600/20"
        >
          {t('btn_new')}
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {statCards.map(({ label, value, icon, color }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0, transition: { delay: i * 0.07 } }}
            className="bg-[var(--surface)] border border-[var(--border-strong)] rounded-2xl p-5"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-[var(--text-muted)]">{label}</p>
              <span className="text-xl">{icon}</span>
            </div>
            <p className={`text-3xl font-bold ${color}`}>{value}</p>
          </motion.div>
        ))}
      </div>

      {/* Recent */}
      <div className="bg-[var(--surface)] border border-[var(--border-strong)] rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <h2 className="font-semibold text-[var(--text)]">{t('recent')}</h2>
          <Link href="/dashboard/assessments" className="text-sm text-blue-600 hover:underline">{t('all')}</Link>
        </div>

        {loading ? (
          <div className="p-12 flex justify-center">
            <svg className="animate-spin w-5 h-5 text-blue-500" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
            </svg>
          </div>
        ) : assessments.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-4xl mb-3">🚀</p>
            <p className="text-sm text-[var(--text-muted)] mb-3">{t('no_assessments')}</p>
            <Link href="/dashboard/assessments/new" className="text-sm text-blue-600 hover:underline font-medium">
              {t('create_first')}
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--bg)]">
                {[t('col_candidate'), t('col_position'), t('col_status'), t('col_date'), ''].map((h) => (
                  <th key={h} className="text-left px-6 py-3 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {assessments.map((a) => (
                <tr key={a.id} className="border-b border-[var(--border)] hover:bg-[var(--bg)] transition-colors">
                  <td className="px-6 py-3 font-medium text-[var(--text)]">{a.candidateName}</td>
                  <td className="px-6 py-3 text-[var(--text-muted)]">{a.position.name}</td>
                  <td className="px-6 py-3">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLOR[a.status]}`}>
                      {t(`status_${a.status}` as Parameters<typeof t>[0])}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-[var(--text-faint)] text-xs tabular-nums">
                    {new Date(a.createdAt).toLocaleDateString('ru-RU')}
                  </td>
                  <td className="px-6 py-3 text-right">
                    <Link href={`/dashboard/assessments/${a.id}`} className="text-xs text-blue-600 hover:underline font-medium">
                      {t('open')}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
