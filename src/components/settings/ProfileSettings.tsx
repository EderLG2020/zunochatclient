import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authstore";
import { userService } from "@/services/user.service";
import { getUserIdFromToken } from "@/lib/jwt";

/** Sección "Perfil" del modal de Configuración — por ahora solo el teléfono (se muestra a los contactos). */
export function ProfileSettings() {
  const user = useAuthStore((s) => s.user);
  const [phone, setPhone] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Precarga el teléfono ya guardado — AuthResponse no lo trae, así que se
  // pide el propio perfil una vez al abrir esta sección.
  useEffect(() => {
    const userId = getUserIdFromToken();
    if (userId == null) return;
    userService.getProfile(userId).then((p) => setPhone(p.phone ?? "")).catch(() => {});
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setSaved(false);
    try {
      await userService.updatePhone(phone.trim() || null);
      setSaved(true);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Perfil</h3>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        {user?.username} · {user?.email}
      </p>

      <label className="mt-5 block text-xs font-medium text-gray-500 dark:text-gray-400">Teléfono</label>
      <p className="mt-0.5 mb-1.5 text-xs text-gray-400 dark:text-gray-500">
        Se muestra a las personas con las que chateás, en su panel de datos del contacto.
      </p>
      <div className="flex gap-2">
        <input
          type="tel"
          value={phone}
          onChange={(e) => { setPhone(e.target.value); setSaved(false); }}
          placeholder="Ej: +51 987 654 321"
          maxLength={20}
          className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:bg-gray-800 dark:focus:ring-blue-900"
        />
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex-shrink-0 rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-600 disabled:opacity-50"
        >
          {isSaving ? "..." : "Guardar"}
        </button>
      </div>
      {saved && <p className="mt-2 text-xs text-green-600 dark:text-green-400">Guardado.</p>}
    </div>
  );
}
