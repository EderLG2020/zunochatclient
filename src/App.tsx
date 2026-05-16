import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore }    from '@/store/authstore'
import { ProtectedRoute }  from '@/routes/ProtectedRoute'
import { PublicRoute }     from '@/routes/PublicRoute'
import { LoginPage }       from '@/pages/LoginPage'
import { RegisterPage }    from '@/pages/RegisterPage'
import { ChatPage }        from '@/pages/ChatPage'
import { NotFoundPage }    from '@/pages/NotFoundPage'

/*
 * Árbol de rutas:
 *   /           → redirige a /chat
 *   /login      → pública (redirige a /chat si ya autenticado)
 *   /register   → pública
 *   /chat       → protegida (redirige a /login si no autenticado)
 *   *           → 404
 */
export default function App() {
  const hydrate = useAuthStore((s) => s.hydrate)

  // Reconecta WS si había sesión persistida y marca isLoading = false
  useEffect(() => {
    hydrate()
  }, [hydrate])

  return (
    <div className="h-screen overflow-hidden">
      <Routes>
        <Route path="/" element={<Navigate to="/chat" replace />} />

        {/* Rutas públicas */}
        <Route element={<PublicRoute />}>
          <Route path="/login"    element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>

        {/* Rutas protegidas */}
        <Route element={<ProtectedRoute />}>
          <Route path="/chat" element={<ChatPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </div>
  )
}