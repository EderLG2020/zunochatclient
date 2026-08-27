import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import ffmpegPath from "ffmpeg-static";
import ffmpeg from "fluent-ffmpeg";
import { chromium, type Page } from "playwright";
import sharp from "sharp";
import { AssetError } from "./errors.ts";
import type { CaptureOptions, GifOptions, ViewportSpec } from "./types.ts";

// ffmpeg-static resuelve el binario prebuildeado para la plataforma actual
// (no depende de que el usuario tenga ffmpeg instalado en el sistema, algo
// que en Windows en particular no se puede asumir).
if (ffmpegPath) ffmpeg.setFfmpegPath(ffmpegPath);

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_GIF_FPS = 10;
const DEFAULT_GIF_DURATION_MS = 3000;

function attachDiagnostics(page: Page): void {
  page.on("requestfailed", (req) => {
    // No es fatal: una imagen/fuente remota caída no debería tumbar todo el
    // render, pero el usuario tiene que enterarse de por qué algo faltó.
    console.warn(`[assets] recurso no cargó: ${req.url()} (${req.failure()?.errorText ?? "motivo desconocido"})`);
  });
  page.on("pageerror", (err) => {
    console.warn(`[assets] error de JS en la página renderizada: ${err.message}`);
  });
  page.on("console", (msg) => {
    if (msg.type() === "error") console.warn(`[assets] console.error en la página: ${msg.text()}`);
  });
}

/**
 * Espera a que fuentes e imágenes terminen de cargar y a que el layout se
 * asiente, antes de capturar. `waitUntil: "networkidle"` en goto/setContent
 * ya cubre la mayoría de los casos, pero document.fonts.ready + un par de
 * frames extra evita capturas con FOUT (texto con la fuente de sistema un
 * instante antes de que se aplique la fuente real).
 */
async function waitForStableRender(page: Page, timeoutMs: number): Promise<void> {
  await page.evaluate(
    () => (document.fonts && document.fonts.ready ? document.fonts.ready.then(() => undefined) : undefined)
  ).catch(() => undefined); // document.fonts puede no existir en contextos raros; no es motivo para fallar

  await page.evaluate(
    () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
  );

  // Espera activa a que todas las <img> visibles hayan resuelto load/error,
  // así una imagen lenta (ej. avatar de una API externa) no queda a medio cargar.
  await page.waitForFunction(
    () => Array.from(document.images).every((img) => img.complete),
    undefined,
    { timeout: timeoutMs }
  );
}

/**
 * Abre un browser + contexto con el viewport dado, ejecuta `fn(page)`, y
 * cierra todo al terminar (incluso si `fn` lanza). Un browser por
 * invocación de CLI es más que suficiente para este caso de uso — no vale
 * la pena la complejidad de mantener un browser persistente todavía.
 */
export async function withPage<T>(viewport: ViewportSpec, fn: (page: Page) => Promise<T>): Promise<T> {
  // Si falla el launch (ej. navegador no instalado), se propaga tal cual —
  // generate.ts lo traduce a un mensaje claro vía errors.ts.
  const browser = await chromium.launch();

  try {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: viewport.deviceScaleFactor ?? 2,
    });
    try {
      const page = await context.newPage();
      attachDiagnostics(page);
      return await fn(page);
    } finally {
      await context.close();
    }
  } finally {
    await browser.close();
  }
}

