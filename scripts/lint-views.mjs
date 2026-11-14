#!/usr/bin/env node
// Per-file checks for views/<id>.js:
//   1. registers window.ObservatoryViews["<id>"] (id from filename or file content)
//   2. has a companion views/<id>.css (warn only — canvas views skip styling)
//   3. exports a render function
// Usage: node scripts/lint-views.mjs

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const dir = join(root, "public/assets/views");
const js = readdirSync(dir).filter(f => f.endsWith(".js") && f !== "manifest.js");
const errs = [], warns = [];

for (const f of js) {
  const id = f.replace(/\.js$/, "");
  const src = readFileSync(join(dir, f), "utf8");
  // 1) registers itself
  const reg = new RegExp(`ObservatoryViews\\s*\\[\\s*["'\`]${id}["'\`]\\s*\\]`).test(src)
    || new RegExp(`ObservatoryViews\\s*\\[\\s*VIEW\\s*\\]`).test(src) && new RegExp(`const VIEW\\s*=\\s*["'\`]${id}["'\`]`).test(src);
  if (!reg) errs.push(`${f}: no ObservatoryViews["${id}"] registration`);
  // 2) companion css
  if (!existsSync(join(dir, `${id}.css`))) warns.push(`${f}: no ${id}.css (ok for canvas views)`);
  // 3) render export
  if (!/render\s*[:\(,]/.test(src) && !/function render/.test(src)) errs.push(`${f}: no render function`);
}

if (warns.length) { console.log("lint-views warnings:"); warns.forEach(w => console.log("  " + w)); }
if (errs.length) {
  console.error("lint-views: " + errs.length + " problem(s)");
  errs.forEach(e => console.error("  " + e));
  process.exit(1);
}
console.log(`lint-views ok — ${js.length} view modules registered`);
