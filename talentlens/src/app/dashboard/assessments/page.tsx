'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { apiFetch } from '@/lib/client-fetch';

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

const STATUS_LABEL: Record<string, string> = {
  CREATED:     'Создана',
  LINK_OPENED: 'Ссылка открыта',
  IN_PROGRESS: 'Проходит тест',
  COMPLETED:   'Завершена',
};

const STATUS_COLOR: Record<string, string> = {
  CREATED:     'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  LINK_OPENED: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  IN_PROGRESS: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  COMPLETED:   'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
};

type SortField = 'createdAt' | 'candidateName' | 'status';
type SortDir   = 'asc' | 'desc';

export default function AssessmentsPage() {
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
    <div className="p-8 page-enter">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">Оценки</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">Всего: {total}</p>
        </div>
        <Link
          href="/dashboard/assessments/new"
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-lg shadow-blue-600/20"
        >
          + Новая оценка
        </Link>
      </div>

      {/* ── Filters ─────────────────────────────────────────────────────── */}
      <div className="bg-[var(--surface)] border border-[var(--border-strong)] rounded-2xl p-4 mb-4 space-y-3">
        <div className="flex gap-3">
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Поиск по имени кандидата..."
            className="flex-1 rounded-xl border border-[var(--border-strong)] bg-[var(--bg)] px-4 py-2 text-sm text-[var(--text)] placeholder:text-[var(--text-faint)] focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="rounded-xl border border-[var(--border-strong)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Все статусы</option>
            {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>

        {/* Date range */}
        <div className="flex items-center gap-3 text-sm">
          <span className="text-[var(--text-muted)] shrink-0">Период:</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            className="rounded-xl border border-[var(--border-strong)] bg-[var(--bg)] px-3 py-1.5 text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-[var(--text-faint)]">—</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            className="rounded-xl border border-[var(--border-strong)] bg-[var(--bg)] px-3 py-1.5 text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {(dateFrom || dateTo) && (
            <button
              onClick={() => { setDateFrom(''); setDateTo(''); setPage(1); }}
              className="text-xs text-[var(--text-muted)] hover:text-red-500 transition-colors"
            >
              Сбросить
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
            <p className="text-sm text-[var(--text-muted)]">Оценок не найдено</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--bg)]">
                <th className="text-left px-6 py-3 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">
                  <button onClick={() => toggleSort('candidateName')} className="hover:text-[var(--text)] transition-colors">
                    Кандидат <SortIcon field="candidateName" />
                  </button>
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">Должность</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">
                  <button onClick={() => toggleSort('status')} className="hover:text-[var(--text)] transition-colors">
                    Статус <SortIcon field="status" />
                  </button>
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">
                  <button onClick={() => toggleSort('createdAt')} className="hover:text-[var(--text)] transition-colors">
                    Дата <SortIcon field="createdAt" />
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
                        {STATUS_LABEL[a.status]}
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
                          {copied === a.linkUuid ? '✓ Скопировано' : 'Ссылка'}
                        </button>
                        {a.status === 'COMPLETED' && (
                          <Link href={`/dashboard/assessments/${a.id}/report`} className="text-xs text-blue-600 hover:underline font-medium">
                            Отчёт
                          </Link>
                        )}
                        <Link href={`/dashboard/assessments/${a.id}`} className="text-xs text-[var(--text-muted)] hover:text-[var(--text)] transition-colors">
                          Детали →
                        </Link>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        )}
      </div>

      {/* ── Pagination ──────────────────────────────────────────────────── */}
      {pages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-[var(--text-muted)]">
          <span>{page} / {pages} страниц</span>
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
