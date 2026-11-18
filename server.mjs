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
import { execFile } from "node:child_process";
import os from "node:os";
import vm from "node:vm";

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
const CONFIG_DIR = process.env.MAGPIE_CONFIG_DIR || path.join(os.homedir(), ".config", "magpie");
const TOKEN_FILE = path.join(CONFIG_DIR, "observatory-page-token");
// Stable across service restarts: an already-open sandboxed page keeps its
// token. A random token per run made every plugin-host restart answer 403
// until the reader reloaded the page.
async function loadPageToken() {
  const env = (process.env.MAGPIE_PAGE_TOKEN || "").trim();
  if (env) return env;
  for (let i = 0; i < 3; i++) {
    try {
      const t = (await fs.readFile(TOKEN_FILE, "utf8")).trim();
      if (/^[a-f0-9]{64}$/.test(t)) return t;
    } catch { /* first run */ }
    const t = randomBytes(32).toString("hex");
    try {
      await fs.mkdir(CONFIG_DIR, { recursive: true });
      await fs.writeFile(TOKEN_FILE, t, { mode: 0o600, flag: "wx" });
      return t;
    } catch (err) {
      if (err?.code !== "EEXIST") return t;
      // Another service won the race; loop and read its token.
    }
  }
  return randomBytes(32).toString("hex");
}
const PAGE_TOKEN = await loadPageToken();

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

const GATEWAY_FILE = path.join(CONFIG_DIR, "gateway.json");
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
const PERIODS = new Set(["today", "7d", "30d", "all"]);
// The gateway takes today/7d/30d/all. `week` and `month` used to be what the
// page sent; the gateway silently answered 30d for both, so the 7-day tab was
// really a 30-day tab. Accept the old names and normalize them.
const PERIOD_ALIAS = { week: "7d", month: "30d", "7day": "7d", "30day": "30d" };
function periodOf(value) {
  const p = String(value || "");
  const norm = PERIOD_ALIAS[p] || p;
  return PERIODS.has(norm) ? norm : "today";
}
const VERSION = JSON.parse(await fs.readFile(path.join(HERE, "package.json"), "utf8")).version;
// The page and the background alert share one forecast implementation.
const quotaSandbox = { window: {} };
vm.runInNewContext(await fs.readFile(path.join(PUBLIC, "assets", "quota.js"), "utf8"), quotaSandbox);
const quotaRowsAt = quotaSandbox.window.ObservatoryQuota.rows;

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
    tokens: (d.input || 0) + (d.output || 0),
  })).filter(d => d.date);
  if (days.length) heatmapFallback = { at: Date.now(), days };
  return { days };
}

// The trace carries order/affinity/conv/prompt fields the dashboard never
// reads. Drop them before the snapshot crosses the wire; 60 routes shrink from
// ~400 KB to a few tens of KB.
function slimTrace(body) {
  if (!body || !Array.isArray(body.routes)) return body;
  const groupOf = (g) => g ? {
    id: g.id, ref: g.ref, name: g.name, routing: g.routing
  } : null;
  return {
    ...body,
    routes: body.routes.map(r => ({
      id: r.id, time: r.time, agent: r.agent, session: r.session,
      folder: r.folder, provider: r.provider, done: r.done, status: r.status,
      served: r.served, tokens: r.tokens, out: r.out, ms: r.ms, ttft: r.ttft,
      group: groupOf(r.group),
      usage: Array.isArray(r.usage) ? r.usage.map(u => ({
        provider: u.provider, model: u.model, in: u.in, out: u.out, cache_read: u.cache_read
      })) : [],
      tries: Array.isArray(r.tries) ? r.tries.map(t => ({
        id: t.id, model: t.model, effort: t.effort,
        done: t.done, status: t.status, ms: t.ms, ttft: t.ttft, firstText: t.firstText
      })) : []
    }))
  };
}

function slimQuotas(body) {
  if (!body || typeof body !== "object") return body;
  const data = (body.data || body || []).map((x) => ({
    provider: x.provider,
    name: x.name,
    user: x.user,
    plan: x.plan,
    kind: x.kind,
    balance: x.balance,
    windows: (x.windows || []).map((w) => ({
      name: w.name,
      used: w.used,
      remaining: w.remaining,
      resetsAt: w.resetsAt,
      limit: w.limit,
      display: w.display
    }))
  }));
  return { ...body, data };
}

