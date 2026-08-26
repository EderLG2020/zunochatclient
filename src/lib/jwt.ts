/** Lee el token JWT persistido por el auth store (misma clave que usa zustand/persist). */
export function getTokenFromStorage(): string | null {
  try {
    const raw = localStorage.getItem("auth-storage");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.state?.token ?? null;
  } catch {
    return null;
  }
}

function decodePayload(token: string): Record<string, unknown> | null {
  try {
    return JSON.parse(atob(token.split(".")[1]));
  } catch {
    return null;
  }
}

/** Decodifica el userId desde el JWT persistido por el auth store (sin verificar firma). */
export function getUserIdFromToken(): number | null {
  const token = getTokenFromStorage();
  if (!token) return null;
  const payload = decodePayload(token);
  return typeof payload?.userId === "number" ? payload.userId : null;
}

/** Milisegundos restantes hasta que expire el JWT (negativo si ya expiró). null si no hay token o no se pudo decodificar. */
export function getMsUntilExpiry(token: string): number | null {
  const payload = decodePayload(token);
  if (!payload || typeof payload.exp !== "number") return null;
  return payload.exp * 1000 - Date.now();
}
