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
import { COMPETENCY_LABELS as COMPETENCY_LABEL } from '@/lib/competencies';

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

interface QuestionBreakdownItem {
  idx:         number;
  questionId:  string;
  blockType:   string;
  text:        string;
  selectedIdx: number;
  optionText:  string;
  earned:      number;
  maxPossible: number;
}

interface CompetencyBreakdown {
  competency: string;
  weight:     number;
  sum:        number;
  max:        number;
  score:      number;
  questions:  QuestionBreakdownItem[];
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
  breakdown?: Record<string, CompetencyBreakdown>;
}

// ── Config ────────────────────────────────────────────────────────────────────

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

  // ── Derive all competencies from breakdown (includes unscored ones) ─────────
  function scoreToLevel(s: number): 'high' | 'medium' | 'low' {
    return s >= 75 ? 'high' : s >= 50 ? 'medium' : 'low';
  }

  const allCompetencies = Object.values(data.breakdown ?? {})
    .sort((a, b) => b.weight - a.weight)
    .map((b) => ({
      competency: b.competency,
      score:      b.score,
      weight:     b.weight,
      level:      scoreToLevel(b.score),
      hasData:    b.max > 0,
    }));

  // ── Radar data ──────────────────────────────────────────────────────────────
  const realRadar = allCompetencies.map((r) => ({
    subject:  COMPETENCY_LABEL[r.competency] ?? r.competency,
    score:    r.score,
    weight:   r.weight,
    hasData:  r.hasData,
    fullMark: 100,
  }));
  const PLACEHOLDER_AXES = ['—', ' —', '  —'];
  const placeholderCount = Math.max(0, 3 - realRadar.length);
  const radarData = [
    ...realRadar,
    ...Array.from({ length: placeholderCount }, (_, i) => ({
      subject: PLACEHOLDER_AXES[i] ?? '—',
      score:   0,
      weight:  0,
      hasData: false,
      fullMark: 100,
    })),
  ];

  // Map: label → weight, for color-coding the angle-axis ticks
  const labelMeta = new Map<string, { weight: number; score: number; hasData: boolean }>();
  radarData.forEach((d) => labelMeta.set(d.subject, { weight: d.weight, score: d.score, hasData: d.hasData }));

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
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h2 className="text-sm font-semibold text-white/80">Профиль компетенций</h2>
            <div className="flex items-center gap-3 text-[10px]" style={{ color: '#94a3b8' }}>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ background: '#f87171' }} />
                Обязат.
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ background: '#fbbf24' }} />
                Важная
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ background: '#94a3b8' }} />
                Допол.
              </span>
            </div>
          </div>
          {radarData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-sm text-white/30">
              Нет данных
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={520} minHeight={520}>
              <RadarChart data={radarData} margin={{ top: 36, right: 70, bottom: 36, left: 70 }} outerRadius="78%">
                <defs>
                  <radialGradient id="radarGradient" cx="50%" cy="50%" r="50%">
                    <stop offset="0%"   stopColor="#8B5CF6" stopOpacity={0.55} />
                    <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.20} />
                  </radialGradient>
                </defs>
                <PolarGrid stroke="rgba(148,163,184,0.18)" strokeDasharray="2 4" />
                <PolarAngleAxis
                  dataKey="subject"
                  tick={(props) => <RadarAxisTick {...props} meta={labelMeta} />}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 100]}
                  tickCount={5}
                  tick={{ fontSize: 9, fill: '#475569' }}
                  stroke="rgba(148,163,184,0.15)"
                  axisLine={false}
                />
                <Radar
                  name="Балл"
                  dataKey="score"
                  stroke="#8B5CF6"
                  fill="url(#radarGradient)"
                  fillOpacity={1}
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#8B5CF6', stroke: '#fff', strokeWidth: 1 }}
                  activeDot={{ r: 5, fill: '#a78bfa', stroke: '#fff', strokeWidth: 2 }}
                  isAnimationActive
                  animationDuration={800}
                />
                <Tooltip
                  formatter={(v: number) => [`${v}%`, 'Балл']}
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 12,
                    background: '#141830',
                    border: '1px solid rgba(139,92,246,0.30)',
                    color: '#fff',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                  }}
                  labelStyle={{ color: '#a78bfa', fontWeight: 600 }}
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
                ['Компетенций оценено', `${allCompetencies.filter((c) => c.hasData).length} / ${allCompetencies.length}`],
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

      {/* Competency cards (§REP-02, REP-03) — all position competencies */}
      <h2 className="text-lg font-semibold text-white mb-4">Детали по компетенциям</h2>
      {allCompetencies.length === 0 ? (
        <p className="text-sm text-white/30">Нет данных о компетенциях.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {allCompetencies.map((r) => {
            const cfg = r.hasData ? LEVEL_CONFIG[r.level] : LEVEL_CONFIG.low;
            return (
              <div
                key={r.competency}
                className="rounded-2xl p-4"
                style={{
                  background: r.hasData ? cfg.bg : 'rgba(255,255,255,0.03)',
                  border:     `1px solid ${r.hasData ? cfg.border : 'rgba(255,255,255,0.08)'}`,
                  opacity:    r.hasData ? 1 : 0.65,
                }}
              >
                <div className="flex items-center justify-between mb-2 gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm text-white truncate">
                      {COMPETENCY_LABEL[r.competency] ?? r.competency}
                    </p>
                    <p className="text-xs" style={{ color: '#94a3b8' }}>{WEIGHT_LABEL[r.weight]}</p>
                  </div>
                  <div className="text-right shrink-0">
                    {r.hasData ? (
                      <>
                        <p className="text-xl font-bold" style={{ color: cfg.text }}>{r.score}%</p>
                        <p className="text-xs font-medium" style={{ color: cfg.text }}>{cfg.label}</p>
                      </>
                    ) : (
                      <p className="text-xs" style={{ color: 'rgba(255,255,255,0.30)' }}>не оценена</p>
                    )}
                  </div>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${r.score}%`, background: r.hasData ? cfg.bar : 'transparent' }}
                  />
                </div>
                <p className="text-xs mt-2 leading-relaxed" style={{ color: '#94a3b8' }}>
                  {!r.hasData
                    ? 'Вопросов по данной компетенции в тесте не было.'
                    : r.level === 'high'
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

      {/* ── How was the result calculated (§REP-CALC) ───────────────────── */}
      {data.breakdown && Object.keys(data.breakdown).length > 0 && (
        <CalculationBreakdown breakdown={data.breakdown} competencies={data.competencyResults} />
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

// ─────────────────────────────────────────────────────────────────────────────
// Radar axis tick — wraps long Russian labels onto 2 lines + colors by weight
// ─────────────────────────────────────────────────────────────────────────────

interface RadarAxisTickProps {
  x?: number;
  y?: number;
  cx?: number;
  cy?: number;
  payload?: { value: string };
  meta: Map<string, { weight: number; score: number; hasData: boolean }>;
}

function RadarAxisTick({ x = 0, y = 0, cx = 0, cy = 0, payload, meta }: RadarAxisTickProps) {
  const label = payload?.value ?? '';
  const info  = meta.get(label);
  const weight  = info?.weight  ?? 0;
  const hasData = info?.hasData ?? false;

  // Color by competency weight
  const color =
    !hasData      ? '#475569' :
    weight === 3  ? '#fca5a5' :
    weight === 2  ? '#fcd34d' :
                    '#cbd5e1';
  const fontWeight = weight === 3 ? 600 : weight === 2 ? 500 : 400;

  // Wrap label to ≤2 lines, ~14 chars per line
  const MAX_LINE = 14;
  const words = label.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const candidate = cur ? `${cur} ${w}` : w;
    if (candidate.length <= MAX_LINE || !cur) {
      cur = candidate;
    } else {
      lines.push(cur);
      cur = w;
    }
    if (lines.length === 1 && cur.length > MAX_LINE) {
      // Truncate second line if too long
      lines.push(cur.slice(0, MAX_LINE - 1) + '…');
      cur = '';
      break;
    }
  }
  if (cur) lines.push(cur);
  const truncated = lines.slice(0, 2);

  // Anchor based on horizontal position relative to chart center
  const dx = x - cx;
  const anchor: 'start' | 'middle' | 'end' =
    Math.abs(dx) < 8 ? 'middle' : dx > 0 ? 'start' : 'end';

  // Push label slightly outward
  const ox = dx === 0 ? 0 : (dx / Math.abs(dx)) * 4;
  const dyTop = truncated.length === 2 ? -6 : 4;

  return (
    <text
      x={x + ox}
      y={y}
      textAnchor={anchor}
      fontSize={10.5}
      fontWeight={fontWeight}
      fill={color}
    >
      {truncated.map((line, i) => (
        <tspan key={i} x={x + ox} dy={i === 0 ? dyTop : 12}>
          {line}
        </tspan>
      ))}
    </text>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Calculation breakdown — collapsed by default, opens per competency.
// Shows: formula, per-question scores, total, and a horizontal score bar with
// the five level zones (Низкий/Средний/Хороший/Высокий/Отличный).
// ─────────────────────────────────────────────────────────────────────────────

const ZONE_BANDS: Array<{ label: string; from: number; to: number; color: string }> = [
  { label: 'Низкий',   from: 0,  to: 25,  color: '#ef4444' },
  { label: 'Средний',  from: 25, to: 50,  color: '#f59e0b' },
  { label: 'Хороший',  from: 50, to: 75,  color: '#fbbf24' },
  { label: 'Высокий',  from: 75, to: 90,  color: '#34d399' },
  { label: 'Отличный', from: 90, to: 100, color: '#10b981' },
];

function levelFromScore(score: number): string {
  if (score >= 90) return 'ОТЛИЧНЫЙ';
  if (score >= 75) return 'ВЫСОКИЙ';
  if (score >= 50) return 'ХОРОШИЙ';
  if (score >= 25) return 'СРЕДНИЙ';
  return 'НИЗКИЙ';
}

function ScoreBar({ score }: { score: number }) {
  return (
    <div className="my-3">
      <div className="relative h-7 rounded-lg overflow-hidden flex"
           style={{ border: '1px solid rgba(255,255,255,0.10)' }}>
        {ZONE_BANDS.map((b) => (
          <div
            key={b.label}
            className="flex-1 flex items-center justify-center"
            style={{ background: `${b.color}1A`, borderRight: '1px solid rgba(255,255,255,0.10)' }}
          >
            <span className="text-[9px] font-medium uppercase tracking-wider" style={{ color: b.color, opacity: 0.85 }}>
              {b.label}
            </span>
          </div>
        ))}
        {/* Marker */}
        <div
          className="absolute top-0 bottom-0 flex items-center"
          style={{ left: `${Math.min(100, Math.max(0, score))}%`, transform: 'translateX(-50%)' }}
        >
          <div
            className="w-1 h-full"
            style={{ background: '#fff', boxShadow: '0 0 8px rgba(255,255,255,0.6)' }}
          />
        </div>
      </div>
      <div className="flex justify-between mt-1 text-[10px] tabular-nums" style={{ color: '#64748b' }}>
        <span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span>
      </div>
    </div>
  );
}

function CalculationBreakdown({
  breakdown,
  competencies,
}: {
  breakdown:    Record<string, CompetencyBreakdown>;
  competencies: CompetencyResult[];
}) {
  const [open, setOpen] = useState(false);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  // Order: by stored competencyResults order (which is already sorted by weight)
  const ordered = competencies
    .map((c) => breakdown[c.competency])
    .filter(Boolean) as CompetencyBreakdown[];

  if (ordered.length === 0) return null;

  return (
    <div className="mt-8">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between rounded-2xl px-5 py-4 transition-colors"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border:     '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div className="flex items-center gap-3">
          <span className="text-lg">📊</span>
          <span className="font-semibold text-white text-sm sm:text-base">Как рассчитан результат</span>
        </div>
        <span
          className="text-xs transition-transform"
          style={{
            color:     '#94a3b8',
            transform: open ? 'rotate(180deg)' : 'none',
          }}
        >
          ▼
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div
              className="rounded-2xl mt-3 p-4 sm:p-5 space-y-4"
              style={{ background: '#141830', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              {/* Formula */}
              <div className="text-xs leading-relaxed p-3 rounded-xl" style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.18)', color: '#cbd5e1' }}>
                <div className="font-mono">
                  <span style={{ color: '#60a5fa' }}>Формула:</span>{' '}
                  (сумма баллов / максимум) × 100% — затем уровень определяется по шкале:
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-[10px]">
                  {ZONE_BANDS.map((b) => (
                    <span key={b.label} style={{ color: b.color }}>
                      {b.label} {b.from}-{b.to}%
                    </span>
                  ))}
                </div>
              </div>

              {/* Per-competency rows */}
              {ordered.map((b) => {
                const isOpen = expandedKey === b.competency;
                const label  = COMPETENCY_LABEL[b.competency] ?? b.competency;
                return (
                  <div
                    key={b.competency}
                    className="rounded-xl p-3 sm:p-4"
                    style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    <button
                      onClick={() => setExpandedKey(isOpen ? null : b.competency)}
                      className="w-full flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xs font-semibold text-white truncate">{label}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full shrink-0"
                              style={{ background: 'rgba(255,255,255,0.06)', color: '#94a3b8' }}>
                          вес ×{b.weight}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-mono tabular-nums text-xs" style={{ color: '#94a3b8' }}>
                          {b.sum} / {b.max}
                        </span>
                        <span className="font-bold text-base" style={{ color: b.score >= 75 ? '#34d399' : b.score >= 50 ? '#fbbf24' : '#f87171' }}>
                          {b.score}%
                        </span>
                        <span className="text-xs transition-transform" style={{ color: '#64748b', transform: isOpen ? 'rotate(180deg)' : 'none' }}>
                          ▼
                        </span>
                      </div>
                    </button>

                    {isOpen && (
                      <div className="mt-4">
                        <ScoreBar score={b.score} />

                        {/* Per-question table */}
                        {b.questions.length > 0 ? (
                          <div className="mt-3 space-y-1">
                            <div className="text-[10px] uppercase tracking-wider mb-2" style={{ color: '#64748b' }}>
                              Разбивка по вопросам ({b.questions.length})
                            </div>
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs min-w-[480px]">
                                <thead>
                                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                    <th className="text-left py-1.5 font-medium" style={{ color: '#64748b' }}>#</th>
                                    <th className="text-left py-1.5 font-medium" style={{ color: '#64748b' }}>Блок</th>
                                    <th className="text-left py-1.5 font-medium" style={{ color: '#64748b' }}>Вопрос</th>
                                    <th className="text-right py-1.5 font-medium" style={{ color: '#64748b' }}>Балл</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {b.questions.map((q) => (
                                    <tr key={`${q.questionId}-${q.idx}`} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                      <td className="py-1.5 tabular-nums" style={{ color: '#64748b' }}>{q.idx}</td>
                                      <td className="py-1.5 font-mono text-[10px]" style={{ color: '#94a3b8' }}>{q.blockType}</td>
                                      <td className="py-1.5 pr-3 truncate max-w-[280px]" style={{ color: '#cbd5e1' }}>
                                        {q.text}
                                      </td>
                                      <td className="py-1.5 text-right tabular-nums" style={{ color: '#fff' }}>
                                        <span style={{ color: q.earned >= q.maxPossible * 0.75 ? '#34d399' : q.earned >= q.maxPossible * 0.5 ? '#fbbf24' : '#f87171' }}>
                                          {q.earned}
                                        </span>
                                        <span style={{ color: '#64748b' }}> / {q.maxPossible}</span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            {/* Total */}
                            <div className="mt-3 pt-3 text-xs" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                              <div className="flex justify-between" style={{ color: '#94a3b8' }}>
                                <span>Сумма баллов:</span>
                                <span className="font-mono tabular-nums text-white">{b.sum}</span>
                              </div>
                              <div className="flex justify-between" style={{ color: '#94a3b8' }}>
                                <span>Максимум возможный:</span>
                                <span className="font-mono tabular-nums text-white">{b.max}</span>
                              </div>
                              <div className="flex justify-between mt-2 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                                <span className="font-medium text-white">Результат:</span>
                                <span className="font-mono tabular-nums font-bold" style={{ color: b.score >= 75 ? '#34d399' : b.score >= 50 ? '#fbbf24' : '#f87171' }}>
                                  ({b.sum} / {b.max}) × 100% = {b.score}%
                                </span>
                              </div>
                              <div className="flex justify-between mt-1">
                                <span className="font-medium text-white">Уровень ({b.score}%):</span>
                                <span className="font-bold" style={{ color: b.score >= 75 ? '#34d399' : b.score >= 50 ? '#fbbf24' : '#f87171' }}>
                                  {levelFromScore(b.score)} ✓
                                </span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs mt-2" style={{ color: '#64748b' }}>
                            Нет данных по вопросам для этой компетенции (возможно, открытые вопросы — оценка вручную HR).
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
