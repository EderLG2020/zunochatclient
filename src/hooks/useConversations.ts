import { useState, useEffect, useCallback } from "react";
import { conversationService } from "@/services";
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

  const fetchConversations = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  return { conversations, isLoading, error, refetch: fetchConversations };
}
