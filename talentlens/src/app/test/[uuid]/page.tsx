'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';

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
}

interface Answer {
  questionId: string;
  selectedOption: number;
  textAnswer?: string;
  answeredAt: string;
  responseMs: number;
}

type Phase = 'loading' | 'error' | 'expired' | 'completed' | 'language' | 'instructions' | 'testing' | 'finished';

// ── i18n ─────────────────────────────────────────────────────────────────────

const T = {
  ru: {
    chooseLanguage: 'Выберите язык',
    start: 'Начать',
    instructions_title: 'Инструкция',
    instructions_body:
      'Вас ждёт несколько блоков заданий. Для каждого блока есть таймер. Отвечайте честно — правильных и неправильных ответов нет. Не закрывайте эту вкладку в процессе.',
    estimated: 'Примерное время',
    minutes: 'мин',
    next: 'Далее',
    finish: 'Завершить',
    thanks_title: 'Спасибо!',
    thanks_body: 'Ваши ответы успешно записаны. Результаты будут переданы HR-специалисту.',
    block: 'Блок',
    timeLeft: 'Осталось',
    noQuestions: 'Вопросы ещё не загружены. Попробуйте позже.',
    expired: 'Ссылка истекла или недействительна.',
    alreadyDone: 'Тест уже пройден. Спасибо!',
    error: 'Произошла ошибка.',
  },
  uz: {
    chooseLanguage: "Tilni tanlang",
    start: "Boshlash",
    instructions_title: "Ko'rsatma",
    instructions_body:
      "Sizni bir necha blok topshiriqlar kutmoqda. Har bir blok uchun taymer mavjud. Halol javob bering — to'g'ri yoki noto'g'ri javob yo'q. Jarayon davomida ushbu sahifani yopmang.",
    estimated: "Taxminiy vaqt",
    minutes: "daqiqa",
    next: "Keyingisi",
    finish: "Tugatish",
    thanks_title: "Rahmat!",
    thanks_body: "Javoblaringiz muvaffaqiyatli saqlandi. Natijalar HR mutaxassisiga yuboriladi.",
    block: "Blok",
    timeLeft: "Qoldi",
    noQuestions: "Savollar hali yuklanmagan. Keyinroq urinib ko'ring.",
    expired: "Havola muddati tugagan yoki yaroqsiz.",
    alreadyDone: "Test allaqachon topshirilgan. Rahmat!",
    error: "Xatolik yuz berdi.",
  },
  en: {
    chooseLanguage: 'Choose Language',
    start: 'Start',
    instructions_title: 'Instructions',
    instructions_body:
      'You will complete several task blocks. Each block has a timer. Answer honestly — there are no right or wrong answers. Do not close this tab during the test.',
    estimated: 'Estimated time',
    minutes: 'min',
    next: 'Next',
    finish: 'Finish',
    thanks_title: 'Thank you!',
    thanks_body: 'Your answers have been recorded. The results will be shared with the HR specialist.',
    block: 'Block',
    timeLeft: 'Time left',
    noQuestions: 'Questions are not loaded yet. Please try again later.',
    expired: 'This link has expired or is invalid.',
    alreadyDone: 'You have already completed this test. Thank you!',
    error: 'An error occurred.',
  },
};

function getText(q: Question, lang: Lang): string {
  return lang === 'uz' ? q.textUz : lang === 'en' ? q.textEn : q.textRu;
}

function getOption(o: Option, lang: Lang): string {
  return lang === 'uz' ? o.textUz : lang === 'en' ? o.textEn : o.textRu;
}

// ── Fisher-Yates shuffle (client-side, §TEST-05) ──────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Timer colours (§3.3) ──────────────────────────────────────────────────────

function timerColor(pct: number): string {
  if (pct > 0.5) return 'text-green-600';
  if (pct > 0.2) return 'text-orange-500';
  return 'text-red-600';
}

const SECS_PER_QUESTION = 45;
const AUTOSAVE_EVERY = 5; // save progress every N answers

// ── Main component ────────────────────────────────────────────────────────────

