import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Track } from 'livekit-client'
import {
  Camera,
  CameraOff,
  Check,
  Crosshair,
  HeartPulse,
  LogOut,
  Mic,
  MicOff,
  Moon,
  SearchCheck,
  Settings,
  ShieldBan,
  ShieldCheck,
  ShieldQuestion,
  Sun,
  Trophy,
  Users,
  Vote,
} from 'lucide-react'
import { useGame } from '../context/GameContext.tsx'
import { useLanguage } from '../context/useLanguage.ts'
import { VoiceProvider, useVoice, type GameAudioPolicy, type VoiceVisibility } from '../context/VoiceContext.tsx'
import { getServerClockOffset } from '../lib/api.ts'
import { GameOverScreen } from '../components/GameOverScreen.tsx'
import { LanguageToggle } from '../components/LanguageToggle.tsx'
import { MIN_PLAYERS_IN_ROOM } from '../lib/roomStatus.ts'
import type { Game, GameActionType, GamePhase, GamePlayer, GameRole, GameSide, GameStep, RoomPlayer } from '../types/game.ts'

type RoleKind = 'commissioner' | 'mafia' | 'mistress' | 'doctor' | 'civilian'
type SelectionTone = 'danger' | 'inspect'
type ActionFeedbackKind = 'success' | 'error' | 'notice'

interface PlayerRole {
  label: string
  team: string
  kind: RoleKind
}

interface ActionFeedback {
  kind: ActionFeedbackKind
  title: string
  body: string
  phaseKey: string
}

