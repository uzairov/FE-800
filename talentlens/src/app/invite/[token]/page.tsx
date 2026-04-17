'use client';

import { useEffect, useState, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

interface InviteInfo {
  email:       string;
  companyName: string;
  role:        string;
  expiresAt:   string;
  userExists:  boolean;
}

const ROLE_LABEL: Record<string, string> = {
  HR:     'HR-менеджер',
  VIEWER: 'Наблюдатель',
  ADMIN:  'Администратор',
};

function InvitePage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const token  = params.token;

  const [info,     setInfo]     = useState<InviteInfo | null>(null);
  const [loadErr,  setLoadErr]  = useState('');
  const [loading,  setLoading]  = useState(true);
  const [name,     setName]     = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error,    setError]    = useState('');
  const [done,     setDone]     = useState(false);

  useEffect(() => {
    fetch(`/api/team/accept?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setInfo(json.data);
        else setLoadErr(json.error ?? 'Ошибка загрузки');
      })
      .catch(() => setLoadErr('Ошибка сети'))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const res  = await fetch('/api/team/accept', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, name: name || undefined, password }),
      });
      const json = await res.json();

      if (!json.success) { setError(json.error ?? 'Ошибка'); return; }

      // Store tokens and redirect to dashboard
      sessionStorage.setItem('accessToken',  json.data.accessToken);
      sessionStorage.setItem('refreshToken', json.data.refreshToken);
      setDone(true);
      setTimeout(() => router.push('/dashboard'), 1500);
    } catch {
      setError('Ошибка сети');
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls = `w-full rounded-xl px-4 py-3 text-sm bg-[var(--surface)] border border-[var(--border-strong)] text-[var(--text)] placeholder:text-[var(--text-faint)] focus:outline-none focus:ring-2 focus:ring-blue-500/60 transition-all`;

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
         style={{ background: 'linear-gradient(160deg, #060a12 0%, #0a1020 60%, #070b14 100%)' }}>

      {/* Logo */}
      <div className="absolute top-6 left-8">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/30">
            <span className="text-white font-bold text-sm">A</span>
          </div>
          <span className="text-white font-bold text-base">Aptio</span>
        </Link>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md"
      >
        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center gap-3 text-white/50 text-sm">
            <motion.div className="w-5 h-5 rounded-full border-2 border-blue-500/30 border-t-blue-500"
              animate={{ rotate: 360 }} transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }} />
            Загрузка приглашения...
          </div>
        )}

        {/* Error loading */}
        {!loading && loadErr && (
          <div className="rounded-2xl p-8 text-center"
               style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="text-4xl mb-4">⚠️</div>
            <h1 className="text-lg font-semibold text-white mb-2">Приглашение недействительно</h1>
            <p className="text-sm text-white/40 mb-6">{loadErr}</p>
            <Link href="/login" className="text-blue-400 hover:text-blue-300 text-sm transition-colors">
              ← Перейти на страницу входа
            </Link>
          </div>
        )}

        {/* Success */}
        {done && (
          <div className="rounded-2xl p-8 text-center"
               style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)' }}>
            <div className="text-4xl mb-4">✅</div>
            <h1 className="text-lg font-semibold text-white mb-2">Добро пожаловать!</h1>
            <p className="text-sm text-emerald-400">Переход в дашборд...</p>
          </div>
        )}

        {/* Invite form */}
        {!loading && !loadErr && !done && info && (
          <div className="rounded-2xl overflow-hidden"
               style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>

            {/* Header */}
            <div className="px-8 pt-8 pb-6 text-center"
                 style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="w-14 h-14 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-2xl mx-auto mb-4">
                🤝
              </div>
              <h1 className="text-xl font-bold text-white mb-1">Вас пригласили в команду</h1>
              <p className="text-sm text-white/50">
                Компания <span className="text-white/80 font-medium">{info.companyName}</span> приглашает вас
                как <span className="text-blue-400 font-medium">{ROLE_LABEL[info.role] ?? info.role}</span>
              </p>
              <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs text-white/50"
                   style={{ background: 'rgba(255,255,255,0.05)' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"/>
                {info.email}
              </div>
            </div>

            {/* Form */}
            <div className="px-8 py-6">
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="rounded-xl px-4 py-3 text-sm text-red-400 mb-4"
                    style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}
                  >{error}</motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={handleSubmit} className="space-y-3">
                {!info.userExists && (
                  <div>
                    <label className="block text-xs text-white/40 mb-1.5">Ваше имя</label>
                    <input
                      type="text" value={name} onChange={(e) => setName(e.target.value)}
                      placeholder="Иван Иванов"
                      className={inputCls}
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs text-white/40 mb-1.5">
                    {info.userExists ? 'Пароль от вашего аккаунта' : 'Придумайте пароль'}
                  </label>
                  <input
                    type="password" required minLength={8}
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder="Минимум 8 символов"
                    className={inputCls}
                  />
                </div>

                {info.userExists && (
                  <p className="text-xs text-white/30 -mt-1">
                    Аккаунт с адресом <span className="text-white/50">{info.email}</span> уже существует.
                    Введите пароль для подтверждения.
                  </p>
                )}

                <motion.button
                  type="submit" disabled={submitting}
                  whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                  className="w-full py-3 rounded-xl text-sm font-semibold text-white mt-2 disabled:opacity-50 transition-all"
                  style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', boxShadow: '0 4px 24px rgba(37,99,235,0.35)' }}
                >
                  {submitting ? 'Подождите...' : info.userExists ? 'Принять приглашение' : 'Создать аккаунт и принять'}
                </motion.button>
              </form>

              <p className="mt-4 text-center text-xs text-white/25">
                Приглашение действительно до{' '}
                {new Date(info.expiresAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
              </p>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

export default function InvitePageWrapper() {
  return (
    <Suspense>
      <InvitePage />
    </Suspense>
  );
}
