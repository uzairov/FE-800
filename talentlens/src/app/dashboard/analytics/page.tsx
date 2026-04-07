'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { apiFetch } from '@/lib/client-fetch';
import { useLang } from '@/context/LangContext';

interface AnalyticsData {
  timeline:      { date: string; count: number }[];
  statusDist:    { status: string; count: number }[];
  competencyAvg: { competency: string; avg: number; count: number }[];
  total:         number;
  completed:     number;
  completionRate: number;
}

const STATUS_COLORS: Record<string, string> = {
  CREATED:     '#6b7280',
  LINK_OPENED: '#3b82f6',
  IN_PROGRESS: '#f59e0b',
  COMPLETED:   '#10b981',
};

const STATUS_LABELS: Record<string, string> = {
  CREATED:     'Создана',
  LINK_OPENED: 'Ссылка открыта',
  IN_PROGRESS: 'Проходит',
  COMPLETED:   'Завершена',
};

const COMP_LABELS: Record<string, string> = {
  sales_skills:              'Продажи',
  stress_resistance:         'Стресс',
  communication_flexibility: 'Гибкость',
  motivation:                'Мотивация',
  honesty:                   'Честность',
  emotional_intelligence:    'Эмоц. инт.',
  locus_of_control:          'Локус',
  attention:                 'Внимание',
  leadership:                'Лидерство',
  systems_thinking:          'Системность',
  negotiation:               'Переговоры',
  result_orientation:        'Результат',
  service_orientation:       'Сервис',
  monotolerance:             'Моноуст.',
  attention_to_detail:       'Детали',
  self_motivation:           'Самомот.',
};

function StatCard({ label, value, sub, color, delay }: {
  label: string; value: string | number; sub?: string; color: string; delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="bg-[var(--surface)] border border-[var(--border-strong)] rounded-2xl p-5"
    >
      <p className="text-xs text-[var(--text-muted)] mb-1">{label}</p>
      <p className={`text-3xl font-black ${color}`}>{value}</p>
      {sub && <p className="text-xs text-[var(--text-faint)] mt-1">{sub}</p>}
    </motion.div>
  );
}

export default function AnalyticsPage() {
  const { t } = useLang();
  const [data, setData]       = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<AnalyticsData>('/api/analytics')
      .then((res) => { if (res.success) setData(res.data); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="p-8 flex items-center gap-3 text-sm text-[var(--text-muted)]">
      <motion.div className="w-5 h-5 rounded-full border-2 border-blue-500/30 border-t-blue-500"
        animate={{ rotate: 360 }} transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }} />
      Загрузка аналитики...
    </div>
  );

  if (!data) return <div className="p-8 text-sm text-red-500">Не удалось загрузить данные</div>;

  const shortTimeline = data.timeline.map((d) => ({
    ...d,
    label: new Date(d.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }),
  }));

  return (
    <div className="p-8 page-enter">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--text)]">Аналитика</h1>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">Статистика за последние 30 дней</p>
      </motion.div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Всего оценок"    value={data.total}                         color="text-blue-600"    delay={0}    />
        <StatCard label="Завершено"        value={data.completed}                     color="text-emerald-600" delay={0.07} />
        <StatCard label="Конверсия"        value={`${data.completionRate}%`}          color="text-violet-600"  delay={0.14} sub="от создания до завершения" />
        <StatCard label="Компетенций"      value={data.competencyAvg.length}          color="text-amber-600"   delay={0.21} sub="оценено уникальных" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Activity timeline */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="lg:col-span-2 bg-[var(--surface)] border border-[var(--border-strong)] rounded-2xl p-5"
        >
          <h2 className="text-sm font-semibold text-[var(--text)] mb-4">Активность по дням</h2>
          {data.timeline.every((d) => d.count === 0) ? (
            <div className="flex items-center justify-center h-48 text-sm text-[var(--text-faint)]">Нет данных за 30 дней</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={shortTimeline} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} interval={4} />
                <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: '#94a3b8' }}
                  itemStyle={{ color: '#60a5fa' }}
                />
                <Area type="monotone" dataKey="count" name="Оценок" stroke="#3b82f6" strokeWidth={2} fill="url(#areaGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </motion.div>

        {/* Status distribution pie */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22, duration: 0.5 }}
          className="bg-[var(--surface)] border border-[var(--border-strong)] rounded-2xl p-5"
        >
          <h2 className="text-sm font-semibold text-[var(--text)] mb-4">Статусы</h2>
          {data.statusDist.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-sm text-[var(--text-faint)]">Нет данных</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={data.statusDist} dataKey="count" nameKey="status"
                    cx="50%" cy="50%" innerRadius={45} outerRadius={72} strokeWidth={2} stroke="transparent">
                    {data.statusDist.map((entry) => (
                      <Cell key={entry.status} fill={STATUS_COLORS[entry.status] ?? '#6b7280'} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                    formatter={(v: number, name: string) => [v, STATUS_LABELS[name] ?? name]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {data.statusDist.map((d) => (
                  <div key={d.status} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: STATUS_COLORS[d.status] ?? '#6b7280' }} />
                      <span className="text-[var(--text-muted)]">{STATUS_LABELS[d.status] ?? d.status}</span>
                    </div>
                    <span className="font-semibold text-[var(--text)]">{d.count}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </motion.div>
      </div>

      {/* Competency averages bar chart */}
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="bg-[var(--surface)] border border-[var(--border-strong)] rounded-2xl p-5"
      >
        <h2 className="text-sm font-semibold text-[var(--text)] mb-4">Средние баллы по компетенциям</h2>
        {data.competencyAvg.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-sm text-[var(--text-faint)]">
            Нет завершённых тестов
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.competencyAvg.map((c) => ({ ...c, label: COMP_LABELS[c.competency] ?? c.competency }))}
              margin={{ top: 5, right: 10, left: -20, bottom: 40 }}>
              <defs>
                <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#1d4ed8" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} angle={-35} textAnchor="end" interval={0} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#94a3b8' }}
                formatter={(v: number) => [`${v}%`, 'Средний балл']}
              />
              <Bar dataKey="avg" name="Средний балл" fill="url(#barGrad)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </motion.div>
    </div>
  );
}
