import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/authstore'

// Redirige a /login si no hay sesión activa.
// Mientras hidrata desde localStorage muestra un spinner (evita flash).
export function ProtectedRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isLoading       = useAuthStore((s) => s.isLoading)

  if (isLoading) return <Spinner />
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />
}

function Spinner() {
  return (
    <div className="flex h-full items-center justify-center bg-gray-50">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
    </div>
  )
}