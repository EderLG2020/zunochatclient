import { create } from "zustand";
import type { StreakEvent, StreakRequestStatus, StreakResponse, StreakStatus } from "@/types";

export interface StreakInfo {
  conversationId: number;
  enabled: boolean;
  currentCount: number;
  longestCount: number;
  status: StreakStatus;
  requestStatus: StreakRequestStatus;
  requestedByUserId: number | null;
}

interface StreakState {
  byConversationId: Record<number, StreakInfo>;
  setStreak: (streak: StreakResponse) => void;
  applyEvent: (evt: StreakEvent) => void;
}

function fromResponse(r: StreakResponse): StreakInfo {
  return {
    conversationId: r.conversationId,
    enabled: r.enabled,
    currentCount: r.currentCount,
    longestCount: r.longestCount,
    status: r.status,
    requestStatus: r.requestStatus,
    requestedByUserId: r.requestedByUserId,
  };
}

/**
 * Estado en memoria de la racha por conversación — alimentado por el GET
 * inicial (ver useStreakSubscriptions) y por /topic/streak.{conversationId}
 * en vivo. El backend no manda requestStatus en el evento WS (solo en la
 * respuesta REST) — se deriva acá mismo a partir de eventType, que ya es
 * 1 a 1 con la transición de requestStatus que ocurrió del lado del servidor.
 */
export const useStreakStore = create<StreakState>()((set, get) => ({
  byConversationId: {},

  setStreak: (streak) => {
    set({
      byConversationId: {
        ...get().byConversationId,
        [streak.conversationId]: fromResponse(streak),
      },
    });
  },

  applyEvent: (evt) => {
    const prev = get().byConversationId[evt.conversationId];
    const base: StreakInfo = prev ?? {
      conversationId: evt.conversationId,
      enabled: false,
      currentCount: 0,
      longestCount: 0,
      status: "INACTIVE",
      requestStatus: "NONE",
      requestedByUserId: null,
    };

    let next: StreakInfo = {
      ...base,
      currentCount: evt.currentCount,
      longestCount: evt.longestCount,
      status: evt.status,
    };

    switch (evt.eventType) {
      case "REQUEST_SENT":
        next = { ...next, enabled: false, requestStatus: "PENDING", requestedByUserId: evt.requestedByUserId };
        break;
      case "REQUEST_ACCEPTED":
        next = { ...next, enabled: true, requestStatus: "ACCEPTED", requestedByUserId: null };
        break;
      case "REQUEST_DECLINED":
        next = { ...next, enabled: false, requestStatus: "DECLINED", requestedByUserId: null };
        break;
      case "DISABLED":
        next = { ...next, enabled: false, requestStatus: "NONE", requestedByUserId: null };
        break;
      default:
        // INCREMENTED | RESET | AT_RISK | BROKEN: solo cambia contador/estado (ya aplicado arriba)
        break;
    }

    set({ byConversationId: { ...get().byConversationId, [evt.conversationId]: next } });
  },
}));
