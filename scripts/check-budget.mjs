import { readdir, readFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import assert from "node:assert/strict";
const files = await readdir("dist/assets");
const manifest = JSON.parse(await readFile("dist/.vite/manifest.json", "utf8"));
const publicFiles = new Set();
function include(key) {
  const chunk = manifest[key];
  if (publicFiles.has(chunk.file)) return;
  publicFiles.add(chunk.file);
  for (const dependency of chunk.imports || []) include(dependency);
}
for (const [key, chunk] of Object.entries(manifest))
  if (
    chunk.isEntry ||
    key === "src/pages/Public.tsx" ||
    ["firebase", "demo"].includes(chunk.name) ||
    key.includes("animejs")
  )
    include(key);
let publicJs = 0;
for (const file of publicFiles)
  publicJs += gzipSync(await readFile(`dist/${file}`)).length;
assert.ok(publicJs <= 250 * 1024, `Public JS ${publicJs} exceeds 250 KiB`);
let js = 0,
  fonts = 0,
  css = 0;
for (const file of files) {
  const data = await readFile(`dist/assets/${file}`);
  if (file.endsWith(".js")) js += gzipSync(data).length;
  if (file.endsWith(".woff2")) fonts += data.length;
  if (file.endsWith(".css")) css += gzipSync(data).length;
}
// Total JS is stricter than the authenticated entry budget because routes are lazy.
assert.ok(js <= 350 * 1024, `All compressed JS ${js} exceeds 350 KiB`);
assert.ok(fonts <= 100 * 1024, `Fonts ${fonts} exceed 100 KiB`);
assert.ok(js + fonts + css <= 500 * 1024, "Transfer budget exceeded");
console.log(
  `Budgets passed: public JS ${(publicJs / 1024).toFixed(1)} KiB; all JS ${(js / 1024).toFixed(1)} KiB gzip; fonts ${(fonts / 1024).toFixed(1)} KiB; CSS ${(css / 1024).toFixed(1)} KiB gzip.`,
);
