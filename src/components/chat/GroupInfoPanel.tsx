import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/chat/Avatar";
import { conversationService } from "@/services/conversation.service";
import { userService, type UserSearchResult } from "@/services/user.service";
import { getUserIdFromToken } from "@/lib/jwt";
import type { ConversationResponse, GroupRole } from "@/types";

interface Props {
  conversation: ConversationResponse;
  onBack: () => void;
  onConversationUpdated: (conv: ConversationResponse) => void;
  onLeft: () => void;
}

const ROLE_LABEL: Record<GroupRole, string> = { OWNER: "Propietario", ADMIN: "Admin", MEMBER: "Miembro" };
const ROLE_COLOR: Record<GroupRole, string> = {
  OWNER: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  ADMIN: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
  MEMBER: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

function extractErrorMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: string } } };
  return e.response?.data?.message ?? fallback;
}

/**
 * Info y administración del grupo — reemplaza mensajes+input, análogo a
 * ContactProfilePanel pero para GROUP. Reglas de rango (ver ConversationService
 * en el backend): OWNER administra ADMIN/MEMBER y transfiere la propiedad;
 * ADMIN solo administra MEMBER; MEMBER únicamente puede salir.
 */
export function GroupInfoPanel({ conversation, onBack, onConversationUpdated, onLeft }: Props) {
  const currentUserId = getUserIdFromToken();
  const members = conversation.members ?? [];
  const myMembership = members.find((m) => m.userId === currentUserId);
  const myRole: GroupRole = myMembership?.role ?? "MEMBER";
  const isOwner = myRole === "OWNER";
  const isAdminOrOwner = myRole === "OWNER" || myRole === "ADMIN";

  const [busyUserId, setBusyUserId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLeaving, setIsLeaving] = useState(false);

  // ── Agregar miembros ──────────────────────────────────────────────────
  const [showAdd, setShowAdd] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [selected, setSelected] = useState<UserSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return; }
    if (timerRef.current) clearTimeout(timerRef.current);
    const memberIds = new Set(members.map((m) => m.userId));
    timerRef.current = setTimeout(async () => {
      try {
        setIsSearching(true);
        const data = await userService.search(query.trim());
        setResults(data.filter((u) => !memberIds.has(u.id)));
      } catch {
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 350);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const toggleSelected = (u: UserSearchResult) => {
    setSelected((prev) => (prev.some((x) => x.id === u.id) ? prev.filter((x) => x.id !== u.id) : [...prev, u]));
  };

  const handleAddMembers = async () => {
    if (selected.length === 0) return;
    setError(null);
    setIsAdding(true);
    try {
      const updated = await conversationService.addMembers(conversation.conversationId, {
        memberIds: selected.map((u) => u.id),
      });
      onConversationUpdated(updated);
      setShowAdd(false); setQuery(""); setResults([]); setSelected([]);
    } catch (err) {
      setError(extractErrorMessage(err, "No se pudieron agregar los miembros"));
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemove = async (userId: number) => {
    setError(null);
    setBusyUserId(userId);
    try {
      const updated = await conversationService.removeMember(conversation.conversationId, userId);
      onConversationUpdated(updated);
    } catch (err) {
      setError(extractErrorMessage(err, "No se pudo quitar al miembro"));
    } finally {
      setBusyUserId(null);
    }
  };

  const handleToggleAdmin = async (userId: number, currentRole: GroupRole) => {
    setError(null);
    setBusyUserId(userId);
    try {
      const nextRole: GroupRole = currentRole === "ADMIN" ? "MEMBER" : "ADMIN";
      const updated = await conversationService.updateMemberRole(conversation.conversationId, userId, { role: nextRole });
      onConversationUpdated(updated);
    } catch (err) {
      setError(extractErrorMessage(err, "No se pudo cambiar el rol"));
    } finally {
      setBusyUserId(null);
    }
  };

  const handleTransferOwnership = async (userId: number, username: string) => {
    if (!confirm(`¿Transferir la propiedad del grupo a ${username}? Vos pasarás a ser admin.`)) return;
    setError(null);
    setBusyUserId(userId);
    try {
      const updated = await conversationService.transferOwnership(conversation.conversationId, { newOwnerUserId: userId });
      onConversationUpdated(updated);
    } catch (err) {
      setError(extractErrorMessage(err, "No se pudo transferir la propiedad"));
    } finally {
      setBusyUserId(null);
    }
  };

  const handleLeave = async () => {
    if (!confirm("¿Salir de este grupo?")) return;
    setError(null);
    setIsLeaving(true);
    try {
      await conversationService.leaveGroup(conversation.conversationId);
      onLeft();
    } catch (err) {
      setError(extractErrorMessage(err, "No se pudo salir del grupo"));
      setIsLeaving(false);
    }
  };

  return (
    <div className="animate-slide-in-right flex flex-1 flex-col overflow-hidden bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-gray-200 px-4 py-3 dark:border-gray-800">
        <button
          onClick={onBack}
          title="Volver al chat"
          className="-ml-1 rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-200"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
            strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </button>
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Info del grupo</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="animate-fade-in-up mx-auto max-w-md px-6 py-8">
          <div className="flex flex-col items-center gap-3">
            <Avatar src={conversation.groupAvatar} seed={conversation.conversationId} label={conversation.groupName ?? "Grupo"} size="xl" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{conversation.groupName}</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {members.length} miembro{members.length === 1 ? "" : "s"}
            </p>
          </div>

          {error && <p className="mt-4 text-center text-xs text-red-600 dark:text-red-400">{error}</p>}

          {/* Miembros */}
          <div className="mt-8">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Miembros</h3>
              {isAdminOrOwner && (
                <button
                  onClick={() => setShowAdd((v) => !v)}
                  className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
                >
                  {showAdd ? "Cancelar" : "+ Agregar"}
                </button>
              )}
            </div>

            {showAdd && (
              <div className="mb-4 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                {selected.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {selected.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => toggleSelected(u)}
                        className="flex items-center gap-1 rounded-full bg-blue-50 py-1 pl-1 pr-2 text-xs font-medium text-blue-700 transition hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-950/70"
                      >
                        <Avatar src={u.avatar} seed={u.id} label={u.username} size="sm" />
                        {u.username}
                        <span aria-hidden>×</span>
                      </button>
                    ))}
                  </div>
                )}
                <div className="relative">
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Buscar usuario..."
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:bg-gray-800 dark:focus:ring-blue-900"
                  />
                  {isSearching && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
                  )}
                </div>
                {results.length > 0 && (
                  <ul className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700">
                    {results.map((u) => {
                      const isSelected = selected.some((x) => x.id === u.id);
                      return (
                        <li key={u.id}>
                          <button
                            onClick={() => toggleSelected(u)}
                            className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                          >
                            <Avatar src={u.avatar} seed={u.id} label={u.username} size="sm" />
                            <span className="flex-1 text-gray-800 dark:text-gray-100">{u.username}</span>
                            {isSelected && (
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4 text-blue-500">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                              </svg>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
                <button
                  onClick={handleAddMembers}
                  disabled={isAdding || selected.length === 0}
                  className="mt-3 w-full rounded-lg bg-blue-500 py-2 text-xs font-semibold text-white transition hover:bg-blue-600 disabled:opacity-50"
                >
                  {isAdding ? "Agregando..." : selected.length > 0 ? `Agregar (${selected.length})` : "Agregar"}
                </button>
              </div>
            )}

            <ul className="space-y-1">
              {members.map((m) => {
                const isSelf = m.userId === currentUserId;
                const busy = busyUserId === m.userId;
                const canManage = !isSelf && ((isOwner && m.role !== "OWNER") || (myRole === "ADMIN" && m.role === "MEMBER"));

                return (
                  <li key={m.userId} className="flex items-center gap-3 rounded-lg px-2 py-2">
                    <Avatar src={m.avatar} seed={m.userId} label={m.username} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-gray-800 dark:text-gray-100">
                        {m.username}{isSelf ? " (vos)" : ""}
                      </p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${ROLE_COLOR[m.role]}`}>
                      {ROLE_LABEL[m.role]}
                    </span>
                    {canManage && (
                      <div className="flex gap-0.5">
                        {isOwner && (
                          <button
                            disabled={busy}
                            onClick={() => handleToggleAdmin(m.userId, m.role)}
                            title={m.role === "ADMIN" ? "Quitar admin" : "Hacer admin"}
                            className="rounded p-1 text-gray-400 transition hover:bg-gray-100 hover:text-blue-600 disabled:opacity-50 dark:hover:bg-gray-800"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
                            </svg>
                          </button>
                        )}
                        {isOwner && (
                          <button
                            disabled={busy}
                            onClick={() => handleTransferOwnership(m.userId, m.username)}
                            title="Transferir propiedad"
                            className="rounded p-1 text-gray-400 transition hover:bg-gray-100 hover:text-amber-600 disabled:opacity-50 dark:hover:bg-gray-800"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.562.562 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                            </svg>
                          </button>
                        )}
                        <button
                          disabled={busy}
                          onClick={() => handleRemove(m.userId)}
                          title="Quitar del grupo"
                          className="rounded p-1 text-gray-400 transition hover:bg-gray-100 hover:text-red-600 disabled:opacity-50 dark:hover:bg-gray-800"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Salir */}
          <div className="mt-8 border-t border-gray-200 pt-6 dark:border-gray-800">
            <button
              onClick={handleLeave}
              disabled={isLeaving || isOwner}
              title={isOwner ? "Transferí la propiedad antes de salir" : undefined}
              className="w-full rounded-lg bg-red-50 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-50 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-950/50"
            >
              {isLeaving ? "Saliendo..." : "Salir del grupo"}
            </button>
            {isOwner && (
              <p className="mt-2 text-center text-xs text-gray-400 dark:text-gray-500">
                Transferí la propiedad a otro miembro antes de salir.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
