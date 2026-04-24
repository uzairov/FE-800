'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
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

interface Comment {
  id: string;
  text: string;
  competencyResultId: string | null;
  createdAt: string;
  author: { name: string | null; email: string };
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
  negotiation: 'Переговоры',
  result_orientation: 'Ориент. на результат',
  service_orientation: 'Клиентоориент.',
  monotolerance: 'Моноустойчивость',
  attention_to_detail: 'Внимат. к деталям',
  self_motivation: 'Самомотивация',
};

const LEVEL_CONFIG = {
  high:   { label: 'Высокий', bg: 'rgba(16,185,129,0.10)',  border: 'rgba(16,185,129,0.25)',  text: '#34d399', bar: '#10b981' },
  medium: { label: 'Средний', bg: 'rgba(245,158,11,0.10)',  border: 'rgba(245,158,11,0.25)',  text: '#fbbf24', bar: '#f59e0b' },
  low:    { label: 'Низкий',  bg: 'rgba(239,68,68,0.10)',   border: 'rgba(239,68,68,0.25)',   text: '#f87171', bar: '#ef4444' },
};

const FLAG_CONFIG = {
  INFO:     { icon: 'ℹ', bg: 'rgba(148,163,184,0.10)', border: 'rgba(148,163,184,0.25)', text: '#94a3b8' },
  WARNING:  { icon: '⚠', bg: 'rgba(245,158,11,0.10)',  border: 'rgba(245,158,11,0.25)',  text: '#fbbf24' },
  CRITICAL: { icon: '✕', bg: 'rgba(239,68,68,0.10)',   border: 'rgba(239,68,68,0.25)',   text: '#f87171' },
};

const WEIGHT_LABEL: Record<number, string> = { 3: 'Обязательная', 2: 'Важная', 1: 'Дополнительная' };

// ── Component ─────────────────────────────────────────────────────────────────

