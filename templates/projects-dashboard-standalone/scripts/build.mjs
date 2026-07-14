import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { zipSync } from "fflate";
import { build } from "vite";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Vite's emptyOutDir wipes dist, so compile catalogs after the build.
await build({ root, configFile: path.join(root, "vite.config.ts") });
await import("./compile-i18n.mjs");

// fflate@0.8 rejects mtime:0 ("date not in range 1980-2099"); use the ZIP epoch.
const MTIME = new Date("1980-01-01T00:00:00Z");

function collect(dir, base = dir, out = {}) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, e.name);
    if (e.isDirectory()) collect(abs, base, out);
    else out[path.relative(base, abs).split(path.sep).join("/")] = abs;
  }
  return out;
}

const distDir = path.join(root, "dist");
const outFile = path.join(distDir, "bundle.zip");
const files = collect(distDir);
const zippable = {};
for (const rel of Object.keys(files).sort()) {
  if (path.resolve(files[rel]) === path.resolve(outFile)) continue;
  zippable[rel] = [
    new Uint8Array(fs.readFileSync(files[rel])),
    { mtime: MTIME },
  ];
}
fs.writeFileSync(outFile, zipSync(zippable));
console.log("[standalone] built dist/bundle.zip");
