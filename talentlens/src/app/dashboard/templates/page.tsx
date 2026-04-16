'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiFetch } from '@/lib/client-fetch';

// ─── Import helper (used at bottom of page) ──────────────────────────────────
// declared here so it's in scope; implementation inline in TemplatesPage

// ─── Types ───────────────────────────────────────────────────────────────────

interface Option {
  textRu: string;
  textUz?: string;
  textEn?: string;
}

interface ScoringEntry {
  competency: string;
  scores: number[];
}

interface Question {
  id: string;
  blockType: string;
  textRu: string;
  textUz: string;
  textEn: string;
  optionsJson: Option[];
  scoringJson: ScoringEntry[];
  hrHint: string | null;
  riskFlag: boolean;
  orderIndex: number;
  companyId: string | null;
  createdAt: string;
}

interface Block {
  blockType: string;
  count: number;
  questions: Question[];
}

// ─── Block type display config ────────────────────────────────────────────────
const BLOCK_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  leadership:     { label: 'Лидерство',         icon: '🎯', color: '#3b82f6' },
  communication:  { label: 'Коммуникация',       icon: '💬', color: '#8b5cf6' },
  analytical:     { label: 'Аналитика',          icon: '🧠', color: '#06b6d4' },
  teamwork:       { label: 'Командная работа',   icon: '🤝', color: '#10b981' },
  stress:         { label: 'Стрессоустойчивость',icon: '⚡', color: '#f59e0b' },
  motivation:     { label: 'Мотивация',          icon: '🚀', color: '#ec4899' },
  responsibility: { label: 'Ответственность',    icon: '✅', color: '#84cc16' },
  creativity:     { label: 'Креативность',       icon: '✨', color: '#f97316' },
  open_text:      { label: 'Открытые вопросы',   icon: '📝', color: '#94a3b8' },
};

function getBlockMeta(blockType: string) {
  return BLOCK_CONFIG[blockType] ?? { label: blockType, icon: '📋', color: '#6b7280' };
}

// ─── Question Modal (create + edit) ─────────────────────────────────────────
interface CreateModalProps {
  onClose: () => void;
  onCreated: (q: Question) => void;
  initial?: Question; // if set → edit mode
}

type LangKey = 'ru' | 'uz' | 'en';

