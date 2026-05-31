import { useState, useEffect, useRef, useCallback } from "react";
import { messageService } from "@/services";
import { useChatStore } from "@/store/chatstore";

interface UseMessagesReturn {
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
}

export function useMessages(conversationId: number | null): UseMessagesReturn {
  const setMessages = useChatStore((s) => s.setMessages);
  const prependMessages = useChatStore((s) => s.prependMessages);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const pageRef = useRef(0);
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

  const fetchPageRef = useRef(async (pageNum: number, reset = false) => {
    const convId = conversationIdRef.current;
    if (!convId) return;
    try {
      setIsLoading(true);
      setError(null);
      const result = await messageService.list(convId, pageNum, 30);
      const sorted = [...result.content].reverse();
      if (reset) setMessagesRef.current(sorted);
      else prependRef.current(sorted);
      setHasMore(!result.last);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al cargar mensajes");
    } finally {
      setIsLoading(false);
    }
  });

  useEffect(() => {
    if (!conversationId) return;
    pageRef.current = 0;
    fetchPageRef.current(0, true);
  }, [conversationId]);

  const loadMore = useCallback(() => {
    if (!hasMore || isLoading) return;
    const next = pageRef.current + 1;
    pageRef.current = next;
    fetchPageRef.current(next, false);
  }, [hasMore, isLoading]);

  return { isLoading, error, hasMore, loadMore };
}
