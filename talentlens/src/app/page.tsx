'use client';

import Link from 'next/link';
import { motion, useInView } from 'framer-motion';
import { useRef, useEffect, useState } from 'react';

// ── CountUp ───────────────────────────────────────────────────────────────────
function useCountUp(target: number, duration = 1800, active = false) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!active) return;
    const start = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setVal(Math.round(ease * target));
      if (t < 1) { raf = requestAnimationFrame(tick); }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, target, duration]);
  return val;
}

function StatCard({ value, suffix, label, delay }: { value: number; suffix: string; label: string; delay: number }) {
  const ref    = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const count  = useCountUp(value, 1800, inView);
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      className="text-center"
    >
      <div className="text-5xl font-black text-white mb-2 tracking-tight">
        {count}<span style={{ color: '#60a5fa' }}>{suffix}</span>
      </div>
      <div className="text-sm text-white/40">{label}</div>
    </motion.div>
  );
}

// ── Data ──────────────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#60a5fa" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    title: 'Психометрические тесты',
    desc: 'Научно обоснованные блоки SJT, EQ, PSS и интервью по компетенциям для объективной оценки каждого кандидата.',
    color: '#3B82F6',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
        <path d="M3 3v18h18" stroke="#a78bfa" strokeWidth="1.8" strokeLinecap="round"/>
        <path d="M18 9l-5 5-4-4-3 3" stroke="#a78bfa" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    title: 'Radar-аналитика',
    desc: 'Мгновенный профиль компетенций, взвешенные баллы и детальный отчёт готовы сразу после прохождения теста.',
    color: '#8B5CF6',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="#34d399" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    title: 'Система Red Flags',
    desc: 'Автоматическое выявление подозрительного поведения: быстрые ответы, переключение вкладок, нетипичные паузы.',
    color: '#10B981',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
        <circle cx="12" cy="12" r="10" stroke="#f59e0b" strokeWidth="1.8"/>
        <path d="M12 8v4l3 3" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    ),
    title: 'Мгновенная ссылка',
    desc: 'Создайте оценку за 30 секунд — кандидат получает персональную ссылку, действующую 7 дней на любом устройстве.',
    color: '#F59E0B',
  },
];

const STATS = [
  { value: 132, suffix: '+', label: 'вопросов в базе' },
  { value: 20,  suffix: '+', label: 'компетенций' },
  { value: 10,  suffix: '',  label: 'должностей' },
  { value: 3,   suffix: '',  label: 'языка интерфейса' },
];

