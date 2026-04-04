'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

// ── Types ─────────────────────────────────────────────────────────────────────

type Lang = 'ru' | 'uz' | 'en';

interface Option {
  textRu: string;
  textUz: string;
  textEn: string;
}

interface Question {
  id: string;
  blockType: string;
  textRu: string;
  textUz: string;
  textEn: string;
  optionsJson: Option[];
}

interface TestData {
  assessmentId: string;
  candidateName: string;
  estimatedMinutes: number;
  blocks: string[];
  questions: Question[];
  language: Lang | null;
  alreadyStarted: boolean;
  allowBack?: boolean;
  allowChangeAnswer?: boolean;
}

interface Answer {
  questionId: string;
  selectedOption: number;
  textAnswer?: string;
  answeredAt: string;
  responseMs: number;
  changeCount?: number;
  backNavigations?: number;
}

type Phase = 'loading' | 'error' | 'expired' | 'completed' | 'language' | 'instructions' | 'testing' | 'finished';

// ── i18n ─────────────────────────────────────────────────────────────────────

const T = {
  ru: {
    chooseLanguage: 'Выберите язык',
    start: 'Начать тест',
    instructions_title: 'Инструкция',
    instructions_body: 'Вас ждёт несколько блоков заданий. Для каждого блока есть таймер. Отвечайте честно — правильных и неправильных ответов нет. Не закрывайте эту вкладку в процессе.',
    estimated: 'Примерное время',
    minutes: 'мин',
    next: 'Далее',
    back: 'Назад',
    finish: 'Завершить',
    thanks_title: 'Спасибо!',
    thanks_body: 'Ваши ответы успешно записаны. Результаты будут переданы HR-специалисту.',
    block: 'Блок',
    timeLeft: 'Осталось',
    noQuestions: 'Вопросы ещё не загружены.',
    expired: 'Ссылка истекла или недействительна.',
    alreadyDone: 'Тест уже пройден. Спасибо!',
    error: 'Произошла ошибка.',
    question: 'Вопрос',
    of: 'из',
    writeAnswer: 'Введите ваш ответ...',
  },
  uz: {
    chooseLanguage: "Tilni tanlang",
    start: "Testni boshlash",
    instructions_title: "Ko'rsatma",
    instructions_body: "Sizni bir necha blok topshiriqlar kutmoqda. Har bir blok uchun taymer mavjud. Halol javob bering. Jarayon davomida ushbu sahifani yopmang.",
    estimated: "Taxminiy vaqt",
    minutes: "daqiqa",
    next: "Keyingisi",
    back: "Orqaga",
    finish: "Tugatish",
    thanks_title: "Rahmat!",
    thanks_body: "Javoblaringiz muvaffaqiyatli saqlandi.",
    block: "Blok",
    timeLeft: "Qoldi",
    noQuestions: "Savollar yuklanmagan.",
    expired: "Havola muddati tugagan.",
    alreadyDone: "Test allaqachon topshirilgan.",
    error: "Xatolik yuz berdi.",
    question: "Savol",
    of: "/",
    writeAnswer: "Javobingizni yozing...",
  },
  en: {
    chooseLanguage: 'Choose Language',
    start: 'Start Test',
    instructions_title: 'Instructions',
    instructions_body: 'You will complete several task blocks. Each block has a timer. Answer honestly. Do not close this tab during the test.',
    estimated: 'Estimated time',
    minutes: 'min',
    next: 'Next',
    back: 'Back',
    finish: 'Finish',
    thanks_title: 'Thank you!',
    thanks_body: 'Your answers have been recorded.',
    block: 'Block',
    timeLeft: 'Time left',
    noQuestions: 'Questions not loaded.',
    expired: 'This link has expired or is invalid.',
    alreadyDone: 'You have already completed this test.',
    error: 'An error occurred.',
    question: 'Question',
    of: 'of',
    writeAnswer: 'Type your answer here...',
  },
};

