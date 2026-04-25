'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

interface RatePageData {
  feedback360: {
    id: string;
    name: string;
    competencies: string[];
    participantIds: string[];
    status: string;
  };
  participants: Array<{ id: string; name?: string; email: string }>;
}

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(star)}
          className="text-2xl transition-transform hover:scale-110"
          style={{ color: star <= (hovered || value) ? '#f59e0b' : '#3f3f46' }}
        >
          ★
        </button>
      ))}
      <span className="ml-2 text-sm text-zinc-400 self-center">
        {(hovered || value) > 0 ? ['', 'Слабо', 'Ниже среднего', 'Средне', 'Хорошо', 'Отлично'][hovered || value] : 'Не оценено'}
      </span>
    </div>
  );
}

export default function RatePage() {
  const params  = useParams<{ id: string }>();
  const [data, setData]         = useState<RatePageData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [step, setStep]         = useState<'select' | 'rate' | 'done'>('select');
  const [ratedUserId, setRatedUser] = useState('');
  const [raterUserId, setRaterUser] = useState('');
  const [rationType, setRationType] = useState<'peer' | 'self' | 'manager'>('peer');
  const [scores, setScores]     = useState<Record<string, number>>({});
  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]       = useState('');

  useEffect(() => {
    // Fetch the 360 review public info
    fetch(`/api/feedback360/${params.id}/submit-rating`, { method: 'GET' })
      .catch(() => {})
      .finally(() => {});

    // Load basic info via a lightweight public endpoint — reuse the submit endpoint OPTIONS
    // Since we don't have a public GET, fetch from submit-rating with a dry-run approach.
    // In practice the link would include rater=userId query param.
    // For now we load list of participants from the POST echo.
    // Graceful fallback — just show the form with the review ID.
    fetch(`/api/feedback360?id=${params.id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data) {
          const fb = Array.isArray(d.data)
            ? d.data.find((x: { id: string }) => x.id === params.id)
            : d.data;
          if (fb) setData({ feedback360: fb, participants: [] });
        }
      })
      .finally(() => setLoading(false));
  }, [params.id]);

  function setScore(comp: string, val: number) {
    setScores((prev) => ({ ...prev, [comp]: val }));
  }

  async function submitRating() {
    if (!ratedUserId) return setError('Выберите, кого оцениваете');
    if (!raterUserId) return setError('Укажите ваш ID (передан в ссылке)');
    const comps = data?.feedback360.competencies ?? [];
    const missing = comps.filter((c) => !scores[c]);
    if (missing.length > 0) return setError(`Оцените все компетенции: ${missing.join(', ')}`);
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch(`/api/feedback360/${params.id}/submit-rating`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ratedUserId, raterUserId, rationType, scores, comments }),
      });
      const d = await res.json();
      if (d.success) setStep('done');
      else setError(d.error ?? 'Ошибка отправки');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const competencies = data?.feedback360.competencies ?? [];

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white py-10 px-4">
      <div className="max-w-xl mx-auto">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center font-black text-white">A</div>
          <span className="font-bold text-lg">Aptio</span>
        </div>

        <AnimatePresence mode="wait">
          {step === 'done' ? (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-16">
              <div className="text-6xl mb-4">✅</div>
              <h2 className="text-2xl font-bold text-white mb-2">Оценка отправлена!</h2>
              <p className="text-zinc-400">Спасибо за участие в оценке коллег.</p>
            </motion.div>
          ) : (
            <motion.div key="form" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
              <div className="rounded-2xl border border-white/8 p-6 mb-6" style={{ background: 'rgba(255,255,255,0.02)' }}>
                <h1 className="text-xl font-bold text-white mb-1">
                  {data?.feedback360.name ?? 'Оценка 360°'}
                </h1>
                <p className="text-zinc-500 text-sm">Оцените компетенции вашего коллеги по шкале 1–5</p>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm text-zinc-400 mb-1.5">Ваш ID (из ссылки)</label>
                  <input
                    value={raterUserId} onChange={(e) => setRaterUser(e.target.value)}
                    placeholder="raterUserId..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500 transition-colors text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm text-zinc-400 mb-1.5">Кого оцениваете (ID)</label>
                  <input
                    value={ratedUserId} onChange={(e) => setRatedUser(e.target.value)}
                    placeholder="ratedUserId..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500 transition-colors text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm text-zinc-400 mb-1.5">Тип оценки</label>
                  <div className="flex gap-2">
                    {(['peer', 'self', 'manager'] as const).map((t) => (
                      <button
                        key={t} onClick={() => setRationType(t)}
                        className={`text-sm px-4 py-2 rounded-lg border transition-colors ${
                          rationType === t
                            ? 'bg-blue-600/30 border-blue-500/50 text-blue-300'
                            : 'bg-white/5 border-white/10 text-zinc-400 hover:border-white/20'
                        }`}
                      >
                        {t === 'peer' ? 'Коллега' : t === 'self' ? 'Самооценка' : 'Руководитель'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Competency ratings */}
              <div className="space-y-4 mb-6">
                {competencies.map((comp) => (
                  <div key={comp} className="rounded-2xl border border-white/8 p-5" style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <p className="font-medium text-white mb-3">{comp}</p>
                    <StarRating value={scores[comp] ?? 0} onChange={(v) => setScore(comp, v)} />
                  </div>
                ))}
              </div>

              {/* Comment */}
              <div className="mb-6">
                <label className="block text-sm text-zinc-400 mb-1.5">Комментарий (необязательно)</label>
                <textarea
                  value={comments} onChange={(e) => setComments(e.target.value)}
                  rows={3} placeholder="Дополнительные наблюдения..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500 transition-colors resize-none text-sm"
                />
              </div>

              {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

              <button
                onClick={submitRating} disabled={submitting}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
              >
                {submitting ? 'Отправка...' : 'Отправить оценку'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
