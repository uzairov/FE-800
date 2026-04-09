'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

// ── Animation helpers ─────────────────────────────────────────────────────────
const fadeUp = (delay = 0) => ({
  initial:   { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport:  { once: true },
  transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as [number, number, number, number], delay },
});

// ── Data ──────────────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: '🧠',
    title: 'Психометрические тесты',
    desc: 'Научно обоснованные блоки SJT, EQ, PSS и интервью по компетенциям для объективной оценки.',
  },
  {
    icon: '📊',
    title: 'Аналитика в реальном времени',
    desc: 'Radar-профиль компетенций, взвешенные баллы и детальный отчёт готовы сразу после теста.',
  },
  {
    icon: '🛡️',
    title: 'Система Red Flags',
    desc: 'Автоматическое выявление подозрительного поведения: быстрые ответы, переключение вкладок, паузы.',
  },
  {
    icon: '🌐',
    title: 'Мультиязычность',
    desc: 'Тесты и интерфейс на русском, узбекском и английском. Кандидат выбирает язык сам.',
  },
  {
    icon: '⚡',
    title: 'Мгновенная ссылка',
    desc: 'Создайте оценку за 30 секунд — кандидат получает персональную ссылку, действующую 7 дней.',
  },
  {
    icon: '🔒',
    title: 'Безопасность',
    desc: 'JWT + refresh rotation, bcrypt, данные изолированы по компании. Enterprise-ready.',
  },
];

const STATS = [
  { value: '63',   label: 'вопроса в базе',        suffix: '' },
  { value: '11',   label: 'блоков оценки',          suffix: '' },
  { value: '16',   label: 'компетенций',            suffix: '+' },
  { value: '7',    label: 'Red Flag индикаторов',   suffix: '' },
];

const HOW = [
  { step: '01', title: 'Создайте оценку',    desc: 'Выберите должность, настройте компетенции и получите ссылку.' },
  { step: '02', title: 'Кандидат проходит',  desc: 'Персональная ссылка, выбор языка, тест с таймером по блокам.' },
  { step: '03', title: 'Смотрите отчёт',     desc: 'Radar-chart, баллы по компетенциям, флаги риска — всё готово.' },
];

