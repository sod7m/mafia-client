import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Check, Copy, LogOut, Play, UserRound, Users } from 'lucide-react'
import { SiteHeader } from '../components/SiteHeader.tsx'
import { useGame } from '../context/GameContext.tsx'
import { useLanguage } from '../context/useLanguage.ts'
import { MIN_PLAYERS_IN_ROOM, roomStatusLabel } from '../lib/roomStatus.ts'
import type { RoomStatus } from '../types/game.ts'

const statusClass: Record<RoomStatus, string> = {
  waiting: 'status-waiting',
  recruiting: 'status-recruiting',
  preparation: 'status-preparation',
  in_progress: 'status-in_progress',
  finished: 'status-finished',
}

const roomCopy = {
  en: {
    waiting: 'Waiting',
    loading: 'Loading room...',
    notFound: 'Room not found',
    notFoundText: 'It may have been deleted or is no longer available.',
    backToRooms: 'Back to rooms',
    joinFailed: 'Could not join the room.',
    startFailed: 'Could not start the game.',
    copyFailed: 'Could not copy the room code.',
    yourNickname: 'Your nickname',
    roomCode: 'Room code',
    copyCode: 'Copy room code',
    leaveRoom: 'Leave room',
    players: 'Players',
    start: 'Start',
    waitOwner: 'Waiting for owner',
    goToGame: 'Go to game',
    notParticipant: 'You are not in this room yet.',
    joinRoom: 'Join room',
    waitingPlayer: 'Waiting for player...',
    owner: 'Owner',
    you: 'You',
    roomState: 'Room status',
    stateLines: [
      'The room stays available until the owner presses “Start”.',
      `At least ${MIN_PLAYERS_IN_ROOM} players are required to start.`,
      'After the start, it disappears from the public room list.',
      'Only the room owner can start the game and control phases.',
    ],
    participants: 'Participants',
  },
  uk: {
    waiting: 'Очікування',
    loading: 'Завантаження кімнати...',
    notFound: 'Кімнату не знайдено',
    notFoundText: 'Можливо, вона вже видалена або недоступна.',
    backToRooms: 'Повернутися до списку кімнат',
    joinFailed: 'Не вдалося приєднатися до кімнати.',
    startFailed: 'Не вдалося почати гру.',
    copyFailed: 'Не вдалося скопіювати код кімнати.',
    yourNickname: 'Ваш nickname',
    roomCode: 'Код кімнати',
    copyCode: 'Скопіювати код кімнати',
    leaveRoom: 'Вийти з кімнати',
    players: 'Склад гравців',
    start: 'Старт',
    waitOwner: 'Очікуємо власника',
    goToGame: 'Перейти до гри',
    notParticipant: 'Ви ще не додані до списку учасників цієї кімнати.',
    joinRoom: 'Приєднатися до кімнати',
    waitingPlayer: 'Очікування гравця...',
    owner: 'Власник',
    you: 'Ви',
    roomState: 'Стан кімнати',
    stateLines: [
      'Кімната доступна, доки власник не натисне «Старт».',
      `Для старту потрібно мінімум ${MIN_PLAYERS_IN_ROOM} гравців.`,
      'Після старту вона зникає зі списку загальних кімнат.',
      'Старт і керування фазами доступні тільки власнику кімнати.',
    ],
    participants: 'Учасники',
  },
}