function getText(q: Question, lang: Lang) {
  return lang === 'uz' ? q.textUz : lang === 'en' ? q.textEn : q.textRu;
}
function getOption(o: Option, lang: Lang) {
  return lang === 'uz' ? o.textUz : lang === 'en' ? o.textEn : o.textRu;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function timerColor(pct: number) {
  if (pct > 0.5) return 'text-emerald-500';
  if (pct > 0.2) return 'text-amber-500';
  return 'text-red-500';
}

const SECS_PER_QUESTION = 45;
const AUTOSAVE_EVERY    = 5;
const LONG_PAUSE_MS     = 60_000; // 60 s = suspicious pause

// ── Component ─────────────────────────────────────────────────────────────────

export default function TestPage() {
  const { uuid } = useParams<{ uuid: string }>();

  const [phase,      setPhase]      = useState<Phase>('loading');
  const [lang,       setLang]       = useState<Lang>('ru');
  const [testData,   setTestData]   = useState<TestData | null>(null);
  const [questions,  setQuestions]  = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers,    setAnswers]    = useState<Answer[]>([]);
  const [selected,   setSelected]  = useState<number | null>(null);
  const [textAnswer, setTextAnswer] = useState('');
  const [direction,  setDirection] = useState<1 | -1>(1);
  const [tabSwitches, setTabSwitches] = useState(0);
  const [timeLeft,    setTimeLeft]    = useState(0);
  const [blockTimeTotal, setBlockTimeTotal] = useState(0);
  const [errorMsg,  setErrorMsg]   = useState('');

  // Red flag tracking refs
  const questionShownAt  = useRef(Date.now());
  const tabSwitchRef     = useRef(0);
  const answerChangesRef = useRef<Record<string, number>>({});  // questionId -> change count
  const backNavRef       = useRef(0);
  const longPausesRef    = useRef(0);
  const timerRef         = useRef<ReturnType<typeof setInterval> | null>(null);
  const answersRef       = useRef<Answer[]>([]);

  const t = T[lang];

  // ── Load ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    fetch(`/api/test/${uuid}`)
      .then((r) => r.json())
      .then((res) => {
        if (!res.success) {
          if (res.error?.includes('expired')) { setPhase('expired'); return; }
          setErrorMsg(res.error ?? 'Error'); setPhase('error'); return;
        }
        if (res.data.status === 'completed') { setPhase('completed'); return; }
        setTestData(res.data);
        if (res.data.language) setLang(res.data.language as Lang);
        setPhase('language');
      })
      .catch(() => { setPhase('error'); setErrorMsg('Network error'); });
  }, [uuid]);

  // ── Tab switch (§TEST-07) ─────────────────────────────────────────────────

  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'hidden') {
        tabSwitchRef.current += 1;
        setTabSwitches(tabSwitchRef.current);
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, []);

  // ── Build question list ───────────────────────────────────────────────────

  const startTesting = useCallback((td: TestData) => {
    const qs = td.blocks.flatMap((blockType) => {
      const blockQs = td.questions.filter((q) => q.blockType === blockType);
      return shuffle(blockQs);
    });
    setQuestions(qs);
    setCurrentIdx(0);
    setAnswers([]);
    answersRef.current = [];

    const firstBlockSize = qs.filter((q) => q.blockType === td.blocks[0]).length;
    const secs = firstBlockSize * SECS_PER_QUESTION;
    setTimeLeft(secs);
    setBlockTimeTotal(secs);

    questionShownAt.current = Date.now();
    setPhase('testing');
  }, []);

  // ── Start API ─────────────────────────────────────────────────────────────

  async function handleStart() {
    if (!testData) return;
    const res = await fetch(`/api/test/${uuid}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language: lang }),
    });
    const json = await res.json();
    if (!json.success) { setErrorMsg(json.error); setPhase('error'); return; }
    startTesting(testData);
  }

  // ── Timer ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (phase !== 'testing') return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { goNext(true); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, currentIdx]);

  // ── Auto-save (§TEST-08) ──────────────────────────────────────────────────

  useEffect(() => {
    if (answers.length > 0 && answers.length % AUTOSAVE_EVERY === 0) {
      fetch(`/api/test/${uuid}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers, tabSwitches: tabSwitchRef.current }),
      });
    }
  }, [answers, uuid]);

  // ── Option select ─────────────────────────────────────────────────────────

  function handleSelect(optionIdx: number) {
    const qId = questions[currentIdx]?.id;
    if (qId && selected !== null && selected !== optionIdx) {
      // Track answer change
      answerChangesRef.current[qId] = (answerChangesRef.current[qId] ?? 0) + 1;
    }
    setSelected(optionIdx);
  }

  // ── Record current answer into answers array ──────────────────────────────

  function commitAnswer(autoAdvance = false): Answer[] {
    if (timerRef.current) clearInterval(timerRef.current);

    const q = questions[currentIdx];
    const responseMs = Date.now() - questionShownAt.current;

    // Long pause flag
    if (responseMs > LONG_PAUSE_MS) longPausesRef.current += 1;

    const isOpenText = q.optionsJson.length === 0;
    const answer: Answer = {
      questionId: q.id,
      selectedOption: isOpenText ? -1 : (selected ?? 0),
      ...(isOpenText ? { textAnswer: textAnswer.trim() } : {}),
      answeredAt: new Date().toISOString(),
      responseMs,
      changeCount:     answerChangesRef.current[q.id] ?? 0,
      backNavigations: backNavRef.current,
    };

    // Upsert: replace existing answer for this question if going back
    const existing = answersRef.current.findIndex((a) => a.questionId === q.id);
    let newAnswers: Answer[];
    if (existing >= 0) {
      newAnswers = [...answersRef.current];
      newAnswers[existing] = answer;
    } else {
      newAnswers = [...answersRef.current, answer];
    }
    answersRef.current = newAnswers;
    setAnswers(newAnswers);
    return newAnswers;
  }

  // ── Restore state when navigating back ───────────────────────────────────

  function restoreQuestion(idx: number) {
    const q = questions[idx];
    const prev = answersRef.current.find((a) => a.questionId === q?.id);
    if (prev) {
      if (q.optionsJson.length === 0) {
        setSelected(null);
        setTextAnswer(prev.textAnswer ?? '');
      } else {
        setSelected(prev.selectedOption >= 0 ? prev.selectedOption : null);
        setTextAnswer('');
      }
    } else {
      setSelected(null);
      setTextAnswer('');
    }
  }

  // ── Go back ───────────────────────────────────────────────────────────────

  function goBack() {
    if (currentIdx === 0) return;
    commitAnswer();
    backNavRef.current += 1;
    const prevIdx = currentIdx - 1;
    setDirection(-1);
    setCurrentIdx(prevIdx);
    questionShownAt.current = Date.now();
    restoreQuestion(prevIdx);
  }

  // ── Go next ───────────────────────────────────────────────────────────────

  function goNext(autoAdvance = false) {
    const newAnswers = commitAnswer(autoAdvance);
    setSelected(null);
    setTextAnswer('');

    const nextIdx = currentIdx + 1;
    if (nextIdx >= questions.length) { finishTest(newAnswers); return; }

    setDirection(1);
    setCurrentIdx(nextIdx);
    questionShownAt.current = Date.now();
    restoreQuestion(nextIdx);

    // Reset block timer if block changes
    const prevBlock = questions[currentIdx].blockType;
    const nextBlock = questions[nextIdx].blockType;
    if (nextBlock !== prevBlock && testData) {
      const blockQs = questions.filter((q) => q.blockType === nextBlock);
      const secs = blockQs.length * SECS_PER_QUESTION;
      setTimeLeft(secs);
      setBlockTimeTotal(secs);
    }
  }

  // ── Finish ────────────────────────────────────────────────────────────────

  async function finishTest(finalAnswers: Answer[]) {
    setPhase('loading');
    await fetch(`/api/test/${uuid}/finish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        answers: finalAnswers,
        tabSwitches: tabSwitchRef.current,
        totalBackNavigations: backNavRef.current,
        totalLongPauses:      longPausesRef.current,
      }),
    });
    setPhase('finished');
  }

  // ── Derived ───────────────────────────────────────────────────────────────

  const progress   = questions.length > 0 ? (currentIdx / questions.length) : 0;
  const q          = questions[currentIdx];
  const blockIdx   = testData ? testData.blocks.indexOf(q?.blockType) + 1 : 0;
  const totalBlocks = testData?.blocks.length ?? 0;
  const timerPct   = blockTimeTotal > 0 ? timeLeft / blockTimeTotal : 1;
  const allowBack  = testData?.allowBack !== false;

  function fmt(s: number) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  }

  // ── Phase renders ─────────────────────────────────────────────────────────

  if (phase === 'loading') return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
      <div className="flex flex-col items-center gap-3">
        <svg className="animate-spin w-8 h-8 text-blue-500" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
        </svg>
        <p className="text-sm text-[var(--text-muted)]">Загрузка...</p>
      </div>
    </div>
  );

  if (phase === 'expired')   return <InfoScreen text={T.ru.expired} />;
  if (phase === 'completed') return <ThanksScreen t={T[lang]} />;
  if (phase === 'finished')  return <ThanksScreen t={t} />;
  if (phase === 'error')     return <InfoScreen text={errorMsg || T.ru.error} />;

  // ── Language ──────────────────────────────────────────────────────────────

  if (phase === 'language') return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm bg-[var(--surface)] border border-[var(--border-strong)] rounded-2xl shadow-xl p-8 text-center">
        <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-600/25">
          <span className="text-white text-xl font-bold">T</span>
        </div>
        <h1 className="text-lg font-semibold text-[var(--text)] mb-6">
          {T.ru.chooseLanguage} / {T.uz.chooseLanguage} / {T.en.chooseLanguage}
        </h1>
        <div className="space-y-2">
          {([['ru', 'Русский', '🇷🇺'], ['uz', "O'zbekcha", '🇺🇿'], ['en', 'English', '🇬🇧']] as const).map(([l, label, flag]) => (
            <motion.button
              key={l}
              whileTap={{ scale: 0.98 }}
              onClick={() => { setLang(l); setPhase('instructions'); }}
              className="w-full flex items-center gap-3 py-3 px-4 rounded-xl border-2 border-[var(--border-strong)] hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-[var(--text)] font-medium transition-all"
            >
              <span className="text-xl">{flag}</span>
              {label}
            </motion.button>
          ))}
        </div>
      </motion.div>
    </div>
  );

  // ── Instructions ──────────────────────────────────────────────────────────

  if (phase === 'instructions') {
    const hasQ = (testData?.questions.length ?? 0) > 0;
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] p-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md bg-[var(--surface)] border border-[var(--border-strong)] rounded-2xl shadow-xl p-8">
          <h1 className="text-xl font-semibold text-[var(--text)] mb-3">{t.instructions_title}</h1>
          <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-4">{t.instructions_body}</p>
          <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl px-4 py-3 mb-6 text-sm text-blue-700 dark:text-blue-400">
            <span>🕐</span>
            <span>{t.estimated}: ~{testData?.estimatedMinutes ?? 30} {t.minutes}</span>
          </div>
          {!hasQ && <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">{t.noQuestions}</p>}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleStart}
            disabled={!hasQ}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-semibold py-3 rounded-xl transition-colors shadow-lg shadow-blue-600/25"
          >
            {t.start}
          </motion.button>
        </motion.div>
      </div>
    );
  }

  // ── Testing ───────────────────────────────────────────────────────────────

  if (phase === 'testing' && q) {
    const isOpenText   = q.optionsJson.length === 0;
    const canProceed   = isOpenText ? textAnswer.trim().length > 0 : selected !== null;
    const isLast       = currentIdx + 1 >= questions.length;

    return (
      <div className="min-h-screen bg-[var(--bg)] flex flex-col">
        {/* Progress bar */}
        <div className="h-1 bg-[var(--border-strong)] fixed top-0 left-0 right-0 z-10">
          <motion.div
            className="h-full bg-blue-500"
            initial={false}
            animate={{ width: `${progress * 100}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>

        {/* Header */}
        <div className="bg-[var(--surface)] border-b border-[var(--border)] px-6 py-3 flex items-center justify-between mt-1">
          <span className="text-sm text-[var(--text-muted)]">
            {t.block} {blockIdx} / {totalBlocks}
            <span className="ml-2 text-[var(--text-faint)]">·</span>
            <span className="ml-2 text-[var(--text-faint)]">{t.question} {currentIdx + 1} {t.of} {questions.length}</span>
          </span>
          <span className={`font-mono text-sm font-semibold tabular-nums ${timerColor(timerPct)}`}>
            {t.timeLeft}: {fmt(timeLeft)}
          </span>
        </div>

        {/* Question area */}
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-xl">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={currentIdx}
                custom={direction}
                initial={{ opacity: 0, x: direction * 40 }}
                animate={{ opacity: 1, x: 0, transition: { duration: 0.25, ease: 'easeOut' } }}
                exit={{ opacity: 0, x: direction * -40, transition: { duration: 0.15 } }}
              >
                <p className="text-lg font-medium text-[var(--text)] mb-6 leading-relaxed">
                  {getText(q, lang)}
                </p>

                {isOpenText ? (
                  <textarea
                    value={textAnswer}
                    onChange={(e) => setTextAnswer(e.target.value)}
                    rows={5}
                    placeholder={t.writeAnswer}
                    className="w-full rounded-xl border-2 border-[var(--border-strong)] bg-[var(--surface)] px-5 py-4 text-sm text-[var(--text)] placeholder:text-[var(--text-faint)] focus:outline-none focus:border-blue-500 resize-none transition-colors"
                  />
                ) : (
                  <div className="space-y-2.5">
                    {q.optionsJson.map((opt, i) => (
                      <motion.button
                        key={i}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => handleSelect(i)}
                        className={`w-full text-left rounded-xl border-2 px-5 py-4 text-sm transition-all ${
                          selected === i
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/25 text-blue-900 dark:text-blue-300 font-medium shadow-sm'
                            : 'border-[var(--border-strong)] bg-[var(--surface)] text-[var(--text)] hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50/50 dark:hover:bg-blue-900/10'
                        }`}
                      >
                        <span className={`inline-block w-6 font-semibold mr-2 ${selected === i ? 'text-blue-500' : 'text-[var(--text-faint)]'}`}>
                          {String.fromCharCode(65 + i)}.
                        </span>
                        {getOption(opt, lang)}
                      </motion.button>
                    ))}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Navigation */}
            <div className="mt-6 flex gap-3">
              {allowBack && currentIdx > 0 && (
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={goBack}
                  className="px-5 py-3 rounded-xl border-2 border-[var(--border-strong)] text-[var(--text-muted)] text-sm font-medium hover:bg-[var(--border)] transition-colors"
                >
                  ← {t.back}
                </motion.button>
              )}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => goNext(false)}
                disabled={!canProceed}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-30 text-white font-semibold py-3 rounded-xl transition-colors shadow-lg shadow-blue-600/20"
              >
                {isLast ? t.finish : t.next} {!isLast && '→'}
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function ThanksScreen({ t }: { t: typeof T.ru }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className="w-full max-w-sm bg-[var(--surface)] border border-[var(--border-strong)] rounded-2xl shadow-xl p-8 text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.15, type: 'spring', stiffness: 200 }}
          className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4"
        >
          <span className="text-3xl text-emerald-600">✓</span>
        </motion.div>
        <h1 className="text-xl font-semibold text-[var(--text)] mb-2">{t.thanks_title}</h1>
        <p className="text-sm text-[var(--text-muted)] leading-relaxed">{t.thanks_body}</p>
      </motion.div>
    </div>
  );
}

function InfoScreen({ text }: { text: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] p-4">
      <div className="w-full max-w-sm bg-[var(--surface)] border border-[var(--border-strong)] rounded-2xl shadow-xl p-8 text-center">
        <p className="text-sm text-[var(--text-muted)]">{text}</p>
      </div>
    </div>
  );
}