const gameCopy = {
  en: {
    phases: {
      night: {
        label: 'Night',
        icon: Moon,
        actionLabel: 'Night action',
        actionHint: 'Choose a player on the table, then confirm the action.',
        duration: 45,
      },
      day: {
        label: 'Day',
        icon: Sun,
        actionLabel: 'Discussion',
        actionHint: 'The town is discussing suspicions. Target selection opens during voting.',
        duration: 90,
      },
      voting: {
        label: 'Voting',
        icon: Vote,
        actionLabel: 'Exile',
        actionHint: 'Choose a player to exile and confirm your vote.',
        duration: 35,
      },
      final: {
        label: 'Final',
        icon: Trophy,
        actionLabel: 'Result',
        actionHint: 'The game is over. Review the final player state.',
        duration: 0,
      },
    },
    steps: {
      night_mistress: {
        label: "Lover's turn",
        actionLabel: 'Block',
        actionHint: 'The lover chooses one player who will not be able to use a night action.',
      },
      night_doctor: {
        label: "Doctor's turn",
        actionLabel: 'Heal',
        actionHint: 'The doctor chooses one player to protect from the night shot.',
      },
      night_commissioner: {
        label: "Commissioner's turn",
        actionLabel: 'Inspect',
        actionHint: 'The commissioner checks one player and sees only the side: town or syndicate.',
      },
      night_mafia: {
        label: "Syndicate's turn",
        actionLabel: 'Shot',
        actionHint: 'All living unblocked syndicate members must choose the same target.',
      },
      day_speech: {
        label: 'Personal speech',
        actionLabel: 'Speech',
        actionHint: 'The active player has one minute to speak. Others should not interrupt.',
      },
      day_discussion: {
        label: 'Open discussion',
        actionLabel: 'Discussion',
        actionHint: 'All living players may discuss suspicions at the same time.',
      },
      voting: {
        label: 'Voting',
        actionLabel: 'Exile',
        actionHint: 'Choose a living player you want to vote out.',
      },
      day_last_word: {
        label: 'Last word',
        actionLabel: 'Last word',
        actionHint: 'The exiled player gives a final speech, then leaves the game.',
      },
      final: {
        label: 'Final',
        actionLabel: 'Result',
        actionHint: 'The game is over.',
      },
    },
    roles: {
      commissioner: { label: 'Commissioner', team: 'Town', kind: 'commissioner' as const },
      mafia: { label: 'Syndicate', team: 'Syndicate', kind: 'mafia' as const },
      mistress: { label: 'Lover', team: 'Syndicate', kind: 'mistress' as const },
      doctor: { label: 'Doctor', team: 'Town', kind: 'doctor' as const },
      civilian: { label: 'Civilian', team: 'Town', kind: 'civilian' as const },
    },
    rolePattern: [
      { label: 'Commissioner', team: 'Town', kind: 'commissioner' as const },
      { label: 'Syndicate', team: 'Syndicate', kind: 'mafia' as const },
      { label: 'Doctor', team: 'Town', kind: 'doctor' as const },
      { label: 'Lover', team: 'Syndicate', kind: 'mistress' as const },
      { label: 'Civilian', team: 'Town', kind: 'civilian' as const },
      { label: 'Civilian', team: 'Town', kind: 'civilian' as const },
      { label: 'Syndicate', team: 'Syndicate', kind: 'mafia' as const },
      { label: 'Civilian', team: 'Town', kind: 'civilian' as const },
    ],
    actions: {
      mistress_block: {
        label: 'Block',
        waiting: 'Choose the player to block tonight.',
        selected: 'Block target',
        successTitle: 'Block recorded',
        successBody: (target: string) => `${target} will not be able to use a night action if they have one.`,
        noticeTitle: 'Block already recorded',
        noticeBody: (previous: string, next: string, confirm: string) =>
          `Current block target is ${previous}. Press "${confirm}" to switch it to ${next}.`,
      },
      heal: {
        label: 'Heal',
        waiting: 'Choose the player the doctor will try to protect.',
        selected: 'Heal target',
        successTitle: 'Heal recorded',
        successBody: (target: string) => `The doctor will try to protect ${target} tonight.`,
        noticeTitle: 'Heal already recorded',
        noticeBody: (previous: string, next: string, confirm: string) =>
          `The doctor is currently protecting ${previous}. Press "${confirm}" to switch to ${next}.`,
      },
      inspect: {
        label: 'Inspect',
        waiting: 'Choose the player whose side the commissioner should inspect.',
        selected: 'Inspect target',
        successTitle: 'Inspection complete',
        successBody: (target: string, result?: string) => `${target}: side ${result ?? 'Unknown'}.`,
        noticeTitle: 'Inspection already recorded',
        noticeBody: (previous: string, next: string, confirm: string) =>
          `Current inspection target is ${previous}. Press "${confirm}" to switch it to ${next}.`,
      },
      mafia_kill: {
        label: 'Shot',
        waiting: 'Choose the target for the syndicate night shot.',
        selected: 'Shot target',
        successTitle: 'Syndicate choice recorded',
        successBody: (target: string) =>
          `Shot target: ${target}. The shot succeeds if the syndicate chose one target.`,
        noticeTitle: 'Syndicate choice already recorded',
        noticeBody: (previous: string, next: string, confirm: string) =>
          `Current syndicate target is ${previous}. Press "${confirm}" to switch it to ${next}.`,
      },
      vote: {
        label: 'Vote',
        waiting: 'Choose the player you vote to exile.',
        selected: 'Vote against',
        successTitle: 'Vote recorded',
        successBody: (target: string) => `Your vote against ${target} has been recorded.`,
        noticeTitle: 'Vote already recorded',
        noticeBody: (previous: string, next: string, confirm: string) =>
          `Your current vote is against ${previous}. Press "${confirm}" to revote for ${next}.`,
      },
      unavailable: {
        label: 'Action unavailable',
        waiting: 'There is no available action for you on this step.',
        selected: 'Target',
      },
    },
    labels: {
      spectator: 'Spectator',
      offTable: 'Off table',
      dead: 'Eliminated',
      you: 'You',
      ally: 'Ally',
      speaking: 'Speaking',
      yourVote: 'Your vote',
      inFocus: 'In focus',
      yourRole: 'Your role',
      now: 'Now',
      aliveTitle: 'Alive / total players',
      leave: 'Exit',
      leaveConfirm: 'Are you sure you want to leave the game?',
      loadingRoom: 'Loading game...',
      roomNotFound: 'Room not found',
      roomUnavailable: 'The game is unavailable or has already been removed.',
      lobby: 'Lobby',
      gameNotStarted: 'The game has not started yet',
      minPlayers: `At least ${MIN_PLAYERS_IN_ROOM} players are required to start.`,
      start: 'Start',
      loadingGameState: 'Loading game state...',
      introNight:
        'Intro night: roles wake up one by one so syndicate members can recognize each other. No night actions are available.',
      introDay: 'Intro day: everyone speaks in order. There is no exile vote today.',
      personalSpeech: (name: string) => `Personal speech ${name}`,
      lastWord: (name: string) => `Last word ${name}`,
      confirmVote: 'Confirm vote',
      confirmBlock: 'Confirm block',
      confirmKill: 'Confirm shot',
      confirmHeal: 'Confirm heal',
      confirmInspect: 'Confirm inspection',
      actionFailed: 'Action failed',
      actionFailedBody: 'Could not perform the action.',
      advanceFailed: 'Could not move to the next phase.',
      sideTown: 'Town',
      sideMafia: 'Syndicate',
      unknown: 'Unknown',
      alreadyDead: (name: string) => `${name} has already been eliminated`,
      micOff: 'Mute microphone',
      micOn: 'Unmute microphone',
      camOff: 'Turn camera off',
      camOn: 'Turn camera on',
      settings: 'Settings',
      phase: 'Phase:',
      ownerControls: 'The owner controls phases',
      ownerControlsLong: 'The room owner controls phases',
      advancing: 'Moving...',
      voterTitle: (name: string) => `${name} votes`,
      next: {
        night_mistress: 'To doctor',
        night_doctor: 'To commissioner',
        night_commissioner: 'To syndicate',
        night_mafia: 'To day',
        day_speech: 'Next',
        dayDiscussionIntro: 'To night',
        day_discussion: 'To voting',
        voting: 'To last word',
        day_last_word: 'To night',
        final: 'Game over',
      },
    },
  },
  uk: {
    phases: {
      night: {
        label: 'Ніч',
        icon: Moon,
        actionLabel: 'Нічний хід',
        actionHint: 'Оберіть гравця на столі, потім підтвердіть дію справа.',
        duration: 45,
      },
      day: {
        label: 'День',
        icon: Sun,
        actionLabel: 'Обговорення',
        actionHint: 'Зараз місто обговорює підозри. Вибір цілі буде доступний під час голосування.',
        duration: 90,
      },
      voting: {
        label: 'Голосування',
        icon: Vote,
        actionLabel: 'Вигнання',
        actionHint: 'Оберіть гравця для вигнання та підтвердіть голос.',
        duration: 35,
      },
      final: {
        label: 'Фінал',
        icon: Trophy,
        actionLabel: 'Підсумок',
        actionHint: 'Партія завершена. Перегляньте фінальний стан гравців.',
        duration: 0,
      },
    },
    steps: {
      night_mistress: {
        label: 'Хід Коханки',
        actionLabel: 'Блокування',
        actionHint: 'Коханка обирає гравця, який не зможе виконати нічну дію.',
      },
      night_doctor: {
        label: 'Хід Лікаря',
        actionLabel: 'Лікування',
        actionHint: 'Лікар обирає гравця, якого потрібно захистити від нічного пострілу.',
      },
      night_commissioner: {
        label: 'Хід Комісара',
        actionLabel: 'Перевірка',
        actionHint: 'Комісар обирає гравця та дізнається тільки сторону: мирний або мафія.',
      },
      night_mafia: {
        label: 'Хід Мафії',
        actionLabel: 'Постріл',
        actionHint: 'Усі живі незаблоковані мафіозі мають обрати одну й ту саму ціль.',
      },
      day_speech: {
        label: 'Особиста промова',
        actionLabel: 'Промова',
        actionHint: 'Активний гравець говорить свою хвилину, інші не перебивають.',
      },
      day_discussion: {
        label: 'Загальне обговорення',
        actionLabel: 'Обговорення',
        actionHint: 'Усі живі гравці можуть одночасно висловити підозри.',
      },
      voting: {
        label: 'Голосування',
        actionLabel: 'Вигнання',
        actionHint: 'Оберіть живого гравця, за якого голосуєте на вигнання.',
      },
      day_last_word: {
        label: 'Останнє слово',
        actionLabel: 'Останнє слово',
        actionHint: 'Вигнаний гравець говорить останнє слово. Далі він вибуває з гри.',
      },
      final: {
        label: 'Фінал',
        actionLabel: 'Підсумок',
        actionHint: 'Партія завершена.',
      },
    },
    roles: {
      commissioner: { label: 'Комісар', team: 'Мирні', kind: 'commissioner' as const },
      mafia: { label: 'Мафія', team: 'Мафія', kind: 'mafia' as const },
      mistress: { label: 'Коханка', team: 'Мафія', kind: 'mistress' as const },
      doctor: { label: 'Лікар', team: 'Мирні', kind: 'doctor' as const },
      civilian: { label: 'Мирний', team: 'Мирні', kind: 'civilian' as const },
    },
    rolePattern: [
      { label: 'Комісар', team: 'Мирні', kind: 'commissioner' as const },
      { label: 'Мафія', team: 'Мафія', kind: 'mafia' as const },
      { label: 'Лікар', team: 'Мирні', kind: 'doctor' as const },
      { label: 'Коханка', team: 'Мафія', kind: 'mistress' as const },
      { label: 'Мирний', team: 'Мирні', kind: 'civilian' as const },
      { label: 'Мирний', team: 'Мирні', kind: 'civilian' as const },
      { label: 'Мафія', team: 'Мафія', kind: 'mafia' as const },
      { label: 'Мирний', team: 'Мирні', kind: 'civilian' as const },
    ],
    actions: {
      mistress_block: {
        label: 'Блокування',
        waiting: 'Оберіть гравця, якого потрібно заблокувати цієї ночі.',
        selected: 'Ціль для блокування',
        successTitle: 'Блокування записано',
        successBody: (target: string) => `${target} не зможе виконати нічну дію, якщо має активну роль.`,
        noticeTitle: 'Блокування вже записано',
        noticeBody: (previous: string, next: string, confirm: string) =>
          `Зараз записано блокування ${previous}. Натисніть "${confirm}", щоб змінити ціль на ${next}.`,
      },
      heal: {
        label: 'Лікування',
        waiting: 'Оберіть гравця, якого лікар спробує захистити.',
        selected: 'Ціль для лікування',
        successTitle: 'Лікування записано',
        successBody: (target: string) => `Лікар спробує захистити ${target} цієї ночі.`,
        noticeTitle: 'Лікування вже записано',
        noticeBody: (previous: string, next: string, confirm: string) =>
          `Зараз лікар захищає ${previous}. Натисніть "${confirm}", щоб змінити ціль на ${next}.`,
      },
      inspect: {
        label: 'Перевірка',
        waiting: 'Оберіть гравця, чию сторону має перевірити комісар.',
        selected: 'Ціль для перевірки',
        successTitle: 'Перевірку завершено',
        successBody: (target: string, result?: string) => `${target}: сторона ${result ?? 'Невідомо'}.`,
        noticeTitle: 'Перевірка вже записана',
        noticeBody: (previous: string, next: string, confirm: string) =>
          `Зараз записано перевірку ${previous}. Натисніть "${confirm}", щоб змінити ціль на ${next}.`,
      },
      mafia_kill: {
        label: 'Постріл',
        waiting: 'Оберіть ціль для нічного пострілу мафії.',
        selected: 'Ціль для пострілу',
        successTitle: 'Вибір мафії записано',
        successBody: (target: string) =>
          `Ціль для пострілу: ${target}. Постріл спрацює, якщо мафія обрала одну ціль.`,
        noticeTitle: 'Вибір мафії вже записано',
        noticeBody: (previous: string, next: string, confirm: string) =>
          `Зараз ціль мафії: ${previous}. Натисніть "${confirm}", щоб змінити ціль на ${next}.`,
      },
      vote: {
        label: 'Голос',
        waiting: 'Оберіть гравця, за якого голосуєте на вигнання.',
        selected: 'Голос проти',
        successTitle: 'Голос прийнято',
        successBody: (target: string) => `Ваш голос проти ${target} зафіксовано.`,
        noticeTitle: 'Голос вже записано',
        noticeBody: (previous: string, next: string, confirm: string) =>
          `Зараз ваш голос проти ${previous}. Натисніть "${confirm}", щоб переголосувати за ${next}.`,
      },
      unavailable: {
        label: 'Дія недоступна',
        waiting: 'На цьому кроці для вас немає доступної дії.',
        selected: 'Ціль',
      },
    },
    labels: {
      spectator: 'Спостерігач',
      offTable: 'Поза столом',
      dead: 'Вибув',
      you: 'Ви',
      ally: 'Союзник',
      speaking: 'Говорить',
      yourVote: 'Ваш голос',
      inFocus: 'У фокусі',
      yourRole: 'Ваша роль',
      now: 'Зараз',
      aliveTitle: 'Живі / всього гравців',
      leave: 'Вийти',
      leaveConfirm: 'Ви впевнені, що хочете покинути гру?',
      loadingRoom: 'Завантаження партії...',
      roomNotFound: 'Кімнату не знайдено',
      roomUnavailable: 'Партія недоступна або вже видалена.',
      lobby: 'До лобі',
      gameNotStarted: 'Гра ще не запущена',
      minPlayers: `Для старту потрібно мінімум ${MIN_PLAYERS_IN_ROOM} гравців.`,
      start: 'Старт',
      loadingGameState: 'Завантаження стану гри...',
      introNight:
        'Ознайомча ніч: ролі прокидаються по черзі, щоб мафія познайомилась між собою. Нічних ходів немає.',
      introDay: 'Ознайомчий день: усі говорять по черзі. Голосування на вигнання сьогодні немає.',
      personalSpeech: (name: string) => `Особиста промова ${name}`,
      lastWord: (name: string) => `Останнє слово ${name}`,
      confirmVote: 'Підтвердити голос',
      confirmBlock: 'Підтвердити блокування',
      confirmKill: 'Підтвердити вбивство',
      confirmHeal: 'Підтвердити лікування',
      confirmInspect: 'Підтвердити перевірку',
      actionFailed: 'Дія не виконана',
      actionFailedBody: 'Не вдалося виконати дію.',
      advanceFailed: 'Не вдалося перейти до наступної фази.',
      sideTown: 'Мирний',
      sideMafia: 'Мафія',
      unknown: 'Невідомо',
      alreadyDead: (name: string) => `${name} вже вибув`,
      micOff: 'Вимкнути мікрофон',
      micOn: 'Увімкнути мікрофон',
      camOff: 'Вимкнути камеру',
      camOn: 'Увімкнути камеру',
      settings: 'Налаштування',
      phase: 'Фаза:',
      ownerControls: 'Фазами керує власник',
      ownerControlsLong: 'Фазами керує власник кімнати',
      advancing: 'Переходимо...',
      voterTitle: (name: string) => `${name} голосує`,
      next: {
        night_mistress: 'До лікаря',
        night_doctor: 'До комісара',
        night_commissioner: 'До мафії',
        night_mafia: 'До дня',
        day_speech: 'Далі',
        dayDiscussionIntro: 'До ночі',
        day_discussion: 'До голосування',
        voting: 'До останнього слова',
        day_last_word: 'До ночі',
        final: 'Гру завершено',
      },
    },
  },
}

