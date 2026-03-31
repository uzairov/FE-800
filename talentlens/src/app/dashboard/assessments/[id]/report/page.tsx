'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { apiFetch } from '@/lib/client-fetch';

// ── Types ─────────────────────────────────────────────────────────────────────

interface CompetencyResult {
  competency: string;
  score: number;
  level: 'high' | 'medium' | 'low';
  weight: number;
}

interface RiskFlag {
  id: string;
  level: 'INFO' | 'WARNING' | 'CRITICAL';
  type: string;
  descriptionRu: string;
  value: number | null;
}

interface ReportData {
  id: string;
  candidateName: string;
  position: { name: string; industry: string };
  testSession: {
    language: string;
    startedAt: string;
    finishedAt: string;
    tabSwitches: number;
  } | null;
  competencyResults: CompetencyResult[];
  riskFlags: RiskFlag[];
}

// ── Config ────────────────────────────────────────────────────────────────────

const COMPETENCY_LABEL: Record<string, string> = {
  sales_skills: 'Навыки продаж',
  stress_resistance: 'Стрессоустойч.',
  communication_flexibility: 'Гибкость общения',
  motivation: 'Мотивация',
  honesty: 'Честность',
  emotional_intelligence: 'Эмоц. интеллект',
  locus_of_control: 'Локус контроля',
  attention: 'Внимательность',
  leadership: 'Лидерство',
  systems_thinking: 'Системное мышл.',
};

