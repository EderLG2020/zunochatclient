import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthResponse } from '@/types'
import { wsService } from '@/services/websocket.service'
import { authService } from '@/services/auth.service'
import { getMsUntilExpiry } from '@/lib/jwt'
import { useThemeStore, preferenceToTheme } from '@/store/themeStore'

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
  refreshIfNeeded: () => Promise<void>
  applyAuthUpdate: (auth: AuthResponse) => void
  updateEmail: (email: string) => void
}

/** Si al JWT le queda menos de esto, se renueva sola sin esperar a que expire. */
const REFRESH_THRESHOLD_MS = 2 * 60 * 60 * 1000 // 2h
/** Cada cuánto se revisa mientras la app sigue abierta. */
const REFRESH_CHECK_INTERVAL_MS = 30 * 60 * 1000 // 30min

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
        // Aplica la preferencia de tema guardada en la cuenta — mantiene el
        // mismo tema entre dispositivos en vez de depender solo de localStorage.
        useThemeStore.getState().setTheme(preferenceToTheme(auth.themePreference))
      },

      logout: () => {
        set({ user: null, token: null, isAuthenticated: false })
        wsService.disconnect()
      },

      // Llama esto una vez al montar la app para reconectar WS si había sesión
      hydrate: () => {
        const { token } = get()
        if (token) {
          wsService.connect(token)
          void get().refreshIfNeeded()
          setInterval(() => void get().refreshIfNeeded(), REFRESH_CHECK_INTERVAL_MS)
        }
        set({ isLoading: false })
      },

      // Renueva el JWT en silencio si le queda poco tiempo — evita que la
      // sesión expire "en seco" a las 24h mientras la app sigue abierta.
      // No reconecta el WS: el token nuevo solo hace falta para requests REST,
      // la conexión WS ya autenticada sigue viva con la vieja hasta que se cierre.
      refreshIfNeeded: async () => {
        const { token, isAuthenticated } = get()
        if (!token || !isAuthenticated) return
        const msLeft = getMsUntilExpiry(token)
        if (msLeft === null || msLeft > REFRESH_THRESHOLD_MS) return

        try {
          const auth = await authService.refresh(token)
          set((state) => ({
            token: auth.token,
            user: state.user ? { ...state.user, permissions: auth.permissions, role: auth.role } : state.user,
          }))
        } catch {
          // Token fuera de la ventana de gracia o cuenta ya no válida — se
          // deja que el próximo 401 real dispare el logout normal.
        }
      },

      // Aplica un AuthResponse tras un cambio de perfil que devuelve token
      // nuevo (ver userService.updateUsername) — a diferencia de login(), no
      // reconecta el WS ni reaplica la preferencia de tema: la sesión sigue
      // siendo la misma, solo cambió un dato del usuario.
      applyAuthUpdate: (auth: AuthResponse) => {
        set({
          token: auth.token,
          user: { username: auth.username, email: auth.email, role: auth.role, permissions: auth.permissions },
        })
      },

      // Cambio de email confirmado (ver userService.confirmEmailChange) — a
      // diferencia del username, el email no viaja en el JWT, así que no hace
      // falta token nuevo, solo reflejar el dato en el store.
      updateEmail: (email: string) => {
        set((state) => ({ user: state.user ? { ...state.user, email } : state.user }))
      },
    }),
    {
      name: 'auth-storage', // clave en localStorage
      // Solo persistir user y token, no isLoading ni funciones
      partialize: (state) => ({ user: state.user, token: state.token, isAuthenticated: state.isAuthenticated }),
    },
  ),
)