type GameCopy = typeof gameCopy.en

const tileToneClasses = [
  'bg-[radial-gradient(circle_at_50%_45%,rgba(220,38,38,0.36),transparent_4.7rem),linear-gradient(180deg,#141414_0%,#050505_100%)]',
  'bg-[radial-gradient(circle_at_50%_45%,rgba(234,88,12,0.36),transparent_4.7rem),linear-gradient(180deg,#141414_0%,#050505_100%)]',
  'bg-[radial-gradient(circle_at_50%_45%,rgba(217,119,6,0.38),transparent_4.7rem),linear-gradient(180deg,#141414_0%,#050505_100%)]',
  'bg-[radial-gradient(circle_at_50%_45%,rgba(8,145,178,0.38),transparent_4.7rem),linear-gradient(180deg,#141414_0%,#050505_100%)]',
  'bg-[radial-gradient(circle_at_50%_45%,rgba(79,70,229,0.38),transparent_4.7rem),linear-gradient(180deg,#141414_0%,#050505_100%)]',
  'bg-[radial-gradient(circle_at_50%_45%,rgba(126,34,206,0.38),transparent_4.7rem),linear-gradient(180deg,#141414_0%,#050505_100%)]',
]

const avatarToneClasses = [
  'bg-red-700 shadow-[0_0_38px_rgba(220,38,38,0.28)]',
  'bg-orange-700 shadow-[0_0_38px_rgba(234,88,12,0.28)]',
  'bg-amber-700 shadow-[0_0_38px_rgba(217,119,6,0.28)]',
  'bg-cyan-700 shadow-[0_0_38px_rgba(8,145,178,0.28)]',
  'bg-indigo-700 shadow-[0_0_38px_rgba(79,70,229,0.28)]',
  'bg-purple-700 shadow-[0_0_38px_rgba(126,34,206,0.28)]',
]

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

function formatTimer(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return `${minutes}:${rest.toString().padStart(2, '0')}`
}

function getInitials(nickname: string) {
  const cleanNickname = nickname.trim()
  if (!cleanNickname) {
    return '??'
  }

  const parts = cleanNickname.split(/\s+/)
  if (parts.length > 1) {
    return parts
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase()
  }

  return cleanNickname.slice(0, 2).toUpperCase()
}

function getPlayerRole(
  _player: RoomPlayer,
  index: number,
  copy: GameCopy,
  serverRole?: GameRole,
  serverSide?: GameSide,
): PlayerRole {
  if (serverRole) {
    return copy.roles[serverRole]
  }

  if (serverSide === 'mafia') {
    return copy.roles.mafia
  }

  if (serverSide === 'town') {
    return copy.roles.civilian
  }

  return copy.rolePattern[index % copy.rolePattern.length]
}

function getActionVisual(actionType: GameActionType | null | undefined, copy: GameCopy) {
  const actionCopy = actionType ? copy.actions[actionType] : copy.actions.unavailable

  switch (actionType) {
    case 'mistress_block':
      return {
        Icon: ShieldBan,
        ...actionCopy,
      }
    case 'heal':
      return {
        Icon: HeartPulse,
        ...actionCopy,
      }
    case 'inspect':
      return {
        Icon: SearchCheck,
        ...actionCopy,
      }
    case 'mafia_kill':
      return {
        Icon: Crosshair,
        ...actionCopy,
      }
    case 'vote':
      return {
        Icon: Vote,
        ...actionCopy,
      }
    default:
      return {
        Icon: ShieldQuestion,
        ...copy.actions.unavailable,
      }
  }
}

function getSuccessFeedback(
  actionType: GameActionType,
  targetName: string,
  copy: GameCopy,
  resultLabel?: string,
): Omit<ActionFeedback, 'phaseKey'> {
  const actionCopy = copy.actions[actionType]

  switch (actionType) {
    case 'inspect':
      return {
        kind: 'success',
        title: actionCopy.successTitle,
        body: actionCopy.successBody(targetName, resultLabel),
      }
    case 'heal':
    case 'mistress_block':
    case 'mafia_kill':
    case 'vote':
      return {
        kind: 'success',
        title: actionCopy.successTitle,
        body: actionCopy.successBody(targetName),
      }
  }
}

function getActionChangeNotice(
  actionType: GameActionType,
  previousTargetName: string,
  nextTargetName: string,
  confirmLabel: string,
  copy: GameCopy,
): Omit<ActionFeedback, 'phaseKey'> {
  const actionCopy = copy.actions[actionType]

  switch (actionType) {
    case 'inspect':
    case 'heal':
    case 'mistress_block':
    case 'mafia_kill':
    case 'vote':
      return {
        kind: 'notice',
        title: actionCopy.noticeTitle,
        body: actionCopy.noticeBody(previousTargetName, nextTargetName, confirmLabel),
      }
  }
}

function getVisiblePlayers(players: RoomPlayer[]) {
  return players.slice(0, 16)
}

function getRoomPlayersFromGame(players: GamePlayer[]): RoomPlayer[] {
  return players.map((player) => ({
    id: player.id,
    nickname: player.nickname,
    isOwner: player.isOwner,
  }))
}

function getPlayerGridLayout(playerCount: number) {
  if (playerCount <= 6) {
    return { cols: 4, rows: 2, maxTile: '17rem', justify: 'justify-start' }
  }

  if (playerCount <= 8) {
    return { cols: 5, rows: 2, maxTile: '16rem', justify: 'justify-start' }
  }

  if (playerCount <= 10) {
    return { cols: 5, rows: 2, maxTile: '15.5rem', justify: 'justify-start' }
  }

  if (playerCount <= 12) {
    return { cols: 6, rows: 2, maxTile: '15rem', justify: 'justify-start' }
  }

  if (playerCount <= 15) {
    return { cols: 6, rows: 3, maxTile: '16rem', justify: 'justify-start' }
  }

  return { cols: 6, rows: 3, maxTile: '16rem', justify: 'justify-start' }
}

function getPlayerBoardStyle(layout: ReturnType<typeof getPlayerGridLayout>): CSSProperties {
  const horizontalGaps = (layout.cols - 1) * 0.75
  const verticalGaps = (layout.rows - 1) * 0.75

  return {
    '--tile-size': `min(${layout.maxTile}, calc((100vw - 22rem - ${horizontalGaps}rem) / ${layout.cols}), calc((100vh - 11rem - ${verticalGaps}rem) / ${layout.rows}))`,
    gridTemplateColumns: `repeat(${layout.cols}, var(--tile-size))`,
    gridTemplateRows: `repeat(${layout.rows}, var(--tile-size))`,
    width: `calc(${layout.cols} * var(--tile-size) + ${horizontalGaps}rem)`,
    height: `calc(${layout.rows} * var(--tile-size) + ${verticalGaps}rem)`,
  } as CSSProperties
}

function getAvatarSizeClasses(playerCount: number) {
  if (playerCount > 12) {
    return 'h-11 w-11 text-base'
  }

  if (playerCount > 8) {
    return 'h-12 w-12 text-lg'
  }

  return 'h-14 w-14 text-xl'
}

function getThemeClasses(phase: GamePhase) {
  if (phase === 'night') {
    return {
      page:
        'bg-[radial-gradient(circle_at_20%_12%,rgba(37,99,235,0.16),transparent_28rem),linear-gradient(180deg,#090d1f_0%,#050616_100%)]',
      border: 'border-blue-900/70',
      panel: 'bg-[#0a0d1d]/80',
      accent: 'text-blue-300',
      active: 'border-blue-500 bg-blue-500/20 text-white',
      hover: 'hover:border-blue-500/80',
    }
  }

  return {
    page:
      'bg-[radial-gradient(circle_at_20%_12%,rgba(220,38,38,0.18),transparent_28rem),linear-gradient(180deg,#1a0808_0%,#080814_100%)]',
    border: 'border-red-900/70',
    panel: 'bg-[#170b0d]/80',
    accent: 'text-red-300',
    active: 'border-red-500 bg-red-500/20 text-white',
    hover: 'hover:border-red-500/80',
  }
}

