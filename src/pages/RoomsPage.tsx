import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BookOpen, Check, Hash, Play, Plus, RefreshCw, Users } from 'lucide-react'
import { Modal } from '../components/Modal.tsx'
import { SiteHeader } from '../components/SiteHeader.tsx'
import { useGame } from '../context/GameContext.tsx'
import { useLanguage } from '../context/useLanguage.ts'
import { MAX_PLAYERS_IN_ROOM, MIN_PLAYERS_IN_ROOM } from '../lib/roomStatus.ts'
import type { RoomStatus } from '../types/game.ts'

const statusClass: Record<RoomStatus, string> = {
  waiting: 'status-waiting',
  recruiting: 'status-waiting',
  preparation: 'status-waiting',
  in_progress: 'status-in_progress',
  finished: 'status-finished',
}

const roomsCopy = {
  en: {
    refreshFailed: 'Could not refresh the room list.',
    createFailed: 'Could not create the room.',
    joinFailed: 'Could not join the room.',
    startFailed: 'Could not start the room.',
    lobby: 'Lobby',
    refreshed: 'Updated',
    refresh: 'Refresh',
    rules: 'Rules',
    hello: 'Hello',
    pickOrCreate: 'Choose a room or create a new one',
    createRoom: 'Create new room',
    joinByCode: 'Join by code',
    noRooms: 'No active rooms yet',
    noRoomsText: 'Create the first room or join with a code.',
    code: 'Code',
    waiting: 'Waiting',
    start: 'Start',
    ownerStarts: 'The room owner starts the game',
    createTitle: 'Create room',
    roomName: 'Room name',
    roomPlaceholder: 'For example, Night District',
    playerCount: 'Players',
    creating: 'Creating...',
    createAndEnter: 'Create and enter',
    joinTitle: 'Join by code',
    roomCode: 'Room code',
    entering: 'Entering...',
    enterRoom: 'Enter room',
  },
  uk: {
    refreshFailed: 'Не вдалося оновити список кімнат.',
    createFailed: 'Не вдалося створити кімнату.',
    joinFailed: 'Не вдалося приєднатися до кімнати.',
    startFailed: 'Не вдалося запустити кімнату.',
    lobby: 'Лобі',
    refreshed: 'Оновлено',
    refresh: 'Оновити',
    rules: 'Правила',
    hello: 'Привіт',
    pickOrCreate: 'Оберіть кімнату або створіть нову',
    createRoom: 'Створити нову кімнату',
    joinByCode: 'Приєднатися по коду',
    noRooms: 'Наразі немає активних кімнат',
    noRoomsText: 'Створіть першу кімнату або увійдіть через код.',
    code: 'Код',
    waiting: 'Очікування',
    start: 'Старт',
    ownerStarts: 'Стартує власник кімнати',
    createTitle: 'Створити кімнату',
    roomName: 'Назва кімнати',
    roomPlaceholder: 'Наприклад, Нічний квартал',
    playerCount: 'Кількість гравців',
    creating: 'Створення...',
    createAndEnter: 'Створити та перейти',
    joinTitle: 'Приєднатися по коду',
    roomCode: 'Код кімнати',
    entering: 'Вхід...',
    enterRoom: 'Увійти в кімнату',
  },
}

