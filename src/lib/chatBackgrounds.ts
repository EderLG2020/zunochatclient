export type ChatBackgroundKey = "doodle" | "dots" | "geo" | "none";

export interface ChatBackgroundOption {
  key: ChatBackgroundKey;
  label: string;
  /** null = sin patrón (fondo liso). Un archivo distinto por tema — misma clave visual, distinto contraste. */
  light: string | null;
  dark: string | null;
  /** Tamaño del tile (debe matchear el viewBox del SVG para que el repeat no se vea cortado). */
  size: number;
}

export const CHAT_BACKGROUNDS: ChatBackgroundOption[] = [
  {
    key: "doodle",
    label: "Clásico",
    light: "/patterns/chat-pattern-light.svg",
    dark: "/patterns/chat-pattern-dark.svg",
    size: 240,
  },
  {
    key: "dots",
    label: "Puntos",
    light: "/patterns/chat-dots-light.svg",
    dark: "/patterns/chat-dots-dark.svg",
    size: 40,
  },
  {
    key: "geo",
    label: "Geométrico",
    light: "/patterns/chat-geo-light.svg",
    dark: "/patterns/chat-geo-dark.svg",
    size: 60,
  },
  {
    key: "none",
    label: "Liso",
    light: null,
    dark: null,
    size: 0,
  },
];

export const DEFAULT_CHAT_BACKGROUND: ChatBackgroundKey = "doodle";

const BY_KEY = new Map(CHAT_BACKGROUNDS.map((b) => [b.key, b]));

export function getChatBackground(key: ChatBackgroundKey): ChatBackgroundOption {
  return BY_KEY.get(key) ?? CHAT_BACKGROUNDS[0];
}

export function isChatBackgroundKey(value: string | null): value is ChatBackgroundKey {
  return value !== null && BY_KEY.has(value as ChatBackgroundKey);
}
