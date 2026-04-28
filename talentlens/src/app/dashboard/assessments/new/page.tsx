'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/client-fetch';
import { useLang } from '@/context/LangContext';
import PlanLimitModal from '@/components/PlanLimitModal';
import { COMPETENCY_LABELS } from '@/lib/competencies';
import type { PlanName } from '@/lib/plans';

interface Template {
  id: string;
  name: string;
  industry: string;
  level: string;
  estimatedMinutes: number;
  competenciesJson: Array<{ key: string; weight: 1 | 2 | 3 }>;
}

interface PlanLimitInfo {
  currentPlan: string;
  current?:    number;
  limit?:      number;
  upgradeTo?:  PlanName;
  message?:    string;
  feature?:    string;
}

const WEIGHT_LABEL: Record<number, { label: string; color: string }> = {
  3: { label: 'Обязательная', color: 'text-red-600 bg-red-50' },
  2: { label: 'Важная', color: 'text-yellow-700 bg-yellow-50' },
  1: { label: 'Дополнительная', color: 'text-gray-600 bg-gray-100' },
};

export default function NewAssessmentPage() {
  const router = useRouter();
  const { t } = useLang();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [candidateName, setCandidateName] = useState('');
  const [candidateEmail, setCandidateEmail] = useState('');
  const [expiryDays, setExpiryDays] = useState(7);
  const [selectedCompetencies, setSelectedCompetencies] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdLink, setCreatedLink] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [planLimit, setPlanLimit] = useState<PlanLimitInfo | null>(null);

  useEffect(() => {
    apiFetch<Template[]>('/api/templates').then((res) => {
      if (res.success) setTemplates(res.data);
    });
  }, []);

  function handleTemplateSelect(t: Template) {
    setSelectedTemplate(t);
    setSelectedCompetencies(t.competenciesJson.map((c) => c.key));
  }

  function toggleCompetency(key: string) {
    setSelectedCompetencies((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTemplate) return;
    setLoading(true);
    setError('');

    const res = await apiFetch<{ id: string; linkUuid: string }>('/api/assessments', {
      method: 'POST',
      body: JSON.stringify({
        candidateName,
        candidateEmail: candidateEmail.trim() || undefined,
        expiryDays,
        positionId: selectedTemplate.id,
        competencies: selectedCompetencies,
      }),
    });

    setLoading(false);

    if (!res.success) {
      // Detect plan limit response (HTTP 402 with planLimit:true)
      const raw = res as unknown as Record<string, unknown>;
      if (raw.planLimit === true) {
        setPlanLimit({
          currentPlan: String(raw.currentPlan ?? 'free'),
          current:     typeof raw.current === 'number' ? raw.current : undefined,
          limit:       typeof raw.limit   === 'number' ? raw.limit   : undefined,
          upgradeTo:   (raw.upgradeTo as PlanName | undefined),
          feature:     'maxAssessmentsPerMonth',
          message:     res.error,
        });
        return;
      }
      setError(res.error);
      return;
    }

    setEmailSent(!!candidateEmail.trim());
    const link = `${window.location.origin}/test/${res.data.linkUuid}`;
    setCreatedLink(link);
  }

  // ── Success screen ──────────────────────────────────────────────────────
  if (createdLink) {
    return (
      <div className="p-4 sm:p-8 max-w-xl">
        <div className="bg-[var(--surface)] border border-emerald-500/30 rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500/15 flex items-center justify-center text-emerald-500">✓</div>
            <h2 className="font-semibold text-[var(--text)]">{t('link_ready')}</h2>
          </div>
          {emailSent && (
            <p className="text-sm text-emerald-600 dark:text-emerald-400 mb-3">
              📧 Ссылка отправлена кандидату на email
            </p>
          )}
          <p className="text-sm text-[var(--text-muted)] mb-4">{t('link_hint')}</p>
          <div className="flex items-center gap-2 bg-[var(--bg)] border border-[var(--border-strong)] rounded-xl px-3 py-2">
            <span className="text-sm text-[var(--text-muted)] flex-1 break-all">{createdLink}</span>
            <button
              onClick={() => navigator.clipboard.writeText(createdLink)}
              className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg shrink-0 hover:bg-blue-700"
            >
              {t('btn_copy')}
            </button>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => router.push('/dashboard/assessments')}
            className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            {t('btn_assessments')}
          </button>
          <button
            onClick={() => { setCreatedLink(''); setCandidateName(''); setSelectedTemplate(null); }}
            className="text-sm px-4 py-2 rounded-lg transition-colors"
            style={{ border: '1px solid rgba(255,255,255,0.12)', color: '#94a3b8' }}
          >
            {t('btn_new')}
          </button>
        </div>
      </div>
    );
  }

  // ── Form ───────────────────────────────────────────────────────────────
  return (
    <div className="p-4 sm:p-8 max-w-2xl">
      <h1 className="text-xl sm:text-2xl font-bold text-[var(--text)] mb-6">{t('page_new')}</h1>

      {error && (
        <div className="mb-4 rounded-lg px-4 py-3 text-sm" style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.30)', color: '#f87171' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Candidate name */}
        <div>
          <label className="block text-sm font-medium text-[var(--text)] mb-1">
            {t('lbl_candidate')}
          </label>
          <input
            required
            value={candidateName}
            onChange={(e) => setCandidateName(e.target.value)}
            placeholder={t('ph_candidate')}
            className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] px-4 py-2.5 text-sm text-[var(--text)] placeholder:text-[var(--text-faint)] focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Email (optional) */}
        <div>
          <label className="block text-sm font-medium text-[var(--text)] mb-1">
            {t('lbl_email')}
          </label>
          <input
            type="email"
            value={candidateEmail}
            onChange={(e) => setCandidateEmail(e.target.value)}
            placeholder={t('ph_email')}
            className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] px-4 py-2.5 text-sm text-[var(--text)] placeholder:text-[var(--text-faint)] focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-[var(--text-faint)] mt-1">Кандидату будет отправлена ссылка автоматически</p>
        </div>

        {/* Expiry */}
        <div>
          <label className="block text-sm font-medium text-[var(--text)] mb-2">{t('lbl_expires')}</label>
          <div className="flex gap-2">
            {[3, 7, 14, 30].map((d) => (
              <button key={d} type="button" onClick={() => setExpiryDays(d)}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all border ${
                  expiryDays === d
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'border-[var(--border-strong)] text-[var(--text-muted)] hover:border-blue-500'
                }`}>
                {d}д
              </button>
            ))}
          </div>
        </div>

        {/* Position template */}
        <div>
          <label className="block text-sm font-medium text-[var(--text)] mb-2">
            {t('lbl_position')}
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {templates.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => handleTemplateSelect(t)}
                className="text-left rounded-xl p-4 transition-all"
                style={
                  selectedTemplate?.id === t.id
                    ? { border: '2px solid #3B82F6', background: 'rgba(59,130,246,0.12)' }
                    : { border: '2px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }
                }
              >
                <p className="font-medium text-sm text-white">{t.name}</p>
                <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>{t.industry} · ~{t.estimatedMinutes} мин</p>
              </button>
            ))}
          </div>
        </div>

        {/* Competencies (shown after template selected) */}
        {selectedTemplate && (
          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-2">
              Компетенции
              <span className="font-normal ml-2 text-xs" style={{ color: '#94a3b8' }}>
                (выбрано {selectedCompetencies.length} из {selectedTemplate.competenciesJson.length})
              </span>
            </label>
            <div className="space-y-2">
              {selectedTemplate.competenciesJson.map(({ key, weight }) => {
                const checked = selectedCompetencies.includes(key);
                const wInfo = WEIGHT_LABEL[weight];
                return (
                  <label
                    key={key}
                    className="flex items-center gap-3 rounded-lg px-4 py-3 cursor-pointer transition-all"
                    style={
                      checked
                        ? { border: '1px solid rgba(59,130,246,0.4)', background: 'rgba(59,130,246,0.08)' }
                        : { border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }
                    }
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleCompetency(key)}
                      className="rounded text-blue-600"
                    />
                    <span className="flex-1 text-sm text-white">
                      {COMPETENCY_LABELS[key] ?? key}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={
                      weight === 3
                        ? { background: 'rgba(239,68,68,0.15)', color: '#f87171' }
                        : weight === 2
                        ? { background: 'rgba(245,158,11,0.15)', color: '#fbbf24' }
                        : { background: 'rgba(100,116,139,0.15)', color: '#94a3b8' }
                    }>
                      {wInfo.label}
                    </span>
                  </label>
                );
              })}
            </div>

            {/* Estimated time warning §EVAL-05 */}
            {selectedTemplate.estimatedMinutes > 45 && (
              <p className="mt-3 text-sm rounded-lg px-4 py-2" style={{ background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.25)', color: '#fbbf24' }}>
                ⚠ Тест займёт более 45 минут. Рекомендуется сократить набор компетенций.
              </p>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={!selectedTemplate || !candidateName || selectedCompetencies.length === 0 || loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-medium px-6 py-2.5 rounded-lg transition-colors"
        >
          {loading ? t('creating') : t('btn_create')}
        </button>
      </form>

      <PlanLimitModal
        open={!!planLimit}
        onClose={() => setPlanLimit(null)}
        currentPlan={planLimit?.currentPlan ?? 'free'}
        used={planLimit?.current}
        limit={planLimit?.limit}
        upgradeTo={planLimit?.upgradeTo}
        feature={planLimit?.feature}
        message={planLimit?.message}
      />
    </div>
  );
}
