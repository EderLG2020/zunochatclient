import { create } from "zustand";
import type { PresenceEvent } from "@/types";

interface PresenceInfo {
  online: boolean;
  lastSeen: string | null;
}

interface PresenceState {
  byUserId: Record<number, PresenceInfo>;
  applyEvent: (evt: PresenceEvent) => void;
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
}));
