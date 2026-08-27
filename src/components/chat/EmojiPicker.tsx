import { useEffect, useRef, useState } from "react";
import { useThemeStore } from "@/store/themeStore";
import type { EmojiClickEvent } from "emoji-picker-element/shared.js";

interface Props {
  onSelect: (emoji: string) => void;
}

// El propio import registra el custom element (<emoji-picker>) — se carga
// recién cuando se abre el picker por primera vez, en vez de sumarlo al
// bundle inicial (Vite lo separa en su propio chunk). Promise compartida
// para que abrir/cerrar varias veces no reimporte ni re-registre el elemento.
let loadPromise: Promise<unknown> | null = null;
function loadEmojiPicker(): Promise<unknown> {
  if (!loadPromise) loadPromise = import("emoji-picker-element");
  return loadPromise;
}

/**
 * Wrapper de React sobre el web component de emoji-picker-element.
 * Se crea imperativamente (document.createElement) en vez de JSX porque es
 * un custom element ajeno a React — así también evitamos declarar tipos JSX
 * para <emoji-picker>.
 */
export function EmojiPicker({ onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const theme = useThemeStore((s) => s.theme);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadEmojiPicker()
      .then(() => { if (!cancelled) setReady(true); })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!ready || !container) return;

    const picker = document.createElement("emoji-picker");
    picker.className = theme;

    const handleClick = (event: EmojiClickEvent) => {
      if (event.detail.unicode) onSelect(event.detail.unicode);
    };
    picker.addEventListener("emoji-click", handleClick);

    container.appendChild(picker);
    return () => {
      picker.removeEventListener("emoji-click", handleClick);
      picker.remove();
    };
  }, [ready, theme, onSelect]);

  if (failed) {
    return (
      <p className="w-64 p-4 text-xs text-red-500 dark:text-red-400">
        No se pudo cargar el selector de emojis.
      </p>
    );
  }

  return (
    <div
      ref={containerRef}
      className="overflow-hidden rounded-xl"
      // Variables CSS propias de emoji-picker-element (atraviesan su shadow
      // DOM) — border-size en 0 porque el popover que lo envuelve (en
      // MessageInput) ya pone su propio borde; sin esto quedaría doble.
      style={{
        ["--indicator-color" as string]: "#3b82f6",
        ["--border-size" as string]: "0px",
      }}
    >
      {!ready && (
        <div className="flex h-80 w-72 items-center justify-center">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
        </div>
      )}
    </div>
  );
}
