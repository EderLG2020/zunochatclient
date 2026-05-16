import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthResponse } from '@/types'
import { wsService } from '@/services/websocket.service'

interface AuthUser {
  username: string
  email: string
  role: string
  permissions: string[]
}

interface AuthState {
  user: AuthUser | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (auth: AuthResponse) => void
  logout: () => void
  hydrate: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: true,

      login: (auth: AuthResponse) => {
        const user: AuthUser = {
          username: auth.username,
          email: auth.email,
          role: auth.role,
          permissions: auth.permissions,
        }
        set({ user, token: auth.token, isAuthenticated: true })
        wsService.connect(auth.token)
      },

      logout: () => {
        set({ user: null, token: null, isAuthenticated: false })
        wsService.disconnect()
      },

      // Llama esto una vez al montar la app para reconectar WS si había sesión
      hydrate: () => {
        const { token } = get()
        if (token) wsService.connect(token)
        set({ isLoading: false })
      },
    }),
    {
      name: 'auth-storage', // clave en localStorage
      // Solo persistir user y token, no isLoading ni funciones
      partialize: (state) => ({ user: state.user, token: state.token, isAuthenticated: state.isAuthenticated }),
    },
  ),
)