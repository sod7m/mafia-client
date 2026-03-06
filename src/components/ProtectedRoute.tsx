import { Navigate } from 'react-router-dom'
import type { ReactElement } from 'react'
import { useGame } from '../context/GameContext.tsx'

interface ProtectedRouteProps {
  children: ReactElement
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user } = useGame()

  if (!user) {
    return <Navigate to="/" replace />
  }

  return children
}
