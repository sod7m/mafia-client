import { useCallback, useEffect, useRef, useState } from 'react'
import { Mic, MicOff, Skull, Trophy } from 'lucide-react'
import { useLanguage } from '../context/useLanguage.ts'
import { useVoice } from '../context/VoiceContext.tsx'
import type { Game, GameRole } from '../types/game.ts'

interface Props {
  game: Game
  currentUserId?: string
  onLeave: () => void
}

const endCopy = {
  en: {
    roleLabel: {
      commissioner: 'Commissioner',
      doctor: 'Doctor',
      civilian: 'Civilian',
      mafia: 'Syndicate',
      mistress: 'Lover',
    },
    roleDetail: {
      commissioner: { team: 'Town', kind: 'town' as const },
      doctor: { team: 'Town', kind: 'town' as const },
      civilian: { team: 'Town', kind: 'town' as const },
      mafia: { team: 'Syndicate', kind: 'mafia' as const },
      mistress: { team: 'Syndicate', kind: 'mafia' as const },
    },
    townWonTitle: 'TOWN WINS',
    mafiaWonTitle: 'SYNDICATE WINS',
    townWonText: 'Town wins. Every syndicate member has been eliminated.',
    mafiaWonText: 'Syndicate wins. The town can no longer outvote them.',
    winners: 'Winners',
    losers: 'Defeated',
    returnIn: 'Returning to lobby in',
    seconds: 's',
    micOff: 'Mute microphone',
    micOn: 'Unmute microphone',
    lobby: 'Lobby',
    you: 'You',
    alive: 'Alive',
    dead: 'Dead',
  },
  uk: {
    roleLabel: {
      commissioner: 'Комісар',
      doctor: 'Лікар',
      civilian: 'Мирний',
      mafia: 'Мафія',
      mistress: 'Коханка',
    },
    roleDetail: {
      commissioner: { team: 'Мирні', kind: 'town' as const },
      doctor: { team: 'Мирні', kind: 'town' as const },
      civilian: { team: 'Мирні', kind: 'town' as const },
      mafia: { team: 'Мафія', kind: 'mafia' as const },
      mistress: { team: 'Мафія', kind: 'mafia' as const },
    },
    townWonTitle: 'МІСТО ПЕРЕМОГЛО',
    mafiaWonTitle: 'МАФІЯ ПЕРЕМОГЛА',
    townWonText: 'Мирні перемогли. Уся мафія вибула.',
    mafiaWonText: 'Мафія перемогла. Її вже не можна переголосувати.',
    winners: 'Переможці',
    losers: 'Програли',
    returnIn: 'Повернення до лобі через',
    seconds: 'с',
    micOff: 'Вимкнути мікрофон',
    micOn: 'Увімкнути мікрофон',
    lobby: 'До лобі',
    you: 'Ви',
    alive: 'Живий',
    dead: 'Загинув',
  },
}

const AUTO_REDIRECT_SECONDS = 20

function isMafia(role?: GameRole) {
  return role === 'mafia' || role === 'mistress'
}

function initials(nickname: string) {
  const s = nickname.trim()
  if (!s) return '??'
  const parts = s.split(/\s+/)
  return parts.length > 1
    ? parts
        .slice(0, 2)
        .map((p) => p[0])
        .join('')
        .toUpperCase()
    : s.slice(0, 2).toUpperCase()
}

