'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

const INDUSTRIES = [
  { value: 'retail',      label: 'Ритейл / Торговля' },
  { value: 'finance',     label: 'Финансы / Банки' },
  { value: 'it',          label: 'IT / Технологии' },
  { value: 'callcenter',  label: 'Колл-центр / BPO' },
  { value: 'logistics',   label: 'Логистика / Доставка' },
  { value: 'hospitality', label: 'HoReCa / Сервис' },
  { value: 'healthcare',  label: 'Медицина / Фармация' },
  { value: 'other',       label: 'Другое' },
];

const SIZES = [
  { value: '1-10',    label: '1–10',    hint: 'Стартап' },
  { value: '11-50',   label: '11–50',   hint: 'Малый бизнес' },
  { value: '51-200',  label: '51–200',  hint: 'Средний бизнес' },
  { value: '201-500', label: '201–500', hint: 'Крупная компания' },
  { value: '500+',    label: '500+',    hint: 'Корпорация' },
];

export default function OnboardingWrapper() {
  return <Suspense><OnboardingPage /></Suspense>;
}

function OnboardingPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const verified     = searchParams.get('verified') === '1';

  const [step,     setStep]     = useState(1);
  const [industry, setIndustry] = useState('');
  const [size,     setSize]     = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  // Redirect if not logged in
  useEffect(() => {
    const token = localStorage.getItem('accessToken') ?? sessionStorage.getItem('accessToken');
    if (!token) router.replace('/login');
  }, [router]);

  async function handleFinish() {
    if (!industry || !size) { setError('Заполните все поля'); return; }
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('accessToken') ?? sessionStorage.getItem('accessToken') ?? '';
      const res   = await fetch('/api/onboarding', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body:    JSON.stringify({ industry, size }),
      });
      const json  = await res.json();
      if (!json.success) { setError(json.error ?? 'Ошибка'); setLoading(false); return; }
      router.push('/dashboard');
    } catch {
      setError('Ошибка сети.');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
         style={{ background: 'linear-gradient(160deg, #060a12 0%, #0a1020 60%, #070b14 100%)' }}>

      {/* Progress */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-white/5">
        <motion.div
          className="h-full bg-blue-500"
          animate={{ width: `${step * 50}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>

      <motion.div
        key={step}
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -40 }}
        className="w-full max-w-lg"
      >
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
            <span className="text-white font-black text-lg">A</span>
          </div>
          <span className="text-white font-bold text-xl">Aptio</span>
        </div>

        <div className="rounded-2xl p-8" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-6">
            <span className="text-xs text-white/30">Шаг {step} из 2</span>
            <div className="flex gap-1.5 ml-2">
              {[1, 2].map((s) => (
                <div key={s} className="w-6 h-1 rounded-full transition-colors"
                     style={{ background: s <= step ? '#2563eb' : 'rgba(255,255,255,0.1)' }} />
              ))}
            </div>
          </div>

          {verified && step === 1 && (
            <div className="mb-4 px-4 py-3 rounded-xl text-sm text-green-400"
                 style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>
              ✓ Email успешно подтверждён
            </div>
          )}

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <h1 className="text-2xl font-bold text-white mb-1">Расскажите о компании</h1>
                <p className="text-white/40 text-sm mb-6">Это поможет подобрать подходящие шаблоны оценки.</p>

                {/* Industry */}
                <div className="mb-5">
                  <label className="block text-sm text-white/50 mb-2">Отрасль</label>
                  <div className="grid grid-cols-2 gap-2">
                    {INDUSTRIES.map((ind) => (
                      <button key={ind.value} type="button"
                        onClick={() => setIndustry(ind.value)}
                        className="px-3 py-2.5 rounded-xl text-sm text-left transition-all"
                        style={{
                          background: industry === ind.value ? 'rgba(37,99,235,0.25)' : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${industry === ind.value ? 'rgba(37,99,235,0.6)' : 'rgba(255,255,255,0.08)'}`,
                          color: industry === ind.value ? '#93c5fd' : 'rgba(255,255,255,0.5)',
                        }}>
                        {ind.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Size */}
                <div className="mb-6">
                  <label className="block text-sm text-white/50 mb-2">Размер компании</label>
                  <div className="flex gap-2 flex-wrap">
                    {SIZES.map((s) => (
                      <button key={s.value} type="button"
                        onClick={() => setSize(s.value)}
                        className="px-4 py-2 rounded-xl text-sm transition-all"
                        style={{
                          background: size === s.value ? 'rgba(37,99,235,0.25)' : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${size === s.value ? 'rgba(37,99,235,0.6)' : 'rgba(255,255,255,0.08)'}`,
                          color: size === s.value ? '#93c5fd' : 'rgba(255,255,255,0.5)',
                        }}>
                        <div className="font-semibold">{s.label}</div>
                        <div className="text-[10px] opacity-60">{s.hint}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {error && (
                  <p className="text-red-400 text-sm mb-4">{error}</p>
                )}

                <motion.button
                  onClick={() => {
                    if (!industry || !size) { setError('Выберите отрасль и размер компании'); return; }
                    setError('');
                    setStep(2);
                  }}
                  whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.97 }}
                  className="w-full py-3 rounded-xl text-sm font-semibold text-white"
                  style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}>
                  Далее →
                </motion.button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <h1 className="text-2xl font-bold text-white mb-1">Всё готово!</h1>
                <p className="text-white/40 text-sm mb-6">
                  Ваш аккаунт настроен. Начните с создания первой оценки или изучите шаблоны должностей.
                </p>

                <div className="space-y-3 mb-6">
                  {[
                    { icon: '📋', title: 'Шаблоны должностей', desc: 'Готовые психометрические тесты для найма' },
                    { icon: '👤', title: 'Создать оценку', desc: 'Отправьте ссылку кандидату за 1 минуту' },
                    { icon: '📊', title: 'Radar-отчёт', desc: 'Автоматический анализ компетенций после теста' },
                  ].map((item) => (
                    <div key={item.title} className="flex items-start gap-3 p-4 rounded-xl"
                         style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                      <span className="text-xl">{item.icon}</span>
                      <div>
                        <div className="text-white text-sm font-medium">{item.title}</div>
                        <div className="text-white/40 text-xs mt-0.5">{item.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

                <div className="flex gap-3">
                  <button onClick={() => setStep(1)}
                    className="px-4 py-3 rounded-xl text-sm text-white/50 hover:text-white/80 transition-colors"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    ← Назад
                  </button>
                  <motion.button
                    onClick={handleFinish} disabled={loading}
                    whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.97 }}
                    className="flex-1 py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}>
                    {loading ? 'Сохранение...' : 'Перейти в дашборд →'}
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
