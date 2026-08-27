import { Client, type StompSubscription, type IMessage } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import type {
  MessageResponse,
  WsOutboundMessage,
  TypingEvent,
  ReadReceiptEvent,
  PresenceEvent,
  WsInboundMessage,
} from "@/types";

const WS_URL =
  import.meta.env.VITE_WS_URL ??
  (import.meta.env.VITE_API_URL ?? "http://localhost:8080") + "/ws";

// Convierte el shape del backend → shape que usa el frontend
export function normalizeWsMessage(raw: WsOutboundMessage): MessageResponse {
  return {
    messageId: raw.messageId,
    conversationId: raw.conversationId,
    senderId: raw.senderId,
    receiverId: raw.receiverId,
    type: raw.type,
    textContent: raw.textContent,
    payload: raw.payload,
    payloadType: raw.payloadType,
    fileUrls: raw.fileUrls ?? [],
    status: raw.status,
    sentAt: raw.sentAt,
    readAt: null,
    deleted: raw.deleted,
    editedAt: raw.editedAt,
  };
}

// eventType: "MESSAGE_RECEIVED" (mensaje nuevo) | "MESSAGE_UPDATED" (editado o borrado — mismo messageId)
type MessageHandler = (msg: MessageResponse, eventType: string) => void;
type TypingHandler = (evt: TypingEvent) => void;
type ReadHandler = (evt: ReadReceiptEvent) => void;
type PresenceHandler = (evt: PresenceEvent) => void;

class WebSocketService {
  private client: Client | null = null;
  private subscriptions: Map<string, StompSubscription> = new Map();
  private onConnectQueue: Array<() => void> = [];
  private reconnectListeners: Set<() => void> = new Set();
  private hasConnectedBefore = false;

  connect(token: string, onReady?: () => void): void {
    if (this.client?.connected) {
      onReady?.();
      return;
    }
    if (onReady) this.onConnectQueue.push(onReady);
    if (this.client) return; // ya activándose

    this.client = new Client({
      webSocketFactory: () => new SockJS(WS_URL) as WebSocket,
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 5_000,
      heartbeatIncoming: 10_000,
      heartbeatOutgoing: 10_000,
      onConnect: () => {
        const queue = [...this.onConnectQueue];
        this.onConnectQueue = [];
        queue.forEach((fn) => fn());

        // onConnect también dispara en cada reconexión automática (reconnectDelay) —
        // a partir de la segunda vez, avisamos a quien quiera hacer catch-up
        // (ver useMessages) de lo que se perdió mientras el socket estaba caído.
        if (this.hasConnectedBefore) {
          this.reconnectListeners.forEach((fn) => fn());
        }
        this.hasConnectedBefore = true;
      },
      onStompError: (f) =>
        console.error("[WS] Error STOMP:", f.headers["message"]),
      onDisconnect: () => {
        this.subscriptions.clear();
      },
      onWebSocketError: (e) => console.error("[WS] Error WebSocket:", e),
    });
    this.client.activate();
  }

  disconnect(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
    this.subscriptions.clear();
    this.onConnectQueue = [];
    this.client?.deactivate();
    this.client = null;
    this.hasConnectedBefore = false; // logout real: la próxima conexión vuelve a ser "la primera"
  }

  /** Se dispara en cada RE-conexión (no en la primera) — usar para "catch-up" tras una caída de red. Devuelve una función para des-registrar. */
  onReconnect(fn: () => void): () => void {
    this.reconnectListeners.add(fn);
    return () => this.reconnectListeners.delete(fn);
  }

  get isConnected(): boolean {
    return this.client?.connected ?? false;
  }

  private _subscribe(dest: string, handler: (f: IMessage) => void): void {
    if (!this.client?.connected) return;
    const existing = this.subscriptions.get(dest);
    if (existing) {
      existing.unsubscribe();
      this.subscriptions.delete(dest);
    }
    this.subscriptions.set(dest, this.client.subscribe(dest, handler));
  }

  unsubscribe(dest: string): void {
    const sub = this.subscriptions.get(dest);
    if (sub) {
      sub.unsubscribe();
      this.subscriptions.delete(dest);
    }
  }

  private _publish(dest: string, body: object): void {
    if (!this.client?.connected) return;
    this.client.publish({ destination: dest, body: JSON.stringify(body) });
  }

  // Deserializa como WsOutboundMessage y normaliza a MessageResponse
  subscribeToConversation(id: number, handler: MessageHandler): void {
    this._subscribe(`/topic/conversation.${id}`, (f) => {
      const raw = JSON.parse(f.body) as WsOutboundMessage;
      handler(normalizeWsMessage(raw), raw.eventType);
    });
  }
  unsubscribeFromConversation(id: number): void {
    this.unsubscribe(`/topic/conversation.${id}`);
  }

  subscribeToTyping(id: number, handler: TypingHandler): void {
    this._subscribe(`/topic/typing.${id}`, (f) =>
      handler(JSON.parse(f.body) as TypingEvent),
    );
  }
  unsubscribeFromTyping(id: number): void {
    this.unsubscribe(`/topic/typing.${id}`);
  }

  subscribeToReadReceipts(id: number, handler: ReadHandler): void {
    this._subscribe(`/topic/read.${id}`, (f) =>
      handler(JSON.parse(f.body) as ReadReceiptEvent),
    );
  }
  unsubscribeFromReadReceipts(id: number): void {
    this.unsubscribe(`/topic/read.${id}`);
  }

  subscribeToPresence(userId: number, handler: PresenceHandler): void {
    this._subscribe(`/topic/presence.${userId}`, (f) =>
      handler(JSON.parse(f.body)),
    );
  }
  unsubscribeFromPresence(userId: number): void {
    this.unsubscribe(`/topic/presence.${userId}`);
  }

  subscribeToNotifications(handler: (data: unknown) => void): void {
    this._subscribe("/user/queue/notifications", (f) =>
      handler(JSON.parse(f.body)),
    );
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
