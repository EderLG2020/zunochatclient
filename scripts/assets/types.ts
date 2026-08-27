/** Formatos de salida soportados por todo el pipeline (template render y screenshot en vivo). */
export type OutputFormat = "png" | "jpg" | "pdf" | "gif";

export interface ViewportSpec {
  width: number;
  height: number;
  deviceScaleFactor?: number;
}

export interface PdfOptions {
  format?: "A4" | "Letter";
  landscape?: boolean;
  /** CSS margin shorthand, ej. "20mm" (se aplica a los 4 lados) o "10mm,15mm,10mm,15mm" (top,right,bottom,left). */
  margin?: string;
}

export interface GifOptions {
  /** Duración total de la captura, en ms (default 3000). */
  durationMs?: number;
  /** Cuadros por segundo capturados y usados en el GIF de salida (default 10). */
  fps?: number;
  /** Veces que repite el GIF; 0 = infinito (default 0). */
  loop?: number;
  /** Ancho de salida en px (Sharp redimensiona cada frame antes de armar el GIF). Si se omite, usa el ancho del viewport. */
  width?: number;
}

/** Opciones de captura que ya no dependen de cómo se cargó la página (template vs. URL en vivo). */
export interface CaptureOptions {
  format: OutputFormat;
  outputPath: string;
  fullPage?: boolean;
  /** Solo aplica a jpg. 0-100. */
  quality?: number;
  /** Solo aplica a png: si es true, omite el fondo (requiere que el CSS de la página sea transparente). */
  transparent?: boolean;
  pdf?: PdfOptions;
  /** Solo aplica a gif. */
  gif?: GifOptions;
}

export interface TemplateMeta {
  /** Ancho por defecto del viewport/artboard, en px CSS. */
  width?: number;
  /** Alto por defecto del viewport/artboard, en px CSS. */
  height?: number;
  /** Descripción corta mostrada por `npm run asset:list`. */
  description?: string;
  /** deviceScaleFactor por defecto (nitidez). */
  deviceScaleFactor?: number;
}

export interface ResolvedTemplate {
  /** Nombre corto (nombre de carpeta), usado en la CLI: `chat-message`. */
  name: string;
  /** Categoría (carpeta padre): `chat`, `cards`, `social`, `documents`. */
  category: string;
  /** Ruta absoluta a la carpeta del template. */
  dir: string;
  /** Ruta absoluta a index.html dentro del template. */
  htmlPath: string;
  meta: TemplateMeta;
}
