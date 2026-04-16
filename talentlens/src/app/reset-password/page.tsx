'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

export default function ResetPasswordWrapper() {
  return <Suspense><ResetPasswordPage /></Suspense>;
}

function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const token        = searchParams.get('token') ?? '';

  const [password,  setPassword]  = useState('');
  const [password2, setPassword2] = useState('');
  const [loading,   setLoading]   = useState(false);
  const [done,      setDone]      = useState(false);
  const [error,     setError]     = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== password2) { setError('Пароли не совпадают'); return; }
    setLoading(true);
    setError('');
    try {
      const res  = await fetch('/api/auth/reset-password', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ token, password }),
      });
      const json = await res.json();
      if (!json.success) { setError(json.error ?? 'Ошибка'); return; }
      setDone(true);
      setTimeout(() => router.push('/login'), 2500);
    } catch {
      setError('Ошибка сети.');
    } finally {
      setLoading(false);
    }
  }

  const inputCls   = 'w-full rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/60 transition-all';
  const inputStyle = { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4"
           style={{ background: 'linear-gradient(160deg, #060a12, #0a1020)' }}>
        <div className="text-center">
          <p className="text-white/50 mb-4">Неверная ссылка для сброса пароля.</p>
          <Link href="/forgot-password" className="text-blue-400 hover:text-blue-300">Запросить новую →</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
         style={{ background: 'linear-gradient(160deg, #060a12 0%, #0a1020 60%, #070b14 100%)' }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <div className="rounded-2xl p-8" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <AnimatePresence mode="wait">
            {done ? (
              <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
                <div className="text-4xl mb-4">✅</div>
                <h1 className="text-xl font-bold text-white mb-2">Пароль изменён</h1>
                <p className="text-white/40 text-sm">Перенаправляем на страницу входа...</p>
              </motion.div>
            ) : (
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <h1 className="text-xl font-bold text-white mb-1">Новый пароль</h1>
                <p className="text-white/40 text-sm mb-6">Введите новый пароль для вашего аккаунта.</p>

                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                      exit={{ opacity: 0, height: 0 }}
                      className="rounded-xl px-4 py-3 text-sm text-red-400"
                      style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                <form onSubmit={handleSubmit} className="space-y-3">
                  <input type="password" placeholder="Новый пароль (мин. 8 символов)" required minLength={8}
                    autoComplete="new-password" value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={inputCls} style={inputStyle} />
                  <input type="password" placeholder="Повторите пароль" required minLength={8}
                    autoComplete="new-password" value={password2}
                    onChange={(e) => setPassword2(e.target.value)}
                    className={inputCls} style={inputStyle} />
                  <motion.button
                    type="submit" disabled={loading}
                    whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.97 }}
                    className="w-full py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}>
                    {loading ? 'Сохранение...' : 'Сохранить пароль'}
                  </motion.button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
