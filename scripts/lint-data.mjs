#!/usr/bin/env node
// Shape-checks the demo dataset in public/assets/data.js:
// loads it in Node, asserts every session/recent/quota seed has the fields
// the renderer reads, and reports missing-icon files referenced by PROVIDERS.
// Usage: node scripts/lint-data.mjs

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const src = readFileSync(join(root, "public/assets/data.js"), "utf8");

// Evaluate the IIFE's exports by stubbing window.
const window_ = {};
new Function("window", src)(window_);
const D = window_.MagpieData;
if (!D) { console.error("window.MagpieData missing"); process.exit(1); }

const errs = [];
const need = (o, keys, where) => keys.forEach(k => {
  if (!(k in o)) errs.push(`${where}: missing '${k}'`);
});

// providers
const provs = D.PROVIDERS;
if (!provs) errs.push("providers map missing");
else for (const [k, p] of Object.entries(provs)) {
  need(p, ["name", "icon", "color"], `provider:${k}`);
}

const state = typeof D.mockState === "function" ? D.mockState() : null;
if (!state) errs.push("mockState() missing");
else {
  const sessions = state.sessions || [];
  if (!sessions.length) errs.push("sessions empty");
  sessions.forEach((s, i) => {
    need(s, ["id", "title", "agent", "provider", "model", "status", "tokens", "tps"], `session[${i}]`);
  });
  const quotas = state.quotas || [];
  quotas.forEach((q, i) => {
    need(q, ["provider", "windows"], `quota[${i}]`);
    (q.windows || []).forEach((w, j) => need(w, ["name", "used"], `quota[${i}].windows[${j}]`));
  });
  if (!Array.isArray(state.series)) errs.push("series missing");
  if (!Array.isArray(state.heatmap)) errs.push("heatmap missing");
  if (!Array.isArray(state.recent)) errs.push("recent missing");
}

// icons on disk
const iconDir = join(root, "public/assets/icons");
const have = new Set(readdirSync(iconDir));
if (provs) for (const [k, p] of Object.entries(provs)) {
  if (p.icon && !have.has(p.icon)) errs.push(`provider:${k} icon '${p.icon}' not in assets/icons/`);
}

if (errs.length) {
  console.error("lint-data: " + errs.length + " problem(s)");
  errs.forEach(e => console.error("  " + e));
  process.exit(1);
}
const sCount = state ? (state.sessions || []).length : 0;
const qCount = state ? (state.quotas || []).length : 0;
console.log(`lint-data ok — ${Object.keys(provs || {}).length} providers, ${sCount} sessions, ${qCount} quota rows`);
