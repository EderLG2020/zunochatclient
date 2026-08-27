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
export interface ResendOtpRequest {
  email: string;
}
export interface ForgotPasswordRequest {
  email: string;
}
export interface ResetPasswordRequest {
  email: string;
  otpCode: string;
  newPassword: string;
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
  muted: boolean;
}
export interface CreateConversationRequest {
  targetUserId: number;
}
export interface MuteConversationRequest {
  muted: boolean;
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
  deleted: boolean;
  editedAt: string | null;
}
export interface SendMessageRequest {
  conversationId: number;
  type: MessageType;
  textContent?: string;
  payload?: unknown;
  payloadType?: PayloadType;
  fileUrls?: string[];
  /** Ver lib/id.ts — reintentos idempotentes del POST. */
  clientMessageId?: string;
}
export interface MarkReadRequest {
  conversationId: number;
}
export interface EditMessageRequest {
  textContent: string;
}

// Envelope genérico
export interface ApiResponse<T> {
  success: boolean;
  code: string;
  status: number;
  message: string;
  timestamp: string;
  data: T;
  errors?: Record<string, string>;
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
export interface MessageCursorPage {
  content: MessageResponse[];
  hasMore: boolean;
  nextCursor: number | null;
}

// WebSocket — entrante (cliente → servidor)
export interface WsInboundMessage {
  conversationId: number;
  type: MessageType;
  textContent?: string;
  payload?: unknown;
  payloadType?: PayloadType;
  fileUrls?: string[];
  clientMessageId?: string;
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
  deleted: boolean;
  editedAt: string | null;
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

// Bloqueo de usuarios
export interface BlockedUserResponse {
  id: number;
  username: string;
  blockedAt: string;
}

// Panel de administración
export type Role = "USER" | "ADMIN" | "SUPERADMIN";
export type UserStatus = "PENDING_VERIFICATION" | "ACTIVE" | "BANNED" | "INACTIVE" | "DELETED";

export interface AdminUserResponse {
  id: number;
  dni: string;
  username: string;
  email: string;
  role: Role;
  status: UserStatus;
  createdAt: string;
}
export interface AssignRoleRequest {
  role: string;
}
export interface ModerateUserRequest {
  reason?: string;
}
