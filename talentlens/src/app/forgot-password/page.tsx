'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

export default function ForgotPasswordPage() {
  const [email,   setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await fetch('/api/auth/forgot-password', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email }),
      });
      setSent(true);
    } catch {
      setError('Ошибка сети. Попробуйте ещё раз.');
    } finally {
      setLoading(false);
    }
  }

  const inputCls   = 'w-full rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/60 transition-all';
  const inputStyle = { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' };

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
         style={{ background: 'linear-gradient(160deg, #060a12 0%, #0a1020 60%, #070b14 100%)' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="rounded-2xl p-8" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <Link href="/login" className="flex items-center gap-2 text-white/40 hover:text-white/70 text-sm mb-6 transition-colors">
            ← Назад к входу
          </Link>

          <AnimatePresence mode="wait">
            {sent ? (
              <motion.div key="sent" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="text-4xl mb-4">📬</div>
                <h1 className="text-xl font-bold text-white mb-2">Письмо отправлено</h1>
                <p className="text-white/40 text-sm leading-relaxed">
                  Если аккаунт с адресом <strong className="text-white/60">{email}</strong> существует, мы отправили ссылку для сброса пароля. Проверьте папку «Спам», если письмо не пришло.
                </p>
                <Link href="/login"
                  className="mt-6 block text-center py-3 rounded-xl text-sm font-semibold text-white transition-all"
                  style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}>
                  Вернуться ко входу
                </Link>
              </motion.div>
            ) : (
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <h1 className="text-xl font-bold text-white mb-1">Забыли пароль?</h1>
                <p className="text-white/40 text-sm mb-6">Введите email — пришлём ссылку для сброса.</p>

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
                  <input type="email" placeholder="Email" required autoComplete="email"
                    value={email} onChange={(e) => setEmail(e.target.value)}
                    className={inputCls} style={inputStyle} />
                  <motion.button
                    type="submit" disabled={loading}
                    whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.97 }}
                    className="w-full py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}>
                    {loading ? 'Отправка...' : 'Отправить ссылку'}
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
