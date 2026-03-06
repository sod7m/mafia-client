import { Link } from 'react-router-dom'
import { Activity, ArrowRight, BriefcaseMedical, Crown, Eye, Moon, Shield, Skull, Sun, Users, Vote } from 'lucide-react'
import { SiteHeader } from '../components/SiteHeader.tsx'
import { useGame } from '../context/GameContext.tsx'

const civilianRoles = [
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
    text: 'Прокидається вночі та перевіряє одного гравця. Ведучий показує: палець вниз - мирний, палець вверх - мафія.',
  },
  {
    name: 'Лікар',
    icon: BriefcaseMedical,
    tone: 'text-emerald-300',
    text: 'Вночі лікує одного гравця (може себе). Якщо цього гравця намагались убити - він виживає. Не може лікувати одну й ту саму людину дві ночі поспіль.',
  },
]

const mafiaRoles = [
  {
    name: 'Мафія',
    icon: Skull,
    tone: 'tone-mafia',
    text: 'Усі мафіозі прокидаються разом. Спільно обирають одну людину та стріляють у неї. Можуть за бажанням стріляти в повітря.',
  },
  {
    name: 'Коханка',
    icon: Crown,
    tone: 'text-fuchsia-300',
    text: 'Прокидається вночі та блокує здібність одного гравця на цю ніч. Не може блокувати того самого гравця дві ночі поспіль. Якщо заблокований гравець прокидається для виконання дії, ведучий показує йому схрещені руки.',
  },
]

const nightOrder = ['Коханка', 'Лікар', 'Мафія', 'Комісар']

