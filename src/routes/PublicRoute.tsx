import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/authstore'

// Redirige a /chat si el usuario ya está autenticado.
export function PublicRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isLoading       = useAuthStore((s) => s.isLoading)

  if (isLoading) return (
    <div className="flex h-full items-center justify-center bg-gray-50">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
    </div>
  )
  return isAuthenticated ? <Navigate to="/chat" replace /> : <Outlet />
}