// The focus page needs totals, models and accounts, not the per-agent /
// per-session / per-key breakdowns or the hour/day series. The raw usage
// response is 200–700 KB; this keeps the first snapshot small too.
function pick(o, keys) {
  const out = {};
  for (const k of keys) if (o && o[k] !== undefined) out[k] = o[k];
  return out;
}
function slimUsage(body) {
  if (!body || typeof body !== "object") return body;
  const usage = pick(body, [
    "period", "since", "calls", "errors", "retried", "canceled",
    "input", "output", "cache_read", "cache_write", "reasoning",
    "cost", "unpriced", "credits", "credited", "timed",
    "ttft_ms", "decode_ms", "decode_out", "decode_n", "bucket"
  ]);
  usage.models = (body.models || []).map((m) => pick(m, [
    "provider", "model", "name", "input", "output", "cache_read",
    "calls", "cost", "unpriced", "credits"
  ]));
  usage.accounts = (body.accounts || []).map((a) => pick(a, [
    "id", "provider", "host", "name", "model", "sub",
    "calls", "cost", "credits", "input", "output", "cache_read", "unpriced"
  ]));
  return usage;
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
          // 20 points still covers 6 hours on a 30-day window and 30
          // minutes on a 5-hour one; more is only weight on every first load.
          const points = (Array.isArray(l.points) ? l.points.slice(-20) : []).map(p =>
            p && typeof p === "object"
              ? {
                  at: p.at,
                  left: Number.isFinite(Number(p.left)) ? Math.round(Number(p.left) * 10) / 10 : p.left,
                  start: p.start ?? null,
                  resetsAt: p.resetsAt ?? null
                }
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

export async function snapshot(period = "today", since = 0, qh = "", gw = "") {
  period = periodOf(period);
  const base = gw ? await gatewayBase(false, gw) : null;
  const calls = {
    trace: "/v1/magpie/trace?after=0",
    quotas: "/v1/magpie/quotas?kept=1",
    usage: `/v1/magpie/usage?period=${period}`,
    concurrency: "/v1/magpie/concurrency",
    heatmap: "/api/usage/heatmap?period=all",
    quotaHistory: "/v1/magpie/quotas/history",
  };
  const data = {};
  const errors = {};
  await Promise.all(Object.entries(calls).map(async ([name, endpoint]) => {
    try {
      data[name] = name === "quotaHistory" ? await quotaHistory(qh, base)
        : name === "trace" ? await tracePayload(since, base)
        : name === "usage" ? slimUsage(await magpieGet(endpoint, 2500, base))
        : name === "quotas" ? slimQuotas(await magpieGet(endpoint, 2500, base))
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
    const gw = String(url.searchParams.get("gw") || "").slice(0, 80);
    try { return sent(200, await snapshot(period, since, qh, gw)); }
    catch (err) { return sent(502, { ok: false, error: err?.message || String(err) }); }
  }
  // The quiet view's baseline: one usage read, no trace, no ledger. Kept
  // separate so a today page can compare against the previous day without
  // pulling a second full snapshot.
  if (pathname === "/api/usage") {
    const period = periodOf(url.searchParams.get("period"));
    const gw = String(url.searchParams.get("gw") || "").slice(0, 80);
    try {
      const base = gw ? await gatewayBase(false, gw) : null;
      const usage = await magpieGet(`/v1/magpie/usage?period=${period}`, 4000, base);
      return sent(200, { ok: true, usage });
    } catch (err) {
      return sent(502, { ok: false, error: err?.message || String(err) });
    }
  }
  if (pathname === "/api/version") {
    return sent(200, { name: "magpie-observatory", version: VERSION });
  }

  // The quiet view is the product; the old 25-view dashboard stays on disk
  // as legacy and is not linked from anywhere.
  if (pathname === "/index.html") {
    res.writeHead(302, { Location: "/" });
    res.end();
    return;
  }
  let rel = pathname === "/" ? "focus.html" : pathname.replace(/^\/+/, "");
  const file = path.resolve(PUBLIC, rel);
  if (!file.startsWith(PUBLIC + path.sep)) { res.writeHead(403); return res.end("Forbidden"); }
  try {
    const stat = await fs.stat(file);
    if (stat.isDirectory()) return handler({ ...req, url: rel.replace(/\/?$/, "/index.html") }, res);
    let body = await fs.readFile(file);
    if (rel === "index.html" || rel === "focus.html") {
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

// ---------------------------------------------------------------- alerts ---
// The page tells you what is risky; this keeps the one thing that matters
// after it is closed: a local OS notification when an allowance will run out
// before it resets. It uses the same quota.js as the page, so there is one
// forecast implementation, not two. Cooldown is six hours per window; the
// first check runs 20 s after the service starts.
let monitorStarted = false;
function maskUser(v) {
  let s = String(v == null ? "" : v).trim();
  if (!s) return "";
  if (s.includes("****")) return s;
  if (s.includes("@")) {
    const [user, domain] = s.split("@");
    return (user.length <= 2 ? user.slice(0, 1) + "***" : user.slice(0, 2) + "***") + "@" + domain;
  }
  if (/^\d{5,}$/.test(s)) return s.slice(0, 3) + "****" + s.slice(-4);
  if (s.length > 24) return s.slice(0, 8) + "…";
  return s;
}
function fmtDur(min) {
  if (min == null || !Number.isFinite(min)) return "—";
  min = Math.max(0, min);
  if (min < 1) return "不到 1 分钟";
  if (min < 60) return `${Math.round(min)} 分钟`;
  const h = Math.floor(min / 60), m = Math.round(min % 60);
  if (h < 24) return m ? `${h} 小时 ${m} 分` : `${h} 小时`;
  const d = Math.floor(h / 24);
  return `${d} 天${h % 24 ? ` ${h % 24} 小时` : ""}`;
}
function notifyOS(title, body) {
  if (process.env.OBSERVATORY_ALERT_DRY === "1") {
    console.log(`[observatory] alert: ${title} · ${body}`);
    return;
  }
  if (process.platform === "darwin") {
    const script = "on run argv\n display notification (item 1 of argv) with title (item 2 of argv)\nend run";
    execFile("osascript", ["-e", script, "--", body, title], (err) => {
      if (err) console.error("[observatory] notification failed:", err.message);
    });
  } else if (process.platform === "linux") {
    execFile("notify-send", [title, body], (err) => {
      if (err) console.error("[observatory] notification failed:", err.message);
    });
  } else {
    console.log(`[observatory] alert: ${title} · ${body}`);
  }
}
function startMonitor() {
  if (monitorStarted) return;
  monitorStarted = true;
  const seen = new Map();
  const COOLDOWN = 6 * 60 * 60 * 1000;
  async function check() {
    try {
      const base = await gatewayBase();
      const [quotasRaw, historyRaw] = await Promise.all([
        magpieGet("/v1/magpie/quotas?kept=1", 5000, base),
        magpieGet("/v1/magpie/quotas/history", 5000, base)
      ]);
      const now = Date.now();
      const quotas = (quotasRaw.data || quotasRaw || []).map(q => ({
        ...q,
        windows: (q.windows || []).map(w => ({
          ...w,
          resetsIn: w.resetsAt ? Math.max(0, Math.round((Date.parse(w.resetsAt) - now) / 60000)) : null
        }))
      }));
      const rows = quotaRowsAt(quotas, historyRaw.data || historyRaw || [], now);
      const bad = rows.filter(r => r.sev === "bad" && r.eta != null && r.reset != null && r.eta < r.reset);
      const pending = [];
      for (const r of bad) {
        const key = `${r.q.provider}|${r.q.user || ""}|${r.w.name || ""}`;
        if (now - (seen.get(key) || 0) < COOLDOWN) continue;
        seen.set(key, now);
        const who = r.q.user ? `${r.q.name || r.q.provider} · ${maskUser(r.q.user)}` : (r.q.name || r.q.provider);
        pending.push(`${who} ${r.w.name || ""}：约 ${fmtDur(r.eta)} 后耗尽，${fmtDur(r.reset)} 后重置`);
      }
      if (pending.length) {
        const lines = pending.slice(0, 3);
        if (pending.length > 3) lines.push(`另有 ${pending.length - 3} 个窗口`);
        notifyOS(
          `Magpie 额度预警${pending.length > 1 ? ` · ${pending.length} 个` : ""}`,
          lines.join("\n")
        );
      }
    } catch (err) {
      console.error("[observatory] alert check failed:", err?.message || String(err));
    }
  }
  setTimeout(check, 20000).unref?.();
  setInterval(check, 5 * 60 * 1000).unref?.();
}

export async function startServer(options = {}) {
  const port = Number(options.port) > 0 ? Number(options.port) : DEFAULT_PORT;
  for (let attempt = 0; attempt < 150; attempt++) {
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
      if (options.monitor) startMonitor();
      console.log(`[magpie-observatory] ${url}`);
      return { server, port, url };
    } catch (err) {
      if (err?.code !== "EADDRINUSE") throw err;
      // Another Magpie window may hold the port. Wait for it instead of
      // reusing it once: a short-lived host can release the port right after
      // the page has already pointed at it.
      await sleep(200);
    }
  }
  throw new Error(`port ${port} is still in use`);
}
