'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts';

interface ParticipantRow {
  user: { id: string; name?: string; email: string };
  peerRatingsReceived: number;
  managerRatingReceived: boolean;
  selfRatingSubmitted: boolean;
  peerAverageScores?: Record<string, number>;
  selfScores?: Record<string, number>;
  gapAnalysis?: Record<string, number>;
}

interface ReportData {
  feedback360: { id: string; name: string; status: string; competencies?: string[] };
  participants: ParticipantRow[];
}

function ScoreCell({ val }: { val?: number }) {
  if (val === undefined || val === null) return <span className="text-zinc-600">—</span>;
  const color = val >= 4 ? 'text-emerald-400' : val >= 3 ? 'text-amber-400' : 'text-red-400';
  return <span className={`font-semibold ${color}`}>{val.toFixed(1)}</span>;
}

function GapBadge({ val }: { val?: number }) {
  if (val === undefined || val === null) return <span className="text-zinc-600">—</span>;
  const abs = Math.abs(val);
  if (abs < 0.5) return <span className="text-zinc-400">≈ 0</span>;
  if (val > 0) return <span className="text-amber-400">↑ +{val.toFixed(1)}</span>;
  return <span className="text-blue-400">↓ {val.toFixed(1)}</span>;
}

export default function Feedback360ReportPage() {
  const params = useParams<{ id: string }>();
  const [data, setData]       = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/feedback360/${params.id}/report`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
    })
      .then((r) => r.json())
      .then((d) => { if (d.success) setData(d.data); })
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!data) return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center text-zinc-400">
      Отчёт не найден
    </div>
  );

  const comps = data.feedback360.competencies ?? [];

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white p-6 sm:p-10">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Link href="/dashboard/feedback360" className="text-zinc-500 hover:text-white transition-colors text-sm">← Назад</Link>
          <span className="text-zinc-700">/</span>
          <h1 className="text-xl font-bold">{data.feedback360.name}</h1>
          <span className={`text-xs px-2.5 py-1 rounded-full ${
            data.feedback360.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-700 text-zinc-400'
          }`}>{data.feedback360.status}</span>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Участников',    val: data.participants.length },
            { label: 'Получили оценки', val: data.participants.filter((p) => p.peerRatingsReceived > 0).length },
            { label: 'Самооценок',    val: data.participants.filter((p) => p.selfRatingSubmitted).length },
            { label: 'Оценок от менеджера', val: data.participants.filter((p) => p.managerRatingReceived).length },
          ].map(({ label, val }) => (
            <div key={label} className="rounded-2xl border border-white/8 p-5" style={{ background: 'rgba(255,255,255,0.02)' }}>
              <p className="text-2xl font-bold text-white">{val}</p>
              <p className="text-xs text-zinc-500 mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Participants table */}
        {data.participants.length === 0 ? (
          <div className="text-center py-16 text-zinc-500">Нет данных по участникам</div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-white/8">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/8">
                  <th className="text-left text-zinc-500 font-medium px-5 py-3.5">Сотрудник</th>
                  <th className="text-left text-zinc-500 font-medium px-5 py-3.5">Оценок (peers)</th>
                  {comps.slice(0, 4).map((c) => (
                    <th key={c} className="text-left text-zinc-500 font-medium px-5 py-3.5 hidden lg:table-cell">{c}</th>
                  ))}
                  <th className="text-left text-zinc-500 font-medium px-5 py-3.5">Разрыв</th>
                  <th className="text-left text-zinc-500 font-medium px-5 py-3.5">Отчёт</th>
                </tr>
              </thead>
              <tbody>
                {data.participants.map((p, i) => {
                  const avgGap = p.gapAnalysis
                    ? Object.values(p.gapAnalysis).reduce((s, v) => s + Math.abs(v), 0) / Object.values(p.gapAnalysis).length
                    : undefined;
                  return (
                    <motion.tr
                      key={p.user.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="border-b border-white/5 hover:bg-white/3 transition-colors"
                    >
                      <td className="px-5 py-4">
                        <p className="font-medium text-white">{p.user.name ?? p.user.email}</p>
                        <p className="text-xs text-zinc-500">{p.user.email}</p>
                      </td>
                      <td className="px-5 py-4 text-zinc-300">{p.peerRatingsReceived}</td>
                      {comps.slice(0, 4).map((c) => (
                        <td key={c} className="px-5 py-4 hidden lg:table-cell">
                          <ScoreCell val={p.peerAverageScores?.[c]} />
                        </td>
                      ))}
                      <td className="px-5 py-4">
                        <GapBadge val={avgGap} />
                      </td>
                      <td className="px-5 py-4">
                        <Link
                          href={`/dashboard/feedback360/${params.id}/report/${p.user.id}`}
                          className="text-xs bg-white/8 hover:bg-white/12 text-zinc-300 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          Открыть →
                        </Link>
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