export function RoomPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { apiError, getRoomById, isLoading, joinRoom, leaveRoom, loadRoom, startRoom, user } = useGame()
  const { language } = useLanguage()
  const copy = roomCopy[language]
  const [pageError, setPageError] = useState('')
  const [copied, setCopied] = useState(false)

  const room = useMemo(() => (id ? getRoomById(id) : undefined), [getRoomById, id])
  const isParticipant = !!(room && user && room.players.some((player) => player.id === user.id))
  const isRoomOwner = !!(room && user && room.ownerId === user.id)
  const hasEnoughPlayersToStart = !!room && room.players.length >= MIN_PLAYERS_IN_ROOM
  const roomStatusBadge =
    room && (room.status === 'waiting' || room.status === 'recruiting' || room.status === 'preparation')
      ? { label: copy.waiting, className: 'status-waiting' }
      : room
        ? { label: roomStatusLabel[language][room.status], className: statusClass[room.status] }
        : null

  useEffect(() => {
    if (!id || room) {
      return
    }

    void loadRoom(id)
  }, [id, loadRoom, room])

  useEffect(() => {
    if (!id || !room) {
      return
    }

    const intervalId = window.setInterval(() => {
      void loadRoom(id, { silent: true })
    }, 3000)

    return () => window.clearInterval(intervalId)
  }, [id, loadRoom, room])

  useEffect(() => {
    if (!room || !isParticipant || room.status !== 'in_progress') {
      return
    }

    navigate(`/room/${room.id}/game`)
  }, [isParticipant, navigate, room])

  if (!room) {
    if (isLoading) {
      return (
        <div className="page-shell">
          <SiteHeader />
          <div className="grid min-h-[calc(100vh-150px)] place-items-center p-5">
            <div className="surface-card w-full max-w-lg rounded-2xl p-6 text-center">
              <h1 className="text-3xl font-bold">{copy.loading}</h1>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="page-shell">
        <SiteHeader />
        <div className="grid min-h-[calc(100vh-150px)] place-items-center p-5">
          <div className="surface-card w-full max-w-lg rounded-2xl p-6 text-center">
            <h1 className="text-3xl font-bold">{copy.notFound}</h1>
            <p className="mt-3 text-[hsl(var(--muted-foreground))]">{copy.notFoundText}</p>
            <Link to="/rooms" className="btn-base btn-primary mt-5 px-4 py-2 text-sm">
              {copy.backToRooms}
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const leaveOnlyRoom = async () => {
    if (id) {
      await leaveRoom(id)
    }
    navigate('/rooms')
  }

  const handleJoinRoom = async () => {
    const result = await joinRoom(room.id)
    if (!result.ok) {
      setPageError(result.error ?? copy.joinFailed)
      return
    }

    setPageError('')
  }

  const handleStartGame = async () => {
    const result = await startRoom(room.id)
    if (!result.ok) {
      setPageError(result.error ?? copy.startFailed)
      return
    }

    setPageError('')
    navigate(`/room/${room.id}/game`)
  }

  const copyRoomCode = async () => {
    try {
      await navigator.clipboard.writeText(room.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setPageError(copy.copyFailed)
    }
  }

  return (
    <div className="page-shell">
      <SiteHeader />
      <div className="px-4 py-5 sm:px-8 sm:py-8">
        <div className="mx-auto max-w-7xl space-y-6">
        <header className="surface-card rounded-2xl p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-4 max-sm:flex-col">
            <div>
              <p className="text-xs font-semibold tracking-[0.22em] text-red-400">ROOM</p>
              <h1 className="mt-1 text-3xl font-bold">{room.name}</h1>
              <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">{copy.yourNickname}: {user?.nickname}</p>
              <div className="mt-2">
                {roomStatusBadge && <span className={`status-pill ${roomStatusBadge.className}`}>{roomStatusBadge.label}</span>}
              </div>
            </div>

            <div className="w-full space-y-3 sm:max-w-[260px]">
              <div className="flex items-center justify-between gap-3 sm:justify-end">
                <div className="min-w-0 sm:text-right">
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">{copy.roomCode}</p>
                  <p className="mt-1 break-all text-3xl font-extrabold leading-none tracking-[0.04em] text-red-500 max-sm:text-2xl">
                    {room.code}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={copyRoomCode}
                  className="btn-base room-copy-btn"
                  aria-label={copy.copyCode}
                >
                  {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                </button>
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={leaveOnlyRoom}
                  className="btn-base btn-danger btn-room room-leave-btn w-full justify-center px-4 py-3 text-base"
                >
                  <LogOut className="h-4 w-4" />
                  {copy.leaveRoom}
                </button>
              </div>
            </div>
          </div>
        </header>

        {(pageError || apiError) && (
          <p className="rounded-xl border border-red-500/45 bg-red-900/30 px-4 py-3 text-sm text-red-100">
            {pageError || apiError}
          </p>
        )}
        <section className="grid gap-5 lg:grid-cols-[2fr_1fr]">
          <article className="surface-card rounded-2xl p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 max-sm:flex-col max-sm:items-stretch">
              <h2 className="text-2xl font-bold">{copy.players}</h2>
              {room.status !== 'in_progress' && isRoomOwner ? (
                <button
                  type="button"
                  onClick={handleStartGame}
                  disabled={!hasEnoughPlayersToStart}
                  className="btn-base btn-primary btn-room px-5 py-3 text-base disabled:pointer-events-none disabled:opacity-45"
                >
                  <Play className="h-4 w-4" />
                  {copy.start}
                </button>
              ) : room.status !== 'in_progress' ? (
                <span className="status-pill status-waiting px-4 py-3">{copy.waitOwner}</span>
              ) : (
                <Link to={`/room/${room.id}/game`} className="btn-base btn-primary btn-room px-5 py-3 text-base">
                  <Play className="h-4 w-4" />
                  {copy.goToGame}
                </Link>
              )}
            </div>

            {!isParticipant && (
              <div className="surface-muted mb-4 rounded-xl p-4">
                <p className="text-sm text-[hsl(var(--muted-foreground))]">{copy.notParticipant}</p>
                <button type="button" onClick={handleJoinRoom} className="btn-base btn-primary btn-room mt-3 px-5 py-3 text-base">
                  {copy.joinRoom}
                </button>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              {Array.from({ length: room.maxPlayers }).map((_, slotIndex) => {
                const player = room.players[slotIndex]

                if (!player) {
                  return (
                    <div
                      key={`empty-${slotIndex}`}
                      className="rounded-xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)] px-4 py-3"
                    >
                      <p className="text-sm text-[hsl(var(--muted-foreground))]">{copy.waitingPlayer}</p>
                    </div>
                  )
                }

                return (
                  <div key={player.id} className="surface-muted rounded-xl px-4 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <UserRound className="h-4 w-4 text-red-400" />
                        <p className="truncate font-semibold">{player.nickname}</p>
                      </div>
                      <div className="flex shrink-0 flex-wrap justify-end gap-2">
                        {player.isOwner && <span className="status-pill status-waiting">{copy.owner}</span>}
                        {user?.id === player.id && <span className="status-pill status-recruiting">{copy.you}</span>}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </article>

          <aside className="surface-card rounded-2xl p-5">
            <h3 className="mb-3 text-xl font-bold">{copy.roomState}</h3>
            <ul className="space-y-2 text-sm text-[hsl(var(--muted-foreground))]">
              {copy.stateLines.map((line) => (
                <li key={line}>• {line}</li>
              ))}
            </ul>

            <div className="surface-muted mt-5 rounded-xl p-4 text-sm">
              <p className="mb-2 inline-flex items-center gap-2 font-semibold">
                <Users className="h-4 w-4" />
                {copy.participants}
              </p>
              <p className="text-lg font-bold">{room.players.length + '/' + room.maxPlayers}</p>
            </div>

          </aside>
        </section>
        </div>
      </div>
    </div>
  )
}

