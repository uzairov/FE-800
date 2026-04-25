'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

const COMPETENCY_PRESETS = [
  'Коммуникация', 'Командная работа', 'Лидерство', 'Стрессоустойчивость',
  'Аналитическое мышление', 'Ответственность', 'Инициативность', 'Самомотивация',
  'Клиентоориентированность', 'Управление временем',
];

interface TeamMember { id: string; name?: string; email: string; role: string }

export default function NewFeedback360Page() {
  const router = useRouter();
  const [name, setName]             = useState('');
  const [description, setDesc]      = useState('');
  const [competencies, setComps]    = useState<string[]>([]);
  const [customComp, setCustomComp] = useState('');
  const [participants, setParticipants] = useState<string[]>([]);
  const [evaluatorIds, setEvalIds]  = useState<string[]>([]);
  const [includePeer, setIncludePeer]       = useState(true);
  const [includeSelf, setIncludeSelf]       = useState(true);
  const [includeManager, setIncludeManager] = useState(true);
  const [isAnonymous, setIsAnonymous]       = useState(true);
  const [closedAt, setClosedAt]     = useState('');
  const [team, setTeam]             = useState<TeamMember[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState('');

  useEffect(() => {
    fetch('/api/team', { headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` } })
      .then((r) => r.json())
      .then((d) => { if (d.success) setTeam(d.data?.members ?? []); });
  }, []);

  function toggleComp(c: string) {
    setComps((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]);
  }

  function addCustomComp() {
    const v = customComp.trim();
    if (v && !competencies.includes(v)) { setComps((prev) => [...prev, v]); }
    setCustomComp('');
  }

  function toggleParticipant(id: string) {
    setParticipants((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  async function submit() {
    if (!name.trim()) return setError('Введите название оценки');
    if (competencies.length === 0) return setError('Выберите хотя бы одну компетенцию');
    if (participants.length === 0) return setError('Выберите хотя бы одного участника');
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/feedback360', {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization:  `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({
          name, description, competencies,
          participantIds: participants,
          evaluatorIds,
          includePeer, includeSelf, includeManager, isAnonymous,
          closedAt: closedAt || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) router.push('/dashboard/feedback360');
      else setError(data.error ?? 'Ошибка создания');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white p-6 sm:p-10 max-w-3xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Новая оценка 360°</h1>
          <p className="text-sm text-zinc-500 mt-1">Настройте параметры всесторонней оценки сотрудников</p>
        </div>

        <div className="space-y-6">
          {/* Basic info */}
          <Card title="Основное">
            <label className="block text-sm text-zinc-400 mb-1.5">Название *</label>
            <input
              value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Например: Q2 Team Review 2026"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500 transition-colors"
            />
            <label className="block text-sm text-zinc-400 mt-4 mb-1.5">Описание</label>
            <textarea
              value={description} onChange={(e) => setDesc(e.target.value)}
              rows={3} placeholder="Цель этой оценки..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500 transition-colors resize-none"
            />
            <label className="block text-sm text-zinc-400 mt-4 mb-1.5">Дата закрытия</label>
            <input
              type="date" value={closedAt} onChange={(e) => setClosedAt(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-colors"
            />
          </Card>

          {/* Competencies */}
          <Card title="Компетенции">
            <div className="flex flex-wrap gap-2 mb-4">
              {COMPETENCY_PRESETS.map((c) => (
                <button
                  key={c} onClick={() => toggleComp(c)}
                  className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                    competencies.includes(c)
                      ? 'bg-blue-600/30 border-blue-500/50 text-blue-300'
                      : 'bg-white/5 border-white/10 text-zinc-400 hover:border-white/20'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={customComp} onChange={(e) => setCustomComp(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addCustomComp()}
                placeholder="Своя компетенция..."
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500 transition-colors text-sm"
              />
              <button onClick={addCustomComp} className="bg-white/8 hover:bg-white/12 text-zinc-300 px-4 py-2 rounded-xl text-sm transition-colors">
                Добавить
              </button>
            </div>
            {competencies.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {competencies.map((c) => (
                  <span key={c} className="flex items-center gap-1.5 text-xs bg-blue-600/20 text-blue-300 border border-blue-500/30 px-2.5 py-1 rounded-full">
                    {c}
                    <button onClick={() => toggleComp(c)} className="text-blue-400 hover:text-red-400 transition-colors">×</button>
                  </span>
                ))}
              </div>
            )}
          </Card>

          {/* Participants */}
          <Card title="Участники (кого оценивают)">
            {team.length === 0 ? (
              <p className="text-zinc-500 text-sm">Нет сотрудников в команде</p>
            ) : (
              <div className="space-y-2">
                {team.map((m) => (
                  <label key={m.id} className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-white/5 transition-colors">
                    <input
                      type="checkbox" checked={participants.includes(m.id)} onChange={() => toggleParticipant(m.id)}
                      className="w-4 h-4 rounded border-zinc-600 accent-blue-500"
                    />
                    <div>
                      <p className="text-sm text-white font-medium">{m.name ?? m.email}</p>
                      <p className="text-xs text-zinc-500">{m.email} · {m.role}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </Card>

          {/* Options */}
          <Card title="Типы оценок">
            <div className="space-y-3">
              {[
                { key: 'peer',    label: 'Peer review', desc: 'Коллеги оценивают друг друга', val: includePeer,    set: setIncludePeer },
                { key: 'self',    label: 'Self review',    desc: 'Самооценка сотрудника',       val: includeSelf,    set: setIncludeSelf },
                { key: 'manager', label: 'Manager review', desc: 'Оценка от руководителя',     val: includeManager, set: setIncludeManager },
              ].map(({ key, label, desc, val, set }) => (
                <label key={key} className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-white/8 hover:border-white/16 transition-colors">
                  <input type="checkbox" checked={val} onChange={() => set(!val)} className="w-4 h-4 accent-blue-500" />
                  <div>
                    <p className="text-sm text-white font-medium">{label}</p>
                    <p className="text-xs text-zinc-500">{desc}</p>
                  </div>
                </label>
              ))}
              <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-white/8 hover:border-white/16 transition-colors">
                <input type="checkbox" checked={isAnonymous} onChange={() => setIsAnonymous(!isAnonymous)} className="w-4 h-4 accent-blue-500" />
                <div>
                  <p className="text-sm text-white font-medium">Анонимные оценки</p>
                  <p className="text-xs text-zinc-500">Оцениваемый не видит, кто его оценивал</p>
                </div>
              </label>
            </div>
          </Card>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-3">
            <button
              onClick={() => router.back()}
              className="px-6 py-3 rounded-xl border border-white/10 text-zinc-400 hover:text-white hover:border-white/20 transition-colors text-sm font-medium"
            >
              Отмена
            </button>
            <button
              onClick={submit} disabled={submitting}
              className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold py-3 rounded-xl transition-colors"
            >
              {submitting ? 'Создание...' : 'Создать оценку'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/8 p-6" style={{ background: 'rgba(255,255,255,0.02)' }}>
      <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">{title}</h3>
      {children}
    </div>
  );
}
