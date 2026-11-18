// Cheap structural checks; no browser dependency. The quota math has its own
// tests in test-quota.mjs. This catches a missing panel/page file or a
// package that no longer ships what it declares.
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

const root = new URL("../", import.meta.url);
const read = (p) => fs.readFileSync(new URL(p, root), "utf8");
const exists = (p) => fs.existsSync(new URL(p, root));
const pkg = JSON.parse(read("package.json"));

assert.equal(pkg.name, "magpie-observatory");
assert.equal(pkg.type, "module");
assert.ok(pkg.magpie && pkg.magpie.page, "magpie.page");
assert.ok(exists(pkg.magpie.page.file), `page file ${pkg.magpie.page.file}`);
assert.ok(Array.isArray(pkg.magpie.permissions) && pkg.magpie.permissions.includes("usage:summary"), "page permission");
assert.ok(Array.isArray(pkg.magpie.panels) && pkg.magpie.panels.length === 1, "one panel");
assert.equal(pkg.magpie.panels[0].slot, "usage");
assert.equal(pkg.magpie.panels[0].file, "panels/usage.html");
assert.ok(exists(pkg.magpie.panels[0].file), "panel file");
assert.equal(pkg.magpie.options.port, 3488);
for (const need of [
  "public/focus.html",
  "public/assets/focus.js",
  "public/assets/focus.css",
  "public/assets/quota.js",
  "public/assets/data.js",
  "panels/usage.html",
  "panels/usage.js",
  "panels/usage.css",
]) {
  assert.ok(pkg.files.some((f) => f === need || need.startsWith(f + "/")), `package files covers ${need}`);
  assert.ok(exists(need), `${need} exists`);
}

const focus = read("public/focus.html");
for (const id of ["now-list", "kpis", "quota-list", "mix-list", "mix-seg", "periods", "banner"]) {
  assert.ok(focus.includes(`id="${id}"`), `focus has #${id}`);
}
assert.ok(focus.indexOf("assets/quota.js") < focus.indexOf("assets/focus.js"), "quota.js loads before focus.js");
for (const icon of [
  "workbuddy-color.svg", "commandcode.svg", "devin.svg", "zcode.png",
  "alma.png", "meta-color.svg", "sensenova-color.svg", "mimocode.svg",
  "omp.svg", "antigravity-color.svg", "dumate.svg"
]) {
  assert.ok(exists("public/assets/icons/" + icon), `brand icon ${icon}`);
}

const panel = read("panels/usage.html");
assert.ok(panel.includes("_magpie/bridge.js"), "panel uses the bridge");
assert.ok(panel.includes("usage.js") && panel.includes("usage.css"), "panel assets");

const server = read("server.mjs");
for (const route of ["/api/snapshot", "/api/usage", "/api/health"]) {
  assert.ok(server.includes(route), `server has ${route}`);
}
assert.ok(!server.includes("/v1/magpie/usage/requests"), "snapshot no longer fetches the ledger");
assert.ok(server.includes("OBSERVATORY_ALERT_DRY"), "alert dry-run switch");
assert.ok(server.includes("observatory-page-token"), "stable sandbox token");
assert.ok(read("public/assets/focus.js").includes("tokenReload"), "403 auto-reload");

console.log("structure: all checks passed");
