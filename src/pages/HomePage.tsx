import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Crown, Moon, Skull, Sun, User, Users, Video, Vote } from 'lucide-react'
import { Modal } from '../components/Modal.tsx'
import { SiteFooter } from '../components/SiteFooter.tsx'
import { SiteHeader } from '../components/SiteHeader.tsx'
import { useGame } from '../context/GameContext.tsx'
import { MAX_PLAYERS_IN_ROOM } from '../lib/roomStatus.ts'
import heroImage from '../assets/hero-bg.jpg'

const gamePhases = [
  {
    icon: Moon,
    title: 'Ніч',
    description: 'Мафія таємно обирає жертву. Мирні жителі сплять і не знають, що відбувається.',
    tone: 'mafia' as const,
  },
  {
    icon: Sun,
    title: 'День',
    description: 'Всі обговорюють, хто може бути мафією. Час використати логіку та інстинкти.',
    tone: 'gold' as const,
  },
  {
    icon: Vote,
    title: 'Голосування',
    description: 'Гравці голосують за найбільш підозрілого. Той, хто отримає більшість голосів, вибуває.',
    tone: 'mafia' as const,
  },
]

const roleCards = [
  {
    icon: User,
    title: 'Мафія',
    description: 'Прагнуть знищити всіх мирних жителів. Діють вночі таємно.',
    tone: 'mafia' as const,
  },
  {
    icon: Users,
    title: 'Мирні жителі',
    description: 'Намагаються виявити та вигнати мафію голосуванням.',
    tone: 'civilian' as const,
  },
  {
    icon: Crown,
    title: 'Ведучий',
    description: 'Керує процесом гри, оголошує фази та результати.',
    tone: 'moderator' as const,
  },
]

const victoryConditions = [
  {
    icon: User,
    title: 'Перемога Мафії',
    description: 'Коли кількість мафії дорівнює або перевищує кількість мирних жителів',
    tone: 'mafia' as const,
  },
  {
    icon: Users,
    title: 'Перемога мирних',
    description: 'Коли всі члени мафії виявлені та виключені з гри',
    tone: 'civilian' as const,
  },
]

const toneClassNames = {
  mafia: {
    bubble: 'phase-bubble phase-bubble-mafia',
    icon: 'tone-mafia',
    card: 'phase-card-mafia',
    border: 'role-card role-card-mafia',
    miniBubble: 'victory-bubble victory-bubble-mafia',
  },
  gold: {
    bubble: 'phase-bubble phase-bubble-gold',
    icon: 'tone-gold',
    card: 'phase-card-gold',
  },
  civilian: {
    icon: 'tone-civilian',
    border: 'role-card role-card-civilian',
    miniBubble: 'victory-bubble victory-bubble-civilian',
  },
  moderator: {
    icon: 'tone-moderator',
    border: 'role-card role-card-moderator',
  },
}

