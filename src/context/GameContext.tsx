/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { LOBBY_STATUSES } from '../lib/roomStatus.ts'
import { api, ApiError, type RecoveryResponse, WS_URL } from '../lib/api.ts'
import type { ActionResult, Game, GameActionType, GamePhase, Room, UserSession } from '../types/game.ts'

interface GameContextValue {
  user: UserSession | null
  rooms: Room[]
  games: Record<string, Game>
  availableRooms: Room[]
  isLoading: boolean
  apiError: string
  login: (nickname: string) => Promise<ActionResult>
  logout: () => Promise<void>
  refreshRooms: () => Promise<ActionResult>
  loadRoom: (roomId: string, options?: { silent?: boolean }) => Promise<ActionResult>
  loadGame: (roomId: string, options?: { silent?: boolean }) => Promise<ActionResult>
  setGamePhase: (roomId: string, phase: GamePhase) => Promise<ActionResult>
  advanceGamePhase: (roomId: string) => Promise<ActionResult>
  submitGameAction: (roomId: string, type: GameActionType, targetId: string) => Promise<ActionResult>
  createRoom: (roomName: string, maxPlayers: number) => Promise<ActionResult>
  joinRoom: (roomId: string) => Promise<ActionResult>
  joinRoomByCode: (code: string) => Promise<ActionResult>
  leaveRoom: (roomId: string) => Promise<ActionResult>
  startRoom: (roomId: string) => Promise<ActionResult>
  getRoomById: (roomId: string) => Room | undefined
  getGameByRoomId: (roomId: string) => Game | undefined
}

const GameContext = createContext<GameContextValue | null>(null)

const USER_STORAGE_KEY = 'mafia:user'
const TOKEN_STORAGE_KEY = 'mafia:token'

interface RealtimeEvent {
  type: 'rooms.updated' | 'room.updated' | 'room.deleted' | 'game.updated'
  rooms?: Room[]
  room?: Room
  roomId?: string
  game?: Game
}

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

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError || error instanceof Error) {
    return error.message
  }

  return fallback
}

function upsertRoom(rooms: Room[], nextRoom: Room) {
  const exists = rooms.some((room) => room.id === nextRoom.id)
  if (!exists) {
    return [nextRoom, ...rooms]
  }

  return rooms.map((room) => (room.id === nextRoom.id ? nextRoom : room))
}

function syncAvailableRooms(currentRooms: Room[], availableRooms: Room[]) {
  const nonLobbyRooms = currentRooms.filter((room) => !LOBBY_STATUSES.includes(room.status))
  const availableIds = new Set(availableRooms.map((room) => room.id))
  const preservedRooms = nonLobbyRooms.filter((room) => !availableIds.has(room.id))

  return [...availableRooms, ...preservedRooms]
}

function mergeRecoveredRooms(currentRooms: Room[], recoveredRooms: Room[]) {
  return recoveredRooms.reduce((acc, room) => upsertRoom(acc, room), currentRooms)
}

