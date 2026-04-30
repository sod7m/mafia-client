import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  Camera,
  CameraOff,
  Check,
  LogOut,
  Mic,
  MicOff,
  Moon,
  Settings,
  ShieldQuestion,
  Skull,
  Sun,
  Trophy,
  Users,
  Vote,
} from 'lucide-react'
import { useGame } from '../context/GameContext.tsx'
import type { GameActionType, GamePhase, GamePlayer, GameRole, RoomPlayer } from '../types/game.ts'

type RoleKind = 'commissioner' | 'mafia' | 'doctor' | 'civilian'
type SelectionTone = 'danger' | 'inspect'

interface PlayerRole {
  label: string
  team: 'Мирні' | 'Мафія'
  kind: RoleKind
}

const phaseConfig: Record<
  GamePhase,
  {
    label: string
    icon: typeof Moon
    actionLabel: string
    actionHint: string
    duration: number
  }
> = {
  night: {
    label: 'Ніч',
    icon: Moon,
    actionLabel: 'Нічний хід',
    actionHint: 'Оберіть гравця на столі, потім підтвердіть дію справа.',
    duration: 45,
  },
  day: {
    label: 'День',
    icon: Sun,
    actionLabel: 'Обговорення',
    actionHint: 'Зараз місто обговорює підозри. Вибір цілі буде доступний під час голосування.',
    duration: 90,
  },
  voting: {
    label: 'Голосування',
    icon: Vote,
    actionLabel: 'Вигнання',
    actionHint: 'Оберіть гравця для вигнання та підтвердіть голос.',
    duration: 35,
  },
  final: {
    label: 'Фінал',
    icon: Trophy,
    actionLabel: 'Підсумок',
    actionHint: 'Партія завершена для демо-перегляду фінального стану.',
    duration: 0,
  },
}

const rolePattern: PlayerRole[] = [
  { label: 'Комісар', team: 'Мирні', kind: 'commissioner' },
  { label: 'Мафія', team: 'Мафія', kind: 'mafia' },
  { label: 'Лікар', team: 'Мирні', kind: 'doctor' },
  { label: 'Мирний', team: 'Мирні', kind: 'civilian' },
  { label: 'Мирний', team: 'Мирні', kind: 'civilian' },
  { label: 'Мафія', team: 'Мафія', kind: 'mafia' },
  { label: 'Мирний', team: 'Мирні', kind: 'civilian' },
  { label: 'Мирний', team: 'Мирні', kind: 'civilian' },
]

const roleDetails: Record<GameRole, PlayerRole> = {
  commissioner: { label: 'Комісар', team: 'Мирні', kind: 'commissioner' },
  mafia: { label: 'Мафія', team: 'Мафія', kind: 'mafia' },
  doctor: { label: 'Лікар', team: 'Мирні', kind: 'doctor' },
  civilian: { label: 'Мирний', team: 'Мирні', kind: 'civilian' },
}

const tileToneClasses = [
  'bg-[radial-gradient(circle_at_50%_45%,rgba(220,38,38,0.36),transparent_4.7rem),linear-gradient(180deg,#141414_0%,#050505_100%)]',
  'bg-[radial-gradient(circle_at_50%_45%,rgba(234,88,12,0.36),transparent_4.7rem),linear-gradient(180deg,#141414_0%,#050505_100%)]',
  'bg-[radial-gradient(circle_at_50%_45%,rgba(217,119,6,0.38),transparent_4.7rem),linear-gradient(180deg,#141414_0%,#050505_100%)]',
  'bg-[radial-gradient(circle_at_50%_45%,rgba(8,145,178,0.38),transparent_4.7rem),linear-gradient(180deg,#141414_0%,#050505_100%)]',
  'bg-[radial-gradient(circle_at_50%_45%,rgba(79,70,229,0.38),transparent_4.7rem),linear-gradient(180deg,#141414_0%,#050505_100%)]',
  'bg-[radial-gradient(circle_at_50%_45%,rgba(126,34,206,0.38),transparent_4.7rem),linear-gradient(180deg,#141414_0%,#050505_100%)]',
]

