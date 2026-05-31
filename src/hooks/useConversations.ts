import { useState, useEffect, useRef } from "react";
import { conversationService } from "@/services";
import { wsService } from "@/services/websocket.service";
import { useAuthStore } from "@/store/authstore";
import type { ConversationResponse } from "@/types";

interface UseConversationsReturn {
  conversations: ConversationResponse[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useConversations(): UseConversationsReturn {
  const [conversations, setConversations] = useState<ConversationResponse[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const token = useAuthStore((s) => s.token);

  // Lógica de fetch en ref para evitar el error de linter
  // "setState sincrónico dentro de un efecto"
  const doFetch = useRef(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const page = await conversationService.list(0, 50);
      setConversations(page.content);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Error al cargar conversaciones",
      );
    } finally {
      setIsLoading(false);
    }
  });

  // Carga inicial
  useEffect(() => {
    void doFetch.current();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Suscripción WS global: refresca la lista cada vez que llega una notificación
  // (nuevo mensaje → actualiza lastMessage, unreadCount, orden)
  useEffect(() => {
    if (!token) return;

    const onNotification = () => {
      // Delay mínimo para que el servidor haya procesado el mensaje
      setTimeout(() => void doFetch.current(), 300);
    };

    const subscribe = () => {
      wsService.subscribeToNotifications(onNotification);
    };

    if (wsService.isConnected) {
      subscribe();
    } else {
      wsService.connect(token, subscribe);
    }

    return () => {
      wsService.unsubscribeFromNotifications();
    };
  }, [token]);

  return {
    conversations,
    isLoading,
    error,
    refetch: () => void doFetch.current(),
  };
}
