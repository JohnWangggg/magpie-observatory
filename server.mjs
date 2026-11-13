// Magpie Observatory — the local HTTP service behind the plugin page.
//
// The page Magpie shows is a launcher (page/index.html); it navigates the
// frame to this service. The service serves the dashboard from public/ and
// proxies Magpie's documented read-only APIs, so the page never needs
// network access beyond its own origin.

import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(HERE, "public");
const DEFAULT_PORT = 3488;
const MAGPIE_URL = (process.env.MAGPIE_URL || "http://127.0.0.1:3425").replace(/\/+$/, "");
const MAGPIE_KEY = (process.env.MAGPIE_KEY || "").trim();
const PERIODS = new Set(["today", "week", "month", "all"]);
const VERSION = "0.7.0";

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

async function magpieGet(endpoint, timeout = 2500) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    const headers = { Accept: "application/json" };
    if (MAGPIE_KEY) headers.Authorization = `Bearer ${MAGPIE_KEY}`;
    const res = await fetch(MAGPIE_URL + endpoint, { headers, signal: ctrl.signal, redirect: "error" });
    if (!res.ok) throw new Error(`${endpoint} → HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

// The GUI's /api/usage/heatmap is not served by every Magpie process (the
// tray gateway answers 404). Build the same shape from the all-time daily
// usage series instead, and keep it for five minutes: 371 day cells are
// cheap to draw but not worth fetching every 2.5s.
let heatmapFallback = { at: 0, days: [] };

async function usageHeatmap() {
  if (heatmapFallback.days.length && Date.now() - heatmapFallback.at < 300000) {
    return { days: heatmapFallback.days };
  }
  const all = await magpieGet("/v1/magpie/usage?period=all", 4000);
  const days = (all.series || []).map(d => ({
    date: String(d.time || "").slice(0, 10),
    calls: d.calls || 0,
    tokens: (d.input || 0) + (d.output || 0) + (d.cache_read || 0),
  })).filter(d => d.date);
  if (days.length) heatmapFallback = { at: Date.now(), days };
  return { days };
}

export async function snapshot(period = "today") {
  if (!PERIODS.has(period)) period = "today";
  const calls = {
    trace: "/v1/magpie/trace?after=0",
    quotas: "/v1/magpie/quotas?kept=1",
    usage: `/v1/magpie/usage?period=${period}`,
    concurrency: "/v1/magpie/concurrency",
    requests: `/v1/magpie/usage/requests?period=${period}&limit=80`,
    heatmap: "/api/usage/heatmap?period=all",
  };
  const data = {};
  const errors = {};
  await Promise.all(Object.entries(calls).map(async ([name, endpoint]) => {
    try { data[name] = await magpieGet(endpoint); }
    catch (err) { errors[name] = err?.message || String(err); }
  }));
  if (!data.heatmap) {
    try {
      data.heatmap = await usageHeatmap();
      delete errors.heatmap;
    } catch (err) {
      errors.heatmapFallback = err?.message || String(err);
    }
  }
  return {
    ok: Boolean(data.trace || data.usage || data.quotas),
    gateway: new URL(MAGPIE_URL).host,
    fetchedAt: Date.now(),
    period,
    data,
    errors,
  };
}

function json(res, status, body) {
  const buf = Buffer.from(JSON.stringify(body));
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Content-Length": buf.length,
    "X-Observatory-Version": VERSION,
  });
  res.end(buf);
}

async function handler(req, res) {
  const url = new URL(req.url || "/", "http://127.0.0.1");
  const pathname = decodeURIComponent(url.pathname);

  if (pathname === "/api/health") {
    try {
      await magpieGet("/v1/magpie/usage?period=today", 1500);
      return json(res, 200, { ok: true, gateway: new URL(MAGPIE_URL).host });
    } catch (err) {
      return json(res, 503, { ok: false, gateway: new URL(MAGPIE_URL).host, error: err?.message || String(err) });
    }
  }
  if (pathname === "/api/snapshot") {
    const period = url.searchParams.get("period") || "today";
    try { return json(res, 200, await snapshot(period)); }
    catch (err) { return json(res, 502, { ok: false, error: err?.message || String(err) }); }
  }
  if (pathname === "/api/version") {
    return json(res, 200, { name: "magpie-observatory", version: VERSION });
  }

  let rel = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const file = path.resolve(PUBLIC, rel);
  if (!file.startsWith(PUBLIC + path.sep)) { res.writeHead(403); return res.end("Forbidden"); }
  try {
    const stat = await fs.stat(file);
    if (stat.isDirectory()) return handler({ ...req, url: rel.replace(/\/?$/, "/index.html") }, res);
    const body = await fs.readFile(file);
    res.writeHead(200, {
      "Content-Type": TYPES[path.extname(file).toLowerCase()] || "application/octet-stream",
      "Cache-Control": "no-store, max-age=0",
      "Content-Length": body.length,
      "X-Observatory-Version": VERSION,
    });
    res.end(body);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function startServer(options = {}) {
  const port = Number(options.port) > 0 ? Number(options.port) : DEFAULT_PORT;
  for (let attempt = 0; attempt < 50; attempt++) {
    try {
      const server = await new Promise((resolve, reject) => {
        const s = http.createServer((req, res) => {
          handler(req, res).catch((err) => {
            try { json(res, 500, { ok: false, error: err?.message || String(err) }); } catch { /* gone */ }
          });
        });
        s.once("error", reject);
        s.listen(port, "127.0.0.1", () => resolve(s));
      });
      const url = `http://127.0.0.1:${port}`;
      console.log(`[magpie-observatory] ${url}`);
      return { server, port, url };
    } catch (err) {
      if (err?.code !== "EADDRINUSE") throw err;
      await sleep(200);
    }
  }
  throw new Error(`port ${port} is still in use`);
}
