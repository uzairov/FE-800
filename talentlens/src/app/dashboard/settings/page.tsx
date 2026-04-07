'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import { useLang } from '@/context/LangContext';
import { apiFetch } from '@/lib/client-fetch';
import type { Lang } from '@/lib/i18n';

const LANGS: { value: Lang; label: string; flag: string }[] = [
  { value: 'ru', label: 'Русский',  flag: '🇷🇺' },
  { value: 'uz', label: "O'zbek",   flag: '🇺🇿' },
  { value: 'en', label: 'English',  flag: '🇬🇧' },
];

type Tab = 'profile' | 'notifications' | 'integrations';

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { lang, setLang, t } = useLang();
  const [tab,     setTab]     = useState<Tab>('profile');
  const [name,    setName]    = useState('');
  const [email,   setEmail]   = useState('');
  const [saved,   setSaved]   = useState(false);
  const [mounted, setMounted] = useState(false);

  // Webhook state
  const [wh, setWh] = useState({ telegramBotToken: '', telegramChatId: '', slackWebhookUrl: '', onCompleted: true, onCreated: false });
  const [whSaving, setWhSaving] = useState(false);
  const [whSaved,  setWhSaved]  = useState(false);

  useEffect(() => {
    setMounted(true);
    const token = localStorage.getItem('accessToken');
    if (token) {
      try {
        const p = JSON.parse(atob(token.split('.')[1]));
        setEmail(p.email ?? '');
      } catch {}
    }
    // Load webhook settings
    apiFetch<typeof wh>('/api/webhooks').then((res) => {
      if (res.success && res.data && Object.keys(res.data).length > 0) setWh((prev) => ({ ...prev, ...res.data }));
    });
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  async function handleWhSave(e: React.FormEvent) {
    e.preventDefault();
    setWhSaving(true);
    await apiFetch('/api/webhooks', { method: 'PUT', body: JSON.stringify(wh) });
    setWhSaving(false);
    setWhSaved(true);
    setTimeout(() => setWhSaved(false), 2500);
  }

  const THEMES = [
    { value: 'light',  label: t('theme_light_btn'), icon: '☀️' },
    { value: 'dark',   label: t('theme_dark_btn'),  icon: '🌙' },
    { value: 'system', label: t('theme_sys_btn'),   icon: '💻' },
  ];

  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: 'profile',       label: 'Профиль & Вид',   icon: '👤' },
    { id: 'notifications', label: 'Уведомления',      icon: '🔔' },
    { id: 'integrations',  label: 'Интеграции',       icon: '🔗' },
  ];

  return (
    <div className="p-8 max-w-2xl page-enter">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--text)]">{t('page_settings')}</h1>
      </motion.div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-[var(--surface)] border border-[var(--border-strong)] rounded-xl p-1 mb-6">
        {TABS.map((tb) => (
          <button key={tb.id} onClick={() => setTab(tb.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
              tab === tb.id
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text)]'
            }`}>
            <span>{tb.icon}</span>
            <span className="hidden sm:inline">{tb.label}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* ── Profile & Appearance ──────────────────────────────────────── */}
        {tab === 'profile' && (
          <motion.div key="profile" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }} className="space-y-5">

            <section className="bg-[var(--surface)] border border-[var(--border-strong)] rounded-2xl p-6">
              <h2 className="text-sm font-semibold text-[var(--text)] mb-4">{t('sec_profile')}</h2>
              <form onSubmit={handleSave} className="space-y-3">
                <div>
                  <label className="block text-xs text-[var(--text-muted)] mb-1">Email</label>
                  <input value={email} disabled
                    className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg)] px-4 py-2.5 text-sm text-[var(--text-muted)] cursor-not-allowed" />
                </div>
                <div>
                  <label className="block text-xs text-[var(--text-muted)] mb-1">{t('lbl_name')}</label>
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('ph_name')}
                    className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] px-4 py-2.5 text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <button type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2 rounded-xl transition-colors">
                  {saved ? t('saved') : t('btn_save')}
                </button>
              </form>
            </section>

            {mounted && (
              <section className="bg-[var(--surface)] border border-[var(--border-strong)] rounded-2xl p-6">
                <h2 className="text-sm font-semibold text-[var(--text)] mb-4">{t('sec_theme')}</h2>
                <div className="grid grid-cols-3 gap-3">
                  {THEMES.map(({ value, label, icon }) => (
                    <button key={value} onClick={() => setTheme(value)}
                      className={`flex flex-col items-center gap-2 rounded-xl border-2 py-4 text-sm font-medium transition-all ${
                        theme === value
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600'
                          : 'border-[var(--border-strong)] text-[var(--text-muted)] hover:border-blue-400'
                      }`}>
                      <span className="text-2xl">{icon}</span>{label}
                    </button>
                  ))}
                </div>
              </section>
            )}

            <section className="bg-[var(--surface)] border border-[var(--border-strong)] rounded-2xl p-6">
              <h2 className="text-sm font-semibold text-[var(--text)] mb-1">{t('sec_lang')}</h2>
              <p className="text-xs text-[var(--text-muted)] mb-4">{t('lang_hint')}</p>
              <div className="space-y-2">
                {LANGS.map(({ value, label, flag }) => (
                  <button key={value} onClick={() => setLang(value as Lang)}
                    className={`w-full flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-sm text-left transition-all ${
                      lang === value
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-medium'
                        : 'border-[var(--border-strong)] text-[var(--text-muted)] hover:border-blue-400'
                    }`}>
                    <span className="text-xl">{flag}</span>
                    <span>{label}</span>
                    {lang === value && <span className="ml-auto text-blue-500 text-xs">{t('lang_active')}</span>}
                  </button>
                ))}
              </div>
            </section>
          </motion.div>
        )}

        {/* ── Notifications ─────────────────────────────────────────────── */}
        {tab === 'notifications' && (
          <motion.div key="notif" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}>
            <section className="bg-[var(--surface)] border border-[var(--border-strong)] rounded-2xl p-6">
              <h2 className="text-sm font-semibold text-[var(--text)] mb-4">Уведомления</h2>
              <div className="space-y-4">
                {[
                  { key: 'email_on_complete', label: 'Email когда тест завершён', desc: 'Получать уведомление на почту при завершении теста кандидатом', default: true },
                  { key: 'email_on_create',   label: 'Email при создании оценки', desc: 'Подтверждение создания каждой оценки', default: false },
                ].map((item) => (
                  <div key={item.key} className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-[var(--text)]">{item.label}</p>
                      <p className="text-xs text-[var(--text-faint)] mt-0.5">{item.desc}</p>
                    </div>
                    <button
                      onClick={() => {}}
                      className={`relative w-11 h-6 rounded-full transition-colors shrink-0 mt-0.5 ${item.default ? 'bg-blue-600' : 'bg-[var(--border-strong)]'}`}
                    >
                      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${item.default ? 'left-5' : 'left-0.5'}`} />
                    </button>
                  </div>
                ))}
              </div>
              <p className="text-xs text-[var(--text-faint)] mt-5 p-3 bg-[var(--bg)] rounded-xl">
                💡 Настройки уведомлений будут применены к следующему входу
              </p>
            </section>
          </motion.div>
        )}

        {/* ── Integrations (Webhooks) ───────────────────────────────────── */}
        {tab === 'integrations' && (
          <motion.div key="integr" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }} className="space-y-5">

            {/* Telegram */}
            <section className="bg-[var(--surface)] border border-[var(--border-strong)] rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-lg" style={{ background: 'rgba(0,136,204,0.15)' }}>✈️</div>
                <div>
                  <h2 className="text-sm font-semibold text-[var(--text)]">Telegram</h2>
                  <p className="text-xs text-[var(--text-faint)]">Уведомления в Telegram-чат</p>
                </div>
              </div>
              <form onSubmit={handleWhSave} className="space-y-3">
                <div>
                  <label className="block text-xs text-[var(--text-muted)] mb-1">Bot Token</label>
                  <input value={wh.telegramBotToken} onChange={(e) => setWh({ ...wh, telegramBotToken: e.target.value })}
                    placeholder="1234567890:AAF..."
                    className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg)] px-4 py-2.5 text-sm text-[var(--text)] placeholder:text-[var(--text-faint)] focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono" />
                </div>
                <div>
                  <label className="block text-xs text-[var(--text-muted)] mb-1">Chat ID</label>
                  <input value={wh.telegramChatId} onChange={(e) => setWh({ ...wh, telegramChatId: e.target.value })}
                    placeholder="-100123456789"
                    className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg)] px-4 py-2.5 text-sm text-[var(--text)] placeholder:text-[var(--text-faint)] focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono" />
                </div>
                <p className="text-xs text-[var(--text-faint)]">Создайте бота через @BotFather, добавьте в чат и получите Chat ID через @getmyid_bot</p>
              </form>
            </section>

            {/* Slack */}
            <section className="bg-[var(--surface)] border border-[var(--border-strong)] rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-lg" style={{ background: 'rgba(74,21,75,0.15)' }}>#</div>
                <div>
                  <h2 className="text-sm font-semibold text-[var(--text)]">Slack</h2>
                  <p className="text-xs text-[var(--text-faint)]">Incoming Webhook URL</p>
                </div>
              </div>
              <input value={wh.slackWebhookUrl} onChange={(e) => setWh({ ...wh, slackWebhookUrl: e.target.value })}
                placeholder="https://hooks.slack.com/services/..."
                className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg)] px-4 py-2.5 text-sm text-[var(--text)] placeholder:text-[var(--text-faint)] focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono" />
            </section>

            {/* Triggers */}
            <section className="bg-[var(--surface)] border border-[var(--border-strong)] rounded-2xl p-6">
              <h2 className="text-sm font-semibold text-[var(--text)] mb-4">Когда отправлять</h2>
              <div className="space-y-3">
                {[
                  { key: 'onCompleted', label: 'Тест завершён', desc: 'Кандидат завершил прохождение' },
                  { key: 'onCreated',   label: 'Оценка создана', desc: 'Новая оценка была создана HR' },
                ].map(({ key, label, desc }) => (
                  <div key={key} className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm text-[var(--text)]">{label}</p>
                      <p className="text-xs text-[var(--text-faint)]">{desc}</p>
                    </div>
                    <button onClick={() => setWh((w) => ({ ...w, [key]: !w[key as keyof typeof w] }))}
                      className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
                        wh[key as keyof typeof wh] ? 'bg-blue-600' : 'bg-[var(--border-strong)]'
                      }`}>
                      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${
                        wh[key as keyof typeof wh] ? 'left-5' : 'left-0.5'
                      }`} />
                    </button>
                  </div>
                ))}
              </div>
            </section>

            <button onClick={handleWhSave} disabled={whSaving}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold py-3 rounded-xl transition-colors">
              {whSaving ? 'Сохранение...' : whSaved ? '✓ Сохранено' : 'Сохранить настройки интеграций'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
