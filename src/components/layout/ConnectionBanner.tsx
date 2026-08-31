import { useConnectionStore } from "@/store/connectionStore";

// Barra superior estilo WhatsApp: solo se muestra mientras el socket no está
// conectado. "reconnecting" (venías de estar conectado y se cayó) usa un
// mensaje distinto a "connecting" (primer intento, ej. justo tras loguearte).
export function ConnectionBanner() {
  const status = useConnectionStore((s) => s.status);

  if (status === "connected") return null;

  const message =
    status === "reconnecting"
      ? "Sin conexión. Reconectando…"
      : "Conectando…";

  return (
    <div
      role="status"
      className="animate-slide-down flex items-center justify-center gap-2 bg-amber-500 px-3 py-1.5 text-xs font-medium text-white dark:bg-amber-600"
    >
      <span className="h-1.5 w-1.5 flex-shrink-0 animate-pulse rounded-full bg-white" />
      {message}
    </div>
  );
}
