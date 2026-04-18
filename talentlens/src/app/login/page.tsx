'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

type Mode = 'login' | 'register';

// ── Particle dot (floating ambient) ──────────────────────────────────────────
function Particle({ x, y, size, delay, duration }: {
  x: number; y: number; size: number; delay: number; duration: number;
}) {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{ left: `${x}%`, top: `${y}%`, width: size, height: size,
               background: 'rgba(99,179,237,0.3)', filter: 'blur(0.5px)' }}
      animate={{ y: [0, -18, 0], opacity: [0.1, 0.5, 0.1], scale: [1, 1.3, 1] }}
      transition={{ duration, delay, repeat: Infinity, ease: 'easeInOut' }}
    />
  );
}

// ── Animated "Aptio" logo text ────────────────────────────────────────────────
const LETTERS = ['A', 'p', 't', 'i', 'o'];

function AnimatedLogo({ size = 'lg' }: { size?: 'lg' | 'sm' }) {
  const cls = size === 'lg'
    ? 'text-4xl font-black tracking-tight text-white'
    : 'text-xl font-bold tracking-tight text-white';

  return (
    <span className={`inline-flex items-end ${cls}`} aria-label="Aptio">
      {LETTERS.map((letter, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 14, filter: 'blur(6px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.55, delay: 0.25 + i * 0.1, ease: 'easeOut' }}
          className="inline-block"
          style={{ lineHeight: 1 }}
        >
          {letter === 'A'
            ? (
              <motion.span
                className="inline-block"
                style={{ color: '#60a5fa' }}
                animate={{ textShadow: ['0 0 0px #3b82f6', '0 0 18px #3b82f6', '0 0 0px #3b82f6'] }}
                transition={{ duration: 3, delay: 1.2, repeat: Infinity, ease: 'easeInOut' }}
              >{letter}</motion.span>
            )
            : letter}
        </motion.span>
      ))}
    </span>
  );
}

// ── Pulsing icon ─────────────────────────────────────────────────────────────
function LogoIcon({ size = 40 }: { size?: number }) {
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <motion.div
        className="absolute inset-0"
        style={{ background: 'rgba(37,99,235,0.3)', borderRadius: size * 0.28 }}
        animate={{ scale: [1, 1.55, 1], opacity: [0.5, 0, 0.5] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeOut' }}
      />
      <motion.div
        className="absolute inset-0"
        style={{ background: 'rgba(37,99,235,0.2)', borderRadius: size * 0.28 }}
        animate={{ scale: [1, 1.85, 1], opacity: [0.4, 0, 0.4] }}
        transition={{ duration: 2.4, delay: 0.8, repeat: Infinity, ease: 'easeOut' }}
      />
      <motion.div
        className="relative flex items-center justify-center text-white font-bold"
        style={{
          width: size, height: size, borderRadius: size * 0.28,
          background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
          fontSize: size * 0.36,
        }}
        animate={{ boxShadow: ['0 4px 24px rgba(59,130,246,0.5)', '0 4px 40px rgba(139,92,246,0.7)', '0 4px 24px rgba(59,130,246,0.5)'] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
      >
        A
      </motion.div>
    </div>
  );
}

// ── Orbiting dot ─────────────────────────────────────────────────────────────
function OrbitDot({ radius, angle, delay }: { radius: number; angle: number; delay: number }) {
  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(96,165,250,0.7)',
               top: '50%', left: '50%', marginTop: -2.5, marginLeft: -2.5 }}
      animate={{
        x: [Math.cos(angle) * radius, Math.cos(angle + Math.PI) * radius, Math.cos(angle + 2 * Math.PI) * radius],
        y: [Math.sin(angle) * radius, Math.sin(angle + Math.PI) * radius, Math.sin(angle + 2 * Math.PI) * radius],
        opacity: [0.8, 0.2, 0.8],
      }}
      transition={{ duration: 4, delay, repeat: Infinity, ease: 'linear' }}
    />
  );
}

