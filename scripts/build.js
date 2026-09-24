#!/usr/bin/env node
/**
 * Bundle library → dist/ for CDN / script-tag / package consumers.
 */
import * as esbuild from "esbuild";
import { cpSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const entry = join(root, "src/index.js");

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

const shared = {
  entryPoints: [entry],
  bundle: true,
  platform: "browser",
  target: ["es2020"],
  sourcemap: true,
  logLevel: "info",
};

await esbuild.build({
  ...shared,
  outfile: join(dist, "mgl-web-ime.js"),
  format: "esm",
});

await esbuild.build({
  ...shared,
  outfile: join(dist, "mgl-web-ime.min.js"),
  format: "esm",
  minify: true,
});

await esbuild.build({
  ...shared,
  outfile: join(dist, "mgl-web-ime.global.js"),
  format: "iife",
  globalName: "MglWebIme",
  minify: true,
});

// Combined CSS. Font URL stays root-absolute (/fonts/...) so it still works
// when a host @imports this file into e.g. /assets/css/app.css.
const cssParts = ["ime.css", "desktop.css", "mobile.css"].map((name) =>
  readFileSync(join(root, "styles", name), "utf8"),
);
writeFileSync(join(dist, "mgl-web-ime.css"), cssParts.join("\n"));

// Copy font for hosts to place at <site-root>/fonts/OyunQaganTig.ttf
mkdirSync(join(dist, "fonts"), { recursive: true });
cpSync(
  join(root, "fonts/OyunQaganTig.ttf"),
  join(dist, "fonts/OyunQaganTig.ttf"),
);

console.log("Built:");
console.log("  dist/mgl-web-ime.js        (ESM)");
console.log("  dist/mgl-web-ime.min.js    (ESM, minified)");
console.log("  dist/mgl-web-ime.global.js (IIFE → window.MglWebIme)");
console.log("  dist/mgl-web-ime.css");
console.log("  dist/fonts/OyunQaganTig.ttf  (serve as /fonts/OyunQaganTig.ttf)");
