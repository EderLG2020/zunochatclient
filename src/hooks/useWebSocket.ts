import { useEffect, useRef, useCallback } from "react";
import { wsService } from "@/services/websocket.service";
import type { MessageResponse, TypingEvent, ReadReceiptEvent } from "@/types";
import { useAuthStore } from "@/store/authstore";

interface UseWebSocketOptions {
  conversationId: number | null;
  onMessage?: (msg: MessageResponse) => void;
  onTyping?: (evt: TypingEvent) => void;
  onReadReceipt?: (evt: ReadReceiptEvent) => void;
}

// Gestiona suscripciones STOMP para la conversación activa
export function useWebSocket({
  conversationId,
  onMessage,
  onTyping,
  onReadReceipt,
}: UseWebSocketOptions): void {
  const token = useAuthStore((s) => s.token);

  // Refs para no re-suscribir en cada re-render
  const onMessageRef = useRef(onMessage);
  const onTypingRef = useRef(onTyping);
  const onReadReceiptRef = useRef(onReadReceipt);
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);
  useEffect(() => {
    onTypingRef.current = onTyping;
  }, [onTyping]);
  useEffect(() => {
    onReadReceiptRef.current = onReadReceipt;
  }, [onReadReceipt]);

  useEffect(() => {
    if (!conversationId || !token) return;
    if (!wsService.isConnected) wsService.connect(token);

    const t = setTimeout(() => {
      if (onMessageRef.current)
        wsService.subscribeToConversation(conversationId, (msg) =>
          onMessageRef.current?.(msg),
        );
      if (onTypingRef.current)
        wsService.subscribeToTyping(conversationId, (evt) =>
          onTypingRef.current?.(evt),
        );
      if (onReadReceiptRef.current)
        wsService.subscribeToReadReceipts(conversationId, (evt) =>
          onReadReceiptRef.current?.(evt),
        );
    }, 100);

    return () => clearTimeout(t);
  }, [conversationId, token]);
}

// Envía "está escribiendo" con debounce automático de 2 s
export function useTypingIndicator(conversationId: number | null) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sendTyping = useCallback(() => {
    if (!conversationId) return;
    wsService.sendTyping(conversationId, true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(
      () => wsService.sendTyping(conversationId, false),
      2_000,
    );
  }, [conversationId]);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  return { sendTyping };
}
