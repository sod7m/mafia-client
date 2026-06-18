import { Link } from 'react-router-dom'
import { Flag, Heart } from 'lucide-react'
import { useLanguage } from '../context/useLanguage.ts'

export function SiteFooter() {
  const { language } = useLanguage()

  return (
    <footer className="border-t border-[hsl(var(--border))] bg-[hsl(var(--card)/0.5)] px-5 py-6 backdrop-blur-sm sm:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 text-sm text-[hsl(var(--muted-foreground))] md:flex-row">
        <p className="text-center md:text-left">
          {language === 'uk' ? '© 2024 OMERTA. Створено з ' : '© 2024 OMERTA. Made with '}
          <Heart className="inline h-4 w-4 text-red-400" fill="currentColor" />
          {language === 'uk' ? ' для любителів гри' : ' for social deduction players'}
        </p>
        <nav className="flex items-center gap-6">
          <Link to="/rules" className="transition-colors hover:text-[hsl(var(--foreground))]">
            {language === 'uk' ? 'Правила' : 'Rules'}
          </Link>
          <a href="#" className="transition-colors hover:text-[hsl(var(--foreground))]">
            {language === 'uk' ? 'Підтримка' : 'Support'}
          </a>
          <a href="#" className="transition-colors hover:text-[hsl(var(--foreground))]" aria-label={language === 'uk' ? 'Підтримка' : 'Support'}>
            <Flag className="h-4 w-4" />
          </a>
        </nav>
      </div>
    </footer>
  )
}
