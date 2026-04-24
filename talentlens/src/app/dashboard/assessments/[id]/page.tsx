'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { apiFetch } from '@/lib/client-fetch';
import { useLang } from '@/context/LangContext';

interface Assessment {
  id: string;
  candidateName: string;
  status: string;
  linkUuid: string;
  estimatedMinutes: number;
  createdAt: string;
  linkExpiresAt: string;
  position: { name: string; industry: string };
  testSession: {
    language: string;
    startedAt: string | null;
    finishedAt: string | null;
    tabSwitches: number;
  } | null;
}

const STATUS_COLOR: Record<string, { bg: string; text: string; dot: string }> = {
  CREATED:     { bg: 'bg-gray-100 dark:bg-gray-800',   text: 'text-gray-600 dark:text-gray-400',   dot: '#9ca3af' },
  LINK_OPENED: { bg: 'bg-blue-50 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400',   dot: '#3b82f6' },
  IN_PROGRESS: { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-400', dot: '#f59e0b' },
  COMPLETED:   { bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-700 dark:text-green-400',  dot: '#10b981' },
};

function PulseDot({ color }: { color: string }) {
  return (
    <span className="relative inline-flex w-2 h-2">
      <motion.span className="absolute inset-0 rounded-full" style={{ background: color }}
        animate={{ scale: [1, 2, 1], opacity: [0.6, 0, 0.6] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }} />
      <span className="relative inline-flex rounded-full w-2 h-2" style={{ background: color }} />
    </span>
  );
}

export default function AssessmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { t } = useLang();
  const [data, setData] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    apiFetch<Assessment>(`/api/assessments/${id}`)
      .then((res) => { if (res.success) setData(res.data); })
      .finally(() => setLoading(false));

    const interval = setInterval(async () => {
      const res = await apiFetch<Assessment>(`/api/assessments/${id}`);
      if (res.success) {
        setData(res.data);
        if (res.data.status === 'COMPLETED') clearInterval(interval);
      }
    }, 10_000);
    return () => clearInterval(interval);
  }, [id]);

  function copyLink() {
    if (!data) return;
    navigator.clipboard.writeText(`${window.location.origin}/test/${data.linkUuid}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleDelete() {
    if (!confirm('Удалить оценку?')) return;
    const res = await apiFetch(`/api/assessments/${id}`, { method: 'DELETE' });
    if (res.success) router.push('/dashboard/assessments');
  }

  if (loading) return (
    <div className="p-8 flex items-center gap-3 text-sm text-[var(--text-muted)]">
      <motion.div className="w-5 h-5 rounded-full border-2 border-blue-500/30 border-t-blue-500"
        animate={{ rotate: 360 }} transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }} />
      Загрузка...
    </div>
  );
  if (!data) return <div className="p-8 text-sm text-red-500">Оценка не найдена</div>;

  const link = `${typeof window !== 'undefined' ? window.location.origin : ''}/test/${data.linkUuid}`;
  const sc = STATUS_COLOR[data.status] ?? STATUS_COLOR.CREATED;

  const timeline = [
    { label: 'Оценка создана',  date: data.createdAt,                   done: true },
    { label: 'Ссылка открыта',  date: null,                             done: ['LINK_OPENED', 'IN_PROGRESS', 'COMPLETED'].includes(data.status) },
    { label: 'Тест начат',      date: data.testSession?.startedAt ?? null, done: !!data.testSession?.startedAt },
    { label: 'Тест завершён',   date: data.testSession?.finishedAt ?? null, done: !!data.testSession?.finishedAt },
  ];

  return (
    <div className="p-4 sm:p-8 max-w-2xl page-enter">
      {/* Breadcrumb */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}
        className="flex items-center gap-2 text-sm text-[var(--text-faint)] mb-5">
        <Link href="/dashboard/assessments" className="hover:text-[var(--text-muted)] transition-colors">
          {t('nav_assessments')}
        </Link>
        <span>›</span>
        <span className="text-[var(--text)] truncate">{data.candidateName}</span>
      </motion.div>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="flex items-start justify-between gap-3 mb-6 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--text)]">{data.candidateName}</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">{data.position.name} · {data.position.industry}</p>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium shrink-0 ${sc.bg} ${sc.text}`}>
          {data.status === 'IN_PROGRESS' && <PulseDot color={sc.dot} />}
          {t(`status_${data.status}` as Parameters<typeof t>[0])}
        </div>
      </motion.div>

      {/* Candidate link */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="bg-[var(--surface)] border border-[var(--border-strong)] rounded-2xl p-5 mb-4">
        <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-3">
          {t('section_link')}
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-xs bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-[var(--text-muted)] break-all">
            {link}
          </code>
          <motion.button
            onClick={copyLink}
            whileTap={{ scale: 0.95 }}
            className="shrink-0 text-xs bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1.5"
          >
            <AnimatePresence mode="wait">
              {copied
                ? <motion.span key="c" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>✓</motion.span>
                : <motion.span key="n" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>{t('btn_copy')}</motion.span>
              }
            </AnimatePresence>
          </motion.button>
        </div>
        <p className="text-xs text-[var(--text-faint)] mt-2">
          {t('lbl_link_expires')}: {new Date(data.linkExpiresAt).toLocaleDateString('ru-RU')}
        </p>
      </motion.div>

      {/* Timeline / Progress */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="bg-[var(--surface)] border border-[var(--border-strong)] rounded-2xl p-5 mb-4">
        <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-4">Прогресс</p>
        <div className="space-y-3">
          {timeline.map(({ label, date, done }, i) => (
            <motion.div key={label} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.22 + i * 0.07, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="flex items-center gap-3">
              <motion.div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] shrink-0 transition-colors ${
                  done ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-[var(--border-strong)]'
                }`}
                animate={done ? { scale: [1, 1.15, 1] } : {}}
                transition={{ duration: 0.4, delay: 0.3 + i * 0.1 }}
              >
                {done && '✓'}
              </motion.div>
              <span className={`text-sm flex-1 ${done ? 'text-[var(--text)]' : 'text-[var(--text-faint)]'}`}>{label}</span>
              {date && (
                <span className="text-xs text-[var(--text-faint)] tabular-nums">
                  {new Date(date).toLocaleString('ru-RU')}
                </span>
              )}
              {/* Active step indicator */}
              {!done && i > 0 && timeline[i - 1].done && (
                <PulseDot color="#f59e0b" />
              )}
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Session details */}
      <AnimatePresence>
        {data.testSession && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            transition={{ delay: 0.25, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="bg-[var(--surface)] border border-[var(--border-strong)] rounded-2xl p-5 mb-4">
            <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-3">{t('section_test')}</p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-[var(--text-faint)] text-xs mb-0.5">{t('lbl_lang')}</p>
                <p className="font-medium text-[var(--text)]">
                  {{ ru: 'Русский', uz: "O'zbek", en: 'English' }[data.testSession.language] ?? data.testSession.language}
                </p>
              </div>
              <div>
                <p className="text-[var(--text-faint)] text-xs mb-0.5">{t('lbl_tab_sw')}</p>
                <p className={`font-medium ${data.testSession.tabSwitches > 3 ? 'text-red-500' : 'text-[var(--text)]'}`}>
                  {data.testSession.tabSwitches}
                  {data.testSession.tabSwitches > 3 && <span className="ml-1 text-xs">⚠</span>}
                </p>
              </div>
              {data.testSession.startedAt && (
                <div>
                  <p className="text-[var(--text-faint)] text-xs mb-0.5">{t('lbl_started')}</p>
                  <p className="font-medium text-[var(--text)]">{new Date(data.testSession.startedAt).toLocaleString('ru-RU')}</p>
                </div>
              )}
              {data.testSession.finishedAt && (
                <div>
                  <p className="text-[var(--text-faint)] text-xs mb-0.5">{t('lbl_finished')}</p>
                  <p className="font-medium text-[var(--text)]">{new Date(data.testSession.finishedAt).toLocaleString('ru-RU')}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actions */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.32 }}
        className="flex gap-3">
        {data.status === 'COMPLETED' && (
          <Link
            href={`/dashboard/assessments/${data.id}/report`}
            className="bg-blue-600 text-white text-sm font-medium px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
          >
            {t('btn_report')}
          </Link>
        )}
        <button
          onClick={handleDelete}
          className="text-sm text-red-500 hover:text-red-600 px-4 py-2.5 rounded-xl border border-[var(--border-strong)] hover:border-red-300 transition-colors"
        >
          Удалить
        </button>
      </motion.div>
    </div>
  );
}
