import { Languages } from 'lucide-react'
import type { Language } from '../context/language.ts'
import { useLanguage } from '../context/useLanguage.ts'

const labels: Record<Language, string> = {
  en: 'EN',
  uk: 'UA',
}

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage()

  return (
    <div className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.06] p-1 text-xs font-black text-neutral-300">
      <Languages className="h-3.5 w-3.5 text-neutral-500" />
      {(['en', 'uk'] as Language[]).map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => setLanguage(option)}
          className={`rounded-md px-2 py-1 transition ${
            language === option ? 'bg-red-600 text-white' : 'hover:bg-white/10 hover:text-white'
          }`}
          aria-pressed={language === option}
        >
          {labels[option]}
        </button>
      ))}
    </div>
  )
}
