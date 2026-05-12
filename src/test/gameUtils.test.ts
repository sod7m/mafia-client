import { describe, it, expect } from 'vitest'

// Pure utility functions extracted for testing
function formatTimer(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return `${minutes}:${rest.toString().padStart(2, '0')}`
}

function getInitials(nickname: string) {
  const cleanNickname = nickname.trim()
  if (!cleanNickname) return '??'
  const parts = cleanNickname.split(/\s+/)
  if (parts.length > 1) {
    return parts.slice(0, 2).map((p) => p[0]).join('').toUpperCase()
  }
  return cleanNickname.slice(0, 2).toUpperCase()
}

function getSecondsLeft(phaseEndsAt: string | undefined, nowMs: number) {
  if (!phaseEndsAt) return 0
  return Math.max(0, Math.ceil((new Date(phaseEndsAt).getTime() - nowMs) / 1000))
}

describe('formatTimer', () => {
  it('formats zero seconds', () => {
    expect(formatTimer(0)).toBe('0:00')
  })

  it('formats seconds under a minute', () => {
    expect(formatTimer(45)).toBe('0:45')
    expect(formatTimer(9)).toBe('0:09')
  })

  it('formats exactly one minute', () => {
    expect(formatTimer(60)).toBe('1:00')
  })

  it('formats minutes and seconds', () => {
    expect(formatTimer(90)).toBe('1:30')
    expect(formatTimer(125)).toBe('2:05')
  })
})

describe('getInitials', () => {
  it('returns ?? for empty string', () => {
    expect(getInitials('')).toBe('??')
    expect(getInitials('   ')).toBe('??')
  })

  it('returns first two chars for single word', () => {
    expect(getInitials('Alice')).toBe('AL')
    expect(getInitials('a')).toBe('A')
  })

  it('returns initials for two-word name', () => {
    expect(getInitials('John Doe')).toBe('JD')
    expect(getInitials('don vito')).toBe('DV')
  })

  it('ignores extra words beyond two', () => {
    expect(getInitials('A B C')).toBe('AB')
  })
})

describe('getSecondsLeft', () => {
  it('returns 0 when phaseEndsAt is undefined', () => {
    expect(getSecondsLeft(undefined, Date.now())).toBe(0)
  })

  it('returns 0 when phase has already ended', () => {
    const past = new Date(Date.now() - 5000).toISOString()
    expect(getSecondsLeft(past, Date.now())).toBe(0)
  })

  it('returns remaining seconds', () => {
    const nowMs = 1000000
    const future = new Date(nowMs + 30000).toISOString()
    expect(getSecondsLeft(future, nowMs)).toBe(30)
  })

  it('rounds up fractional seconds', () => {
    const nowMs = 1000000
    const future = new Date(nowMs + 29500).toISOString()
    expect(getSecondsLeft(future, nowMs)).toBe(30)
  })
})
