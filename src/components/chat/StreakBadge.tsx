import { useEffect, useRef, useState } from "react";
import { useStreak } from "@/hooks/useStreaks";

interface Props {
  conversationId: number;
}

/**
 * 🔥 + contador de racha junto al nombre del chat. No se muestra hasta que
 * la racha esté activa y tenga al menos 1 día contado (INACTIVE/enabled=false
 * no renderiza nada — evita ruido visual en conversaciones sin racha).
 * Ámbar cuando AT_RISK, para avisar que se pierde si no escriben hoy.
 */
export function StreakBadge({ conversationId }: Props) {
  const streak = useStreak(conversationId);
  const [pop, setPop] = useState(false);
  const prevCountRef = useRef<number | undefined>(streak?.currentCount);

  useEffect(() => {
    const prev = prevCountRef.current;
    prevCountRef.current = streak?.currentCount;
    if (streak && prev !== undefined && streak.currentCount > prev) {
      setPop(true);
      const t = setTimeout(() => setPop(false), 350);
      return () => clearTimeout(t);
    }
  }, [streak]);

  if (!streak || !streak.enabled || streak.currentCount <= 0) return null;

  const isAtRisk = streak.status === "AT_RISK";

  return (
    <span
      title={
        isAtRisk
          ? "¡Racha en riesgo! Escríbanse hoy para no perderla"
          : `Racha de ${streak.currentCount} día${streak.currentCount === 1 ? "" : "s"}`
      }
      className={`inline-flex flex-shrink-0 items-center gap-0.5 text-xs font-bold ${
        isAtRisk ? "text-amber-500 dark:text-amber-400" : "text-orange-500 dark:text-orange-400"
      } ${pop ? "animate-streak-pop" : ""}`}
    >
      🔥{streak.currentCount}
    </span>
  );
}
