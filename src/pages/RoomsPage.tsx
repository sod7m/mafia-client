import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BookOpen, Hash, LogOut, Plus, RefreshCw, Users } from 'lucide-react'
import { Modal } from '../components/Modal.tsx'
import { SiteFooter } from '../components/SiteFooter.tsx'
import { SiteHeader } from '../components/SiteHeader.tsx'
import { useGame } from '../context/GameContext.tsx'
import { MAX_PLAYERS_IN_ROOM, MIN_PLAYERS_IN_ROOM } from '../lib/roomStatus.ts'
import type { RoomStatus } from '../types/game.ts'

const statusClass: Record<RoomStatus, string> = {
  waiting: 'status-waiting',
  recruiting: 'status-waiting',
  preparation: 'status-waiting',
  in_progress: 'status-in_progress',
  finished: 'status-finished',
}

export function RoomsPage() {
  const navigate = useNavigate()
  const { availableRooms, createRoom, joinRoom, joinRoomByCode, logout, user } = useGame()
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [joinModalOpen, setJoinModalOpen] = useState(false)
  const [roomName, setRoomName] = useState('')
  const [maxPlayers, setMaxPlayers] = useState(10)
  const [joinCode, setJoinCode] = useState('')
  const [error, setError] = useState('')

  const logoutToHome = () => {
    logout()
    navigate('/')
  }

  const handleCreateRoom = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const result = createRoom(roomName, maxPlayers)

    if (!result.ok || !result.roomId) {
      setError(result.error ?? 'Не вдалося створити кімнату.')
      return
    }

    setRoomName('')
    setMaxPlayers(10)
    setCreateModalOpen(false)
    setError('')
    navigate(`/room/${result.roomId}`)
  }

  const handleJoinByCode = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const result = joinRoomByCode(joinCode)

    if (!result.ok || !result.roomId) {
      setError(result.error ?? 'Не вдалося приєднатися до кімнати.')
      return
    }

    setJoinCode('')
    setJoinModalOpen(false)
    setError('')
    navigate(`/room/${result.roomId}`)
  }

  const handleJoinFromList = (roomId: string) => {
    const result = joinRoom(roomId)
    if (!result.ok || !result.roomId) {
      setError(result.error ?? 'Не вдалося приєднатися до кімнати.')
      return
    }

    setError('')
    navigate(`/room/${result.roomId}`)
  }

  return (
    <div className="page-shell">
      <SiteHeader />
      <div className="px-5 py-8 sm:px-8">
        <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-4xl font-bold text-red-500">Лобі</h1>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setError('')} className="btn-base btn-outline h-10 w-10 p-0" title="Оновити">
                <RefreshCw className="h-5 w-5" />
              </button>
              <Link to="/rules" className="btn-base btn-outline h-10 w-10 p-0" title="Правила" aria-label="Правила">
                <BookOpen className="h-5 w-5" />
              </Link>
              <button type="button" className="btn-base btn-outline px-6 py-2 text-base" onClick={logoutToHome}>
                <LogOut className="h-5 w-5" />
                Вийти
              </button>
            </div>
          </div>
          <p className="mt-2 text-[hsl(var(--muted-foreground))]">
            Привіт, <span className="text-[hsl(var(--foreground))]">{user?.nickname}</span>! Оберіть кімнату або створіть
            нову
          </p>
        </div>

        <section className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              setCreateModalOpen(true)
              setError('')
            }}
            className="btn-base btn-primary px-6 py-3 text-lg"
          >
            <Plus className="h-5 w-5" />
            Створити нову кімнату
          </button>
          <button
            type="button"
            onClick={() => {
              setJoinModalOpen(true)
              setError('')
            }}
            className="btn-base btn-gold px-6 py-3 text-lg"
          >
            <Hash className="h-5 w-5" />
            Приєднатися по коду
          </button>
        </section>

        {error && <p className="rounded-xl border border-red-500/45 bg-red-900/30 px-4 py-3 text-sm text-red-100">{error}</p>}

        {availableRooms.length === 0 ? (
          <section className="surface-card rounded-2xl p-8 text-center">
            <Users className="mx-auto mb-4 h-14 w-14 text-[hsl(var(--muted-foreground))]" />
            <h2 className="text-2xl font-bold">Наразі немає активних кімнат</h2>
            <p className="mt-2 text-[hsl(var(--muted-foreground))]">Створіть першу кімнату або увійдіть через код.</p>
          </section>
        ) : (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {availableRooms.map((room) => (
              <article
                key={room.id}
                onClick={() => handleJoinFromList(room.id)}
                className="surface-card room-card cursor-pointer rounded-2xl p-5"
              >
                <div className="space-y-4">
                  <div>
                    <h2 className="text-xl font-bold">{room.name}</h2>
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">Код: {room.code}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="inline-flex items-center gap-2 text-sm text-[hsl(var(--foreground))]">
                      <Users className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                      {room.players.length} / {room.maxPlayers}
                    </div>
                    <span className={`status-pill ${statusClass[room.status]}`}>Очікування</span>
                  </div>
                </div>
              </article>
            ))}
          </section>
        )}
        </div>
      </div>
      <SiteFooter />

      <Modal open={createModalOpen} onClose={() => setCreateModalOpen(false)} title="Створити кімнату">
        <form className="space-y-4" onSubmit={handleCreateRoom}>
          <div>
            <label htmlFor="roomName" className="block text-sm text-[hsl(var(--muted-foreground))]">
              Назва кімнати
            </label>
            <input
              id="roomName"
              type="text"
              value={roomName}
              maxLength={40}
              onChange={(event) => setRoomName(event.target.value)}
              className="mt-1 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-white outline-none transition focus:border-red-500"
              placeholder="Наприклад, Нічний квартал"
            />
          </div>

          <div>
            <label htmlFor="maxPlayers" className="block text-sm text-[hsl(var(--muted-foreground))]">
              Кількість гравців: {maxPlayers}
            </label>
            <input
              id="maxPlayers"
              type="range"
              min={MIN_PLAYERS_IN_ROOM}
              max={MAX_PLAYERS_IN_ROOM}
              value={maxPlayers}
              onChange={(event) => setMaxPlayers(Number(event.target.value))}
              className="mt-2 w-full accent-red-500"
            />
            <div className="mt-1 flex justify-between text-xs text-[hsl(var(--muted-foreground))]">
              <span>{MIN_PLAYERS_IN_ROOM}</span>
              <span>{MAX_PLAYERS_IN_ROOM}</span>
            </div>
          </div>

          <button type="submit" className="btn-base btn-primary w-full px-4 py-2 text-sm">
            Створити та перейти
          </button>
        </form>
      </Modal>

      <Modal open={joinModalOpen} onClose={() => setJoinModalOpen(false)} title="Приєднатися по коду">
        <form className="space-y-4" onSubmit={handleJoinByCode}>
          <div>
            <label htmlFor="joinCode" className="block text-sm text-[hsl(var(--muted-foreground))]">
              Код кімнати
            </label>
            <input
              id="joinCode"
              type="text"
              value={joinCode}
              maxLength={6}
              onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
              className="mt-1 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 uppercase text-white outline-none transition focus:border-red-500"
              placeholder="ABC123"
            />
          </div>

          <button type="submit" className="btn-base btn-gold w-full px-4 py-2 text-sm">
            <Hash className="h-4 w-4" />
            Увійти в кімнату
          </button>
        </form>
      </Modal>
    </div>
  )
}
