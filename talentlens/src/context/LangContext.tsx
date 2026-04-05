'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { type Lang, type TKey, getT } from '@/lib/i18n';

interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: TKey) => string;
}

const Ctx = createContext<LangCtx>({
  lang: 'ru',
  setLang: () => {},
  t: (k) => k,
});

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('ru');

  useEffect(() => {
    const stored = localStorage.getItem('uiLang') as Lang | null;
    if (stored && ['ru', 'en', 'uz'].includes(stored)) {
      setLangState(stored);
    }
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem('uiLang', l);
  }, []);

  const t = useCallback((key: TKey) => getT(lang)(key), [lang]);

  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}

export function useLang() {
  return useContext(Ctx);
}
