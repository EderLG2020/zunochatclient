import { useEffect, useState, type ReactNode } from "react";
import { AppearanceSettings } from "@/components/settings/AppearanceSettings";
import { ProfileSettings } from "@/components/settings/ProfileSettings";

interface Section {
  key: string;
  label: string;
  icon: ReactNode;
  content: ReactNode;
}

// Un solo ítem por ahora ("Apariencia") — la nav queda armada para sumar
// más secciones más adelante (notificaciones, cuenta, etc.) sin rediseñar
// el punto de entrada ni el layout del modal.
const SECTIONS: Section[] = [
  {
    key: "profile",
    label: "Perfil",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    content: <ProfileSettings />,
  },
  {
    key: "appearance",
    label: "Apariencia",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
      </svg>
    ),
    content: <AppearanceSettings />,
  },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export function SettingsModal({ open, onClose }: Props) {
  const [activeKey, setActiveKey] = useState(SECTIONS[0].key);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const active = SECTIONS.find((s) => s.key === activeKey) ?? SECTIONS[0];

  return (
    <div className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Configuración"
        onClick={(e) => e.stopPropagation()}
        className="animate-scale-in relative flex w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-xl dark:bg-gray-900 sm:h-[420px] sm:flex-row"
      >
        {/* Nav de secciones */}
        <div className="flex flex-shrink-0 flex-row gap-1 overflow-x-auto border-b border-gray-200 p-2 dark:border-gray-800 sm:w-44 sm:flex-col sm:overflow-visible sm:border-b-0 sm:border-r sm:p-3">
          <div className="hidden px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 sm:block">
            Configuración
          </div>
          {SECTIONS.map((s) => (
            <button
              key={s.key}
              onClick={() => setActiveKey(s.key)}
              className={`flex flex-shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${
                activeKey === s.key
                  ? "bg-blue-50 font-medium text-blue-600 dark:bg-blue-950/40 dark:text-blue-400"
                  : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
              }`}
            >
              {s.icon}
              {s.label}
            </button>
          ))}
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="mb-4 flex items-center justify-between sm:hidden">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Configuración</h2>
          </div>
          {active.content}
        </div>

        <button
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute right-3 top-3 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-200"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.7} stroke="currentColor" className="h-5 w-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