function getSelectedClasses(isSelected: boolean, selectionTone: SelectionTone) {
  if (!isSelected) {
    return ''
  }

  if (selectionTone === 'danger') {
    return 'border-red-400 shadow-[inset_0_0_0_1px_rgba(248,113,113,0.75),0_0_28px_rgba(220,38,38,0.38)]'
  }

  return 'border-cyan-300 shadow-[inset_0_0_0_1px_rgba(103,232,249,0.75),0_0_28px_rgba(6,182,212,0.34)]'
}

function getActionType(step: GameStep | undefined, role?: PlayerRole): GameActionType | null {
  if (step === 'voting') {
    return 'vote'
  }

  if (step === 'night_mistress' && role?.kind === 'mistress') {
    return 'mistress_block'
  }
  if (step === 'night_mafia' && role?.kind === 'mafia') {
    return 'mafia_kill'
  }
  if (step === 'night_commissioner' && role?.kind === 'commissioner') {
    return 'inspect'
  }
  if (step === 'night_doctor' && role?.kind === 'doctor') {
    return 'heal'
  }

  return null
}

function getInspectLabel(role: GameRole | undefined, side: GameSide | undefined, copy: GameCopy) {
  if (side === 'mafia' || role === 'mafia' || role === 'mistress') {
    return copy.labels.sideMafia
  }

  if (side === 'town' || role) {
    return copy.labels.sideTown
  }

  if (!role && !side) {
    return copy.labels.unknown
  }

  return copy.labels.unknown
}

function getNextStepLabel(step: GameStep, copy: GameCopy, isIntroRound = false) {
  switch (step) {
    case 'night_mistress':
      return copy.labels.next.night_mistress
    case 'night_doctor':
      return copy.labels.next.night_doctor
    case 'night_commissioner':
      return copy.labels.next.night_commissioner
    case 'night_mafia':
      return copy.labels.next.night_mafia
    case 'day_speech':
      return copy.labels.next.day_speech
    case 'day_discussion':
      return isIntroRound ? copy.labels.next.dayDiscussionIntro : copy.labels.next.day_discussion
    case 'voting':
      return copy.labels.next.voting
    case 'day_last_word':
      return copy.labels.next.day_last_word
    default:
      return copy.labels.next.final
  }
}

function getSecondsLeft(phaseEndsAt: string | undefined, nowMs: number) {
  if (!phaseEndsAt) {
    return 0
  }

  return Math.max(0, Math.ceil((new Date(phaseEndsAt).getTime() - nowMs) / 1000))
}

// Derives the game's audio policy for the local player: whether the game lets
// them talk right now, and who may see their camera. The camera ON/OFF itself is
// the user's own choice — the game only hides it.
function computeAudioPolicy(game: Game | undefined, myId: string | undefined): GameAudioPolicy {
  const dayDefault: GameAudioPolicy = { allowMic: false, visibility: 'all' }
  if (!game || !myId) {
    return dayDefault
  }
  const me = game.players.find((player) => player.id === myId)
  if (!me) {
    return dayDefault
  }

  const { phase, step, activePlayerId, pendingExileId } = game

  // Final: the game is over — everyone, including the dead, may talk and be seen.
  if (phase === 'final') {
    return { allowMic: true, visibility: 'all' }
  }

  // Camera visibility: at night cameras are private (only you see your own),
  // except mafia see each other's cameras (to gesture). Day: everyone sees all.
  let visibility: VoiceVisibility = 'all'
  if (phase === 'night') {
    visibility =
      me.role === 'mafia'
        ? game.players.filter((player) => player.role === 'mafia' && player.id !== myId).map((player) => player.id)
        : 'none'
  }

  // Dead players never get the mic (until the final discussion above).
  if (me.isAlive === false) {
    return { allowMic: false, visibility }
  }

  let allowMic = false
  if (phase === 'night') allowMic = false
  else if (step === 'day_speech') allowMic = activePlayerId === myId
  else if (step === 'day_discussion') allowMic = true
  else if (step === 'voting') allowMic = false
  else if (step === 'day_last_word') allowMic = pendingExileId === myId

  return { allowMic, visibility }
}

// Whether the local viewer (role myRole) is allowed to SEE a given player's
// camera right now. Mirrors the publisher-side visibility, but enforced on the
// render side too so a leaked night camera never shows (avatar shown instead).
function canSeeCamera(game: Game | undefined, myId: string | undefined, targetId: string): boolean {
  if (!game) return false
  if (targetId === myId) return true // always see your own camera
  if (game.phase !== 'night') return true // day/voting/last-word/final: everyone visible
  const me = game.players.find((player) => player.id === myId)
  const target = game.players.find((player) => player.id === targetId)
  // At night only mafia see other mafia's cameras.
  return me?.role === 'mafia' && target?.role === 'mafia'
}

// Attaches a LiveKit video track to a <video> element rendered on a player tile.
function TrackVideo({ track }: { track: Track }) {
  const ref = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    const element = ref.current
    if (!element) {
      return
    }
    track.attach(element)
    void element.play().catch(() => {})
    return () => {
      track.detach(element)
    }
  }, [track])
  return <video ref={ref} autoPlay playsInline muted className="absolute inset-0 h-full w-full object-cover" />
}

// Outer wrapper: fetches the LiveKit token for the active game and provides the
// voice/video context to the game room. Connection only happens in-progress.
export function GamePage() {
  const { id } = useParams<{ id: string }>()
  const { getRoomById, getVoiceToken } = useGame()
  const voiceEnabled = (id ? getRoomById(id) : undefined)?.status === 'in_progress'
  const [voice, setVoice] = useState<{ token: string; url: string } | null>(null)

  useEffect(() => {
    if (!id || !voiceEnabled) {
      return
    }
    let cancelled = false
    void getVoiceToken(id).then((result) => {
      if (!cancelled) {
        setVoice(result)
      }
    })
    return () => {
      cancelled = true
    }
  }, [id, voiceEnabled, getVoiceToken])

  return (
    <VoiceProvider url={voice?.url ?? null} token={voice?.token ?? null} enabled={!!voiceEnabled && !!voice}>
      <GameRoom />
    </VoiceProvider>
  )
}

