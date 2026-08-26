import { useState, useEffect, useRef, useCallback } from "react";
import { messageService } from "@/services";
import { useChatStore } from "@/store/chatstore";

interface UseMessagesReturn {
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
}

export function useMessages(conversationId: number | null): UseMessagesReturn {
  const setMessages = useChatStore((s) => s.setMessages);
  const prependMessages = useChatStore((s) => s.prependMessages);

  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const cursorRef = useRef<number | null>(null);
  const conversationIdRef = useRef(conversationId);
  const setMessagesRef = useRef(setMessages);
  const prependRef = useRef(prependMessages);

  useEffect(() => {
    conversationIdRef.current = conversationId;
  }, [conversationId]);
  useEffect(() => {
    setMessagesRef.current = setMessages;
  }, [setMessages]);
  useEffect(() => {
    prependRef.current = prependMessages;
  }, [prependMessages]);

  const fetchPageRef = useRef(
    async (beforeId: number | null, opts: { reset: boolean }) => {
      const convId = conversationIdRef.current;
      if (!convId) return;
      try {
        if (opts.reset) setIsLoading(true); else setIsLoadingMore(true);
        setError(null);
        const result = await messageService.list(convId, beforeId, 30);
        const sorted = [...result.content].reverse();
        if (opts.reset) setMessagesRef.current(sorted);
        else prependRef.current(sorted);
        cursorRef.current = result.nextCursor;
        setHasMore(result.hasMore);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Error al cargar mensajes");
      } finally {
        if (opts.reset) setIsLoading(false); else setIsLoadingMore(false);
      }
    },
  );

  useEffect(() => {
    if (!conversationId) return;
    cursorRef.current = null;
    fetchPageRef.current(null, { reset: true });
  }, [conversationId]);

  const loadMore = useCallback(() => {
    if (!hasMore || isLoading || isLoadingMore) return;
    fetchPageRef.current(cursorRef.current, { reset: false });
  }, [hasMore, isLoading, isLoadingMore]);

  return { isLoading, isLoadingMore, error, hasMore, loadMore };
}
