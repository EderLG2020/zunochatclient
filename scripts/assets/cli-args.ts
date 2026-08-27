import { parseArgs } from "node:util";
import { AssetError } from "./errors.ts";
import type { GifOptions, OutputFormat, PdfOptions, ViewportSpec } from "./types.ts";

const VIEWPORT_PRESETS: Record<string, { width: number; height: number }> = {
  desktop: { width: 1440, height: 900 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 390, height: 844 },
};

const FORMATS: OutputFormat[] = ["png", "jpg", "pdf", "gif"];
const PDF_PAGE_SIZES = ["A4", "Letter"] as const;

export interface ParsedCliArgs {
  /** Nombre del template (positional), ausente si se usó --screenshot. */
  template?: string;
  screenshot?: string;
  format: OutputFormat;
  viewport?: Partial<ViewportSpec>;
  fullPage: boolean;
  quality?: number;
  transparent: boolean;
  background?: string;
  pdf?: PdfOptions;
  gif?: GifOptions;
  out?: string;
  data?: Record<string, unknown>;
  dataFile?: string;
  help: boolean;
}

function parseNumberFlag(name: string, value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) throw new AssetError(`--${name} debe ser un número positivo (recibido: "${value}")`);
  return n;
}

/** Como parseNumberFlag, pero acepta 0 (usado por --loop, donde 0 = infinito). */
function parseNonNegativeNumberFlag(name: string, value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) throw new AssetError(`--${name} debe ser un número >= 0 (recibido: "${value}")`);
  return n;
}

export function parseCliArgs(argv: string[]): ParsedCliArgs {
  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      allowPositionals: true,
      strict: true,
      options: {
        format: { type: "string" },
        screenshot: { type: "string" },
        width: { type: "string" },
        height: { type: "string" },
        deviceScaleFactor: { type: "string" },
        viewport: { type: "string" },
        fullPage: { type: "boolean" },
        quality: { type: "string" },
        background: { type: "string" },
        transparent: { type: "boolean" },
        page: { type: "string" },
        landscape: { type: "boolean" },
        margin: { type: "string" },
        duration: { type: "string" },
        fps: { type: "string" },
        loop: { type: "string" },
        gifWidth: { type: "string" },
        out: { type: "string" },
        data: { type: "string" },
        dataFile: { type: "string" },
        help: { type: "boolean", short: "h" },
      },
    });
  } catch (err) {
    throw new AssetError(`Argumentos inválidos: ${(err as Error).message}`);
  }

  const { values, positionals } = parsed;

  if (values.help) {
    return { format: "png", fullPage: false, transparent: false, help: true };
  }

  const format = (values.format ?? "png") as string;
  if (!FORMATS.includes(format as OutputFormat)) {
    throw new AssetError(`--format inválido: "${format}" (usá png, jpg o pdf)`);
  }

  if (!values.screenshot && positionals.length === 0) {
    throw new AssetError('Falta el template a generar, o --screenshot <ruta>. Probá "npm run asset:list".');
  }

  let viewport: Partial<ViewportSpec> | undefined;
  if (values.viewport) {
    const preset = VIEWPORT_PRESETS[values.viewport];
    if (!preset) {
      throw new AssetError(`--viewport inválido: "${values.viewport}" (usá desktop, tablet o mobile)`);
    }
    viewport = { ...preset };
  }
  const width = parseNumberFlag("width", values.width);
  const height = parseNumberFlag("height", values.height);
  const deviceScaleFactor = parseNumberFlag("deviceScaleFactor", values.deviceScaleFactor);
  if (width !== undefined || height !== undefined || deviceScaleFactor !== undefined) {
    viewport = { ...viewport, ...(width !== undefined && { width }), ...(height !== undefined && { height }), ...(deviceScaleFactor !== undefined && { deviceScaleFactor }) };
  }

  const quality = parseNumberFlag("quality", values.quality);
  if (quality !== undefined && (quality < 0 || quality > 100)) {
    throw new AssetError(`--quality debe estar entre 0 y 100 (recibido: ${quality})`);
  }

  let pdf: PdfOptions | undefined;
  if (format === "pdf" || values.page || values.landscape || values.margin) {
    const pageSize = (values.page ?? "A4") as string;
    if (!PDF_PAGE_SIZES.includes(pageSize as (typeof PDF_PAGE_SIZES)[number])) {
      throw new AssetError(`--page inválido: "${pageSize}" (usá A4 o Letter)`);
    }
    pdf = { format: pageSize as PdfOptions["format"], landscape: Boolean(values.landscape), margin: values.margin };
  }

  let gif: GifOptions | undefined;
  if (format === "gif" || values.duration || values.fps || values.loop || values.gifWidth) {
    gif = {
      durationMs: parseNumberFlag("duration", values.duration),
      fps: parseNumberFlag("fps", values.fps),
      loop: parseNonNegativeNumberFlag("loop", values.loop),
      width: parseNumberFlag("gifWidth", values.gifWidth),
    };
  }

  let data: Record<string, unknown> | undefined;
  if (values.data) {
    try {
      data = JSON.parse(values.data) as Record<string, unknown>;
    } catch (err) {
      throw new AssetError(`--data no es JSON válido: ${(err as Error).message}`);
    }
  }

  return {
    template: positionals[0],
    screenshot: values.screenshot,
    format: format as OutputFormat,
    viewport,
    fullPage: Boolean(values.fullPage),
    quality,
    transparent: Boolean(values.transparent),
    background: values.background,
    pdf,
    gif,
    out: values.out,
    data,
    dataFile: values.dataFile,
    help: false,
  };
}

