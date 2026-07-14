import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import config from "../lingui.config.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "dist", "locales");
const catalogPath = config.catalogs[0].path;

for (const locale of config.locales) {
  const poPath = path.join(
    root,
    `${catalogPath.replace("{locale}", locale)}.po`,
  );
  if (!fs.existsSync(poPath)) {
    console.warn(`[standalone] ${poPath} not found, skipping`);
    continue;
  }
  const entries = config.format.parse(fs.readFileSync(poPath, "utf8"), {
    locale,
    sourceLocale: config.sourceLocale,
    filename: poPath,
  });
  const messages = {};
  for (const [id, entry] of Object.entries(entries)) {
    messages[id] = entry.translation || entry.message || "";
  }
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, `${locale}.json`),
    JSON.stringify(messages, null, 2),
  );
  console.log(`compiled ${locale}: ${Object.keys(messages).length} messages`);
}
