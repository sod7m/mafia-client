import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Skull } from 'lucide-react'
import { useGame } from '../context/GameContext.tsx'

interface SiteHeaderProps {
  fixed?: boolean
  transparentOnScroll?: boolean
  onPrimaryAction?: () => void
  primaryLabel?: string
}

export function SiteHeader({
  fixed = false,
  transparentOnScroll = false,
  onPrimaryAction,
  primaryLabel,
}: SiteHeaderProps) {
  const navigate = useNavigate()
  const { user, logout } = useGame()
  const [isScrolled, setIsScrolled] = useState(false)
  const resolvedPrimaryLabel = primaryLabel ?? (user ? 'LOGOUT' : 'PLAY NOW')

  useEffect(() => {
    if (!transparentOnScroll) {
      return
    }

    const onScroll = () => {
      setIsScrolled(window.scrollY > 24)
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [transparentOnScroll])

  const headerClassName = [
    'site-topbar',
    fixed ? 'is-fixed' : '',
    transparentOnScroll ? 'is-transparent' : '',
    isScrolled ? 'is-scrolled' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const handlePrimaryClick = () => {
    if (onPrimaryAction) {
      onPrimaryAction()
      return
    }

    if (user) {
      logout()
      navigate('/')
      return
    }

    navigate('/')
  }

  return (
    <header className={headerClassName}>
      <div className="site-topbar-inner">
        <Link to="/" className="site-topbar-brand">
          <Skull className="h-4 w-4" />
          MAFIA
        </Link>

        <button type="button" onClick={handlePrimaryClick} className="site-topbar-cta">
          {resolvedPrimaryLabel}
        </button>
      </div>
    </header>
  )
}
