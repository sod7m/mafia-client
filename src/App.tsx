import { useEffect, useRef } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useLocation } from 'react-router-dom'
import { ProtectedRoute } from './components/ProtectedRoute.tsx'
import { useGame } from './context/GameContext.tsx'
import { HomePage } from './pages/HomePage.tsx'
import { GamePage } from './pages/GamePage.tsx'
import { NotFoundPage } from './pages/NotFoundPage.tsx'
import { RoomPage } from './pages/RoomPage.tsx'
import { RoomsPage } from './pages/RoomsPage.tsx'
import { RulesPage } from './pages/RulesPage.tsx'

function getRoomIdFromPath(pathname: string) {
  const match = pathname.match(/^\/room\/([^/]+)(?:\/game)?$/)
  if (!match) {
    return null
  }

  return decodeURIComponent(match[1])
}

export default function App() {
  const location = useLocation()
  const { leaveRoom, user } = useGame()
  const previousRoomIdRef = useRef<string | null>(getRoomIdFromPath(location.pathname))

  useEffect(() => {
    const currentRoomId = getRoomIdFromPath(location.pathname)
    const previousRoomId = previousRoomIdRef.current

    if (previousRoomId && previousRoomId !== currentRoomId && user) {
      void leaveRoom(previousRoomId)
    }

    previousRoomIdRef.current = currentRoomId
  }, [leaveRoom, location.pathname, user])

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/rules" element={<RulesPage />} />
      <Route
        path="/rooms"
        element={
          <ProtectedRoute>
            <RoomsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/room/:id"
        element={
          <ProtectedRoute>
            <RoomPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/room/:id/game"
        element={
          <ProtectedRoute>
            <GamePage />
          </ProtectedRoute>
        }
      />
      <Route path="/404" element={<NotFoundPage />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  )
}
