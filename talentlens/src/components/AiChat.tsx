'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Types ────────────────────────────────────────────────────────────────────

type Role = 'user' | 'assistant';

interface Message {
  id: string;
  role: Role;
  content: string;
  pending?: boolean; // streaming in progress
}

// ─── Suggested prompts ────────────────────────────────────────────────────────

const SUGGESTIONS = [
  'Как интерпретировать низкий балл по лидерству?',
  'Составь вопросы для интервью по компетенции «стрессоустойчивость»',
  'Что значит флаг «fast_answers»?',
  'Сравни двух кандидатов с разными профилями',
];

// ─── Markdown-lite renderer ───────────────────────────────────────────────────
// Handles **bold**, `code`, and newlines — no external dep needed.
function MdText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return (
    <span>
      {parts.map((p, i) => {
        if (p.startsWith('**') && p.endsWith('**'))
          return <strong key={i}>{p.slice(2, -2)}</strong>;
        if (p.startsWith('`') && p.endsWith('`'))
          return <code key={i} className="font-mono text-xs px-1 py-0.5 rounded"
            style={{ background: 'rgba(255,255,255,0.1)' }}>{p.slice(1, -1)}</code>;
        return <span key={i}>{p}</span>;
      })}
    </span>
  );
}

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user';
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}
    >
      {!isUser && (
        <div className="w-7 h-7 rounded-xl mr-2 shrink-0 flex items-center justify-center text-xs font-bold"
          style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)', marginTop: 2 }}>
          A
        </div>
      )}
      <div
        className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
          isUser ? 'rounded-tr-sm' : 'rounded-tl-sm'
        }`}
        style={isUser
          ? { background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: '#fff' }
          : { background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.88)', border: '1px solid rgba(255,255,255,0.1)' }
        }
      >
        {msg.pending ? (
          <span className="flex items-center gap-1.5">
            {[0, 1, 2].map(i => (
              <motion.span key={i} className="w-1.5 h-1.5 rounded-full bg-white/60 inline-block"
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 0.7, delay: i * 0.15, repeat: Infinity }} />
            ))}
          </span>
        ) : (
          msg.content.split('\n').map((line, i) => (
            <span key={i}>{i > 0 && <br />}<MdText text={line} /></span>
          ))
        )}
      </div>
    </motion.div>
  );
}

// ─── Main widget ──────────────────────────────────────────────────────────────

export default function AiChat() {
  const [open,      setOpen]      = useState(false);
  const [messages,  setMessages]  = useState<Message[]>([]);
  const [input,     setInput]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [locked,    setLocked]    = useState(false); // plan gate
  const [lockMsg,   setLockMsg]   = useState('');
  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLTextAreaElement>(null);
  const abortRef   = useRef<AbortController | null>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  const send = useCallback(async (text: string) => {
    const content = text.trim();
    if (!content || loading) return;
    setInput('');
    setError('');

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content };
    const pendingMsg: Message = { id: crypto.randomUUID(), role: 'assistant', content: '', pending: true };

    setMessages(prev => [...prev, userMsg, pendingMsg]);
    setLoading(true);

    const history = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }));

    abortRef.current = new AbortController();

    try {
      const token = localStorage.getItem('accessToken') ?? '';
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ messages: history }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        if (res.status === 403) {
          setLocked(true);
          setLockMsg(json.error ?? 'AI-ассистент недоступен на вашем плане.');
        } else {
          setError(json.error ?? `Ошибка ${res.status}`);
        }
        setMessages(prev => prev.filter(m => m.id !== pendingMsg.id));
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setMessages(prev => prev.map(m =>
          m.id === pendingMsg.id ? { ...m, content: accumulated, pending: false } : m,
        ));
      }

      // Ensure pending=false even if stream closed with no data
      setMessages(prev => prev.map(m =>
        m.id === pendingMsg.id ? { ...m, pending: false } : m,
      ));
    } catch (e: unknown) {
      if ((e as { name?: string }).name === 'AbortError') return;
      setError('Ошибка сети. Проверьте соединение.');
      setMessages(prev => prev.filter(m => m.id !== pendingMsg.id));
    } finally {
      setLoading(false);
    }
  }, [loading, messages]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  function clearChat() {
    abortRef.current?.abort();
    setMessages([]);
    setError('');
    setLocked(false);
    setLockMsg('');
  }

  const hasMessages = messages.length > 0;

  return (
    <>
      {/* ── Floating button ───────────────────────────────────────────────── */}
      <motion.button
        onClick={() => setOpen(v => !v)}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl"
        style={{
          background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
          boxShadow: '0 8px 32px rgba(37,99,235,0.45)',
        }}
        aria-label="AI Ассистент"
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.span key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}
              className="text-white text-xl font-light">✕</motion.span>
          ) : (
            <motion.span key="icon" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}
              className="text-white text-2xl">✦</motion.span>
          )}
        </AnimatePresence>
        {/* Pulse ring */}
        {!open && (
          <motion.div className="absolute inset-0 rounded-2xl"
            animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeOut' }}
            style={{ background: 'rgba(37,99,235,0.4)' }} />
        )}
      </motion.button>

      {/* ── Chat panel ───────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.93 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.93 }}
            transition={{ type: 'spring', stiffness: 340, damping: 28 }}
            className="fixed bottom-24 right-6 z-50 w-[380px] max-w-[calc(100vw-24px)] flex flex-col rounded-2xl overflow-hidden"
            style={{
              height: 520,
              background: 'linear-gradient(160deg, #0d1525 0%, #0a1020 100%)',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
            }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3.5 shrink-0"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0"
                style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)' }}>
                A
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white text-sm font-semibold">Aptio AI</div>
                <div className="text-white/30 text-[10px]">HR-ассистент · powered by Claude</div>
              </div>
              {hasMessages && (
                <button onClick={clearChat}
                  className="text-white/25 hover:text-white/60 text-xs transition-colors px-2 py-1 rounded-lg hover:bg-white/5">
                  Очистить
                </button>
              )}
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-0">
              {locked ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-4">
                  <div className="text-4xl">🔒</div>
                  <p className="text-white/50 text-sm">{lockMsg}</p>
                  <a href="/dashboard/settings"
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-white"
                    style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)' }}>
                    Обновить тариф
                  </a>
                </div>
              ) : !hasMessages ? (
                <div className="flex flex-col h-full">
                  {/* Welcome */}
                  <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-2">
                    <motion.div className="text-3xl"
                      animate={{ y: [0, -6, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}>
                      ✦
                    </motion.div>
                    <p className="text-white/60 text-sm font-medium">Привет! Чем могу помочь?</p>
                    <p className="text-white/25 text-xs leading-relaxed">
                      Интерпретирую оценки, составляю вопросы, анализирую компетенции.
                    </p>
                  </div>
                  {/* Suggestions */}
                  <div className="space-y-2 pb-1">
                    {SUGGESTIONS.map(s => (
                      <button key={s} onClick={() => send(s)}
                        className="w-full text-left px-3 py-2.5 rounded-xl text-xs text-white/50 hover:text-white/80 transition-all"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {messages.map(msg => <MessageBubble key={msg.id} msg={msg} />)}
                  <div ref={bottomRef} />
                </>
              )}
            </div>

            {/* Error banner */}
            <AnimatePresence>
              {error && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="px-4 py-2 text-xs text-red-400 shrink-0"
                  style={{ background: 'rgba(239,68,68,0.08)', borderTop: '1px solid rgba(239,68,68,0.2)' }}>
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Input */}
            {!locked && (
              <div className="px-3 py-3 shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="flex items-end gap-2 rounded-xl px-3 py-2"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Спросить что-нибудь... (Enter — отправить)"
                    rows={1}
                    disabled={loading}
                    className="flex-1 bg-transparent text-white/80 text-sm placeholder:text-white/20 resize-none outline-none leading-relaxed disabled:opacity-50"
                    style={{ maxHeight: 96, minHeight: 24 }}
                    onInput={e => {
                      const t = e.currentTarget;
                      t.style.height = 'auto';
                      t.style.height = `${Math.min(t.scrollHeight, 96)}px`;
                    }}
                  />
                  <motion.button
                    onClick={() => send(input)}
                    disabled={!input.trim() || loading}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all disabled:opacity-30"
                    style={{ background: input.trim() && !loading ? 'linear-gradient(135deg, #2563eb, #7c3aed)' : 'rgba(255,255,255,0.08)' }}
                  >
                    {loading ? (
                      <svg className="animate-spin w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                    ) : (
                      <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M22 2L11 13" /><path d="M22 2L15 22l-4-9-9-4 20-7z" />
                      </svg>
                    )}
                  </motion.button>
                </div>
                <p className="text-white/15 text-[10px] text-center mt-1.5">Shift+Enter — новая строка</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
