import { useEffect, useRef, useCallback, useState } from "react";
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
import { useThemeStore }    from "@/store/themeStore";
import { useConversations } from "@/hooks/useConversations";
import { useMessages }      from "@/hooks/useMessages";
import { useWebSocket }     from "@/hooks/useWebSocket";
import { usePresenceSubscriptions, useIsOnline, useHeartbeat } from "@/hooks/usePresence";
import { messageService, conversationService, userService } from "@/services";
import { avatarGradient, dayLabel } from "@/lib/format";
import { getUserIdFromToken } from "@/lib/jwt";
import type { ConversationResponse, MessageResponse, TypingEvent, ReadReceiptEvent } from "@/types";

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function ConversationsSidebar() {
  const user                  = useAuthStore((s) => s.user);
  const logout                = useAuthStore((s) => s.logout);
  const activeConversation    = useChatStore((s) => s.activeConversation);
  const setActiveConversation = useChatStore((s) => s.setActiveConversation);
  const theme                 = useThemeStore((s) => s.theme);
  const toggleTheme           = useThemeStore((s) => s.toggleTheme);
  const { conversations, isLoading, error, refetch } = useConversations();
  const navigate = useNavigate();

  // Presencia en vivo: una suscripción WS por cada conversación visible
  usePresenceSubscriptions(conversations.map((c) => c.otherUserId));
  // Mantiene viva la PROPIA presencia mientras haya sesión, sin depender de
  // que existan conversaciones (ver useHeartbeat).
  useHeartbeat();

  const handleConversationReady = (conv: ConversationResponse) => {
    setActiveConversation(conv);
    const exists = conversations.some((c) => c.conversationId === conv.conversationId);
    if (!exists) refetch();
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-800">
        <div className="flex items-center gap-2.5">
          <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-sm font-semibold text-white ${avatarGradient(user?.username ?? "")}`}>
            {(user?.username ?? "?").charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{user?.username}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">{user?.role}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {(user?.role === "ADMIN" || user?.role === "SUPERADMIN") && (
            <button
              onClick={() => navigate("/admin")}
              title="Panel de administración"
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          )}
          <button
            onClick={toggleTheme}
            title={theme === "dark" ? "Modo claro" : "Modo oscuro"}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          >
            {theme === "dark" ? (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
              </svg>
            )}
          </button>
          <button
            onClick={() => { logout(); navigate("/login", { replace: true }); }}
            title="Cerrar sesión"
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
              strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
            </svg>
          </button>
        </div>
      </div>

      <UserSearch onConversationReady={handleConversationReady} />

      <div className="flex-1 overflow-y-auto">
        {isLoading && <div className="flex justify-center py-8"><Spinner /></div>}
        {error && <ErrorMessage message={error} onRetry={refetch} />}
        {!isLoading && !error && conversations.length === 0 && (
          <p className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">No tienes conversaciones aún</p>
        )}
        {conversations.map((conv) => (
          <ConversationItem
            key={conv.conversationId}
            conversation={conv}
            isActive={activeConversation?.conversationId === conv.conversationId}
            onSelect={setActiveConversation}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Panel de chat activo ─────────────────────────────────────────────────────
function ActiveChat() {
  const activeConversation    = useChatStore((s) => s.activeConversation);
  const setActiveConversation = useChatStore((s) => s.setActiveConversation);
  const messages           = useChatStore((s) => s.messages);
  const appendMessage      = useChatStore((s) => s.appendMessage);
  const updateMessage      = useChatStore((s) => s.updateMessage);
  const markMessagesAsRead = useChatStore((s) => s.markMessagesAsRead);
  const typingUserId       = useChatStore((s) => s.typingUserId);
  const setTypingUserId    = useChatStore((s) => s.setTypingUserId);

  const activeConversationId = activeConversation?.conversationId ?? null;
  const { isLoading, isLoadingMore, error, hasMore, loadMore } = useMessages(activeConversationId);
  const currentUserId = getUserIdFromToken();
  const bottomRef    = useRef<HTMLDivElement>(null);
  const scrollRef    = useRef<HTMLDivElement>(null);
  const topRef       = useRef<HTMLDivElement>(null);

  // Menú de opciones del chat (silenciar / bloquear)
  const [menuOpen, setMenuOpen] = useState(false);
  const [blockedIds, setBlockedIds] = useState<Set<number>>(new Set());
  useEffect(() => {
    userService.listBlocked().then((list) => setBlockedIds(new Set(list.map((b) => b.id)))).catch(() => {});
  }, []);
  const isBlocked = activeConversation ? blockedIds.has(activeConversation.otherUserId) : false;

  const toggleMute = async () => {
    if (!activeConversation) return;
    setMenuOpen(false);
    const updated = await conversationService.setMuted(activeConversation.conversationId, { muted: !activeConversation.muted });
    setActiveConversation(updated);
  };

  const toggleBlock = async () => {
    if (!activeConversation) return;
    setMenuOpen(false);
    const otherId = activeConversation.otherUserId;
    if (isBlocked) {
      await userService.unblock(otherId);
      setBlockedIds((prev) => { const next = new Set(prev); next.delete(otherId); return next; });
    } else {
      if (!confirm(`¿Bloquear a ${activeConversation.otherUsername}? No podrán enviarse mensajes.`)) return;
      await userService.block(otherId);
      setBlockedIds((prev) => new Set(prev).add(otherId));
    }
  };

  // Presencia en vivo del contacto actual
  const liveOnline = useIsOnline(activeConversation?.otherUserId);

  // Scroll infinito real: al ver el sentinel de arriba, pedir mensajes anteriores
  // conservando la posición visual (sin saltos) en vez de un botón manual.
  const loadMoreRef = useRef(loadMore);
  useEffect(() => { loadMoreRef.current = loadMore; }, [loadMore]);

  useEffect(() => {
    const target = topRef.current;
    if (!target) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMoreRef.current(); },
      { root: scrollRef.current, threshold: 0 }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [activeConversationId]);

  const prevScrollHeightRef = useRef(0);
  const restoringScrollRef  = useRef(false);
  const firstMessageIdRef   = useRef<number | null>(null);
  const lastMessageIdRef    = useRef<number | null>(null);

  // Antes de pedir la página anterior, guardamos la altura actual del scroll
  useEffect(() => {
    if (isLoadingMore && scrollRef.current) {
      prevScrollHeightRef.current = scrollRef.current.scrollHeight;
      restoringScrollRef.current = true;
    }
  }, [isLoadingMore]);

  // Tras el render con los mensajes nuevos: si venían de "cargar anteriores",
  // reajustamos scrollTop para que la vista no salte; si es un mensaje nuevo
  // al final, bajamos suavemente al fondo.
  useEffect(() => {
    const firstId = messages[0]?.messageId ?? null;
    const lastId  = messages[messages.length - 1]?.messageId ?? null;
    const container = scrollRef.current;

    if (restoringScrollRef.current && container && firstId !== firstMessageIdRef.current) {
      const delta = container.scrollHeight - prevScrollHeightRef.current;
      container.scrollTop += delta;
      restoringScrollRef.current = false;
    } else if (lastId !== null && lastId !== lastMessageIdRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }

    firstMessageIdRef.current = firstId;
    lastMessageIdRef.current  = lastId;
  }, [messages]);

  // Refs estables para callbacks WS (evitan re-suscripciones innecesarias)
  const appendMessageRef   = useRef(appendMessage);
  const updateMessageRef   = useRef(updateMessage);
  const markReadRef        = useRef(markMessagesAsRead);
  const setTypingRef       = useRef(setTypingUserId);
  const currentUserIdRef   = useRef(currentUserId);
  const activeConvRef      = useRef(activeConversation);
  useEffect(() => { appendMessageRef.current   = appendMessage;       }, [appendMessage]);
  useEffect(() => { updateMessageRef.current   = updateMessage;       }, [updateMessage]);
  useEffect(() => { markReadRef.current        = markMessagesAsRead;  }, [markMessagesAsRead]);
  useEffect(() => { setTypingRef.current       = setTypingUserId;     }, [setTypingUserId]);
  useEffect(() => { currentUserIdRef.current   = currentUserId;       }, [currentUserId]);
  useEffect(() => { activeConvRef.current      = activeConversation;  }, [activeConversation]);

  // Mensaje nuevo por WS — ya llega normalizado como MessageResponse.
  // eventType "MESSAGE_UPDATED" (edición/borrado) actualiza el mensaje existente
  // en vez de agregar uno nuevo — mismo topic, distinto tratamiento.
  const handleWsMessage = useCallback((msg: MessageResponse, eventType: string) => {
    if (eventType === "MESSAGE_UPDATED") updateMessageRef.current(msg);
    else appendMessageRef.current(msg);
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
      <div className="hidden flex-1 items-center justify-center bg-gray-50 dark:bg-gray-950 md:flex">
        <div className="text-center text-gray-400 dark:text-gray-600">
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

  // Agrupa mensajes por día e indica cuáles son el primero de una racha del mismo
  // remitente, para separar visualmente sin repetir metadatos innecesarios.
  const rendered = messages.reduce<{
    items: { msg: MessageResponse; showDayDivider: boolean; isGroupStart: boolean; day: string }[];
    lastDay: string | null;
    lastSenderId: number | null;
  }>(
    (acc, msg) => {
      const day = dayLabel(msg.sentAt);
      const showDayDivider = day !== acc.lastDay;
      const isGroupStart = showDayDivider || msg.senderId !== acc.lastSenderId;
      return {
        items: [...acc.items, { msg, showDayDivider, isGroupStart, day }],
        lastDay: day,
        lastSenderId: msg.senderId,
      };
    },
    { items: [], lastDay: null, lastSenderId: null }
  ).items;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
        <button
          onClick={() => setActiveConversation(null)}
          title="Volver"
          className="-ml-1 rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-200 md:hidden"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
            strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </button>
        <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-sm font-semibold text-white ${avatarGradient(activeConversation.otherUserId)}`}>
          {activeConversation.otherUsername.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">{activeConversation.otherUsername}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {typingUserId ? (
              <span className="text-blue-500 dark:text-blue-400">Escribiendo...</span>
            ) : (liveOnline ?? activeConversation.status === "ONLINE") ? (
              "En línea"
            ) : (
              "Desconectado"
            )}
          </p>
        </div>

        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-200"
            aria-label="Opciones de la conversación"
          >
            ⋮
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full z-20 mt-1 w-52 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
                <button onClick={toggleMute} className="block w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700">
                  {activeConversation.muted ? "🔔 Reactivar notificaciones" : "🔇 Silenciar conversación"}
                </button>
                <button onClick={toggleBlock} className="block w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40">
                  {isBlocked ? "✅ Desbloquear usuario" : "🚫 Bloquear usuario"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Mensajes */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto bg-gray-50 px-4 py-3 dark:bg-gray-950">
        {/* Sentinel de scroll infinito: al hacerse visible, carga mensajes anteriores */}
        <div ref={topRef} />
        {isLoadingMore && (
          <div className="mb-3 flex justify-center"><Spinner /></div>
        )}
        {isLoading && messages.length === 0 && (
          <div className="flex justify-center py-8"><Spinner /></div>
        )}
        {error && <ErrorMessage message={error} onRetry={hasMore ? loadMore : undefined} />}

        {rendered.map(({ msg, showDayDivider, isGroupStart, day }) => (
          <div key={msg.messageId}>
            {showDayDivider && (
              <div className="my-4 flex justify-center">
                <span className="rounded-full bg-gray-200/70 px-3 py-1 text-[11px] font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                  {day}
                </span>
              </div>
            )}
            <MessageBubble message={msg} currentUserId={currentUserId ?? 0} isGroupStart={isGroupStart} />
          </div>
        ))}

        {/* Indicador de typing con los 3 puntos */}
        {typingUserId && (
          <div className="flex items-center gap-1 ml-1 mt-1 mb-1">
            <span className="inline-flex gap-0.5">
              {[0, 150, 300].map((delay) => (
                <span key={delay}
                  className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 dark:bg-gray-600"
                  style={{ animationDelay: `${delay}ms` }} />
              ))}
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500">escribiendo</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {isBlocked ? (
        <div className="border-t border-gray-200 bg-gray-50 px-4 py-3 text-center text-xs text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
          Bloqueaste a {activeConversation.otherUsername} — desbloquéalo para volver a escribirle.
        </div>
      ) : (
        <MessageInput conversationId={activeConversation.conversationId} onSend={handleSend} />
      )}
    </div>
  );
}

export function ChatPage() {
  const activeConversation = useChatStore((s) => s.activeConversation);
  return (
    <AppLayout
      sidebar={<ConversationsSidebar />}
      main={<ActiveChat />}
      showMainOnMobile={!!activeConversation}
    />
  );
}