export default function TestPage() {
  const { uuid } = useParams<{ uuid: string }>();

  const [phase, setPhase] = useState<Phase>('loading');
  const [lang, setLang] = useState<Lang>('ru');
  const [testData, setTestData] = useState<TestData | null>(null);
  const [shuffledQuestions, setShuffledQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [textAnswer, setTextAnswer] = useState('');
  const [tabSwitches, setTabSwitches] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [blockTimeTotal, setBlockTimeTotal] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  const questionShownAt = useRef<number>(Date.now());
  const tabSwitchRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const answersRef = useRef<Answer[]>([]);

  const t = T[lang];

  // ── Load test data ────────────────────────────────────────────────────────

  useEffect(() => {
    fetch(`/api/test/${uuid}`)
      .then((r) => r.json())
      .then((res) => {
        if (!res.success) {
          if (res.error?.includes('expired')) { setPhase('expired'); return; }
          setErrorMsg(res.error ?? 'Error');
          setPhase('error');
          return;
        }
        if (res.data.status === 'completed') { setPhase('completed'); return; }
        setTestData(res.data);
        if (res.data.language) setLang(res.data.language as Lang);
        setPhase('language');
      })
      .catch(() => { setPhase('error'); setErrorMsg('Network error'); });
  }, [uuid]);

  // ── Tab switch detection (§TEST-07) ──────────────────────────────────────

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

  // ── Build shuffled question list when testing starts ─────────────────────

  const startTesting = useCallback((td: TestData) => {
    // Shuffle within each block, keep blocks sequential (§TEST-05)
    const questions = td.blocks.flatMap((blockType) => {
      const blockQs = td.questions.filter((q) => q.blockType === blockType);
      return shuffle(blockQs);
    });
    setShuffledQuestions(questions);
    setCurrentIdx(0);
    setAnswers([]);
    answersRef.current = [];

    // Timer per first block
    const blockSize = questions.filter((q) => q.blockType === td.blocks[0]).length;
    const secs = blockSize * SECS_PER_QUESTION;
    setTimeLeft(secs);
    setBlockTimeTotal(secs);

    questionShownAt.current = Date.now();
    setPhase('testing');
  }, []);

  // ── Start API call ────────────────────────────────────────────────────────

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

  // ── Block timer ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (phase !== 'testing') return;

    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          // Time's up — auto-advance to next block or finish
          handleNextQuestion(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, currentIdx]);

  // ── Auto-save every N answers (§TEST-08) ─────────────────────────────────

  useEffect(() => {
    if (answers.length > 0 && answers.length % AUTOSAVE_EVERY === 0) {
      fetch(`/api/test/${uuid}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers, tabSwitches: tabSwitchRef.current }),
      });
    }
  }, [answers, uuid]);

  // ── Question navigation ───────────────────────────────────────────────────

  function handleAnswer(optionIdx: number) {
    setSelected(optionIdx);
  }

  function handleNextQuestion(autoAdvance = false) {
    if (timerRef.current) clearInterval(timerRef.current);

    const currentQuestion = shuffledQuestions[currentIdx];
    const responseMs = Date.now() - questionShownAt.current;

    const isOpenText = currentQuestion.optionsJson.length === 0;
    const answer: Answer = {
      questionId: currentQuestion.id,
      selectedOption: isOpenText ? -1 : (selected ?? 0),
      ...(isOpenText ? { textAnswer: textAnswer.trim() } : {}),
      answeredAt: new Date().toISOString(),
      responseMs,
    };

    const newAnswers = [...answersRef.current, answer];
    answersRef.current = newAnswers;
    setAnswers(newAnswers);
    setSelected(null);
    setTextAnswer('');

    const nextIdx = currentIdx + 1;

    if (nextIdx >= shuffledQuestions.length) {
      // All done
      finishTest(newAnswers);
      return;
    }

    setCurrentIdx(nextIdx);
    questionShownAt.current = Date.now();

    // Check if we're starting a new block — reset timer
    const testDataBlocks = testData!.blocks;
    const prevBlock = shuffledQuestions[currentIdx].blockType;
    const nextBlock = shuffledQuestions[nextIdx].blockType;

    if (nextBlock !== prevBlock) {
      const blockQuestions = shuffledQuestions.filter((q) => q.blockType === nextBlock);
      const secs = blockQuestions.length * SECS_PER_QUESTION;
      setTimeLeft(secs);
      setBlockTimeTotal(secs);
    }
  }

  async function finishTest(finalAnswers: Answer[]) {
    setPhase('loading');
    await fetch(`/api/test/${uuid}/finish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers: finalAnswers, tabSwitches: tabSwitchRef.current }),
    });
    setPhase('finished');
  }

  // ── Derived state ─────────────────────────────────────────────────────────

  const progress = shuffledQuestions.length > 0 ? answers.length / shuffledQuestions.length : 0;
  const currentQuestion = shuffledQuestions[currentIdx];
  const currentBlock = currentQuestion?.blockType;
  const blockIdx = testData ? testData.blocks.indexOf(currentBlock) + 1 : 0;
  const totalBlocks = testData?.blocks.length ?? 0;
  const timerPct = blockTimeTotal > 0 ? timeLeft / blockTimeTotal : 1;

  function formatTime(s: number) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  }

  // ── Render phases ─────────────────────────────────────────────────────────

  if (phase === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-400 text-sm">Загрузка...</div>
      </div>
    );
  }

  if (phase === 'expired') {
    return <InfoScreen text={T.ru.expired} />;
  }

  if (phase === 'completed') {
    return <ThanksScreen t={T[lang]} />;
  }

  if (phase === 'finished') {
    return <ThanksScreen t={t} />;
  }

  if (phase === 'error') {
    return <InfoScreen text={errorMsg || T.ru.error} />;
  }

  // ── Language selection (§TEST-01) ─────────────────────────────────────────

  if (phase === 'language') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm p-8 text-center">
          <h1 className="text-xl font-semibold text-gray-800 mb-6">
            {T.ru.chooseLanguage} / {T.uz.chooseLanguage} / {T.en.chooseLanguage}
          </h1>
          <div className="space-y-3">
            {(['ru', 'uz', 'en'] as Lang[]).map((l) => (
              <button
                key={l}
                onClick={() => { setLang(l); setPhase('instructions'); }}
                className="w-full py-3 rounded-xl border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 text-gray-800 font-medium transition-colors"
              >
                {l === 'ru' ? 'Русский' : l === 'uz' ? "O'zbekcha" : 'English'}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Instructions (§TEST-02) ───────────────────────────────────────────────

  if (phase === 'instructions') {
    const hasQuestions = (testData?.questions.length ?? 0) > 0;
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-sm p-8">
          <h1 className="text-xl font-semibold text-gray-900 mb-3">{t.instructions_title}</h1>
          <p className="text-gray-600 text-sm leading-relaxed mb-4">{t.instructions_body}</p>
          <p className="text-sm text-gray-400 mb-6">
            {t.estimated}: ~{testData?.estimatedMinutes ?? 30} {t.minutes}
          </p>
          {!hasQuestions && (
            <p className="text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              {t.noQuestions}
            </p>
          )}
          <button
            onClick={handleStart}
            disabled={!hasQuestions}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-medium py-3 rounded-xl transition-colors"
          >
            {t.start}
          </button>
        </div>
      </div>
    );
  }

  // ── Testing (§TEST-03, TEST-04) ───────────────────────────────────────────

  if (phase === 'testing' && currentQuestion) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Progress bar (§TEST-03) — thin strip, no question numbers */}
        <div className="h-1 bg-gray-200 fixed top-0 left-0 right-0 z-10">
          <div
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${progress * 100}%` }}
          />
        </div>

        {/* Header */}
        <div className="bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between">
          <span className="text-sm text-gray-500">
            {t.block} {blockIdx} / {totalBlocks}
          </span>
          {/* Timer (§TEST-04) */}
          <span className={`font-mono text-sm font-semibold ${timerColor(timerPct)}`}>
            {t.timeLeft}: {formatTime(timeLeft)}
          </span>
        </div>

        {/* Question */}
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-lg">
            <p className="text-lg font-medium text-gray-900 mb-6 leading-relaxed">
              {getText(currentQuestion, lang)}
            </p>

            {currentQuestion.optionsJson.length === 0 ? (
              <textarea
                value={textAnswer}
                onChange={(e) => setTextAnswer(e.target.value)}
                rows={5}
                placeholder="Введите ваш ответ..."
                className="w-full rounded-xl border-2 border-gray-200 px-5 py-4 text-sm text-gray-800 focus:outline-none focus:border-blue-400 resize-none"
              />
            ) : (
              <div className="space-y-3">
                {currentQuestion.optionsJson.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => handleAnswer(i)}
                    className={`w-full text-left rounded-xl border-2 px-5 py-4 text-sm transition-colors ${
                      selected === i
                        ? 'border-blue-500 bg-blue-50 text-blue-900 font-medium'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <span className="inline-block w-6 font-medium text-gray-400 mr-2">
                      {String.fromCharCode(65 + i)}.
                    </span>
                    {getOption(opt, lang)}
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={() => handleNextQuestion(false)}
              disabled={currentQuestion.optionsJson.length === 0 ? textAnswer.trim().length === 0 : selected === null}
              className="mt-6 w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-30 text-white font-medium py-3 rounded-xl transition-colors"
            >
              {currentIdx + 1 >= shuffledQuestions.length ? t.finish : t.next}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

// ── Small helpers ─────────────────────────────────────────────────────────────

function ThanksScreen({ t }: { t: typeof T.ru }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm p-8 text-center">
        <div className="text-5xl mb-4">✓</div>
        <h1 className="text-xl font-semibold text-gray-900 mb-3">{t.thanks_title}</h1>
        <p className="text-gray-500 text-sm leading-relaxed">{t.thanks_body}</p>
      </div>
    </div>
  );
}

function InfoScreen({ text }: { text: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm p-8 text-center">
        <p className="text-gray-600 text-sm">{text}</p>
      </div>
    </div>
  );
}
