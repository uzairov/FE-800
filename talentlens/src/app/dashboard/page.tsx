'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/client-fetch';

const STATUS_LABEL: Record<string, string> = {
  CREATED: 'Создана',
  LINK_OPENED: 'Ссылка открыта',
  IN_PROGRESS: 'Проходит тест',
  COMPLETED: 'Завершена',
};

const STATUS_COLOR: Record<string, string> = {
  CREATED: 'bg-gray-100 text-gray-600',
  LINK_OPENED: 'bg-blue-50 text-blue-600',
  IN_PROGRESS: 'bg-yellow-50 text-yellow-700',
  COMPLETED: 'bg-green-50 text-green-700',
};

interface Assessment {
  id: string;
  candidateName: string;
  status: string;
  createdAt: string;
  position: { name: string };
  linkUuid: string;
}

export default function DashboardPage() {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ assessments: Assessment[]; total: number }>('/api/assessments?limit=5')
      .then((res) => {
        if (res.success) {
          setAssessments(res.data.assessments);
          setTotal(res.data.total);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const stats = {
    total,
    completed: assessments.filter((a) => a.status === 'COMPLETED').length,
    inProgress: assessments.filter((a) => a.status === 'IN_PROGRESS').length,
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Обзор</h1>
        <Link
          href="/dashboard/assessments/new"
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + Новая оценка
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Всего оценок', value: total },
          { label: 'Завершено', value: stats.completed },
          { label: 'В процессе', value: stats.inProgress },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 p-5">
            <p className="text-sm text-gray-500">{label}</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
          </div>
        ))}
      </div>

      {/* Recent assessments */}
      <div className="bg-white rounded-xl border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Последние оценки</h2>
          <Link href="/dashboard/assessments" className="text-sm text-blue-600 hover:underline">
            Все →
          </Link>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">Загрузка...</div>
        ) : assessments.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">
            Нет оценок. <Link href="/dashboard/assessments/new" className="text-blue-600 hover:underline">Создать первую →</Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 text-xs border-b border-gray-100">
                <th className="text-left px-6 py-3 font-medium">Кандидат</th>
                <th className="text-left px-6 py-3 font-medium">Должность</th>
                <th className="text-left px-6 py-3 font-medium">Статус</th>
                <th className="text-left px-6 py-3 font-medium">Дата</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody>
              {assessments.map((a) => (
                <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-6 py-3 font-medium text-gray-900">{a.candidateName}</td>
                  <td className="px-6 py-3 text-gray-600">{a.position.name}</td>
                  <td className="px-6 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[a.status]}`}>
                      {STATUS_LABEL[a.status]}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-gray-400">
                    {new Date(a.createdAt).toLocaleDateString('ru-RU')}
                  </td>
                  <td className="px-6 py-3 text-right">
                    <Link href={`/dashboard/assessments/${a.id}`} className="text-blue-600 hover:underline">
                      Открыть
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