const HOW = [
  {
    step: '01',
    title: 'Создайте оценку',
    desc: 'Выберите должность, настройте компетенции и получите уникальную ссылку для кандидата.',
    icon: (
      <svg viewBox="0 0 32 32" fill="none" className="w-8 h-8">
        <rect x="4" y="4" width="24" height="24" rx="6" stroke="#3B82F6" strokeWidth="2"/>
        <path d="M16 10v12M10 16h12" stroke="#3B82F6" strokeWidth="2.5" strokeLinecap="round"/>
      </svg>
    ),
    color: '#3B82F6',
  },
  {
    step: '02',
    title: 'Кандидат проходит',
    desc: 'Персональная ссылка, выбор языка, тест с таймером по блокам — без установки приложений.',
    icon: (
      <svg viewBox="0 0 32 32" fill="none" className="w-8 h-8">
        <rect x="4" y="6" width="24" height="20" rx="4" stroke="#8B5CF6" strokeWidth="2"/>
        <path d="M10 12h12M10 16h8M10 20h10" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
    color: '#8B5CF6',
  },
  {
    step: '03',
    title: 'Смотрите отчёт',
    desc: 'Radar-chart, баллы по компетенциям, флаги риска и рекомендации — всё готово мгновенно.',
    icon: (
      <svg viewBox="0 0 32 32" fill="none" className="w-8 h-8">
        <polygon points="16,4 28,10 28,22 16,28 4,22 4,10" stroke="#10B981" strokeWidth="2" fill="none"/>
        <polygon points="16,10 22,13 22,19 16,22 10,19 10,13" stroke="#10B981" strokeWidth="1.5" fill="rgba(16,185,129,0.12)"/>
        <circle cx="16" cy="16" r="2" fill="#10B981"/>
      </svg>
    ),
    color: '#10B981',
  },
];

const fadeUp = (delay = 0) => ({
  initial:   { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport:  { once: true },
  transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as [number, number, number, number], delay },
});

// ── Mock Dashboard ────────────────────────────────────────────────────────────
function MockDashboard() {
  return (
    <div className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl"
         style={{ background: 'linear-gradient(135deg, #0c1128 0%, #0a0e27 100%)' }}>
      <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-white/5">
        <div className="w-2.5 h-2.5 rounded-full bg-red-500/60"/>
        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60"/>
        <div className="w-2.5 h-2.5 rounded-full bg-green-500/60"/>
        <div className="flex-1 mx-3 h-5 rounded bg-white/5 flex items-center px-3">
          <span className="text-white/30 text-[9px]">app.aptio.uz/dashboard</span>
        </div>
      </div>
      <div className="flex">
        <div className="w-36 border-r border-white/5 p-2.5 space-y-0.5">
          <div className="flex items-center gap-1.5 px-2 py-1.5 mb-2">
            <div className="w-5 h-5 rounded-lg flex items-center justify-center"
                 style={{ background: 'linear-gradient(135deg,#3B82F6,#8B5CF6)' }}>
              <span className="text-white text-[9px] font-bold">A</span>
            </div>
            <span className="text-white/80 text-[11px] font-semibold">Aptio</span>
          </div>
          {['◈ Обзор', '☰ Оценки', '+ Новая', '⚙ Настройки'].map((item, i) => (
            <div key={i}
              className={`px-2.5 py-1.5 rounded-lg text-[10px] ${i === 0 ? 'text-white' : 'text-white/35'}`}
              style={i === 0 ? { background: 'linear-gradient(135deg,rgba(59,130,246,0.4),rgba(139,92,246,0.25))', border: '1px solid rgba(59,130,246,0.3)' } : {}}>
              {item}
            </div>
          ))}
        </div>
        <div className="flex-1 p-3">
          <div className="text-white/60 text-[10px] font-semibold mb-2.5">Обзор</div>
          <div className="grid grid-cols-3 gap-1.5 mb-3">
            {[['Оценок','24','#3b82f6'],['Готово','18','#10b981'],['Активно','3','#f59e0b']].map(([l,v,c]) => (
              <div key={l} className="rounded-lg p-2"
                   style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="text-white/35 text-[8px] mb-0.5">{l}</div>
                <div className="text-base font-bold" style={{ color: c as string }}>{v}</div>
              </div>
            ))}
          </div>
          <div className="rounded-xl overflow-hidden"
               style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            {[
              { n: 'Алия Н.',   p: 'Sales Mgr',   s: 'Завершена',  c: '#10b981' },
              { n: 'Руслан К.', p: 'Call Center', s: 'В процессе', c: '#f59e0b' },
              { n: 'Диана М.',  p: 'Sales Mgr',   s: 'Создана',    c: '#64748b' },
            ].map((r, i) => (
              <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 border-b border-white/[0.04]">
                <div className="w-4 h-4 rounded-full bg-white/10 text-[8px] text-white/50 flex items-center justify-center shrink-0">
                  {r.n[0]}
                </div>
                <div className="flex-1 text-white/60 text-[9px]">{r.n}</div>
                <div className="text-white/30 text-[9px] hidden sm:block">{r.p}</div>
                <div className="text-[9px] font-medium shrink-0" style={{ color: r.c }}>{r.s}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: '#0A0E27' }}>

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-10 py-4"
           style={{ background: 'rgba(10,14,39,0.88)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/30"
               style={{ background: 'linear-gradient(135deg,#3B82F6,#8B5CF6)' }}>
            <span className="text-white font-bold text-sm">A</span>
          </div>
          <span className="text-white font-bold text-lg tracking-tight">Aptio</span>
        </Link>

        <div className="hidden md:flex items-center gap-8 text-sm text-white/50">
          <a href="#features" className="hover:text-white transition-colors">Возможности</a>
          <a href="#how"      className="hover:text-white transition-colors">Как работает</a>
          <a href="#stats"    className="hover:text-white transition-colors">Цифры</a>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-white/60 hover:text-white transition-colors px-4 py-2">
            Войти
          </Link>
          <Link href="/login"
            className="text-sm font-semibold text-white px-5 py-2 rounded-xl transition-all hover:-translate-y-0.5"
            style={{ background: 'linear-gradient(135deg,#3B82F6,#8B5CF6)', boxShadow: '0 4px 20px rgba(59,130,246,0.35)' }}>
            Начать →
          </Link>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center pt-24 pb-16 px-6 text-center overflow-hidden">
        {/* Floating blur orbs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <motion.div
            className="absolute rounded-full"
            style={{ width: 700, height: 700, top: '5%', left: '50%', x: '-50%',
                     background: 'radial-gradient(circle, rgba(59,130,246,0.14) 0%, transparent 70%)',
                     filter: 'blur(80px)' }}
            animate={{ scale: [1, 1.15, 1], opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute rounded-full"
            style={{ width: 450, height: 450, top: '25%', right: '5%',
                     background: 'radial-gradient(circle, rgba(139,92,246,0.11) 0%, transparent 70%)',
                     filter: 'blur(80px)' }}
            animate={{ scale: [1, 1.2, 1], x: [0, -30, 0] }}
            transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute rounded-full"
            style={{ width: 350, height: 350, bottom: '10%', left: '10%',
                     background: 'radial-gradient(circle, rgba(16,185,129,0.07) 0%, transparent 70%)',
                     filter: 'blur(70px)' }}
            animate={{ y: [0, -25, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>

        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8 text-sm font-medium"
          style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)', color: '#93c5fd' }}
        >
          <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"/>
          HR-Tech платформа · Психометрическая оценка
        </motion.div>

        {/* Heading */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="text-5xl md:text-7xl lg:text-[82px] font-black text-white leading-[1.05] mb-6 tracking-tight"
        >
          Нанимайте лучших.<br/>
          <span style={{
            backgroundImage: 'linear-gradient(135deg, #60a5fa 0%, #a78bfa 50%, #34d399 100%)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            Измеряйте компетенции.
          </span>
        </motion.h1>

        {/* Subheading */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-lg md:text-xl text-white/50 max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          Aptio автоматизирует психометрическую оценку кандидатов: научные тесты,
          мгновенный Radar-отчёт и интеллектуальная защита от списывания.
        </motion.p>

        {/* CTA buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20"
        >
          <Link href="/login"
            className="inline-flex items-center gap-2 text-white font-semibold px-8 py-4 rounded-2xl text-base transition-all hover:-translate-y-0.5"
            style={{ background: 'linear-gradient(135deg,#3B82F6,#8B5CF6)', boxShadow: '0 8px 32px rgba(59,130,246,0.35)' }}>
            Создать аккаунт бесплатно →
          </Link>
          <a href="#how"
            className="inline-flex items-center gap-2 text-white/60 hover:text-white font-medium px-6 py-4 rounded-2xl text-base transition-colors"
            style={{ border: '1px solid rgba(255,255,255,0.12)' }}>
            Как это работает ↓
          </a>
        </motion.div>

        {/* Mock screen */}
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.45, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
          className="w-full max-w-4xl mx-auto float"
          style={{ filter: 'drop-shadow(0 30px 60px rgba(59,130,246,0.18))' }}
        >
          <MockDashboard />
        </motion.div>
      </section>

      {/* ── Stats ─────────────────────────────────────────────────────────── */}
      <section id="stats" className="py-20 px-6"
               style={{ borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)',
                        background: 'linear-gradient(180deg,#0A0E27 0%,#1A1F3A 100%)' }}>
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-10">
          {STATS.map(({ value, suffix, label }, i) => (
            <StatCard key={label} value={value} suffix={suffix} label={label} delay={i * 0.08} />
          ))}
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────────────────── */}
      <section id="features" className="py-28 px-6" style={{ background: '#1A1F3A' }}>
        <div className="max-w-6xl mx-auto">
          <motion.div {...fadeUp()} className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-4"
                 style={{ background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.2)', color: '#93c5fd' }}>
              ВОЗМОЖНОСТИ
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-4">Всё для объективного найма</h2>
            <p className="text-white/40 text-lg max-w-xl mx-auto">
              От создания ссылки до финального отчёта — за минуты, без бумаги.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {FEATURES.map(({ icon, title, desc, color }, i) => (
              <motion.div
                key={title}
                {...fadeUp(i * 0.08)}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="p-7 rounded-2xl cursor-default transition-all"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5"
                     style={{ background: `${color}1a`, border: `1px solid ${color}30` }}>
                  {icon}
                </div>
                <h3 className="text-white font-bold text-lg mb-2">{title}</h3>
                <p className="text-white/40 text-sm leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────────── */}
      <section id="how" className="py-28 px-6"
               style={{ background: 'linear-gradient(180deg,#1A1F3A 0%,#0A0E27 100%)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-4xl mx-auto">
          <motion.div {...fadeUp()} className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-4"
                 style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.2)', color: '#c4b5fd' }}>
              ПРОЦЕСС
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-white">Как это работает</h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {HOW.map(({ step, title, desc, icon, color }, i) => (
              <motion.div
                key={step}
                {...fadeUp(i * 0.12)}
                className="p-7 rounded-2xl relative overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <div className="text-white/8 font-black text-7xl absolute top-2 right-4 leading-none select-none"
                     style={{ color: `${color}12` }}>
                  {step}
                </div>
                <div className="mb-5 relative z-10">{icon}</div>
                <h3 className="text-white font-bold text-lg mb-2 relative z-10">{title}</h3>
                <p className="text-white/40 text-sm leading-relaxed relative z-10">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <section className="py-28 px-6" style={{ background: '#0A0E27' }}>
        <motion.div
          {...fadeUp()}
          className="max-w-2xl mx-auto text-center p-14 rounded-3xl relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.14) 0%, rgba(139,92,246,0.10) 100%)', border: '1px solid rgba(59,130,246,0.25)' }}
        >
          <div className="absolute inset-0 rounded-3xl pointer-events-none"
               style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(59,130,246,0.12) 0%, transparent 65%)' }}/>
          <h2 className="text-4xl font-black text-white mb-4 relative z-10">Готовы начать?</h2>
          <p className="text-white/50 mb-8 text-base leading-relaxed relative z-10">
            Создайте аккаунт и отправьте первый тест кандидату уже через 2 минуты.
          </p>
          <Link href="/login"
            className="inline-flex items-center gap-2 text-white font-semibold px-8 py-4 rounded-2xl text-base transition-all hover:-translate-y-0.5 relative z-10"
            style={{ background: 'linear-gradient(135deg,#3B82F6,#8B5CF6)', boxShadow: '0 8px 32px rgba(59,130,246,0.3)' }}>
            Начать бесплатно →
          </Link>
        </motion.div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="py-8 px-6 text-center" style={{ background: '#0A0E27', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex items-center justify-center gap-2.5 mb-3">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center"
               style={{ background: 'linear-gradient(135deg,#3B82F6,#8B5CF6)' }}>
            <span className="text-white font-bold text-xs">A</span>
          </div>
          <span className="text-white/40 text-sm font-medium">Aptio</span>
        </div>
        <p className="text-white/20 text-sm">© 2026 Aptio · HR-Tech платформа психометрической оценки</p>
      </footer>
    </div>
  );
}
