import { create } from "zustand";
import { DEFAULT_CHAT_BACKGROUND, isChatBackgroundKey, type ChatBackgroundKey } from "@/lib/chatBackgrounds";

function getInitialBackground(): ChatBackgroundKey {
  const stored = localStorage.getItem("chatBackground");
  return isChatBackgroundKey(stored) ? stored : DEFAULT_CHAT_BACKGROUND;
}

interface ChatBackgroundState {
  background: ChatBackgroundKey;
  setBackground: (key: ChatBackgroundKey) => void;
}

// Preferencia puramente de cliente (como el color del chat) — es solo estética
// y local a este navegador, no hay razón para guardarla en el backend.
export const useChatBackgroundStore = create<ChatBackgroundState>()((set) => ({
  background: getInitialBackground(),
  setBackground: (key) => {
    localStorage.setItem("chatBackground", key);
    set({ background: key });
  },
}));
