import { CHAT_COLORS } from "@/lib/chatColors";
import { useChatColorStore } from "@/store/chatColorStore";

/** Sección "Apariencia" del modal de Configuración — hoy solo el color del chat. */
export function AppearanceSettings() {
  const color = useChatColorStore((s) => s.color);
  const setColor = useChatColorStore((s) => s.setColor);

  return (
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
  );
}
