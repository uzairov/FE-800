'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
  ResponsiveContainer, Tooltip, Legend,
} from 'recharts';

interface CompRow {
  name: string;
  peerAvg: number | null;
  managerScore: number | null;
  selfScore: number | null;
  gap: number | null;
  interpretation: string | null;
}

interface ReportData {
  employee: { id: string; name?: string; email: string; role: string };
  feedback360: { id: string; name: string; status: string };
  competencies: CompRow[];
  topStrengths: string[];
  areasForDevelopment: string[];
  meta: { peerRatingsReceived: number; managerRatingReceived: boolean; selfRatingSubmitted: boolean };
}

export default function IndividualReport() {
  const params = useParams<{ id: string; userId: string }>();
  const [data, setData]       = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/feedback360/${params.id}/report/${params.userId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
    })
      .then((r) => r.json())
      .then((d) => { if (d.success) setData(d.data); })
      .finally(() => setLoading(false));
  }, [params.id, params.userId]);

  if (loading) return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!data) return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center text-zinc-400">Отчёт не найден</div>
  );

  const radarData = data.competencies.map((c) => ({
    subject:  c.name,
    Peer:     c.peerAvg    ?? 0,
    Self:     c.selfScore  ?? 0,
    Manager:  c.managerScore ?? 0,
  }));

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white p-6 sm:p-10">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-8 text-sm">
          <Link href="/dashboard/feedback360" className="text-zinc-500 hover:text-white">360° Оценки</Link>
          <span className="text-zinc-700">/</span>
          <Link href={`/dashboard/feedback360/${params.id}/report`} className="text-zinc-500 hover:text-white">{data.feedback360.name}</Link>
          <span className="text-zinc-700">/</span>
          <span className="text-zinc-300">{data.employee.name ?? data.employee.email}</span>
        </div>

        {/* Employee card */}
        <div className="rounded-2xl border border-white/8 p-6 mb-6 flex items-center gap-5" style={{ background: 'rgba(255,255,255,0.02)' }}>
          <div className="w-14 h-14 rounded-full bg-blue-600/30 flex items-center justify-center text-2xl font-bold text-blue-300">
            {(data.employee.name ?? data.employee.email)[0].toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold">{data.employee.name ?? data.employee.email}</h1>
            <p className="text-zinc-500 text-sm">{data.employee.email} · {data.employee.role}</p>
          </div>
          <div className="ml-auto flex gap-4 text-center">
            {[
              { label: 'Peer оценок', val: data.meta.peerRatingsReceived },
              { label: 'Менеджер',   val: data.meta.managerRatingReceived ? '✓' : '—' },
              { label: 'Самооценка', val: data.meta.selfRatingSubmitted   ? '✓' : '—' },
            ].map(({ label, val }) => (
              <div key={label}>
                <p className="text-lg font-bold text-white">{val}</p>
                <p className="text-xs text-zinc-500">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Radar */}
        {radarData.some((d) => d.Peer > 0 || d.Self > 0 || d.Manager > 0) && (
          <div className="rounded-2xl border border-white/8 p-6 mb-6" style={{ background: 'rgba(255,255,255,0.02)' }}>
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">Профиль компетенций</h2>
            <ResponsiveContainer width="100%" height={320}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="rgba(255,255,255,0.08)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                <Radar name="Peers"    dataKey="Peer"    stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} />
                <Radar name="Self"     dataKey="Self"    stroke="#a855f7" fill="#a855f7" fillOpacity={0.10} strokeDasharray="4 2" />
                <Radar name="Manager" dataKey="Manager" stroke="#10b981" fill="#10b981" fillOpacity={0.10} strokeDasharray="4 2" />
                <Tooltip contentStyle={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }} />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Competency breakdown table */}
        <div className="rounded-2xl border border-white/8 mb-6 overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)' }}>
          <div className="px-6 py-4 border-b border-white/8">
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Разбивка по компетенциям</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/8">
                  {['Компетенция', 'Peers (ср)', 'Менеджер', 'Самооценка', 'Разрыв', 'Интерпретация'].map((h) => (
                    <th key={h} className="text-left text-zinc-500 font-medium px-5 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.competencies.map((c, i) => (
                  <motion.tr
                    key={c.name}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="border-b border-white/5 hover:bg-white/3 transition-colors"
                  >
                    <td className="px-5 py-3.5 font-medium text-white">{c.name}</td>
                    <td className="px-5 py-3.5">{c.peerAvg    !== null ? <Score val={c.peerAvg}    /> : <span className="text-zinc-600">—</span>}</td>
                    <td className="px-5 py-3.5">{c.managerScore !== null ? <Score val={c.managerScore} /> : <span className="text-zinc-600">—</span>}</td>
                    <td className="px-5 py-3.5">{c.selfScore   !== null ? <Score val={c.selfScore}   /> : <span className="text-zinc-600">—</span>}</td>
                    <td className="px-5 py-3.5">
                      {c.gap !== null ? (
                        <span className={`font-medium ${Math.abs(c.gap) < 0.5 ? 'text-zinc-400' : c.gap > 0 ? 'text-amber-400' : 'text-blue-400'}`}>
                          {c.gap > 0 ? `+${c.gap.toFixed(1)}` : c.gap.toFixed(1)}
                        </span>
                      ) : <span className="text-zinc-600">—</span>}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-zinc-400 max-w-[200px]">{c.interpretation ?? '—'}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Strengths & Development */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-emerald-500/20 p-5" style={{ background: 'rgba(16,185,129,0.05)' }}>
            <h3 className="text-sm font-semibold text-emerald-400 mb-3">🏆 Сильные стороны</h3>
            {data.topStrengths.length > 0
              ? data.topStrengths.map((s) => (
                  <div key={s} className="flex items-center gap-2 py-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span className="text-sm text-white">{s}</span>
                  </div>
                ))
              : <p className="text-sm text-zinc-500">Недостаточно данных</p>
            }
          </div>
          <div className="rounded-2xl border border-amber-500/20 p-5" style={{ background: 'rgba(245,158,11,0.05)' }}>
            <h3 className="text-sm font-semibold text-amber-400 mb-3">📈 Зоны развития</h3>
            {data.areasForDevelopment.length > 0
              ? data.areasForDevelopment.map((s) => (
                  <div key={s} className="flex items-center gap-2 py-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    <span className="text-sm text-white">{s}</span>
                  </div>
                ))
              : <p className="text-sm text-zinc-500">Недостаточно данных</p>
            }
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function Score({ val }: { val: number }) {
  const color = val >= 4 ? 'text-emerald-400' : val >= 3 ? 'text-amber-400' : 'text-red-400';
  const bars  = Math.round(val);
  return (
    <div className="flex items-center gap-2">
      <span className={`font-semibold ${color}`}>{val.toFixed(1)}</span>
      <div className="flex gap-0.5">
        {[1,2,3,4,5].map((b) => (
          <div key={b} className={`w-2 h-2 rounded-sm ${b <= bars ? (val >= 4 ? 'bg-emerald-400' : val >= 3 ? 'bg-amber-400' : 'bg-red-400') : 'bg-zinc-700'}`} />
        ))}
      </div>
    </div>
  );
}