const OAUTH_ERRORS: Record<string, string> = {
  invalid_state:          'Ошибка безопасности. Попробуйте снова.',
  google_not_configured:  'Google OAuth не настроен.',
  oauth_failed:           'Ошибка входа через Google.',
  account_blocked:        'Аккаунт заблокирован.',
  token_exchange_failed:  'Ошибка получения токена Google.',
  invalid_token:          'Ссылка недействительна. Запросите новую.',
  token_expired:          'Ссылка истекла. Запросите новую.',
};

const AUTH_MESSAGES: Record<string, string> = {
  verify_email: '📬 Проверьте почту — мы отправили ссылку для подтверждения.',
};

// ── Main page ─────────────────────────────────────────────────────────────────
export default function LoginPageWrapper() {
  return (
    <Suspense>
      <LoginPage />
    </Suspense>
  );
}

function LoginPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const [mode,       setMode]       = useState<Mode>('login');
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');
  const [info,       setInfo]       = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', name: '', companyName: '' });
  const [particles, setParticles] = useState<Array<{ x: number; y: number; size: number; delay: number; duration: number }>>([]);

  // Handle Google OAuth callback — tokens arrive as ?at=...&rt=...
  // Handle OAuth error — arrives as ?error=...
  useEffect(() => {
    const at  = searchParams.get('at');
    const rt  = searchParams.get('rt');
    const oauthErr = searchParams.get('error');

    if (at && rt) {
      localStorage.setItem('accessToken',  at);
      localStorage.setItem('refreshToken', rt);
      router.replace('/dashboard');
      return;
    }
    if (oauthErr) {
      setError(OAUTH_ERRORS[oauthErr] ?? `Ошибка: ${oauthErr}`);
    }
    const msg = searchParams.get('message');
    if (msg && AUTH_MESSAGES[msg]) {
      setInfo(AUTH_MESSAGES[msg]);
    }
  }, [searchParams, router]);

  // Generate particles client-side only to avoid hydration mismatch
  useEffect(() => {
    setParticles(
      Array.from({ length: 18 }, () => ({
        x:        Math.random() * 100,
        y:        Math.random() * 100,
        size:     Math.random() * 3 + 1.5,
        delay:    Math.random() * 4,
        duration: 4 + Math.random() * 5,
      }))
    );
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const body     = mode === 'login'
        ? { email: form.email, password: form.password, rememberMe }
        : form;
      const res      = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const json     = await res.json();
      if (!json.success) { setError(json.error ?? 'Что-то пошло не так'); return; }

      // Store tokens: localStorage (persist) or sessionStorage (tab-only)
      const store = rememberMe ? localStorage : sessionStorage;
      store.setItem('accessToken', json.data.accessToken);
      // refreshToken in body only when rememberMe=false (cookie handles rememberMe=true)
      if (json.data.refreshToken) {
        store.setItem('refreshToken', json.data.refreshToken);
      }

      if (mode === 'register') {
        if (json.data.emailSent) {
          // Email service configured → ask user to verify
          setMode('login');
          setInfo('📬 Письмо с подтверждением отправлено на ' + form.email);
          setForm({ email: form.email, password: '', name: '', companyName: '' });
        } else {
          // No email service → go straight to onboarding
          router.push('/onboarding');
        }
      } else {
        // Login: go to onboarding if not done, else dashboard
        const onboardingDone = json.data.user?.onboardingDone ?? true;
        router.push(onboardingDone ? '/dashboard' : '/onboarding');
      }
    } catch {
      setError('Ошибка сети. Проверьте подключение.');
    } finally {
      setLoading(false);
    }
  }

  const inputCls   = `w-full rounded-xl px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all`;
  const inputStyle = { background: '#f8fafc', border: '1px solid #e2e8f0' };

  const FEATURES = [
    '132+ вопроса, 20+ компетенций',
    'Мгновенный Radar-отчёт после теста',
    'Red Flag индикаторы поведения',
    'Русский, Узбекский, Английский',
  ];

  return (
    /* ── Page shell: deep navy background ──────────────────────────────── */
    <div className="min-h-screen relative"
         style={{ background: 'linear-gradient(160deg, #0A0E27 0%, #1A1F3A 55%, #0A0E27 100%)' }}>

      {/* ── Background animation layer (z-0) ─────────────────────────────── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
        {/* Ambient particles */}
        {particles.map((p, i) => <Particle key={i} {...p} />)}

        {/* Blue glow — left side */}
        <motion.div
          className="absolute"
          style={{
            width: 700, height: 700, borderRadius: '50%',
            top: '50%', left: '26%', transform: 'translate(-50%, -50%)',
            background: 'radial-gradient(ellipse, rgba(59,130,246,0.16) 0%, transparent 70%)',
            filter: 'blur(60px)',
          }}
          animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />
        {/* Violet accent glow — bottom right */}
        <motion.div
          className="absolute"
          style={{
            width: 450, height: 450, borderRadius: '50%',
            bottom: '10%', right: '5%',
            background: 'radial-gradient(ellipse, rgba(139,92,246,0.13) 0%, transparent 70%)',
            filter: 'blur(70px)',
          }}
          animate={{ x: [0, -20, 0], y: [0, 15, 0], opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {/* ── Content layer (z-10) ─────────────────────────────────────────── */}
      <div className="relative min-h-screen flex overflow-y-auto" style={{ zIndex: 10 }}>

        {/* ── Left: Branding (desktop only) ──────────────────────────────── */}
        <div className="hidden lg:flex flex-col justify-between w-[520px] shrink-0 p-12"
             style={{ borderRight: '1px solid rgba(255,255,255,0.05)' }}>

          {/* Logo */}
          <Link href="/" className="flex items-center gap-4">
            <div className="relative">
              <LogoIcon size={44} />
              <OrbitDot radius={30} angle={0}             delay={0}   />
              <OrbitDot radius={30} angle={Math.PI * 0.7} delay={0.6} />
            </div>
            <AnimatedLogo size="lg" />
          </Link>

          {/* Center content */}
          <div className="space-y-6">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.8, ease: 'easeOut' }}
              className="text-4xl font-bold text-white leading-tight"
            >
              Объективная оценка<br/>
              <motion.span
                className="inline-block"
                animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
                transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
                style={{
                  backgroundImage: 'linear-gradient(135deg, #60a5fa, #a78bfa, #34d399, #60a5fa)',
                  backgroundSize: '200% auto',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                кандидатов
              </motion.span>
            </motion.h2>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 1.1 }}
              className="text-white/40 text-base leading-relaxed"
            >
              Психометрические тесты, мгновенный Radar-отчёт и защита от списывания — всё в одном.
            </motion.p>

            {/* Feature list */}
            <div className="space-y-3">
              {FEATURES.map((f, i) => (
                <motion.div
                  key={f}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 1.2 + i * 0.12, ease: 'easeOut' }}
                  className="flex items-center gap-3 text-sm text-white/50"
                >
                  <motion.div
                    className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-blue-400 text-xs"
                    style={{ background: 'rgba(37,99,235,0.2)' }}
                    animate={{ boxShadow: ['0 0 0px rgba(37,99,235,0)', '0 0 8px rgba(37,99,235,0.6)', '0 0 0px rgba(37,99,235,0)'] }}
                    transition={{ duration: 2, delay: 1.5 + i * 0.2, repeat: Infinity, ease: 'easeInOut' }}
                  >✓</motion.div>
                  {f}
                </motion.div>
              ))}
            </div>
          </div>

          {/* HR illustration — radar chart + candidate cards */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 1.4, ease: 'easeOut' }}
            className="relative flex items-center justify-center py-2"
          >
            <svg width="260" height="160" viewBox="0 0 260 160" fill="none" className="opacity-90">
              {/* Radar chart base */}
              <g transform="translate(70, 80)">
                {[60, 42, 24].map((r, i) => (
                  <polygon key={i}
                    points={[0,1,2,3,4,5].map(k => {
                      const a = (k * Math.PI * 2) / 6 - Math.PI / 2;
                      return `${Math.cos(a)*r},${Math.sin(a)*r}`;
                    }).join(' ')}
                    fill="none"
                    stroke="rgba(37,99,235,0.2)"
                    strokeWidth="1"
                  />
                ))}
                {[0,1,2,3,4,5].map(k => {
                  const a = (k * Math.PI * 2) / 6 - Math.PI / 2;
                  return <line key={k} x1="0" y1="0" x2={Math.cos(a)*60} y2={Math.sin(a)*60}
                    stroke="rgba(37,99,235,0.15)" strokeWidth="1"/>;
                })}
                {/* Filled radar area */}
                <polygon
                  points={[
                    [0, 52], [1, 38], [2, 48], [3, 44], [4, 56], [5, 40],
                  ].map(([k, r]) => {
                    const a = ((k as number) * Math.PI * 2) / 6 - Math.PI / 2;
                    return `${Math.cos(a)*(r as number)},${Math.sin(a)*(r as number)}`;
                  }).join(' ')}
                  fill="rgba(37,99,235,0.18)"
                  stroke="rgba(96,165,250,0.7)"
                  strokeWidth="1.5"
                />
                {/* Dots on vertices */}
                {[[0,52],[1,38],[2,48],[3,44],[4,56],[5,40]].map(([k, r], i) => {
                  const a = (k * Math.PI * 2) / 6 - Math.PI / 2;
                  return <circle key={i} cx={Math.cos(a)*r} cy={Math.sin(a)*r} r="3"
                    fill="#60a5fa" opacity="0.9"/>;
                })}
                {/* Labels */}
                {['Лидер', 'Стресс', 'IQ', 'EQ', 'Честность', 'Результат'].map((label, k) => {
                  const a = (k * Math.PI * 2) / 6 - Math.PI / 2;
                  const d = 74;
                  return (
                    <text key={k}
                      x={Math.cos(a)*d} y={Math.sin(a)*d + 4}
                      textAnchor="middle"
                      fontSize="7"
                      fill="rgba(255,255,255,0.35)"
                      fontFamily="system-ui"
                    >{label}</text>
                  );
                })}
              </g>

              {/* Candidate cards on the right */}
              {[
                { y: 18,  name: 'Алия Н.',   score: 87, color: '#10b981' },
                { y: 58,  name: 'Руслан К.',  score: 74, color: '#3b82f6' },
                { y: 98,  name: 'Диана М.',   score: 91, color: '#10b981' },
                { y: 138, name: 'Тимур Р.',   score: 62, color: '#f59e0b' },
              ].map(({ y, name, score, color }) => (
                <g key={name} transform={`translate(148, ${y})`}>
                  <rect x="0" y="0" width="100" height="30" rx="8"
                    fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.08)" strokeWidth="1"/>
                  <circle cx="15" cy="15" r="9"
                    fill={`${color}22`} stroke={color} strokeWidth="1"/>
                  <text x="15" y="19" textAnchor="middle" fontSize="8"
                    fill={color} fontFamily="system-ui" fontWeight="600">
                    {name.charAt(0)}
                  </text>
                  <text x="28" y="12" fontSize="8" fill="rgba(255,255,255,0.6)" fontFamily="system-ui">{name}</text>
                  <text x="28" y="23" fontSize="7" fill="rgba(255,255,255,0.3)" fontFamily="system-ui">Оценка</text>
                  <text x="86" y="19" textAnchor="end" fontSize="10"
                    fill={color} fontFamily="system-ui" fontWeight="700">{score}</text>
                </g>
              ))}
            </svg>
          </motion.div>

          {/* Bottom quote */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.7, ease: 'easeOut' }}
            className="p-5 rounded-2xl"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <motion.div
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            >
              <p className="text-white/50 text-sm italic leading-relaxed mb-3">
                «Первая HR-платформа в Узбекистане с психометрической оценкой и антифрод-системой.»
              </p>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-violet-600"/>
                <div>
                  <div className="text-white/60 text-xs font-medium">Aptio Team</div>
                  <div className="text-white/25 text-[10px]">2026</div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* ── Right: Form ─────────────────────────────────────────────────── */}
        <div className="flex-1 flex items-start sm:items-center justify-center p-4 sm:p-6 py-10 sm:py-6">
          <div className="w-full max-w-sm">

            {/* Mobile logo */}
            <div className="lg:hidden flex items-center gap-3 mb-6 justify-center">
              <LogoIcon size={36} />
              <AnimatedLogo size="sm" />
            </div>

            {/* Form card — white */}
            <div className="rounded-2xl p-6 sm:p-8 bg-white shadow-2xl" style={{ boxShadow: '0 24px 60px rgba(10,14,39,0.5)' }}>
              <h1 className="text-xl font-bold text-gray-900 mb-1">
                {mode === 'login' ? 'Добро пожаловать' : 'Создать аккаунт'}
              </h1>
              <p className="text-gray-400 text-sm mb-6">
                {mode === 'login' ? 'Войдите в свой аккаунт' : 'Регистрация займёт минуту'}
              </p>

              {/* OAuth buttons */}
              <div className="space-y-2 mb-5">
                {/* Google — real OAuth redirect */}
                <motion.a
                  href="/api/auth/google"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full flex items-center gap-3 py-2.5 px-4 rounded-xl text-sm text-gray-600 hover:text-gray-900 transition-all"
                  style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Продолжить через Google
                </motion.a>
                {/* Apple — placeholder */}
                <motion.button
                  onClick={() => setError('Apple Sign In будет доступен в следующей версии.')}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full flex items-center gap-3 py-2.5 px-4 rounded-xl text-sm text-gray-600 hover:text-gray-900 transition-all"
                  style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0 fill-gray-700">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                  </svg>
                  Продолжить через Apple
                </motion.button>
              </div>

              <div className="flex items-center gap-3 mb-5">
                <div className="flex-1 h-px bg-gray-200"/>
                <span className="text-gray-400 text-xs">или</span>
                <div className="flex-1 h-px bg-gray-200"/>
              </div>

              {/* Info banner */}
              <AnimatePresence>
                {info && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    className="rounded-xl px-4 py-3 text-sm text-blue-700 overflow-hidden"
                    style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}
                  >
                    {info}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Error banner */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    className="rounded-xl px-4 py-3 text-sm text-red-600 overflow-hidden"
                    style={{ background: '#fef2f2', border: '1px solid #fecaca' }}
                  >
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Login / Register form */}
              <form onSubmit={handleSubmit} className="space-y-3">
                <AnimatePresence>
                  {mode === 'register' && (
                    <motion.div
                      key="reg-fields"
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

                <input type="email" placeholder="Email" required autoComplete="email" value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className={inputCls} style={inputStyle}/>
                <div>
                  <input type="password" placeholder="Пароль (мин. 8 символов)" required minLength={8}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className={inputCls} style={inputStyle}/>
                  {mode === 'login' && (
                    <div className="text-right mt-1.5">
                      <Link href="/forgot-password" className="text-xs text-blue-500/80 hover:text-blue-600 transition-colors">
                        Забыли пароль?
                      </Link>
                    </div>
                  )}
                </div>

                {mode === 'login' && (
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <div
                      onClick={() => setRememberMe((v) => !v)}
                      className="w-4 h-4 rounded flex items-center justify-center shrink-0 transition-all"
                      style={{
                        background: rememberMe ? '#3B82F6' : '#f1f5f9',
                        border: `1px solid ${rememberMe ? '#3B82F6' : '#cbd5e1'}`,
                      }}
                    >
                      {rememberMe && (
                        <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                    <span className="text-sm text-gray-500">Запомнить меня</span>
                  </label>
                )}

                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: 1.01, boxShadow: '0 6px 32px rgba(59,130,246,0.5)' }}
                  whileTap={{ scale: 0.97 }}
                  className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50 mt-1"
                  style={{ background: 'linear-gradient(135deg,#3B82F6,#8B5CF6)', boxShadow: '0 4px 24px rgba(59,130,246,0.35)' }}
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

              <p className="mt-4 text-center text-sm text-gray-400">
                {mode === 'login' ? 'Нет аккаунта?' : 'Уже есть аккаунт?'}{' '}
                <button
                  onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
                  className="text-blue-600 hover:text-blue-500 font-medium transition-colors"
                >
                  {mode === 'login' ? 'Зарегистрироваться' : 'Войти'}
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
