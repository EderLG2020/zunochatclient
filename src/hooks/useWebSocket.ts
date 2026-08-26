import { useEffect, useRef, useCallback } from "react";
import { wsService } from "@/services/websocket.service";
import type { MessageResponse, TypingEvent, ReadReceiptEvent } from "@/types";
import { useAuthStore } from "@/store/authstore";

interface UseWebSocketOptions {
  conversationId: number | null;
  onMessage?: (msg: MessageResponse, eventType: string) => void;
  onTyping?: (evt: TypingEvent) => void;
  onReadReceipt?: (evt: ReadReceiptEvent) => void;
}

export function useWebSocket({
  conversationId,
  onMessage,
  onTyping,
  onReadReceipt,
}: UseWebSocketOptions): void {
  const token = useAuthStore((s) => s.token);

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

    const subscribe = () => {
      wsService.subscribeToConversation(conversationId, (msg, eventType) => {
        onMessageRef.current?.(msg, eventType);
      });
      wsService.subscribeToTyping(conversationId, (evt) => {
        onTypingRef.current?.(evt);
      });
      wsService.subscribeToReadReceipts(conversationId, (evt) => {
        onReadReceiptRef.current?.(evt);
      });
    };

    if (wsService.isConnected) subscribe();
    else wsService.connect(token, subscribe);

    return () => {
      wsService.unsubscribeFromConversation(conversationId);
      wsService.unsubscribeFromTyping(conversationId);
      wsService.unsubscribeFromReadReceipts(conversationId);
    };
  }, [conversationId, token]);
}

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