export default function ReportPage() {
  const { id } = useParams<{ id: string }>();
  const [data,     setData]     = useState<ReportData | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [commenting, setCommenting] = useState(false);
  const commentRef = useRef<HTMLTextAreaElement>(null);

  async function loadComments() {
    const res = await apiFetch<Comment[]>(`/api/assessments/${id}/comments`);
    if (res.success) setComments(res.data);
  }

  async function submitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!newComment.trim()) return;
    setCommenting(true);
    const res = await apiFetch(`/api/assessments/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify({ text: newComment.trim() }),
    });
    setCommenting(false);
    if (res.success) {
      setNewComment('');
      loadComments();
    }
  }

  useEffect(() => {
    apiFetch<ReportData>(`/api/assessments/${id}/report`)
      .then((res) => {
        if (res.success) setData(res.data);
        else setError(res.error);
      })
      .finally(() => setLoading(false));
    loadComments();
  }, [id]);

  if (loading) return <div className="p-8 text-sm" style={{ color: '#94a3b8' }}>Загрузка отчёта...</div>;
  if (error)   return <div className="p-8 text-sm" style={{ color: '#f87171' }}>{error}</div>;
  if (!data)   return null;

  // ── Radar data ──────────────────────────────────────────────────────────────
  // Если компетенций < 3 — добавляем placeholder-оси чтобы радар визуально был многоугольником
  const realRadar = data.competencyResults.map((r) => ({
    subject: COMPETENCY_LABEL[r.competency] ?? r.competency,
    score: r.score,
    fullMark: 100,
  }));
  const PLACEHOLDER_AXES = ['—', ' —', '  —'];
  const placeholderCount = Math.max(0, 3 - realRadar.length);
  const radarData = [
    ...realRadar,
    ...Array.from({ length: placeholderCount }, (_, i) => ({
      subject: PLACEHOLDER_AXES[i] ?? '—',
      score: 0,
      fullMark: 100,
    })),
  ];

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
    <div className="p-4 sm:p-8 max-w-4xl" id="report-content">
      {/* Print styles */}
      <style>{`
        @media print {
          /* Hide everything except the report */
          body > * { display: none !important; }
          #__next > * { display: none !important; }
          aside, nav, header, footer { display: none !important; }
          /* Show the report */
          #report-content,
          #report-content * { display: revert !important; }
          /* Reset layout for print */
          #report-content {
            padding: 0 !important;
            max-width: 100% !important;
          }
          .print\\:hidden { display: none !important; }
          /* Force white background for cards */
          .bg-white { background: white !important; }
          .bg-green-50  { background: #f0fdf4 !important; }
          .bg-yellow-50 { background: #fefce8 !important; }
          .bg-red-50    { background: #fef2f2 !important; }
          .bg-orange-50 { background: #fff7ed !important; }
          .bg-gray-50   { background: #f9fafb !important; }
          /* Avoid page breaks inside cards */
          .rounded-xl { break-inside: avoid; }
          /* Page setup */
          @page { margin: 1.5cm; size: A4; }
        }
      `}</style>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm mb-4 flex-wrap" style={{ color: '#64748b' }}>
        <Link href="/dashboard/assessments" className="hover:text-white/70 transition-colors">Оценки</Link>
        <span>›</span>
        <Link href={`/dashboard/assessments/${id}`} className="hover:text-white/70 transition-colors truncate max-w-[40%]">
          {data.candidateName}
        </Link>
        <span>›</span>
        <span className="text-white/80">Отчёт</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">{data.candidateName}</h1>
          <p className="text-sm mt-0.5" style={{ color: '#94a3b8' }}>
            {data.position.name} · {data.position.industry}
          </p>
        </div>
        <div className="flex gap-2 print:hidden shrink-0">
          <button
            onClick={() => window.print()}
            className="text-sm px-4 py-2 rounded-xl transition-colors flex items-center gap-1.5"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8' }}
          >
            <span>🖨</span> <span className="hidden sm:inline">Печать</span>
          </button>
          <button
            onClick={() => {
              const prev = document.title;
              document.title = `Aptio — ${data.candidateName} — Отчёт`;
              window.print();
              document.title = prev;
            }}
            className="text-sm text-white px-4 py-2 rounded-xl transition-all flex items-center gap-1.5"
            style={{ background: 'linear-gradient(135deg,#3B82F6,#8B5CF6)', boxShadow: '0 4px 16px rgba(59,130,246,0.3)' }}
          >
            <span>⬇</span> <span className="hidden sm:inline">PDF</span>
          </button>
        </div>
      </div>

      {/* Critical risk banner */}
      {criticalFlags.length > 0 && (
        <div className="mb-6 rounded-xl px-5 py-4" style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.30)' }}>
          <p className="font-semibold text-sm mb-1" style={{ color: '#f87171' }}>
            ⚠ Критические флаги риска обнаружены
          </p>
          <p className="text-xs" style={{ color: '#fca5a5' }}>
            Результаты могут быть ненадёжными. Рекомендуется дополнительное собеседование.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-8">
        {/* Radar chart (§REP-01) */}
        <div className="rounded-2xl p-4 sm:p-5" style={{ background: '#141830', border: '1px solid rgba(255,255,255,0.08)' }}>
          <h2 className="text-sm font-semibold text-white/80 mb-4">Профиль компетенций</h2>
          {radarData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-sm text-white/30">
              Нет данных
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={400} minHeight={400}>
              <RadarChart data={radarData} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
                <PolarGrid stroke="rgba(148,163,184,0.25)" />
                <PolarAngleAxis
                  dataKey="subject"
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 100]}
                  tickCount={5}
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  stroke="rgba(148,163,184,0.2)"
                />
                <Radar
                  name="Балл"
                  dataKey="score"
                  stroke="#3B82F6"
                  fill="#3B82F6"
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
                <Tooltip
                  formatter={(v: number) => [`${v}%`, 'Балл']}
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 12,
                    background: '#141830',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#fff',
                  }}
                  labelStyle={{ color: '#94a3b8' }}
                />
              </RadarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Session summary */}
        <div className="space-y-4">
          <div className="rounded-2xl p-4 sm:p-5" style={{ background: '#141830', border: '1px solid rgba(255,255,255,0.08)' }}>
            <h2 className="text-sm font-semibold text-white/80 mb-3">Сводка</h2>
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
                  <dt style={{ color: '#94a3b8' }}>{label}</dt>
                  <dd className="font-medium text-white">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Risk flags (§REP-04) */}
          {data.riskFlags.length > 0 && (
            <div className="rounded-2xl p-4 sm:p-5" style={{ background: '#141830', border: '1px solid rgba(255,255,255,0.08)' }}>
              <h2 className="text-sm font-semibold text-white/80 mb-3">Флаги риска</h2>
              <div className="space-y-2">
                {data.riskFlags.map((f) => {
                  const fc = FLAG_CONFIG[f.level];
                  return (
                    <div
                      key={f.id}
                      className="flex items-start gap-2 rounded-lg px-3 py-2.5"
                      style={{ background: fc.bg, border: `1px solid ${fc.border}` }}
                    >
                      <span className="text-base leading-none mt-0.5" style={{ color: fc.text }}>{fc.icon}</span>
                      <p className="text-xs leading-relaxed" style={{ color: fc.text }}>{f.descriptionRu}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Competency cards (§REP-02, REP-03) */}
      <h2 className="text-lg font-semibold text-white mb-4">Детали по компетенциям</h2>
      {data.competencyResults.length === 0 ? (
        <p className="text-sm text-white/30">Нет данных о компетенциях.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {data.competencyResults.map((r) => {
            const cfg = LEVEL_CONFIG[r.level];
            return (
              <div
                key={r.competency}
                className="rounded-2xl p-4"
                style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
              >
                <div className="flex items-center justify-between mb-2 gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm text-white truncate">
                      {COMPETENCY_LABEL[r.competency] ?? r.competency}
                    </p>
                    <p className="text-xs" style={{ color: '#94a3b8' }}>{WEIGHT_LABEL[r.weight]}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xl font-bold" style={{ color: cfg.text }}>{r.score}%</p>
                    <p className="text-xs font-medium" style={{ color: cfg.text }}>{cfg.label}</p>
                  </div>
                </div>
                {/* Score bar */}
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${r.score}%`, background: cfg.bar }}
                  />
                </div>
                {/* Interpretation (§REP-02) */}
                <p className="text-xs mt-2 leading-relaxed" style={{ color: '#94a3b8' }}>
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

      {/* ── HR Comments ─────────────────────────────────────────────────── */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-white mb-4">Заметки HR</h2>

        {/* Add comment form */}
        <form onSubmit={submitComment} className="mb-5">
          <textarea
            ref={commentRef}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Добавьте заметку по кандидату или результатам оценки..."
            rows={3}
            className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.10)',
              color: '#fff',
            }}
          />
          <div className="flex justify-end mt-2">
            <motion.button
              type="submit"
              disabled={!newComment.trim() || commenting}
              whileTap={{ scale: 0.97 }}
              className="disabled:opacity-40 text-white text-sm font-medium px-5 py-2 rounded-xl transition-colors"
              style={{ background: 'linear-gradient(135deg,#3B82F6,#6366F1)' }}
            >
              {commenting ? 'Сохранение...' : 'Добавить заметку'}
            </motion.button>
          </div>
        </form>

        {/* Comments list */}
        <AnimatePresence>
          {comments.length === 0 ? (
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.30)' }}>Заметок пока нет</p>
          ) : (
            <div className="space-y-3">
              {comments.map((c, i) => (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-xl p-4"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                      {(c.author.name ?? c.author.email).charAt(0).toUpperCase()}
                    </div>
                    <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.60)' }}>
                      {c.author.name ?? c.author.email}
                    </span>
                    <span className="text-xs ml-auto" style={{ color: 'rgba(255,255,255,0.30)' }}>
                      {new Date(c.createdAt).toLocaleString('ru-RU')}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'rgba(255,255,255,0.70)' }}>{c.text}</p>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