function GameRoom() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { language } = useLanguage()
  const copy = gameCopy[language]
  const {
    getGameByRoomId,
    getRoomById,
    isLoading,
    wsConnected,
    advanceGamePhase,
    leaveRoom,
    loadGame,
    loadRoom,
    startRoom,
    submitGameAction,
    user,
  } = useGame()
  const [nowMs, setNowMs] = useState(() => Date.now() + getServerClockOffset())
  const [selectedTargetChoice, setSelectedTargetChoice] = useState<{ playerId: string; phaseKey: string } | null>(null)
  const [actionFeedback, setActionFeedback] = useState<ActionFeedback | null>(null)
  const [phaseFeedback, setPhaseFeedback] = useState<{ text: string; phaseKey: string } | null>(null)
  const [isAdvancingPhase, setIsAdvancingPhase] = useState(false)
  const { media: voiceMedia, micWanted, camWanted, toggleMic, toggleCam, connected: voiceConnected, setGameAudioPolicy } = useVoice()

  const room = useMemo(() => (id ? getRoomById(id) : undefined), [getRoomById, id])
  const game = useMemo(() => (id ? getGameByRoomId(id) : undefined), [getGameByRoomId, id])
  const phase = game?.phase ?? 'night'
  const step = game?.step ?? (phase === 'voting' ? 'voting' : phase === 'final' ? 'final' : phase === 'day' ? 'day_speech' : 'night_mistress')
  const phaseNumber = game?.round ?? 1
  const isIntroRound = phaseNumber <= 1
  const phaseKey = `${phase}:${step}:${phaseNumber}:${game?.speechIndex ?? 0}`
  const selectedTargetId = selectedTargetChoice?.phaseKey === phaseKey ? selectedTargetChoice.playerId : null
  const currentActionFeedback = actionFeedback?.phaseKey === phaseKey ? actionFeedback : null
  const currentPhaseFeedback = phaseFeedback?.phaseKey === phaseKey ? phaseFeedback.text : ''
  const serverPlayers = useMemo(
    () => (game ? getRoomPlayersFromGame(game.players) : room?.players ?? []),
    [game, room?.players],
  )
  const visiblePlayers = useMemo(() => getVisiblePlayers(serverPlayers), [serverPlayers])
  const aliveCount = game ? game.players.filter((player) => player.isAlive).length : visiblePlayers.length
  const currentPlayer = visiblePlayers.find((player) => player.id === user?.id)
  const gamePlayersById = useMemo(
    () => new Map((game?.players ?? []).map((player) => [player.id, player])),
    [game?.players],
  )
  const playerRoles = useMemo(
    () =>
      new Map(
        visiblePlayers.map((player, index) => [
          player.id,
          getPlayerRole(player, index, copy, gamePlayersById.get(player.id)?.role, gamePlayersById.get(player.id)?.side),
        ]),
      ),
    [copy, gamePlayersById, visiblePlayers],
  )
  const currentRole = currentPlayer ? playerRoles.get(currentPlayer.id) : undefined
  const selectedTarget = visiblePlayers.find((player) => player.id === selectedTargetId)
  const selectedTargetState = selectedTarget ? gamePlayersById.get(selectedTarget.id) : undefined
  const phaseDetails = copy.phases[phase]
  const stepDetails = copy.steps[step]
  const PhaseIcon = phaseDetails.icon
  const theme = getThemeClasses(phase)
  const playerGridLayout = getPlayerGridLayout(visiblePlayers.length)
  const playerBoardStyle = getPlayerBoardStyle(playerGridLayout)
  const avatarSizeClasses = getAvatarSizeClasses(visiblePlayers.length)
  const currentActionType = isIntroRound ? null : getActionType(step, currentRole)
  const actionVisual = getActionVisual(currentActionType, copy)
  const ActionIcon = actionVisual.Icon
  const canSelectTarget = !!currentActionType
  const stepHint = isIntroRound
    ? phase === 'night'
      ? copy.labels.introNight
      : copy.labels.introDay
    : stepDetails.actionHint
  const canSelfTarget = currentActionType === 'heal' || currentActionType === 'mafia_kill'
  const selectionTone: SelectionTone = currentRole?.kind === 'mafia' || currentRole?.kind === 'mistress' || phase === 'voting' ? 'danger' : 'inspect'
  const stepDisplayLabel =
    step === 'day_speech' && game?.activePlayerNickname
      ? copy.labels.personalSpeech(game.activePlayerNickname)
      : step === 'day_last_word' && game?.activePlayerNickname
        ? copy.labels.lastWord(game.activePlayerNickname)
        : stepDetails.label
  const currentTurn = stepDisplayLabel
  const confirmLabel =
    step === 'voting'
      ? copy.labels.confirmVote
      : currentRole?.kind === 'mistress'
        ? copy.labels.confirmBlock
      : currentRole?.kind === 'mafia'
        ? copy.labels.confirmKill
        : currentRole?.kind === 'doctor'
          ? copy.labels.confirmHeal
          : copy.labels.confirmInspect
  const currentRecordedAction = useMemo(() => {
    if (!game || !user?.id || !currentActionType) {
      return null
    }

    return (
      game.actions.find(
        (action) =>
          action.actorId === user.id &&
          action.type === currentActionType &&
          action.phase === phase &&
          action.round === game.round,
      ) ?? null
    )
  }, [currentActionType, game, phase, user?.id])
  const pendingActionChangeFeedback =
    selectedTarget && currentRecordedAction && currentActionType && currentRecordedAction.targetId !== selectedTarget.id
      ? {
          ...getActionChangeNotice(
            currentActionType,
            currentRecordedAction.targetNickname,
            selectedTarget.nickname,
            confirmLabel,
            copy,
          ),
          phaseKey,
        }
      : null
  const displayedActionFeedback = pendingActionChangeFeedback ?? currentActionFeedback
  const featuredPlayer =
    selectedTarget ??
    visiblePlayers.find((player) => player.id === game?.activePlayerId || player.id === game?.pendingExileId) ??
    currentPlayer ??
    visiblePlayers[0]
  const featuredPlayerIndex = featuredPlayer ? visiblePlayers.findIndex((player) => player.id === featuredPlayer.id) : -1
  const featuredPlayerState = featuredPlayer ? gamePlayersById.get(featuredPlayer.id) : undefined
  const featuredMedia = featuredPlayer ? voiceMedia.get(featuredPlayer.id) : undefined
  const showFeaturedVideo = !!featuredPlayer && !!featuredMedia?.videoTrack && canSeeCamera(game, user?.id, featuredPlayer.id)
  // Live tally of who is currently voting for whom (Among Us style). Re-voting
  // moves a voter to the new target because the server keeps one vote per actor.
  const votersByTarget = useMemo(() => {
    const map = new Map<string, { id: string; nickname: string }[]>()
    if (!game || step !== 'voting') {
      return map
    }
    for (const action of game.actions) {
      if (action.type === 'vote' && action.phase === 'voting' && action.round === game.round) {
        const voters = map.get(action.targetId) ?? []
        voters.push({ id: action.actorId, nickname: action.actorNickname })
        map.set(action.targetId, voters)
      }
    }
    return map
  }, [game, step])
  const secondsLeft = phase === 'final' ? 0 : getSecondsLeft(game?.phaseEndsAt, nowMs)
  const overlayText = phase === 'final' ? copy.phases.final.label : stepDisplayLabel

  useEffect(() => {
    if (!id || room) {
      return
    }

    void loadRoom(id)
  }, [id, loadRoom, room])

  useEffect(() => {
    if (!id || !room || room.status !== 'in_progress' || game) {
      return
    }

    void loadGame(id)
  }, [game, id, loadGame, room])

  useEffect(() => {
    if (!id || !room || wsConnected) {
      return
    }

    const intervalId = window.setInterval(() => {
      void loadRoom(id, { silent: true })
    }, 5000)

    return () => window.clearInterval(intervalId)
  }, [id, loadRoom, room, wsConnected])

  useEffect(() => {
    if (!id || !game || wsConnected) {
      return
    }

    const intervalId = window.setInterval(() => {
      void loadGame(id, { silent: true })
    }, 5000)

    return () => window.clearInterval(intervalId)
  }, [game, id, loadGame, wsConnected])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowMs(Date.now() + getServerClockOffset())
    }, 1000)

    return () => window.clearInterval(timer)
  }, [])

  // Feed the game's audio policy (talk permission + camera visibility) to the
  // voice layer. The user's own mic/camera buttons stay independent.
  const audioPolicy = useMemo(() => computeAudioPolicy(game, user?.id), [game, user?.id])
  const audioPolicyKey = JSON.stringify(audioPolicy)
  useEffect(() => {
    if (voiceConnected) {
      setGameAudioPolicy(audioPolicy)
    }
    // audioPolicy is captured via audioPolicyKey to avoid re-applying every game tick
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceConnected, setGameAudioPolicy, audioPolicyKey])

  if (!room) {
    if (isLoading) {
      return (
        <div className="grid h-screen place-items-center overflow-hidden bg-[#050616] p-5 text-white">
          <div className="surface-card w-full max-w-lg rounded-2xl p-6 text-center">
            <h1 className="text-3xl font-bold">{copy.labels.loadingRoom}</h1>
          </div>
        </div>
      )
    }

    return (
      <div className="grid h-screen place-items-center overflow-hidden bg-[#050616] p-5 text-white">
        <div className="surface-card w-full max-w-lg rounded-2xl p-6 text-center">
          <h1 className="text-3xl font-bold">{copy.labels.roomNotFound}</h1>
          <p className="mt-3 text-[hsl(var(--muted-foreground))]">{copy.labels.roomUnavailable}</p>
          <Link to="/rooms" className="btn-base btn-primary mt-5 px-4 py-2 text-sm">
            {copy.labels.lobby}
          </Link>
        </div>
      </div>
    )
  }

  const handleStartFromGame = async () => {
    if (room.ownerId !== user?.id) {
      navigate(`/room/${room.id}`)
      return
    }
    if (room.players.length < MIN_PLAYERS_IN_ROOM) {
      navigate(`/room/${room.id}`)
      return
    }

    const result = await startRoom(room.id)
    if (result.ok) {
      navigate(`/room/${room.id}/game`)
    }
  }

  if (room.status !== 'in_progress') {
    return (
      <div className="grid h-screen place-items-center overflow-hidden bg-[#050616] p-5 text-white">
        <div className="surface-card w-full max-w-lg rounded-2xl p-6 text-center">
          <h1 className="text-3xl font-bold">{copy.labels.gameNotStarted}</h1>
          <p className="mt-3 text-[hsl(var(--muted-foreground))]">{copy.labels.minPlayers}</p>
          <button
            type="button"
            onClick={handleStartFromGame}
            disabled={room.players.length < MIN_PLAYERS_IN_ROOM}
            className="btn-base btn-primary mt-5 px-5 py-3 text-sm disabled:pointer-events-none disabled:opacity-45"
          >
            {copy.labels.start}
          </button>
        </div>
      </div>
    )
  }

  if (!game && isLoading) {
    return (
      <div className="grid h-screen place-items-center overflow-hidden bg-[#050616] p-5 text-white">
        <div className="surface-card w-full max-w-lg rounded-2xl p-6 text-center">
          <h1 className="text-3xl font-bold">{copy.labels.loadingGameState}</h1>
        </div>
      </div>
    )
  }

  const navigateToLobby = async () => {
    await leaveRoom(room.id)
    navigate('/rooms')
  }

  const handleLeaveGame = async () => {
    if (!window.confirm(copy.labels.leaveConfirm)) {
      return
    }

    await navigateToLobby()
  }

  if (phase === 'final' && game) {
    return (
      <GameOverScreen
        game={game}
        currentUserId={user?.id}
        onLeave={() => void navigateToLobby()}
      />
    )
  }

  const handleAdvancePhase = async () => {
    if (room.ownerId !== user?.id) {
      return
    }
    if (isAdvancingPhase) {
      return
    }

    setIsAdvancingPhase(true)
    setPhaseFeedback(null)
    const result = await advanceGamePhase(room.id)
    if (!result.ok) {
      setPhaseFeedback({ text: result.error ?? copy.labels.advanceFailed, phaseKey })
      setIsAdvancingPhase(false)
      return
    }

    await loadGame(room.id, { silent: true })
    setIsAdvancingPhase(false)
  }

  const handlePlayerClick = (player: RoomPlayer) => {
    const playerState = gamePlayersById.get(player.id)
    const isSelf = player.id === user?.id

    if (!canSelectTarget || !playerState || playerState.isAlive === false) {
      return
    }
    if (isSelf && !canSelfTarget) {
      return
    }

    setSelectedTargetChoice((current) =>
      current?.playerId === player.id && current.phaseKey === phaseKey ? null : { playerId: player.id, phaseKey },
    )
    setActionFeedback(null)
  }

  const handleConfirmAction = async () => {
    if (!selectedTarget || !currentActionType) {
      return
    }

    const result = await submitGameAction(room.id, currentActionType, selectedTarget.id)
    if (!result.ok) {
      setActionFeedback({
        kind: 'error',
        title: copy.labels.actionFailed,
        body: result.error ?? copy.labels.actionFailedBody,
        phaseKey,
      })
      return
    }

    if (currentActionType === 'inspect') {
      const inspectedTarget = result.game?.players.find((player) => player.id === selectedTarget.id)
      const resultLabel = getInspectLabel(
        inspectedTarget?.role ?? selectedTargetState?.role,
        inspectedTarget?.side ?? selectedTargetState?.side,
        copy,
      )
      setActionFeedback({
        ...getSuccessFeedback(currentActionType, selectedTarget.nickname, copy, resultLabel),
        body: copy.actions.inspect.successBody(selectedTarget.nickname, resultLabel),
        phaseKey,
      })
    } else {
      setActionFeedback({
        ...getSuccessFeedback(currentActionType, selectedTarget.nickname, copy),
        phaseKey,
      })
    }
    setSelectedTargetChoice(null)
  }

  return (
    <div className={cx('flex h-screen flex-col overflow-hidden text-white max-lg:h-[100dvh]', theme.page)}>
      {game && (
        <div
          key={`${phase}:${step}:${phaseNumber}:${game.speechIndex ?? 0}`}
          className="pointer-events-none fixed inset-0 z-[80] flex animate-[phaseOverlay_1.2s_ease_forwards] items-center justify-center overflow-hidden bg-black/80 px-5 text-center text-6xl font-black leading-tight max-lg:text-5xl max-sm:text-4xl"
        >
          <span className="block max-w-[min(92vw,54rem)] break-words">{overlayText}</span>
        </div>
      )}

      <header className={cx('grid h-16 shrink-0 grid-cols-[minmax(8rem,1fr)_auto_minmax(8rem,1fr)] items-center gap-4 border-b bg-black/80 px-6 max-lg:h-auto max-lg:grid-cols-[1fr_auto] max-lg:gap-2 max-lg:p-3', theme.border)}>
        <Link to="/" className="inline-flex w-fit items-center gap-2 text-2xl font-extrabold tracking-[0.08em] text-[hsl(var(--secondary))] max-lg:order-1 max-lg:text-xl">
          OMERTA
        </Link>

        <div className={cx('inline-flex items-center justify-center gap-4 rounded-lg border px-4 py-2 text-sm font-bold text-neutral-200 max-lg:order-3 max-lg:col-span-2 max-lg:w-full max-lg:justify-between max-lg:text-xs', theme.border, theme.panel)}>
          <span className={cx('inline-flex items-center gap-2', theme.accent)}>
            <PhaseIcon className="h-4 w-4" />
            {stepDisplayLabel}
          </span>
          <span>{formatTimer(secondsLeft)}</span>
          <span className="inline-flex items-center gap-2" title={copy.labels.aliveTitle}>
            <Users className="h-4 w-4" />
            {aliveCount}/{visiblePlayers.length}
          </span>
        </div>

        <div className="inline-flex items-center justify-end gap-2 justify-self-end max-lg:order-2">
          <LanguageToggle />
          <button type="button" onClick={handleLeaveGame} className="btn-base btn-danger rounded-lg px-4 py-2 text-sm max-lg:px-3">
            <LogOut className="h-4 w-4" />
            {copy.labels.leave}
          </button>
        </div>
      </header>

      <main className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_20rem] max-lg:flex max-lg:flex-col max-lg:overflow-hidden">
        <section className="flex min-h-0 min-w-0 flex-col p-4 max-lg:hidden">
          <div className={cx('min-h-0 flex-1 overflow-hidden', 'grid', playerGridLayout.justify, 'content-start')}>
            <div
              className="grid max-h-full max-w-full content-start justify-start gap-3"
              style={playerBoardStyle}
            >
              {visiblePlayers.map((player, index) => {
                const playerState = gamePlayersById.get(player.id)
                const isAlive = playerState?.isAlive ?? true
                const isSelected = selectedTargetId === player.id
                const isSelf = player.id === user?.id
                const isMafiaAlly = currentRole?.kind === 'mafia' && !isSelf && playerState?.role === 'mafia'
                const pm = voiceMedia.get(player.id)
                const micActive = !!pm?.micOn
                const isSpeaking = !!pm?.isSpeaking
                const showVideo = !!pm?.videoTrack && canSeeCamera(game, user?.id, player.id)
                const isSelectable =
                  canSelectTarget &&
                  !!playerState &&
                  isAlive &&
                  (!isSelf || canSelfTarget)

                return (
                  <button
                    key={player.id}
                    type="button"
                    onClick={() => handlePlayerClick(player)}
                    className={cx(
                      'relative isolate grid aspect-square h-full w-full min-h-0 overflow-hidden rounded-lg border border-slate-700/80 text-white transition hover:brightness-105',
                      tileToneClasses[index % tileToneClasses.length],
                      theme.hover,
                      isSelf && 'border-yellow-400/70',
                      isMafiaAlly && 'border-red-500/90 shadow-[0_0_0_1px_rgba(239,68,68,0.72),0_0_34px_rgba(239,68,68,0.22)]',
                      isSpeaking && 'border-emerald-400 shadow-[0_0_0_2px_rgba(52,211,153,0.75)]',
                      !isAlive && 'grayscale opacity-45',
                      !isSelectable && 'cursor-default hover:border-slate-700/80 hover:brightness-100',
                      getSelectedClasses(isSelected, selectionTone),
                    )}
                  >
                    {showVideo && pm?.videoTrack && <TrackVideo track={pm.videoTrack} />}

                    <span className="absolute left-2 top-2 z-10 inline-flex h-6 min-w-6 items-center justify-center rounded bg-black/55 px-1.5 text-xs font-black text-neutral-100">
                      {index + 1}
                    </span>

                    {!showVideo && (
                      <span className={cx('place-self-center inline-flex items-center justify-center rounded-full font-black', avatarSizeClasses, avatarToneClasses[index % avatarToneClasses.length])}>
                        {getInitials(player.nickname)}
                      </span>
                    )}

                    <span className="absolute bottom-2 left-2 right-2 z-10 flex items-center justify-between gap-2 text-xs font-extrabold drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                      <span className="truncate">{player.nickname}</span>
                      <span className="flex shrink-0 items-center gap-1">
                        {!isAlive && <span className="rounded-full bg-neutral-700 px-1.5 py-0.5 text-[0.62rem]">{copy.labels.dead}</span>}
                        {isSelf && <span className="rounded-full bg-emerald-600 px-1.5 py-0.5 text-[0.62rem]">{copy.labels.you}</span>}
                        {isMafiaAlly && <span className="rounded-full bg-red-600 px-1.5 py-0.5 text-[0.62rem]">{copy.labels.ally}</span>}
                      </span>
                    </span>

                    <span className="absolute right-2 top-2 z-10 inline-flex items-center gap-1 text-[0.68rem] font-bold text-neutral-300">
                      {!micActive && <MicOff className="h-3.5 w-3.5" />}
                    </span>

                    {step === 'voting' && (votersByTarget.get(player.id)?.length ?? 0) > 0 && (
                      <span className="absolute bottom-8 left-2 right-2 z-10 flex flex-wrap items-center gap-1">
                        {votersByTarget.get(player.id)!.map((voter) => (
                          <span
                            key={voter.id}
                            title={copy.labels.voterTitle(voter.nickname)}
                            className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-black/75 px-1 text-[0.55rem] font-black text-white ring-1 ring-white/60"
                          >
                            {getInitials(voter.nickname)}
                          </span>
                        ))}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

        </section>

        <section className="hidden min-h-0 flex-1 flex-col gap-3 overflow-hidden p-3 max-lg:flex max-lg:landscape:grid max-lg:landscape:grid-cols-[minmax(0,1fr)_20rem] max-lg:landscape:grid-rows-1 max-lg:landscape:items-stretch">
          {featuredPlayer && (
            <div className={cx('grid shrink-0 grid-cols-[5.5rem_minmax(0,1fr)] gap-3 rounded-xl border p-3 max-[420px]:grid-cols-[4.5rem_minmax(0,1fr)] max-lg:landscape:hidden', theme.border, theme.panel)}>
              <div
                className={cx(
                  'relative isolate grid aspect-square overflow-hidden rounded-lg border border-slate-700/80',
                  tileToneClasses[Math.max(featuredPlayerIndex, 0) % tileToneClasses.length],
                )}
              >
                {showFeaturedVideo && featuredMedia?.videoTrack ? (
                  <TrackVideo track={featuredMedia.videoTrack} />
                ) : (
                  <span
                    className={cx(
                      'place-self-center inline-flex h-12 w-12 items-center justify-center rounded-full text-lg font-black max-[420px]:h-10 max-[420px]:w-10 max-[420px]:text-base',
                      avatarToneClasses[Math.max(featuredPlayerIndex, 0) % avatarToneClasses.length],
                    )}
                  >
                    {getInitials(featuredPlayer.nickname)}
                  </span>
                )}
              </div>

              <div className="grid min-w-0 content-center gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-extrabold uppercase text-neutral-500">
                    {featuredPlayer.id === selectedTarget?.id ? actionVisual.selected : copy.labels.inFocus}
                  </p>
                  <h2 className="truncate text-lg font-black">{featuredPlayer.nickname}</h2>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {featuredPlayerState?.isAlive === false && <span className="rounded-full bg-neutral-700 px-2 py-1 text-[0.65rem] font-bold">{copy.labels.dead}</span>}
                  {featuredPlayer.id === user?.id && <span className="rounded-full bg-emerald-600 px-2 py-1 text-[0.65rem] font-bold">{copy.labels.you}</span>}
                  {currentRole?.kind === 'mafia' && featuredPlayer.id !== user?.id && featuredPlayerState?.role === 'mafia' && (
                    <span className="rounded-full bg-red-600 px-2 py-1 text-[0.65rem] font-bold">{copy.labels.ally}</span>
                  )}
                  {featuredPlayerState?.role && (
                    <span className="rounded-full bg-white/10 px-2 py-1 text-[0.65rem] font-bold text-neutral-200">
                      {getPlayerRole(featuredPlayer, Math.max(featuredPlayerIndex, 0), copy, featuredPlayerState.role, featuredPlayerState.side).label}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="min-h-0 flex-1 overflow-y-auto pr-1 max-lg:landscape:pr-0">
            <div className="grid gap-2">
              {visiblePlayers.map((player, index) => {
                const playerState = gamePlayersById.get(player.id)
                const isAlive = playerState?.isAlive ?? true
                const isSelected = selectedTargetId === player.id
                const isSelf = player.id === user?.id
                const isMafiaAlly = currentRole?.kind === 'mafia' && !isSelf && playerState?.role === 'mafia'
                const isActiveSpeaker = player.id === game?.activePlayerId || player.id === game?.pendingExileId
                const rowVoters = votersByTarget.get(player.id) ?? []
                const isMyVote = rowVoters.some((voter) => voter.id === user?.id)
                const pm = voiceMedia.get(player.id)
                const showRowVideo = !!pm?.videoTrack && canSeeCamera(game, user?.id, player.id)
                const isSpeaking = !!pm?.isSpeaking
                const isSelectable =
                  canSelectTarget &&
                  !!playerState &&
                  isAlive &&
                  (!isSelf || canSelfTarget)

                return (
                  <button
                    key={player.id}
                    type="button"
                    onClick={() => handlePlayerClick(player)}
                    className={cx(
                      'grid min-h-[4.25rem] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border bg-black/28 px-3 py-2 text-left text-white transition',
                      theme.border,
                      isSelectable && theme.hover,
                      isSelected && (selectionTone === 'danger' ? 'border-red-400 bg-red-500/15' : 'border-cyan-300 bg-cyan-500/15'),
                      isSelf && 'border-yellow-400/70',
                      isMafiaAlly && 'border-red-500/90 bg-red-500/10',
                      isSpeaking && 'border-emerald-400',
                      isActiveSpeaker && 'ring-1 ring-white/25',
                      !isAlive && 'opacity-45 grayscale',
                      !isSelectable && 'cursor-default',
                    )}
                  >
                    <span
                      className={cx(
                        'relative isolate inline-flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full text-sm font-black',
                        showRowVideo ? 'bg-black ring-1 ring-white/15' : avatarToneClasses[index % avatarToneClasses.length],
                      )}
                    >
                      {showRowVideo && pm?.videoTrack ? (
                        <TrackVideo track={pm.videoTrack} />
                      ) : (
                        getInitials(player.nickname)
                      )}
                    </span>

                    <span className="grid min-w-0 gap-1">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded bg-black/45 px-1 text-[0.65rem] font-black">
                          {index + 1}
                        </span>
                        <span className="truncate text-sm font-extrabold">{player.nickname}</span>
                      </span>
                      <span className="flex flex-wrap gap-1">
                        {isActiveSpeaker && <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[0.6rem] font-bold text-neutral-200">{copy.labels.speaking}</span>}
                        {!isAlive && <span className="rounded-full bg-neutral-700 px-1.5 py-0.5 text-[0.6rem] font-bold">{copy.labels.dead}</span>}
                        {isSelf && <span className="rounded-full bg-emerald-600 px-1.5 py-0.5 text-[0.6rem] font-bold">{copy.labels.you}</span>}
                        {isMafiaAlly && <span className="rounded-full bg-red-600 px-1.5 py-0.5 text-[0.6rem] font-bold">{copy.labels.ally}</span>}
                        {isMyVote && <span className="rounded-full bg-yellow-400 px-1.5 py-0.5 text-[0.6rem] font-black text-black">{copy.labels.yourVote}</span>}
                      </span>
                    </span>

                    <span className="grid justify-items-end gap-1 text-xs font-bold text-neutral-300">
                      {!pm?.micOn && <MicOff className="h-3.5 w-3.5" />}
                      {step === 'voting' && rowVoters.length > 0 && (
                        <span className="rounded-full bg-white/10 px-2 py-1 text-[0.65rem] text-white">
                          {rowVoters.length}
                        </span>
                      )}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className={cx('shrink-0 rounded-xl border bg-black/86 p-3 shadow-[0_-14px_40px_rgba(0,0,0,0.32)] max-lg:landscape:min-h-0 max-lg:landscape:overflow-y-auto max-lg:landscape:shadow-none', theme.border)}>
            <div className="grid gap-2">
              <div className="flex items-start gap-3">
                <span className={cx('inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', canSelectTarget ? 'bg-red-500/15 text-red-200' : 'bg-white/10 text-neutral-400')}>
                  <ActionIcon className="h-4 w-4" />
                </span>
                <span className="grid min-w-0 gap-0.5">
                  <span className="text-[0.68rem] font-extrabold uppercase text-neutral-500">{currentTurn}</span>
                  <strong className="text-sm leading-5">
                    {selectedTarget
                      ? selectedTargetState?.isAlive === false
                        ? copy.labels.alreadyDead(selectedTarget.nickname)
                        : `${actionVisual.selected}: ${selectedTarget.nickname}`
                      : actionVisual.waiting}
                  </strong>
                </span>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2">
                <span className="min-w-0">
                  <span className="block text-[0.62rem] font-extrabold uppercase text-neutral-500">{copy.labels.yourRole}</span>
                  <strong className="block truncate text-sm">{currentRole?.label ?? copy.labels.spectator}</strong>
                </span>
                <span className="shrink-0 rounded-full bg-yellow-400/15 px-2 py-1 text-[0.68rem] font-black text-yellow-300">
                  {currentRole?.team ?? copy.labels.offTable}
                </span>
              </div>

              <button
                type="button"
                onClick={handleConfirmAction}
                disabled={!selectedTarget || !selectedTargetState || selectedTargetState.isAlive === false}
                className="btn-base btn-primary w-full px-4 py-3 text-sm disabled:pointer-events-none disabled:opacity-45"
              >
                <Check className="h-4 w-4" />
                {confirmLabel}
              </button>

              {displayedActionFeedback && (
                <div
                  className={cx(
                    'rounded-lg border p-2.5',
                    displayedActionFeedback.kind === 'success' &&
                      'border-emerald-400/35 bg-emerald-500/10 text-emerald-100',
                    displayedActionFeedback.kind === 'error' && 'border-red-400/40 bg-red-500/10 text-red-100',
                    displayedActionFeedback.kind === 'notice' && 'border-amber-300/35 bg-amber-400/10 text-amber-100',
                  )}
                >
                  <p className="text-xs font-black">{displayedActionFeedback.title}</p>
                  <p className="mt-1 text-xs leading-4 text-current/80">{displayedActionFeedback.body}</p>
                </div>
              )}

              <div className="flex items-center justify-between gap-2">
                <div className="inline-flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleMic}
                    className={cx(
                      'inline-flex h-10 w-10 items-center justify-center rounded-lg border border-neutral-700 bg-white/10 transition',
                      !micWanted && 'border-red-500/80 bg-red-500/15 text-red-200',
                    )}
                    title={micWanted ? copy.labels.micOff : copy.labels.micOn}
                    aria-label={micWanted ? copy.labels.micOff : copy.labels.micOn}
                  >
                    {micWanted ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={toggleCam}
                    className={cx(
                      'inline-flex h-10 w-10 items-center justify-center rounded-lg border border-neutral-700 bg-white/10 transition',
                      !camWanted && 'border-red-500/80 bg-red-500/15 text-red-200',
                    )}
                    title={camWanted ? copy.labels.camOff : copy.labels.camOn}
                    aria-label={camWanted ? copy.labels.camOff : copy.labels.camOn}
                  >
                    {camWanted ? <Camera className="h-4 w-4" /> : <CameraOff className="h-4 w-4" />}
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-neutral-700 bg-white/10 transition"
                    title={copy.labels.settings}
                    aria-label={copy.labels.settings}
                  >
                    <Settings className="h-4 w-4" />
                  </button>
                </div>

                {room.ownerId === user?.id ? (
                  <button
                    type="button"
                    onClick={handleAdvancePhase}
                    disabled={phase === 'final' || isAdvancingPhase}
                    className="inline-flex h-10 items-center gap-2 rounded-lg border border-neutral-700 bg-neutral-900/80 px-3 text-xs font-bold text-neutral-200 transition disabled:pointer-events-none disabled:opacity-45"
                  >
                    <PhaseIcon className="h-4 w-4" />
                    {isAdvancingPhase ? '...' : getNextStepLabel(step, copy, isIntroRound)}
                  </button>
                ) : (
                  <span className="text-right text-[0.65rem] font-bold text-neutral-500">{copy.labels.ownerControls}</span>
                )}
              </div>

              {currentPhaseFeedback && <p className="text-right text-[0.68rem] font-bold text-red-300">{currentPhaseFeedback}</p>}
            </div>
          </div>
        </section>

        <aside className={cx('flex min-h-0 flex-col gap-4 border-l bg-black/80 p-4 max-lg:hidden', theme.border)}>
          <section className={cx('rounded-xl border p-4', theme.border, theme.panel)}>
            <p className="mb-3 text-xs font-extrabold uppercase text-neutral-500">{copy.labels.yourRole}</p>
            <div className="flex items-center gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-yellow-400/15 text-yellow-400">
                <ShieldQuestion className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-black">{currentRole?.label ?? copy.labels.spectator}</h2>
                <p className="text-sm text-neutral-500">{currentRole?.team ?? copy.labels.offTable}</p>
              </div>
            </div>
          </section>

          <section className={cx('rounded-xl border p-4', theme.border, theme.panel)}>
            <p className="mb-3 text-xs font-extrabold uppercase text-neutral-500">{copy.labels.now}</p>
            <h2 className="font-black">{currentTurn}</h2>
            <p className="mt-2 text-sm leading-6 text-neutral-500">{stepHint}</p>

            <div className="my-4 overflow-hidden rounded-xl border border-white/10 bg-white/[0.06]">
              <div className="flex items-start gap-3 p-3">
                <span className={cx('inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', canSelectTarget ? 'bg-red-500/15 text-red-200' : 'bg-white/10 text-neutral-400')}>
                  <ActionIcon className="h-5 w-5" />
                </span>
                <span className="grid min-w-0 gap-1">
                  <span className="text-xs font-extrabold uppercase text-neutral-500">{actionVisual.label}</span>
                  <strong className="text-sm leading-5">
                    {selectedTarget
                      ? selectedTargetState?.isAlive === false
                        ? copy.labels.alreadyDead(selectedTarget.nickname)
                        : selectedTarget.nickname
                      : actionVisual.waiting}
                  </strong>
                  {selectedTarget && selectedTargetState?.isAlive !== false && (
                    <span className="text-xs font-semibold text-neutral-500">{actionVisual.selected}</span>
                  )}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleConfirmAction}
              disabled={!selectedTarget || !selectedTargetState || selectedTargetState.isAlive === false}
              className="btn-base btn-primary w-full px-4 py-3 text-sm disabled:pointer-events-none disabled:opacity-45"
            >
              <Check className="h-4 w-4" />
              {confirmLabel}
            </button>

            {displayedActionFeedback && (
              <div
                className={cx(
                  'mt-3 rounded-xl border p-3',
                  displayedActionFeedback.kind === 'success' &&
                    'border-emerald-400/35 bg-emerald-500/10 text-emerald-100',
                  displayedActionFeedback.kind === 'error' && 'border-red-400/40 bg-red-500/10 text-red-100',
                  displayedActionFeedback.kind === 'notice' && 'border-amber-300/35 bg-amber-400/10 text-amber-100',
                )}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={cx(
                      'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                      displayedActionFeedback.kind === 'success' && 'bg-emerald-400/15 text-emerald-200',
                      displayedActionFeedback.kind === 'error' && 'bg-red-400/15 text-red-200',
                      displayedActionFeedback.kind === 'notice' && 'bg-amber-300/15 text-amber-200',
                    )}
                  >
                    {displayedActionFeedback.kind === 'success' && <ShieldCheck className="h-4 w-4" />}
                    {displayedActionFeedback.kind === 'error' && <ShieldBan className="h-4 w-4" />}
                    {displayedActionFeedback.kind === 'notice' && <ShieldQuestion className="h-4 w-4" />}
                  </span>
                  <span className="grid gap-1">
                    <strong className="text-sm">{displayedActionFeedback.title}</strong>
                    <span className="text-sm leading-5 text-current/80">{displayedActionFeedback.body}</span>
                  </span>
                </div>
              </div>
            )}
          </section>
        </aside>
      </main>

      <footer className="grid h-20 shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-4 border-t border-neutral-800 bg-neutral-950/95 px-6 max-lg:hidden">
        <div className="flex min-w-0 items-center gap-3 justify-self-start max-md:w-full">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-700 text-xs font-black">
            {getInitials(user?.nickname ?? '?')}
          </span>
          <span className="grid min-w-0">
            <strong className="truncate text-sm">{user?.nickname}</strong>
            <small className="text-xs font-extrabold text-yellow-400">{currentRole?.label ?? copy.labels.spectator}</small>
          </span>
        </div>

        <div className="inline-flex items-center gap-2">
          <button
            type="button"
            onClick={toggleMic}
            className={cx(
              'inline-flex h-11 w-11 items-center justify-center rounded-lg border border-neutral-700 bg-white/10 transition hover:border-red-500/80 hover:bg-red-500/15',
              !micWanted && 'border-red-500/80 bg-red-500/15 text-red-200',
            )}
            title={micWanted ? copy.labels.micOff : copy.labels.micOn}
            aria-label={micWanted ? copy.labels.micOff : copy.labels.micOn}
          >
            {micWanted ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
          </button>
          <button
            type="button"
            onClick={toggleCam}
            className={cx(
              'inline-flex h-11 w-11 items-center justify-center rounded-lg border border-neutral-700 bg-white/10 transition hover:border-red-500/80 hover:bg-red-500/15',
              !camWanted && 'border-red-500/80 bg-red-500/15 text-red-200',
            )}
            title={camWanted ? copy.labels.camOff : copy.labels.camOn}
            aria-label={camWanted ? copy.labels.camOff : copy.labels.camOn}
          >
            {camWanted ? <Camera className="h-5 w-5" /> : <CameraOff className="h-5 w-5" />}
          </button>
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-neutral-700 bg-white/10 transition hover:border-red-500/80 hover:bg-red-500/15"
            title={copy.labels.settings}
            aria-label={copy.labels.settings}
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>

        {room.ownerId === user?.id ? (
          <div className="flex flex-wrap items-center justify-end gap-2 justify-self-end text-xs text-neutral-500 max-md:justify-center">
            <span>{copy.labels.phase}</span>
            <button
              type="button"
              onClick={handleAdvancePhase}
              disabled={phase === 'final' || isAdvancingPhase}
              className="inline-flex h-9 items-center gap-2 rounded border border-neutral-700 bg-neutral-900/80 px-3 font-bold text-neutral-200 transition hover:border-red-500/80 hover:bg-red-500/15 disabled:pointer-events-none disabled:opacity-45"
            >
              <PhaseIcon className="h-4 w-4" />
              {isAdvancingPhase ? copy.labels.advancing : getNextStepLabel(step, copy, isIntroRound)}
            </button>
            {currentPhaseFeedback && (
              <span className="basis-full text-right text-[0.7rem] font-bold text-red-300">
                {currentPhaseFeedback}
              </span>
            )}
          </div>
        ) : (
          <div className="justify-self-end text-xs font-bold text-neutral-500 max-md:justify-self-center">
            {copy.labels.ownerControlsLong}
          </div>
        )}
      </footer>
    </div>
  )
}
