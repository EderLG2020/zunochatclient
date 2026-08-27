import { create } from "zustand";
import { DEFAULT_CHAT_COLOR, isChatColorKey, type ChatColorKey } from "@/lib/chatColors";

function getInitialColor(): ChatColorKey {
  const stored = localStorage.getItem("chatColor");
  return isChatColorKey(stored) ? stored : DEFAULT_CHAT_COLOR;
}

interface ChatColorState {
  color: ChatColorKey;
  setColor: (color: ChatColorKey) => void;
}

// Preferencia puramente de cliente (como el tema claro/oscuro) — no hay
// necesidad de guardarla en el backend para un ajuste puramente visual y
// local a este navegador.
export const useChatColorStore = create<ChatColorState>()((set) => ({
  color: getInitialColor(),
  setColor: (color) => {
    localStorage.setItem("chatColor", color);
    set({ color });
  },
}));
