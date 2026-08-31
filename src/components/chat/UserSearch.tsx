import { useState, useRef, useEffect, useCallback } from "react";
import { userService, type UserSearchResult } from "@/services/user.service";
import { conversationService } from "@/services/conversation.service";
import { Avatar } from "@/components/chat/Avatar";
import type { ConversationResponse } from "@/types";

interface Props {
  onConversationReady: (conv: ConversationResponse) => void;
}

export function UserSearch({ onConversationReady }: Props) {
  const [query,      setQuery]      = useState("");
  const [results,    setResults]    = useState<UserSearchResult[]>([]);
  const [isOpen,     setIsOpen]     = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating,  setIsCreating]  = useState<number | null>(null);
  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node))
        setIsOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); setIsOpen(false); return; }
    try {
      setIsSearching(true);
      const data = await userService.search(q);
      setResults(data);
      setIsOpen(true);
    } catch {
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => search(val), 350);
  };

  const handleSelect = async (user: UserSearchResult) => {
    setIsOpen(false);
    setQuery("");
    setResults([]);
    try {
      setIsCreating(user.id);
      const conv = await conversationService.create({ targetUserId: user.id });
      onConversationReady(conv);
    } finally {
      setIsCreating(null);
    }
  };

  return (
    <div ref={wrapperRef} className="relative px-3 py-2 border-b border-gray-100 dark:border-gray-800">
      <div className="relative">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
          strokeWidth={1.5} stroke="currentColor"
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500 pointer-events-none">
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0015.803 15.803z" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder="Buscar usuario..."
          className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-8 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:bg-gray-800 dark:focus:ring-blue-900"
        />
        {isSearching && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
        )}
      </div>

      {isOpen && (
        <div className="animate-fade-in-up absolute left-3 right-3 top-full z-50 mt-1 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
          {results.length === 0 ? (
            <p className="px-4 py-3 text-xs text-gray-400 dark:text-gray-500">Sin resultados</p>
          ) : (
            <ul>
              {results.map((user) => (
                <li key={user.id}>
                  <button
                    onClick={() => handleSelect(user)}
                    disabled={isCreating === user.id}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition disabled:opacity-50"
                  >
                    <Avatar src={user.avatar} seed={user.id} label={user.username} size="sm" />
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-100">{user.username}</span>
                    {isCreating === user.id && (
                      <span className="ml-auto h-3.5 w-3.5 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}