export function RulesPage() {
  const { user } = useGame()

  return (
    <div className="page-shell">
      <SiteHeader />
      <div className="px-5 py-8 sm:px-8">
        <div className="mx-auto max-w-6xl">
        <header className="surface-card mb-7 rounded-2xl p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold tracking-[0.22em] text-red-400">RULEBOOK</p>
              <h1 className="mt-1 text-3xl font-bold sm:text-4xl">Правила гри «Мафія»</h1>
              <p className="mt-2 text-[hsl(var(--muted-foreground))]">
                Повний опис правил з поділом на блоки, щоб новачкам було зрозуміло, що і коли відбувається.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to="/" className="btn-base btn-outline px-4 py-2 text-sm">
                На головну
              </Link>
              {user && (
                <Link to="/rooms" className="btn-base btn-primary px-4 py-2 text-sm">
                  До кімнат як {user.nickname}
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
            <h2 className="mb-3 text-2xl font-bold">1. Суть гри</h2>
            <p className="mb-3 text-[hsl(var(--muted-foreground))]">
              Мафія - це командна психологічна гра з детективним сюжетом. Є два основні боки: мирні жителі, які
              намагаються знайти злочинців, та мафія, яка прагне знищити мирних.
            </p>
            <p className="text-[hsl(var(--muted-foreground))]">
              Кожен гравець отримує приховану роль і грає за свою команду. Ролі не розкриваються публічно під час гри.
            </p>
          </article>

          <article className="surface-card rounded-2xl p-5">
            <div className="mb-3 inline-flex rounded-xl bg-[hsl(var(--secondary)/0.2)] p-3">
              <Activity className="h-6 w-6 tone-gold" />
            </div>
            <h2 className="mb-3 text-2xl font-bold">Коротко для новачка</h2>
            <div className="space-y-3 text-sm text-[hsl(var(--muted-foreground))]">
              <p>1. Вночі активні ролі роблять дії таємно.</p>
              <p>2. Вдень усі обговорюють підозри.</p>
              <p>3. Після обговорення всі голосують.</p>
              <p>4. Раунди Ніч - День повторюються до перемоги однієї сторони.</p>
            </div>
          </article>
        </section>

        <section className="mb-8">
          <h2 className="mb-4 text-2xl font-bold">2. Ролі</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            <article className="surface-card rounded-2xl p-5">
              <h3 className="mb-4 text-xl font-bold tone-civilian">Мирні ролі</h3>
              <div className="space-y-3">
                {civilianRoles.map(({ name, text, icon: Icon, tone }) => (
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
              <h3 className="mb-4 text-xl font-bold tone-mafia">Злочинці</h3>
              <div className="space-y-3">
                {mafiaRoles.map(({ name, text, icon: Icon, tone }) => (
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
          <h2 className="mb-4 text-2xl font-bold">3. Хід гри</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <article className="surface-card rounded-2xl p-5">
              <div className="mb-3 inline-flex rounded-xl bg-[hsl(var(--primary)/0.2)] p-3">
                <Moon className="h-6 w-6 tone-mafia" />
              </div>
              <h3 className="mb-3 text-xl font-bold">Ніч</h3>
              <p className="mb-3 text-[hsl(var(--muted-foreground))]">Усі гравці закривають очі. Порядок дій ролей:</p>
              <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
                {nightOrder.map((role, index) => (
                  <div key={role} className="flex items-center gap-2">
                    <span className="surface-muted rounded-full px-3 py-1">{role}</span>
                    {index < nightOrder.length - 1 && <ArrowRight className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />}
                  </div>
                ))}
              </div>
              <p className="rounded-xl border border-[hsl(var(--secondary)/0.45)] bg-[hsl(var(--secondary)/0.1)] p-3 text-sm text-[hsl(var(--muted-foreground))]">
                Перша ніч: прокидається тільки мафія. Вбивств немає, мафія лише знайомиться між собою.
              </p>
            </article>

            <article className="surface-card rounded-2xl p-5">
              <div className="mb-3 inline-flex rounded-xl bg-[hsl(var(--secondary)/0.2)] p-3">
                <Sun className="h-6 w-6 tone-gold" />
              </div>
              <h3 className="mb-3 text-xl font-bold">День</h3>
              <p className="mb-3 text-[hsl(var(--muted-foreground))]">
                Ведучий оголошує, кого було вбито вночі. Після цього гравці обговорюють ситуацію та переходять до
                голосування.
              </p>
              <p className="text-[hsl(var(--muted-foreground))]">Вбиті гравці нічого не говорять і повністю вибувають з гри.</p>
            </article>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="mb-4 text-2xl font-bold">4. Голосування</h2>
          <article className="surface-card rounded-2xl p-5">
            <div className="mb-4 inline-flex rounded-xl bg-[hsl(var(--primary)/0.2)] p-3">
              <Vote className="h-6 w-6 tone-mafia" />
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <p className="surface-muted rounded-xl p-4 text-[hsl(var(--muted-foreground))]">
                Гравець з найбільшою кількістю голосів вибуває з гри.
              </p>
              <p className="surface-muted rounded-xl p-4 text-[hsl(var(--muted-foreground))]">
                Останнє слово дається тільки вигнаному голосуванням. Вбиті вночі мовчать.
              </p>
              <p className="surface-muted rounded-xl p-4 text-[hsl(var(--muted-foreground))]">
                Таємниця ролей: ролі не відкриваються ні при вбивстві, ні при вигнанні.
              </p>
            </div>
          </article>
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-bold">5. Умови перемоги</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <article className="surface-card rounded-2xl border-[hsl(var(--primary)/0.55)] p-5">
              <h3 className="mb-2 text-xl font-bold tone-mafia">Перемога мафії</h3>
              <p className="text-[hsl(var(--muted-foreground))]">
                Мафія перемагає, якщо кількість мафіозі дорівнює або більша за кількість мирних.
              </p>
            </article>
            <article className="surface-card rounded-2xl border-[hsl(210_100%_56%/0.55)] p-5">
              <h3 className="mb-2 text-xl font-bold tone-civilian">Перемога мирних</h3>
              <p className="text-[hsl(var(--muted-foreground))]">Мирні перемагають, якщо в місті не залишилось жодного мафіозі.</p>
            </article>
          </div>
          <p className="mt-4 rounded-xl border border-[hsl(var(--primary)/0.45)] bg-[hsl(var(--primary)/0.08)] p-4 text-sm text-[hsl(var(--muted-foreground))]">
            Важливо: коханка вважається частиною мафії.
          </p>
        </section>
        </div>
      </div>
    </div>
  )
}
