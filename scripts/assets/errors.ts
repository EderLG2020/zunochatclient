/**
 * Error "esperado" del pipeline de assets: su `.message` ya está redactado
 * para mostrarse tal cual en terminal (sin stack trace), a diferencia de un
 * error inesperado (bug real), que sí conviene mostrar completo para poder
 * diagnosticarlo.
 */
export class AssetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AssetError";
  }
}

/**
 * Traduce errores conocidos de Playwright/Node a un mensaje accionable.
 * Devuelve null si no reconoce el error (el llamador debe mostrar el original).
 */
export function describeKnownError(err: unknown): string | null {
  const message = err instanceof Error ? err.message : String(err);

  if (/Executable doesn't exist/i.test(message)) {
    return (
      "No están instalados los navegadores de Playwright.\n" +
      "  Ejecutá: npm run playwright:install"
    );
  }

  if (/Timeout \d+ms exceeded/i.test(message)) {
    return (
      "La página tardó demasiado en cargar/estabilizarse (timeout).\n" +
      "  - Si es --screenshot, confirmá que la app esté corriendo (npm run dev) y sea alcanzable.\n" +
      "  - Si es un template, revisá que no haya imágenes/fuentes remotas caídas o lentas."
    );
  }

  if (/spawn.*ffmpeg.*ENOENT/i.test(message)) {
    return (
      "No se encontró el binario de ffmpeg (ffmpeg-static) para generar el GIF.\n" +
      "  Probá reinstalar dependencias: npm install"
    );
  }

  if (/net::ERR_CONNECTION_REFUSED/i.test(message)) {
    return (
      "No se pudo conectar a la URL indicada — ¿está corriendo el servidor?\n" +
      "  Para --screenshot necesitás `npm run dev` (frontend) y, si la vista usa datos reales, el backend levantado."
    );
  }

  return null;
}

export function formatErrorForTerminal(err: unknown): string {
  if (err instanceof AssetError) return `❌ ${err.message}`;

  const known = describeKnownError(err);
  if (known) return `❌ ${known}`;

  const message = err instanceof Error ? err.stack ?? err.message : String(err);
  return `❌ Error inesperado:\n${message}`;
}
