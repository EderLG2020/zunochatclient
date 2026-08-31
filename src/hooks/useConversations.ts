import { useState, useEffect, useRef } from "react";
import { conversationService } from "@/services";
import { wsService } from "@/services/websocket.service";
import { useAuthStore } from "@/store/authstore";
import { useChatStore } from "@/store/chatstore";
import { getUserIdFromToken } from "@/lib/jwt";
import { buildMessagePreview } from "@/lib/format";
import { playMessageReceivedSound } from "@/lib/notificationSound";
import type { ConversationResponse, WsOutboundMessage } from "@/types";

interface UseConversationsReturn {
  conversations: ConversationResponse[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  markConversationRead: (conversationId: number) => void;
}

export function useConversations(): UseConversationsReturn {
  const [conversations, setConversations] = useState<ConversationResponse[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const token = useAuthStore((s) => s.token);
  const activeConversationId = useChatStore((s) => s.activeConversation?.conversationId ?? null);
  const activeConversationIdRef = useRef(activeConversationId);
  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);

  // Carga inicial — muestra spinner
  const doFetch = useRef(async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      setError(null);
      const page = await conversationService.list(0, 50);
      setConversations(page.content);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Error al cargar conversaciones",
      );
    } finally {
      if (!silent) setIsLoading(false);
    }
  });

  useEffect(() => {
    void doFetch.current(false);
  }, []);

  // Notificación WS de un mensaje nuevo → actualiza esa conversación en memoria
  // (preview, orden, no-leídos) con los datos que ya trae el propio evento,
  // sin volver a pedir la lista completa al backend. Solo si la conversación
  // todavía no existe en el estado local (chat nuevo) hace falta un refetch puntual.
  useEffect(() => {
    if (!token) return;
    const currentUserId = getUserIdFromToken();

    const onNotification = (data: unknown) => {
      const msg = data as WsOutboundMessage;
      if (msg?.eventType !== "MESSAGE_RECEIVED" || typeof msg.conversationId !== "number") return;

      // Se decide DENTRO del updater (tiene el estado previo a mano) pero se
      // reproduce FUERA — el updater de setState puede correr dos veces en
      // desarrollo (React StrictMode) y no debe tener efectos secundarios
      // audibles; acá solo queda una variable que se pisa a sí misma.
      let shouldPlaySound = false;

      setConversations((prev) => {
        const idx = prev.findIndex((c) => c.conversationId === msg.conversationId);
        if (idx === -1) {
          // Conversación que el sidebar todavía no conoce (chat nuevo) — sí requiere datos del servidor
          setTimeout(() => void doFetch.current(true), 300);
          shouldPlaySound = msg.senderId !== currentUserId;
          return prev;
        }

        const current = prev[idx];
        const isMine = msg.senderId === currentUserId;
        const isOpen = activeConversationIdRef.current === msg.conversationId;

        // Solo mensajes ajenos y solo si la conversación no está silenciada —
        // igual criterio que el badge de no leídos, sin importar si el chat
        // está abierto (WhatsApp Web suena igual con la conversación abierta,
        // salvo que esté silenciada).
        shouldPlaySound = !isMine && !current.muted;

        const updated: ConversationResponse = {
          ...current,
          lastMessagePreview: buildMessagePreview(msg.type, msg.textContent, msg.payloadType),
          lastMessageIsMine: isMine,
          lastMessageAt: msg.sentAt,
          unreadCount: isMine || isOpen ? current.unreadCount : current.unreadCount + 1,
        };

        // Sube al tope de la lista, como en WhatsApp
        const rest = prev.filter((_, i) => i !== idx);
        return [updated, ...rest];
      });

      if (shouldPlaySound) playMessageReceivedSound();
    };

    const subscribe = () => wsService.subscribeToNotifications(onNotification);

    if (wsService.isConnected) subscribe();
    else wsService.connect(token, subscribe);

    return () => {
      wsService.unsubscribeFromNotifications();
    };
  }, [token]);

  // El backend ya pone unread_count en 0 al abrir el chat (markRead vía REST
  // en ActiveChat), pero eso solo vuelve al sidebar con un refetch completo.
  // Este patch local es puramente en memoria (sin red) — limpia el badge al
  // instante en vez de esperar a que llegue otro evento o se recargue la página.
  const markConversationRead = (conversationId: number) => {
    setConversations((prev) => {
      const idx = prev.findIndex((c) => c.conversationId === conversationId);
      if (idx === -1 || prev[idx].unreadCount === 0) return prev; // evita re-render innecesario
      const next = [...prev];
      next[idx] = { ...next[idx], unreadCount: 0 };
      return next;
    });
  };

  return {
    conversations,
    isLoading,
    error,
    refetch: () => void doFetch.current(false),
    markConversationRead,
  };
}
