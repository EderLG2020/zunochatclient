import { Client, type StompSubscription, type IMessage } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import type {
  MessageResponse,
  TypingEvent,
  ReadReceiptEvent,
  PresenceEvent,
  WsInboundMessage,
} from "@/types";

const WS_URL =
  import.meta.env.VITE_WS_URL ??
  (import.meta.env.VITE_API_URL ?? "http://localhost:8080") + "/ws";

type MessageHandler = (msg: MessageResponse) => void;
type TypingHandler = (evt: TypingEvent) => void;
type ReadHandler = (evt: ReadReceiptEvent) => void;
type PresenceHandler = (evt: PresenceEvent) => void;

class WebSocketService {
  private client: Client | null = null;
  private subscriptions: Map<string, StompSubscription> = new Map();
  private onConnectQueue: Array<() => void> = [];

  connect(token: string, onReady?: () => void): void {
    if (this.client?.connected) {
      console.log(
        "[WS] connect() → ya conectado, ejecutando onReady inmediatamente",
      );
      onReady?.();
      return;
    }
    if (onReady) {
      console.log("[WS] connect() → encolando onReady");
      this.onConnectQueue.push(onReady);
    }
    if (this.client) {
      console.log("[WS] connect() → cliente activándose, esperando...");
      return;
    }

    console.log("[WS] connect() → creando cliente STOMP, URL:", WS_URL);
    this.client = new Client({
      webSocketFactory: () => new SockJS(WS_URL) as WebSocket,
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 5_000,
      heartbeatIncoming: 10_000,
      heartbeatOutgoing: 10_000,
      onConnect: () => {
        console.log(
          `[WS] ✅ CONECTADO — ejecutando ${this.onConnectQueue.length} callbacks pendientes`,
        );
        const queue = [...this.onConnectQueue];
        this.onConnectQueue = [];
        queue.forEach((fn) => fn());
      },
      onStompError: (f) =>
        console.error("[WS] ❌ Error STOMP:", f.headers["message"]),
      onDisconnect: () => {
        console.log("[WS] ⚠️ Desconectado");
        this.subscriptions.clear();
      },
      onWebSocketError: (e) => console.error("[WS] ❌ Error WebSocket:", e),
    });
    this.client.activate();
  }

  disconnect(): void {
    console.log("[WS] disconnect()");
    this.subscriptions.forEach((sub) => sub.unsubscribe());
    this.subscriptions.clear();
    this.onConnectQueue = [];
    this.client?.deactivate();
    this.client = null;
  }

  get isConnected(): boolean {
    return this.client?.connected ?? false;
  }

  private _subscribe(dest: string, handler: (f: IMessage) => void): void {
    if (!this.client?.connected) {
      console.warn("[WS] ⚠️ Sin conexión para suscribir:", dest);
      return;
    }
    const existing = this.subscriptions.get(dest);
    if (existing) {
      console.log("[WS] Reemplazando suscripción:", dest);
      existing.unsubscribe();
      this.subscriptions.delete(dest);
    }
    console.log("[WS] ✅ Suscrito a:", dest);
    this.subscriptions.set(dest, this.client.subscribe(dest, handler));
  }

  unsubscribe(dest: string): void {
    const sub = this.subscriptions.get(dest);
    if (sub) {
      console.log("[WS] 🔕 Desuscrito de:", dest);
      sub.unsubscribe();
      this.subscriptions.delete(dest);
    }
  }

  private _publish(dest: string, body: object): void {
    if (!this.client?.connected) {
      console.warn("[WS] ⚠️ Sin conexión para publicar:", dest);
      return;
    }
    this.client.publish({ destination: dest, body: JSON.stringify(body) });
  }

  subscribeToConversation(id: number, handler: MessageHandler): void {
    this._subscribe(`/topic/conversation.${id}`, (f) => {
      const msg = JSON.parse(f.body) as MessageResponse;
      console.log(`[WS] 📨 Mensaje en /topic/conversation.${id}:`, msg);
      handler(msg);
    });
  }
  unsubscribeFromConversation(id: number): void {
    this.unsubscribe(`/topic/conversation.${id}`);
  }

  subscribeToTyping(id: number, handler: TypingHandler): void {
    this._subscribe(`/topic/typing.${id}`, (f) => handler(JSON.parse(f.body)));
  }
  unsubscribeFromTyping(id: number): void {
    this.unsubscribe(`/topic/typing.${id}`);
  }

  subscribeToReadReceipts(id: number, handler: ReadHandler): void {
    this._subscribe(`/topic/read.${id}`, (f) => handler(JSON.parse(f.body)));
  }
  unsubscribeFromReadReceipts(id: number): void {
    this.unsubscribe(`/topic/read.${id}`);
  }

  subscribeToPresence(userId: number, handler: PresenceHandler): void {
    this._subscribe(`/topic/presence.${userId}`, (f) =>
      handler(JSON.parse(f.body)),
    );
  }

  subscribeToNotifications(handler: (data: unknown) => void): void {
    this._subscribe("/user/queue/notifications", (f) => {
      const data = JSON.parse(f.body);
      console.log("[WS] 🔔 Notificación recibida:", data);
      handler(data);
    });
  }
  unsubscribeFromNotifications(): void {
    this.unsubscribe("/user/queue/notifications");
  }

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
}

export const wsService = new WebSocketService();
