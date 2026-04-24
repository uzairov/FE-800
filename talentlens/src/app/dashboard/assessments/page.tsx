'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { apiFetch } from '@/lib/client-fetch';
import { useLang } from '@/context/LangContext';

interface Assessment {
  id: string;
  candidateName: string;
  status: string;
  createdAt: string;
  linkUuid: string;
  estimatedMinutes: number;
  position: { name: string; industry: string };
  testSession: { startedAt: string | null; finishedAt: string | null; language: string } | null;
}

const STATUS_COLOR: Record<string, string> = {
  CREATED:     'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  LINK_OPENED: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  IN_PROGRESS: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  COMPLETED:   'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
};

type SortField = 'createdAt' | 'candidateName' | 'status';
type SortDir   = 'asc' | 'desc';

export default function AssessmentsPage() {
  const { t } = useLang();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [total,    setTotal]    = useState(0);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [status,   setStatus]   = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo,   setDateTo]   = useState('');
  const [sort,     setSort]     = useState<SortField>('createdAt');
  const [dir,      setDir]      = useState<SortDir>('desc');
  const [page,     setPage]     = useState(1);
  const [copied,   setCopied]   = useState<string | null>(null);

  const STATUS_OPTS = [
    { value: '',            label: t('filter_all') },
    { value: 'CREATED',     label: t('status_CREATED') },
    { value: 'LINK_OPENED', label: t('status_LINK_OPENED') },
    { value: 'IN_PROGRESS', label: t('status_IN_PROGRESS') },
    { value: 'COMPLETED',   label: t('status_COMPLETED') },
  ];

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '20', sort, dir });
    if (search)   params.set('search',   search);
    if (status)   params.set('status',   status);
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo)   params.set('dateTo',   dateTo);

    const res = await apiFetch<{ assessments: Assessment[]; total: number }>(`/api/assessments?${params}`);
    if (res.success) { setAssessments(res.data.assessments); setTotal(res.data.total); }
    setLoading(false);
  }, [page, search, status, dateFrom, dateTo, sort, dir]);

  useEffect(() => { load(); }, [load]);

  function copyLink(uuid: string) {
    navigator.clipboard.writeText(`${window.location.origin}/test/${uuid}`);
    setCopied(uuid);
    setTimeout(() => setCopied(null), 2000);
  }

  function toggleSort(field: SortField) {
    if (sort === field) setDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSort(field); setDir('desc'); }
    setPage(1);
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sort !== field) return <span className="text-[var(--text-faint)] ml-1">↕</span>;
    return <span className="text-blue-500 ml-1">{dir === 'asc' ? '↑' : '↓'}</span>;
  }

  const pages = Math.ceil(total / 20);

  return (
    <div className="p-4 sm:p-8 page-enter">
      <div className="flex items-start sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--text)]">{t('page_assessments')}</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">{t('stat_total')}: {total}</p>
        </div>
        <Link
          href="/dashboard/assessments/new"
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-lg shadow-blue-600/20 shrink-0"
        >
          {t('btn_new')}
        </Link>
      </div>

      {/* ── Filters ─────────────────────────────────────────────────────── */}
      <div className="bg-[var(--surface)] border border-[var(--border-strong)] rounded-2xl p-4 mb-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder={t('search_ph')}
            className="flex-1 rounded-xl border border-[var(--border-strong)] bg-[var(--bg)] px-4 py-2 text-sm text-[var(--text)] placeholder:text-[var(--text-faint)] focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="rounded-xl border border-[var(--border-strong)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {STATUS_OPTS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>

        {/* Date range */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-sm">
          <span className="text-[var(--text-muted)] shrink-0">
            {t('lbl_expires').replace('Истекает', 'Период').replace('Expires', 'Period').replace('Muddati', 'Davr')}:
          </span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            className="rounded-xl border border-[var(--border-strong)] bg-[var(--bg)] px-3 py-1.5 text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-0"
          />
          <span className="text-[var(--text-faint)]">—</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            className="rounded-xl border border-[var(--border-strong)] bg-[var(--bg)] px-3 py-1.5 text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-0"
          />
          {(dateFrom || dateTo) && (
            <button
              onClick={() => { setDateFrom(''); setDateTo(''); setPage(1); }}
              className="text-xs text-[var(--text-muted)] hover:text-red-500 transition-colors"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ── Table ──────────────────────────────────────────────────────── */}
      <div className="bg-[var(--surface)] border border-[var(--border-strong)] rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-12 flex items-center justify-center">
            <svg className="animate-spin w-6 h-6 text-blue-500" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
            </svg>
          </div>
        ) : assessments.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-4xl mb-3">📋</p>
            <p className="text-sm text-[var(--text-muted)]">{t('no_results')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[580px]">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--bg)]">
                <th className="text-left px-6 py-3 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">
                  <button onClick={() => toggleSort('candidateName')} className="hover:text-[var(--text)] transition-colors">
                    {t('col_candidate')} <SortIcon field="candidateName" />
                  </button>
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">{t('col_position')}</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">
                  <button onClick={() => toggleSort('status')} className="hover:text-[var(--text)] transition-colors">
                    {t('col_status')} <SortIcon field="status" />
                  </button>
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">
                  <button onClick={() => toggleSort('createdAt')} className="hover:text-[var(--text)] transition-colors">
                    {t('col_date')} <SortIcon field="createdAt" />
                  </button>
                </th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {assessments.map((a, i) => (
                  <motion.tr
                    key={a.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0, transition: { delay: i * 0.03 } }}
                    className="border-b border-[var(--border)] hover:bg-[var(--bg)] transition-colors"
                  >
                    <td className="px-6 py-3 font-medium text-[var(--text)]">{a.candidateName}</td>
                    <td className="px-6 py-3 text-[var(--text-muted)]">
                      <div>{a.position.name}</div>
                      <div className="text-xs text-[var(--text-faint)]">{a.position.industry}</div>
                    </td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLOR[a.status]}`}>
                        {t(`status_${a.status}` as Parameters<typeof t>[0])}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-[var(--text-faint)] text-xs tabular-nums">
                      {new Date(a.createdAt).toLocaleDateString('ru-RU')}
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3 justify-end">
                        <button
                          onClick={() => copyLink(a.linkUuid)}
                          className="text-xs text-[var(--text-muted)] hover:text-blue-600 transition-colors"
                        >
                          {copied === a.linkUuid ? t('copied') : t('btn_copy')}
                        </button>
                        {a.status === 'COMPLETED' && (
                          <Link href={`/dashboard/assessments/${a.id}/report`} className="text-xs text-blue-600 hover:underline font-medium">
                            {t('btn_report').replace(' →', '')}
                          </Link>
                        )}
                        <Link href={`/dashboard/assessments/${a.id}`} className="text-xs text-[var(--text-muted)] hover:text-[var(--text)] transition-colors">
                          {t('open')}
                        </Link>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
          </div>
        )}
      </div>

      {/* ── Pagination ──────────────────────────────────────────────────── */}
      {pages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-[var(--text-muted)]">
          <span>{page} / {pages}</span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg border border-[var(--border-strong)] hover:bg-[var(--border)] disabled:opacity-40 transition-colors"
            >←</button>
            <button
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={page === pages}
              className="px-3 py-1.5 rounded-lg border border-[var(--border-strong)] hover:bg-[var(--border)] disabled:opacity-40 transition-colors"
            >→</button>
          </div>
        </div>
      )}
    </div>
  );
}