export function RoomsPage() {
  const navigate = useNavigate()
  const { language } = useLanguage()
  const copy = roomsCopy[language]
  const {
    apiError,
    availableRooms,
    createRoom,
    isLoading,
    joinRoom,
    joinRoomByCode,
    refreshRooms,
    startRoom,
    user,
  } = useGame()
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [joinModalOpen, setJoinModalOpen] = useState(false)
  const [roomName, setRoomName] = useState('')
  const [maxPlayers, setMaxPlayers] = useState(10)
  const [joinCode, setJoinCode] = useState('')
  const [error, setError] = useState('')
  const [refreshDone, setRefreshDone] = useState(false)
  const refreshTimerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) {
        window.clearTimeout(refreshTimerRef.current)
      }
    }
  }, [])

  const handleRefresh = async () => {
    setError('')
    const result = await refreshRooms()
    if (!result.ok) {
      setError(result.error ?? copy.refreshFailed)
      return
    }

    setRefreshDone(true)

    if (refreshTimerRef.current) {
      window.clearTimeout(refreshTimerRef.current)
    }

    refreshTimerRef.current = window.setTimeout(() => {
      setRefreshDone(false)
      refreshTimerRef.current = null
    }, 1000)
  }

  const handleCreateRoom = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const result = await createRoom(roomName, maxPlayers)

    if (!result.ok || !result.roomId) {
      setError(result.error ?? copy.createFailed)
      return
    }

    setRoomName('')
    setMaxPlayers(10)
    setCreateModalOpen(false)
    setError('')
    navigate(`/room/${result.roomId}`)
  }

  const handleJoinByCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const result = await joinRoomByCode(joinCode)

    if (!result.ok || !result.roomId) {
      setError(result.error ?? copy.joinFailed)
      return
    }

    setJoinCode('')
    setJoinModalOpen(false)
    setError('')
    navigate(`/room/${result.roomId}`)
  }

  const handleJoinFromList = async (roomId: string) => {
    const result = await joinRoom(roomId)
    if (!result.ok || !result.roomId) {
      setError(result.error ?? copy.joinFailed)
      return
    }

    setError('')
    navigate(`/room/${result.roomId}`)
  }

  const handleForceStartFromList = async (roomId: string) => {
    const result = await startRoom(roomId)
    if (!result.ok || !result.roomId) {
      setError(result.error ?? copy.startFailed)
      return
    }

    setError('')
    navigate(`/room/${result.roomId}/game`)
  }

  return (
    <div className="page-shell">
      <SiteHeader />
      <div className="px-5 py-8 sm:px-8">
        <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-4xl font-bold text-red-500">{copy.lobby}</h1>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleRefresh}
                className="btn-base btn-outline rooms-toolbar-icon h-10 w-10 p-0"
                title={refreshDone ? copy.refreshed : copy.refresh}
                aria-label={refreshDone ? copy.refreshed : copy.refresh}
              >
                {refreshDone ? <Check className="h-5 w-5" /> : <RefreshCw className="h-5 w-5" />}
              </button>
              <Link
                to="/rules"
                className="btn-base btn-outline rooms-toolbar-icon h-10 w-10 p-0"
                title={copy.rules}
                aria-label={copy.rules}
              >
                <BookOpen className="h-5 w-5" />
              </Link>
            </div>
          </div>
          <p className="mt-2 text-[hsl(var(--muted-foreground))]">
            {copy.hello}, <span className="text-[hsl(var(--foreground))]">{user?.nickname}</span>! {copy.pickOrCreate}
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
            {copy.createRoom}
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
            {copy.joinByCode}
          </button>
        </section>

        {(error || apiError) && (
          <p className="rounded-xl border border-red-500/45 bg-red-900/30 px-4 py-3 text-sm text-red-100">
            {error || apiError}
          </p>
        )}

        {availableRooms.length === 0 ? (
          <section className="surface-card rounded-2xl p-8 text-center">
            <Users className="mx-auto mb-4 h-14 w-14 text-[hsl(var(--muted-foreground))]" />
            <h2 className="text-2xl font-bold">{copy.noRooms}</h2>
            <p className="mt-2 text-[hsl(var(--muted-foreground))]">{copy.noRoomsText}</p>
          </section>
        ) : (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {availableRooms.map((room) => {
              const isRoomOwner = room.ownerId === user?.id

              return (
                <article
                  key={room.id}
                  onClick={() => handleJoinFromList(room.id)}
                  className="surface-card room-card cursor-pointer rounded-2xl p-5"
                >
                  <div className="space-y-4">
                    <div>
                      <h2 className="text-xl font-bold">{room.name}</h2>
                      <p className="text-sm text-[hsl(var(--muted-foreground))]">{copy.code}: {room.code}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="inline-flex items-center gap-2 text-sm text-[hsl(var(--foreground))]">
                        <Users className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                        {room.players.length} / {room.maxPlayers}
                      </div>
                      <span className={`status-pill ${statusClass[room.status]}`}>{copy.waiting}</span>
                    </div>
                    {isRoomOwner ? (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          handleForceStartFromList(room.id)
                        }}
                        disabled={room.players.length < MIN_PLAYERS_IN_ROOM}
                        className="btn-base btn-primary btn-room w-full px-4 py-3 text-sm disabled:pointer-events-none disabled:opacity-45"
                      >
                        <Play className="h-4 w-4" />
                        {copy.start}
                      </button>
                    ) : (
                      <p className="rounded-lg bg-white/5 px-3 py-2 text-sm font-semibold text-[hsl(var(--muted-foreground))]">
                        {copy.ownerStarts}
                      </p>
                    )}
                  </div>
                </article>
              )
            })}
          </section>
        )}
        </div>
      </div>

      <Modal open={createModalOpen} onClose={() => setCreateModalOpen(false)} title={copy.createTitle}>
        <form className="space-y-4" onSubmit={handleCreateRoom}>
          <div>
            <label htmlFor="roomName" className="block text-sm text-[hsl(var(--muted-foreground))]">
              {copy.roomName}
            </label>
            <input
              id="roomName"
              type="text"
              value={roomName}
              maxLength={40}
              onChange={(event) => setRoomName(event.target.value)}
              className="mt-1 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-white outline-none transition focus:border-red-500"
              placeholder={copy.roomPlaceholder}
            />
          </div>

          <div>
            <label htmlFor="maxPlayers" className="block text-sm text-[hsl(var(--muted-foreground))]">
              {copy.playerCount}: {maxPlayers}
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

          <button
            type="submit"
            disabled={isLoading}
            className="btn-base btn-primary w-full px-4 py-2 text-sm disabled:pointer-events-none disabled:opacity-60"
          >
            {isLoading ? copy.creating : copy.createAndEnter}
          </button>
        </form>
      </Modal>

      <Modal open={joinModalOpen} onClose={() => setJoinModalOpen(false)} title={copy.joinTitle}>
        <form className="space-y-4" onSubmit={handleJoinByCode}>
          <div>
            <label htmlFor="joinCode" className="block text-sm text-[hsl(var(--muted-foreground))]">
              {copy.roomCode}
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

          <button
            type="submit"
            disabled={isLoading}
            className="btn-base btn-gold w-full px-4 py-2 text-sm disabled:pointer-events-none disabled:opacity-60"
          >
            <Hash className="h-4 w-4" />
            {isLoading ? copy.entering : copy.enterRoom}
          </button>
        </form>
      </Modal>
    </div>
  )
}
