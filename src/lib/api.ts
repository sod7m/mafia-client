import type { Game, GameActionType, GamePhase, Room, UserSession } from '../types/game.ts'

const DEFAULT_API_BASE_URL = 'http://localhost:8080'

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? DEFAULT_API_BASE_URL
export const WS_URL = buildWebSocketUrl(API_BASE_URL)

// Estimated difference (ms) between the server clock and this client's clock,
// derived from the server `Date` response header. Used to keep phase timers in
// sync across players whose local clocks differ.
let serverClockOffsetMs = 0

export function getServerClockOffset(): number {
  return serverClockOffsetMs
}

function updateServerClockOffset(response: Response) {
  const serverDate = response.headers.get('Date')
  if (!serverDate) {
    return
  }
  const serverMs = new Date(serverDate).getTime()
  if (!Number.isNaN(serverMs)) {
    serverClockOffsetMs = serverMs - Date.now()
  }
}

interface LoginResponse {
  user: UserSession
  token: string
}

interface MeResponse {
  user: UserSession
}

export interface RecoveryResponse {
  user: UserSession
  rooms: Room[]
  games: Game[]
  activeRoomId?: string
}

interface RoomResponse {
  room: Room
}

interface RoomsResponse {
  rooms: Room[]
}

interface GameResponse {
  game: Game
}

interface ApiErrorResponse {
  error?: string
}

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

function buildWebSocketUrl(apiBaseUrl: string) {
  const url = new URL(apiBaseUrl)
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  url.pathname = '/ws'
  url.search = ''
  url.hash = ''
  return url.toString()
}

async function request<T>(path: string, options: RequestInit = {}, token?: string | null): Promise<T> {
  const headers = new Headers(options.headers)

  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  })

  updateServerClockOffset(response)

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`
    try {
      const errorBody = (await response.json()) as ApiErrorResponse
      if (errorBody.error) {
        message = errorBody.error
      }
    } catch {
      // Keep the generic status message when the server returns no JSON body.
    }

    throw new ApiError(message, response.status)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

export const api = {
  login(nickname: string) {
    return request<LoginResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ nickname }),
    })
  },

  logout(token: string | null) {
    return request<void>('/api/auth/logout', { method: 'POST' }, token)
  },

  me(token: string) {
    return request<MeResponse>('/api/me', {}, token)
  },

  recover(token: string) {
    return request<RecoveryResponse>('/api/recovery', {}, token)
  },

  listRooms() {
    return request<RoomsResponse>('/api/rooms')
  },

  getRoom(roomId: string) {
    return request<RoomResponse>(`/api/rooms/${encodeURIComponent(roomId)}`)
  },

  createRoom(token: string, name: string, maxPlayers: number) {
    return request<RoomResponse>(
      '/api/rooms',
      {
        method: 'POST',
        body: JSON.stringify({ name, maxPlayers }),
      },
      token,
    )
  },

  joinRoom(token: string, roomId: string) {
    return request<RoomResponse>(`/api/rooms/${encodeURIComponent(roomId)}/join`, { method: 'POST' }, token)
  },

  leaveRoom(token: string, roomId: string) {
    return request<void>(`/api/rooms/${encodeURIComponent(roomId)}/leave`, { method: 'POST' }, token)
  },

  startRoom(token: string, roomId: string) {
    return request<RoomResponse>(`/api/rooms/${encodeURIComponent(roomId)}/start`, { method: 'POST' }, token)
  },

  getGame(token: string, roomId: string) {
    return request<GameResponse>(`/api/games/${encodeURIComponent(roomId)}`, {}, token)
  },

  setGamePhase(token: string, roomId: string, phase: GamePhase) {
    return request<GameResponse>(
      `/api/games/${encodeURIComponent(roomId)}/phase`,
      {
        method: 'POST',
        body: JSON.stringify({ phase }),
      },
      token,
    )
  },

  advanceGamePhase(token: string, roomId: string) {
    return request<GameResponse>(`/api/games/${encodeURIComponent(roomId)}/next-phase`, { method: 'POST' }, token)
  },

  submitGameAction(token: string, roomId: string, type: GameActionType, targetId: string) {
    return request<GameResponse>(
      `/api/games/${encodeURIComponent(roomId)}/actions`,
      {
        method: 'POST',
        body: JSON.stringify({ type, targetId }),
      },
      token,
    )
  },
}