export function GameProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => readSession<string | null>(TOKEN_STORAGE_KEY, null))
  const [user, setUser] = useState<UserSession | null>(() =>
    readSession<string | null>(TOKEN_STORAGE_KEY, null) ? readSession<UserSession | null>(USER_STORAGE_KEY, null) : null,
  )
  const [rooms, setRooms] = useState<Room[]>([])
  const [games, setGames] = useState<Record<string, Game>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [apiError, setApiError] = useState('')
  const reconnectTimerRef = useRef<number | null>(null)

  useEffect(() => {
    writeSession(USER_STORAGE_KEY, user)
  }, [user])

  useEffect(() => {
    writeSession(TOKEN_STORAGE_KEY, token)
  }, [token])

  const clearSession = useCallback(() => {
    setUser(null)
    setToken(null)
    setRooms([])
    setGames({})
  }, [])

  const hydrateRecovery = useCallback((recovery: RecoveryResponse) => {
    setUser(recovery.user)
    setRooms((currentRooms) => mergeRecoveredRooms(currentRooms, recovery.rooms))
    setGames((currentGames) => {
      if (recovery.games.length === 0) {
        return currentGames
      }

      const nextGames = { ...currentGames }
      for (const game of recovery.games) {
        nextGames[game.roomId] = game
      }
      return nextGames
    })
    setApiError('')
  }, [])

  const refreshRooms = useCallback(async (): Promise<ActionResult> => {
    setIsLoading(true)
    try {
      const response = await api.listRooms()
      setRooms(response.rooms)
      setApiError('')
      return { ok: true }
    } catch (error) {
      const message = getErrorMessage(error, 'Не вдалося оновити список кімнат.')
      setApiError(message)
      return { ok: false, error: message }
    } finally {
      setIsLoading(false)
    }
  }, [])

  const loadRoom = useCallback(async (roomId: string, options?: { silent?: boolean }): Promise<ActionResult> => {
    if (!options?.silent) {
      setIsLoading(true)
    }

    try {
      const response = await api.getRoom(roomId)
      setRooms((currentRooms) => upsertRoom(currentRooms, response.room))
      setApiError('')
      return { ok: true, roomId: response.room.id }
    } catch (error) {
      const message = getErrorMessage(error, 'Не вдалося завантажити кімнату.')
      setApiError(message)
      return { ok: false, error: message }
    } finally {
      if (!options?.silent) {
        setIsLoading(false)
      }
    }
  }, [])

  const loadGame = useCallback(
    async (roomId: string, options?: { silent?: boolean }): Promise<ActionResult> => {
      const currentToken = token
      if (!currentToken) {
        return { ok: false, error: 'Сесію користувача не знайдено.' }
      }

      if (!options?.silent) {
        setIsLoading(true)
      }

      try {
        const response = await api.getGame(currentToken, roomId)
        setGames((currentGames) => ({
          ...currentGames,
          [response.game.roomId]: response.game,
        }))
        setApiError('')
        return { ok: true, roomId: response.game.roomId, gameId: response.game.id, game: response.game }
      } catch (error) {
        const message = getErrorMessage(error, 'Не вдалося завантажити гру.')
        setApiError(message)
        return { ok: false, error: message }
      } finally {
        if (!options?.silent) {
          setIsLoading(false)
        }
      }
    },
    [token],
  )

  useEffect(() => {
    void refreshRooms()
  }, [refreshRooms])

  useEffect(() => {
    let isActive = true
    let socket: WebSocket | null = null

    const connect = () => {
      socket = new WebSocket(WS_URL)

      socket.onopen = () => {
        if (!token) {
          return
        }

        void api
          .recover(token)
          .then((recovery) => {
            if (!isActive) {
              return
            }
            hydrateRecovery(recovery)
          })
          .catch(() => {
            // Realtime reconnect fallback remains HTTP polling if recovery call fails.
          })
      }

      socket.onmessage = (event) => {
        try {
          const realtimeEvent = JSON.parse(event.data) as RealtimeEvent

          if (realtimeEvent.type === 'rooms.updated' && realtimeEvent.rooms) {
            setRooms((currentRooms) => syncAvailableRooms(currentRooms, realtimeEvent.rooms ?? []))
            return
          }

          if (realtimeEvent.type === 'room.updated' && realtimeEvent.room) {
            setRooms((currentRooms) => upsertRoom(currentRooms, realtimeEvent.room as Room))
            return
          }

          if (realtimeEvent.type === 'room.deleted' && realtimeEvent.roomId) {
            setRooms((currentRooms) => currentRooms.filter((room) => room.id !== realtimeEvent.roomId))
            setGames((currentGames) => {
              const nextGames = { ...currentGames }
              delete nextGames[realtimeEvent.roomId as string]
              return nextGames
            })
            return
          }

          if (realtimeEvent.type === 'game.updated') {
            const roomId = realtimeEvent.roomId ?? realtimeEvent.game?.roomId
            if (!roomId) {
              return
            }

            if (!token) {
              if (realtimeEvent.game) {
                setGames((currentGames) => ({
                  ...currentGames,
                  [realtimeEvent.game?.roomId as string]: realtimeEvent.game as Game,
                }))
              }
              return
            }

            void api
              .getGame(token, roomId)
              .then((response) => {
                setGames((currentGames) => ({
                  ...currentGames,
                  [response.game.roomId]: response.game,
                }))
              })
              .catch(() => {
                // HTTP polling remains the fallback if a realtime-triggered private refresh fails.
              })
          }
        } catch {
          // Ignore malformed realtime messages; HTTP refresh remains the fallback.
        }
      }

      socket.onclose = () => {
        if (!isActive) {
          return
        }

        reconnectTimerRef.current = window.setTimeout(connect, 1500)
      }

      socket.onerror = () => {
        socket?.close()
      }
    }

    connect()

    return () => {
      isActive = false
      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current)
      }
      socket?.close()
    }
  }, [hydrateRecovery, token])

  useEffect(() => {
    if (!token) {
      return
    }

    const currentToken = token
    let isActive = true

    async function validateSession() {
      try {
        const recovery = await api.recover(currentToken)
        if (!isActive) {
          return
        }
        hydrateRecovery(recovery)
      } catch {
        if (isActive) {
          clearSession()
        }
      }
    }

    void validateSession()

    return () => {
      isActive = false
    }
  }, [clearSession, hydrateRecovery, token])

  const login = useCallback(async (nickname: string): Promise<ActionResult> => {
    const cleanNickname = nickname.trim()
    if (!cleanNickname) {
      return { ok: false, error: 'Вкажіть nickname.' }
    }

    setIsLoading(true)
    try {
      const result = await api.login(cleanNickname)
      setUser(result.user)
      setToken(result.token)
      setApiError('')
      await refreshRooms()
      return { ok: true }
    } catch (error) {
      const message = getErrorMessage(error, 'Не вдалося увійти.')
      setApiError(message)
      return { ok: false, error: message }
    } finally {
      setIsLoading(false)
    }
  }, [refreshRooms])

  const logout = useCallback(async () => {
    const currentToken = token
    clearSession()

    if (!currentToken) {
      return
    }

    try {
      await api.logout(currentToken)
    } catch {
      // Local logout should still succeed if the server session is already gone.
    }
  }, [clearSession, token])

  const requireToken = useCallback((): string | null => {
    if (!token) {
      setApiError('Сесію користувача не знайдено.')
      return null
    }

    return token
  }, [token])

  const createRoom = useCallback(
    async (roomName: string, maxPlayers: number): Promise<ActionResult> => {
      const currentToken = requireToken()
      if (!currentToken) {
        return { ok: false, error: 'Сесію користувача не знайдено.' }
      }

      setIsLoading(true)
      try {
        const response = await api.createRoom(currentToken, roomName, maxPlayers)
        setRooms((currentRooms) => upsertRoom(currentRooms, response.room))
        setApiError('')
        return { ok: true, roomId: response.room.id }
      } catch (error) {
        const message = getErrorMessage(error, 'Не вдалося створити кімнату.')
        setApiError(message)
        return { ok: false, error: message }
      } finally {
        setIsLoading(false)
      }
    },
    [requireToken],
  )

  const joinRoom = useCallback(
    async (roomId: string): Promise<ActionResult> => {
      const currentToken = requireToken()
      if (!currentToken) {
        return { ok: false, error: 'Сесію користувача не знайдено.' }
      }

      setIsLoading(true)
      try {
        const response = await api.joinRoom(currentToken, roomId)
        setRooms((currentRooms) => upsertRoom(currentRooms, response.room))
        setApiError('')
        return { ok: true, roomId: response.room.id }
      } catch (error) {
        const message = getErrorMessage(error, 'Не вдалося приєднатися до кімнати.')
        setApiError(message)
        return { ok: false, error: message }
      } finally {
        setIsLoading(false)
      }
    },
    [requireToken],
  )

  const joinRoomByCode = useCallback(
    async (code: string): Promise<ActionResult> => {
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
    async (roomId: string): Promise<ActionResult> => {
      const currentToken = requireToken()
      if (!currentToken) {
        return { ok: false, error: 'Сесію користувача не знайдено.' }
      }

      try {
        await api.leaveRoom(currentToken, roomId)
        setRooms((currentRooms) => currentRooms.filter((room) => room.id !== roomId))
        setApiError('')
        void refreshRooms()
        return { ok: true }
      } catch (error) {
        const message = getErrorMessage(error, 'Не вдалося вийти з кімнати.')
        setApiError(message)
        return { ok: false, error: message }
      }
    },
    [refreshRooms, requireToken],
  )

  const startRoom = useCallback(
    async (roomId: string): Promise<ActionResult> => {
      const currentToken = requireToken()
      if (!currentToken) {
        return { ok: false, error: 'Сесію користувача не знайдено.' }
      }

      setIsLoading(true)
      try {
        const response = await api.startRoom(currentToken, roomId)
        setRooms((currentRooms) => upsertRoom(currentRooms, response.room))
        setApiError('')
        try {
          const gameResponse = await api.getGame(currentToken, roomId)
          setGames((currentGames) => ({
            ...currentGames,
            [gameResponse.game.roomId]: gameResponse.game,
          }))
          return { ok: true, roomId: response.room.id, gameId: gameResponse.game.id, game: gameResponse.game }
        } catch {
          // Realtime signal or GamePage load will recover the private snapshot.
        }
        return { ok: true, roomId: response.room.id }
      } catch (error) {
        const message = getErrorMessage(error, 'Не вдалося почати гру.')
        setApiError(message)
        return { ok: false, error: message }
      } finally {
        setIsLoading(false)
      }
    },
    [requireToken],
  )

  const setGamePhase = useCallback(
    async (roomId: string, phase: GamePhase): Promise<ActionResult> => {
      const currentToken = requireToken()
      if (!currentToken) {
        return { ok: false, error: 'Сесію користувача не знайдено.' }
      }

      try {
        const response = await api.setGamePhase(currentToken, roomId, phase)
        setGames((currentGames) => ({
          ...currentGames,
          [response.game.roomId]: response.game,
        }))
        setApiError('')
        return { ok: true, roomId: response.game.roomId, gameId: response.game.id, game: response.game }
      } catch (error) {
        const message = getErrorMessage(error, 'Не вдалося змінити фазу гри.')
        setApiError(message)
        return { ok: false, error: message }
      }
    },
    [requireToken],
  )

  const advanceGamePhase = useCallback(
    async (roomId: string): Promise<ActionResult> => {
      const currentToken = requireToken()
      if (!currentToken) {
        return { ok: false, error: 'Сесію користувача не знайдено.' }
      }

      try {
        const response = await api.advanceGamePhase(currentToken, roomId)
        setGames((currentGames) => ({
          ...currentGames,
          [response.game.roomId]: response.game,
        }))
        setApiError('')
        return { ok: true, roomId: response.game.roomId, gameId: response.game.id, game: response.game }
      } catch (error) {
        const message = getErrorMessage(error, 'Не вдалося перейти до наступної фази.')
        setApiError(message)
        return { ok: false, error: message }
      }
    },
    [requireToken],
  )

  const submitGameAction = useCallback(
    async (roomId: string, type: GameActionType, targetId: string): Promise<ActionResult> => {
      const currentToken = requireToken()
      if (!currentToken) {
        return { ok: false, error: 'Сесію користувача не знайдено.' }
      }

      try {
        const response = await api.submitGameAction(currentToken, roomId, type, targetId)
        setGames((currentGames) => ({
          ...currentGames,
          [response.game.roomId]: response.game,
        }))
        setApiError('')
        return { ok: true, roomId: response.game.roomId, gameId: response.game.id, game: response.game }
      } catch (error) {
        const message = getErrorMessage(error, 'Не вдалося виконати дію.')
        setApiError(message)
        return { ok: false, error: message }
      }
    },
    [requireToken],
  )

  const getRoomById = useCallback(
    (roomId: string) => rooms.find((room) => room.id === roomId),
    [rooms],
  )

  const getGameByRoomId = useCallback(
    (roomId: string) => games[roomId],
    [games],
  )

  const availableRooms = useMemo(
    () => rooms.filter((room) => LOBBY_STATUSES.includes(room.status)),
    [rooms],
  )

  const contextValue = useMemo<GameContextValue>(
    () => ({
      user,
      rooms,
      games,
      availableRooms,
      isLoading,
      apiError,
      login,
      logout,
      refreshRooms,
      loadRoom,
      loadGame,
      createRoom,
      joinRoom,
      joinRoomByCode,
      leaveRoom,
      startRoom,
      setGamePhase,
      advanceGamePhase,
      submitGameAction,
      getRoomById,
      getGameByRoomId,
    }),
    [
      apiError,
      advanceGamePhase,
      availableRooms,
      createRoom,
      games,
      getGameByRoomId,
      getRoomById,
      isLoading,
      joinRoom,
      joinRoomByCode,
      leaveRoom,
      loadGame,
      loadRoom,
      login,
      logout,
      refreshRooms,
      rooms,
      setGamePhase,
      submitGameAction,
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
