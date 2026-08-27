import fs from "node:fs/promises";
import path from "node:path";
import { applyBackgroundOverride, captureAnimatedGif, captureToFile, loadHtmlFile, loadLiveUrl, withPage } from "./engine.ts";
import { resolveOutputRoot, resolveScreenshotBaseUrl } from "./env.ts";
import { AssetError } from "./errors.ts";
import { resolveTemplate } from "./templates-registry.ts";
import { renderMustacheLite } from "./templating.ts";
import type { GifOptions, OutputFormat, PdfOptions, ViewportSpec } from "./types.ts";

export { listTemplates, resolveTemplate } from "./templates-registry.ts";

const DEFAULT_VIEWPORT: ViewportSpec = { width: 1200, height: 630, deviceScaleFactor: 2 };

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "asset";
}

function extensionFor(format: OutputFormat): string {
  return format === "jpg" ? "jpg" : format;
}

/** `<root>/<png|jpg|pdf>/<name>.<ext>` — layout fijo del punto 6 del pedido. */
function defaultTemplateOutputPath(format: OutputFormat, templateLabel: string): string {
  const root = resolveOutputRoot();
  return path.join(root, format, `${sanitizeFilename(templateLabel)}.${extensionFor(format)}`);
}

/** `<root>/screenshots/<slug-de-la-ruta>.<ext>` — screenshots viven aparte de los renders de template. */
function defaultScreenshotOutputPath(format: OutputFormat, routeOrUrl: string): string {
  const root = resolveOutputRoot();
  let slug = routeOrUrl.replace(/^https?:\/\//, "").replace(/^\/+|\/+$/g, "");
  slug = slug || "home";
  return path.join(root, "screenshots", `${sanitizeFilename(slug)}.${extensionFor(format)}`);
}

export interface RenderTemplateParams {
  template: string;
  data?: Record<string, unknown>;
  format: OutputFormat;
  /** Sobrescribe por completo la ruta calculada (flag --out). */
  outPath?: string;
  viewport?: Partial<ViewportSpec>;
  fullPage?: boolean;
  quality?: number;
  transparent?: boolean;
  background?: string;
  pdf?: PdfOptions;
  gif?: GifOptions;
}

/**
 * API interna de renderizado (punto 9 del pedido): resuelve el template,
 * inyecta los datos, y delega en engine.ts para producir el archivo final.
 * La usa tanto generate.ts (CLI) como, potencialmente, cualquier otro
 * script Node del proyecto.
 */
export async function renderTemplate(params: RenderTemplateParams): Promise<string> {
  const tpl = await resolveTemplate(params.template);

  const viewport: ViewportSpec = {
    width: params.viewport?.width ?? tpl.meta.width ?? DEFAULT_VIEWPORT.width,
    height: params.viewport?.height ?? tpl.meta.height ?? DEFAULT_VIEWPORT.height,
    deviceScaleFactor: params.viewport?.deviceScaleFactor ?? tpl.meta.deviceScaleFactor ?? DEFAULT_VIEWPORT.deviceScaleFactor,
  };

  let source: string;
  try {
    source = await fs.readFile(tpl.htmlPath, "utf8");
  } catch (err) {
    throw new AssetError(`No se pudo leer el template ${tpl.htmlPath}: ${(err as Error).message}`);
  }

  let html: string;
  try {
    html = renderMustacheLite(source, params.data ?? {});
  } catch (err) {
    throw new AssetError(`El template "${params.template}" tiene HTML/CSS inválido: ${(err as Error).message}`);
  }

  // Se escribe al lado del index.html original (no en un tmp dir aparte) para
  // que <link>/<img> con rutas relativas al propio template (./style.css,
  // ./bg.png) sigan resolviendo igual que si se abriera el index.html tal cual.
  const tmpHtmlPath = path.join(tpl.dir, `.render-${process.pid}-${Date.now()}.html`);
  await fs.writeFile(tmpHtmlPath, html, "utf8");

  const outputPath = params.outPath ?? defaultTemplateOutputPath(params.format, tpl.name);

  try {
    return await withPage(viewport, async (page) => {
      await loadHtmlFile(page, tmpHtmlPath);
      if (params.background && !params.transparent) await applyBackgroundOverride(page, params.background);
      if (params.format === "gif") return captureAnimatedGif(page, outputPath, params.gif);
      return captureToFile(page, {
        format: params.format,
        outputPath,
        fullPage: params.fullPage,
        quality: params.quality,
        transparent: params.transparent,
        pdf: params.pdf,
      });
    });
  } finally {
    await fs.rm(tmpHtmlPath, { force: true });
  }
}

export interface RenderScreenshotParams {
  /** Ruta relativa (se le antepone SCREENSHOT_BASE_URL) o URL absoluta. */
  route: string;
  format: OutputFormat;
  outPath?: string;
  viewport?: Partial<ViewportSpec>;
  fullPage?: boolean;
  quality?: number;
  transparent?: boolean;
  background?: string;
  pdf?: PdfOptions;
  gif?: GifOptions;
}

/** Captura una ruta/página en vivo (la app real corriendo) en vez de un template estático. */
export async function renderScreenshot(params: RenderScreenshotParams): Promise<string> {
  const url = /^https?:\/\//i.test(params.route)
    ? params.route
    : `${resolveScreenshotBaseUrl().replace(/\/+$/, "")}/${params.route.replace(/^\/+/, "")}`;

  const viewport: ViewportSpec = {
    width: params.viewport?.width ?? DEFAULT_VIEWPORT.width,
    height: params.viewport?.height ?? DEFAULT_VIEWPORT.height,
    deviceScaleFactor: params.viewport?.deviceScaleFactor ?? DEFAULT_VIEWPORT.deviceScaleFactor,
  };

  const outputPath = params.outPath ?? defaultScreenshotOutputPath(params.format, params.route);

  return withPage(viewport, async (page) => {
    await loadLiveUrl(page, url);
    if (params.background && !params.transparent) await applyBackgroundOverride(page, params.background);
    if (params.format === "gif") return captureAnimatedGif(page, outputPath, params.gif);
    return captureToFile(page, {
      format: params.format,
      outputPath,
      fullPage: params.fullPage,
      quality: params.quality,
      transparent: params.transparent,
      pdf: params.pdf,
    });
  });
}
