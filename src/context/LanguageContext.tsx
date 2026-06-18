import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { LANGUAGE_STORAGE_KEY, LanguageContext, type Language } from './language.ts'

function readInitialLanguage(): Language {
  if (typeof window === 'undefined') {
    return 'en'
  }

  const storedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY)
  return storedLanguage === 'uk' ? 'uk' : 'en'
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(readInitialLanguage)

  useEffect(() => {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
    document.documentElement.lang = language === 'uk' ? 'uk' : 'en'
  }, [language])

  const value = useMemo(() => ({ language, setLanguage }), [language])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}
