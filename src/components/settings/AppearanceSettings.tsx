import type { ReactNode } from "react";
import { CHAT_COLORS } from "@/lib/chatColors";
import { useChatColorStore } from "@/store/chatColorStore";
import { CHAT_BACKGROUNDS } from "@/lib/chatBackgrounds";
import { useChatBackgroundStore } from "@/store/chatBackgroundStore";
import { useThemeStore, themeToPreference, type Theme } from "@/store/themeStore";
import { useAuthStore } from "@/store/authstore";
import { userService } from "@/services/user.service";

const THEME_OPTIONS: { key: Theme; label: string; icon: ReactNode }[] = [
  {
    key: "light",
    label: "Claro",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
      </svg>
    ),
  },
  {
    key: "dark",
    label: "Oscuro",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
      </svg>
    ),
  },
];

/** Sección "Apariencia" del modal de Configuración: tema claro/oscuro y color del chat. */
export function AppearanceSettings() {
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const color = useChatColorStore((s) => s.color);
  const setColor = useChatColorStore((s) => s.setColor);

  const chatBackground = useChatBackgroundStore((s) => s.background);
  const setChatBackground = useChatBackgroundStore((s) => s.setBackground);

  const handleThemeChange = (next: Theme) => {
    setTheme(next);
    if (!isAuthenticated) return;
    // Persiste la preferencia en la cuenta para que se mantenga entre
    // dispositivos. Si falla, el tema ya se aplicó localmente igual.
    userService.updateTheme(themeToPreference(next)).catch((err) => {
      console.error("No se pudo guardar la preferencia de tema", err);
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Tema</h3>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Elige cómo se ve ZunoChat en este dispositivo.
        </p>

        <div className="mt-4 flex gap-3">
          {THEME_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => handleThemeChange(opt.key)}
              aria-pressed={theme === opt.key}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition ${
                theme === opt.key
                  ? "border-blue-500 bg-blue-50 text-blue-600 dark:border-blue-500 dark:bg-blue-950/40 dark:text-blue-400"
                  : "border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              }`}
            >
              {opt.icon}
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Fondo del chat</h3>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          El patrón detrás de los mensajes — cada uno se adapta al tema claro/oscuro.
        </p>

        <div className="mt-4 grid grid-cols-4 gap-3">
          {CHAT_BACKGROUNDS.map((bg) => {
            const previewUrl = theme === "dark" ? bg.dark : bg.light;
            const isSelected = chatBackground === bg.key;
            return (
              <button
                key={bg.key}
                onClick={() => setChatBackground(bg.key)}
                aria-pressed={isSelected}
                className="flex flex-col items-center gap-1.5"
              >
                <span
                  style={
                    previewUrl
                      ? { backgroundImage: `url('${previewUrl}')`, backgroundSize: `${Math.round(bg.size / 2)}px ${Math.round(bg.size / 2)}px` }
                      : undefined
                  }
                  className={`h-14 w-14 rounded-lg border bg-gray-50 bg-repeat transition dark:bg-gray-950 ${
                    isSelected
                      ? "border-blue-500 ring-2 ring-blue-200 dark:ring-blue-900"
                      : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
                  }`}
                />
                <span className="text-[11px] text-gray-500 dark:text-gray-400">{bg.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Color del chat</h3>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Define el color de fondo de tus propios mensajes.
        </p>

        <div className="mt-4 flex flex-wrap gap-3">
          {CHAT_COLORS.map((c) => (
            <button
              key={c.key}
              onClick={() => setColor(c.key)}
              title={c.label}
              aria-label={c.label}
              aria-pressed={color === c.key}
              className="flex flex-col items-center gap-1.5"
            >
              <span
                className={`h-9 w-9 rounded-full ${c.swatch} transition ${
                  color === c.key ? "ring-2 ring-offset-2 ring-gray-400 dark:ring-offset-gray-900" : "hover:opacity-80"
                }`}
              />
              <span className="text-[11px] text-gray-500 dark:text-gray-400">{c.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
