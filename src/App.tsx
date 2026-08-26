import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore }    from '@/store/authstore'
import { ProtectedRoute }  from '@/routes/ProtectedRoute'
import { PublicRoute }     from '@/routes/PublicRoute'
import { LoginPage }       from '@/pages/LoginPage'
import { RegisterPage }    from '@/pages/RegisterPage'
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage'
import { ChatPage }        from '@/pages/ChatPage'
import { AdminPage }       from '@/pages/AdminPage'
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
          <Route path="/login"           element={<LoginPage />} />
          <Route path="/register"        element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        </Route>

        {/* Rutas protegidas */}
        <Route element={<ProtectedRoute />}>
          <Route path="/chat"  element={<ChatPage />} />
          {/* AdminPage valida el rol y redirige a /chat si no corresponde */}
          <Route path="/admin" element={<AdminPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </div>
  )
}