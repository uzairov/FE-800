'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

interface F360 {
  id: string;
  name: string;
  description?: string;
  status: string;
  startedAt?: string;
  closedAt?: string;
  participantIds: string[];
  competencies: string[];
  _count?: { ratings: number; responses: number };
}

const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  draft:    { label: 'Черновик',  color: 'bg-zinc-700 text-zinc-300' },
  active:   { label: 'Активна',   color: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' },
  closed:   { label: 'Завершена', color: 'bg-blue-500/20 text-blue-400 border border-blue-500/30' },
  archived: { label: 'Архив',     color: 'bg-zinc-800 text-zinc-500' },
};

export default function Feedback360ListPage() {
  const [items, setItems]   = useState<F360[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/feedback360', { headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` } })
      .then((r) => r.json())
      .then((d) => { if (d.success) setItems(d.data); })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white p-6 sm:p-10">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Оценки 360°</h1>
            <p className="text-sm text-zinc-500 mt-1">Всесторонняя оценка сотрудников</p>
          </div>
          <Link
            href="/dashboard/feedback360/new"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
          >
            <span className="text-base leading-none">+</span>
            Новая оценка
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-5xl mb-4">🔄</div>
            <p className="text-zinc-400 text-lg font-medium mb-2">Нет оценок 360°</p>
            <p className="text-zinc-600 text-sm mb-6">Создайте первую оценку для сотрудников</p>
            <Link href="/dashboard/feedback360/new" className="text-blue-400 hover:text-blue-300 text-sm underline underline-offset-4">
              Создать оценку →
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-white/8">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/8">
                  {['Название', 'Статус', 'Участников', 'Компетенций', 'Дата', 'Действия'].map((h) => (
                    <th key={h} className="text-left text-zinc-500 font-medium px-5 py-3.5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => {
                  const badge = STATUS_BADGE[item.status] ?? STATUS_BADGE.draft;
                  return (
                    <motion.tr
                      key={item.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="border-b border-white/5 hover:bg-white/3 transition-colors"
                    >
                      <td className="px-5 py-4">
                        <p className="font-medium text-white">{item.name}</p>
                        {item.description && <p className="text-zinc-500 text-xs mt-0.5 line-clamp-1">{item.description}</p>}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${badge.color}`}>{badge.label}</span>
                      </td>
                      <td className="px-5 py-4 text-zinc-300">{item.participantIds.length}</td>
                      <td className="px-5 py-4 text-zinc-300">{item.competencies.length}</td>
                      <td className="px-5 py-4 text-zinc-500">
                        {item.startedAt ? new Date(item.startedAt).toLocaleDateString('ru-RU') : '—'}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex gap-2">
                          <Link
                            href={`/dashboard/feedback360/${item.id}/report`}
                            className="text-xs bg-white/8 hover:bg-white/12 text-zinc-300 px-3 py-1.5 rounded-lg transition-colors"
                          >
                            Отчёт
                          </Link>
                          {item.status === 'draft' && (
                            <SendButton id={item.id} onSent={() => setItems((prev) =>
                              prev.map((p) => p.id === item.id ? { ...p, status: 'active' } : p)
                            )} />
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  );
}

function SendButton({ id, onSent }: { id: string; onSent: () => void }) {
  const [loading, setLoading] = useState(false);

  async function send() {
    setLoading(true);
    await fetch(`/api/feedback360/${id}/send`, {
      method:  'POST',
      headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      body:    JSON.stringify({}),
    });
    onSent();
    setLoading(false);
  }

  return (
    <button
      onClick={send}
      disabled={loading}
      className="text-xs bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 border border-blue-500/30 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
    >
      {loading ? '...' : 'Активировать'}
    </button>
  );
}
