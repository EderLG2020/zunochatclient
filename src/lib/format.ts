import type { MessageType, PayloadType } from "@/types";

/** Espejo de MessageService#buildPreview en el backend, para patchear conversaciones en memoria. */
export function buildMessagePreview(
  type: MessageType,
  textContent: string | null,
  payloadType: PayloadType | null
): string {
  switch (type) {
    case "TEXT":
      return textContent ?? "";
    case "IMAGE":
      return "📷 Imagen";
    case "FILE":
      return "📎 Archivo adjunto";
    case "PAYLOAD":
      switch (payloadType) {
        case "SALES":  return "🛒 Oferta";
        case "SURVEY": return "📋 Encuesta";
        case "CARD":   return "🃏 Tarjeta";
        default:       return "⚙️ Notificación";
      }
  }
}

const AVATAR_PALETTE = [
  "from-blue-400 to-blue-600",
  "from-purple-400 to-purple-600",
  "from-pink-400 to-pink-600",
  "from-emerald-400 to-emerald-600",
  "from-amber-400 to-amber-600",
  "from-cyan-400 to-cyan-600",
  "from-rose-400 to-rose-600",
  "from-indigo-400 to-indigo-600",
];

/** Gradiente determinístico por usuario, para que cada persona tenga un color estable. */
export function avatarGradient(seed: number | string): string {
  const str = String(seed);
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

/** Etiqueta de separador de fecha para agrupar mensajes: "Hoy", "Ayer" o fecha larga. */
export function dayLabel(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  if (sameDay(date, today)) return "Hoy";
  if (sameDay(date, yesterday)) return "Ayer";
  return date.toLocaleDateString("es", { day: "numeric", month: "long", year: "numeric" });
}
