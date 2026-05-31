import { create } from "zustand";
import type { ConversationResponse, MessageResponse } from "@/types";

// Usuario seleccionado desde búsqueda antes de que exista conversación
export interface PendingUser {
  id: number;
  username: string;
}

interface ChatState {
  activeConversation: ConversationResponse | null;
  pendingUser:        PendingUser | null;          // chat abierto sin conversación aún
  messages:           MessageResponse[];
  typingUserId:       number | null;

  setActiveConversation: (conv: ConversationResponse | null) => void;
  setPendingUser:        (user: PendingUser | null) => void;
  setMessages:           (msgs: MessageResponse[]) => void;
  prependMessages:       (msgs: MessageResponse[]) => void;
  appendMessage:         (msg: MessageResponse) => void;
  setTypingUserId:       (id: number | null) => void;
}

export const useChatStore = create<ChatState>()((set, get) => ({
  activeConversation: null,
  pendingUser:        null,
  messages:           [],
  typingUserId:       null,

  setActiveConversation: (conv) =>
    set({ activeConversation: conv, pendingUser: null, messages: [], typingUserId: null }),

  setPendingUser: (user) =>
    set({ pendingUser: user, activeConversation: null, messages: [], typingUserId: null }),

  setMessages: (msgs) => set({ messages: msgs }),

  prependMessages: (msgs) => {
    const prev = get().messages;
    const ids  = new Set(prev.map((m) => m.messageId));
    const news = msgs.filter((m) => !ids.has(m.messageId));
    set({ messages: [...news, ...prev] });
  },

  appendMessage: (msg) => {
    const prev = get().messages;
    if (prev.some((m) => m.messageId === msg.messageId)) return;
    set({ messages: [...prev, msg] });
  },

  setTypingUserId: (id) => set({ typingUserId: id }),
}));