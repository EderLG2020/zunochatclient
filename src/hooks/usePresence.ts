import { useEffect } from "react";
import { wsService } from "@/services/websocket.service";
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
  const idsKey = [...new Set(userIds)].sort((a, b) => a - b).join(",");

  useEffect(() => {
    const ids = idsKey ? idsKey.split(",").map(Number) : [];
    if (!token || ids.length === 0) return;

    const subscribe = () => {
      ids.forEach((id) => wsService.subscribeToPresence(id, applyEvent));
    };

    if (wsService.isConnected) subscribe();
    else wsService.connect(token, subscribe);

    return () => {
      ids.forEach((id) => wsService.unsubscribeFromPresence(id));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey, token]);
}

/** true/false si se conoce el estado en vivo de ese usuario, undefined si aún no llegó ningún evento. */
export function useIsOnline(userId: number | undefined): boolean | undefined {
  return usePresenceStore((s) => (userId != null ? s.byUserId[userId]?.online : undefined));
}
