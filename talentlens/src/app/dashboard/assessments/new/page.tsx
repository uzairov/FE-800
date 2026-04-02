'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/client-fetch';

interface Template {
  id: string;
  name: string;
  industry: string;
  level: string;
  estimatedMinutes: number;
  competenciesJson: Array<{ key: string; weight: 1 | 2 | 3 }>;
}

const COMPETENCY_LABELS: Record<string, string> = {
  sales_skills: 'Навыки продаж',
  stress_resistance: 'Стрессоустойчивость',
  communication_flexibility: 'Гибкость общения',
  motivation: 'Мотивация',
  negotiation: 'Переговоры',
  result_orientation: 'Ориентация на результат',
  service_orientation: 'Клиентоориентированность',
  monotolerance: 'Моноустойчивость',
  attention_to_detail: 'Внимательность к деталям',
  self_motivation: 'Самомотивация',
  honesty: 'Честность',
  emotional_intelligence: 'Эмоциональный интеллект',
  locus_of_control: 'Локус контроля',
  attention: 'Внимательность',
  leadership: 'Лидерство',
  systems_thinking: 'Системное мышление',
};

const WEIGHT_LABEL: Record<number, { label: string; color: string }> = {
  3: { label: 'Обязательная', color: 'text-red-600 bg-red-50' },
  2: { label: 'Важная', color: 'text-yellow-700 bg-yellow-50' },
  1: { label: 'Дополнительная', color: 'text-gray-600 bg-gray-100' },
};

export default function NewAssessmentPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [candidateName, setCandidateName] = useState('');
  const [selectedCompetencies, setSelectedCompetencies] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdLink, setCreatedLink] = useState('');

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
        positionId: selectedTemplate.id,
        competencies: selectedCompetencies,
      }),
    });

    setLoading(false);

    if (!res.success) {
      setError(res.error);
      return;
    }

    const link = `${window.location.origin}/test/${res.data.linkUuid}`;
    setCreatedLink(link);
  }

  // ── Success screen ──────────────────────────────────────────────────────
  if (createdLink) {
    return (
      <div className="p-8 max-w-xl">
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-6">
          <h2 className="font-semibold text-green-800 mb-1">Оценка создана!</h2>
          <p className="text-sm text-green-700 mb-4">
            Скопируйте ссылку и отправьте кандидату. Ссылка действительна 7 дней.
          </p>
          <div className="bg-white rounded-lg border border-green-200 flex items-center gap-2 px-3 py-2">
            <span className="text-sm text-gray-700 flex-1 break-all">{createdLink}</span>
            <button
              onClick={() => navigator.clipboard.writeText(createdLink)}
              className="text-xs bg-green-600 text-white px-3 py-1 rounded shrink-0 hover:bg-green-700"
            >
              Копировать
            </button>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => router.push('/dashboard/assessments')}
            className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Список оценок
          </button>
          <button
            onClick={() => { setCreatedLink(''); setCandidateName(''); setSelectedTemplate(null); }}
            className="text-sm px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50"
          >
            Новая оценка
          </button>
        </div>
      </div>
    );
  }

  // ── Form ───────────────────────────────────────────────────────────────
  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Новая оценка</h1>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Candidate name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Имя кандидата
          </label>
          <input
            required
            value={candidateName}
            onChange={(e) => setCandidateName(e.target.value)}
            placeholder="Иванов Иван Иванович"
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Position template */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Должность
          </label>
          <div className="grid grid-cols-2 gap-3">
            {templates.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => handleTemplateSelect(t)}
                className={`text-left rounded-xl border-2 p-4 transition-colors ${
                  selectedTemplate?.id === t.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <p className="font-medium text-sm text-gray-900">{t.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{t.industry} · ~{t.estimatedMinutes} мин</p>
              </button>
            ))}
          </div>
        </div>

        {/* Competencies (shown after template selected) */}
        {selectedTemplate && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Компетенции
              <span className="text-gray-400 font-normal ml-2 text-xs">
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
                    className={`flex items-center gap-3 rounded-lg border px-4 py-3 cursor-pointer transition-colors ${
                      checked ? 'border-blue-200 bg-blue-50/50' : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleCompetency(key)}
                      className="rounded text-blue-600"
                    />
                    <span className="flex-1 text-sm text-gray-900">
                      {COMPETENCY_LABELS[key] ?? key}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${wInfo.color}`}>
                      {wInfo.label}
                    </span>
                  </label>
                );
              })}
            </div>

            {/* Estimated time warning §EVAL-05 */}
            {selectedTemplate.estimatedMinutes > 45 && (
              <p className="mt-3 text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2">
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
          {loading ? 'Создаём...' : 'Создать и получить ссылку'}
        </button>
      </form>
    </div>
  );
}
