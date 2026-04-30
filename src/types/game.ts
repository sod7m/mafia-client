export type RoomStatus =
  | 'waiting'
  | 'preparation'
  | 'recruiting'
  | 'in_progress'
  | 'finished'

export interface UserSession {
  id: string
  nickname: string
}

export interface RoomPlayer {
  id: string
  nickname: string
  isOwner: boolean
}

export interface Room {
  id: string
  code: string
  name: string
  status: RoomStatus
  maxPlayers: number
  ownerId: string
  players: RoomPlayer[]
  createdAt: string
}

export type GamePhase = 'night' | 'day' | 'voting' | 'final'
export type GameRole = 'civilian' | 'mafia' | 'commissioner' | 'doctor'
export type GameActionType = 'mafia_kill' | 'inspect' | 'heal' | 'vote'

export interface GamePlayer {
  id: string
  nickname: string
  isOwner: boolean
  role?: GameRole
  isAlive: boolean
}

export interface GameAction {
  id: string
  type: GameActionType
  actorId: string
  actorNickname: string
  targetId: string
  targetNickname: string
  phase: GamePhase
  round: number
  createdAt: string
}

export interface GameEvent {
  id: string
  type: string
  message: string
  phase: GamePhase
  round: number
  actorId?: string
  targetId?: string
  createdAt: string
}

export interface Game {
  id: string
  roomId: string
  phase: GamePhase
  round: number
  players: GamePlayer[]
  actions: GameAction[]
  events: GameEvent[]
  startedAt: string
  updatedAt: string
}

export interface ActionResult {
  ok: boolean
  error?: string
  roomId?: string
  gameId?: string
  game?: Game
}
