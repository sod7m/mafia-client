import { Link } from 'react-router-dom'
import { Activity, ArrowRight, BriefcaseMedical, Crown, Eye, Moon, Shield, Skull, Sun, Users, Vote } from 'lucide-react'
import { SiteHeader } from '../components/SiteHeader.tsx'
import { useGame } from '../context/GameContext.tsx'
import { useLanguage } from '../context/useLanguage.ts'

const rulesCopy = {
  en: {
    title: 'OMERTA Rules',
    subtitle: 'A complete rulebook split into clear sections so new players know what happens and when.',
    home: 'Home',
    roomsAs: 'Rooms as',
    essenceTitle: '1. Core idea',
    essenceA:
      'OMERTA is a team-based psychological deduction game. There are two sides: the town, trying to find the criminals, and the syndicate, trying to eliminate the town.',
    essenceB: 'Each player receives a hidden role and plays for their side. Roles are not publicly revealed during the game.',
    quickTitle: 'Quick start',
    quick: [
      'At night, active roles perform secret actions.',
      'During the day, everyone discusses suspicions.',
      'After discussion, everyone votes.',
      'Night and day repeat until one side wins.',
    ],
    rolesTitle: '2. Roles',
    townRoles: 'Town roles',
    criminals: 'Criminals',
    flowTitle: '3. Game flow',
    night: 'Night',
    nightText: 'All players close their eyes. Role actions happen in this order:',
    timers: 'Timers: Lover, Doctor, and Commissioner have 15 seconds each; the Syndicate has 30 seconds.',
    day: 'Day',
    dayA: 'First, each living player gets 60 seconds for a personal speech. The first speaker shifts every new day.',
    dayB: 'After personal speeches, there is a 90-second open discussion, then voting.',
    voteTitle: '4. Voting',
    voteCards: [
      'The player with the most votes is exiled from the game.',
      'If the top vote count is tied, nobody is exiled.',
      'Role secrecy: roles are not revealed after a kill or exile.',
    ],
    victoryTitle: '5. Victory conditions',
    mafiaWin: 'Syndicate victory',
    mafiaWinText: 'The syndicate wins when its living members are equal to or outnumber the town.',
    townWin: 'Town victory',
    townWinText: 'The town wins when no syndicate members remain.',
    note: 'Important: the Lover counts as part of the syndicate.',
    civilianRoles: [
      {
        name: 'Civilian',
        icon: Users,
        tone: 'tone-civilian',
        text: 'Does not wake at night and has no special ability.',
      },
      {
        name: 'Commissioner',
        icon: Eye,
        tone: 'text-yellow-300',
        text: 'Wakes at night and checks one player. Sees only the side: town or syndicate. The Lover also appears as syndicate.',
      },
      {
        name: 'Doctor',
        icon: BriefcaseMedical,
        tone: 'text-emerald-300',
        text: 'Heals one player at night, including themself. If that player is attacked, they survive. Cannot heal the same player two nights in a row.',
      },
    ],
    mafiaRoles: [
      {
        name: 'Syndicate',
        icon: Skull,
        tone: 'tone-mafia',
        text: 'Regular syndicate members wake together and must choose the same target. Split targets or missing choices cause a miss. A single unblocked syndicate member can act alone. They can even target themselves.',
      },
      {
        name: 'Lover',
        icon: Crown,
        tone: 'text-fuchsia-300',
        text: 'Part of the syndicate side, but does not know regular syndicate members. Acts first at night and blocks one player. Cannot block the same target two nights in a row.',
      },
    ],
    nightOrder: ['Lover', 'Doctor', 'Commissioner', 'Syndicate'],
  },
  uk: {
    title: 'Правила OMERTA',
    subtitle: 'Повний опис правил з поділом на блоки, щоб новачкам було зрозуміло, що і коли відбувається.',
    home: 'На головну',
    roomsAs: 'До кімнат як',
    essenceTitle: '1. Суть гри',
    essenceA:
      'OMERTA - це командна психологічна гра з детективним сюжетом. Є два основні боки: мирні жителі, які намагаються знайти злочинців, та мафія, яка прагне знищити мирних.',
    essenceB: 'Кожен гравець отримує приховану роль і грає за свою команду. Ролі не розкриваються публічно під час гри.',
    quickTitle: 'Коротко для новачка',
    quick: [
      'Вночі активні ролі роблять дії таємно.',
      'Вдень усі обговорюють підозри.',
      'Після обговорення всі голосують.',
      'Раунди Ніч - День повторюються до перемоги однієї сторони.',
    ],
    rolesTitle: '2. Ролі',
    townRoles: 'Мирні ролі',
    criminals: 'Злочинці',
    flowTitle: '3. Хід гри',
    night: 'Ніч',
    nightText: 'Усі гравці закривають очі. Порядок дій ролей:',
    timers: 'Таймери: Коханка, Лікар і Комісар мають по 15 секунд, Мафія має 30 секунд.',
    day: 'День',
    dayA: 'Спочатку кожен живий гравець має 60 секунд на власну промову. Перший спікер зміщується кожного нового дня.',
    dayB: 'Після індивідуальних промов іде 90 секунд загального обговорення, потім голосування.',
    voteTitle: '4. Голосування',
    voteCards: [
      'Гравець з найбільшою кількістю голосів вибуває з гри.',
      'Якщо за найбільшу кількість голосів є нічия, ніхто не вибуває.',
      'Таємниця ролей: ролі не відкриваються ні при вбивстві, ні при вигнанні.',
    ],
    victoryTitle: '5. Умови перемоги',
    mafiaWin: 'Перемога мафії',
    mafiaWinText: 'Мафія перемагає, якщо кількість мафіозі дорівнює або більша за кількість мирних.',
    townWin: 'Перемога мирних',
    townWinText: 'Мирні перемагають, якщо в місті не залишилось жодного мафіозі.',
    note: 'Важливо: коханка вважається частиною мафії.',
    civilianRoles: [
      {
        name: 'Мирний житель',
        icon: Users,
        tone: 'tone-civilian',
        text: 'Не прокидається вночі. Не має спеціальних здібностей.',
      },
      {
        name: 'Комісар',
        icon: Eye,
        tone: 'text-yellow-300',
        text: 'Прокидається вночі та перевіряє одного гравця. Бачить тільки сторону: мирний або мафія. Коханка також показується як мафія.',
      },
      {
        name: 'Лікар',
        icon: BriefcaseMedical,
        tone: 'text-emerald-300',
        text: 'Вночі лікує одного гравця (може себе). Якщо цього гравця намагались убити - він виживає. Не може лікувати одну й ту саму людину дві ночі поспіль.',
      },
    ],
    mafiaRoles: [
      {
        name: 'Мафія',
        icon: Skull,
        tone: 'tone-mafia',
        text: 'Звичайні мафіозі прокидаються разом і мають обрати одну й ту саму ціль. Якщо цілі різні або хтось із живих незаблокованих мафіозі не обрав ціль - це промах. Якщо незаблокована мафія одна, її вибір достатній. Мафія може обрати навіть себе.',
      },
      {
        name: 'Коханка',
        icon: Crown,
        tone: 'text-fuchsia-300',
        text: 'Частина мафії, але не знає інших мафіозі. Ходить першою вночі та блокує дію одного гравця. Не може блокувати ту саму ціль дві ночі поспіль.',
      },
    ],
    nightOrder: ['Коханка', 'Лікар', 'Комісар', 'Мафія'],
  },
}

