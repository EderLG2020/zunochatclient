import { useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout }        from "@/components/layout/AppLayout";
import { ConversationItem } from "@/components/chat/ConversationItem";
import { UserSearch }       from "@/components/chat/UserSearch";
import { MessageBubble }    from "@/components/chat/MessageBubble";
import { MessageInput }     from "@/components/chat/MessageInput";
import { Spinner }          from "@/components/ui/Spinner";
import { ErrorMessage }     from "@/components/ui/ErrorMessage";
import { useAuthStore }     from "@/store/authstore";
import { useChatStore }     from "@/store/chatstore";
import { useConversations } from "@/hooks/useConversations";
import { useMessages }      from "@/hooks/useMessages";
import { useWebSocket }     from "@/hooks/useWebSocket";
import { messageService }   from "@/services";
import type { ConversationResponse, MessageResponse, TypingEvent, ReadReceiptEvent } from "@/types";

function getUserIdFromToken(): number | null {
  try {
    const raw = localStorage.getItem("auth-storage");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const token: string | null = parsed?.state?.token ?? null;
    if (!token) return null;
    const payload = JSON.parse(atob(token.split(".")[1]));
    return typeof payload.userId === "number" ? payload.userId : null;
  } catch {
    return null;
  }
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function ConversationsSidebar() {
  const user                  = useAuthStore((s) => s.user);
  const logout                = useAuthStore((s) => s.logout);
  const activeConversation    = useChatStore((s) => s.activeConversation);
  const setActiveConversation = useChatStore((s) => s.setActiveConversation);
  const { conversations, isLoading, error, refetch } = useConversations();
  const navigate = useNavigate();

  const handleConversationReady = (conv: ConversationResponse) => {
    setActiveConversation(conv);
    const exists = conversations.some((c) => c.conversationId === conv.conversationId);
    if (!exists) refetch();
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">{user?.username}</p>
          <p className="text-xs text-gray-400">{user?.role}</p>
        </div>
        <button
          onClick={() => { logout(); navigate("/login", { replace: true }); }}
          title="Cerrar sesión"
          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
            strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
          </svg>
        </button>
      </div>

      <UserSearch onConversationReady={handleConversationReady} />

      <div className="flex-1 overflow-y-auto">
        {isLoading && <div className="flex justify-center py-8"><Spinner /></div>}
        {error && <ErrorMessage message={error} onRetry={refetch} />}
        {!isLoading && !error && conversations.length === 0 && (
          <p className="py-8 text-center text-sm text-gray-400">No tienes conversaciones aún</p>
        )}
        {conversations.map((conv) => (
          <ConversationItem
            key={conv.conversationId}
            conversation={conv}
            isActive={activeConversation?.conversationId === conv.conversationId}
            onClick={() => setActiveConversation(conv)}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Panel de chat activo ─────────────────────────────────────────────────────
function ActiveChat() {
  const activeConversation = useChatStore((s) => s.activeConversation);
  const messages           = useChatStore((s) => s.messages);
  const appendMessage      = useChatStore((s) => s.appendMessage);
  const markMessagesAsRead = useChatStore((s) => s.markMessagesAsRead);
  const typingUserId       = useChatStore((s) => s.typingUserId);
  const setTypingUserId    = useChatStore((s) => s.setTypingUserId);

  const { isLoading, error, hasMore, loadMore } = useMessages(
    activeConversation?.conversationId ?? null
  );
  const currentUserId = getUserIdFromToken();
  const bottomRef = useRef<HTMLDivElement>(null);

  // Refs estables para callbacks WS (evitan re-suscripciones innecesarias)
  const appendMessageRef   = useRef(appendMessage);
  const markReadRef        = useRef(markMessagesAsRead);
  const setTypingRef       = useRef(setTypingUserId);
  const currentUserIdRef   = useRef(currentUserId);
  const activeConvRef      = useRef(activeConversation);
  useEffect(() => { appendMessageRef.current   = appendMessage;       }, [appendMessage]);
  useEffect(() => { markReadRef.current        = markMessagesAsRead;  }, [markMessagesAsRead]);
  useEffect(() => { setTypingRef.current       = setTypingUserId;     }, [setTypingUserId]);
  useEffect(() => { currentUserIdRef.current   = currentUserId;       }, [currentUserId]);
  useEffect(() => { activeConvRef.current      = activeConversation;  }, [activeConversation]);

  // Mensaje nuevo por WS — ya llega normalizado como MessageResponse
  const handleWsMessage = useCallback((msg: MessageResponse) => {
    appendMessageRef.current(msg);
  }, []);

  // Typing: el backend envía { userId, username, typing }
  // Filtrar el propio usuario para no mostrar "escribiendo" a uno mismo
  const handleTyping = useCallback((evt: TypingEvent) => {
    if (evt.userId === currentUserIdRef.current) return;
    setTypingRef.current(evt.typing ? evt.userId : null);
    // Auto-limpiar tras 3s por si el backend no envía el false
    if (evt.typing) setTimeout(() => setTypingRef.current(null), 3_000);
  }, []);

  // Read receipt: actualiza el status de los mensajes en el store
  // y dispara un refetch silencioso del sidebar (el unreadCount cambia en BD)
  const handleReadReceipt = useCallback((evt: ReadReceiptEvent) => {
    const convId = activeConvRef.current?.conversationId;
    if (!convId) return;
    markReadRef.current(convId, evt.readByUserId);
  }, []);

  useWebSocket({
    conversationId: activeConversation?.conversationId ?? null,
    onMessage:      handleWsMessage,
    onTyping:       handleTyping,
    onReadReceipt:  handleReadReceipt,
  });

  // Scroll al último mensaje
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Marcar como leído al abrir conversación
  useEffect(() => {
    if (!activeConversation) return;
    messageService
      .markRead({ conversationId: activeConversation.conversationId })
      .catch(() => {/* no crítico */});
  }, [activeConversation?.conversationId]);

  const handleSend = async (text: string) => {
    if (!activeConversation) return;
    const msg = await messageService.send({
      conversationId: activeConversation.conversationId,
      type: "TEXT",
      textContent: text,
    });
    // Agregar optimistamente — el WS también lo trae pero el store deduplica
    appendMessage(msg);
  };

  if (!activeConversation) {
    return (
      <div className="flex flex-1 items-center justify-center bg-gray-50">
        <div className="text-center text-gray-400">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
            strokeWidth={1} stroke="currentColor" className="mx-auto mb-3 h-12 w-12 opacity-40">
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
          </svg>
          <p className="text-sm">Selecciona una conversación para comenzar</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-sm font-semibold text-white">
          {activeConversation.otherUsername.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">{activeConversation.otherUsername}</p>
          <p className="text-xs text-gray-400">
            {typingUserId ? (
              <span className="text-blue-500">Escribiendo...</span>
            ) : activeConversation.status === "ONLINE" ? (
              "En línea"
            ) : (
              "Desconectado"
            )}
          </p>
        </div>
      </div>

      {/* Mensajes */}
      <div className="flex-1 overflow-y-auto bg-gray-50 px-4 py-3">
        {hasMore && (
          <div className="mb-3 flex justify-center">
            <button onClick={loadMore} disabled={isLoading}
              className="text-xs text-blue-500 hover:underline disabled:opacity-50">
              {isLoading ? "Cargando..." : "Cargar mensajes anteriores"}
            </button>
          </div>
        )}
        {isLoading && messages.length === 0 && (
          <div className="flex justify-center py-8"><Spinner /></div>
        )}
        {error && <ErrorMessage message={error} />}

        {messages.map((msg) => (
          <MessageBubble key={msg.messageId} message={msg} currentUserId={currentUserId ?? 0} />
        ))}

        {/* Indicador de typing con los 3 puntos */}
        {typingUserId && (
          <div className="flex items-center gap-1 ml-1 mt-1 mb-1">
            <span className="inline-flex gap-0.5">
              {[0, 150, 300].map((delay) => (
                <span key={delay}
                  className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400"
                  style={{ animationDelay: `${delay}ms` }} />
              ))}
            </span>
            <span className="text-xs text-gray-400">escribiendo</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <MessageInput conversationId={activeConversation.conversationId} onSend={handleSend} />
    </div>
  );
}

export function ChatPage() {
  return <AppLayout sidebar={<ConversationsSidebar />} main={<ActiveChat />} />;
}