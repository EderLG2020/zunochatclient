import { create } from "zustand";
import type { PresenceEvent } from "@/types";

interface PresenceInfo {
  online: boolean;
  lastSeen: string | null;
}

interface PresenceState {
  byUserId: Record<number, PresenceInfo>;
  applyEvent: (evt: PresenceEvent) => void;
  seedIfMissing: (entries: { userId: number; online: boolean; lastSeen: string | null }[]) => void;
}

/**
 * Estado en memoria de "quién está online ahora mismo", alimentado por
 * /topic/presence.{userId}. El backend ya publicaba estos eventos — ningún
 * cliente los consumía todavía, así que el estado "En línea" del sidebar
 * solo se actualizaba al volver a pedir la lista por REST.
 */
export const usePresenceStore = create<PresenceState>()((set, get) => ({
  byUserId: {},

  applyEvent: (evt) => {
    set({
      byUserId: {
        ...get().byUserId,
        [evt.userId]: { online: evt.online, lastSeen: evt.lastSeen },
      },
    });
  },

  // Para el snapshot REST inicial (ver usePresenceSubscriptions): solo
  // completa usuarios que el store todavía no conoce. Si mientras la
  // petición estaba en vuelo ya llegó un evento en vivo por WS más
  // reciente, ese evento gana — nunca lo pisa un snapshot desactualizado.
  seedIfMissing: (entries) => {
    const current = get().byUserId;
    const additions: Record<number, PresenceInfo> = {};
    let hasAdditions = false;
    for (const e of entries) {
      if (current[e.userId] === undefined) {
        additions[e.userId] = { online: e.online, lastSeen: e.lastSeen };
        hasAdditions = true;
      }
    }
    if (hasAdditions) set({ byUserId: { ...current, ...additions } });
  },
}));
