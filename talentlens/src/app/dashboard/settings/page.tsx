'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { apiFetch } from '@/lib/client-fetch';

type Lang = 'ru' | 'uz' | 'en';

const LANGS: { value: Lang; label: string; flag: string }[] = [
  { value: 'ru', label: 'Русский',   flag: '🇷🇺' },
  { value: 'uz', label: "O'zbek",    flag: '🇺🇿' },
  { value: 'en', label: 'English',   flag: '🇬🇧' },
];

const THEMES = [
  { value: 'light',  label: 'Светлая', icon: '☀️' },
  { value: 'dark',   label: 'Тёмная',  icon: '🌙' },
  { value: 'system', label: 'Системная', icon: '💻' },
];

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [lang, setLang]     = useState<Lang>('ru');
  const [name, setName]     = useState('');
  const [email, setEmail]   = useState('');
  const [saved, setSaved]   = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const token = localStorage.getItem('accessToken');
    if (token) {
      try {
        const p = JSON.parse(atob(token.split('.')[1]));
        setEmail(p.email ?? '');
      } catch {}
    }
    const storedLang = localStorage.getItem('uiLang') as Lang | null;
    if (storedLang) setLang(storedLang);
  }, []);

  function saveLang(l: Lang) {
    setLang(l);
    localStorage.setItem('uiLang', l);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    // Save name via API (future)
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="p-8 max-w-2xl page-enter">
      <h1 className="text-2xl font-bold text-[var(--text)] mb-6">Настройки</h1>

      {/* ── Profile ──────────────────────────────────────────────────── */}
      <section className="bg-[var(--surface)] border border-[var(--border-strong)] rounded-2xl p-6 mb-5">
        <h2 className="text-sm font-semibold text-[var(--text)] mb-4">Профиль</h2>
        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1">Email</label>
            <input
              value={email}
              disabled
              className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--bg)] px-4 py-2 text-sm text-[var(--text-muted)] cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1">Имя</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Введите имя"
              className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-4 py-2 text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
          >
            {saved ? '✓ Сохранено' : 'Сохранить'}
          </button>
        </form>
      </section>

      {/* ── Theme ────────────────────────────────────────────────────── */}
      {mounted && (
        <section className="bg-[var(--surface)] border border-[var(--border-strong)] rounded-2xl p-6 mb-5">
          <h2 className="text-sm font-semibold text-[var(--text)] mb-4">Тема интерфейса</h2>
          <div className="grid grid-cols-3 gap-3">
            {THEMES.map(({ value, label, icon }) => (
              <button
                key={value}
                onClick={() => setTheme(value)}
                className={`flex flex-col items-center gap-2 rounded-xl border-2 py-4 text-sm font-medium transition-all ${
                  theme === value
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600'
                    : 'border-[var(--border-strong)] text-[var(--text-muted)] hover:border-[var(--text-faint)]'
                }`}
              >
                <span className="text-2xl">{icon}</span>
                {label}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ── Language ─────────────────────────────────────────────────── */}
      <section className="bg-[var(--surface)] border border-[var(--border-strong)] rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-[var(--text)] mb-1">Язык интерфейса</h2>
        <p className="text-xs text-[var(--text-muted)] mb-4">
          Язык панели управления. Язык теста выбирает кандидат при прохождении.
        </p>
        <div className="space-y-2">
          {LANGS.map(({ value, label, flag }) => (
            <button
              key={value}
              onClick={() => saveLang(value)}
              className={`w-full flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-sm text-left transition-all ${
                lang === value
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-medium'
                  : 'border-[var(--border-strong)] text-[var(--text-muted)] hover:border-[var(--text-faint)]'
              }`}
            >
              <span className="text-xl">{flag}</span>
              <span>{label}</span>
              {lang === value && <span className="ml-auto text-blue-500 text-xs">✓ Активный</span>}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
