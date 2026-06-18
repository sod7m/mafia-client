import { createContext } from 'react'

export type Language = 'en' | 'uk'

export interface LanguageContextValue {
  language: Language
  setLanguage: (language: Language) => void
}

export const LANGUAGE_STORAGE_KEY = 'omerta:language'
export const LanguageContext = createContext<LanguageContextValue | null>(null)
