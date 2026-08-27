import fs from "node:fs/promises";
import path from "node:path";
import { HELP_TEXT, parseCliArgs } from "./cli-args.ts";
import { PROJECT_ROOT } from "./env.ts";
import { AssetError, formatErrorForTerminal } from "./errors.ts";
import { renderScreenshot, renderTemplate } from "./render.ts";

async function loadData(dataInline: Record<string, unknown> | undefined, dataFile: string | undefined): Promise<Record<string, unknown> | undefined> {
  let fromFile: Record<string, unknown> | undefined;
  if (dataFile) {
    const absPath = path.resolve(PROJECT_ROOT, dataFile);
    let raw: string;
    try {
      raw = await fs.readFile(absPath, "utf8");
    } catch (err) {
      throw new AssetError(`No se pudo leer --dataFile ${absPath}: ${(err as Error).message}`);
    }
    try {
      fromFile = JSON.parse(raw) as Record<string, unknown>;
    } catch (err) {
      throw new AssetError(`--dataFile ${absPath} no es JSON válido: ${(err as Error).message}`);
    }
  }

  if (!fromFile && !dataInline) return undefined;
  return { ...fromFile, ...dataInline }; // --data (inline) gana sobre --dataFile si se pasan ambos
}

async function main(): Promise<void> {
  const args = parseCliArgs(process.argv.slice(2));

  if (args.help) {
    console.log(HELP_TEXT);
    return;
  }

  const data = await loadData(args.data, args.dataFile);

  const shared = {
    format: args.format,
    outPath: args.out,
    viewport: args.viewport,
    fullPage: args.fullPage,
    quality: args.quality,
    transparent: args.transparent,
    background: args.background,
    pdf: args.pdf,
    gif: args.gif,
  };

  const outputPath = args.screenshot
    ? await renderScreenshot({ ...shared, route: args.screenshot })
    : await renderTemplate({ ...shared, template: args.template!, data });

  console.log(`✅ Generado: ${path.relative(PROJECT_ROOT, outputPath)}`);
}

main().catch((err) => {
  console.error(formatErrorForTerminal(err));
  process.exitCode = 1;
});
