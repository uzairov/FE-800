'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

type Mode = 'login' | 'register';

export default function LoginPage() {
  const router  = useRouter();
  const [mode, setMode]       = useState<Mode>('login');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [form, setForm] = useState({ email: '', password: '', name: '', companyName: '' });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const body     = mode === 'login' ? { email: form.email, password: form.password } : form;
      const res      = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const json     = await res.json();
      if (!json.success) { setError(json.error ?? 'Что-то пошло не так'); return; }
      localStorage.setItem('accessToken',  json.data.accessToken);
      localStorage.setItem('refreshToken', json.data.refreshToken);
      router.push('/dashboard');
    } catch {
      setError('Ошибка сети. Проверьте подключение.');
    } finally {
      setLoading(false);
    }
  }

  const inputCls = `w-full rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all`;
  const inputStyle = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' };

  return (
    <div className="min-h-screen flex" style={{ background: 'linear-gradient(160deg, #080c14 0%, #0a1020 60%, #080c14 100%)' }}>

      {/* ── Left: Branding ──────────────────────────────────────────────── */}
      <div className="hidden lg:flex flex-col justify-between w-[520px] shrink-0 p-12 relative overflow-hidden"
           style={{ borderRight: '1px solid rgba(255,255,255,0.05)' }}>
        {/* Background glow */}
        <div className="absolute top-1/3 left-1/4 w-96 h-96 rounded-full pointer-events-none"
             style={{ background: 'radial-gradient(ellipse, rgba(37,99,235,0.2) 0%, transparent 70%)', filter: 'blur(60px)' }}/>

        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center shadow-xl shadow-blue-600/40">
            <span className="text-white font-bold text-lg">T</span>
          </div>
          <span className="text-white font-bold text-xl tracking-tight">TalentLens</span>
        </Link>

        {/* Center content */}
        <div className="relative z-10">
          <h2 className="text-4xl font-bold text-white leading-tight mb-4">
            Объективная оценка<br/>
            <span className="gradient-text">кандидатов</span>
          </h2>
          <p className="text-white/40 text-base leading-relaxed mb-8">
            Психометрические тесты, мгновенный Radar-отчёт и защита от списывания — всё в одном.
          </p>

          {/* Feature list */}
          <div className="space-y-3">
            {[
              '63 вопроса, 16 компетенций',
              'Мгновенный отчёт после теста',
              'Red Flag индикаторы поведения',
              'Русский, Узбекский, Английский',
            ].map((f) => (
              <div key={f} className="flex items-center gap-3 text-sm text-white/50">
                <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-blue-400 text-xs"
                     style={{ background: 'rgba(37,99,235,0.2)' }}>✓</div>
                {f}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom quote */}
        <div className="relative z-10 p-5 rounded-2xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <p className="text-white/50 text-sm italic leading-relaxed mb-3">
            «Первая HR-платформа в Узбекистане с психометрической оценкой и антифрод-системой.»
          </p>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-violet-600"/>
            <div>
              <div className="text-white/60 text-xs font-medium">TalentLens Team</div>
              <div className="text-white/25 text-[10px]">2026</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right: Form ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-sm"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/30">
              <span className="text-white font-bold">T</span>
            </div>
            <span className="text-white font-bold text-xl">TalentLens</span>
          </div>

          <div className="rounded-2xl p-8" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <h1 className="text-xl font-bold text-white mb-1">
              {mode === 'login' ? 'Добро пожаловать' : 'Создать аккаунт'}
            </h1>
            <p className="text-white/35 text-sm mb-6">
              {mode === 'login' ? 'Войдите в свой аккаунт' : 'Регистрация займёт минуту'}
            </p>

            {/* OAuth (scaffolded) */}
            <div className="space-y-2 mb-5">
              <button
                onClick={() => setError('Для Google OAuth нужны Google Cloud credentials')}
                className="w-full flex items-center gap-3 py-2.5 px-4 rounded-xl text-sm text-white/60 hover:text-white/90 transition-all"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Продолжить через Google
              </button>
              <button
                onClick={() => setError('Для Apple Sign In нужен Apple Developer Account')}
                className="w-full flex items-center gap-3 py-2.5 px-4 rounded-xl text-sm text-white/60 hover:text-white/90 transition-all"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0 fill-white/80">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
                Продолжить через Apple
              </button>
            </div>

            <div className="flex items-center gap-3 mb-5">
              <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.07)' }}/>
              <span className="text-white/20 text-xs">или</span>
              <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.07)' }}/>
            </div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  className="rounded-xl px-4 py-3 text-sm text-red-400"
                  style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3">
              <AnimatePresence>
                {mode === 'register' && (
                  <motion.div
                    key="reg"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-3 overflow-hidden"
                  >
                    <input type="text" placeholder="Ваше имя" value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className={inputCls} style={inputStyle}/>
                    <input type="text" placeholder="Название компании" required value={form.companyName}
                      onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                      className={inputCls} style={inputStyle}/>
                  </motion.div>
                )}
              </AnimatePresence>

              <input type="email" placeholder="Email" required value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className={inputCls} style={inputStyle}/>
              <input type="password" placeholder="Пароль" required minLength={8} value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className={inputCls} style={inputStyle}/>

              <motion.button
                type="submit"
                disabled={loading}
                whileTap={{ scale: 0.98 }}
                className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', boxShadow: '0 4px 24px rgba(37,99,235,0.35)' }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                    </svg>
                    Загрузка...
                  </span>
                ) : mode === 'login' ? 'Войти в аккаунт' : 'Создать аккаунт'}
              </motion.button>
            </form>

            <p className="mt-4 text-center text-sm text-white/25">
              {mode === 'login' ? 'Нет аккаунта?' : 'Уже есть аккаунт?'}{' '}
              <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
                className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
                {mode === 'login' ? 'Зарегистрироваться' : 'Войти'}
              </button>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
