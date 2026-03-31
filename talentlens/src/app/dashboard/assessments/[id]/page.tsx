'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/client-fetch';

interface Assessment {
  id: string;
  candidateName: string;
  status: string;
  linkUuid: string;
  estimatedMinutes: number;
  createdAt: string;
  linkExpiresAt: string;
  position: { name: string; industry: string };
  testSession: {
    language: string;
    startedAt: string | null;
    finishedAt: string | null;
    tabSwitches: number;
  } | null;
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

const LANG_LABEL: Record<string, string> = { ru: 'Русский', uz: "O'zbek", en: 'English' };

export default function AssessmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    apiFetch<Assessment>(`/api/assessments/${id}`)
      .then((res) => { if (res.success) setData(res.data); })
      .finally(() => setLoading(false));

    // Poll status every 10 s while not completed
    const interval = setInterval(async () => {
      const res = await apiFetch<Assessment>(`/api/assessments/${id}`);
      if (res.success) {
        setData(res.data);
        if (res.data.status === 'COMPLETED') clearInterval(interval);
      }
    }, 10_000);
    return () => clearInterval(interval);
  }, [id]);

  function copyLink() {
    if (!data) return;
    navigator.clipboard.writeText(`${window.location.origin}/test/${data.linkUuid}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleDelete() {
    if (!confirm('Удалить оценку?')) return;
    const res = await apiFetch(`/api/assessments/${id}`, { method: 'DELETE' });
    if (res.success) router.push('/dashboard/assessments');
  }

  if (loading) return <div className="p-8 text-sm text-gray-400">Загрузка...</div>;
  if (!data) return <div className="p-8 text-sm text-red-500">Оценка не найдена</div>;

  const link = `${typeof window !== 'undefined' ? window.location.origin : ''}/test/${data.linkUuid}`;

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
        <Link href="/dashboard/assessments" className="hover:text-gray-600">Оценки</Link>
        <span>›</span>
        <span className="text-gray-700">{data.candidateName}</span>
      </div>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{data.candidateName}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{data.position.name} · {data.position.industry}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLOR[data.status]}`}>
          {STATUS_LABEL[data.status]}
        </span>
      </div>

      {/* Link card */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
          Ссылка для кандидата
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-xs bg-gray-50 border border-gray-200 rounded px-3 py-2 text-gray-700 break-all">
            {link}
          </code>
          <button
            onClick={copyLink}
            className="shrink-0 text-xs bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            {copied ? '✓' : 'Копировать'}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Действует до: {new Date(data.linkExpiresAt).toLocaleDateString('ru-RU')}
        </p>
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Прогресс</p>
        <div className="space-y-3">
          {[
            { label: 'Оценка создана', date: data.createdAt, done: true },
            { label: 'Ссылка открыта', date: null, done: ['LINK_OPENED', 'IN_PROGRESS', 'COMPLETED'].includes(data.status) },
            { label: 'Тест начат', date: data.testSession?.startedAt ?? null, done: !!data.testSession?.startedAt },
            { label: 'Тест завершён', date: data.testSession?.finishedAt ?? null, done: !!data.testSession?.finishedAt },
          ].map(({ label, date, done }) => (
            <div key={label} className="flex items-center gap-3">
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center text-[10px] ${done ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300'}`}>
                {done && '✓'}
              </div>
              <span className={`text-sm ${done ? 'text-gray-900' : 'text-gray-400'}`}>{label}</span>
              {date && <span className="text-xs text-gray-400 ml-auto">{new Date(date).toLocaleString('ru-RU')}</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Session details */}
      {data.testSession && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Сессия</p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-400 text-xs">Язык</p>
              <p className="font-medium">{LANG_LABEL[data.testSession.language] ?? data.testSession.language}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">Переключений вкладок</p>
              <p className={`font-medium ${data.testSession.tabSwitches > 3 ? 'text-red-600' : 'text-gray-900'}`}>
                {data.testSession.tabSwitches}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        {data.status === 'COMPLETED' && (
          <Link
            href={`/dashboard/assessments/${data.id}/report`}
            className="bg-blue-600 text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Открыть отчёт
          </Link>
        )}
        <button
          onClick={handleDelete}
          className="text-sm text-red-500 hover:text-red-700 px-4 py-2 rounded-lg border border-red-200 hover:border-red-300 transition-colors"
        >
          Удалить
        </button>
      </div>
    </div>
  );
}
