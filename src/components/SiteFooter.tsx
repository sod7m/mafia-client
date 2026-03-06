import { Link } from 'react-router-dom'
import { Flag, Heart } from 'lucide-react'

export function SiteFooter() {
  return (
    <footer className="border-t border-[hsl(var(--border))] bg-[hsl(var(--card)/0.5)] px-5 py-6 backdrop-blur-sm sm:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 text-sm text-[hsl(var(--muted-foreground))] md:flex-row">
        <p className="text-center md:text-left">
          © 2024 Mafia Game. Створено з <Heart className="inline h-4 w-4 text-red-400" fill="currentColor" /> для
          любителів гри
        </p>
        <nav className="flex items-center gap-6">
          <Link to="/rules" className="transition-colors hover:text-[hsl(var(--foreground))]">
            Правила
          </Link>
          <a href="#" className="transition-colors hover:text-[hsl(var(--foreground))]">
            Підтримка
          </a>
          <a href="#" className="transition-colors hover:text-[hsl(var(--foreground))]" aria-label="Підтримка">
            <Flag className="h-4 w-4" />
          </a>
        </nav>
      </div>
    </footer>
  )
}

