/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  deriveLobbyStatus,
  LOBBY_STATUSES,
  MAX_PLAYERS_IN_ROOM,
  MIN_PLAYERS_IN_ROOM,
} from '../lib/roomStatus.ts'
import type { ActionResult, Room, RoomPlayer, UserSession } from '../types/game.ts'

interface GameContextValue {
  user: UserSession | null
  rooms: Room[]
  availableRooms: Room[]
  login: (nickname: string) => void
  logout: () => void
  createRoom: (roomName: string, maxPlayers: number) => ActionResult
  joinRoom: (roomId: string) => ActionResult
  joinRoomByCode: (code: string) => ActionResult
  leaveRoom: (roomId: string) => ActionResult
  startRoom: (roomId: string) => ActionResult
  getRoomById: (roomId: string) => Room | undefined
}

const GameContext = createContext<GameContextValue | null>(null)

const USER_STORAGE_KEY = 'mafia:user'
const ROOMS_STORAGE_KEY = 'mafia:rooms'

function hasSessionStorage() {
  return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined'
}

function readSession<T>(key: string, fallback: T): T {
  if (!hasSessionStorage()) {
    return fallback
  }

  const rawValue = sessionStorage.getItem(key)
  if (!rawValue) {
    return fallback
  }

  try {
    return JSON.parse(rawValue) as T
  } catch {
    return fallback
  }
}

function writeSession(key: string, value: unknown) {
  if (!hasSessionStorage()) {
    return
  }

  if (value === null) {
    sessionStorage.removeItem(key)
    return
  }

  sessionStorage.setItem(key, JSON.stringify(value))
}

function createId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function createCode(existingCodes: Set<string>) {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  let code = ''

  do {
    code = Array.from({ length: 6 }, () => {
      const index = Math.floor(Math.random() * alphabet.length)
      return alphabet[index]
    }).join('')
  } while (existingCodes.has(code))

  return code
}

function normalizeRoomOwner(room: Room, players: RoomPlayer[]) {
  const ownerId = players.some((player) => player.id === room.ownerId) ? room.ownerId : players[0].id

  return {
    ownerId,
    players: players.map((player) => ({
      ...player,
      isOwner: player.id === ownerId,
    })),
  }
}

function getSeedRooms(): Room[] {
  return [
    {
      id: 'bronx-night',
      code: 'BRX731',
      name: 'Бронкс після заходу',
      status: 'waiting',
      maxPlayers: 12,
      ownerId: 'seed-owner-1',
      players: [
        { id: 'seed-owner-1', nickname: 'DonVito', isOwner: true },
        { id: 'seed-player-1', nickname: 'Capo77', isOwner: false },
      ],
      createdAt: new Date().toISOString(),
    },
    {
      id: 'silent-table',
      code: 'SLN502',
      name: 'Тиха переговорна',
      status: 'preparation',
      maxPlayers: 10,
      ownerId: 'seed-owner-2',
      players: [
        { id: 'seed-owner-2', nickname: 'Detective', isOwner: true },
        { id: 'seed-player-2', nickname: 'Shadow', isOwner: false },
        { id: 'seed-player-3', nickname: 'Medic', isOwner: false },
        { id: 'seed-player-4', nickname: 'Margo', isOwner: false },
      ],
      createdAt: new Date().toISOString(),
    },
    {
      id: 'city-neon',
      code: 'CTY924',
      name: 'Місто неону',
      status: 'recruiting',
      maxPlayers: 16,
      ownerId: 'seed-owner-3',
      players: [
        { id: 'seed-owner-3', nickname: 'Headliner', isOwner: true },
        { id: 'seed-player-5', nickname: 'QuietFox', isOwner: false },
        { id: 'seed-player-6', nickname: 'Marta', isOwner: false },
        { id: 'seed-player-7', nickname: 'Revolver', isOwner: false },
        { id: 'seed-player-8', nickname: 'Nora', isOwner: false },
      ],
      createdAt: new Date().toISOString(),
    },
    {
      id: 'private-match',
      code: 'HID221',
      name: 'Приватна партія',
      status: 'in_progress',
      maxPlayers: 8,
      ownerId: 'seed-owner-4',
      players: [
        { id: 'seed-owner-4', nickname: 'OldBoss', isOwner: true },
        { id: 'seed-player-9', nickname: 'Luna', isOwner: false },
      ],
      createdAt: new Date().toISOString(),
    },
  ]
}

