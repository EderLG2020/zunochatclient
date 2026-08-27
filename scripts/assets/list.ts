import { listTemplates } from "./templates-registry.ts";
import { formatErrorForTerminal } from "./errors.ts";

async function main(): Promise<void> {
  const templates = await listTemplates();

  if (templates.length === 0) {
    console.log("No hay templates en scripts/assets/templates/.");
    return;
  }

  console.log("Templates disponibles:\n");

  let currentCategory = "";
  for (const t of templates) {
    if (t.category !== currentCategory) {
      currentCategory = t.category;
      console.log(`${currentCategory}/`);
    }
    const size = `${t.meta.width ?? 1200}x${t.meta.height ?? 630}`;
    console.log(`  ${t.name}  (${size})`);
    if (t.meta.description) console.log(`    ${t.meta.description}`);
  }

  console.log('\nUso: npm run asset:generate -- <nombre> --format png');
}

main().catch((err) => {
  console.error(formatErrorForTerminal(err));
  process.exitCode = 1;
});
