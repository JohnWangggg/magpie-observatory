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
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import os from "node:os";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(HERE, "public");
const DEFAULT_PORT = 3488;
const ENV_MAGPIE_URL = (process.env.MAGPIE_URL || "").replace(/\/+$/, "");
const MAGPIE_KEY = (process.env.MAGPIE_KEY || "").trim();

// The gateway is not always on 3425: `magpie web --addr`, a second instance
// on another port and a gateway started after the plugin all move it. The
// app writes the live one to gateway.json, so read it and re-read it after a
// failed fetch instead of pinning the default forever.
// Magpie's plugin page runs in a sandboxed frame (sandbox="allow-scripts"),
// so its origin is opaque: every fetch the dashboard makes arrives as
// `Origin: null` and a same-origin read is, to the browser, cross-origin.
// Allow exactly that origin, with a token only the served index.html knows,
// so other pages (a data: or sandboxed frame anywhere) can't read this.
const PAGE_TOKEN = (process.env.MAGPIE_PAGE_TOKEN || "").trim() || randomBytes(32).toString("hex");

function apiCors(req) {
  if (req.headers.origin !== "null") return null;
  return {
    "Access-Control-Allow-Origin": "null",
    "Access-Control-Allow-Headers": "x-magpie-api-token",
    "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
    "Access-Control-Max-Age": "600",
    Vary: "Origin",
  };
}

function tokenMatches(header) {
  const got = Buffer.from(String(header || ""));
  const want = Buffer.from(PAGE_TOKEN);
  return got.length === want.length && got.length > 0 && timingSafeEqual(got, want);
}

// undefined origin is our own page in a tab, curl or the address bar; "null"
// is the sandboxed frame and must carry the page's token; anything else is a
// website's page and gets nothing.
function apiAllowed(req) {
  const origin = req.headers.origin;
  if (origin === undefined) return true;
  if (origin !== "null") return false;
  return tokenMatches(req.headers["x-magpie-api-token"]);
}

const GATEWAY_FILE = path.join(
  process.env.MAGPIE_CONFIG_DIR || path.join(os.homedir(), ".config", "magpie"),
  "gateway.json"
);
let gateway = { url: "", at: 0 };

async function gatewayBase(force, override) {
  if (override) {
    const url = /^https?:\/\//i.test(override) ? override.replace(/\/+$/, "") : `http://${override}`;
    return url;
  }
  if (ENV_MAGPIE_URL) return ENV_MAGPIE_URL;
  if (!force && gateway.url && Date.now() - gateway.at < 10000) return gateway.url;
  let addr = "";
  try {
    const body = JSON.parse(await fs.readFile(GATEWAY_FILE, "utf8"));
    addr = String((body && body.addr) || "").trim();
  } catch { /* no gateway yet: the app may not have written it */ }
  const url = /^https?:\/\//i.test(addr)
    ? addr.replace(/\/+$/, "")
    : /^[\w.-]+:\d+$/.test(addr)
      ? `http://${addr}`
      : "http://127.0.0.1:3425";
  gateway = { url, at: Date.now() };
  return url;
}
const PERIODS = new Set(["today", "week", "month", "all"]);
const VERSION = "0.82.0";

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

