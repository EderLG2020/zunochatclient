import { useEffect } from "react";
import { wsService } from "@/services/websocket.service";
import { presenceService } from "@/services/presence.service";
import { useAuthStore } from "@/store/authstore";
import { usePresenceStore } from "@/store/presencestore";

/**
 * Suscribe a /topic/presence.{userId} para cada id de la lista — se
 * resuscribe solo cuando el conjunto de ids realmente cambia (no en cada
 * render). Pensado para la sidebar (un id por conversación visible) y para
 * el header del chat activo.
 */
export function usePresenceSubscriptions(userIds: number[]): void {
  const token = useAuthStore((s) => s.token);
  const applyEvent = usePresenceStore((s) => s.applyEvent);
  const seedIfMissing = usePresenceStore((s) => s.seedIfMissing);
  const idsKey = [...new Set(userIds)].sort((a, b) => a - b).join(",");

  useEffect(() => {
    const ids = idsKey ? idsKey.split(",").map(Number) : [];
    if (!token || ids.length === 0) return;

    let cancelled = false;

    const subscribe = () => {
      ids.forEach((id) => wsService.subscribeToPresence(id, applyEvent));
    };

    if (wsService.isConnected) subscribe();
    else wsService.connect(token, subscribe);

    // Snapshot del estado actual — el WS solo avisa CAMBIOS a quien ya
    // esté suscripto en ese momento; si el otro se conectó antes de que
    // nosotros abriéramos la app, ese evento ya pasó y nunca llega. Esto
    // completa el estado real sin esperar la próxima conexión/desconexión
    // del otro usuario (ver PresenceController en el backend).
    presenceService.snapshot(ids)
      .then((entries) => { if (!cancelled) seedIfMissing(entries); })
      .catch(() => {/* no crítico — el WS lo va a actualizar igual ante el próximo cambio */});

    return () => {
      cancelled = true;
      ids.forEach((id) => wsService.unsubscribeFromPresence(id));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey, token]);
}

/** true/false si se conoce el estado en vivo de ese usuario, undefined si aún no llegó ningún evento. */
export function useIsOnline(userId: number | undefined): boolean | undefined {
  return usePresenceStore((s) => (userId != null ? s.byUserId[userId]?.online : undefined));
}

/**
 * Mantiene vivo el TTL de presencia (65s) del propio usuario mientras esté
 * autenticado. Sin esto, PresenceService marca "offline" a cualquiera que no
 * escriba nada por más de 65s, aunque el WebSocket siga conectado — el ping
 * STOMP (heartbeatIncoming/Outgoing) solo mantiene viva la conexión, no toca
 * la presencia de aplicación. Montar una sola vez en un punto siempre activo
 * mientras haya sesión (no depende de qué conversaciones estén visibles).
 */
export function useHeartbeat(): void {
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    if (!token) return;

    const send = () => {
      if (wsService.isConnected) wsService.sendHeartbeat();
    };

    if (wsService.isConnected) send();
    else wsService.connect(token, send);

    const interval = setInterval(send, 30_000);
    return () => clearInterval(interval);
  }, [token]);
}
