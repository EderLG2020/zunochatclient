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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Notificación WS → refetch silencioso (sin flash de spinner ni isLoading=true)
  useEffect(() => {
    if (!token) return;

    const onNotification = () => {
      // Delay mínimo para que el backend haya persistido el cambio
      setTimeout(() => void doFetch.current(true), 300);
    };

    const subscribe = () => wsService.subscribeToNotifications(onNotification);

    if (wsService.isConnected) subscribe();
    else wsService.connect(token, subscribe);

    return () => {
      wsService.unsubscribeFromNotifications();
    };
  }, [token]);

  return {
    conversations,
    isLoading,
    error,
    refetch: () => void doFetch.current(false),
  };
}
