'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiFetch } from '@/lib/client-fetch';

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
  orderIndex: number;
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

// ─── Create Question Modal ────────────────────────────────────────────────────
interface CreateModalProps {
  onClose: () => void;
  onCreated: (q: Question) => void;
}

function CreateModal({ onClose, onCreated }: CreateModalProps) {
  const [blockType,   setBlockType]   = useState('');
  const [textRu,      setTextRu]      = useState('');
  const [options,     setOptions]     = useState([
    { textRu: '', textEn: '', textUz: '' },
    { textRu: '', textEn: '', textUz: '' },
    { textRu: '', textEn: '', textUz: '' },
    { textRu: '', textEn: '', textUz: '' },
  ]);
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  function updateOption(i: number, field: 'textRu' | 'textEn' | 'textUz', val: string) {
    setOptions(prev => prev.map((o, idx) => idx === i ? { ...o, [field]: val } : o));
  }

  function addOption() {
    if (options.length >= 6) return;
    setOptions(prev => [...prev, { textRu: '', textEn: '', textUz: '' }]);
  }

  function removeOption(i: number) {
    if (options.length <= 2) return;
    setOptions(prev => prev.filter((_, idx) => idx !== i));
  }

  async function submit() {
    if (!blockType.trim()) return setError('Укажите тип блока');
    if (!textRu.trim())    return setError('Введите текст вопроса');
    const filledOptions = options.filter(o => o.textRu.trim());
    if (filledOptions.length < 2) return setError('Нужно минимум 2 варианта ответа');

    setSaving(true);
    setError('');
    try {
      const res = await apiFetch<Question>('/api/questions', {
        method: 'POST',
        body: JSON.stringify({ blockType: blockType.toLowerCase().trim(), textRu, optionsJson: filledOptions }),
      });
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

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        className="relative w-full max-w-2xl rounded-2xl overflow-hidden"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        initial={{ scale: 0.92, y: 24, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.92, y: 24, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      >
        {/* Header */}
        <div className="px-6 py-5 flex items-center justify-between"
          style={{ borderBottom: '1px solid var(--border)' }}>
          <div>
            <h2 className="font-bold text-[var(--text)] text-lg">Новый вопрос</h2>
            <p className="text-[var(--text-2)] text-sm mt-0.5">Добавьте вопрос в банк</p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[var(--border)] transition-colors text-lg">
            ✕
          </button>
        </div>

        <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Block type */}
          <div>
            <label className="text-[var(--text-2)] text-xs font-medium uppercase tracking-wider block mb-2">
              Тип компетенции
            </label>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(BLOCK_CONFIG).filter(([k]) => k !== 'open_text').map(([key, meta]) => (
                <button
                  key={key}
                  onClick={() => setBlockType(key)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium transition-all text-left"
                  style={blockType === key
                    ? { background: meta.color + '22', border: `1.5px solid ${meta.color}60`, color: meta.color }
                    : { background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-2)' }
                  }
                >
                  <span>{meta.icon}</span>
                  <span className="truncate">{meta.label}</span>
                </button>
              ))}
              <button
                onClick={() => setBlockType('open_text')}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium transition-all text-left"
                style={blockType === 'open_text'
                  ? { background: '#94a3b822', border: '1.5px solid #94a3b860', color: '#94a3b8' }
                  : { background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-2)' }
                }
              >
                <span>📝</span>
                <span>Открытый</span>
              </button>
            </div>
          </div>

          {/* Question text */}
          <div>
            <label className="text-[var(--text-2)] text-xs font-medium uppercase tracking-wider block mb-2">
              Текст вопроса (RU)
            </label>
            <textarea
              value={textRu}
              onChange={e => setTextRu(e.target.value)}
              placeholder="Опишите ситуацию или задайте вопрос..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl text-sm text-[var(--text)] placeholder-[var(--text-3)] resize-none outline-none transition-all"
              style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
            />
          </div>

          {/* Options */}
          {blockType !== 'open_text' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[var(--text-2)] text-xs font-medium uppercase tracking-wider">
                  Варианты ответов
                </label>
                <button
                  onClick={addOption}
                  disabled={options.length >= 6}
                  className="text-blue-400 hover:text-blue-300 text-xs font-medium transition-colors disabled:opacity-30"
                >
                  + Добавить
                </button>
              </div>
              <div className="space-y-2">
                <AnimatePresence>
                  {options.map((opt, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 8, height: 0, marginTop: 0 }}
                      className="flex items-center gap-2"
                    >
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                        style={{ background: 'var(--border)', color: 'var(--text-2)' }}>
                        {String.fromCharCode(65 + i)}
                      </div>
                      <input
                        value={opt.textRu}
                        onChange={e => updateOption(i, 'textRu', e.target.value)}
                        placeholder={`Вариант ${String.fromCharCode(65 + i)}`}
                        className="flex-1 px-3 py-2 rounded-lg text-sm text-[var(--text)] placeholder-[var(--text-3)] outline-none transition-all"
                        style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
                      />
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

          {error && (
            <motion.p
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="text-red-400 text-sm px-1"
            >
              {error}
            </motion.p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 flex items-center justify-end gap-3"
          style={{ borderTop: '1px solid var(--border)' }}>
          <button onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[var(--border)] transition-all">
            Отмена
          </button>
          <motion.button
            onClick={submit}
            disabled={saving}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            className="px-5 py-2 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)' }}
          >
            {saving ? 'Сохраняю...' : 'Создать вопрос'}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Question Card ────────────────────────────────────────────────────────────
function QuestionCard({ question, onDelete, index }: { question: Question; onDelete: (id: string) => void; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const options = question.optionsJson as Option[];

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
          {question.textRu}
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-[var(--text-3)]">
            {options.length} вар.
          </span>
          <motion.span
            className="text-[var(--text-3)] text-xs"
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
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
            <div className="px-4 pb-4 pt-1 space-y-3" style={{ borderTop: '1px solid var(--border)' }}>
              {/* Options */}
              {options.length > 0 && (
                <div className="space-y-1.5">
                  {options.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2.5">
                      <div className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0"
                        style={{ background: 'var(--surface)', color: 'var(--text-2)' }}>
                        {String.fromCharCode(65 + i)}
                      </div>
                      <span className="text-sm text-[var(--text-2)]">{opt.textRu}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Scoring info */}
              {(question.scoringJson as ScoringEntry[]).length > 0 && (
                <div>
                  <p className="text-[var(--text-3)] text-xs uppercase tracking-wider mb-1.5">Компетенции</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(question.scoringJson as ScoringEntry[]).map((s, i) => {
                      const meta = getBlockMeta(s.competency);
                      return (
                        <span key={i}
                          className="text-xs px-2 py-0.5 rounded-md font-medium"
                          style={{ background: meta.color + '20', color: meta.color }}>
                          {meta.label}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Delete */}
              <div className="flex justify-end pt-1">
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="text-xs text-[var(--text-3)] hover:text-red-400 transition-colors disabled:opacity-40 flex items-center gap-1"
                >
                  {deleting ? '...' : '🗑 Удалить'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Block Panel ──────────────────────────────────────────────────────────────
function BlockPanel({ block, onDelete }: { block: Block; onDelete: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const meta = getBlockMeta(block.blockType);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden"
      style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}
    >
      {/* Block header */}
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
          <p className="text-[var(--text-3)] text-xs mt-0.5">{block.count} вопросов</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Mini score bar */}
          <div className="hidden sm:flex gap-0.5">
            {block.questions.slice(0, 8).map((_, i) => (
              <div key={i} className="w-1.5 h-4 rounded-full"
                style={{ background: meta.color + '40' }} />
            ))}
            {block.count > 8 && <span className="text-[var(--text-3)] text-[10px] ml-1">+{block.count - 8}</span>}
          </div>
          <motion.span
            className="text-[var(--text-3)]"
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.25 }}
          >
            ▾
          </motion.span>
        </div>
      </button>

      {/* Questions list */}
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
                <p className="text-[var(--text-3)] text-sm text-center py-4">
                  Нет вопросов в этом блоке
                </p>
              ) : (
                block.questions.map((q, i) => (
                  <QuestionCard key={q.id} question={q} onDelete={onDelete} index={i} />
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
export default function TemplatesPage() {
  const [blocks,      setBlocks]      = useState<Block[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState('');
  const [showCreate,  setShowCreate]  = useState(false);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await apiFetch<{ blocks: Block[]; total: number }>('/api/questions');
        if (res.success) setBlocks(res.data.blocks);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function handleDelete(id: string) {
    setBlocks(prev => prev
      .map(b => ({ ...b, questions: b.questions.filter(q => q.id !== id) }))
      .map(b => ({ ...b, count: b.questions.length }))
      .filter(b => b.count > 0)
    );
  }

  function handleCreated(q: Question) {
    setBlocks(prev => {
      const existing = prev.find(b => b.blockType === q.blockType);
      if (existing) {
        return prev.map(b => b.blockType === q.blockType
          ? { ...b, count: b.count + 1, questions: [...b.questions, q] }
          : b
        );
      }
      return [...prev, { blockType: q.blockType, count: 1, questions: [q] }];
    });
    setShowCreate(false);
  }

  const totalQuestions = blocks.reduce((s, b) => s + b.count, 0);

  const filteredBlocks = blocks
    .filter(b => !activeFilter || b.blockType === activeFilter)
    .filter(b => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return b.blockType.includes(q)
        || getBlockMeta(b.blockType).label.toLowerCase().includes(q)
        || b.questions.some(question => question.textRu.toLowerCase().includes(q));
    });

  return (
    <div className="min-h-screen p-6 pb-16" style={{ background: 'var(--bg)' }}>
      {/* Ambient glow */}
      <div className="fixed top-0 right-0 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.06) 0%, transparent 70%)', filter: 'blur(40px)' }} />

      {/* Header */}
      <motion.div
        className="mb-8"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text)]">Банк вопросов</h1>
            <p className="text-[var(--text-2)] mt-1 text-sm">
              {loading ? 'Загрузка...' : `${totalQuestions} вопросов · ${blocks.length} компетенций`}
            </p>
          </div>
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
      </motion.div>

      {/* Search + filter */}
      <motion.div
        className="mb-6 flex gap-3 flex-wrap"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <div className="relative flex-1 min-w-48">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-3)] text-sm">🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Поиск по вопросам..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-[var(--text)] placeholder-[var(--text-3)] outline-none transition-all"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          />
        </div>

        {/* Category filter pills */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setActiveFilter(null)}
            className="px-3 py-2 rounded-xl text-xs font-medium transition-all"
            style={activeFilter === null
              ? { background: '#2563eb22', border: '1px solid #2563eb60', color: '#60a5fa' }
              : { background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-2)' }
            }
          >
            Все ({totalQuestions})
          </button>
          {blocks.map(b => {
            const meta = getBlockMeta(b.blockType);
            return (
              <button
                key={b.blockType}
                onClick={() => setActiveFilter(b.blockType === activeFilter ? null : b.blockType)}
                className="px-3 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5"
                style={activeFilter === b.blockType
                  ? { background: meta.color + '22', border: `1px solid ${meta.color}50`, color: meta.color }
                  : { background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-2)' }
                }
              >
                <span>{meta.icon}</span>
                {b.count}
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* Stats row */}
      <motion.div
        className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        {[
          { label: 'Всего вопросов',   value: totalQuestions,  icon: '📚', color: '#3b82f6' },
          { label: 'Компетенций',       value: blocks.length,   icon: '🎯', color: '#8b5cf6' },
          { label: 'С вариантами',      value: blocks.flatMap(b => b.questions).filter(q => (q.optionsJson as Option[]).length > 0).length, icon: '✅', color: '#10b981' },
          { label: 'Открытых',          value: blocks.find(b => b.blockType === 'open_text')?.count ?? 0, icon: '📝', color: '#f59e0b' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.04 }}
            className="rounded-2xl px-4 py-3.5"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <div className="text-xl mb-1">{stat.icon}</div>
            <div className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</div>
            <div className="text-[var(--text-3)] text-xs mt-0.5">{stat.label}</div>
          </motion.div>
        ))}
      </motion.div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <motion.div
              key={i}
              className="h-16 rounded-2xl"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              animate={{ opacity: [0.4, 0.8, 0.4] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.15 }}
            />
          ))}
        </div>
      ) : filteredBlocks.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-24 gap-4"
        >
          <motion.div
            className="text-6xl"
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            📋
          </motion.div>
          <p className="text-[var(--text-2)] font-semibold text-lg">
            {search ? 'Ничего не найдено' : 'Банк вопросов пуст'}
          </p>
          <p className="text-[var(--text-3)] text-sm text-center max-w-xs">
            {search
              ? `По запросу "${search}" ничего не найдено`
              : 'Добавьте первый вопрос, нажав кнопку "Новый вопрос"'
            }
          </p>
          {!search && (
            <motion.button
              onClick={() => setShowCreate(true)}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              className="mt-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)' }}
            >
              + Создать первый вопрос
            </motion.button>
          )}
        </motion.div>
      ) : (
        <div className="space-y-3">
          {filteredBlocks.map((block, i) => (
            <motion.div
              key={block.blockType}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <BlockPanel block={block} onDelete={handleDelete} />
            </motion.div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <AnimatePresence>
        {showCreate && (
          <CreateModal onClose={() => setShowCreate(false)} onCreated={handleCreated} />
        )}
      </AnimatePresence>
    </div>
  );
}
