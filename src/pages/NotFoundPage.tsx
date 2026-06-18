import { Link } from 'react-router-dom'
import { SiteHeader } from '../components/SiteHeader.tsx'
import { useLanguage } from '../context/useLanguage.ts'

export function NotFoundPage() {
  const { language } = useLanguage()

  return (
    <div className="page-shell">
      <SiteHeader />
      <div className="grid min-h-[calc(100vh-150px)] place-items-center p-6">
        <div className="surface-card w-full max-w-lg rounded-2xl p-7 text-center">
          <p className="text-sm font-semibold tracking-[0.22em] text-red-400">404</p>
          <h1 className="mt-2 text-4xl font-bold">{language === 'uk' ? 'Сторінку не знайдено' : 'Page not found'}</h1>
          <p className="mt-3 text-[hsl(var(--muted-foreground))]">
            {language === 'uk' ? 'Перейдіть на головну або відкрийте список кімнат.' : 'Go home or open the room list.'}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link to="/" className="btn-base btn-primary px-4 py-2 text-sm">
              {language === 'uk' ? 'На головну' : 'Home'}
            </Link>
            <Link to="/rooms" className="btn-base btn-outline px-4 py-2 text-sm">
              {language === 'uk' ? 'До кімнат' : 'Rooms'}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
