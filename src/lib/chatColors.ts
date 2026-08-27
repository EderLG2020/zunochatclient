export type ChatColorKey = "blue" | "emerald" | "violet" | "rose" | "amber";

export interface ChatColorOption {
  key: ChatColorKey;
  label: string;
  /** Círculo sólido del selector de color. */
  swatch: string;
  /** Fondo de la burbuja de "mis" mensajes. */
  bubble: string;
  /** Color de textos secundarios sobre la burbuja (hora, "editado") — debe
   *  quedar legible sobre `bubble`, por eso es un tono claro de la misma familia. */
  bubbleTint: string;
}

// Clases completas y literales (no interpolar "bg-" + color): Tailwind solo
// genera CSS para clases que puede ver como texto exacto en el código.
export const CHAT_COLORS: ChatColorOption[] = [
  { key: "blue",    label: "Azul",    swatch: "bg-blue-500",    bubble: "bg-blue-500",    bubbleTint: "text-blue-100" },
  { key: "emerald", label: "Verde",   swatch: "bg-emerald-500", bubble: "bg-emerald-500", bubbleTint: "text-emerald-100" },
  { key: "violet",  label: "Morado",  swatch: "bg-violet-500",  bubble: "bg-violet-500",  bubbleTint: "text-violet-100" },
  { key: "rose",    label: "Rosa",    swatch: "bg-rose-500",    bubble: "bg-rose-500",    bubbleTint: "text-rose-100" },
  { key: "amber",   label: "Naranja", swatch: "bg-amber-500",   bubble: "bg-amber-500",   bubbleTint: "text-amber-100" },
];

export const DEFAULT_CHAT_COLOR: ChatColorKey = "blue";

const BY_KEY = new Map(CHAT_COLORS.map((c) => [c.key, c]));

export function getChatColor(key: ChatColorKey): ChatColorOption {
  return BY_KEY.get(key) ?? CHAT_COLORS[0];
}

export function isChatColorKey(value: string | null): value is ChatColorKey {
  return value !== null && BY_KEY.has(value as ChatColorKey);
}
