import { create } from "zustand";
import type { ConversationResponse, MessageResponse, MessageStatus } from "@/types";

export interface PendingUser { id: number; username: string; }

interface ChatState {
  activeConversation: ConversationResponse | null;
  pendingUser:        PendingUser | null;
  messages:           MessageResponse[];
  typingUserId:       number | null;

  setActiveConversation: (conv: ConversationResponse | null) => void;
  setPendingUser:        (user: PendingUser | null) => void;
  setMessages:           (msgs: MessageResponse[]) => void;
  prependMessages:       (msgs: MessageResponse[]) => void;
  appendMessage:         (msg: MessageResponse) => void;
  updateMessage:         (msg: MessageResponse) => void;
  markMessagesAsRead:    (conversationId: number, readByUserId: number) => void;
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

  // Edición/borrado: reemplaza el mensaje existente por su versión actualizada.
  // Si todavía no está en memoria (ej. llegó por WS antes de cargar la página), no hace nada.
  updateMessage: (msg) => {
    const prev = get().messages;
    if (!prev.some((m) => m.messageId === msg.messageId)) return;
    set({ messages: prev.map((m) => (m.messageId === msg.messageId ? msg : m)) });
  },

  // Cuando el receptor abre el chat y marca como leído,
  // actualiza en el store todos los mensajes que le enviamos a él
  markMessagesAsRead: (conversationId: number, readByUserId: number) => {
    const prev = get().messages;
    const hasChanges = prev.some(
      (m) => m.conversationId === conversationId &&
             m.receiverId === readByUserId &&
             m.status !== "READ"
    );
    if (!hasChanges) return; // evita re-render innecesario
    set({
      messages: prev.map((m): MessageResponse =>
        m.conversationId === conversationId &&
        m.receiverId === readByUserId &&
        m.status !== "READ"
          ? { ...m, status: "READ" as MessageStatus }
          : m
      ),
    });
  },

  setTypingUserId: (id) => set({ typingUserId: id }),
}));