function sanitizeRooms(rooms: Room[]): Room[] {
  return rooms
    .map((room) => {
      const maxPlayers = Math.max(MIN_PLAYERS_IN_ROOM, Math.min(MAX_PLAYERS_IN_ROOM, room.maxPlayers))
      const players = room.players.slice(0, maxPlayers)
      if (players.length === 0) {
        return null
      }

      const ownerState = normalizeRoomOwner(room, players)
      const status =
        room.status === 'in_progress' || room.status === 'finished'
          ? room.status
          : deriveLobbyStatus(ownerState.players.length, maxPlayers)

      return {
        ...room,
        ...ownerState,
        maxPlayers,
        status,
      }
    })
    .filter((room): room is Room => room !== null)
}

export function GameProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(() => readSession<UserSession | null>(USER_STORAGE_KEY, null))
  const [rooms, setRooms] = useState<Room[]>(() => {
    const storedRooms = readSession<Room[] | null>(ROOMS_STORAGE_KEY, null)
    return sanitizeRooms(storedRooms ?? getSeedRooms())
  })

  useEffect(() => {
    writeSession(USER_STORAGE_KEY, user)
  }, [user])

  useEffect(() => {
    writeSession(ROOMS_STORAGE_KEY, rooms)
  }, [rooms])

  const login = useCallback((nickname: string) => {
    const cleanNickname = nickname.trim()
    if (!cleanNickname) {
      return
    }

    setUser({ id: createId(), nickname: cleanNickname })
  }, [])

  const logout = useCallback(() => {
    if (!user) {
      return
    }

    setRooms((currentRooms) =>
      currentRooms
        .map((room) => {
          const remainingPlayers = room.players.filter((player) => player.id !== user.id)
          if (remainingPlayers.length === 0) {
            return null
          }

          const ownerState = normalizeRoomOwner(room, remainingPlayers)
          const nextStatus =
            room.status === 'in_progress' || room.status === 'finished'
              ? room.status
              : deriveLobbyStatus(ownerState.players.length, room.maxPlayers)

          return {
            ...room,
            ...ownerState,
            status: nextStatus,
          }
        })
        .filter((room): room is Room => room !== null),
    )

    setUser(null)
  }, [user])

  const createRoom = useCallback(
    (roomName: string, maxPlayers: number): ActionResult => {
      if (!user) {
        return { ok: false, error: 'Спочатку потрібно увійти з nickname.' }
      }

      const cleanName = roomName.trim()
      if (!cleanName) {
        return { ok: false, error: 'Вкажіть назву кімнати.' }
      }

      const safeMaxPlayers = Math.max(
        MIN_PLAYERS_IN_ROOM,
        Math.min(MAX_PLAYERS_IN_ROOM, Math.floor(maxPlayers)),
      )
      const code = createCode(new Set(rooms.map((room) => room.code)))
      const id = createId()

      const newRoom: Room = {
        id,
        code,
        name: cleanName,
        maxPlayers: safeMaxPlayers,
        ownerId: user.id,
        players: [{ id: user.id, nickname: user.nickname, isOwner: true }],
        status: 'waiting',
        createdAt: new Date().toISOString(),
      }

      setRooms((currentRooms) => [newRoom, ...currentRooms])
      return { ok: true, roomId: id }
    },
    [rooms, user],
  )

  const joinRoom = useCallback(
    (roomId: string): ActionResult => {
      if (!user) {
        return { ok: false, error: 'Спочатку потрібно увійти з nickname.' }
      }

      const room = rooms.find((currentRoom) => currentRoom.id === roomId)
      if (!room) {
        return { ok: false, error: 'Кімнату не знайдено.' }
      }

      if (room.status === 'in_progress' || room.status === 'finished') {
        return { ok: false, error: 'Ця кімната вже недоступна для входу.' }
      }

      const isAlreadyInside = room.players.some((player) => player.id === user.id)
      if (isAlreadyInside) {
        return { ok: true, roomId: room.id }
      }

      if (room.players.length >= room.maxPlayers) {
        return { ok: false, error: 'У кімнаті вже немає вільних місць.' }
      }

      setRooms((currentRooms) =>
        currentRooms.map((currentRoom) => {
          if (currentRoom.id !== room.id) {
            return currentRoom
          }

          const nextPlayers = [
            ...currentRoom.players,
            {
              id: user.id,
              nickname: user.nickname,
              isOwner: currentRoom.ownerId === user.id,
            },
          ]

          return {
            ...currentRoom,
            players: nextPlayers,
            status: deriveLobbyStatus(nextPlayers.length, currentRoom.maxPlayers),
          }
        }),
      )

      return { ok: true, roomId: room.id }
    },
    [rooms, user],
  )

  const joinRoomByCode = useCallback(
    (code: string): ActionResult => {
      const cleanCode = code.trim().toUpperCase()
      if (!cleanCode) {
        return { ok: false, error: 'Введіть код кімнати.' }
      }

      const room = rooms.find((currentRoom) => currentRoom.code === cleanCode)
      if (!room) {
        return { ok: false, error: 'Код не знайдено або кімната вже недоступна.' }
      }

      return joinRoom(room.id)
    },
    [joinRoom, rooms],
  )

  const leaveRoom = useCallback(
    (roomId: string): ActionResult => {
      if (!user) {
        return { ok: false, error: 'Сесію користувача не знайдено.' }
      }

      const room = rooms.find((currentRoom) => currentRoom.id === roomId)
      if (!room) {
        return { ok: false, error: 'Кімнату не знайдено.' }
      }

      const isInside = room.players.some((player) => player.id === user.id)
      if (!isInside) {
        return { ok: true }
      }

      setRooms((currentRooms) =>
        currentRooms
          .map((currentRoom) => {
            if (currentRoom.id !== room.id) {
              return currentRoom
            }

            const remainingPlayers = currentRoom.players.filter((player) => player.id !== user.id)
            if (remainingPlayers.length === 0) {
              return null
            }

            const ownerState = normalizeRoomOwner(currentRoom, remainingPlayers)
            return {
              ...currentRoom,
              ...ownerState,
              status: deriveLobbyStatus(remainingPlayers.length, currentRoom.maxPlayers),
            }
          })
          .filter((currentRoom): currentRoom is Room => currentRoom !== null),
      )

      return { ok: true }
    },
    [rooms, user],
  )

  const startRoom = useCallback(
    (roomId: string): ActionResult => {
      if (!user) {
        return { ok: false, error: 'Сесію користувача не знайдено.' }
      }

      const room = rooms.find((currentRoom) => currentRoom.id === roomId)
      if (!room) {
        return { ok: false, error: 'Кімнату не знайдено.' }
      }

      if (room.ownerId !== user.id) {
        return { ok: false, error: 'Лише власник кімнати може почати гру.' }
      }

      setRooms((currentRooms) =>
        currentRooms.map((currentRoom) =>
          currentRoom.id === room.id
            ? {
                ...currentRoom,
                status: 'in_progress',
              }
            : currentRoom,
        ),
      )

      return { ok: true, roomId }
    },
    [rooms, user],
  )

  const getRoomById = useCallback(
    (roomId: string) => rooms.find((room) => room.id === roomId),
    [rooms],
  )

  const availableRooms = useMemo(
    () => rooms.filter((room) => LOBBY_STATUSES.includes(room.status)),
    [rooms],
  )

  const contextValue = useMemo<GameContextValue>(
    () => ({
      user,
      rooms,
      availableRooms,
      login,
      logout,
      createRoom,
      joinRoom,
      joinRoomByCode,
      leaveRoom,
      startRoom,
      getRoomById,
    }),
    [
      availableRooms,
      createRoom,
      getRoomById,
      joinRoom,
      joinRoomByCode,
      leaveRoom,
      login,
      logout,
      rooms,
      startRoom,
      user,
    ],
  )

  return <GameContext.Provider value={contextValue}>{children}</GameContext.Provider>
}

export function useGame() {
  const context = useContext(GameContext)
  if (!context) {
    throw new Error('useGame must be used inside GameProvider')
  }

  return context
}