export async function loadHtmlFile(page: Page, absoluteHtmlPath: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<void> {
  const fileUrl = new URL(`file://${absoluteHtmlPath.replace(/\\/g, "/")}`).href;
  await page.goto(fileUrl, { waitUntil: "networkidle", timeout: timeoutMs });
  await waitForStableRender(page, timeoutMs);
}

export async function loadLiveUrl(page: Page, url: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<void> {
  await page.goto(url, { waitUntil: "networkidle", timeout: timeoutMs });
  await waitForStableRender(page, timeoutMs);
}

/** Fuerza un color de fondo en html/body — usado por --background cuando no se pide --transparent. */
export async function applyBackgroundOverride(page: Page, color: string): Promise<void> {
  await page.evaluate((c) => {
    document.documentElement.style.background = c;
    document.body.style.background = c;
  }, color);
}

function parseMargin(margin: string | undefined): { top?: string; right?: string; bottom?: string; left?: string } | undefined {
  if (!margin) return undefined;
  const parts = margin.split(",").map((p) => p.trim());
  if (parts.length === 1) return { top: parts[0], right: parts[0], bottom: parts[0], left: parts[0] };
  if (parts.length === 4) return { top: parts[0], right: parts[1], bottom: parts[2], left: parts[3] };
  throw new AssetError(`--margin inválido: "${margin}" (usá "10mm" o "top,right,bottom,left")`);
}

/**
 * Único punto que escribe el archivo final, sin importar si el contenido
 * vino de un template estático o de una URL en vivo — evita duplicar la
 * lógica de PNG/JPG/PDF entre los dos flujos de entrada (punto 7 del pedido).
 */
export async function captureToFile(page: Page, opts: CaptureOptions): Promise<string> {
  await fs.mkdir(path.dirname(opts.outputPath), { recursive: true });

  try {
    if (opts.format === "pdf") {
      await page.pdf({
        path: opts.outputPath,
        format: opts.pdf?.format ?? "A4",
        landscape: opts.pdf?.landscape ?? false,
        margin: parseMargin(opts.pdf?.margin),
        printBackground: true,
      });
    } else {
      await page.screenshot({
        path: opts.outputPath,
        type: opts.format === "jpg" ? "jpeg" : "png",
        quality: opts.format === "jpg" ? opts.quality ?? 90 : undefined,
        fullPage: opts.fullPage ?? false,
        omitBackground: opts.format === "png" ? opts.transparent ?? false : false,
      });
    }
  } catch (err) {
    throw new AssetError(
      `No se pudo generar el ${opts.format.toUpperCase()} en ${opts.outputPath}: ${(err as Error).message}`
    );
  }

  return opts.outputPath;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Corre ffmpeg sobre una secuencia de frames PNG (frame-00000.png, frame-00001.png, ...)
 * y arma un GIF animado. Usa el filtro de paleta de 2 pasos (palettegen + paletteuse)
 * en una sola pasada vía `split` — un GIF codificado directo sin paleta propia
 * sale con bandas de color y dithering feo, porque el formato solo admite 256 colores.
 */
function encodeFramesToGif(framesGlob: string, fps: number, loop: number, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(framesGlob)
      .inputFPS(fps)
      .complexFilter(["split[a][b]", "[a]palettegen=stats_mode=diff[p]", "[b][p]paletteuse=dither=bayer"])
      .outputOptions([`-loop ${loop}`])
      .output(outputPath)
      .on("error", (err: Error) => reject(new AssetError(`No se pudo generar el GIF en ${outputPath}: ${err.message}`)))
      .on("end", () => resolve())
      .run();
  });
}

/**
 * Captura una animación/proceso de la página como GIF: toma screenshots del
 * viewport a intervalos regulares durante `durationMs`, opcionalmente los
 * redimensiona con Sharp (más rápido hacerlo por frame, en paralelo, que
 * dejar que ffmpeg escale un GIF ya armado), y los arma en un GIF con ffmpeg.
 * No usa page.screenshot({fullPage}) — la animación puede desplazar/mover
 * contenido entre frames, así que solo tiene sentido capturar el viewport fijo.
 */
export async function captureAnimatedGif(page: Page, outputPath: string, gif?: GifOptions): Promise<string> {
  const fps = gif?.fps ?? DEFAULT_GIF_FPS;
  const durationMs = gif?.durationMs ?? DEFAULT_GIF_DURATION_MS;
  const loop = gif?.loop ?? 0;
  const frameIntervalMs = 1000 / fps;
  const totalFrames = Math.max(1, Math.round((durationMs / 1000) * fps));

  const framesDir = await fs.mkdtemp(path.join(os.tmpdir(), "zunochat-assets-gif-"));

  try {
    const framePaths: string[] = [];
    const captureStart = Date.now();

    for (let i = 0; i < totalFrames; i++) {
      const targetTime = captureStart + i * frameIntervalMs;
      const waitMs = targetTime - Date.now();
      if (waitMs > 0) await delay(waitMs);

      const framePath = path.join(framesDir, `frame-${String(i).padStart(5, "0")}.png`);
      await page.screenshot({ path: framePath, type: "png" });
      framePaths.push(framePath);
    }

    if (gif?.width) {
      await Promise.all(
        framePaths.map(async (framePath) => {
          const resized = await sharp(framePath).resize({ width: gif.width }).toBuffer();
          await fs.writeFile(framePath, resized);
        })
      );
    }

    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await encodeFramesToGif(path.join(framesDir, "frame-%05d.png"), fps, loop, outputPath);
  } finally {
    await fs.rm(framesDir, { recursive: true, force: true });
  }

  return outputPath;
}
