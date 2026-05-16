import { useState, useEffect, useCallback } from "react";
import { messageService } from "@/services";
import type { MessageResponse } from "@/types";

interface UseMessagesReturn {
  messages: MessageResponse[];
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
}

// Los mensajes del backend vienen más recientes primero → este hook los invierte
export function useMessages(conversationId: number | null): UseMessagesReturn {
  const [messages, setMessages] = useState<MessageResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const fetchPage = useCallback(
    async (pageNum: number, reset = false) => {
      if (!conversationId) return;
      try {
        setIsLoading(true);
        setError(null);
        const result = await messageService.list(conversationId, pageNum, 30);
        const sorted = [...result.content].reverse(); // más antiguo arriba
        setMessages((prev) => (reset ? sorted : [...sorted, ...prev]));
        setHasMore(!result.last);
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : "Error al cargar mensajes",
        );
      } finally {
        setIsLoading(false);
      }
    },
    [conversationId],
  );

  // Reset al cambiar de conversación
  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      return;
    }
    setPage(0);
    setHasMore(true);
    fetchPage(0, true);
  }, [conversationId, fetchPage]);

  const loadMore = useCallback(() => {
    if (!hasMore || isLoading) return;
    const next = page + 1;
    setPage(next);
    fetchPage(next);
  }, [hasMore, isLoading, page, fetchPage]);

  return { messages, isLoading, error, hasMore, loadMore };
}
