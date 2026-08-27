import fs from "node:fs/promises";
import path from "node:path";
import { TEMPLATES_ROOT } from "./env.ts";
import { AssetError } from "./errors.ts";
import type { ResolvedTemplate, TemplateMeta } from "./types.ts";

async function isDirectory(p: string): Promise<boolean> {
  try {
    return (await fs.stat(p)).isDirectory();
  } catch {
    return false;
  }
}

async function readMeta(dir: string): Promise<TemplateMeta> {
  const metaPath = path.join(dir, "meta.json");
  try {
    const raw = await fs.readFile(metaPath, "utf8");
    return JSON.parse(raw) as TemplateMeta;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return {};
    throw new AssetError(`meta.json inválido en ${metaPath}: ${(err as Error).message}`);
  }
}

/**
 * Recorre templates/<categoria>/<nombre>/index.html — dos niveles fijos,
 * a propósito (categoría explícita en la carpeta), para que `asset:list`
 * pueda agrupar por categoría sin adivinar la profundidad.
 */
export async function listTemplates(): Promise<ResolvedTemplate[]> {
  const templates: ResolvedTemplate[] = [];

  let categories: string[];
  try {
    categories = await fs.readdir(TEMPLATES_ROOT);
  } catch {
    return templates;
  }

  for (const category of categories) {
    const categoryDir = path.join(TEMPLATES_ROOT, category);
    if (!(await isDirectory(categoryDir))) continue;

    const names = await fs.readdir(categoryDir);
    for (const name of names) {
      const dir = path.join(categoryDir, name);
      const htmlPath = path.join(dir, "index.html");
      try {
        await fs.access(htmlPath);
      } catch {
        continue; // carpeta sin index.html -> no es un template válido, se ignora
      }

      templates.push({
        name,
        category,
        dir,
        htmlPath,
        meta: await readMeta(dir),
      });
    }
  }

  return templates.sort((a, b) => `${a.category}/${a.name}`.localeCompare(`${b.category}/${b.name}`));
}

/**
 * Resuelve un template por nombre corto (`chat-message`) o calificado
 * (`chat/chat-message`). Si hay más de un template con el mismo nombre
 * corto en categorías distintas, exige el nombre calificado.
 */
export async function resolveTemplate(nameOrPath: string): Promise<ResolvedTemplate> {
  const templates = await listTemplates();

  const qualifiedMatch = templates.find((t) => `${t.category}/${t.name}` === nameOrPath);
  if (qualifiedMatch) return qualifiedMatch;

  const shortMatches = templates.filter((t) => t.name === nameOrPath);
  if (shortMatches.length === 1) return shortMatches[0];

  if (shortMatches.length > 1) {
    const options = shortMatches.map((t) => `${t.category}/${t.name}`).join(", ");
    throw new AssetError(
      `El nombre "${nameOrPath}" es ambiguo entre categorías. Usá el nombre calificado: ${options}`
    );
  }

  const available = templates.map((t) => `${t.category}/${t.name}`).join(", ") || "(ninguno — revisá scripts/assets/templates/)";
  throw new AssetError(`Template "${nameOrPath}" no encontrado.\n  Disponibles: ${available}`);
}