const avatarToneClasses = [
  'bg-red-700 shadow-[0_0_38px_rgba(220,38,38,0.28)]',
  'bg-orange-700 shadow-[0_0_38px_rgba(234,88,12,0.28)]',
  'bg-amber-700 shadow-[0_0_38px_rgba(217,119,6,0.28)]',
  'bg-cyan-700 shadow-[0_0_38px_rgba(8,145,178,0.28)]',
  'bg-indigo-700 shadow-[0_0_38px_rgba(79,70,229,0.28)]',
  'bg-purple-700 shadow-[0_0_38px_rgba(126,34,206,0.28)]',
]

const demoPlayerNames = [
  'Shadow',
  'Medic',
  'Margo',
  'Nora',
  'CrimsonX',
  'QuietFox',
  'Revolver',
  'BlueJay',
  'Phantom',
  'Marta',
  'Headliner',
  'Ace',
  'Ivy',
  'Bolt',
  'Vega',
  'Raven',
  'Nova',
]

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

function formatTimer(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return `${minutes}:${rest.toString().padStart(2, '0')}`
}

function getInitials(nickname: string) {
  const cleanNickname = nickname.trim()
  if (!cleanNickname) {
    return '??'
  }

  const parts = cleanNickname.split(/\s+/)
  if (parts.length > 1) {
    return parts
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase()
  }

  return cleanNickname.slice(0, 2).toUpperCase()
}

function getPlayerRole(_player: RoomPlayer, index: number, serverRole?: GameRole): PlayerRole {
  if (serverRole) {
    return roleDetails[serverRole]
  }

  return rolePattern[(index + 1) % rolePattern.length]
}

function getVisiblePlayers(players: RoomPlayer[], demoTargetCount = 10) {
  const visiblePlayers = players.slice(0, 16)
  const usedNicknames = new Set(visiblePlayers.map((player) => player.nickname))
  let demoIndex = 0

  while (visiblePlayers.length < demoTargetCount) {
    const nickname = demoPlayerNames[demoIndex] ?? `Player ${visiblePlayers.length + 1}`
    demoIndex += 1
    if (usedNicknames.has(nickname)) {
      continue
    }

    visiblePlayers.push({
      id: `demo-player-${demoIndex}`,
      nickname,
      isOwner: false,
    })
    usedNicknames.add(nickname)
  }

  return visiblePlayers
}

function getRoomPlayersFromGame(players: GamePlayer[]): RoomPlayer[] {
  return players.map((player) => ({
    id: player.id,
    nickname: player.nickname,
    isOwner: player.isOwner,
  }))
}

function getPlayerGridLayout(playerCount: number) {
  if (playerCount <= 6) {
    return { cols: 4, rows: 2, maxTile: '17rem', justify: 'justify-start' }
  }

  if (playerCount <= 8) {
    return { cols: 5, rows: 2, maxTile: '16rem', justify: 'justify-start' }
  }

  if (playerCount <= 10) {
    return { cols: 5, rows: 2, maxTile: '15.5rem', justify: 'justify-start' }
  }

  if (playerCount <= 12) {
    return { cols: 6, rows: 2, maxTile: '15rem', justify: 'justify-start' }
  }

  if (playerCount <= 15) {
    return { cols: 6, rows: 3, maxTile: '16rem', justify: 'justify-start' }
  }

  return { cols: 6, rows: 3, maxTile: '16rem', justify: 'justify-start' }
}

function getPlayerBoardStyle(layout: ReturnType<typeof getPlayerGridLayout>): CSSProperties {
  const horizontalGaps = (layout.cols - 1) * 0.75
  const verticalGaps = (layout.rows - 1) * 0.75

  return {
    '--tile-size': `min(${layout.maxTile}, calc((100vw - 22rem - ${horizontalGaps}rem) / ${layout.cols}), calc((100vh - 11rem - ${verticalGaps}rem) / ${layout.rows}))`,
    gridTemplateColumns: `repeat(${layout.cols}, var(--tile-size))`,
    gridTemplateRows: `repeat(${layout.rows}, var(--tile-size))`,
    width: `calc(${layout.cols} * var(--tile-size) + ${horizontalGaps}rem)`,
    height: `calc(${layout.rows} * var(--tile-size) + ${verticalGaps}rem)`,
  } as CSSProperties
}

function getAvatarSizeClasses(playerCount: number) {
  if (playerCount > 12) {
    return 'h-11 w-11 text-base'
  }

  if (playerCount > 8) {
    return 'h-12 w-12 text-lg'
  }

  return 'h-14 w-14 text-xl'
}

