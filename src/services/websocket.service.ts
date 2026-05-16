import { Client, type StompSubscription, type IMessage } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import type {
  MessageResponse,
  TypingEvent,
  ReadReceiptEvent,
  PresenceEvent,
  WsInboundMessage,
} from "@/types";

// ─────────────────────────────────────────────────────────────────────────────
//  ★  URL DEL WEBSOCKET — lee de .env (VITE_WS_URL) o usa fallback
// ─────────────────────────────────────────────────────────────────────────────
const WS_URL =
  import.meta.env.VITE_WS_URL ??
  (import.meta.env.VITE_API_URL ?? "http://localhost:8080") + "/ws";

type MessageHandler = (msg: MessageResponse) => void;
type TypingHandler = (evt: TypingEvent) => void;
type ReadHandler = (evt: ReadReceiptEvent) => void;
type PresenceHandler = (evt: PresenceEvent) => void;

/*
 * ── Destinos de SUSCRIPCIÓN (servidor → cliente) ──────────────────────────
 *   /topic/conversation.{id}   → mensajes nuevos
 *   /topic/typing.{id}         → "está escribiendo"
 *   /topic/read.{id}           → confirmaciones de lectura
 *   /topic/presence.{userId}   → presencia online/offline
 *   /user/queue/notifications  → notificaciones personales
 *
 * ── Destinos de PUBLICACIÓN (cliente → servidor, prefijo /app) ────────────
 *   /app/chat.send             → enviar mensaje
 *   /app/chat.typing           → indicar escribiendo
 *   /app/chat.read             → marcar como leído
 *   /app/heartbeat             → renovar presencia
 */
class WebSocketService {
  private client: Client | null = null;
  private subscriptions: Map<string, StompSubscription> = new Map();

  connect(token: string, onConnect?: () => void): void {
    if (this.client?.connected) return;

    this.client = new Client({
      webSocketFactory: () => new SockJS(WS_URL) as WebSocket,
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 5_000,
      heartbeatIncoming: 10_000,
      heartbeatOutgoing: 10_000,
      onConnect: () => {
        console.log("[WS] Conectado");
        onConnect?.();
      },
      onStompError: (f) =>
        console.error("[WS] Error STOMP:", f.headers["message"]),
      onDisconnect: () => console.log("[WS] Desconectado"),
      onWebSocketError: (e) => console.error("[WS] Error WebSocket:", e),
    });
    this.client.activate();
  }

  disconnect(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
    this.subscriptions.clear();
    this.client?.deactivate();
    this.client = null;
  }

  get isConnected(): boolean {
    return this.client?.connected ?? false;
  }

  // ── Suscripciones ──────────────────────────────────────────────────────────
  subscribeToConversation(id: number, handler: MessageHandler): void {
    this._subscribe(`/topic/conversation.${id}`, (f) =>
      handler(JSON.parse(f.body)),
    );
  }
  subscribeToTyping(id: number, handler: TypingHandler): void {
    this._subscribe(`/topic/typing.${id}`, (f) => handler(JSON.parse(f.body)));
  }
  subscribeToReadReceipts(id: number, handler: ReadHandler): void {
    this._subscribe(`/topic/read.${id}`, (f) => handler(JSON.parse(f.body)));
  }
  subscribeToPresence(userId: number, handler: PresenceHandler): void {
    this._subscribe(`/topic/presence.${userId}`, (f) =>
      handler(JSON.parse(f.body)),
    );
  }
  subscribeToNotifications(handler: (data: unknown) => void): void {
    this._subscribe("/user/queue/notifications", (f) =>
      handler(JSON.parse(f.body)),
    );
  }

  // ── Publicaciones ──────────────────────────────────────────────────────────
  sendMessage(payload: WsInboundMessage): void {
    this._publish("/app/chat.send", payload);
  }
  sendTyping(conversationId: number, typing: boolean): void {
    this._publish("/app/chat.typing", { conversationId, typing });
  }
  sendRead(conversationId: number): void {
    this._publish("/app/chat.read", { conversationId });
  }
  sendHeartbeat(): void {
    this._publish("/app/heartbeat", {});
  }

  private _subscribe(dest: string, handler: (f: IMessage) => void): void {
    if (!this.client?.connected) {
      console.warn("[WS] Sin conexión:", dest);
      return;
    }
    if (this.subscriptions.has(dest)) return;
    this.subscriptions.set(dest, this.client.subscribe(dest, handler));
  }
  private _publish(dest: string, body: object): void {
    if (!this.client?.connected) {
      console.warn("[WS] Sin conexión:", dest);
      return;
    }
    this.client.publish({ destination: dest, body: JSON.stringify(body) });
  }
}

// Singleton global
export const wsService = new WebSocketService();
