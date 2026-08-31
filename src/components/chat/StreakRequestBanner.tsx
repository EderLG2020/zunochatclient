import { useState } from "react";
import { streakService } from "@/services/streak.service";
import type { StreakInfo } from "@/store/streakStore";

interface Props {
  conversationId: number;
  streak: StreakInfo;
  currentUserId: number;
  onResolved: () => void;
}

/**
 * Solicitud de racha pendiente, mostrada dentro del chat/panel del contacto.
 * Si la mandó el usuario autenticado, solo informa que está esperando
 * confirmación; si la mandó el otro, ofrece Aceptar/Rechazar.
 */
export function StreakRequestBanner({ conversationId, streak, currentUserId, onResolved }: Props) {
  const [isResponding, setIsResponding] = useState(false);
  const iSentIt = streak.requestedByUserId === currentUserId;

  const respond = async (accept: boolean) => {
    setIsResponding(true);
    try {
      await streakService.respond(conversationId, { accept });
      onResolved();
    } finally {
      setIsResponding(false);
    }
  };

  if (iSentIt) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-orange-50 px-3 py-2.5 text-sm text-orange-700 dark:bg-orange-950/40 dark:text-orange-300">
        <span>🔥</span>
        <p>Le pediste activar la racha — esperando que confirme.</p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-orange-50 px-3 py-2.5 dark:bg-orange-950/40">
      <p className="text-sm text-orange-700 dark:text-orange-300">🔥 Te invitó a llevar una racha juntos</p>
      <div className="flex flex-shrink-0 gap-2">
        <button
          onClick={() => respond(true)}
          disabled={isResponding}
          className="rounded-md bg-orange-500 px-3 py-1 text-xs font-semibold text-white transition hover:bg-orange-600 disabled:opacity-50"
        >
          Aceptar
        </button>
        <button
          onClick={() => respond(false)}
          disabled={isResponding}
          className="rounded-md bg-transparent px-3 py-1 text-xs font-semibold text-orange-700 transition hover:bg-orange-100 disabled:opacity-50 dark:text-orange-300 dark:hover:bg-orange-900/40"
        >
          Rechazar
        </button>
      </div>
    </div>
  );
}
