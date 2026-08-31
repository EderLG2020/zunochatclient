import { memo } from "react";
import type { ConversationResponse } from "@/types";
import { Avatar } from "@/components/chat/Avatar";
import { StreakBadge } from "@/components/chat/StreakBadge";
import { useIsOnline } from "@/hooks/usePresence";

function formatTime(iso: string): string {
  const date = new Date(iso), now = new Date();
  const min  = Math.floor((now.getTime() - date.getTime()) / 60_000);
  if (min < 1)    return "ahora";
  if (min < 60)   return `${min} min`;
  if (min < 1440) return date.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });
  if (min < 2880) return "ayer";
  return date.toLocaleDateString("es", { day: "2-digit", month: "2-digit" });
}

interface Props { conversation: ConversationResponse; isActive: boolean; onSelect: (conversation: ConversationResponse) => void; }

// memo + onSelect estable (en vez de un onClick inline por ítem) para que el
// sidebar no re-renderice todas las conversaciones cada vez que cambia una sola.
export const ConversationItem = memo(function ConversationItem({ conversation, isActive, onSelect }: Props) {
  const { type, otherUserId, otherUsername, otherAvatar, groupName, groupAvatar, lastMessagePreview, lastMessageIsMine, lastMessageAt, unreadCount, status, muted } = conversation;
  const isGroup = type === "GROUP";
  const preview = lastMessageIsMine ? `Tú: ${lastMessagePreview ?? ""}` : (lastMessagePreview ?? "");
  const title = isGroup ? (groupName ?? "Grupo") : (otherUsername ?? "");

  // Presencia en vivo por WS si ya llegó algún evento; si no, cae al status del REST inicial.
  // Sin sentido para GROUP (no hay un único "otro" usuario) — nunca se muestra el punto verde ahí.
  const liveOnline = useIsOnline(otherUserId ?? undefined);
  const isOnline = !isGroup && (liveOnline ?? status === "ONLINE");

  return (
    <button onClick={() => onSelect(conversation)}
      className={`flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-gray-50 dark:hover:bg-gray-900 ${isActive ? "bg-blue-50 border-r-2 border-blue-500 dark:bg-blue-950/40" : ""}`}>
      <div className="relative flex-shrink-0">
        <Avatar src={isGroup ? groupAvatar : otherAvatar} seed={isGroup ? conversation.conversationId : (otherUserId ?? 0)} label={title} size="lg" />
        {isOnline && (
          <span className="animate-fade-in absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-400 border-2 border-white dark:border-gray-950" />
        )}
        {!isOnline && status === "TYPING" && (
          <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-yellow-400 border-2 border-white dark:border-gray-950" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
            {muted && <span className="text-gray-400 dark:text-gray-500" title="Silenciada">🔇</span>}
            <span className="truncate">{title}</span>
            {!isGroup && <StreakBadge conversationId={conversation.conversationId} />}
          </span>
          {lastMessageAt && (
            <span className="flex-shrink-0 text-xs text-gray-400 dark:text-gray-500">{formatTime(lastMessageAt)}</span>
          )}
        </div>
        <div className="flex items-center justify-between">
          <p className="truncate text-xs text-gray-500 dark:text-gray-400 max-w-[160px]">{preview || "Sin mensajes aún"}</p>
          {unreadCount > 0 && (
            <span className={`ml-2 flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 text-xs font-bold text-white ${muted ? "bg-gray-400 dark:bg-gray-600" : "bg-blue-500"}`}>
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
});