function getThemeClasses(phase: GamePhase) {
  if (phase === 'night') {
    return {
      page:
        'bg-[radial-gradient(circle_at_20%_12%,rgba(37,99,235,0.16),transparent_28rem),linear-gradient(180deg,#090d1f_0%,#050616_100%)]',
      border: 'border-blue-900/70',
      panel: 'bg-[#0a0d1d]/80',
      accent: 'text-blue-300',
      active: 'border-blue-500 bg-blue-500/20 text-white',
      hover: 'hover:border-blue-500/80',
    }
  }

  return {
    page:
      'bg-[radial-gradient(circle_at_20%_12%,rgba(220,38,38,0.18),transparent_28rem),linear-gradient(180deg,#1a0808_0%,#080814_100%)]',
    border: 'border-red-900/70',
    panel: 'bg-[#170b0d]/80',
    accent: 'text-red-300',
    active: 'border-red-500 bg-red-500/20 text-white',
    hover: 'hover:border-red-500/80',
  }
}

function getSelectedClasses(isSelected: boolean, selectionTone: SelectionTone) {
  if (!isSelected) {
    return ''
  }

  if (selectionTone === 'danger') {
    return 'border-red-400 shadow-[inset_0_0_0_1px_rgba(248,113,113,0.75),0_0_28px_rgba(220,38,38,0.38)]'
  }

  return 'border-cyan-300 shadow-[inset_0_0_0_1px_rgba(103,232,249,0.75),0_0_28px_rgba(6,182,212,0.34)]'
}

function getActionType(phase: GamePhase, role?: PlayerRole): GameActionType | null {
  if (phase === 'voting') {
    return 'vote'
  }

  if (phase !== 'night') {
    return null
  }

  if (role?.kind === 'mafia') {
    return 'mafia_kill'
  }
  if (role?.kind === 'commissioner') {
    return 'inspect'
  }
  if (role?.kind === 'doctor') {
    return 'heal'
  }

  return null
}

function getRoleLabel(role?: GameRole) {
  return role ? roleDetails[role].label : 'Невідомо'
}