export function GameOverScreen({ game, currentUserId, onLeave }: Props) {
  const { language } = useLanguage()
  const copy = endCopy[language]
  const [countdown, setCountdown] = useState(AUTO_REDIRECT_SECONDS)
  const hasLeft = useRef(false)
  const { micWanted, toggleMic } = useVoice()

  const safeLeave = useCallback(() => {
    if (hasLeft.current) return
    hasLeft.current = true
    onLeave()
  }, [onLeave])

  useEffect(() => {
    if (countdown <= 0) {
      safeLeave()
      return
    }
    const t = window.setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => window.clearTimeout(t)
  }, [countdown, safeLeave])

  const townWon = !game.players.some((player) => player.isAlive && isMafia(player.role))
  const finishedText = townWon ? copy.townWonText : copy.mafiaWonText

  const winners = game.players.filter((p) => (townWon ? !isMafia(p.role) : isMafia(p.role)))
  const losers = game.players.filter((p) => (townWon ? isMafia(p.role) : !isMafia(p.role)))

  const WinIcon = townWon ? Trophy : Skull

  const accent = townWon ? 'text-blue-300' : 'text-red-400'
  const borderAccent = townWon ? 'border-blue-500/30' : 'border-red-500/30'
  const iconGlow = townWon
    ? 'shadow-[0_0_64px_rgba(37,99,235,0.45)]'
    : 'shadow-[0_0_64px_rgba(220,38,38,0.45)]'
  const winCardBorder = townWon ? 'border-blue-500/35 bg-blue-500/5' : 'border-red-500/35 bg-red-500/5'
  const winAvatarBg = townWon ? 'bg-blue-700' : 'bg-red-700'
  const bg = townWon
    ? 'bg-[radial-gradient(ellipse_at_50%_0%,rgba(37,99,235,0.22),transparent_55%),linear-gradient(180deg,#06091e_0%,#030308_100%)]'
    : 'bg-[radial-gradient(ellipse_at_50%_0%,rgba(220,38,38,0.22),transparent_55%),linear-gradient(180deg,#1a0606_0%,#070308_100%)]'

  return (
    <div className={`flex min-h-screen flex-col overflow-y-auto text-white ${bg}`}>
      {/* ── Winner announcement ───────────────────────────────────────── */}
      <div className="flex flex-col items-center px-6 pb-10 pt-16 text-center animate-[fadeIn_0.65s_ease-out]">
        <div
          className={`mb-7 inline-flex h-[4.75rem] w-[4.75rem] items-center justify-center rounded-full border ${borderAccent} bg-white/5 ${iconGlow}`}
        >
          <WinIcon className={`h-[2.2rem] w-[2.2rem] ${accent}`} />
        </div>

        <h1 className={`text-5xl font-black tracking-tight ${accent} max-sm:text-[2.1rem]`}>
          {townWon ? copy.townWonTitle : copy.mafiaWonTitle}
        </h1>

        <p className="mt-3 max-w-sm text-[0.97rem] leading-relaxed text-neutral-400">
          {finishedText}
        </p>
      </div>

      <div className="mx-auto w-full max-w-3xl border-t border-white/10 px-6" />

      {/* ── Player results ────────────────────────────────────────────── */}
      <div className="mx-auto w-full max-w-3xl flex-1 grid gap-8 px-6 py-10 sm:grid-cols-2">
        <section className="animate-[slideUp_0.5s_ease-out_0.18s_both]">
          <p className={`mb-4 text-[0.68rem] font-extrabold uppercase tracking-[0.12em] ${accent}`}>
            {copy.winners}
          </p>
          <div className="grid gap-2">
            {winners.map((p, i) => (
              <PlayerCard
                key={p.id}
                nickname={p.nickname}
                role={p.role}
                isAlive={p.isAlive}
                isSelf={p.id === currentUserId}
                isWinner
                cardBorder={winCardBorder}
                avatarBg={winAvatarBg}
                delay={100 + i * 60}
                copy={copy}
              />
            ))}
          </div>
        </section>

        <section className="animate-[slideUp_0.5s_ease-out_0.32s_both]">
          <p className="mb-4 text-[0.68rem] font-extrabold uppercase tracking-[0.12em] text-neutral-500">
            {copy.losers}
          </p>
          <div className="grid gap-2">
            {losers.map((p, i) => (
              <PlayerCard
                key={p.id}
                nickname={p.nickname}
                role={p.role}
                isAlive={p.isAlive}
                isSelf={p.id === currentUserId}
                isWinner={false}
                cardBorder={winCardBorder}
                avatarBg={winAvatarBg}
                delay={180 + i * 60}
                copy={copy}
              />
            ))}
          </div>
        </section>
      </div>

      {/* ── Footer / CTA ──────────────────────────────────────────────── */}
      <div className="sticky bottom-0 border-t border-white/10 bg-black/75 px-6 py-4 backdrop-blur-sm animate-[fadeIn_0.5s_ease-out_0.6s_both]">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4">
          <span className="text-sm text-neutral-500">
            {copy.returnIn}{' '}
            <span className="font-bold tabular-nums text-neutral-300">{countdown}{copy.seconds}</span>
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleMic}
              title={micWanted ? copy.micOff : copy.micOn}
              aria-label={micWanted ? copy.micOff : copy.micOn}
              className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border transition ${
                micWanted
                  ? 'border-neutral-700 bg-white/10 hover:bg-white/15'
                  : 'border-red-500/70 bg-red-500/15 text-red-200'
              }`}
            >
              {micWanted ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
            </button>
            <button type="button" onClick={safeLeave} className="btn-base btn-primary px-6 py-2.5 text-sm">
              {copy.lobby}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

interface PlayerCardProps {
  nickname: string
  role?: GameRole
  isAlive: boolean
  isSelf: boolean
  isWinner: boolean
  cardBorder: string
  avatarBg: string
  delay: number
  copy: typeof endCopy.en
}

function PlayerCard({ nickname, role, isAlive, isSelf, isWinner, cardBorder, avatarBg, delay, copy }: PlayerCardProps) {
  const roleInfo = role ? copy.roleDetail[role] : null

  return (
    <div
      className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-opacity animate-[slideUp_0.4s_ease-out_both] ${
        isWinner ? cardBorder : 'border-neutral-700/40 bg-white/[0.025] opacity-55'
      }`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <span
        className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-black ${
          isWinner ? avatarBg : 'bg-neutral-700'
        }`}
      >
        {initials(nickname)}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-bold">{nickname}</span>
          {isSelf && (
            <span className="shrink-0 rounded-full bg-yellow-500/20 px-1.5 py-px text-[0.58rem] font-bold text-yellow-400">
              {copy.you}
            </span>
          )}
        </div>
        <span className="text-xs text-neutral-400">
          {role ? copy.roleLabel[role] : '—'}
          {roleInfo && (
            <span
              className={`ml-1.5 ${roleInfo.kind === 'mafia' ? 'text-red-400/70' : 'text-blue-400/70'}`}
            >
              · {roleInfo.team}
            </span>
          )}
        </span>
      </div>

      <span className={`shrink-0 text-xs font-bold ${isAlive ? 'text-emerald-400' : 'text-neutral-600'}`}>
        {isAlive ? copy.alive : copy.dead}
      </span>
    </div>
  )
}
