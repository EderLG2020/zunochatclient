import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useAuthStore } from "@/store/authstore";
import { userService } from "@/services/user.service";
import { uploadService } from "@/services/upload.service";
import { Avatar } from "@/components/chat/Avatar";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { getUserIdFromToken } from "@/lib/jwt";

function extractErrorMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: string; errors?: Record<string, string> } } };
  const errors = e.response?.data?.errors;
  if (errors) {
    const first = Object.values(errors)[0];
    if (first) return first;
  }
  return e.response?.data?.message ?? fallback;
}

const inputClass =
  "flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:bg-gray-800 dark:focus:ring-blue-900";
const saveButtonClass =
  "flex-shrink-0 rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-600 disabled:opacity-50";

/** Sección "Perfil" del modal de Configuración: avatar, username, teléfono, contraseña y email. */
export function ProfileSettings() {
  const user = useAuthStore((s) => s.user);
  const applyAuthUpdate = useAuthStore((s) => s.applyAuthUpdate);
  const updateEmailInStore = useAuthStore((s) => s.updateEmail);
  const userId = getUserIdFromToken();

  // Avatar y teléfono no vienen en el AuthResponse persistido — se piden una vez al abrir.
  const [avatar, setAvatar] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  useEffect(() => {
    if (userId == null) return;
    userService.getProfile(userId).then((p) => { setAvatar(p.avatar); setPhone(p.phone ?? ""); }).catch(() => {});
  }, [userId]);

  // ── Avatar ────────────────────────────────────────────────────────────
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const handleAvatarChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setAvatarError(null);
    setIsUploadingAvatar(true);
    try {
      const [url] = await uploadService.upload([file]);
      await userService.updateAvatar(url);
      setAvatar(url);
    } catch (err) {
      setAvatarError(extractErrorMessage(err, "No se pudo actualizar la foto"));
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // ── Username ──────────────────────────────────────────────────────────
  const [username, setUsername] = useState(user?.username ?? "");
  useEffect(() => { setUsername(user?.username ?? ""); }, [user?.username]);
  const [isSavingUsername, setIsSavingUsername] = useState(false);
  const [usernameSaved, setUsernameSaved] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);

  const handleSaveUsername = async () => {
    const trimmed = username.trim();
    if (!trimmed || trimmed === user?.username) return;
    setUsernameError(null);
    setUsernameSaved(false);
    setIsSavingUsername(true);
    try {
      const auth = await userService.updateUsername(trimmed);
      applyAuthUpdate(auth); // el token viejo dejó de servir — se reemplaza en el store
      setUsernameSaved(true);
    } catch (err) {
      setUsernameError(extractErrorMessage(err, "No se pudo cambiar el nombre de usuario"));
    } finally {
      setIsSavingUsername(false);
    }
  };

  // ── Teléfono ──────────────────────────────────────────────────────────
  const [isSavingPhone, setIsSavingPhone] = useState(false);
  const [phoneSaved, setPhoneSaved] = useState(false);

  const handleSavePhone = async () => {
    setIsSavingPhone(true);
    setPhoneSaved(false);
    try {
      await userService.updatePhone(phone.trim() || null);
      setPhoneSaved(true);
    } finally {
      setIsSavingPhone(false);
    }
  };

  // ── Contraseña ────────────────────────────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const handleSavePassword = async () => {
    setPasswordError(null);
    setPasswordSaved(false);
    if (!currentPassword || !newPassword) return;
    if (newPassword !== confirmPassword) { setPasswordError("Las contraseñas nuevas no coinciden"); return; }

    setIsSavingPassword(true);
    try {
      await userService.updatePassword(currentPassword, newPassword);
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      setPasswordSaved(true);
    } catch (err) {
      setPasswordError(extractErrorMessage(err, "No se pudo actualizar la contraseña"));
    } finally {
      setIsSavingPassword(false);
    }
  };

  // ── Email (dos pasos: solicitar con contraseña → confirmar con OTP) ────
  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [emailStep, setEmailStep] = useState<"idle" | "otp-sent">("idle");
  const [isRequestingEmail, setIsRequestingEmail] = useState(false);
  const [isConfirmingEmail, setIsConfirmingEmail] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailSaved, setEmailSaved] = useState(false);

  const handleRequestEmailChange = async () => {
    setEmailError(null);
    if (!newEmail.trim() || !emailPassword) return;
    setIsRequestingEmail(true);
    try {
      await userService.requestEmailChange(emailPassword, newEmail.trim());
      setEmailStep("otp-sent");
    } catch (err) {
      setEmailError(extractErrorMessage(err, "No se pudo solicitar el cambio de correo"));
    } finally {
      setIsRequestingEmail(false);
    }
  };

  const handleConfirmEmailChange = async () => {
    setEmailError(null);
    if (!otpCode.trim()) return;
    setIsConfirmingEmail(true);
    try {
      await userService.confirmEmailChange(otpCode.trim());
      updateEmailInStore(newEmail.trim());
      setEmailStep("idle");
      setNewEmail(""); setEmailPassword(""); setOtpCode("");
      setEmailSaved(true);
    } catch (err) {
      setEmailError(extractErrorMessage(err, "Código incorrecto o expirado"));
    } finally {
      setIsConfirmingEmail(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Avatar + username */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Perfil</h3>
        <div className="mt-3 flex items-center gap-4">
          <div className="relative">
            <Avatar src={avatar} seed={userId ?? user?.username ?? ""} label={user?.username ?? "?"} size="xl" />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingAvatar}
              title="Cambiar foto"
              className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-blue-500 text-white shadow transition hover:bg-blue-600 disabled:opacity-50"
            >
              {isUploadingAvatar ? (
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-3.5 w-3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                </svg>
              )}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>

          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">Nombre de usuario</label>
            <div className="mt-1.5 flex gap-2">
              <input
                type="text"
                value={username}
                onChange={(e) => { setUsername(e.target.value); setUsernameSaved(false); setUsernameError(null); }}
                maxLength={30}
                className={inputClass}
              />
              <button
                onClick={handleSaveUsername}
                disabled={isSavingUsername || !username.trim() || username.trim() === user?.username}
                className={saveButtonClass}
              >
                {isSavingUsername ? "..." : "Guardar"}
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{user?.email}</p>
          </div>
        </div>
        {avatarError && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{avatarError}</p>}
        {usernameSaved && <p className="mt-2 text-xs text-green-600 dark:text-green-400">Nombre de usuario actualizado.</p>}
        {usernameError && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{usernameError}</p>}
      </div>

      {/* Teléfono */}
      <div>
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">Teléfono</label>
        <p className="mt-0.5 mb-1.5 text-xs text-gray-400 dark:text-gray-500">
          Se muestra a las personas con las que chateás, en su panel de datos del contacto.
        </p>
        <div className="flex gap-2">
          <input
            type="tel"
            value={phone}
            onChange={(e) => { setPhone(e.target.value); setPhoneSaved(false); }}
            placeholder="Ej: +51 987 654 321"
            maxLength={20}
            className={inputClass}
          />
          <button onClick={handleSavePhone} disabled={isSavingPhone} className={saveButtonClass}>
            {isSavingPhone ? "..." : "Guardar"}
          </button>
        </div>
        {phoneSaved && <p className="mt-2 text-xs text-green-600 dark:text-green-400">Guardado.</p>}
      </div>

      {/* Contraseña */}
      <div className="border-t border-gray-200 pt-6 dark:border-gray-800">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Cambiar contraseña</h3>
        <div className="mt-3 space-y-2.5">
          <PasswordInput
            placeholder="Contraseña actual"
            value={currentPassword}
            onChange={(e) => { setCurrentPassword(e.target.value); setPasswordSaved(false); setPasswordError(null); }}
          />
          <PasswordInput
            placeholder="Contraseña nueva"
            value={newPassword}
            onChange={(e) => { setNewPassword(e.target.value); setPasswordSaved(false); setPasswordError(null); }}
          />
          <PasswordInput
            placeholder="Confirmar contraseña nueva"
            value={confirmPassword}
            onChange={(e) => { setConfirmPassword(e.target.value); setPasswordSaved(false); setPasswordError(null); }}
          />
          <button
            onClick={handleSavePassword}
            disabled={isSavingPassword || !currentPassword || !newPassword}
            className={`${saveButtonClass} w-full`}
          >
            {isSavingPassword ? "Actualizando..." : "Actualizar contraseña"}
          </button>
        </div>
        {passwordSaved && <p className="mt-2 text-xs text-green-600 dark:text-green-400">Contraseña actualizada.</p>}
        {passwordError && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{passwordError}</p>}
      </div>

      {/* Email */}
      <div className="border-t border-gray-200 pt-6 dark:border-gray-800">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Cambiar correo</h3>

        {emailStep === "idle" ? (
          <div className="mt-3 space-y-2.5">
            <input
              type="email"
              value={newEmail}
              onChange={(e) => { setNewEmail(e.target.value); setEmailError(null); }}
              placeholder="Correo nuevo"
              className={`${inputClass} w-full`}
            />
            <PasswordInput
              placeholder="Contraseña actual (para confirmar)"
              value={emailPassword}
              onChange={(e) => { setEmailPassword(e.target.value); setEmailError(null); }}
            />
            <button
              onClick={handleRequestEmailChange}
              disabled={isRequestingEmail || !newEmail.trim() || !emailPassword}
              className={`${saveButtonClass} w-full`}
            >
              {isRequestingEmail ? "Enviando..." : "Enviar código al correo nuevo"}
            </button>
          </div>
        ) : (
          <div className="mt-3 space-y-2.5">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Enviamos un código de 6 dígitos a <span className="font-medium text-gray-700 dark:text-gray-300">{newEmail}</span>.
            </p>
            <input
              type="text"
              value={otpCode}
              onChange={(e) => { setOtpCode(e.target.value); setEmailError(null); }}
              placeholder="Código de 6 dígitos"
              maxLength={6}
              className={`${inputClass} w-full`}
            />
            <div className="flex gap-2">
              <button
                onClick={handleConfirmEmailChange}
                disabled={isConfirmingEmail || otpCode.trim().length !== 6}
                className={saveButtonClass}
              >
                {isConfirmingEmail ? "Verificando..." : "Confirmar"}
              </button>
              <button
                onClick={() => { setEmailStep("idle"); setOtpCode(""); setEmailError(null); }}
                className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
        {emailSaved && <p className="mt-2 text-xs text-green-600 dark:text-green-400">Correo actualizado.</p>}
        {emailError && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{emailError}</p>}
      </div>
    </div>
  );
}
