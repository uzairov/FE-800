'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

type Mode = 'login' | 'register';

const slide = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
  exit:    { opacity: 0, y: -8, transition: { duration: 0.15 } },
};

export default function LoginPage() {
  const router  = useRouter();
  const [mode, setMode]       = useState<Mode>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [form, setForm]       = useState({ email: '', password: '', name: '', companyName: '' });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
    const body = mode === 'login' ? { email: form.email, password: form.password } : form;

    try {
      const res  = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const json = await res.json();

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

  function field(id: keyof typeof form, type: string, placeholder: string, required = true) {
    return (
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        required={required}
        autoComplete={type === 'password' ? 'current-password' : 'email'}
        value={form[id]}
        onChange={(e) => setForm({ ...form, [id]: e.target.value })}
        className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg)] px-4 py-3 text-sm text-[var(--text)] placeholder:text-[var(--text-faint)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
      />
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] p-4">
      {/* Decorative blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-400/10 dark:bg-blue-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-400/10 dark:bg-indigo-600/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="relative w-full max-w-sm"
      >
        <div className="bg-[var(--surface)] border border-[var(--border-strong)] rounded-2xl shadow-xl shadow-black/5 dark:shadow-black/30 p-8">
          {/* Logo */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-600 rounded-2xl mb-3 shadow-lg shadow-blue-600/30">
              <span className="text-white text-xl font-bold">T</span>
            </div>
            <h1 className="text-xl font-bold text-[var(--text)]">TalentLens</h1>
            <p className="text-sm text-[var(--text-muted)] mt-0.5">
              {mode === 'login' ? 'Войдите в систему' : 'Создайте аккаунт'}
            </p>
          </div>

          {/* OAuth buttons */}
          <div className="space-y-2 mb-5">
            <button
              type="button"
              onClick={() => setError('OAuth требует настройки Google credentials')}
              className="w-full flex items-center gap-3 border border-[var(--border-strong)] rounded-xl px-4 py-2.5 text-sm text-[var(--text)] hover:bg-[var(--bg)] transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Продолжить через Google
            </button>

            <button
              type="button"
              onClick={() => setError('OAuth требует настройки Apple credentials')}
              className="w-full flex items-center gap-3 border border-[var(--border-strong)] rounded-xl px-4 py-2.5 text-sm text-[var(--text)] hover:bg-[var(--bg)] transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0 fill-current">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
              </svg>
              Продолжить через Apple
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-[var(--border-strong)]" />
            <span className="text-xs text-[var(--text-faint)]">или с паролем</span>
            <div className="flex-1 h-px bg-[var(--border-strong)]" />
          </div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <AnimatePresence mode="wait">
              {mode === 'register' && (
                <motion.div key="register-fields" {...slide} className="space-y-3">
                  {field('name',        'text',  'Ваше имя')}
                  {field('companyName', 'text',  'Название компании')}
                </motion.div>
              )}
            </AnimatePresence>

            {field('email',    'email',    'Email')}
            {field('password', 'password', 'Пароль (минимум 8 символов)')}

            <motion.button
              type="submit"
              disabled={loading}
              whileTap={{ scale: 0.98 }}
              className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold py-3 transition-colors disabled:opacity-50 shadow-lg shadow-blue-600/25 mt-1"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                  </svg>
                  Загрузка...
                </span>
              ) : mode === 'login' ? 'Войти' : 'Зарегистрироваться'}
            </motion.button>
          </form>

          {/* Mode switch */}
          <p className="mt-4 text-center text-sm text-[var(--text-muted)]">
            {mode === 'login' ? 'Нет аккаунта?' : 'Уже есть аккаунт?'}{' '}
            <button
              onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              {mode === 'login' ? 'Зарегистрироваться' : 'Войти'}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
