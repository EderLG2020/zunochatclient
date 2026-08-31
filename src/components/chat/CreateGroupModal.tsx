import { useEffect, useRef, useState } from "react";
import { userService, type UserSearchResult } from "@/services/user.service";
import { conversationService } from "@/services/conversation.service";
import { Avatar } from "@/components/chat/Avatar";
import type { ConversationResponse } from "@/types";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (conv: ConversationResponse) => void;
}

export function CreateGroupModal({ open, onClose, onCreated }: Props) {
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [selected, setSelected] = useState<UserSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reinicia el formulario cada vez que se abre — evita arrastrar datos del intento anterior.
  useEffect(() => {
    if (!open) return;
    setName("");
    setQuery("");
    setResults([]);
    setSelected([]);
    setError(null);
  }, [open]);

  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return; }
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      try {
        setIsSearching(true);
        const data = await userService.search(query.trim());
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 350);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [query]);

  if (!open) return null;

  const toggleMember = (user: UserSearchResult) => {
    setSelected((prev) =>
      prev.some((u) => u.id === user.id) ? prev.filter((u) => u.id !== user.id) : [...prev, user]
    );
  };

  const handleCreate = async () => {
    setError(null);
    if (!name.trim()) { setError("Ponle un nombre al grupo"); return; }
    if (selected.length < 2) { setError("Elige al menos 2 personas además de ti"); return; }

    try {
      setIsCreating(true);
      const conv = await conversationService.createGroup({
        name: name.trim(),
        memberIds: selected.map((u) => u.id),
      });
      onCreated(conv);
      onClose();
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string; errors?: Record<string, string> } } })
          ?.response?.data;
      setError(message?.errors?.memberIds ?? message?.message ?? "No se pudo crear el grupo");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Nuevo grupo"
        onClick={(e) => e.stopPropagation()}
        className="animate-scale-in relative flex w-full max-w-md flex-col overflow-hidden rounded-xl bg-white shadow-xl dark:bg-gray-900"
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-800">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Nuevo grupo</h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.7} stroke="currentColor" className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-5">
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">Nombre del grupo</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Amigos del trabajo"
            maxLength={100}
            className="mt-1.5 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:bg-gray-800 dark:focus:ring-blue-900"
          />

          {selected.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {selected.map((u) => (
                <button
                  key={u.id}
                  onClick={() => toggleMember(u)}
                  className="flex items-center gap-1 rounded-full bg-blue-50 py-1 pl-1 pr-2 text-xs font-medium text-blue-700 transition hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-950/70"
                >
                  <Avatar src={u.avatar} seed={u.id} label={u.username} size="sm" />
                  {u.username}
                  <span aria-hidden>×</span>
                </button>
              ))}
            </div>
          )}

          <label className="mt-4 block text-xs font-medium text-gray-500 dark:text-gray-400">Agregar personas</label>
          <div className="relative mt-1.5">
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
            <ul className="animate-fade-in-up mt-2 max-h-48 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700">
              {results.map((user) => {
                const isSelected = selected.some((u) => u.id === user.id);
                return (
                  <li key={user.id}>
                    <button
                      onClick={() => toggleMember(user)}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                    >
                      <Avatar src={user.avatar} seed={user.id} label={user.username} size="sm" />
                      <span className="flex-1 text-sm font-medium text-gray-800 dark:text-gray-100">{user.username}</span>
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

          {error && <p className="mt-3 text-xs text-red-600 dark:text-red-400">{error}</p>}

          <button
            onClick={handleCreate}
            disabled={isCreating}
            className="mt-5 w-full rounded-lg bg-blue-500 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-600 disabled:opacity-50"
          >
            {isCreating ? "Creando..." : "Crear grupo"}
          </button>
        </div>
      </div>
    </div>
  );
}
