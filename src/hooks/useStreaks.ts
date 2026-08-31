import { useEffect } from "react";
import { wsService } from "@/services/websocket.service";
import { streakService } from "@/services/streak.service";
import { useAuthStore } from "@/store/authstore";
import { useStreakStore, type StreakInfo } from "@/store/streakStore";

/**
 * Suscribe a /topic/streak.{conversationId} para cada conversación DIRECT
 * visible y trae el estado inicial por REST — un GET por conversación
 * (mismo criterio que ConversationService#listConversations: el total de
 * conversaciones por usuario es chico, no vale la pena un endpoint de
 * listado en batch solo para esto). Pensado para la sidebar completa.
 */
export function useStreakSubscriptions(conversationIds: number[]): void {
  const token = useAuthStore((s) => s.token);
  const applyEvent = useStreakStore((s) => s.applyEvent);
  const setStreak = useStreakStore((s) => s.setStreak);
  const idsKey = [...new Set(conversationIds)].sort((a, b) => a - b).join(",");

  useEffect(() => {
    const ids = idsKey ? idsKey.split(",").map(Number) : [];
    if (!token || ids.length === 0) return;

    let cancelled = false;

    const subscribe = () => {
      ids.forEach((id) => wsService.subscribeToStreak(id, applyEvent));
    };

    if (wsService.isConnected) subscribe();
    else wsService.connect(token, subscribe);

    Promise.all(ids.map((id) => streakService.get(id).catch(() => null))).then((results) => {
      if (cancelled) return;
      results.forEach((r) => {
        if (r) setStreak(r);
      });
    });

    return () => {
      cancelled = true;
      ids.forEach((id) => wsService.unsubscribeFromStreak(id));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey, token]);
}

/** Estado de racha de una conversación puntual — undefined mientras no llegó ni el GET ni ningún evento. */
export function useStreak(conversationId: number | null | undefined): StreakInfo | undefined {
  return useStreakStore((s) => (conversationId != null ? s.byConversationId[conversationId] : undefined));
}
