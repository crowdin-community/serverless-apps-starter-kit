import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { strToU8, zipSync } from "fflate";
import { build } from "vite";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Vite's emptyOutDir wipes dist, so compile catalogs after the build.
await build({ root, configFile: path.join(root, "vite.config.ts") });
await import("./compile-i18n.mjs");

// The app file (.crowdinapp) is what Crowdin installs and updates an app from: manifest.json and the build at the
// root of one zip. Where the app loads from is set in Crowdin, so `bundle` stays out of the packed manifest.
const manifest = JSON.parse(
  fs.readFileSync(path.join(root, "manifest.json"), "utf8"),
);
delete manifest.$schema;
delete manifest.identifier;
delete manifest.bundle;

const slug = String(manifest.name ?? "")
  .replace(/[^A-Za-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "")
  .toLowerCase();

// The ZIP epoch in local time: fflate reads the local date, and one before 1980 is out of its range.
const MTIME = new Date(1980, 0, 1);

function collect(dir, base = dir, out = {}) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, e.name);
    if (e.isDirectory()) collect(abs, base, out);
    else out[path.relative(base, abs).split(path.sep).join("/")] = abs;
  }
  return out;
}

const distDir = path.join(root, "dist");
const outFile = path.join(distDir, `${slug || "app"}.crowdinapp`);
const files = collect(distDir);
const zippable = {
  "manifest.json": [
    strToU8(`${JSON.stringify(manifest, null, 2)}\n`),
    { mtime: MTIME },
  ],
};
for (const rel of Object.keys(files).sort()) {
  if (rel === "manifest.json" || rel.endsWith(".crowdinapp")) continue;
  zippable[rel] = [
    new Uint8Array(fs.readFileSync(files[rel])),
    { mtime: MTIME },
  ];
}
fs.writeFileSync(outFile, zipSync(zippable));
console.log(`[standalone] built ${path.relative(root, outFile)}`);