// ── Mock UI screenshot (pure CSS) ─────────────────────────────────────────────
function MockDashboard() {
  return (
    <div className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl glow-blue"
         style={{ background: 'linear-gradient(135deg, #0f1623 0%, #0d1829 100%)' }}>
      {/* Top bar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
        <div className="w-3 h-3 rounded-full bg-red-500/70"/>
        <div className="w-3 h-3 rounded-full bg-yellow-500/70"/>
        <div className="w-3 h-3 rounded-full bg-green-500/70"/>
        <div className="flex-1 mx-4 h-6 rounded bg-white/5 flex items-center px-3">
          <span className="text-white/30 text-[10px]">localhost:3000/dashboard</span>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div className="w-44 border-r border-white/5 p-3 space-y-1">
          <div className="flex items-center gap-2 px-2 py-1.5 mb-3">
            <div className="w-6 h-6 rounded-lg bg-blue-600 flex items-center justify-center">
              <span className="text-white text-[10px] font-bold">T</span>
            </div>
            <span className="text-white/80 text-xs font-semibold">Aptio</span>
          </div>
          {['◈ Обзор', '☰ Оценки', '+ Новая', '⚙ Настройки'].map((item, i) => (
            <div key={i}
              className={`px-3 py-1.5 rounded-lg text-[11px] ${i === 0 ? 'bg-blue-600 text-white' : 'text-white/40'}`}>
              {item}
            </div>
          ))}
        </div>

        {/* Main content */}
        <div className="flex-1 p-4">
          <div className="text-white/80 text-xs font-semibold mb-3">Обзор</div>

          {/* Stat cards */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[
              { l: 'Всего оценок', v: '24', c: '#3b82f6' },
              { l: 'Завершено',    v: '18', c: '#10b981' },
              { l: 'В процессе',  v: '3',  c: '#f59e0b' },
            ].map(({ l, v, c }) => (
              <div key={l} className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="text-white/40 text-[9px] mb-1">{l}</div>
                <div className="text-xl font-bold" style={{ color: c }}>{v}</div>
              </div>
            ))}
          </div>

          {/* Mini table */}
          <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="grid grid-cols-4 px-3 py-1.5 border-b border-white/5">
              {['Кандидат','Должность','Статус','Дата'].map(h => (
                <div key={h} className="text-white/30 text-[9px] font-medium uppercase tracking-wide">{h}</div>
              ))}
            </div>
            {[
              { name: 'Алия Н.', pos: 'Sales Manager', status: 'Завершена', color: '#10b981', date: '04.04' },
              { name: 'Руслан К.', pos: 'Call Center', status: 'В процессе', color: '#f59e0b', date: '04.04' },
              { name: 'Диана М.', pos: 'Sales Manager', status: 'Создана', color: '#64748b', date: '03.04' },
            ].map((r, i) => (
              <div key={i} className="grid grid-cols-4 px-3 py-2 border-b border-white/[0.03]">
                <div className="text-white/70 text-[10px] font-medium">{r.name}</div>
                <div className="text-white/40 text-[10px]">{r.pos}</div>
                <div className="text-[10px] font-medium" style={{ color: r.color }}>{r.status}</div>
                <div className="text-white/30 text-[10px]">{r.date}</div>
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
    <div className="min-h-screen" style={{ background: 'linear-gradient(160deg, #080c14 0%, #0a1020 50%, #080c14 100%)' }}>

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4"
           style={{ background: 'rgba(8,12,20,0.8)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/30">
            <span className="text-white font-bold text-sm">T</span>
          </div>
          <span className="text-white font-bold text-lg tracking-tight">Aptio</span>
          <span className="text-[10px] font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-full">BETA</span>
        </div>

        <div className="hidden md:flex items-center gap-8 text-sm text-white/50">
          <a href="#features" className="hover:text-white transition-colors">Возможности</a>
          <a href="#how"      className="hover:text-white transition-colors">Как работает</a>
          <a href="#stats"    className="hover:text-white transition-colors">Цифры</a>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/login"
            className="text-sm text-white/60 hover:text-white transition-colors px-4 py-2">
            Войти
          </Link>
          <Link href="/login"
            className="text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-colors px-5 py-2 rounded-xl shadow-lg shadow-blue-600/25">
            Начать бесплатно →
          </Link>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="pt-32 pb-20 px-6 text-center relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full opacity-20 pointer-events-none"
             style={{ background: 'radial-gradient(ellipse, #2563eb 0%, transparent 70%)', filter: 'blur(60px)' }}/>

        <motion.div {...fadeUp(0)} className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 text-sm font-medium text-blue-400"
          style={{ background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.25)' }}>
          <span className="w-2 h-2 rounded-full bg-blue-400" style={{ animation: 'pulse-ring 2s infinite' }}/>
          HR-Tech платформа психометрической оценки
        </motion.div>

        <motion.h1 {...fadeUp(0.1)} className="text-5xl md:text-7xl font-bold text-white leading-tight mb-6 tracking-tight">
          Нанимайте лучших.<br/>
          <span className="gradient-text">Измеряйте компетенции.</span>
        </motion.h1>

        <motion.p {...fadeUp(0.2)} className="text-lg md:text-xl text-white/50 max-w-2xl mx-auto mb-10 leading-relaxed">
          Aptio автоматизирует психометрическую оценку кандидатов: научные тесты,
          мгновенный отчёт с Radar-профилем и интеллектуальная защита от списывания.
        </motion.p>

        <motion.div {...fadeUp(0.3)} className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
          <Link href="/login"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-8 py-4 rounded-2xl text-base transition-all shadow-2xl shadow-blue-600/30 hover:shadow-blue-500/40 hover:-translate-y-0.5">
            Создать аккаунт бесплатно
            <span className="text-white/60">→</span>
          </Link>
          <a href="#how"
            className="inline-flex items-center gap-2 text-white/60 hover:text-white font-medium px-6 py-4 rounded-2xl text-base transition-colors border border-white/10 hover:border-white/20">
            Как это работает
            <span>↓</span>
          </a>
        </motion.div>

        {/* Mock Dashboard */}
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.97 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] as [number, number, number, number], delay: 0.2 }}
          className="max-w-4xl mx-auto float"
        >
          <MockDashboard />
        </motion.div>
      </section>

      {/* ── Stats ─────────────────────────────────────────────────────────── */}
      <section id="stats" className="py-16 px-6" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map(({ value, label, suffix }, i) => (
            <motion.div key={label} {...fadeUp(i * 0.07)} className="text-center">
              <div className="text-4xl font-bold text-white mb-1">
                {value}<span className="text-blue-400">{suffix}</span>
              </div>
              <div className="text-sm text-white/40">{label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────────────────── */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div {...fadeUp()} className="text-center mb-16">
            <div className="text-sm font-semibold text-blue-400 uppercase tracking-widest mb-3">Возможности</div>
            <h2 className="text-4xl font-bold text-white mb-4">Всё для объективного найма</h2>
            <p className="text-white/40 text-lg max-w-xl mx-auto">
              От создания ссылки до финального отчёта — за минуты, без бумаги.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map(({ icon, title, desc }, i) => (
              <motion.div
                key={title}
                {...fadeUp(i * 0.06)}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="p-6 rounded-2xl transition-all cursor-default"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-4"
                     style={{ background: 'rgba(37,99,235,0.15)', border: '1px solid rgba(37,99,235,0.2)' }}>
                  {icon}
                </div>
                <h3 className="text-white font-semibold text-base mb-2">{title}</h3>
                <p className="text-white/40 text-sm leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────────── */}
      <section id="how" className="py-24 px-6" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="max-w-4xl mx-auto">
          <motion.div {...fadeUp()} className="text-center mb-16">
            <div className="text-sm font-semibold text-blue-400 uppercase tracking-widest mb-3">Процесс</div>
            <h2 className="text-4xl font-bold text-white">Как это работает</h2>
          </motion.div>

          <div className="relative">
            {/* Connector line */}
            <div className="absolute left-[52px] top-12 bottom-12 w-px hidden md:block"
                 style={{ background: 'linear-gradient(to bottom, rgba(37,99,235,0.5), rgba(37,99,235,0.05))' }}/>

            <div className="space-y-8">
              {HOW.map(({ step, title, desc }, i) => (
                <motion.div key={step} {...fadeUp(i * 0.1)} className="flex gap-6 items-start">
                  <div className="w-[52px] h-12 rounded-2xl flex items-center justify-center shrink-0 font-bold text-sm text-blue-400 relative z-10"
                       style={{ background: 'rgba(37,99,235,0.15)', border: '1px solid rgba(37,99,235,0.3)' }}>
                    {step}
                  </div>
                  <div className="pt-2">
                    <h3 className="text-white font-semibold text-lg mb-1">{title}</h3>
                    <p className="text-white/40 text-sm leading-relaxed">{desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <section className="py-24 px-6" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <motion.div
          {...fadeUp()}
          className="max-w-2xl mx-auto text-center p-12 rounded-3xl relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, rgba(37,99,235,0.2) 0%, rgba(124,58,237,0.15) 100%)', border: '1px solid rgba(37,99,235,0.3)' }}
        >
          <div className="absolute inset-0 rounded-3xl pointer-events-none"
               style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(37,99,235,0.15) 0%, transparent 70%)' }}/>

          <div className="text-5xl mb-4">🚀</div>
          <h2 className="text-3xl font-bold text-white mb-4">Готовы начать?</h2>
          <p className="text-white/50 mb-8 text-base leading-relaxed">
            Создайте аккаунт и отправьте первый тест кандидату уже через 2 минуты.
          </p>
          <Link href="/login"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-8 py-4 rounded-2xl text-base transition-all shadow-xl shadow-blue-600/30 hover:-translate-y-0.5">
            Начать бесплатно →
          </Link>
        </motion.div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="py-8 px-6 text-center" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <p className="text-white/20 text-sm">
          © 2026 Aptio · HR-Tech платформа психометрической оценки
        </p>
      </footer>
    </div>
  );
}