async function magpieGet(endpoint, timeout = 2500, base = null) {
  base = base || await gatewayBase();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    const headers = { Accept: "application/json" };
    if (MAGPIE_KEY) headers.Authorization = `Bearer ${MAGPIE_KEY}`;
    const res = await fetch(base + endpoint, { headers, signal: ctrl.signal, redirect: "error" });
    if (!res.ok) {
      if (res.status >= 500) gateway.at = 0; // the gateway may have moved
      throw new Error(`${endpoint} → HTTP ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    gateway.at = 0; // a refused connection: read gateway.json again next time
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// The GUI's /api/usage/heatmap is not served by every Magpie process (the
// tray gateway answers 404). Build the same shape from the all-time daily
// usage series instead, and keep it for five minutes: 371 day cells are
// cheap to draw but not worth fetching every 2.5s.
let heatmapFallback = { at: 0, days: [] };

async function usageHeatmap(base) {
  if (heatmapFallback.days.length && Date.now() - heatmapFallback.at < 300000) {
    return { days: heatmapFallback.days };
  }
  const all = await magpieGet("/v1/magpie/usage?period=all", 4000, base);
  const days = (all.series || []).map(d => ({
    date: String(d.time || "").slice(0, 10),
    calls: d.calls || 0,
    tokens: (d.input || 0) + (d.output || 0) + (d.cache_read || 0),
  })).filter(d => d.date);
  if (days.length) heatmapFallback = { at: Date.now(), days };
  return { days };
}

// The trace carries order/affinity/conv/prompt fields the dashboard never
// reads. Drop them before the snapshot crosses the wire; 60 routes shrink from
// ~400 KB to a few tens of KB.
function slimTrace(body) {
  if (!body || !Array.isArray(body.routes)) return body;
  return {
    ...body,
    routes: body.routes.map(r => ({
      seq: r.seq, id: r.id, time: r.time, agent: r.agent, model: r.model,
      provider: r.provider, session: r.session, folder: r.folder,
      group: r.group, rule: r.rule, done: r.done, status: r.status,
      served: r.served,
      tries: Array.isArray(r.tries) ? r.tries.map(t => ({
        id: t.id, model: t.model, effort: t.effort, start: t.start,
        done: t.done, status: t.status, ms: t.ms, ttft: t.ttft,
        firstText: t.firstText, served: t.served
      })) : []
    }))
  };
}

// The request ledger has more fields than the dashboard reads (URLs, byte
// counts, response ids, stream details). Keep the fields the UI maps and drop
// the rest before the 80-row page crosses the wire.
function slimRequests(body) {
  if (!body || !Array.isArray(body.rows)) return body;
  return {
    period: body.period, total: body.total, offset: body.offset,
    rows: body.rows.map(r => ({
      id: r.id, route_id: r.route_id, t: r.t, time: r.time,
      agent: r.agent, agentName: r.agentName,
      session: r.session, native_session: r.native_session,
      provider: r.provider, served: r.served, model: r.model,
      status: r.status, in: r.in, out: r.out, cache_read: r.cache_read,
      cost: r.cost, ttft_ms: r.ttft_ms, first_text_ms: r.first_text_ms,
      decode_ms: r.decode_ms, decode_out: r.decode_out, ms: r.ms
    }))
  };
}

// Requests are newest-first and immutable once logged, so a client that names
// the newest row it already has only needs the rows above it.
function requestKey(r) { return String((r && (r.route_id || r.t)) || ""); }

function requestsDelta(body, cursor) {
  const rows = Array.isArray(body && body.rows) ? body.rows : [];
  if (!cursor || !rows.length) return null;
  const at = rows.findIndex(r => requestKey(r) === cursor);
  if (at < 0) return null;
  const head = rows.slice(0, at);
  return {
    delta: true,
    cursor: head.length ? requestKey(head[0]) : cursor,
    head,
    total: body.total, offset: body.offset, period: body.period
  };
}

// Quota history is a long point series; the burn-down needs the recent slope,
// not every point ever kept. Keep the last 40 points per line and drop lines
// that cannot draw.
function slimQuotaHistory(body) {
  if (!body || !Array.isArray(body.data)) return body;
  return {
    ...body,
    data: body.data.map(x => ({
      ...x,
      lines: (Array.isArray(x.lines) ? x.lines : [])
        .map(l => {
          // Normalize first: a missing stamp and an explicit null must not be
          // confused once a dropped key means "same as the previous point".
          const points = (Array.isArray(l.points) ? l.points.slice(-40) : []).map(p =>
            p && typeof p === "object"
              ? { at: p.at, left: p.left, start: p.start ?? null, resetsAt: p.resetsAt ?? null }
              : p
          );
          let prev = null;
          const slim = points.map(p => {
            if (!p || typeof p !== "object") return p;
            const out = { ...p };
            if (prev) {
              // `start`/`resetsAt` repeat for every point in a window; the
              // client forward-fills them, so only store a change.
              if (out.start === prev.start) delete out.start;
              if (out.resetsAt === prev.resetsAt) delete out.resetsAt;
            }
            prev = p;
            return out;
          });
          return { ...l, points: slim };
        })
        .filter(l => l.points.length >= 2)
    })).filter(x => x.lines.length)
  };
}

// The quota history is a long per-window point series — heavier than every
// other read, and the shape of a burn-down does not change between two
// 2.5s snapshots. Keep the last good answer for a minute and serve it from
// cache in between; a gateway that does not serve the endpoint simply leaves
// the key missing.
let quotaHistoryCache = { at: 0, body: null, token: "" };

// `token` is a content hash: a client that sends back the hash it already has
// gets a tiny `{delta:true}` instead of the whole ~59 KB series.
async function quotaHistory(token, base) {
  if (quotaHistoryCache.body && Date.now() - quotaHistoryCache.at < 60000) {
    if (token && token === quotaHistoryCache.token) return { delta: true, token };
    return { ...quotaHistoryCache.body, token: quotaHistoryCache.token };
  }
  const body = slimQuotaHistory(await magpieGet("/v1/magpie/quotas/history", 4000, base));
  const json = JSON.stringify(body);
  const hash = createHash("sha1").update(json).digest("hex").slice(0, 12);
  quotaHistoryCache = { at: Date.now(), body, token: hash };
  return { ...body, token: hash };
}

// The gateway keeps the newest 60 routes and takes `after=<route seq>` for the
// tail. Cache that window so a client which stays in sync receives only the
// routes added since its last snapshot instead of the whole 60-route page.
let traceCache = { seq: 0, routes: [], at: 0 };
const TRACE_WINDOW = 60;

async function tracePayload(since, base) {
  const inSync = traceCache.seq > 0 && since === traceCache.seq && Date.now() - traceCache.at < 30000;
  let body = inSync
    ? await magpieGet(`/v1/magpie/trace?after=${traceCache.seq}`, 2500, base)
    : await magpieGet("/v1/magpie/trace?after=0", 2500, base);
  const freshSeq = Number(body && body.seq) || 0;
  // A restarted gateway numbers from the other side; recover with a full read.
  let full = !inSync || !freshSeq || freshSeq < traceCache.seq;
  if (!full && !Array.isArray(body.routes)) {
    body = await magpieGet("/v1/magpie/trace?after=0");
    full = true;
  }
  const slim = slimTrace(body);
  const routes = Array.isArray(slim.routes) ? slim.routes : [];
  const seq = Number(slim.seq) || freshSeq || traceCache.seq;
  if (full) {
    traceCache = { seq, routes: routes.slice(-TRACE_WINDOW), at: Date.now() };
    return { seq, delta: false, routes: traceCache.routes };
  }
  const seen = new Set(traceCache.routes.map(r => r.id));
  const added = routes.filter(r => r && !seen.has(r.id));
  if (added.length) traceCache.routes = traceCache.routes.concat(added).slice(-TRACE_WINDOW);
  traceCache = { seq, routes: traceCache.routes, at: Date.now() };
  return { seq, delta: true, routes: added };
}

export async function snapshot(period = "today", since = 0, qh = "", rq = "", gw = "") {
  if (!PERIODS.has(period)) period = "today";
  const base = gw ? await gatewayBase(false, gw) : null;
  const calls = {
    trace: "/v1/magpie/trace?after=0",
    quotas: "/v1/magpie/quotas?kept=1",
    usage: `/v1/magpie/usage?period=${period}`,
    concurrency: "/v1/magpie/concurrency",
    requests: `/v1/magpie/usage/requests?period=${period}&limit=60`,
    heatmap: "/api/usage/heatmap?period=all",
    quotaHistory: "/v1/magpie/quotas/history",
  };
  const data = {};
  const errors = {};
  let requestsBody = null;
  await Promise.all(Object.entries(calls).map(async ([name, endpoint]) => {
    try {
      if (name === "requests") requestsBody = await magpieGet(endpoint, 2500, base);
      data[name] = name === "quotaHistory" ? await quotaHistory(qh, base)
        : name === "trace" ? await tracePayload(since, base)
        : name === "requests" ? (() => {
            const slim = slimRequests(requestsBody);
            return requestsDelta(slim, rq) || { ...slim, cursor: slim.rows && slim.rows.length ? requestKey(slim.rows[0]) : "" };
          })()
        : await magpieGet(endpoint, 2500, base);
    }
    catch (err) { errors[name] = err?.message || String(err); }
  }));
  if (!data.heatmap) {
    try {
      data.heatmap = await usageHeatmap(base);
      delete errors.heatmap;
    } catch (err) {
      errors.heatmapFallback = err?.message || String(err);
    }
  }
  return {
    ok: Boolean(data.trace || data.usage || data.quotas),
    gateway: new URL(await gatewayBase(false, gw)).host,
    fetchedAt: Date.now(),
    period,
    data,
    errors,
  };
}

function json(res, status, body, extra = {}) {
  const buf = Buffer.from(JSON.stringify(body));
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Content-Length": buf.length,
    "X-Observatory-Version": VERSION,
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    ...extra,
  });
  res.end(buf);
}

async function handler(req, res) {
  const url = new URL(req.url || "/", "http://127.0.0.1");
  const pathname = decodeURIComponent(url.pathname);

  // the sandboxed page's preflight (its fetch names the token header)
  if (req.method === "OPTIONS" && pathname.startsWith("/api/")) {
    res.writeHead(204, { "Cache-Control": "no-store", ...(apiCors(req) || {}) });
    res.end();
    return;
  }
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { "Content-Type": "text/plain; charset=utf-8", "Allow": "GET, HEAD, OPTIONS" });
    res.end("Method not allowed");
    return;
  }
  const cors = pathname.startsWith("/api/") ? (apiCors(req) || {}) : {};
  const sent = (status, body) => json(res, status, body, cors);
  if (pathname.startsWith("/api/") && !apiAllowed(req)) {
    sent(403, { ok: false, error: "forbidden" });
    return;
  }

  if (pathname === "/api/health") {
    const gw = url.searchParams.get("gw") || "";
    try {
      await magpieGet("/v1/magpie/usage?period=today", 1500, gw ? await gatewayBase(false, gw) : null);
      return sent(200, { ok: true, gateway: new URL(await gatewayBase(false, gw)).host });
    } catch (err) {
      return sent(503, { ok: false, gateway: new URL(await gatewayBase(false, gw)).host, error: err?.message || String(err) });
    }
  }
  if (pathname === "/api/snapshot") {
    const period = url.searchParams.get("period") || "today";
    const since = Math.max(0, Number(url.searchParams.get("since")) || 0);
    const qh = String(url.searchParams.get("qh") || "").slice(0, 40);
    const rq = String(url.searchParams.get("rq") || "").slice(0, 60);
    const gw = String(url.searchParams.get("gw") || "").slice(0, 80);
    try { return sent(200, await snapshot(period, since, qh, rq, gw)); }
    catch (err) { return sent(502, { ok: false, error: err?.message || String(err) }); }
  }
  if (pathname === "/api/version") {
    return sent(200, { name: "magpie-observatory", version: VERSION });
  }

  let rel = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const file = path.resolve(PUBLIC, rel);
  if (!file.startsWith(PUBLIC + path.sep)) { res.writeHead(403); return res.end("Forbidden"); }
  try {
    const stat = await fs.stat(file);
    if (stat.isDirectory()) return handler({ ...req, url: rel.replace(/\/?$/, "/index.html") }, res);
    let body = await fs.readFile(file);
    if (rel === "index.html") {
      // the sandboxed frame's fetch proves it read this page
      body = Buffer.from(
        body.toString("utf8").replace("</head>", `<meta name="magpie-api-token" content="${PAGE_TOKEN}"></head>`),
        "utf8"
      );
    }
    res.writeHead(200, {
      "Content-Type": TYPES[path.extname(file).toLowerCase()] || "application/octet-stream",
      "Cache-Control": "no-store, max-age=0",
      "Content-Length": body.length,
      "X-Observatory-Version": VERSION,
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
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
