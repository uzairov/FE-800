'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const STEPS = [
  {
    icon:  '📋',
    title: 'Создайте оценку',
    desc:  'Выберите должность, укажите имя кандидата и при желании — email. Ссылка отправится автоматически.',
    cta:   'Понятно',
  },
  {
    icon:  '🔗',
    title: 'Отправьте ссылку',
    desc:  'Кандидат перейдёт по ссылке, выберет язык и пройдёт психометрический тест. Всё занимает 30–60 минут.',
    cta:   'Понятно',
  },
  {
    icon:  '📊',
    title: 'Изучите отчёт',
    desc:  'После завершения откройте Radar-отчёт: баллы по компетенциям, Red Flag индикаторы и ваши заметки.',
    cta:   'Начать работу →',
  },
];

export default function Onboarding() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!localStorage.getItem('aptio_onboarding_done')) {
      const timer = setTimeout(() => setOpen(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  function next() {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      localStorage.setItem('aptio_onboarding_done', '1');
      setOpen(false);
    }
  }

  function skip() {
    localStorage.setItem('aptio_onboarding_done', '1');
    setOpen(false);
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={skip}
          />

          {/* Modal */}
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1,   y: 0 }}
              exit={{    scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="w-full max-w-sm rounded-2xl p-8 relative"
              style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.1)' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Skip */}
              <button onClick={skip}
                className="absolute top-4 right-4 text-white/30 hover:text-white/60 text-sm transition-colors">
                Пропустить
              </button>

              {/* Step indicator */}
              <div className="flex gap-1.5 mb-6">
                {STEPS.map((_, i) => (
                  <motion.div key={i}
                    animate={{ width: i === step ? 24 : 8, opacity: i <= step ? 1 : 0.3 }}
                    transition={{ duration: 0.3 }}
                    className="h-1.5 rounded-full bg-blue-500"
                  />
                ))}
              </div>

              <AnimatePresence mode="wait">
                <motion.div key={step}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0  }}
                  exit={{    opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                >
                  <div className="text-5xl mb-4 text-center">{STEPS[step].icon}</div>
                  <h2 className="text-xl font-bold text-white text-center mb-3">{STEPS[step].title}</h2>
                  <p className="text-white/50 text-sm text-center leading-relaxed mb-8">{STEPS[step].desc}</p>
                </motion.div>
              </AnimatePresence>

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={next}
                className="w-full py-3 rounded-xl text-sm font-semibold text-white"
                style={{ background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', boxShadow: '0 4px 20px rgba(37,99,235,0.35)' }}
              >
                {STEPS[step].cta}
              </motion.button>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