const LEVEL_CONFIG = {
  high:   { label: 'Высокий',  bg: 'bg-green-50',  border: 'border-green-200',  text: 'text-green-700',  bar: 'bg-green-500'  },
  medium: { label: 'Средний',  bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', bar: 'bg-yellow-400' },
  low:    { label: 'Низкий',   bg: 'bg-red-50',    border: 'border-red-200',    text: 'text-red-700',    bar: 'bg-red-500'    },
};

const FLAG_CONFIG = {
  INFO:     { icon: 'ℹ', bg: 'bg-gray-50',   border: 'border-gray-200',   text: 'text-gray-700'   },
  WARNING:  { icon: '⚠', bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700' },
  CRITICAL: { icon: '✕', bg: 'bg-red-50',    border: 'border-red-200',    text: 'text-red-700'    },
};

const WEIGHT_LABEL: Record<number, string> = { 3: 'Обязательная', 2: 'Важная', 1: 'Дополнительная' };

// ── Component ─────────────────────────────────────────────────────────────────

export default function ReportPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch<ReportData>(`/api/assessments/${id}/report`)
      .then((res) => {
        if (res.success) setData(res.data);
        else setError(res.error);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-8 text-sm text-gray-400">Загрузка отчёта...</div>;
  if (error)   return <div className="p-8 text-sm text-red-500">{error}</div>;
  if (!data)   return null;

  // ── Radar data ──────────────────────────────────────────────────────────────
  const radarData = data.competencyResults.map((r) => ({
    subject: COMPETENCY_LABEL[r.competency] ?? r.competency,
    score: r.score,
    fullMark: 100,
  }));

  // ── Duration ────────────────────────────────────────────────────────────────
  let duration = '';
  if (data.testSession?.startedAt && data.testSession?.finishedAt) {
    const ms = new Date(data.testSession.finishedAt).getTime() -
               new Date(data.testSession.startedAt).getTime();
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    duration = `${mins}м ${secs}с`;
  }

  const criticalFlags = data.riskFlags.filter((f) => f.level === 'CRITICAL');

  return (
    <div className="p-8 max-w-4xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
        <Link href="/dashboard/assessments" className="hover:text-gray-600">Оценки</Link>
        <span>›</span>
        <Link href={`/dashboard/assessments/${id}`} className="hover:text-gray-600">
          {data.candidateName}
        </Link>
        <span>›</span>
        <span className="text-gray-700">Отчёт</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{data.candidateName}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {data.position.name} · {data.position.industry}
          </p>
        </div>
        <button
          onClick={() => window.print()}
          className="text-sm border border-gray-200 text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Печать / PDF
        </button>
      </div>

      {/* Critical risk banner */}
      {criticalFlags.length > 0 && (
        <div className="mb-6 rounded-xl bg-red-50 border border-red-200 px-5 py-4">
          <p className="font-semibold text-red-700 text-sm mb-1">
            ⚠ Критические флаги риска обнаружены
          </p>
          <p className="text-red-600 text-xs">
            Результаты могут быть ненадёжными. Рекомендуется дополнительное собеседование.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Radar chart (§REP-01) */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Профиль компетенций</h2>
          {radarData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-sm text-gray-400">
              Нет данных
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={radarData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis
                  dataKey="subject"
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 100]}
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  tickCount={4}
                />
                <Radar
                  name="Балл"
                  dataKey="score"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
                <Tooltip
                  formatter={(v: number) => [`${v}%`, 'Балл']}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
              </RadarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Session summary */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Сводка</h2>
            <dl className="space-y-2 text-sm">
              {[
                ['Дата прохождения', data.testSession?.finishedAt
                  ? new Date(data.testSession.finishedAt).toLocaleDateString('ru-RU')
                  : '—'],
                ['Время прохождения', duration || '—'],
                ['Язык интерфейса', { ru: 'Русский', uz: "O'zbek", en: 'English' }[data.testSession?.language ?? ''] ?? '—'],
                ['Компетенций оценено', data.competencyResults.length],
                ['Флагов риска', data.riskFlags.length],
              ].map(([label, value]) => (
                <div key={String(label)} className="flex justify-between">
                  <dt className="text-gray-500">{label}</dt>
                  <dd className="font-medium text-gray-900">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Risk flags (§REP-04) */}
          {data.riskFlags.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Флаги риска</h2>
              <div className="space-y-2">
                {data.riskFlags.map((f) => {
                  const fc = FLAG_CONFIG[f.level];
                  return (
                    <div
                      key={f.id}
                      className={`flex items-start gap-2 rounded-lg border px-3 py-2.5 ${fc.bg} ${fc.border}`}
                    >
                      <span className={`text-base leading-none mt-0.5 ${fc.text}`}>{fc.icon}</span>
                      <p className={`text-xs leading-relaxed ${fc.text}`}>{f.descriptionRu}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Competency cards (§REP-02, REP-03) */}
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Детали по компетенциям</h2>
      {data.competencyResults.length === 0 ? (
        <p className="text-sm text-gray-400">Нет данных о компетенциях.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {data.competencyResults.map((r) => {
            const cfg = LEVEL_CONFIG[r.level];
            return (
              <div
                key={r.competency}
                className={`rounded-xl border p-4 ${cfg.bg} ${cfg.border}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-semibold text-sm text-gray-900">
                      {COMPETENCY_LABEL[r.competency] ?? r.competency}
                    </p>
                    <p className="text-xs text-gray-500">{WEIGHT_LABEL[r.weight]}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-xl font-bold ${cfg.text}`}>{r.score}%</p>
                    <p className={`text-xs font-medium ${cfg.text}`}>{cfg.label}</p>
                  </div>
                </div>
                {/* Score bar */}
                <div className="h-1.5 bg-white/70 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${cfg.bar}`}
                    style={{ width: `${r.score}%` }}
                  />
                </div>
                {/* Interpretation (§REP-02) */}
                <p className="text-xs text-gray-600 mt-2 leading-relaxed">
                  {r.level === 'high'
                    ? 'Кандидат показывает уверенное владение данной компетенцией.'
                    : r.level === 'medium'
                    ? 'Компетенция развита, но требует внимания и уточнения на собеседовании.'
                    : 'Зона риска. Рекомендуется дополнительная проверка на собеседовании.'}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