export function RulesPage() {
  const { user } = useGame()
  const { language } = useLanguage()
  const copy = rulesCopy[language]

  return (
    <div className="page-shell">
      <SiteHeader />
      <div className="px-5 py-8 sm:px-8">
        <div className="mx-auto max-w-6xl">
        <header className="surface-card mb-7 rounded-2xl p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold tracking-[0.22em] text-red-400">RULEBOOK</p>
              <h1 className="mt-1 text-3xl font-bold sm:text-4xl">{copy.title}</h1>
              <p className="mt-2 text-[hsl(var(--muted-foreground))]">{copy.subtitle}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to="/" className="btn-base btn-outline px-4 py-2 text-sm">
                {copy.home}
              </Link>
              {user && (
                <Link to="/rooms" className="btn-base btn-primary px-4 py-2 text-sm">
                  {copy.roomsAs} {user.nickname}
                </Link>
              )}
            </div>
          </div>
        </header>

        <section className="mb-8 grid gap-4 lg:grid-cols-3">
          <article className="surface-card rounded-2xl p-5 lg:col-span-2">
            <div className="mb-3 inline-flex rounded-xl bg-[hsl(var(--primary)/0.2)] p-3">
              <Shield className="h-6 w-6 text-red-400" />
            </div>
            <h2 className="mb-3 text-2xl font-bold">{copy.essenceTitle}</h2>
            <p className="mb-3 text-[hsl(var(--muted-foreground))]">{copy.essenceA}</p>
            <p className="text-[hsl(var(--muted-foreground))]">{copy.essenceB}</p>
          </article>

          <article className="surface-card rounded-2xl p-5">
            <div className="mb-3 inline-flex rounded-xl bg-[hsl(var(--secondary)/0.2)] p-3">
              <Activity className="h-6 w-6 tone-gold" />
            </div>
            <h2 className="mb-3 text-2xl font-bold">{copy.quickTitle}</h2>
            <div className="space-y-3 text-sm text-[hsl(var(--muted-foreground))]">
              {copy.quick.map((line, index) => (
                <p key={line}>{index + 1}. {line}</p>
              ))}
            </div>
          </article>
        </section>

        <section className="mb-8">
          <h2 className="mb-4 text-2xl font-bold">{copy.rolesTitle}</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            <article className="surface-card rounded-2xl p-5">
              <h3 className="mb-4 text-xl font-bold tone-civilian">{copy.townRoles}</h3>
              <div className="space-y-3">
                {copy.civilianRoles.map(({ name, text, icon: Icon, tone }) => (
                  <div key={name} className="surface-muted rounded-xl p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <Icon className={`h-5 w-5 ${tone}`} />
                      <p className={`text-lg font-semibold ${tone}`}>{name}</p>
                    </div>
                    <p className="text-[hsl(var(--muted-foreground))]">{text}</p>
                  </div>
                ))}
              </div>
            </article>

            <article className="surface-card rounded-2xl p-5">
              <h3 className="mb-4 text-xl font-bold tone-mafia">{copy.criminals}</h3>
              <div className="space-y-3">
                {copy.mafiaRoles.map(({ name, text, icon: Icon, tone }) => (
                  <div key={name} className="surface-muted rounded-xl p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <Icon className={`h-5 w-5 ${tone}`} />
                      <p className={`text-lg font-semibold ${tone}`}>{name}</p>
                    </div>
                    <p className="text-[hsl(var(--muted-foreground))]">{text}</p>
                  </div>
                ))}
              </div>
            </article>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="mb-4 text-2xl font-bold">{copy.flowTitle}</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <article className="surface-card rounded-2xl p-5">
              <div className="mb-3 inline-flex rounded-xl bg-[hsl(var(--primary)/0.2)] p-3">
                <Moon className="h-6 w-6 tone-mafia" />
              </div>
              <h3 className="mb-3 text-xl font-bold">{copy.night}</h3>
              <p className="mb-3 text-[hsl(var(--muted-foreground))]">{copy.nightText}</p>
              <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
                {copy.nightOrder.map((role, index) => (
                  <div key={role} className="flex items-center gap-2">
                    <span className="surface-muted rounded-full px-3 py-1">{role}</span>
                    {index < copy.nightOrder.length - 1 && <ArrowRight className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />}
                  </div>
                ))}
              </div>
              <p className="rounded-xl border border-[hsl(var(--secondary)/0.45)] bg-[hsl(var(--secondary)/0.1)] p-3 text-sm text-[hsl(var(--muted-foreground))]">
                {copy.timers}
              </p>
            </article>

            <article className="surface-card rounded-2xl p-5">
              <div className="mb-3 inline-flex rounded-xl bg-[hsl(var(--secondary)/0.2)] p-3">
                <Sun className="h-6 w-6 tone-gold" />
              </div>
              <h3 className="mb-3 text-xl font-bold">{copy.day}</h3>
              <p className="mb-3 text-[hsl(var(--muted-foreground))]">{copy.dayA}</p>
              <p className="text-[hsl(var(--muted-foreground))]">{copy.dayB}</p>
            </article>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="mb-4 text-2xl font-bold">{copy.voteTitle}</h2>
          <article className="surface-card rounded-2xl p-5">
            <div className="mb-4 inline-flex rounded-xl bg-[hsl(var(--primary)/0.2)] p-3">
              <Vote className="h-6 w-6 tone-mafia" />
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {copy.voteCards.map((card) => (
                <p key={card} className="surface-muted rounded-xl p-4 text-[hsl(var(--muted-foreground))]">
                  {card}
                </p>
              ))}
            </div>
          </article>
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-bold">{copy.victoryTitle}</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <article className="surface-card rounded-2xl border-[hsl(var(--primary)/0.55)] p-5">
              <h3 className="mb-2 text-xl font-bold tone-mafia">{copy.mafiaWin}</h3>
              <p className="text-[hsl(var(--muted-foreground))]">{copy.mafiaWinText}</p>
            </article>
            <article className="surface-card rounded-2xl border-[hsl(210_100%_56%/0.55)] p-5">
              <h3 className="mb-2 text-xl font-bold tone-civilian">{copy.townWin}</h3>
              <p className="text-[hsl(var(--muted-foreground))]">{copy.townWinText}</p>
            </article>
          </div>
          <p className="mt-4 rounded-xl border border-[hsl(var(--primary)/0.45)] bg-[hsl(var(--primary)/0.08)] p-4 text-sm text-[hsl(var(--muted-foreground))]">
            {copy.note}
          </p>
        </section>
        </div>
      </div>
    </div>
  )
}
