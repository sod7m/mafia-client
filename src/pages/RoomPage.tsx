import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Check, Copy, LogOut, Play, UserRound, Users } from 'lucide-react'
import { SiteHeader } from '../components/SiteHeader.tsx'
import { useGame } from '../context/GameContext.tsx'
import { roomStatusLabel } from '../lib/roomStatus.ts'
import type { RoomStatus } from '../types/game.ts'

const statusClass: Record<RoomStatus, string> = {
  waiting: 'status-waiting',
  recruiting: 'status-recruiting',
  preparation: 'status-preparation',
  in_progress: 'status-in_progress',
  finished: 'status-finished',
}

export function RoomPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { getRoomById, joinRoom, leaveRoom, startRoom, user } = useGame()
  const [pageError, setPageError] = useState('')
  const [startFeedback, setStartFeedback] = useState('')
  const [copied, setCopied] = useState(false)

  const room = useMemo(() => (id ? getRoomById(id) : undefined), [getRoomById, id])
  const isParticipant = !!(room && user && room.players.some((player) => player.id === user.id))
  const isOwner = !!(room && user && room.ownerId === user.id)
  const roomStatusBadge =
    room && (room.status === 'waiting' || room.status === 'recruiting' || room.status === 'preparation')
      ? { label: 'Очікування', className: 'status-waiting' }
      : room
        ? { label: roomStatusLabel[room.status], className: statusClass[room.status] }
        : null

  if (!room) {
    return (
      <div className="page-shell">
        <SiteHeader />
        <div className="grid min-h-[calc(100vh-150px)] place-items-center p-5">
          <div className="surface-card w-full max-w-lg rounded-2xl p-6 text-center">
            <h1 className="text-3xl font-bold">Кімнату не знайдено</h1>
            <p className="mt-3 text-[hsl(var(--muted-foreground))]">Можливо, вона вже видалена або недоступна.</p>
            <Link to="/rooms" className="btn-base btn-primary mt-5 px-4 py-2 text-sm">
              Повернутися до списку кімнат
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const leaveOnlyRoom = () => {
    if (id) {
      leaveRoom(id)
    }
    navigate('/rooms')
  }

  const handleJoinRoom = () => {
    const result = joinRoom(room.id)
    if (!result.ok) {
      setPageError(result.error ?? 'Не вдалося приєднатися до кімнати.')
      return
    }

    setPageError('')
  }

  const handleStartGame = () => {
    const result = startRoom(room.id)
    if (!result.ok) {
      setPageError(result.error ?? 'Не вдалося почати гру.')
      return
    }

    setPageError('')
    setStartFeedback('Гру запущено. Цей етап завершується на моменті старту партії.')
  }

  const copyRoomCode = async () => {
    try {
      await navigator.clipboard.writeText(room.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setPageError('Не вдалося скопіювати код кімнати.')
    }
  }

  return (
    <div className="page-shell">
      <SiteHeader />
      <div className="px-5 py-8 sm:px-8">
        <div className="mx-auto max-w-7xl space-y-6">
        <header className="surface-card rounded-2xl p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold tracking-[0.22em] text-red-400">ROOM</p>
              <h1 className="mt-1 text-3xl font-bold">{room.name}</h1>
              <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">Ваш nickname: {user?.nickname}</p>
              <div className="mt-2">
                {roomStatusBadge && <span className={`status-pill ${roomStatusBadge.className}`}>{roomStatusBadge.label}</span>}
              </div>
            </div>

            <div className="w-full max-w-[260px] space-y-3">
              <div className="flex items-center justify-end gap-3">
                <div className="text-right">
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">Код кімнати</p>
                  <p className="mt-1 text-3xl font-extrabold leading-none tracking-[0.04em] text-red-500">{room.code}</p>
                </div>
                <button
                  type="button"
                  onClick={copyRoomCode}
                  className="btn-base room-copy-btn"
                  aria-label="Скопіювати код кімнати"
                >
                  {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                </button>
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={leaveOnlyRoom}
                  className="btn-base btn-danger btn-room w-full justify-center px-4 py-3 text-base"
                >
                  <LogOut className="h-4 w-4" />
                  Вийти з кімнати
                </button>
              </div>
            </div>
          </div>
        </header>

        {pageError && <p className="rounded-xl border border-red-500/45 bg-red-900/30 px-4 py-3 text-sm text-red-100">{pageError}</p>}
        {startFeedback && (
          <p className="rounded-xl border border-emerald-500/45 bg-emerald-900/25 px-4 py-3 text-sm text-emerald-100">{startFeedback}</p>
        )}

        <section className="grid gap-5 lg:grid-cols-[2fr_1fr]">
          <article className="surface-card rounded-2xl p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-2xl font-bold">Склад гравців</h2>
              {isOwner && room.status !== 'in_progress' && (
                <button type="button" onClick={handleStartGame} className="btn-base btn-primary btn-room px-5 py-3 text-base">
                  <Play className="h-4 w-4" />
                  Почати гру
                </button>
              )}
            </div>

            {!isParticipant && (
              <div className="surface-muted mb-4 rounded-xl p-4">
                <p className="text-sm text-[hsl(var(--muted-foreground))]">Ви ще не додані до списку учасників цієї кімнати.</p>
                <button type="button" onClick={handleJoinRoom} className="btn-base btn-primary btn-room mt-3 px-5 py-3 text-base">
                  Приєднатися до кімнати
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
                      <p className="text-sm text-[hsl(var(--muted-foreground))]">Очікування гравця...</p>
                    </div>
                  )
                }

                return (
                  <div key={player.id} className="surface-muted rounded-xl px-4 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <UserRound className="h-4 w-4 text-red-400" />
                        <p className="font-semibold">{player.nickname}</p>
                      </div>
                      <div className="flex gap-2">
                        {player.isOwner && <span className="status-pill status-waiting">Власник</span>}
                        {user?.id === player.id && <span className="status-pill status-recruiting">Ви</span>}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </article>

          <aside className="surface-card rounded-2xl p-5">
            <h3 className="mb-3 text-xl font-bold">Стан кімнати</h3>
            <ul className="space-y-2 text-sm text-[hsl(var(--muted-foreground))]">
              <li>• Кімната доступна, доки власник не натисне «Почати гру».</li>
              <li>• Після старту вона зникає зі списку загальних кімнат.</li>
              <li>• Кнопка старту доступна тільки власнику.</li>
            </ul>

            <div className="surface-muted mt-5 rounded-xl p-4 text-sm">
              <p className="mb-2 inline-flex items-center gap-2 font-semibold">
                <Users className="h-4 w-4" />
                Учасники
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

