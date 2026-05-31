// Enums
export type MessageType = "TEXT" | "PAYLOAD" | "FILE" | "IMAGE";
export type MessageStatus = "SENT" | "DELIVERED" | "READ";
export type PayloadType = "SALES" | "SYSTEM" | "SURVEY" | "CARD";
export type ConversationStatus = "ONLINE" | "TYPING" | "OFFLINE" | "AWAY";

// Auth
export interface LoginRequest {
  identifier: string;
  password: string;
}
export interface RegisterRequest {
  dni: string;
  username: string;
  email: string;
  password: string;
}
export interface VerifyOtpRequest {
  email: string;
  otpCode: string;
}
export interface AuthResponse {
  token: string;
  tokenType: string;
  username: string;
  email: string;
  role: string;
  permissions: string[];
}

// Conversations
export interface ConversationResponse {
  conversationId: number;
  otherUserId: number;
  otherUsername: string;
  otherAvatar: string | null;
  lastMessagePreview: string | null;
  lastMessageIsMine: boolean;
  lastMessageAt: string;
  status: ConversationStatus;
  unreadCount: number;
}
export interface CreateConversationRequest {
  targetUserId: number;
}

// Messages
export interface MessageResponse {
  messageId: number;
  conversationId: number;
  senderId: number;
  receiverId: number;
  type: MessageType;
  textContent: string | null;
  payload: unknown | null;
  payloadType: PayloadType | null;
  fileUrls: string[];
  status: MessageStatus;
  sentAt: string;
  readAt: string | null;
}
export interface SendMessageRequest {
  conversationId: number;
  type: MessageType;
  textContent?: string;
  payload?: unknown;
  payloadType?: PayloadType;
  fileUrls?: string[];
}
export interface MarkReadRequest {
  conversationId: number;
}

// Envelope genérico
export interface ApiResponse<T> {
  code: string;
  message: string;
  data: T;
}
export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  last: boolean;
  first: boolean;
}

// WebSocket — entrante (cliente → servidor)
export interface WsInboundMessage {
  conversationId: number;
  type: MessageType;
  textContent?: string;
  payload?: unknown;
  payloadType?: PayloadType;
  fileUrls?: string[];
}

// WebSocket — WsOutboundMessage (backend → /topic/conversation.{id})
export interface WsOutboundMessage {
  eventType: string; // "MESSAGE_RECEIVED"
  messageId: number;
  conversationId: number;
  senderId: number;
  senderUsername: string;
  receiverId: number;
  type: MessageType;
  textContent: string | null;
  payload: unknown | null;
  payloadType: PayloadType | null;
  fileUrls: string[];
  status: MessageStatus;
  sentAt: string;
}

// WebSocket — eventos de control (shapes exactos del backend)
export interface TypingEvent {
  conversationId: number;
  userId: number; // ← backend envía "userId", NO "senderId"
  username: string;
  typing: boolean;
}
export interface ReadReceiptEvent {
  conversationId: number;
  readByUserId: number; // ← backend envía "readByUserId"
  readByUsername: string;
  readAt: string;
}
export interface PresenceEvent {
  userId: number;
  username: string;
  online: boolean;
  lastSeen: string | null;
}
