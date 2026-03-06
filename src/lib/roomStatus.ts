import type { RoomStatus } from '../types/game.ts'

export const MAX_PLAYERS_IN_ROOM = 16
export const MIN_PLAYERS_IN_ROOM = 4

export const LOBBY_STATUSES: RoomStatus[] = ['waiting', 'preparation', 'recruiting']

export const roomStatusLabel: Record<RoomStatus, string> = {
  waiting: 'Очікування',
  preparation: 'Підготовка',
  recruiting: 'Набір гравців',
  in_progress: 'У грі',
  finished: 'Завершена',
}

export const roomStatusColor: Record<RoomStatus, string> = {
  waiting: 'bg-amber-100 text-amber-900',
  preparation: 'bg-orange-100 text-orange-900',
  recruiting: 'bg-emerald-100 text-emerald-900',
  in_progress: 'bg-rose-200 text-rose-900',
  finished: 'bg-slate-300 text-slate-900',
}

export function deriveLobbyStatus(playerCount: number, maxPlayers: number): RoomStatus {
  if (playerCount <= 2) {
    return 'waiting'
  }

  if (playerCount >= maxPlayers) {
    return 'preparation'
  }

  return 'recruiting'
}
