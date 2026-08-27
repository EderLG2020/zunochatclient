import { useState, useEffect, useRef, useCallback } from "react";
import { messageService } from "@/services";
import { wsService } from "@/services/websocket.service";
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
  const appendMessage = useChatStore((s) => s.appendMessage);

  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const cursorRef = useRef<number | null>(null);
  const conversationIdRef = useRef(conversationId);
  const setMessagesRef = useRef(setMessages);
  const prependRef = useRef(prependMessages);
  const appendRef = useRef(appendMessage);

  useEffect(() => {
    conversationIdRef.current = conversationId;
  }, [conversationId]);
  useEffect(() => {
    setMessagesRef.current = setMessages;
  }, [setMessages]);
  useEffect(() => {
    prependRef.current = prependMessages;
  }, [prependMessages]);
  useEffect(() => {
    appendRef.current = appendMessage;
  }, [appendMessage]);

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

  // Catch-up: si el WS se cayó y volvió a conectar (red inestable, laptop
  // suspendida, etc.), un mensaje enviado por el otro lado durante ese lapso
  // nunca llega por WS — sin esto, solo aparecía si el usuario salía del
  // chat y volvía a entrar (lo que forzaba el fetch inicial de arriba).
  // Se pide la página más reciente y se agregan solo los mensajes que el
  // store todavía no tiene (appendMessage ya deduplica por messageId).
  useEffect(() => {
    return wsService.onReconnect(() => {
      const convId = conversationIdRef.current;
      if (!convId) return;
      messageService
        .list(convId, null, 30)
        .then((result) => {
          [...result.content].reverse().forEach((m) => appendRef.current(m));
        })
        .catch(() => {/* catch-up es best-effort, no bloquea la UI si falla */});
    });
  }, []);

  const loadMore = useCallback(() => {
    if (!hasMore || isLoading || isLoadingMore) return;
    fetchPageRef.current(cursorRef.current, { reset: false });
  }, [hasMore, isLoading, isLoadingMore]);

  return { isLoading, isLoadingMore, error, hasMore, loadMore };
}
