// Google Identity Services — authorization code flow (NO el botón/widget
// prearmado de Google). Un botón propio dispara requestGoogleCode(), que
// abre el popup de Google y devuelve un authorization "code" — nunca un
// token — para que el backend lo intercambie server-to-server
// (ver services/auth.service.ts → authService.googleAuth).

const GIS_SCRIPT_SRC = "https://accounts.google.com/gsi/client";
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

// Tipado mínimo de la porción de la API de Google Identity Services que se usa acá.
interface GoogleCodeClientConfig {
  client_id: string;
  scope: string;
  ux_mode: "popup";
  callback: (response: { code?: string; error?: string }) => void;
}
interface GoogleCodeClient {
  requestCode: () => void;
}
interface GoogleAccountsOAuth2 {
  initCodeClient: (config: GoogleCodeClientConfig) => GoogleCodeClient;
}
declare global {
  interface Window {
    google?: { accounts: { oauth2: GoogleAccountsOAuth2 } };
  }
}

let scriptLoadPromise: Promise<void> | null = null;

function loadGisScript(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (scriptLoadPromise) return scriptLoadPromise;

  scriptLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = GIS_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("No se pudo cargar Google Identity Services"));
    document.head.appendChild(script);
  });

  return scriptLoadPromise;
}

/**
 * Abre el popup de Google y devuelve el authorization code una vez que el
 * usuario elige/confirma su cuenta. Rechaza si cierra el popup sin elegir
 * cuenta o si falla la carga del script.
 */
export async function requestGoogleCode(): Promise<string> {
  if (!GOOGLE_CLIENT_ID) {
    throw new Error(
      "Falta configurar VITE_GOOGLE_CLIENT_ID en client/.env (ver .env.example)",
    );
  }

  await loadGisScript();

  return new Promise((resolve, reject) => {
    const client = window.google!.accounts.oauth2.initCodeClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: "openid email profile",
      ux_mode: "popup",
      callback: (response) => {
        if (response.code) resolve(response.code);
        else reject(new Error(response.error ?? "No se completó el inicio de sesión con Google"));
      },
    });
    client.requestCode();
  });
}