export const HELP_TEXT = `
Uso:
  npm run asset:generate -- <template> [flags]
  npm run asset:generate -- --screenshot <ruta> [flags]
  npm run asset:list

Flags:
  --format <png|jpg|pdf|gif> Formato de salida (default: png)
  --screenshot <ruta>        Captura una ruta/página en vivo en vez de un template
                              ("/chat" usa SCREENSHOT_BASE_URL, o pasá una URL completa)
  --width <n> --height <n>   Tamaño del viewport/artboard en px
  --deviceScaleFactor <n>    Nitidez (2 = retina). Default: 2
  --viewport <desktop|tablet|mobile>  Atajo de --width/--height
  --fullPage                 Captura la página completa (screenshots), no solo el viewport
  --quality <0-100>          Calidad jpg (default: 90)
  --transparent               PNG con fondo transparente (requiere CSS transparente en el template)
  --background <color>       Color de fondo a forzar cuando no es transparente
  --page <A4|Letter>          Tamaño de página (pdf, default: A4)
  --landscape                 Orientación horizontal (pdf)
  --margin <valor>            "10mm" (los 4 lados) o "top,right,bottom,left" (pdf)
  --duration <ms>             Duración de la captura (gif, default: 3000)
  --fps <n>                   Cuadros por segundo capturados/exportados (gif, default: 10)
  --loop <n>                  Repeticiones del gif; 0 = infinito (gif, default: 0)
  --gifWidth <n>              Ancho de salida en px; Sharp redimensiona cada frame (gif)
  --out <ruta>                 Fuerza la ruta/nombre de salida, ignorando ASSETS_OUTPUT_DIR
  --data '<json>'              Datos para el template, como JSON inline
  --dataFile <ruta>            Datos para el template, como archivo .json
  --help, -h                   Muestra esta ayuda

Ejemplos:
  npm run asset:generate -- chat-message --format png --data '{"user":"Eder","message":"Hola","time":"10:32","status":"online"}'
  npm run asset:generate -- documents/report --format pdf --dataFile ./scripts/assets/templates/documents/report/data.example.json
  npm run asset:generate -- --screenshot /chat --format png --viewport desktop
  npm run asset:generate -- --screenshot /chat --format gif --duration 4000 --fps 12 --gifWidth 480
`;
