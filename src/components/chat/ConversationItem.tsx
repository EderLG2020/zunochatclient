import type { ConversationResponse } from "@/types";

function formatTime(iso: string): string {
  const date = new Date(iso), now = new Date();
  const min  = Math.floor((now.getTime() - date.getTime()) / 60_000);
  if (min < 1)    return "ahora";
  if (min < 60)   return `${min} min`;
  if (min < 1440) return date.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });
  if (min < 2880) return "ayer";
  return date.toLocaleDateString("es", { day: "2-digit", month: "2-digit" });
}

interface Props { conversation: ConversationResponse; isActive: boolean; onClick: () => void; }

export function ConversationItem({ conversation, isActive, onClick }: Props) {
  const { otherUsername, lastMessagePreview, lastMessageIsMine, lastMessageAt, unreadCount, status } = conversation;
  const preview = lastMessageIsMine ? `Tú: ${lastMessagePreview ?? ""}` : (lastMessagePreview ?? "");

  return (
    <button onClick={onClick}
      className={`flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-gray-50 ${isActive ? "bg-blue-50 border-r-2 border-blue-500" : ""}`}>
      <div className="relative flex-shrink-0">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-sm font-semibold text-white">
          {otherUsername.charAt(0).toUpperCase()}
        </div>
        {status === "ONLINE" && (
          <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-400 border-2 border-white" />
        )}
        {status === "TYPING" && (
          <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-yellow-400 border-2 border-white" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <span className="truncate text-sm font-semibold text-gray-900">{otherUsername}</span>
          {lastMessageAt && (
            <span className="flex-shrink-0 text-xs text-gray-400">{formatTime(lastMessageAt)}</span>
          )}
        </div>
        <div className="flex items-center justify-between">
          <p className="truncate text-xs text-gray-500 max-w-[160px]">{preview || "Sin mensajes aún"}</p>
          {unreadCount > 0 && (
            <span className="ml-2 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-blue-500 px-1 text-xs font-bold text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}