export function HomePage() {
  const navigate = useNavigate()
  const { user, login } = useGame()
  const [isLoginOpen, setIsLoginOpen] = useState(false)
  const [nickname, setNickname] = useState(user?.nickname ?? '')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const heroSectionRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const elements = Array.from(document.querySelectorAll<HTMLElement>('.scroll-reveal'))
    if (elements.length === 0) {
      return
    }

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion || typeof IntersectionObserver === 'undefined') {
      elements.forEach((element) => element.classList.add('is-visible'))
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            observer.unobserve(entry.target)
          }
        })
      },
      {
        threshold: 0.18,
        rootMargin: '0px 0px -10% 0px',
      },
    )

    elements.forEach((element) => observer.observe(element))
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const heroElement = heroSectionRef.current
    if (!heroElement) {
      return
    }

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const hasFinePointer = window.matchMedia('(pointer: fine)').matches
    if (prefersReducedMotion) {
      return
    }

    let rafId = 0
    let ticking = false

    const updateHeroParallax = () => {
      ticking = false

      const viewportHeight = Math.max(window.innerHeight, 1)
      const progress = Math.min(Math.max(window.scrollY / (viewportHeight * 1.08), 0), 1.25)

      heroElement.style.setProperty('--hero-cover-y', `${(progress * 72).toFixed(2)}px`)
      heroElement.style.setProperty('--hero-cover-scale', (1 + progress * 0.09).toFixed(4))
      heroElement.style.setProperty('--hero-content-y', `${(progress * 26).toFixed(2)}px`)
      heroElement.style.setProperty('--hero-content-opacity', Math.max(0.54, 1 - progress * 0.52).toFixed(4))
      heroElement.style.setProperty('--hero-glow-y', `${(progress * 40).toFixed(2)}px`)
      heroElement.style.setProperty('--hero-glow-scale', (1 + progress * 0.28).toFixed(4))
      heroElement.style.setProperty('--hero-smoke-y', `${(progress * 18).toFixed(2)}px`)
      heroElement.style.setProperty('--hero-indicator-opacity', Math.max(0, 1 - progress * 1.75).toFixed(4))
      heroElement.style.setProperty('--hero-indicator-y', `${Math.min(progress * 22, 22).toFixed(2)}px`)
    }

    const requestParallaxFrame = () => {
      if (ticking) {
        return
      }

      ticking = true
      rafId = window.requestAnimationFrame(updateHeroParallax)
    }

    const onPointerMove = (event: PointerEvent) => {
      const bounds = heroElement.getBoundingClientRect()
      if (!bounds.width || !bounds.height) {
        return
      }

      const x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1
      const y = ((event.clientY - bounds.top) / bounds.height) * 2 - 1

      heroElement.style.setProperty('--hero-pointer-x', x.toFixed(4))
      heroElement.style.setProperty('--hero-pointer-y', y.toFixed(4))
    }

    const resetPointer = () => {
      heroElement.style.setProperty('--hero-pointer-x', '0')
      heroElement.style.setProperty('--hero-pointer-y', '0')
    }

    requestParallaxFrame()
    if (hasFinePointer) {
      heroElement.addEventListener('pointermove', onPointerMove, { passive: true })
      heroElement.addEventListener('pointerleave', resetPointer)
    }
    window.addEventListener('scroll', requestParallaxFrame, { passive: true })
    window.addEventListener('resize', requestParallaxFrame)

    return () => {
      if (hasFinePointer) {
        heroElement.removeEventListener('pointermove', onPointerMove)
        heroElement.removeEventListener('pointerleave', resetPointer)
      }
      window.removeEventListener('scroll', requestParallaxFrame)
      window.removeEventListener('resize', requestParallaxFrame)
      if (rafId) {
        window.cancelAnimationFrame(rafId)
      }
    }
  }, [])

  const openLogin = () => {
    setNickname(user?.nickname ?? '')
    setError('')
    setIsLoginOpen(true)
  }

  const submitNickname = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const cleanNickname = nickname.trim()

    if (cleanNickname.length < 2) {
      setError('Nickname має містити щонайменше 2 символи.')
      return
    }

    if (cleanNickname.length > 20) {
      setError('Nickname має бути коротшим за 20 символів.')
      return
    }

    setIsSubmitting(true)
    const result = await login(cleanNickname)
    setIsSubmitting(false)

    if (!result.ok) {
      setError(result.error ?? 'Не вдалося увійти.')
      return
    }

    setIsLoginOpen(false)
    navigate('/rooms')
  }

  const scrollToHowItWorks = () => {
    const section = document.getElementById('how-it-works-section')
    if (!section) {
      return
    }

    const headerOffset = 96
    const top = section.getBoundingClientRect().top + window.scrollY - headerOffset
    window.scrollTo({ top, behavior: 'smooth' })
  }

  return (
    <div className="page-shell">
      <SiteHeader
        fixed
        transparentOnScroll
        onPrimaryAction={user ? undefined : openLogin}
      />

      <section ref={heroSectionRef} id="hero-top" className="hero-scene relative flex min-h-screen items-center justify-center overflow-hidden">
        <div
          className="hero-cover hero-parallax-cover absolute inset-0"
          style={{ backgroundImage: `url(${heroImage})` }}
          aria-hidden="true"
        >
          <div className="hero-overlay absolute inset-0" />
          <div className="hero-noise-overlay absolute inset-0" />
          <div className="hero-smoke-overlay absolute inset-0" />
          <div className="hero-red-glow absolute bottom-0 left-1/2 h-[28rem] w-[28rem] rounded-full" />
        </div>

        <div className="hero-parallax-content relative z-10 mx-auto w-full max-w-6xl px-5 pb-10 pt-24 sm:px-8 sm:pt-28">
          <div className="fade-in mx-auto max-w-4xl text-center">
            <div className="mb-6 flex justify-center">
              <div className="glow-pulse rounded-full bg-[hsl(var(--primary)/0.25)] p-6">
                <Skull className="h-16 w-16 text-red-400" />
              </div>
            </div>

            <h1 className="mb-4 text-6xl font-extrabold tracking-tight sm:text-8xl">
              <span className="title-gradient">MAFIA</span>
            </h1>

            <p className="mx-auto max-w-3xl text-base leading-relaxed text-[hsl(var(--muted-foreground))] sm:text-xl">
              Класична гра на виживання з голосовим та відео-зв&apos;язком. Знайдіть мафію серед мирних жителів, поки не
              стало занадто пізно.
            </p>

            <div className="mx-auto mt-9 grid max-w-3xl gap-4 sm:grid-cols-3">
              <div className="surface-muted rounded-2xl p-4">
                <Users className="mx-auto mb-2 h-7 w-7 text-red-400" />
                <h2 className="mb-2 text-lg font-semibold">До {MAX_PLAYERS_IN_ROOM} гравців</h2>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">Грайте з друзями в реальному часі</p>
              </div>
              <div className="surface-muted rounded-2xl p-4">
                <Video className="mx-auto mb-2 h-7 w-7 text-yellow-300" />
                <h2 className="mb-2 text-lg font-semibold">Відео та голос</h2>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">Підтримка голосового та відеочату.</p>
              </div>
              <div className="surface-muted rounded-2xl p-4">
                <Skull className="mx-auto mb-2 h-7 w-7 text-red-500" />
                <h2 className="mb-2 text-lg font-semibold">Класичні правила</h2>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">Традиційна механіка гри Мафія</p>
              </div>
            </div>

            <div className="mt-10 flex flex-col items-center justify-center gap-4">
              <button type="button" onClick={openLogin} className="btn-base btn-primary px-10 py-4 text-lg sm:px-12">
                Почати гру
              </button>
              {user && (
                <button
                  type="button"
                  onClick={() => navigate('/rooms')}
                  className="btn-base btn-outline px-6 py-3 text-base"
                >
                  Продовжити як {user.nickname}
                </button>
              )}
            </div>

            <p className="mt-10 text-sm text-[hsl(var(--muted-foreground))]">
              Безкоштовна онлайн-гра • Не потрібна реєстрація • Грайте прямо в браузері
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={scrollToHowItWorks}
          className="hero-scroll-indicator"
          aria-label="Прокрутити вниз до наступного блоку"
        >
          <span className="hero-scroll-mouse">
            <span className="hero-scroll-wheel" />
          </span>
        </button>
      </section>

      <section id="how-it-works-section" className="px-5 pb-16 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="scroll-reveal reveal-from-bottom mb-10 text-center">
            <h2 className="mb-2 text-3xl font-bold sm:text-4xl">
              Як грати в <span className="text-red-400">Мафію</span>
            </h2>
            <p className="mx-auto max-w-2xl text-[hsl(var(--muted-foreground))]">
              Проста та захоплююча соціальна гра на логіку та дедукцію
            </p>
          </div>

          <div className="mb-12 grid gap-5 md:grid-cols-3">
            {gamePhases.map(({ icon: Icon, title, description, tone }, index) => (
              <article
                key={title}
                className={`surface-card premium-card phase-card scroll-reveal reveal-from-bottom reveal-delay-${index + 1} rounded-2xl p-6 text-center ${toneClassNames[tone].card}`}
              >
                <div className="mb-4 flex justify-center">
                  <div className={toneClassNames[tone].bubble}>
                    <Icon className={`h-7 w-7 ${toneClassNames[tone].icon}`} />
                  </div>
                </div>
                <h3 className="mb-3 text-2xl font-bold">{title}</h3>
                <p className="text-[hsl(var(--muted-foreground))]">{description}</p>
              </article>
            ))}
          </div>

          <div id="roles-section" className="mb-12">
            <h3 className="scroll-reveal reveal-from-bottom mb-8 text-center text-3xl font-bold">Ролі в грі</h3>
            <div className="grid gap-5 md:grid-cols-3">
              {roleCards.map(({ icon: Icon, title, description, tone }, index) => (
                <article
                  key={title}
                  className={`${toneClassNames[tone].border} premium-card scroll-reveal ${index % 2 === 0 ? 'reveal-from-left' : 'reveal-from-right'} reveal-delay-${index + 1}`}
                >
                  <div className="role-card-icon">
                    <Icon className={`h-5 w-5 ${toneClassNames[tone].icon}`} />
                  </div>
                  <div>
                    <h4 className={`mb-2 text-xl font-bold ${toneClassNames[tone].icon}`}>{title}</h4>
                    <p className="text-[hsl(var(--muted-foreground))]">{description}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="surface-card premium-card scroll-reveal reveal-from-bottom reveal-delay-2 rounded-2xl p-7 sm:p-8">
            <h3 className="mb-7 text-center text-3xl font-bold">Умови перемоги</h3>
            <div className="grid gap-7 md:grid-cols-2">
              {victoryConditions.map(({ icon: Icon, title, description, tone }, index) => (
                <article
                  key={title}
                  className={`scroll-reveal ${index % 2 === 0 ? 'reveal-from-left' : 'reveal-from-right'} reveal-delay-${index + 1} flex items-start gap-4`}
                >
                  <div className={toneClassNames[tone].miniBubble}>
                    <Icon className={`h-5 w-5 ${toneClassNames[tone].icon}`} />
                  </div>
                  <div>
                    <h4 className="mb-2 text-xl font-semibold">{title}</h4>
                    <p className="text-[hsl(var(--muted-foreground))]">{description}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />

      <Modal open={isLoginOpen} onClose={() => setIsLoginOpen(false)} title="Вхід у гру">
        <form className="space-y-4" onSubmit={submitNickname}>
          <div className="space-y-2">
            <label htmlFor="nickname" className="block text-sm text-[hsl(var(--muted-foreground))]">
              Ваш nickname
            </label>
            <input
              id="nickname"
              name="nickname"
              type="text"
              autoFocus
              value={nickname}
              maxLength={20}
              onChange={(event) => setNickname(event.target.value)}
              className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-white outline-none transition focus:border-red-500"
              placeholder="Наприклад, DonVito"
            />
            {error && <p className="text-sm text-red-300">{error}</p>}
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-base btn-primary w-full px-4 py-2 text-sm disabled:pointer-events-none disabled:opacity-60"
          >
            {isSubmitting ? 'Вхід...' : 'Увійти та перейти до кімнат'}
          </button>
        </form>
      </Modal>
    </div>
  )
}
