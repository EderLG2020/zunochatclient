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

// No reenviar "typing:true" más seguido que esto mientras la persona sigue
// escribiendo — sin este throttle, cada tecla presionada mandaba un publish
// WS aparte (una oración tipeada rápido disparaba decenas de mensajes/
// broadcasts innecesarios; el otro lado solo necesita saber "sigue
// escribiendo" cada tanto, no en cada letra).
const TYPING_RESEND_THROTTLE_MS = 2_000;
// Tras esta pausa sin tipear, se manda el "false" explícito.
const TYPING_STOP_DELAY_MS = 2_000;

export function useTypingIndicator(conversationId: number | null) {
  const stopTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSentAtRef = useRef(0);

  const sendTyping = useCallback(() => {
    if (!conversationId) return;

    const now = Date.now();
    if (now - lastSentAtRef.current >= TYPING_RESEND_THROTTLE_MS) {
      wsService.sendTyping(conversationId, true);
      lastSentAtRef.current = now;
    }

    // El aviso de "dejó de escribir" sí se reprograma en cada tecla — es
    // puramente local (un solo setTimeout, sin red) y determina cuándo el
    // otro lado deja de ver el indicador.
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    stopTimerRef.current = setTimeout(() => {
      wsService.sendTyping(conversationId, false);
      lastSentAtRef.current = 0;
    }, TYPING_STOP_DELAY_MS);
  }, [conversationId]);

  useEffect(
    () => () => {
      if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    },
    [],
  );

  return { sendTyping };
}
