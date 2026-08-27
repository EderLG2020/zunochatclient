import path from "node:path";
import { fileURLToPath } from "node:url";

// scripts/assets/env.ts -> .../client (raíz del proyecto frontend)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const PROJECT_ROOT = path.resolve(__dirname, "..", "..");
export const TEMPLATES_ROOT = path.join(__dirname, "templates");

let envLoaded = false;

/**
 * Carga client/.env una sola vez (si existe) usando el loader nativo de
 * Node — evita sumar la dependencia `dotenv` solo para esto. Node no
 * levanta .env automáticamente fuera de Vite, y este CLI corre por fuera
 * de Vite (vía tsx), así que hay que hacerlo a mano.
 */
export function loadEnv(): void {
  if (envLoaded) return;
  envLoaded = true;
  try {
    process.loadEnvFile(path.join(PROJECT_ROOT, ".env"));
  } catch {
    // .env no existe — no es un error, las variables pueden venir del shell.
  }
}

/**
 * Resuelve la carpeta raíz de salida según prioridad:
 *   1. ASSETS_OUTPUT_DIR (env var, definida en .env o en el shell)
 *   2. default: <project>/assets/generated
 * (La prioridad más alta, --out en la CLI, se resuelve aparte en cli-args.ts
 * porque aplica a un archivo puntual, no a la raíz.)
 */
export function resolveOutputRoot(): string {
  loadEnv();
  const fromEnv = process.env.ASSETS_OUTPUT_DIR?.trim();
  if (fromEnv) return path.resolve(PROJECT_ROOT, fromEnv);
  return path.join(PROJECT_ROOT, "assets", "generated");
}

/** Base URL para resolver rutas relativas pasadas a --screenshot (ej. "/chat"). */
export function resolveScreenshotBaseUrl(): string {
  loadEnv();
  return process.env.SCREENSHOT_BASE_URL?.trim() || "http://localhost:5173";
}
