'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
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
  CREATED: 'Создана',
  LINK_OPENED: 'Ссылка открыта',
  IN_PROGRESS: 'Тест начат',
  COMPLETED: 'Завершена',
};

const STATUS_COLOR: Record<string, string> = {
  CREATED: 'bg-gray-100 text-gray-600',
  LINK_OPENED: 'bg-blue-50 text-blue-600',
  IN_PROGRESS: 'bg-yellow-50 text-yellow-700',
  COMPLETED: 'bg-green-50 text-green-700',
};

export default function AssessmentsPage() {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (search) params.set('search', search);
    if (statusFilter) params.set('status', statusFilter);

    const res = await apiFetch<{ assessments: Assessment[]; total: number }>(
      `/api/assessments?${params}`,
    );
    if (res.success) {
      setAssessments(res.data.assessments);
      setTotal(res.data.total);
    }
    setLoading(false);
  }, [page, search, statusFilter]);

  useEffect(() => { load(); }, [load]);

  function copyLink(uuid: string) {
    const link = `${window.location.origin}/test/${uuid}`;
    navigator.clipboard.writeText(link);
    setCopied(uuid);
    setTimeout(() => setCopied(null), 2000);
  }

  const pages = Math.ceil(total / 20);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Оценки</h1>
        <Link
          href="/dashboard/assessments/new"
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + Новая
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Поиск по имени..."
          className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Все статусы</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">Загрузка...</div>
        ) : assessments.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">Нет оценок</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 text-xs border-b border-gray-100 bg-gray-50">
                <th className="text-left px-6 py-3 font-medium">Кандидат</th>
                <th className="text-left px-6 py-3 font-medium">Должность</th>
                <th className="text-left px-6 py-3 font-medium">Статус</th>
                <th className="text-left px-6 py-3 font-medium">Создана</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody>
              {assessments.map((a) => (
                <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-6 py-3 font-medium text-gray-900">{a.candidateName}</td>
                  <td className="px-6 py-3 text-gray-600">
                    <div>{a.position.name}</div>
                    <div className="text-xs text-gray-400">{a.position.industry}</div>
                  </td>
                  <td className="px-6 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[a.status]}`}>
                      {STATUS_LABEL[a.status]}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-gray-400 text-xs">
                    {new Date(a.createdAt).toLocaleDateString('ru-RU')}
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3 justify-end">
                      <button
                        onClick={() => copyLink(a.linkUuid)}
                        className="text-xs text-gray-500 hover:text-blue-600 transition-colors"
                        title="Скопировать ссылку"
                      >
                        {copied === a.linkUuid ? '✓ Скопировано' : 'Ссылка'}
                      </button>
                      {a.status === 'COMPLETED' && (
                        <Link
                          href={`/dashboard/assessments/${a.id}/report`}
                          className="text-xs text-blue-600 hover:underline font-medium"
                        >
                          Отчёт
                        </Link>
                      )}
                      <Link
                        href={`/dashboard/assessments/${a.id}`}
                        className="text-xs text-gray-500 hover:text-gray-900"
                      >
                        Детали
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
          <span>Всего: {total}</span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
            >
              ←
            </button>
            <span className="px-3 py-1">{page} / {pages}</span>
            <button
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={page === pages}
              className="px-3 py-1 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
            >
              →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
