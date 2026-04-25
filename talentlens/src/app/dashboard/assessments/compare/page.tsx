'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';

interface Assessment {
  id: string;
  candidateName: string;
  status: string;
  createdAt: string;
  position?: { name: string };
  competencyResults?: Array<{ competency: string; score: number; level: string; weight: number }>;
  riskFlags?: Array<{ level: string; type: string; descriptionRu: string }>;
}

const LEVEL_COLOR: Record<string, string> = {
  high:   'text-emerald-400',
  medium: 'text-amber-400',
  low:    'text-red-400',
};

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-12 h-12">
        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
          <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
          <circle
            cx="18" cy="18" r="15" fill="none"
            stroke={color} strokeWidth="3" strokeLinecap="round"
            strokeDasharray={`${(score / 100) * 94} 94`}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">{score}</span>
      </div>
    </div>
  );
}

export default function ComparePage() {
  const [allAssessments, setAll]   = useState<Assessment[]>([]);
  const [selected, setSelected]    = useState<string[]>([]);
  const [details, setDetails]      = useState<Assessment[]>([]);
  const [loading, setLoading]      = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    fetch('/api/assessments?status=COMPLETED&limit=100', {
      headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
    })
      .then((r) => r.json())
      .then((d) => { if (d.success) setAll(d.data.assessments ?? []); })
      .finally(() => setLoading(false));
  }, []);

  async function loadDetails(ids: string[]) {
    setLoadingDetails(true);
    const results = await Promise.all(
      ids.map((id) =>
        fetch(`/api/assessments/${id}/report`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
        })
          .then((r) => r.json())
          .then((d) => (d.success ? d.data : null))
          .catch(() => null),
      ),
    );
    setDetails(results.filter(Boolean));
    setLoadingDetails(false);
  }

  function toggle(id: string) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) return prev; // max 3
      return [...prev, id];
    });
  }

  function compare() { loadDetails(selected); }

  // Collect all unique competencies across selected candidates
  const allComps = Array.from(
    new Set(details.flatMap((d) => (d.competencyResults ?? []).map((c) => c.competency))),
  );

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white p-6 sm:p-10">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Link href="/dashboard/assessments" className="text-zinc-500 hover:text-white text-sm">← Назад</Link>
          <span className="text-zinc-700">/</span>
          <h1 className="text-xl font-bold">Сравнение кандидатов</h1>
        </div>

        <div className="grid lg:grid-cols-[320px_1fr] gap-6">
          {/* Selector */}
          <div>
            <p className="text-sm text-zinc-500 mb-3">Выберите 2–3 кандидата (только завершённые)</p>
            {loading ? (
              <div className="py-8 flex justify-center">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {allAssessments.map((a) => {
                  const isSelected = selected.includes(a.id);
                  const disabled   = !isSelected && selected.length >= 3;
                  return (
                    <button
                      key={a.id}
                      disabled={disabled}
                      onClick={() => toggle(a.id)}
                      className={`w-full text-left p-3.5 rounded-xl border transition-colors ${
                        isSelected
                          ? 'border-blue-500/50 bg-blue-600/15'
                          : disabled
                            ? 'border-white/5 bg-white/2 opacity-40 cursor-not-allowed'
                            : 'border-white/8 bg-white/2 hover:border-white/16'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm text-white">{a.candidateName}</p>
                        {isSelected && <span className="text-blue-400 text-xs">✓</span>}
                      </div>
                      <p className="text-xs text-zinc-500 mt-0.5">{a.position?.name ?? '—'}</p>
                    </button>
                  );
                })}
              </div>
            )}
            <button
              onClick={compare}
              disabled={selected.length < 2 || loadingDetails}
              className="mt-4 w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
            >
              {loadingDetails ? 'Загрузка...' : 'Сравнить'}
            </button>
          </div>

          {/* Comparison table */}
          <div>
            {details.length === 0 ? (
              <div className="rounded-2xl border border-white/8 p-12 text-center text-zinc-500" style={{ background: 'rgba(255,255,255,0.02)' }}>
                Выберите кандидатов и нажмите «Сравнить»
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-white/8">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/8">
                      <th className="text-left text-zinc-500 font-medium px-5 py-3.5 w-36">Компетенция</th>
                      {details.map((d) => (
                        <th key={d.id} className="text-center px-5 py-3.5">
                          <p className="font-semibold text-white">{d.candidateName}</p>
                          <p className="text-xs text-zinc-500 font-normal mt-0.5">{d.position?.name ?? ''}</p>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {/* Overall row */}
                    <tr className="border-b border-white/8 bg-white/2">
                      <td className="px-5 py-3.5 text-zinc-400 font-medium">Общий балл</td>
                      {details.map((d) => {
                        const results = d.competencyResults ?? [];
                        const weighted = results.reduce((s, r) => s + r.score * r.weight, 0);
                        const wSum     = results.reduce((s, r) => s + r.weight, 0);
                        const avg      = wSum > 0 ? Math.round(weighted / wSum) : 0;
                        return (
                          <td key={d.id} className="px-5 py-3.5 text-center">
                            <ScoreBadge score={avg} />
                          </td>
                        );
                      })}
                    </tr>

                    {/* Per-competency rows */}
                    {allComps.map((comp) => (
                      <tr key={comp} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                        <td className="px-5 py-3 text-zinc-300">{comp}</td>
                        {details.map((d) => {
                          const r = (d.competencyResults ?? []).find((c) => c.competency === comp);
                          if (!r) return <td key={d.id} className="px-5 py-3 text-center text-zinc-600">—</td>;
                          const bg = r.score >= 75
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : r.score >= 50
                              ? 'bg-amber-500/15 text-amber-400'
                              : 'bg-red-500/15 text-red-400';
                          return (
                            <td key={d.id} className="px-5 py-3 text-center">
                              <span className={`text-sm font-semibold px-2.5 py-1 rounded-lg ${bg}`}>{r.score}%</span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}

                    {/* Risk flags row */}
                    <tr className="border-b border-white/5">
                      <td className="px-5 py-3.5 text-zinc-400 font-medium">Red flags</td>
                      {details.map((d) => {
                        const flags = d.riskFlags ?? [];
                        const critical = flags.filter((f) => f.level === 'CRITICAL').length;
                        const warning  = flags.filter((f) => f.level === 'WARNING').length;
                        return (
                          <td key={d.id} className="px-5 py-3.5 text-center">
                            <div className="flex justify-center gap-2">
                              {critical > 0 && <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">{critical} крит.</span>}
                              {warning  > 0 && <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">{warning} warn</span>}
                              {flags.length === 0 && <span className="text-zinc-500 text-xs">Нет</span>}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
