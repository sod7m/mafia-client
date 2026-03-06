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

export interface ActionResult {
  ok: boolean
  error?: string
  roomId?: string
}
