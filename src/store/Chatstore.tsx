import { create } from 'zustand'
import type { ConversationResponse, MessageResponse } from '@/types'

interface ChatState {
  activeConversation: ConversationResponse | null
  messages: MessageResponse[]
  typingUserId: number | null

  setActiveConversation: (conv: ConversationResponse | null) => void
  setMessages: (msgs: MessageResponse[]) => void
  appendMessage: (msg: MessageResponse) => void
  setTypingUserId: (id: number | null) => void
}

export const useChatStore = create<ChatState>()((set, get) => ({
  activeConversation: null,
  messages: [],
  typingUserId: null,

  // Limpia mensajes y typing al cambiar de conversación
  setActiveConversation: (conv) =>
    set({ activeConversation: conv, messages: [], typingUserId: null }),

  setMessages: (msgs) => set({ messages: msgs }),

  // Evita duplicados (WS + REST pueden solaparse)
  appendMessage: (msg) => {
    const prev = get().messages
    if (prev.some((m) => m.messageId === msg.messageId)) return
    set({ messages: [...prev, msg] })
  },

  setTypingUserId: (id) => set({ typingUserId: id }),
}))