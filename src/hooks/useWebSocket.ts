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
    if (!conversationId || !token) {
      console.log("[useWebSocket] Sin conversationId o token, no suscribir");
      return;
    }

    console.log(
      `[useWebSocket] Preparando suscripción para conversación ${conversationId}, isConnected=${wsService.isConnected}`,
    );

    const subscribe = () => {
      console.log(
        `[useWebSocket] Ejecutando subscribe() para conversación ${conversationId}`,
      );
      wsService.subscribeToConversation(conversationId, (msg) => {
        console.log("[useWebSocket] onMessage callback ejecutado:", msg);
        onMessageRef.current?.(msg);
      });
      wsService.subscribeToTyping(conversationId, (evt) => {
        onTypingRef.current?.(evt);
      });
      wsService.subscribeToReadReceipts(conversationId, (evt) => {
        onReadReceiptRef.current?.(evt);
      });
    };

    if (wsService.isConnected) {
      subscribe();
    } else {
      console.log(
        "[useWebSocket] No conectado, llamando connect() con callback",
      );
      wsService.connect(token, subscribe);
    }

    return () => {
      console.log(`[useWebSocket] CLEANUP conversación ${conversationId}`);
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