function CreateModal({ onClose, onCreated, initial }: CreateModalProps) {
  const isEdit = !!initial;

  const [blockType,  setBlockType]  = useState(initial?.blockType ?? '');
  const [activeLang, setActiveLang] = useState<LangKey>('ru');
  const [texts,      setTexts]      = useState<Record<LangKey, string>>({
    ru: initial?.textRu ?? '',
    uz: initial?.textUz ?? '',
    en: initial?.textEn ?? '',
  });
  const [options, setOptions] = useState<Array<{ textRu: string; textUz: string; textEn: string }>>(
    initial?.optionsJson.length
      ? (initial.optionsJson as Array<{ textRu: string; textUz: string; textEn: string }>)
      : [
          { textRu: '', textUz: '', textEn: '' },
          { textRu: '', textUz: '', textEn: '' },
          { textRu: '', textUz: '', textEn: '' },
          { textRu: '', textUz: '', textEn: '' },
        ],
  );
  const [scoring, setScoring] = useState<ScoringEntry[]>(
    (initial?.scoringJson as ScoringEntry[]) ?? [],
  );
  const [hrHint,   setHrHint]   = useState(initial?.hrHint ?? '');
  const [riskFlag, setRiskFlag] = useState(initial?.riskFlag ?? false);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');
  const [tab,      setTab]      = useState<'text' | 'scoring' | 'meta'>('text');

  // ── option helpers ──────────────────────────────────────────────────────────
  const optLangKey = (lang: LangKey) => `text${lang.charAt(0).toUpperCase() + lang.slice(1)}` as keyof typeof options[0];

  function updateOption(i: number, lang: LangKey, val: string) {
    setOptions(prev => prev.map((o, idx) => idx === i ? { ...o, [optLangKey(lang)]: val } : o));
  }

  function addOption() {
    if (options.length >= 6) return;
    setOptions(prev => [...prev, { textRu: '', textUz: '', textEn: '' }]);
    // extend scoring scores
    setScoring(prev => prev.map(s => ({ ...s, scores: [...s.scores, 0] })));
  }

  function removeOption(i: number) {
    if (options.length <= 2) return;
    setOptions(prev => prev.filter((_, idx) => idx !== i));
    setScoring(prev => prev.map(s => ({ ...s, scores: s.scores.filter((_, idx) => idx !== i) })));
  }

  // ── scoring helpers ─────────────────────────────────────────────────────────
  function toggleCompetency(key: string) {
    setScoring(prev => {
      const exists = prev.find(s => s.competency === key);
      if (exists) return prev.filter(s => s.competency !== key);
      return [...prev, { competency: key, scores: options.map(() => 0) }];
    });
  }

  function setScore(competency: string, optIdx: number, val: number) {
    setScoring(prev => prev.map(s =>
      s.competency === competency
        ? { ...s, scores: s.scores.map((sc, i) => i === optIdx ? val : sc) }
        : s,
    ));
  }

  // ── submit ──────────────────────────────────────────────────────────────────
  async function submit() {
    if (!blockType.trim()) return setError('Укажите тип блока');
    if (!texts.ru.trim())  return setError('Введите текст вопроса на русском');
    const filledOptions = options.filter(o => o.textRu.trim());
    if (blockType !== 'open_text' && filledOptions.length < 2)
      return setError('Нужно минимум 2 варианта ответа');

    setSaving(true);
    setError('');
    try {
      const payload = {
        blockType: blockType.toLowerCase().trim(),
        textRu: texts.ru, textUz: texts.uz, textEn: texts.en,
        optionsJson: filledOptions,
        scoringJson: scoring,
        hrHint: hrHint.trim() || null,
        riskFlag,
      };

      let res;
      if (isEdit) {
        res = await apiFetch<Question>('/api/questions', {
          method: 'PATCH',
          body: JSON.stringify({ id: initial!.id, ...payload }),
        });
      } else {
        res = await apiFetch<Question>('/api/questions', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      if (res.success) {
        onCreated(res.data);
      } else {
        setError((res as { success: false; error: string }).error ?? 'Ошибка');
      }
    } catch {
      setError('Ошибка сети');
    } finally {
      setSaving(false);
    }
  }

  const inputCls = "w-full px-3 py-2 rounded-xl text-sm text-[var(--text)] placeholder-[var(--text-3)] outline-none transition-all";
  const inputStyle = { background: 'var(--bg)', border: '1px solid var(--border)' };

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <motion.div
        className="relative w-full max-w-2xl rounded-2xl flex flex-col"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', maxHeight: '90vh' }}
        initial={{ scale: 0.92, y: 24, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.92, y: 24, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      >
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}>
          <div>
            <h2 className="font-bold text-[var(--text)] text-lg">
              {isEdit ? 'Редактировать вопрос' : 'Новый вопрос'}
            </h2>
            <p className="text-[var(--text-2)] text-xs mt-0.5">
              {isEdit ? 'Измените поля и сохраните' : 'Добавьте вопрос в банк компетенций'}
            </p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[var(--border)] transition-colors">
            ✕
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex shrink-0 px-6 pt-3 gap-1" style={{ borderBottom: '1px solid var(--border)' }}>
          {([['text', 'Текст & варианты'], ['scoring', 'Скоринг'], ['meta', 'Мета']] as const).map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className="px-4 py-2 rounded-t-lg text-xs font-medium transition-all"
              style={tab === key
                ? { background: 'var(--bg)', color: 'var(--text)', borderBottom: '2px solid #3b82f6' }
                : { color: 'var(--text-3)' }}>
              {label}
            </button>
          ))}
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

          {/* ── TAB: Text & options ── */}
          {tab === 'text' && (
            <>
              {/* Block type */}
              <div>
                <label className="text-[var(--text-2)] text-xs font-medium uppercase tracking-wider block mb-2">
                  Компетенция
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(BLOCK_CONFIG).map(([key, meta]) => (
                    <button key={key} onClick={() => setBlockType(key)}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium transition-all text-left"
                      style={blockType === key
                        ? { background: meta.color + '22', border: `1.5px solid ${meta.color}60`, color: meta.color }
                        : { background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-2)' }}>
                      <span>{meta.icon}</span>
                      <span className="truncate">{meta.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Question text — language tabs */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[var(--text-2)] text-xs font-medium uppercase tracking-wider">
                    Текст вопроса
                  </label>
                  <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                    {(['ru', 'uz', 'en'] as LangKey[]).map(lang => (
                      <button key={lang} onClick={() => setActiveLang(lang)}
                        className="px-2.5 py-1 text-[10px] font-medium transition-all"
                        style={activeLang === lang
                          ? { background: '#2563eb', color: '#fff' }
                          : { background: 'var(--bg)', color: 'var(--text-3)' }}>
                        {lang.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
                <textarea
                  value={texts[activeLang]}
                  onChange={e => setTexts(prev => ({ ...prev, [activeLang]: e.target.value }))}
                  placeholder={activeLang === 'ru' ? 'Опишите ситуацию...' : activeLang === 'uz' ? 'Vaziyatni tavsiflang...' : 'Describe the situation...'}
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl text-sm text-[var(--text)] placeholder-[var(--text-3)] resize-none outline-none"
                  style={inputStyle} />
                <div className="flex gap-2 mt-1">
                  {(['ru', 'uz', 'en'] as LangKey[]).map(lang => (
                    <span key={lang} className="text-[10px] px-1.5 py-0.5 rounded font-mono"
                      style={{
                        background: texts[lang] ? 'rgba(52,211,153,0.15)' : 'rgba(255,255,255,0.05)',
                        color: texts[lang] ? '#34d399' : 'var(--text-3)',
                      }}>
                      {lang.toUpperCase()} {texts[lang] ? '✓' : '—'}
                    </span>
                  ))}
                </div>
              </div>

              {/* Options */}
              {blockType !== 'open_text' && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[var(--text-2)] text-xs font-medium uppercase tracking-wider">
                      Варианты ответов ({activeLang.toUpperCase()})
                    </label>
                    <button onClick={addOption} disabled={options.length >= 6}
                      className="text-blue-400 hover:text-blue-300 text-xs font-medium transition-colors disabled:opacity-30">
                      + Добавить
                    </button>
                  </div>
                  <div className="space-y-2">
                    <AnimatePresence>
                      {options.map((opt, i) => (
                        <motion.div key={i}
                          initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 8, height: 0 }}
                          className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                            style={{ background: 'var(--border)', color: 'var(--text-2)' }}>
                            {String.fromCharCode(65 + i)}
                          </div>
                          <input
                            value={(opt as Record<string, string>)[optLangKey(activeLang)] ?? ''}
                            onChange={e => updateOption(i, activeLang, e.target.value)}
                            placeholder={`Вариант ${String.fromCharCode(65 + i)}`}
                            className={inputCls}
                            style={inputStyle} />
                          {options.length > 2 && (
                            <button onClick={() => removeOption(i)}
                              className="text-[var(--text-3)] hover:text-red-400 transition-colors text-lg leading-none w-6 text-center shrink-0">
                              ×
                            </button>
                          )}
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── TAB: Scoring ── */}
          {tab === 'scoring' && (
            <div className="space-y-4">
              <p className="text-[var(--text-3)] text-xs">
                Выберите компетенции и назначьте баллы (0–4) для каждого варианта ответа.
              </p>

              {/* Competency selector */}
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(BLOCK_CONFIG).filter(([k]) => k !== 'open_text').map(([key, meta]) => {
                  const active = scoring.some(s => s.competency === key);
                  return (
                    <button key={key} onClick={() => toggleCompetency(key)}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all text-left"
                      style={active
                        ? { background: meta.color + '22', border: `1.5px solid ${meta.color}60`, color: meta.color }
                        : { background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-2)' }}>
                      <span>{meta.icon}</span>
                      <span className="truncate">{meta.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Score grid */}
              {scoring.map(entry => {
                const meta = getBlockMeta(entry.competency);
                return (
                  <div key={entry.competency} className="rounded-xl p-4"
                    style={{ background: 'var(--bg)', border: `1px solid ${meta.color}30` }}>
                    <div className="flex items-center gap-2 mb-3">
                      <span>{meta.icon}</span>
                      <span className="text-xs font-semibold" style={{ color: meta.color }}>{meta.label}</span>
                    </div>
                    <div className="space-y-2">
                      {options.map((opt, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <div className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold shrink-0"
                            style={{ background: 'var(--surface)', color: 'var(--text-2)' }}>
                            {String.fromCharCode(65 + i)}
                          </div>
                          <span className="flex-1 text-xs text-[var(--text-2)] truncate">
                            {opt.textRu || `Вариант ${String.fromCharCode(65 + i)}`}
                          </span>
                          <div className="flex gap-1 shrink-0">
                            {[0, 1, 2, 3, 4].map(score => (
                              <button key={score}
                                onClick={() => setScore(entry.competency, i, score)}
                                className="w-7 h-7 rounded-lg text-xs font-bold transition-all"
                                style={entry.scores[i] === score
                                  ? { background: meta.color, color: '#fff' }
                                  : { background: 'var(--surface)', color: 'var(--text-3)' }}>
                                {score}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {scoring.length === 0 && (
                <p className="text-center text-[var(--text-3)] text-sm py-6">
                  Выберите компетенции выше для настройки скоринга
                </p>
              )}
            </div>
          )}

          {/* ── TAB: Meta ── */}
          {tab === 'meta' && (
            <div className="space-y-5">
              <div>
                <label className="text-[var(--text-2)] text-xs font-medium uppercase tracking-wider block mb-2">
                  Подсказка для HR
                </label>
                <textarea
                  value={hrHint}
                  onChange={e => setHrHint(e.target.value)}
                  placeholder="Что обратить внимание при анализе ответа..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl text-sm text-[var(--text)] placeholder-[var(--text-3)] resize-none outline-none"
                  style={inputStyle} />
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                <div>
                  <div className="text-sm font-medium text-[var(--text)]">Risk Flag</div>
                  <div className="text-xs text-[var(--text-3)] mt-0.5">
                    Вопрос является индикатором риска
                  </div>
                </div>
                <button onClick={() => setRiskFlag(v => !v)}
                  className="w-12 h-6 rounded-full transition-all relative shrink-0"
                  style={{ background: riskFlag ? '#ef4444' : 'var(--border)' }}>
                  <motion.div className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow"
                    animate={{ left: riskFlag ? '26px' : '2px' }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }} />
                </button>
              </div>
            </div>
          )}

          {error && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="text-red-400 text-sm px-1">
              {error}
            </motion.p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 flex items-center justify-end gap-3 shrink-0"
          style={{ borderTop: '1px solid var(--border)' }}>
          <button onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[var(--border)] transition-all">
            Отмена
          </button>
          <motion.button onClick={submit} disabled={saving}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            className="px-5 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)' }}>
            {saving ? 'Сохраняю...' : isEdit ? 'Сохранить' : 'Создать вопрос'}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

const LANG_LABELS: Record<string, string> = { ru: 'RU', uz: 'UZ', en: 'EN' };

function questionText(q: Question, lang: string) {
  if (lang === 'uz' && q.textUz) return q.textUz;
  if (lang === 'en' && q.textEn) return q.textEn;
  return q.textRu;
}

function optionText(opt: Option, lang: string) {
  if (lang === 'uz' && opt.textUz) return opt.textUz;
  if (lang === 'en' && opt.textEn) return opt.textEn;
  return opt.textRu;
}

// ─── Question Card ────────────────────────────────────────────────────────────
function QuestionCard({
  question, onDelete, onEdit, index, previewLang, userRole,
}: {
  question: Question;
  onDelete: (id: string) => void;
  onEdit: (q: Question) => void;
  index: number;
  previewLang: string;
  userRole: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const options  = question.optionsJson as Option[];
  const scoring  = question.scoringJson as ScoringEntry[];
  const isSystem = question.companyId === null;
  const canEdit  = !isSystem || userRole === 'SUPERADMIN';

  async function handleDelete() {
    if (!confirm('Удалить вопрос?')) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/questions?id=${question.id}`, { method: 'DELETE' });
      onDelete(question.id);
    } catch {
      setDeleting(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="rounded-xl overflow-hidden"
      style={{ border: '1px solid var(--border)', background: 'var(--bg)' }}
    >
      {/* Header row */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-start gap-3 px-4 py-3.5 text-left hover:bg-[var(--surface)] transition-colors group"
      >
        <span className="text-[var(--text-2)] text-xs font-mono mt-0.5 shrink-0 w-5 text-center">{index + 1}</span>
        <p className="flex-1 text-sm text-[var(--text)] leading-relaxed line-clamp-2 group-hover:line-clamp-none transition-all">
          {questionText(question, previewLang)}
        </p>
        <div className="flex items-center gap-2 shrink-0">
          {isSystem && (
            <span title="Системный вопрос" className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
              style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}>
              🔒 Системный
            </span>
          )}
          {question.riskFlag && (
            <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
              style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171' }}>
              ⚠ Risk
            </span>
          )}
          <span className="text-xs text-[var(--text-3)]">{options.length} вар.</span>
          <motion.span className="text-[var(--text-3)] text-xs"
            animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
            ▾
          </motion.span>
        </div>
      </button>

      {/* Expanded content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-3 space-y-3" style={{ borderTop: '1px solid var(--border)' }}>

              {/* Options */}
              {options.length > 0 && (
                <div className="space-y-1.5">
                  {options.map((opt, i) => {
                    const maxScore = scoring.reduce((mx, s) => Math.max(mx, s.scores[i] ?? 0), 0);
                    return (
                      <div key={i} className="flex items-center gap-2.5">
                        <div className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0"
                          style={{ background: 'var(--surface)', color: 'var(--text-2)' }}>
                          {String.fromCharCode(65 + i)}
                        </div>
                        <span className="flex-1 text-sm text-[var(--text-2)]">{optionText(opt, previewLang)}</span>
                        {maxScore > 0 && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                            style={{ background: 'rgba(99,179,237,0.12)', color: '#60a5fa' }}>
                            {maxScore}pts
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Scoring competencies */}
              {scoring.length > 0 && (
                <div>
                  <p className="text-[var(--text-3)] text-xs uppercase tracking-wider mb-1.5">Компетенции</p>
                  <div className="flex flex-wrap gap-1.5">
                    {scoring.map((s, i) => {
                      const meta = getBlockMeta(s.competency);
                      return (
                        <span key={i} className="text-xs px-2 py-0.5 rounded-md font-medium"
                          style={{ background: meta.color + '20', color: meta.color }}>
                          {meta.label}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* HR Hint */}
              {question.hrHint && (
                <div className="rounded-lg px-3 py-2 text-xs text-[var(--text-2)] italic"
                  style={{ background: 'rgba(250,204,21,0.07)', border: '1px solid rgba(250,204,21,0.2)' }}>
                  💡 {question.hrHint}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  {['ru', 'uz', 'en'].map(lang => (
                    <span key={lang} className="text-[10px] px-1.5 py-0.5 rounded font-mono"
                      style={{
                        background: (lang === 'ru' ? question.textRu : lang === 'uz' ? question.textUz : question.textEn)
                          ? 'rgba(52,211,153,0.15)' : 'rgba(255,255,255,0.05)',
                        color: (lang === 'ru' ? question.textRu : lang === 'uz' ? question.textUz : question.textEn)
                          ? '#34d399' : 'var(--text-3)',
                      }}>
                      {LANG_LABELS[lang]}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  {canEdit ? (
                    <button onClick={() => onEdit(question)}
                      className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1">
                      ✏ Изменить
                    </button>
                  ) : (
                    <span className="text-xs text-[var(--text-3)] flex items-center gap-1 cursor-not-allowed"
                      title="Только SuperAdmin может редактировать системные вопросы">
                      🔒 Только чтение
                    </span>
                  )}
                  {canEdit && (
                    <button onClick={handleDelete} disabled={deleting}
                      className="text-xs text-[var(--text-3)] hover:text-red-400 transition-colors disabled:opacity-40 flex items-center gap-1">
                      {deleting ? '...' : '🗑 Удалить'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Block Panel ──────────────────────────────────────────────────────────────
function BlockPanel({ block, onDelete, onEdit, previewLang, userRole }: {
  block: Block;
  onDelete: (id: string) => void;
  onEdit: (q: Question) => void;
  previewLang: string;
  userRole: string;
}) {
  const [open, setOpen] = useState(false);
  const meta = getBlockMeta(block.blockType);
  const riskCount = block.questions.filter(q => q.riskFlag).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden"
      style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}
    >
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-[var(--bg)] transition-colors"
      >
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
          style={{ background: meta.color + '18', border: `1px solid ${meta.color}30` }}>
          {meta.icon}
        </div>
        <div className="flex-1 text-left">
          <h3 className="font-semibold text-[var(--text)] text-sm">{meta.label}</h3>
          <p className="text-[var(--text-3)] text-xs mt-0.5">
            {block.count} вопросов
            {riskCount > 0 && (
              <span className="ml-2 text-red-400">· {riskCount} risk</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex gap-0.5">
            {block.questions.slice(0, 8).map((_, i) => (
              <div key={i} className="w-1.5 h-4 rounded-full"
                style={{ background: meta.color + '40' }} />
            ))}
            {block.count > 8 && <span className="text-[var(--text-3)] text-[10px] ml-1">+{block.count - 8}</span>}
          </div>
          <motion.span className="text-[var(--text-3)]"
            animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.25 }}>
            ▾
          </motion.span>
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-2" style={{ borderTop: '1px solid var(--border)' }}>
              <div className="h-3" />
              {block.questions.length === 0 ? (
                <p className="text-[var(--text-3)] text-sm text-center py-4">Нет вопросов</p>
              ) : (
                block.questions.map((q, i) => (
                  <QuestionCard key={q.id} question={q} onDelete={onDelete}
                    onEdit={onEdit} index={i} previewLang={previewLang} userRole={userRole} />
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
type Scope = 'all' | 'system' | 'mine';

export default function TemplatesPage() {
  const [blocks,              setBlocks]              = useState<Block[]>([]);
  const [loading,             setLoading]             = useState(true);
  const [search,              setSearch]              = useState('');
  const [scope,               setScope]               = useState<Scope>('all');
  const [showCreate,          setShowCreate]          = useState(false);
  const [showCreateTemplate,  setShowCreateTemplate]  = useState(false);
  const [editQuestion,        setEditQuestion]        = useState<Question | null>(null);
  const [activeFilter,        setActiveFilter]        = useState<string | null>(null);
  const [riskOnly,            setRiskOnly]            = useState(false);
  const [previewLang,         setPreviewLang]         = useState('ru');
  const [importing,           setImporting]           = useState(false);
  const [importMsg,           setImportMsg]           = useState('');
  const [userRole,            setUserRole]            = useState('');
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Read user role from stored JWT (client-side decode)
    const token = localStorage.getItem('accessToken') ?? sessionStorage.getItem('accessToken');
    if (token) {
      try { setUserRole(JSON.parse(atob(token.split('.')[1])).role ?? ''); } catch { /* ignore */ }
    }
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await apiFetch<{ blocks: Block[]; total: number }>(`/api/questions?scope=${scope}`);
        if (res.success) setBlocks(res.data.blocks);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [scope]);

  function handleDelete(id: string) {
    setBlocks(prev => prev
      .map(b => ({ ...b, questions: b.questions.filter(q => q.id !== id) }))
      .map(b => ({ ...b, count: b.questions.length }))
      .filter(b => b.count > 0),
    );
  }

  function handleCreated(q: Question) {
    setBlocks(prev => {
      const existing = prev.find(b => b.blockType === q.blockType);
      if (existing) {
        return prev.map(b => b.blockType === q.blockType
          ? { ...b, count: b.count + 1, questions: [...b.questions, q] }
          : b,
        );
      }
      return [...prev, { blockType: q.blockType, count: 1, questions: [q] }];
    });
    setShowCreate(false);
  }

  function handleUpdated(q: Question) {
    setBlocks(prev => prev.map(b => ({
      ...b,
      questions: b.questions.map(existing => existing.id === q.id ? q : existing),
    })));
    setEditQuestion(null);
  }

  // ── export ─────────────────────────────────────────────────────────────────
  function handleExport() {
    const token = localStorage.getItem('accessToken') ?? '';
    // Trigger browser download via hidden anchor
    const a = document.createElement('a');
    a.href = '/api/questions/export';
    // Add auth header is not possible on <a> — fetch the blob instead
    fetch('/api/questions/export', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => {
        const url = URL.createObjectURL(blob);
        a.href = url;
        a.download = `aptio-questions-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
      });
  }

  // ── import ─────────────────────────────────────────────────────────────────
  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportMsg('');
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const token = localStorage.getItem('accessToken') ?? '';
      const res = await fetch('/api/questions/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(json),
      });
      const data = await res.json();
      if (data.success) {
        setImportMsg(`Импортировано ${data.data.imported} вопросов`);
        // Reload questions
        const fresh = await apiFetch<{ blocks: Block[]; total: number }>('/api/questions');
        if (fresh.success) setBlocks(fresh.data.blocks);
      } else {
        setImportMsg(`Ошибка: ${data.error}`);
      }
    } catch (err) {
      setImportMsg('Ошибка чтения файла');
    } finally {
      setImporting(false);
      if (importRef.current) importRef.current.value = '';
    }
  }

  const allQuestions = blocks.flatMap(b => b.questions);
  const totalQuestions = allQuestions.length;
  const riskCount = allQuestions.filter(q => q.riskFlag).length;

  const filteredBlocks = blocks
    .map(b => ({
      ...b,
      questions: b.questions.filter(q => {
        if (riskOnly && !q.riskFlag) return false;
        if (!search.trim()) return true;
        const s = search.toLowerCase();
        return q.textRu.toLowerCase().includes(s)
          || q.textUz.toLowerCase().includes(s)
          || q.textEn.toLowerCase().includes(s);
      }),
    }))
    .filter(b => !activeFilter || b.blockType === activeFilter)
    .filter(b => b.questions.length > 0);

  return (
    <div className="min-h-screen p-6 pb-16" style={{ background: 'var(--bg)' }}>
      <div className="fixed top-0 right-0 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.06) 0%, transparent 70%)', filter: 'blur(40px)' }} />

      {/* Header */}
      <motion.div className="mb-8" initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text)]">Банк вопросов</h1>
            <p className="text-[var(--text-2)] mt-1 text-sm">
              {loading ? 'Загрузка...' : `${totalQuestions} вопросов · ${blocks.length} компетенций`}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Hidden file input for import */}
            <input ref={importRef} type="file" accept=".json" className="hidden"
              onChange={handleImportFile} />

            <button onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-all"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-2)' }}>
              ⬇ Экспорт JSON
            </button>

            <button onClick={() => importRef.current?.click()} disabled={importing}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-all disabled:opacity-50"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-2)' }}>
              {importing ? '...' : '⬆ Импорт JSON'}
            </button>

            {['ADMIN', 'SUPERADMIN'].includes(userRole) && (
              <motion.button
                onClick={() => setShowCreateTemplate(true)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-2)' }}
              >
                📋 Новый шаблон
              </motion.button>
            )}

            <motion.button
              onClick={() => setShowCreate(true)}
              whileHover={{ scale: 1.03, boxShadow: '0 8px 24px rgba(37,99,235,0.3)' }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)' }}
            >
              <span>+</span> Новый вопрос
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Import result banner */}
      <AnimatePresence>
        {importMsg && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="mb-4 px-4 py-3 rounded-xl text-sm flex items-center justify-between"
            style={importMsg.startsWith('Ошибка')
              ? { background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }
              : { background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.25)', color: '#34d399' }}>
            {importMsg}
            <button onClick={() => setImportMsg('')} className="ml-4 opacity-60 hover:opacity-100">✕</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats */}
      <motion.div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }}>
        {[
          { label: 'Всего вопросов', value: totalQuestions, icon: '📚', color: '#3b82f6' },
          { label: 'Компетенций',    value: blocks.length,  icon: '🎯', color: '#8b5cf6' },
          { label: 'С вариантами',   value: allQuestions.filter(q => q.optionsJson.length > 0).length, icon: '✅', color: '#10b981' },
          { label: 'Risk Flag',      value: riskCount,      icon: '⚠️', color: '#ef4444' },
        ].map((stat, i) => (
          <motion.div key={stat.label}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 + i * 0.04 }}
            className="rounded-2xl px-4 py-3.5"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="text-xl mb-1">{stat.icon}</div>
            <div className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</div>
            <div className="text-[var(--text-3)] text-xs mt-0.5">{stat.label}</div>
          </motion.div>
        ))}
      </motion.div>

      {/* Search + filters */}
      <motion.div className="mb-6 space-y-3"
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>

        {/* Row 0: scope tabs */}
        <div className="flex rounded-xl overflow-hidden w-fit" style={{ border: '1px solid var(--border)' }}>
          {([['all', 'Все'], ['system', 'Системные'], ['mine', 'Мои']] as [Scope, string][]).map(([key, label]) => (
            <button key={key} onClick={() => { setScope(key); setActiveFilter(null); }}
              className="px-4 py-2 text-xs font-medium transition-all"
              style={scope === key
                ? { background: '#2563eb', color: '#fff' }
                : { background: 'var(--surface)', color: 'var(--text-2)' }}>
              {label}
            </button>
          ))}
        </div>

        {/* Row 1: search + lang switcher + risk toggle */}
        <div className="flex gap-3 flex-wrap items-center">
          <div className="relative flex-1 min-w-48">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-3)] text-sm">🔍</span>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Поиск по всем языкам..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-[var(--text)] placeholder-[var(--text-3)] outline-none transition-all"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }} />
          </div>

          {/* Language preview */}
          <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
            {['ru', 'uz', 'en'].map(lang => (
              <button key={lang} onClick={() => setPreviewLang(lang)}
                className="px-3 py-2 text-xs font-medium transition-all"
                style={previewLang === lang
                  ? { background: '#2563eb', color: '#fff' }
                  : { background: 'var(--surface)', color: 'var(--text-2)' }}>
                {lang.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Risk filter */}
          <button onClick={() => setRiskOnly(v => !v)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all"
            style={riskOnly
              ? { background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', color: '#f87171' }
              : { background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-2)' }}>
            ⚠ Risk only
          </button>
        </div>

        {/* Row 2: category pills */}
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setActiveFilter(null)}
            className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
            style={activeFilter === null
              ? { background: '#2563eb22', border: '1px solid #2563eb60', color: '#60a5fa' }
              : { background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-2)' }}>
            Все ({totalQuestions})
          </button>
          {blocks.map(b => {
            const meta = getBlockMeta(b.blockType);
            return (
              <button key={b.blockType}
                onClick={() => setActiveFilter(b.blockType === activeFilter ? null : b.blockType)}
                className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5"
                style={activeFilter === b.blockType
                  ? { background: meta.color + '22', border: `1px solid ${meta.color}50`, color: meta.color }
                  : { background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-2)' }}>
                <span>{meta.icon}</span>{b.count}
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <motion.div key={i} className="h-16 rounded-2xl"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              animate={{ opacity: [0.4, 0.8, 0.4] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.15 }} />
          ))}
        </div>
      ) : filteredBlocks.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-24 gap-4">
          <motion.div className="text-6xl"
            animate={{ y: [0, -8, 0] }} transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}>
            📋
          </motion.div>
          <p className="text-[var(--text-2)] font-semibold text-lg">
            {search || riskOnly ? 'Ничего не найдено' : 'Банк вопросов пуст'}
          </p>
          <p className="text-[var(--text-3)] text-sm text-center max-w-xs">
            {search ? `По запросу «${search}» ничего не найдено`
              : riskOnly ? 'Нет вопросов с флагом Risk'
              : 'Добавьте первый вопрос'}
          </p>
          {!search && !riskOnly && (
            <motion.button onClick={() => setShowCreate(true)}
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              className="mt-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)' }}>
              + Создать первый вопрос
            </motion.button>
          )}
        </motion.div>
      ) : (
        <div className="space-y-3">
          {filteredBlocks.map((block, i) => (
            <motion.div key={block.blockType}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}>
              <BlockPanel block={block} onDelete={handleDelete}
                onEdit={setEditQuestion} previewLang={previewLang} userRole={userRole} />
            </motion.div>
          ))}
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {showCreate && (
          <CreateModal onClose={() => setShowCreate(false)} onCreated={handleCreated} />
        )}
        {editQuestion && (
          <CreateModal
            key={editQuestion.id}
            initial={editQuestion}
            onClose={() => setEditQuestion(null)}
            onCreated={handleUpdated}
          />
        )}
        {showCreateTemplate && (
          <CreateTemplateModal
            onClose={() => setShowCreateTemplate(false)}
            onCreated={() => setShowCreateTemplate(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Create Template Modal ────────────────────────────────────────────────────
function CreateTemplateModal({ onClose, onCreated }: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name,             setName]             = useState('');
  const [nameUz,           setNameUz]           = useState('');
  const [nameEn,           setNameEn]           = useState('');
  const [industry,         setIndustry]         = useState('');
  const [level,            setLevel]            = useState('linear');
  const [estimatedMinutes, setEstimatedMinutes] = useState(30);
  const [blocks,           setBlocks]           = useState('');
  const [competencies,     setCompetencies]     = useState('');
  const [saving,           setSaving]           = useState(false);
  const [error,            setError]            = useState('');

  const inputCls   = 'w-full px-3 py-2 rounded-xl text-sm text-[var(--text)] placeholder-[var(--text-3)] outline-none transition-all';
  const inputStyle = { background: 'var(--bg)', border: '1px solid var(--border)' };

  async function submit() {
    if (!name.trim()) return setError('Укажите название шаблона');
    if (!industry.trim()) return setError('Укажите отрасль');

    // Parse blocks (comma-separated)
    const blocksJson = blocks.split(',').map(s => s.trim()).filter(Boolean);
    if (blocksJson.length === 0) return setError('Укажите хотя бы один блок');

    // Parse competencies (one per line: key:weight)
    const competenciesJson = competencies.split('\n').map(line => {
      const [key, w] = line.trim().split(':');
      return { key: key?.trim(), weight: parseInt(w?.trim() ?? '2', 10) || 2 };
    }).filter(c => c.key);
    if (competenciesJson.length === 0) return setError('Укажите хотя бы одну компетенцию');

    setSaving(true);
    setError('');
    try {
      const res = await apiFetch('/api/templates', {
        method: 'POST',
        body: JSON.stringify({ name, nameUz, nameEn, industry, level, estimatedMinutes, blocksJson, competenciesJson }),
      });
      if (res.success) {
        onCreated();
      } else {
        setError((res as { success: false; error: string }).error ?? 'Ошибка');
      }
    } catch {
      setError('Ошибка сети');
    } finally {
      setSaving(false);
    }
  }

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        className="relative w-full max-w-lg rounded-2xl flex flex-col"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', maxHeight: '90vh' }}
        initial={{ scale: 0.92, y: 24, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.92, y: 24, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      >
        <div className="px-6 py-4 flex items-center justify-between shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}>
          <h2 className="font-bold text-[var(--text)] text-lg">Новый шаблон должности</h2>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[var(--border)] transition-colors">
            ✕
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="block text-xs text-[var(--text-3)] mb-1">Название (RU) *</label>
              <input value={name} onChange={e => setName(e.target.value)}
                placeholder="Менеджер по продажам" className={inputCls} style={inputStyle} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[var(--text-3)] mb-1">Название (UZ)</label>
                <input value={nameUz} onChange={e => setNameUz(e.target.value)}
                  placeholder="Sotish menejeri" className={inputCls} style={inputStyle} />
              </div>
              <div>
                <label className="block text-xs text-[var(--text-3)] mb-1">Название (EN)</label>
                <input value={nameEn} onChange={e => setNameEn(e.target.value)}
                  placeholder="Sales Manager" className={inputCls} style={inputStyle} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[var(--text-3)] mb-1">Отрасль *</label>
                <input value={industry} onChange={e => setIndustry(e.target.value)}
                  placeholder="Продажи" className={inputCls} style={inputStyle} />
              </div>
              <div>
                <label className="block text-xs text-[var(--text-3)] mb-1">Уровень</label>
                <select value={level} onChange={e => setLevel(e.target.value)}
                  className={inputCls} style={inputStyle}>
                  <option value="linear">Линейный</option>
                  <option value="specialist">Специалист</option>
                  <option value="manager">Менеджер</option>
                  <option value="top">Топ-менеджмент</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs text-[var(--text-3)] mb-1">
                Время (мин): {estimatedMinutes}
              </label>
              <input type="range" min={5} max={180} step={5}
                value={estimatedMinutes} onChange={e => setEstimatedMinutes(Number(e.target.value))}
                className="w-full" />
            </div>
            <div>
              <label className="block text-xs text-[var(--text-3)] mb-1">
                Блоки * <span className="text-[var(--text-3)]">(через запятую, например: SM_SJT, SM_PSS)</span>
              </label>
              <input value={blocks} onChange={e => setBlocks(e.target.value)}
                placeholder="BLOCK_1, BLOCK_2, BLOCK_OPEN" className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className="block text-xs text-[var(--text-3)] mb-1">
                Компетенции * <span className="text-[var(--text-3)]">(одна на строку: ключ:вес)</span>
              </label>
              <textarea value={competencies} onChange={e => setCompetencies(e.target.value)}
                rows={4} placeholder={"sales_skills:3\nnegotiation:2\nstress_resistance:1"}
                className={inputCls} style={{ ...inputStyle, resize: 'none' }} />
              <p className="text-[10px] text-[var(--text-3)] mt-1">Вес: 3=обязательная, 2=важная, 1=опциональная</p>
            </div>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}
        </div>

        <div className="px-6 py-4 flex items-center justify-end gap-3 shrink-0"
          style={{ borderTop: '1px solid var(--border)' }}>
          <button onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[var(--border)] transition-all">
            Отмена
          </button>
          <motion.button onClick={submit} disabled={saving}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            className="px-5 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)' }}>
            {saving ? 'Создаю...' : 'Создать шаблон'}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
