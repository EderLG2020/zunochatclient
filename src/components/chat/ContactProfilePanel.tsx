import { useEffect, useState, type ReactNode } from "react";
import { Avatar } from "@/components/chat/Avatar";
import { Spinner } from "@/components/ui/Spinner";
import { StreakRequestBanner } from "@/components/chat/StreakRequestBanner";
import { userService } from "@/services/user.service";
import { conversationService } from "@/services/conversation.service";
import { streakService } from "@/services/streak.service";
import { useStreak } from "@/hooks/useStreaks";
import { useStreakStore } from "@/store/streakStore";
import { getUserIdFromToken } from "@/lib/jwt";
import type { ConversationResponse, UserProfileResponse } from "@/types";

interface Props {
  conversation: ConversationResponse;
  onBack: () => void;
  onConversationUpdated: (conv: ConversationResponse) => void;
}

/**
 * Perfil del contacto — ocupa todo el panel de chat (reemplaza mensajes +
 * input) al tocar el nombre/avatar en el header. Solo tiene sentido para
 * DIRECT: en GROUP no hay un único "otro usuario" del que mostrar perfil.
 */
export function ContactProfilePanel({ conversation, onBack, onConversationUpdated }: Props) {
  const [profile, setProfile] = useState<UserProfileResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTogglingEphemeral, setIsTogglingEphemeral] = useState(false);
  const [isTogglingStreak, setIsTogglingStreak] = useState(false);
  const streak = useStreak(conversation.conversationId);
  const setStreakInStore = useStreakStore((s) => s.setStreak);
  const currentUserId = getUserIdFromToken();

  useEffect(() => {
    if (conversation.otherUserId == null) return;
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    userService.getProfile(conversation.otherUserId)
      .then((data) => { if (!cancelled) setProfile(data); })
      .catch(() => { if (!cancelled) setError("No se pudo cargar el perfil"); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [conversation.otherUserId]);

  const toggleEphemeral = async () => {
    setIsTogglingEphemeral(true);
    try {
      const updated = await conversationService.setEphemeral(conversation.conversationId, {
        enabled: !conversation.ephemeralEnabled,
      });
      onConversationUpdated(updated);
    } finally {
      setIsTogglingEphemeral(false);
    }
  };

  // Activar dispara una solicitud (opt-in mutuo, ver StreakRequestBanner) —
  // no queda enabled=true hasta que el otro confirme. Desactivar sí es
  // inmediato, sin necesidad de que el otro confirme nada.
  const toggleStreak = async () => {
    setIsTogglingStreak(true);
    try {
      const updated = await streakService.setEnabled(conversation.conversationId, {
        enabled: !(streak?.enabled ?? false),
      });
      setStreakInStore(updated);
    } finally {
      setIsTogglingStreak(false);
    }
  };

  const refreshStreak = () => {
    streakService.get(conversation.conversationId).then(setStreakInStore);
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
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Datos del contacto</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="flex justify-center py-16"><Spinner /></div>
        )}

        {error && (
          <p className="px-6 py-8 text-center text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        {!isLoading && !error && profile && (
          <div className="animate-fade-in-up mx-auto max-w-md px-6 py-8">
            <div className="flex flex-col items-center gap-3">
              <Avatar src={profile.avatar} seed={profile.id} label={profile.username} size="xl" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{profile.username}</h2>
            </div>

            <div className="mt-8 space-y-1">
              <ProfileField
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                  </svg>
                }
                label="Correo"
                value={profile.email}
              />
              <ProfileField
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                  </svg>
                }
                label="Teléfono"
                value={profile.phone ?? "No especificado"}
                muted={!profile.phone}
              />
            </div>

            <div className="mt-8 border-t border-gray-200 pt-6 dark:border-gray-800">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Chat temporal</p>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                    Los mensajes nuevos se autoeliminan 24 horas después de enviarse. Los mensajes ya enviados no se ven afectados.
                  </p>
                </div>
                <button
                  onClick={toggleEphemeral}
                  disabled={isTogglingEphemeral}
                  role="switch"
                  aria-checked={conversation.ephemeralEnabled}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition disabled:opacity-50 ${
                    conversation.ephemeralEnabled ? "bg-blue-500" : "bg-gray-300 dark:bg-gray-700"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                      conversation.ephemeralEnabled ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="mt-6 border-t border-gray-200 pt-6 dark:border-gray-800">
              {streak?.requestStatus === "PENDING" ? (
                <div>
                  <p className="mb-3 text-sm font-medium text-gray-900 dark:text-gray-100">Racha 🔥</p>
                  <StreakRequestBanner
                    conversationId={conversation.conversationId}
                    streak={streak}
                    currentUserId={currentUserId ?? 0}
                    onResolved={refreshStreak}
                  />
                </div>
              ) : (
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Racha 🔥</p>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                      {streak?.enabled
                        ? `Llevan ${streak.currentCount} día${streak.currentCount === 1 ? "" : "s"} seguidos escribiéndose. Si un día pasa sin que ambos escriban, se reinicia a 1.`
                        : "Cuenta los días seguidos en que ambos se escriben, como en Snapchat. El otro debe confirmar para que empiece a contar."}
                    </p>
                  </div>
                  <button
                    onClick={toggleStreak}
                    disabled={isTogglingStreak}
                    role="switch"
                    aria-checked={streak?.enabled ?? false}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition disabled:opacity-50 ${
                      streak?.enabled ? "bg-orange-500" : "bg-gray-300 dark:bg-gray-700"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                        streak?.enabled ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ProfileField({ icon, label, value, muted }: { icon: ReactNode; label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-start gap-3 rounded-lg px-3 py-2.5">
      <span className="mt-0.5 text-gray-400 dark:text-gray-500">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-gray-400 dark:text-gray-500">{label}</p>
        <p className={`truncate text-sm ${muted ? "text-gray-400 dark:text-gray-500 italic" : "text-gray-800 dark:text-gray-100"}`}>
          {value}
        </p>
      </div>
    </div>
  );
}