export function GamePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const {
    getGameByRoomId,
    getRoomById,
    isLoading,
    leaveRoom,
    loadGame,
    loadRoom,
    setGamePhase,
    startRoom,
    submitGameAction,
    user,
  } = useGame()
  const [phase, setPhase] = useState<GamePhase>('night')
  const [dayNumber, setDayNumber] = useState(1)
  const [nightNumber, setNightNumber] = useState(1)
  const [secondsLeft, setSecondsLeft] = useState(phaseConfig.night.duration)
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null)
  const [actionFeedback, setActionFeedback] = useState('')
  const [overlayText, setOverlayText] = useState('Ніч 1')
  const [micEnabled, setMicEnabled] = useState(true)
  const [cameraEnabled, setCameraEnabled] = useState(true)

  const room = useMemo(() => (id ? getRoomById(id) : undefined), [getRoomById, id])
  const game = useMemo(() => (id ? getGameByRoomId(id) : undefined), [getGameByRoomId, id])
  const serverPlayers = useMemo(
    () => (game ? getRoomPlayersFromGame(game.players) : room?.players ?? []),
    [game, room?.players],
  )
  const visiblePlayers = useMemo(() => getVisiblePlayers(serverPlayers), [serverPlayers])
  const currentPlayer = visiblePlayers.find((player) => player.id === user?.id)
  const gamePlayersById = useMemo(
    () => new Map((game?.players ?? []).map((player) => [player.id, player])),
    [game?.players],
  )
  const playerRoles = useMemo(
    () =>
      new Map(
        visiblePlayers.map((player, index) => [
          player.id,
          getPlayerRole(player, index, gamePlayersById.get(player.id)?.role),
        ]),
      ),
    [gamePlayersById, visiblePlayers],
  )
  const currentRole = currentPlayer ? playerRoles.get(currentPlayer.id) : undefined
  const selectedTarget = visiblePlayers.find((player) => player.id === selectedTargetId)
  const selectedTargetState = selectedTarget ? gamePlayersById.get(selectedTarget.id) : undefined
  const phaseDetails = phaseConfig[phase]
  const PhaseIcon = phaseDetails.icon
  const phaseNumber = phase === 'night' ? nightNumber : dayNumber
  const theme = getThemeClasses(phase)
  const playerGridLayout = getPlayerGridLayout(visiblePlayers.length)
  const playerBoardStyle = getPlayerBoardStyle(playerGridLayout)
  const avatarSizeClasses = getAvatarSizeClasses(visiblePlayers.length)
  const currentActionType = getActionType(phase, currentRole)
  const canSelectTarget = !!currentActionType
  const selectionTone: SelectionTone = currentRole?.kind === 'mafia' || phase === 'voting' ? 'danger' : 'inspect'
  const currentTurn =
    phase === 'night'
      ? currentRole?.kind === 'mafia'
        ? 'Хід Мафії'
        : currentRole?.kind === 'commissioner'
          ? 'Хід Комісара'
          : currentRole?.kind === 'doctor'
            ? 'Хід Лікаря'
            : 'Хід нічних ролей'
      : phase === 'voting'
        ? 'Голосування міста'
        : phase === 'day'
          ? 'Обговорення міста'
          : 'Фінал гри'
  const confirmLabel =
    phase === 'voting'
      ? 'Підтвердити голос'
      : currentRole?.kind === 'mafia'
        ? 'Підтвердити вбивство'
        : currentRole?.kind === 'doctor'
          ? 'Підтвердити лікування'
          : 'Підтвердити перевірку'
  const recentEvents = useMemo(() => (game?.events ?? []).slice(-4).reverse(), [game?.events])

  useEffect(() => {
    if (!id || room) {
      return
    }

    void loadRoom(id)
  }, [id, loadRoom, room])

  useEffect(() => {
    if (!id || !room || room.status !== 'in_progress' || game) {
      return
    }

    void loadGame(id)
  }, [game, id, loadGame, room])

  useEffect(() => {
    if (!id || !room) {
      return
    }

    const intervalId = window.setInterval(() => {
      void loadRoom(id, { silent: true })
    }, 5000)

    return () => window.clearInterval(intervalId)
  }, [id, loadRoom, room])

  useEffect(() => {
    if (!id || !game) {
      return
    }

    const intervalId = window.setInterval(() => {
      void loadGame(id, { silent: true })
    }, 5000)

    return () => window.clearInterval(intervalId)
  }, [game, id, loadGame])

  useEffect(() => {
    if (!game) {
      return
    }

    setPhase(game.phase)
    setDayNumber(game.round)
    setNightNumber(game.round)
  }, [game])

  useEffect(() => {
    setSecondsLeft(phaseDetails.duration)
    setSelectedTargetId(null)
    setActionFeedback('')
  }, [phase, phaseDetails.duration])

  useEffect(() => {
    if (phase === 'final') {
      return
    }

    const timer = window.setInterval(() => {
      setSecondsLeft((current) => Math.max(0, current - 1))
    }, 1000)

    return () => window.clearInterval(timer)
  }, [phase])

  useEffect(() => {
    const text = phase === 'final' ? 'Фінал' : `${phaseDetails.label} ${phaseNumber}`
    setOverlayText(text)

    const timeoutId = window.setTimeout(() => {
      setOverlayText('')
    }, 1200)

    return () => window.clearTimeout(timeoutId)
  }, [phase, phaseDetails.label, phaseNumber])

  if (!room) {
    if (isLoading) {
      return (
        <div className="grid h-screen place-items-center overflow-hidden bg-[#050616] p-5 text-white">
          <div className="surface-card w-full max-w-lg rounded-2xl p-6 text-center">
            <h1 className="text-3xl font-bold">Завантаження партії...</h1>
          </div>
        </div>
      )
    }

    return (
      <div className="grid h-screen place-items-center overflow-hidden bg-[#050616] p-5 text-white">
        <div className="surface-card w-full max-w-lg rounded-2xl p-6 text-center">
          <h1 className="text-3xl font-bold">Кімнату не знайдено</h1>
          <p className="mt-3 text-[hsl(var(--muted-foreground))]">Партія недоступна або вже видалена.</p>
          <Link to="/rooms" className="btn-base btn-primary mt-5 px-4 py-2 text-sm">
            До лобі
          </Link>
        </div>
      </div>
    )
  }

  const handleStartFromGame = async () => {
    if (room.ownerId !== user?.id) {
      navigate(`/room/${room.id}`)
      return
    }

    const result = await startRoom(room.id)
    if (result.ok) {
      navigate(`/room/${room.id}/game`)
    }
  }

  if (room.status !== 'in_progress') {
    return (
      <div className="grid h-screen place-items-center overflow-hidden bg-[#050616] p-5 text-white">
        <div className="surface-card w-full max-w-lg rounded-2xl p-6 text-center">
          <h1 className="text-3xl font-bold">Гра ще не запущена</h1>
          <p className="mt-3 text-[hsl(var(--muted-foreground))]">Запустіть демо-режим, щоб перейти до столу.</p>
          <button type="button" onClick={handleStartFromGame} className="btn-base btn-primary mt-5 px-5 py-3 text-sm">
            Демо старт
          </button>
        </div>
      </div>
    )
  }

  if (!game && isLoading) {
    return (
      <div className="grid h-screen place-items-center overflow-hidden bg-[#050616] p-5 text-white">
        <div className="surface-card w-full max-w-lg rounded-2xl p-6 text-center">
          <h1 className="text-3xl font-bold">Завантаження стану гри...</h1>
        </div>
      </div>
    )
  }

  const handleLeaveGame = async () => {
    await leaveRoom(room.id)
    navigate('/rooms')
  }

  const handlePhaseSwitch = async (nextPhase: GamePhase) => {
    if (room.ownerId !== user?.id) {
      return
    }

    await setGamePhase(room.id, nextPhase)
  }

  const handlePlayerClick = (player: RoomPlayer) => {
    const playerState = gamePlayersById.get(player.id)
    const isSelf = player.id === user?.id

    if (!canSelectTarget || playerState?.isAlive === false) {
      return
    }
    if (isSelf && currentActionType !== 'heal') {
      return
    }

    setSelectedTargetId((current) => (current === player.id ? null : player.id))
    setActionFeedback('')
  }

  const handleConfirmAction = async () => {
    if (!selectedTarget || !currentActionType) {
      return
    }

    const result = await submitGameAction(room.id, currentActionType, selectedTarget.id)
    if (!result.ok) {
      setActionFeedback(result.error ?? 'Не вдалося виконати дію.')
      return
    }

    if (currentActionType === 'inspect') {
      const inspectEvent = result.game?.events
        .slice()
        .reverse()
        .find((event) => event.type === 'inspect.resolved' && event.targetId === selectedTarget.id)
      const inspectedTarget = result.game?.players.find((player) => player.id === selectedTarget.id)
      setActionFeedback(
        inspectEvent?.message ??
          `Результат перевірки: ${selectedTarget.nickname} — ${getRoleLabel(inspectedTarget?.role ?? selectedTargetState?.role)}`,
      )
    } else {
      setActionFeedback(`${confirmLabel}: ${selectedTarget.nickname}`)
    }
    setSelectedTargetId(null)
  }

  return (
    <div className={cx('flex h-screen flex-col overflow-hidden text-white', theme.page)}>
      {overlayText && (
        <div className="pointer-events-none fixed inset-0 z-[80] grid animate-[phaseOverlay_1.2s_ease_forwards] place-items-center bg-black/80 text-6xl font-black max-sm:text-5xl">
          {overlayText}
        </div>
      )}

      <header className={cx('grid h-16 shrink-0 grid-cols-[minmax(8rem,1fr)_auto_minmax(8rem,1fr)] items-center gap-4 border-b bg-black/80 px-6 max-md:h-auto max-md:grid-cols-1 max-md:gap-3 max-md:p-3', theme.border)}>
        <Link to="/" className="inline-flex w-fit items-center gap-2 text-2xl font-extrabold tracking-[0.08em] text-[hsl(var(--secondary))]">
          <Skull className="h-4 w-4" />
          MAFIA
        </Link>

        <div className={cx('inline-flex items-center justify-center gap-4 rounded-lg border px-4 py-2 text-sm font-bold text-neutral-200 max-md:w-full max-md:justify-between max-md:text-xs', theme.border, theme.panel)}>
          <span className={cx('inline-flex items-center gap-2', theme.accent)}>
            <PhaseIcon className="h-4 w-4" />
            {phaseDetails.label} {phaseNumber}
          </span>
          <span>{formatTimer(secondsLeft)}</span>
          <span className="inline-flex items-center gap-2">
            <Users className="h-4 w-4" />
            {visiblePlayers.length}/{room.maxPlayers}
          </span>
        </div>

        <button type="button" onClick={handleLeaveGame} className="btn-base btn-danger justify-self-end rounded-lg px-4 py-2 text-sm max-md:justify-self-start">
          <LogOut className="h-4 w-4" />
          Вийти
        </button>
      </header>

      <main className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_20rem] max-lg:grid-cols-1">
        <section className="flex min-h-0 min-w-0 flex-col p-4 max-md:p-3">
          <div className={cx('min-h-0 flex-1 overflow-hidden', 'grid', playerGridLayout.justify, 'content-start')}>
            <div
              className="grid max-h-full max-w-full content-start justify-start gap-3"
              style={playerBoardStyle}
            >
              {visiblePlayers.map((player, index) => {
                const role = playerRoles.get(player.id)
                const playerState = gamePlayersById.get(player.id)
                const isAlive = playerState?.isAlive ?? true
                const isSelected = selectedTargetId === player.id
                const isSelf = player.id === user?.id
                const isMuted = index % 5 === 2
                const isCameraOff = index % 4 === 1
                const isSelectable =
                  canSelectTarget &&
                  isAlive &&
                  (!isSelf || currentActionType === 'heal')

                return (
                  <button
                    key={player.id}
                    type="button"
                    onClick={() => handlePlayerClick(player)}
                    className={cx(
                      'relative isolate grid aspect-square h-full w-full min-h-0 overflow-hidden rounded-lg border border-slate-700/80 text-white transition hover:brightness-105',
                      tileToneClasses[index % tileToneClasses.length],
                      theme.hover,
                      isSelf && 'border-yellow-400/70',
                      !isAlive && 'grayscale opacity-45',
                      !isSelectable && 'cursor-default hover:border-slate-700/80 hover:brightness-100',
                      getSelectedClasses(isSelected, selectionTone),
                    )}
                  >
                    <span className={cx('place-self-center inline-flex items-center justify-center rounded-full font-black', avatarSizeClasses, avatarToneClasses[index % avatarToneClasses.length])}>
                      {getInitials(player.nickname)}
                    </span>

                    <span className="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-2 text-xs font-extrabold">
                      <span className="truncate">{player.nickname}</span>
                      <span className="flex shrink-0 items-center gap-1">
                        {!isAlive && <span className="rounded-full bg-neutral-700 px-1.5 py-0.5 text-[0.62rem]">Вибув</span>}
                        {isSelf && <span className="rounded-full bg-emerald-600 px-1.5 py-0.5 text-[0.62rem]">Ви</span>}
                      </span>
                    </span>

                    <span className="absolute right-2 top-2 inline-flex items-center gap-1 text-[0.68rem] font-bold text-neutral-400">
                      {role?.team}
                      {isMuted && <MicOff className="h-3.5 w-3.5" />}
                      {isCameraOff && <CameraOff className="h-3.5 w-3.5" />}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

        </section>

        <aside className={cx('flex min-h-0 flex-col gap-4 border-l bg-black/80 p-4 max-lg:hidden', theme.border)}>
          <section className={cx('rounded-xl border p-4', theme.border, theme.panel)}>
            <p className="mb-3 text-xs font-extrabold uppercase text-neutral-500">Ваша роль</p>
            <div className="flex items-center gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-yellow-400/15 text-yellow-400">
                <ShieldQuestion className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-black">{currentRole?.label ?? 'Спостерігач'}</h2>
                <p className="text-sm text-neutral-500">{currentRole?.team ?? 'Поза столом'}</p>
              </div>
            </div>
          </section>

          <section className={cx('rounded-xl border p-4', theme.border, theme.panel)}>
            <p className="mb-3 text-xs font-extrabold uppercase text-neutral-500">Зараз</p>
            <h2 className="font-black">{currentTurn}</h2>
            <p className="mt-2 text-sm leading-6 text-neutral-500">{phaseDetails.actionHint}</p>

            <div className="my-4 grid gap-1 rounded-lg bg-white/5 p-3">
              <span className="text-xs font-extrabold uppercase text-neutral-500">{phaseDetails.actionLabel}</span>
              <strong className="text-sm">
                {selectedTarget
                  ? selectedTargetState?.isAlive === false
                    ? `${selectedTarget.nickname} вже вибув`
                    : selectedTarget.nickname
                  : 'Ціль не вибрана'}
              </strong>
            </div>

            <button
              type="button"
              onClick={handleConfirmAction}
              disabled={!selectedTarget || selectedTargetState?.isAlive === false}
              className="btn-base btn-primary w-full px-4 py-3 text-sm disabled:pointer-events-none disabled:opacity-45"
            >
              <Check className="h-4 w-4" />
              {confirmLabel}
            </button>

            {actionFeedback && (
              <p className="mt-3 rounded-lg bg-emerald-500/15 p-3 text-sm font-bold text-emerald-200">{actionFeedback}</p>
            )}
          </section>

          {recentEvents.length > 0 && (
            <section className={cx('rounded-xl border p-4', theme.border, theme.panel)}>
              <p className="mb-3 text-xs font-extrabold uppercase text-neutral-500">Журнал гри</p>
              <div className="grid gap-2">
                {recentEvents.map((event) => (
                  <p key={event.id} className="rounded-lg bg-white/5 p-3 text-sm leading-5 text-neutral-300">
                    {event.message}
                  </p>
                ))}
              </div>
            </section>
          )}
        </aside>
      </main>

      <footer className="grid h-20 shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-4 border-t border-neutral-800 bg-neutral-950/95 px-6 max-md:h-auto max-md:grid-cols-1 max-md:justify-items-center max-md:p-3">
        <div className="flex min-w-0 items-center gap-3 justify-self-start max-md:w-full">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-700 text-xs font-black">
            {getInitials(user?.nickname ?? '?')}
          </span>
          <span className="grid min-w-0">
            <strong className="truncate text-sm">{user?.nickname}</strong>
            <small className="text-xs font-extrabold text-yellow-400">{currentRole?.label ?? 'Глядач'}</small>
          </span>
        </div>

        <div className="inline-flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMicEnabled((current) => !current)}
            className={cx(
              'inline-flex h-11 w-11 items-center justify-center rounded-lg border border-neutral-700 bg-white/10 transition hover:border-red-500/80 hover:bg-red-500/15',
              !micEnabled && 'border-red-500/80 bg-red-500/15 text-red-200',
            )}
            title={micEnabled ? 'Вимкнути мікрофон' : 'Увімкнути мікрофон'}
            aria-label={micEnabled ? 'Вимкнути мікрофон' : 'Увімкнути мікрофон'}
          >
            {micEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
          </button>
          <button
            type="button"
            onClick={() => setCameraEnabled((current) => !current)}
            className={cx(
              'inline-flex h-11 w-11 items-center justify-center rounded-lg border border-neutral-700 bg-white/10 transition hover:border-red-500/80 hover:bg-red-500/15',
              !cameraEnabled && 'border-red-500/80 bg-red-500/15 text-red-200',
            )}
            title={cameraEnabled ? 'Вимкнути камеру' : 'Увімкнути камеру'}
            aria-label={cameraEnabled ? 'Вимкнути камеру' : 'Увімкнути камеру'}
          >
            {cameraEnabled ? <Camera className="h-5 w-5" /> : <CameraOff className="h-5 w-5" />}
          </button>
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-neutral-700 bg-white/10 transition hover:border-red-500/80 hover:bg-red-500/15"
            title="Налаштування"
            aria-label="Налаштування"
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>

        {room.ownerId === user?.id ? (
          <div className="flex flex-wrap items-center justify-end gap-2 justify-self-end text-xs text-neutral-500 max-md:justify-center">
            <span>Демо:</span>
            {(['night', 'day', 'voting', 'final'] as GamePhase[]).map((demoPhase) => {
              const DemoIcon = phaseConfig[demoPhase].icon
              return (
                <button
                  key={demoPhase}
                  type="button"
                  onClick={() => handlePhaseSwitch(demoPhase)}
                  className={cx(
                    'inline-flex h-8 items-center gap-1 rounded border border-neutral-700 bg-neutral-900/80 px-3 font-bold text-neutral-400',
                    phase === demoPhase && theme.active,
                  )}
                >
                  <DemoIcon className="h-4 w-4" />
                  {phaseConfig[demoPhase].label}
                </button>
              )
            })}
          </div>
        ) : (
          <div className="justify-self-end text-xs font-bold text-neutral-500 max-md:justify-self-center">
            Фазами керує власник кімнати
          </div>
        )}
      </footer>
    </div>
  )
}
