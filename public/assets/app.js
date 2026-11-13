/* ==========================================================================
   Magpie Observatory — UI controller
   Vanilla DOM + SVG. No build step, no runtime dependencies.
   ========================================================================== */
(function () {
  "use strict";

  const D = window.MagpieData;
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const pad2 = n => String(n).padStart(2, "0");

  const state = {
    mode: "demo",
    data: D.mockState(),
    selectedSession: null,
    filter: null,
    range: "today",
    trendMetric: "tokens",
    heroMode: "route",
    sessionTab: "active",
    paused: false,
    logQuery: "",
    view: null,
    wireSig: "",
    events: 0,
    lastTick: Date.now(),
    timers: [],
    liveTimer: null
  };

  const STATUS_TEXT = { streaming: "运行中", queued: "排队", done: "完成", error: "失败" };
  const STATUS_CLASS = { streaming: "run", queued: "queue", done: "done", error: "err" };
  const STATUS_LOG = { ok: "ok", run: "run", retry: "retry", err: "err" };

  /* ------------------------------------------------------------- derive --- */
  function computeView() {
    const d = state.data;
    if (state.mode === "live") {
      state.view = { series: d.series || [], kpis: d.kpis };
      return;
    }
    if (state.range === "today") {
      state.view = { series: d.series, kpis: d.kpis, unit: "hour" };
      return;
    }
    const days = state.range === "7d" ? 7 : 30;
    const slice = d.heatmap.slice(-days);
    const series = slice.map(day => ({
      label: day.date.slice(5),
      tokens: day.tokens,
      cost: +(day.tokens / 1e6 * 1.32).toFixed(2),
      date: day.date
    }));
    const tokens = series.reduce((a, b) => a + b.tokens, 0);
    const cost = series.reduce((a, b) => a + b.cost, 0);
    const requests = slice.reduce((a, b) => a + (b.calls || 0), 0);
    state.view = {
      series,
      unit: days === 7 ? "day" : "day",
      kpis: {
        ...d.kpis,
        requests,
        tokens,
        cost: +cost.toFixed(2),
        requestsDelta: state.range === "7d" ? 9.2 : 18.6,
        tokensDelta: state.range === "7d" ? 6.4 : 14.8,
        costDelta: state.range === "7d" ? 1.8 : 5.3
      }
    };
  }

  function selectedSession() {
    if (!state.selectedSession) return null;
    return state.data.sessions.concat(state.data.recent).find(s => s.id === state.selectedSession) || null;
  }

  function activeSessions() {
    return state.data.sessions.filter(s => s.status !== "done");
  }

  function visibleSessions() {
    let list = state.sessionTab === "active"
      ? activeSessions().concat(state.data.recent.filter(s => s.status !== "done")).slice(0, 8)
      : state.data.recent.concat(state.data.sessions.filter(s => s.status === "done"))
          .sort((a, b) => b.startedAt - a.startedAt).slice(0, 10);
    if (state.filter) {
      list = list.filter(s => state.filter.type === "agent"
        ? s.agent === state.filter.value
        : s.provider === state.filter.value);
    }
    return list;
  }

  function effectiveDecision() {
    const sel = selectedSession();
    if (sel) {
      return {
        session: sel, title: sel.title, group: "group/" + (sel.group || "direct"),
        rule: sel.rule || "—", intent: sel.intent || "—", confidence: sel.confidence,
        classifierMs: 0, effort: sel.effort, tries: sel.tries || [],
        narrative: narrativeOf(sel)
      };
    }
    return state.data.decision;
  }

  function narrativeOf(s) {
    const tries = s.tries || [];
    const ok = tries.find(t => t.state === "ok") || tries[tries.length - 1];
    const fails = tries.filter(t => t.state === "fail");
    if (!tries.length) return "等待路由决策。";
    let out = `路由到 ${D.providerMeta(ok.provider).name} / ${ok.model}`;
    if (fails.length) out += `；${fails.length} 次失败后改道，Agent 无感`;
    if (s.rule && s.rule !== "—") out += ` · ${s.rule}`;
    if (s.effort) out += ` · effort ${s.effort}`;
    return out + "。";
  }

  /* -------------------------------------------------------------- format --- */
  function fmtTokens(n) { return D.fmtTokens(n); }
  function fmtMoney(n) { return D.fmtMoney(n); }
  function fmtAge(ms) {
    ms = Math.max(0, ms);
    const s = Math.floor(ms / 1000);
    if (s < 60) return s + "s";
    const m = Math.floor(s / 60);
    if (m < 60) return m + "m" + (m < 10 ? pad2(s % 60) : "");
    const h = Math.floor(m / 60);
    if (h < 24) return h + "h" + pad2(m % 60);
    return Math.floor(h / 24) + "d" + (h % 24) + "h";
  }
  function fmtReset(mins) {
    if (mins == null) return "—";
    if (mins <= 0) return "即将重置";
    if (mins < 60) return mins + "m 后重置";
    const h = Math.floor(mins / 60), m = mins % 60;
    if (h < 24) return h + "h" + (m ? m + "m" : "") + " 后重置";
    const d = Math.floor(h / 24);
    return d + "d" + (h % 24) + "h 后重置";
  }
  function providerIcon(p) { return D.iconUrl(D.providerMeta(p).icon); }
  function agentIcon(a) { return D.iconUrl(D.agentMeta(a).icon); }
  function tpsClass(v) {
    if (!v) return "";
    if (v >= 100) return "good";
    if (v >= 60) return "mid";
    return "low";
  }

  /* --------------------------------------------------------------- render --- */
  function renderAll() {
    computeView();
    renderKPIs();
    renderRouteStage();
    renderDecision();
    renderSessions();
    renderQuotas();
    renderTrend();
    renderDonut();
    renderHeatmap();
    renderLogs();
    renderStatus();
    renderMode();
  }

  function renderMode() {
    const d = state.data;
    const pill = $("#conn-pill");
    const label = $("#conn-label");
    const host = $("#conn-host");
    pill.dataset.mode = state.mode;
    label.textContent = state.mode === "live" ? "实时连接" : "演示数据";
    host.textContent = state.mode === "live" ? (d.gateway || "127.0.0.1:3425") : "mock://local";
    $("#live-dot").className = "live-dot" + (state.paused ? " stale" : "");
    $("#gateway-addr").textContent = d.gateway || "127.0.0.1:3425";
    $("#hub-addr").textContent = d.gateway || "127.0.0.1:3425";
    const demoBtn = $("#demo-toggle");
    demoBtn.classList.toggle("on", !state.paused);
    demoBtn.innerHTML = `<svg><use href="#i-${state.paused ? "play" : "pause"}"/></svg>`;
    demoBtn.title = state.paused ? "继续实时演示" : "暂停实时演示";
  }

  function renderKPIs() {
    const k = (state.view && state.view.kpis) || state.data.kpis;
    const items = [
      { key: "requests", label: "请求数", value: k.requests.toLocaleString(), unit: "次", delta: k.requestsDelta, icon: "i-bolt", color: "#8b7cf6", spark: [3,5,4,7,6,9,8,11,10,13,12,15] },
      { key: "tokens", label: "Token", value: fmtTokens(k.tokens), unit: "", delta: k.tokensDelta, icon: "i-stack", color: "#56d4dd", spark: [2,4,3,7,5,8,6,10,9,12,11,14] },
      { key: "cost", label: "预估费用", value: fmtMoney(k.cost), unit: "USD", delta: k.costDelta, icon: "i-chart", color: "#4ade80", spark: [7,6,8,7,9,8,10,11,10,12,11,13] },
      { key: "cache", label: "缓存命中", value: k.cache.toFixed(1), unit: "%", delta: k.cacheDelta, icon: "i-db", color: "#fbbf24", spark: [5,5,6,6,7,8,7,8,9,9,10,11] },
      { key: "tps", label: "平均 TPS", value: k.tps.toFixed(1), unit: "tok/s", delta: k.tpsDelta, icon: "i-pulse", color: "#f472b6", spark: [4,6,5,8,7,7,9,11,10,12,13,12] },
      { key: "active", label: "活跃会话", value: String(k.active), unit: "个", delta: k.activeDelta, icon: "i-route", color: "#60a5fa", spark: [1,2,1,3,2,4,3,4,3,5,4,4] }
    ];
    $("#kpi-row").innerHTML = items.map(it => {
      const down = it.key === "cost" ? it.delta <= 0 : it.delta < 0;
      const flat = !it.delta;
      const deltaText = flat ? "持平" : (it.delta > 0 ? "+" : "") + it.delta + "%";
      const deltaCls = flat ? "flat" : (down ? "down" : "");
      const spark = sparkPath(it.spark.map(v => v * (0.85 + (it.key.length % 3) * 0.05)));
      return `<article class="kpi" style="--k-c:${it.color}">
        <div class="kpi-label"><span>${it.label}</span><svg><use href="#${it.icon}"/></svg></div>
        <div class="kpi-value"><b>${esc(it.value)}</b><span>${esc(it.unit)}</span></div>
        <div class="kpi-foot"><span class="kpi-delta ${deltaCls}">${deltaText}</span>${spark}</div>
      </article>`;
    }).join("");
  }

  function sparkPath(vals) {
    const w = 58, h = 20, max = Math.max(...vals), min = Math.min(...vals);
    const pts = vals.map((v, i) => {
      const x = (i / (vals.length - 1)) * w;
      const y = h - 3 - ((v - min) / Math.max(1, max - min)) * (h - 6);
      return [x, y];
    });
    const line = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
    const area = line + ` L${w} ${h} L0 ${h} Z`;
    return `<svg class="spark" viewBox="0 0 ${w} ${h}" aria-hidden="true"><path class="area" d="${area}"/><path d="${line}"/></svg>`;
  }

  function renderRouteStage() {
    const all = state.data.sessions.concat(state.data.recent);
    const active = activeSessions();
    const agentMap = new Map();
    all.forEach(s => {
      const a = agentMap.get(s.agent) || { key: s.agent, count: 0, tokens: 0, group: s.group, active: 0 };
      a.count++;
      a.tokens += s.tokens || 0;
      if (s.status !== "done" && s.status !== "error") {
        a.active++;
        if (s.group) a.group = s.group;
      }
      agentMap.set(s.agent, a);
    });
    const agents = Array.from(agentMap.values()).sort((a, b) => b.active - a.active || b.tokens - a.tokens).slice(0, 5);
    const maxAgentTokens = Math.max(1, ...agents.map(a => a.tokens));

    $("#agents-col").innerHTML = agents.map(a => {
      const meta = D.agentMeta(a.key);
      const hot = state.filter && state.filter.type === "agent" && state.filter.value === a.key;
      return `<div class="agent-node${hot ? " hot" : ""}" data-agent="${esc(a.key)}" style="--agent-c:${meta.color}" role="button" tabindex="0" title="点击筛选 ${esc(meta.name)}">
        <span class="agent-ic"><img src="${agentIcon(a.key)}" alt=""></span>
        <span class="agent-copy"><b>${esc(meta.name)}</b><small>group/${esc(a.group || "direct")}</small></span>
        <span class="agent-live"><i></i>${a.active || "—"}</span>
        <span class="agent-load"><i style="width:${Math.round(a.tokens / maxAgentTokens * 100)}%"></i></span>
      </div>`;
    }).join("");

    const provMap = new Map();
    all.forEach(s => {
      const tries = (s.tries && s.tries.length) ? s.tries : [{ provider: s.provider, model: s.model, state: s.status === "done" ? "ok" : "pending" }];
      tries.forEach(t => {
        const key = t.provider || D.providerOfModel(t.model, s.provider);
        const item = provMap.get(key) || { key, active: 0, models: new Set(), status: "idle", count: 0 };
        item.count++;
        if (t.model && t.model !== "—") item.models.add(t.model);
        if (s.status === "streaming") {
          item.active++;
          item.status = t.state === "fail" ? (item.status === "serving" ? "serving" : "retry") : "serving";
        } else if (s.status === "queued") {
          item.active++;
          if (item.status !== "serving") item.status = "routing";
        } else if (t.state === "fail") {
          if (item.status === "idle") item.status = "retry";
        }
        provMap.set(key, item);
      });
    });
    // Keep quota-bearing providers on the stage even while idle: an account's
    // remaining allowance is part of the routing picture.
    state.data.quotas.forEach(q => {
      if (!provMap.has(q.provider)) {
        provMap.set(q.provider, { key: q.provider, active: 0, models: new Set([q.plan || "待命"]), status: "idle", count: 0 });
      }
    });
    const quotaUsed = (p) => {
      const q = state.data.quotas.find(x => x.provider === p);
      return q && q.windows[0] ? q.windows[0].used : -1;
    };
    const providers = Array.from(provMap.values()).sort((a, b) => {
      const sa = a.status === "serving" ? 2 : a.status === "routing" ? 1 : 0;
      const sb = b.status === "serving" ? 2 : b.status === "routing" ? 1 : 0;
      return sb - sa || b.active - a.active || quotaUsed(b.key) - quotaUsed(a.key) || b.count - a.count;
    }).slice(0, 7);

    $("#providers-col").innerHTML = providers.map(p => {
      const meta = D.providerMeta(p.key);
      const quotas = state.data.quotas.filter(q => q.provider === p.key);
      const accts = quotas.slice(0, 2).map(q => `<span class="acct-chip">${esc(q.user || q.name)}${q.windows[0] ? " · " + q.windows[0].used + "%" : ""}</span>`).join("");
      const more = quotas.length > 2 ? `<span class="acct-chip more">+${quotas.length - 2}</span>` : "";
      const model = Array.from(p.models)[0] || (quotas[0] && quotas[0].plan) || "待命";
      const statusText = p.status === "serving" ? "回答中" : p.status === "routing" ? "排队" : p.status === "retry" ? "已改道" : "待命";
      const statusCls = p.status === "serving" ? "" : p.status === "routing" ? "routing" : p.status === "retry" ? "retry" : "idle";
      const quota = quotas[0] && quotas[0].windows[0] ? quotas[0].windows[0].used : 0;
      const hot = (state.filter && state.filter.type === "provider" && state.filter.value === p.key) ||
        (selectedSession() && D.providerOfModel(selectedSession().model, selectedSession().provider) === p.key);
      return `<div class="provider-node${p.status === "serving" ? " serving" : ""}${hot ? " serving" : ""}" data-provider="${esc(p.key)}" style="--p-c:${meta.color}" role="button" tabindex="0" title="点击筛选 ${esc(meta.name)}">
        <span class="p-ic"><img src="${providerIcon(p.key)}" alt=""></span>
        <b>${esc(meta.name)}</b>
        <span class="p-state ${statusCls}"><i></i>${statusText}</span>
        <small>${esc(model)}</small>
        <span class="p-account">${accts}${more}</span>
        <span class="p-bar"><i style="width:${clamp(quota, 2, 100)}%"></i></span>
      </div>`;
    }).join("");

    const activeCount = active.length;
    $("#hub-sub").textContent = `${activeCount} 会话 · ${activeCount} 并发`;
    const dec = effectiveDecision();
    $("#hub-mode").textContent = dec && dec.session ? (dec.session.mode === "order" ? "按顺序" : dec.session.mode === "rotate" ? "轮询" : "智能路由") : "智能路由";
    $("#hero-requests").textContent = activeCount;
    $("#hero-fallbacks").textContent = active.reduce((a, s) => a + (s.fallbacks || 0), 0);
    $("#hero-errors").textContent = all.filter(s => s.status === "error").length;

    // Keep this stable while only token counters move: rebuilding the SVG
    // would restart every bird mid-flight.
    const sig = JSON.stringify({
      a: agents.map(x => [x.key, x.active, x.group]),
      p: providers.map(x => [x.key, x.status, x.active, Array.from(x.models).join(",")]),
      f: state.filter, s: state.selectedSession
    });
    if (sig !== state.wireSig) {
      state.wireSig = sig;
      requestAnimationFrame(drawWires);
    }
    if (state.heroMode === "radar") renderRadarView();
    else if (state.heroMode === "loom") renderLoomView();
    else if (state.heroMode === "rhythm") renderRhythmView();
  }

  // The brand magpie, inline once in index.html. The outbound bird is 34px
  // and carries a message dot; the return bird mirrors and is a little
  // smaller, so direction reads even in a still screenshot.
  function birdShape(mirror) {
    const size = mirror ? 25 : 30;
    const half = size / 2;
    const cargo = mirror ? "" : `<circle class="cargo" cx="${(half * 0.72).toFixed(1)}" cy="${(-half * 0.5).toFixed(1)}" r="2.1"/>`;
    return `<g class="bird-art${mirror ? " back-art" : ""}"${mirror ? ' transform="scale(-1 1)"' : ""}>
      <use href="#bird-logo" x="${-half}" y="${-half}" width="${size}" height="${size}"/>
      ${cargo}
    </g>`;
  }

  // SMIL motion is unreliable in WebKit (keyPoints), and an element before
  // its begin time paints at the SVG origin. Position the birds ourselves:
  // eight getPointAtLength calls per frame are cheap and give exact control.
  function bindFlights() {
    const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const motionOff = document.documentElement.dataset.motion === "off";
    if (window.innerWidth <= 980) { state.flights = []; return; }
    state.flights = $$("#birds .flier").map(el => {
      const path = document.getElementById(el.dataset.path);
      if (!path) return null;
      let len = 0;
      try { len = path.getTotalLength(); } catch (_) { return null; }
      if (!len) return null;
      return {
        el, path, len,
        dur: Math.max(1, parseFloat(el.dataset.dur) || 2.6),
        offset: parseFloat(el.dataset.offset) || 0
      };
    }).filter(Boolean);
    if (document.documentElement.dataset.motion === "soft") {
      state.flights.forEach(f => { f.dur *= 1.5; f.offset *= 1.5; });
    }
    if (reduced || motionOff) {
      state.flights.forEach(f => setFlightAt(f, 0.5));
      state.flights = [];
    } else {
      positionFlights(performance.now());
    }
  }

  function setFlightAt(f, t) {
    const pt = f.path.getPointAtLength(((t % 1) + 1) % 1 * f.len);
    f.el.setAttribute("transform", `translate(${pt.x.toFixed(2)} ${pt.y.toFixed(2)})`);
  }

  function positionFlights(now) {
    const sec = now / 1000;
    (state.flights || []).forEach(f => {
      setFlightAt(f, ((sec + f.offset) % f.dur) / f.dur);
    });
  }

  let lastFlightFrame = 0;
  function flightLoop(ts) {
    if (window.__OBS_FREEZE) { requestAnimationFrame(flightLoop); return; }
    if (!document.hidden && state.flights && state.flights.length && ts - lastFlightFrame > 32) {
      lastFlightFrame = ts;
      positionFlights(ts);
    }
    requestAnimationFrame(flightLoop);
  }

  function drawWires() {
    const stage = $("#route-stage");
    const svg = $("#wires");
    const birds = $("#birds");
    if (!stage || !svg || !birds) return;
    const base = stage.getBoundingClientRect();
    const hub = $("#hub-node").getBoundingClientRect();
    const agentEls = $$(".agent-node", stage);
    const providerEls = $$(".provider-node", stage);
    if (!hub.width) return;
    const W = base.width, H = base.height;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    birds.setAttribute("viewBox", `0 0 ${W} ${H}`);
    const hubL = { x: hub.left - base.left, y: hub.top - base.top + hub.height / 2 };
    const hubR = { x: hub.right - base.left, y: hubL.y };
    let out = `<defs><radialGradient id="pulseGrad"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>`;
    const paths = [];
    let idx = 0;

    agentEls.forEach(el => {
      const r = el.getBoundingClientRect();
      const start = { x: r.right - base.left, y: r.top - base.top + r.height / 2 };
      const end = { x: hubL.x - 6, y: hubL.y };
      const d = `M${start.x.toFixed(1)} ${start.y.toFixed(1)} C${(start.x + 44).toFixed(1)} ${start.y.toFixed(1)} ${(end.x - 52).toFixed(1)} ${end.y.toFixed(1)} ${end.x.toFixed(1)} ${end.y.toFixed(1)}`;
      const meta = D.agentMeta(el.dataset.agent);
      const active = activeSessions().filter(s => s.agent === el.dataset.agent).length;
      const filtered = state.filter && !(state.filter.type === "agent" && state.filter.value === el.dataset.agent);
      const id = "wire-a-" + (idx++);
      out += `<path id="${id}" class="wire${active ? " flow" : ""}${filtered ? " dim" : ""}" style="--w-c:${meta.color}" d="${d}"/>`;
      paths.push({ id, type: "agent", color: meta.color, active, filtered, d, start, end });
    });

    providerEls.forEach(el => {
      const r = el.getBoundingClientRect();
      const start = { x: hubR.x + 6, y: hubR.y };
      const end = { x: r.left - base.left, y: r.top - base.top + r.height / 2 };
      const d = `M${start.x.toFixed(1)} ${start.y.toFixed(1)} C${(start.x + 52).toFixed(1)} ${start.y.toFixed(1)} ${(end.x - 44).toFixed(1)} ${end.y.toFixed(1)} ${end.x.toFixed(1)} ${end.y.toFixed(1)}`;
      const meta = D.providerMeta(el.dataset.provider);
      const active = activeSessions().filter(s => D.providerOfModel(s.model, s.provider) === el.dataset.provider).length;
      const filtered = state.filter && !(state.filter.type === "provider" && state.filter.value === el.dataset.provider);
      const id = "wire-p-" + (idx++);
      out += `<path id="${id}" class="wire${active ? " flow" : ""}${filtered ? " dim" : ""}" style="--w-c:${meta.color}" d="${d}"/>`;
      paths.push({ id, type: "provider", color: meta.color, active, filtered, d, start, end });
    });

    // Two magpies per live conversation: one carries the request out, one
    // brings the answer back. The pair follows the whole agent -> magpie ->
    // provider path, not one segment, so the direction reads at a glance.
    const agentByKey = new Map($$(".agent-node", stage).map(el => [el.dataset.agent, el]));
    const providerByKey = new Map($$(".provider-node", stage).map(el => [el.dataset.provider, el]));
    let birdOut = "";
    const live = activeSessions().filter(s => s.status === "streaming" || s.status === "queued").slice(0, 3);
    live.forEach((s, i) => {
      const aEl = agentByKey.get(s.agent);
      const pKey = D.providerOfModel(s.model, s.provider);
      const pEl = providerByKey.get(pKey);
      if (!aEl || !pEl) return;
      const ar = aEl.getBoundingClientRect();
      const pr = pEl.getBoundingClientRect();
      const start = { x: ar.right - base.left, y: ar.top - base.top + ar.height / 2 };
      const end = { x: pr.left - base.left, y: pr.top - base.top + pr.height / 2 };
      const hx = hub.left - base.left + hub.width / 2;
      // Pass just above or below the hub's wordmark instead of through it.
      const hy = hub.top - base.top + hub.height / 2 + (i % 2 ? 32 : -30);
      const d = `M${start.x.toFixed(1)} ${start.y.toFixed(1)} C${(start.x + 46).toFixed(1)} ${start.y.toFixed(1)} ${(hx - 62).toFixed(1)} ${hy.toFixed(1)} ${hx.toFixed(1)} ${hy.toFixed(1)} C${(hx + 62).toFixed(1)} ${hy.toFixed(1)} ${(end.x - 46).toFixed(1)} ${end.y.toFixed(1)} ${end.x.toFixed(1)} ${end.y.toFixed(1)}`;
      // WebKit does not run keyPoints on an mpath reliably; draw the return
      // trip as its own reversed path instead.
      const dBack = `M${end.x.toFixed(1)} ${end.y.toFixed(1)} C${(end.x - 46).toFixed(1)} ${end.y.toFixed(1)} ${(hx + 62).toFixed(1)} ${hy.toFixed(1)} ${hx.toFixed(1)} ${hy.toFixed(1)} C${(hx - 62).toFixed(1)} ${hy.toFixed(1)} ${(start.x + 46).toFixed(1)} ${start.y.toFixed(1)} ${start.x.toFixed(1)} ${start.y.toFixed(1)}`;
      const id = "flight-" + i;
      const idBack = "flight-back-" + i;
      const aColor = D.agentMeta(s.agent).color;
      const dur = (2.6 + (i % 3) * 0.32).toFixed(2);
      const dim = state.selectedSession && state.selectedSession !== s.id ? " dim" : "";
      birdOut += `<path id="${id}" class="flight" d="${d}"/><path id="${idBack}" class="flight" d="${dBack}"/>`;
      birdOut += `<g class="flier${dim}" style="--f-c:${aColor}" data-path="${id}" data-dur="${dur}" data-offset="${(i * 0.6).toFixed(2)}">
        <g class="bird-bob">${birdShape(false)}</g>
      </g>`;
      birdOut += `<g class="flier back${dim}" style="--f-c:${aColor}" data-path="${idBack}" data-dur="${dur}" data-offset="${(dur / 2 + i * 0.6).toFixed(2)}">
        <g class="bird-bob">${birdShape(true)}</g>
      </g>`;
    });

    svg.innerHTML = out;
    birds.innerHTML = birdOut;
    bindFlights();
  }

  function heroProviderStats() {
    const map = new Map();
    const touch = (key) => {
      const meta = D.providerMeta(key);
      if (!map.has(key)) map.set(key, { key, name: meta.name, color: meta.color, active: 0, used: 0, model: "", plan: "", error: false });
      return map.get(key);
    };
    state.data.sessions.forEach(s => {
      const key = D.providerOfModel(s.model, s.provider);
      const p = touch(key);
      if (s.status === "streaming" || s.status === "queued") p.active++;
      if (s.model) p.model = s.model;
      if (s.status === "error") p.error = true;
    });
    state.data.recent.slice(0, 8).forEach(s => {
      const p = touch(D.providerOfModel(s.model, s.provider));
      if (!p.model) p.model = s.model;
      if (s.status === "error") p.error = true;
    });
    state.data.quotas.forEach(q => {
      const p = touch(q.provider);
      p.used = q.windows[0] ? Math.round(q.windows[0].used || 0) : 0;
      p.plan = q.plan || "";
    });
    return Array.from(map.values()).sort((a, b) => b.active - a.active || b.used - a.used);
  }

  function renderRadarView(force) {
    const host = $("#view-radar");
    if (!host) return;
    const provs = heroProviderStats().slice(0, 7);
    const active = activeSessions();
    const tokens = state.data.sessions.reduce((a, s) => a + (s.tokens || 0), 0);
    const sig = JSON.stringify({
      p: provs.map(p => [p.key, p.active, p.used, p.model]),
      a: active.map(s => [s.id, s.status])
    });
    if (!force && host.dataset.sig === sig && host.innerHTML) return;
    host.dataset.sig = sig;
    const n = Math.max(1, provs.length);
    const R = 33.5;
    const nodes = provs.map((p, i) => {
      const angle = (-90 + i * 360 / n) * Math.PI / 180;
      const x = 50 + Math.cos(angle) * R;
      const y = 50 + Math.sin(angle) * R;
      return `<button class="radar-node${p.active ? " serving" : ""}" data-provider="${esc(p.key)}" style="left:${x.toFixed(2)}%;top:${y.toFixed(2)}%;--p-c:${p.color}" title="${esc(p.name)} · ${esc(p.model || p.plan || "")}">
        <span class="radar-quota" style="--used:${clamp(p.used, 0, 100)}"><img src="${providerIcon(p.key)}" alt=""></span>
        <b>${esc(p.name)}</b><small>${esc((p.model || p.plan || "待命").split("/").pop())}</small>
      </button>`;
    }).join("");
    const size = Math.max(220, Math.min(host.clientHeight || 280, 330) - 6);
    const flights = active.slice(0, 5).map(s => {
      const meta = D.agentMeta(s.agent);
      return `<div class="radar-flight" style="--s-c:${meta.color}">
        <img src="${agentIcon(s.agent)}" alt="">
        <span class="rf-copy"><b>${esc(s.title)}</b><small>${esc(s.model)}</small></span>
        <span class="rf-tps">${s.tps ? s.tps.toFixed(0) : "—"}<small>tok/s</small></span>
      </div>`;
    }).join("") || `<div class="radar-empty">等待新的请求</div>`;
    const quotaRows = provs.slice(0, 6).map(p => `<div class="radar-qrow" style="--p-c:${p.color}">
      <img src="${providerIcon(p.key)}" alt="">
      <span><b>${esc(p.name)}</b><i><em style="width:${clamp(p.used, 0, 100)}%"></em></i></span>
      <strong>${p.used}%</strong>
    </div>`).join("");
    host.innerHTML = `<div class="radar-board">
      <aside class="radar-side left">
        <div class="radar-side-title"><span>IN FLIGHT</span><span>${active.length}</span></div>
        <div class="radar-flights">${flights}</div>
        <div class="radar-side-stat"><span>REQUESTS</span><b>${state.data.kpis.requests.toLocaleString()}</b><span>TOKENS</span><b>${fmtTokens(state.data.kpis.tokens)}</b></div>
      </aside>
      <div class="radar-wrap"><div class="radar" style="width:${size}px;height:${size}px">
        <i class="radar-ring r1"></i><i class="radar-ring r2"></i><i class="radar-ring r3"></i>
        <i class="radar-cross x"></i><i class="radar-cross y"></i>
        <i class="radar-sweep"></i>
        <i class="radar-ping p1"></i><i class="radar-ping p2"></i><i class="radar-ping p3"></i>
        ${nodes}
        <div class="radar-core">
          <span class="radar-core-logo"><svg viewBox="0 0 44 44"><use href="#bird-logo"/></svg></span>
          <b>magpie</b><span>LIVE SCAN</span><small>${active.length} active · ${fmtTokens(tokens)}</small>
        </div>
        <span class="radar-tag left">RADAR</span>
        <span class="radar-tag right">${provs.length} providers</span>
      </div></div>
      <aside class="radar-side right">
        <div class="radar-side-title"><span>QUOTA RINGS</span><span>${provs.length}</span></div>
        <div class="radar-quotas">${quotaRows}</div>
        <div class="radar-cache"><span class="radar-cache-ring" style="--used:${state.data.kpis.cache.toFixed(1)}"></span><span><b>${state.data.kpis.cache.toFixed(1)}%</b><small>CACHE HIT</small></span></div>
      </aside>
    </div>`;
  }

  function renderLoomView(force) {
    const host = $("#view-loom");
    if (!host) return;
    const logs = state.data.logs.slice(0, 16);
    const sig = logs.map(r => r.id + ":" + r.status + ":" + r.tokens).join("|");
    if (!force && host.dataset.sig === sig && host.innerHTML) return;
    host.dataset.sig = sig;
    if (!logs.length) {
      host.innerHTML = `<div class="empty-state"><b>织机等待第一根线</b><span>请求完成后会在这里织成一行。</span></div>`;
      return;
    }
    const colors = new Map();
    logs.forEach(r => {
      const key = D.providerOfModel(r.model, r.provider);
      colors.set(key, D.providerMeta(key).color);
    });
    const maxTok = Math.max(1, ...logs.map(r => r.tokens || 0));
    const rows = logs.map((r, i) => {
      const key = D.providerOfModel(r.model, r.provider);
      const color = colors.get(key);
      const cells = Array.from({ length: 18 }, (_, j) => {
        const wave = Math.abs(Math.sin((i + 1.7) * (j + 2.1) * 0.43));
        const o = 0.12 + wave * 0.88;
        return `<i style="--o:${o.toFixed(2)}"></i>`;
      }).join("");
      const st = r.status === "ok" ? "ok" : r.status === "err" ? "err" : r.status === "retry" ? "retry" : "run";
      return `<div class="loom-row" style="--i:${i};--p-c:${color}" title="${esc(r.session)} · ${esc(r.model)}">
        <span class="loom-time">${new Date(r.at).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}</span>
        <span class="loom-weave">${cells}</span>
        <img class="loom-icon" src="${providerIcon(key)}" alt="">
        <span class="loom-model">${esc(r.model)}</span>
        <span class="loom-tok">${fmtTokens(r.tokens)}</span>
        <span class="loom-st"><i class="${st}"></i></span>
      </div>`;
    }).join("");
    host.innerHTML = `<div class="loom-wrap">
      <div class="loom-head"><span><b>REQUEST LOOM</b> · 请求织机</span><span>${logs.length} picks · cache ${state.data.kpis.cache.toFixed(1)}%</span></div>
      <div class="loom-body">${rows}</div>
      <i class="loom-shuttle"></i>
    </div>`;
  }

  function renderRhythmView(force) {
    const host = $("#view-rhythm");
    if (!host) return;
    const logs = state.data.logs.slice(0, 16);
    const sig = logs.map(r => r.id + ":" + r.status + ":" + r.tokens).join("|");
    if (!force && host.dataset.sig === sig && host.innerHTML) return;
    host.dataset.sig = sig;
    if (!logs.length) {
      host.innerHTML = `<div class="empty-state"><b>节拍等待第一拍</b><span>请求完成后会落在对应 Provider 的轨道上。</span></div>`;
      return;
    }
    // One column per request, oldest on the left, newest on the right.
    const cols = 16;
    const ordered = logs.slice().reverse();
    const lanes = [];
    ordered.forEach(r => {
      const key = D.providerOfModel(r.model, r.provider);
      let lane = lanes.find(l => l.key === key);
      if (!lane) { lane = { key, name: D.providerMeta(key).name, color: D.providerMeta(key).color, notes: [] }; lanes.push(lane); }
      lane.notes.push(r);
    });
    const laneRows = lanes.slice(0, 6).map(lane => {
      const notes = new Map();
      lane.notes.forEach(r => {
        const col = ordered.indexOf(r);
        notes.set(col, r);
      });
      const steps = Array.from({ length: cols }, (_, i) => {
        const r = notes.get(i);
        if (!r) return `<i class="rhythm-step"></i>`;
        const strength = clamp((r.tokens || 0) / 26000, .35, 1);
        return `<i class="rhythm-step on ${r.status === 'err' ? 'bad' : ''}" style="--d:${i * 0.08}s;--o:${strength.toFixed(2)}" title="${esc(r.session)} · ${esc(r.model)}"></i>`;
      }).join("");
      return `<div class="rhythm-lane" style="--p-c:${lane.color}">
        <span class="rhythm-label"><img src="${providerIcon(lane.key)}" alt=""><span><b>${esc(lane.name)}</b><small>${lane.notes.length} notes</small></span></span>
        <span class="rhythm-steps">${steps}</span>
      </div>`;
    }).join("");
    const beats = Array.from({ length: cols }, (_, i) => `<i>${i + 1}</i>`).join("");
    const ok = logs.filter(r => r.status === "ok").length;
    const combo = ok * 3 + logs.filter(r => r.status === "retry").length;
    host.innerHTML = `<div class="rhythm-board">
      <div class="rhythm-top"><span><b>RHYTHM</b> · 请求节拍</span><span>${logs.length} beats · cache ${state.data.kpis.cache.toFixed(1)}%</span></div>
      <div class="rhythm-beats"><span></span><span class="rhythm-beatnums">${beats}</span></div>
      <div class="rhythm-main">
        <div class="rhythm-lanes">${laneRows}</div>
        <i class="rhythm-playhead"></i>
      </div>
      <div class="rhythm-foot">
        <span class="rhythm-judge">PERFECT <b>×${combo}</b></span>
        <span class="rhythm-hint">颜色 = Provider · 亮度 = Token · 红点 = 失败</span>
        <span class="rhythm-combo">COMBO <b>${combo}</b></span>
      </div>
    </div>`;
  }

  function setHeroMode(mode) {
    state.heroMode = mode;
    const titles = { route: ["实时路由", "LIVE ROUTING"], radar: ["路由雷达", "RADAR SCAN"], loom: ["请求织机", "REQUEST LOOM"], rhythm: ["请求节奏", "RHYTHM"] };
    const [title, eyebrow] = titles[mode] || titles.route;
    $("#hero-title").textContent = title;
    const eb = $(".hero-head .eyebrow");
    if (eb) eb.innerHTML = `<span class="live-ring"></span> ${eyebrow}`;
    $$("#hero-modes button").forEach(b => b.classList.toggle("active", b.dataset.hero === mode));
    const route = $("#view-route"), radar = $("#view-radar"), loom = $("#view-loom"), rhythm = $("#view-rhythm");
    if (route) route.hidden = mode !== "route";
    if (radar) radar.hidden = mode !== "radar";
    if (loom) loom.hidden = mode !== "loom";
    if (rhythm) rhythm.hidden = mode !== "rhythm";
    if (mode === "route") requestAnimationFrame(drawWires);
    if (mode === "radar") renderRadarView(true);
    if (mode === "loom") renderLoomView(true);
    if (mode === "rhythm") renderRhythmView(true);
  }

  function sessionCard(s) {
    const meta = D.agentMeta(s.agent);
    const sel = s.id === state.selectedSession;
    const age = Date.now() - s.startedAt;
    const st = STATUS_CLASS[s.status] || "";
    const tps = s.tps ? `${s.tps.toFixed(1)} tok/s` : "— tok/s";
    const subs = (s.subagents || []).map(sub => `<div class="subagent-row"><b>${esc(sub.name)}</b><span>${esc(STATUS_TEXT[sub.status] || sub.status)}</span><span class="sub-model">${esc(sub.model)} · ${sub.tps ? sub.tps.toFixed(0) : "—"} TPS</span></div>`).join("");
    return `<article class="session-card${sel ? " selected" : ""}${s.status === "streaming" ? " streaming" : ""}" data-session="${esc(s.id)}" style="--s-c:${meta.color}" tabindex="0">
      <div class="session-top">
        <span class="session-agent"><img src="${agentIcon(s.agent)}" alt=""></span>
        <span class="session-title" title="${esc(s.title)}">${esc(s.title)}</span>
        <span class="session-state ${st}">${STATUS_TEXT[s.status] || s.status}</span>
      </div>
      <div class="session-meta"><span class="session-model">${esc(s.model)}</span><span class="session-route">→ ${s.group === "最近完成" ? "最近完成" : "group/" + esc(s.group || "direct")}</span></div>
      <div class="session-bottom">
        <span><b>${fmtTokens(s.tokens)}</b> TOK</span>
        <span>${fmtAge(age)}</span>
        ${s.fallbacks ? `<span class="chip amber">${s.fallbacks} 改道</span>` : ""}
        <span class="tps ${tpsClass(s.tps)}">${tps}</span>
      </div>
      ${subs}
    </article>`;
  }

  function matchFilter(s) {
    if (!state.filter) return true;
    return state.filter.type === "agent" ? s.agent === state.filter.value : s.provider === state.filter.value;
  }

  function renderSessions() {
    const list = visibleSessions();
    const live = activeSessions();
    $("#active-count").textContent = String(live.length);
    const host = $("#session-list");
    const scroll = host.scrollTop;
    host.dataset.tab = state.sessionTab;
    let html = list.map(sessionCard).join("");
    if (state.sessionTab === "active") {
      // A quiet live gateway can have two active sessions; showing the last
      // completed ones keeps the rail informative instead of half empty.
      const seen = new Set(list.map(s => s.id));
      const recent = state.data.recent.filter(s => !seen.has(s.id) && matchFilter(s)).slice(0, 3);
      if (recent.length) html += `<div class="list-divider"><span>最近</span></div>` + recent.map(sessionCard).join("");
    }
    if (!html) {
      html = `<div class="empty-row">没有匹配的会话</div>`;
    } else if (state.sessionTab === "active" && list.length < 3) {
      html += `<div class="session-ghost"><span class="radar"></span><b>等待新的请求</b><small>trace 每秒刷新 · 完成后会留在这里</small></div>`;
    }
    host.innerHTML = html;
    host.scrollTop = scroll;
  }

  function renderQuotas() {
    const list = state.data.quotas;
    const host = $("#quota-list");
    // Few accounts should not leave an empty third column; four read well
    // as a 2×2, five or six as the CSS 3-column grid.
    const qw = host.clientWidth || 800;
    const cap = Math.max(220, Math.min(380, (qw - 8) / 2));
    const one = Math.max(240, Math.min(620, qw));
    host.style.gridTemplateColumns = window.innerWidth <= 680
      ? "minmax(0, 1fr)"
      : list.length <= 2
        ? `minmax(0, ${one.toFixed(0)}px)`
        : list.length <= 4
          ? `repeat(2, minmax(0, ${cap.toFixed(0)}px))`
          : "";
    host.classList.toggle("few", list.length <= 4);
    host.innerHTML = list.map(q => {
      const meta = D.providerMeta(q.provider);
      const w = q.windows[0] || { name: "额度", used: 0, resetsIn: null };
      const used = Math.round(w.used || 0);
      const color = used >= 88 ? "var(--red)" : used >= 70 ? "var(--amber)" : meta.color;
      const detail = q.windows.map(win => `${win.name} ${Math.round(win.used || 0)}%`).join(" · ");
      const value = q.balance ? q.balance : used + "%";
      const reset = q.balance ? "余额" : fmtReset(w.resetsIn);
      return `<div class="quota-item" style="--q-c:${color}" title="${esc(q.name)} · ${esc(q.user || "")} · ${esc(q.plan || "")} · ${esc(detail)}">
        <span class="quota-ring" style="--used:${clamp(used, 0, 100)}"><img src="${providerIcon(q.provider)}" alt=""></span>
        <span class="quota-copy">
          <span class="quota-top"><b>${esc(q.name)}</b><em>${esc(q.plan || "")}</em></span>
          <span class="quota-bar ${used >= 88 ? "crit" : used >= 70 ? "hot" : ""}"><i style="width:${clamp(used, 0, 100)}%;background:${color}"></i></span>
          <span class="quota-sub"><span>${esc(q.user || "—")}</span><span>${esc(w.name)} · ${esc(reset)}</span></span>
        </span>
        <span class="quota-pct" style="color:${color}">${esc(value)}</span>
      </div>`;
    }).join("");
    $("#quota-stamp").textContent = state.mode === "live" ? "kept=1" : "刚刚";
  }

  function renderTrend() {
    const series = (state.view && state.view.series) || state.data.series;
    const svg = $("#trend-chart");
    const wrap = $("#trend-wrap");
    if (!series.length) {
      svg.innerHTML = `<text x="50%" y="46%" text-anchor="middle" fill="var(--faint)" font-size="10">暂无用量数据</text>`;
      $("#trend-summary").textContent = "—";
      return;
    }
    const W = Math.max(300, wrap.clientWidth || 520);
    const H = Math.max(140, Math.round(wrap.clientHeight || 196));
    const pad = { l: 36, r: 8, t: 12, b: 22 };
    const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
    const metric = state.trendMetric;
    const max = Math.max(1, ...series.map(p => metric === "tokens" ? p.tokens : p.cost));
    const x = i => pad.l + (series.length <= 1 ? iw / 2 : (i / (series.length - 1)) * iw);
    const y = v => pad.t + ih - (v / max) * ih;

    let out = `<defs><linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--accent)" stop-opacity=".30"/><stop offset="1" stop-color="var(--accent)" stop-opacity="0"/></linearGradient></defs>`;
    for (let i = 0; i <= 4; i++) {
      const gy = pad.t + (i / 4) * ih;
      out += `<line class="grid-line" x1="${pad.l}" y1="${gy}" x2="${W - pad.r}" y2="${gy}"/>`;
      const val = max * (1 - i / 4);
      const label = metric === "tokens" ? fmtTokens(val) : fmtMoney(val, val < 10 ? 1 : 0);
      out += `<text class="axis-label" x="${pad.l - 6}" y="${gy + 3}" text-anchor="end">${esc(label)}</text>`;
    }
    // 24h: every 6 hours; 7d: every 2 days; 30d: about 5 labels.
    const step = series.length === 24 ? 6 : Math.max(1, Math.ceil(series.length / 5));
    const idxs = [];
    for (let i = 0; i < series.length; i += step) idxs.push(i);
    if (idxs[idxs.length - 1] !== series.length - 1) idxs.push(series.length - 1);
    idxs.forEach(i => {
      const p = series[i];
      const label = state.range === "today" ? (i === series.length - 1 ? "现在" : pad2(i) + ":00") : (p.label || "");
      out += `<text class="axis-label" x="${x(i)}" y="${H - 6}" text-anchor="${i === 0 ? "start" : i === series.length - 1 ? "end" : "middle"}">${esc(label)}</text>`;
    });

    const lineD = series.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(metric === "tokens" ? p.tokens : p.cost).toFixed(1)}`).join(" ");
    if (series.length >= 3) {
      const areaD = lineD + ` L${x(series.length - 1).toFixed(1)} ${pad.t + ih} L${x(0).toFixed(1)} ${pad.t + ih} Z`;
      out += `<path class="area" d="${areaD}"/>`;
    }
    out += `<path class="line" d="${lineD}"/>`;
    if (series.length < 3) {
      // A snapshot with one or two buckets is a line, not a filled wedge.
      series.forEach((p, i) => {
        out += `<circle class="hover-dot" cx="${x(i)}" cy="${y(metric === "tokens" ? p.tokens : p.cost)}" r="3.2"/>`;
      });
    }

    // secondary metric: costs on token view, tokens on cost view
    const secMax = Math.max(1, ...series.map(p => metric === "tokens" ? p.cost : p.tokens));
    const secD = series.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${(pad.t + ih - ((metric === "tokens" ? p.cost : p.tokens) / secMax) * ih * 0.82).toFixed(1)}`).join(" ");
    out += `<path class="cost-line" d="${secD}"/>`;

    out += `<g id="trend-hover" style="display:none"><line class="hover-line" y1="${pad.t}" y2="${pad.t + ih}"/><circle class="hover-dot" r="3.2"/></g>`;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.innerHTML = out;

    const hover = svg.querySelector("#trend-hover");
    const tip = $("#trend-tip");
    svg.onmousemove = (ev) => {
      const rect = svg.getBoundingClientRect();
      const px = (ev.clientX - rect.left) / rect.width * W;
      const i = clamp(Math.round((px - pad.l) / Math.max(1, iw) * (series.length - 1)), 0, series.length - 1);
      const p = series[i];
      hover.style.display = "";
      hover.querySelector("line").setAttribute("x1", x(i));
      hover.querySelector("line").setAttribute("x2", x(i));
      hover.querySelector("circle").setAttribute("cx", x(i));
      hover.querySelector("circle").setAttribute("cy", y(metric === "tokens" ? p.tokens : p.cost));
      const label = state.range === "today" ? pad2(i) + ":00" : (p.date || p.label || "");
      tip.hidden = false;
      tip.innerHTML = `<div>${esc(label)}</div><div>Token <b>${fmtTokens(p.tokens)}</b></div><div>费用 <b>${fmtMoney(p.cost)}</b></div>`;
      const left = (x(i) / W) * rect.width;
      tip.style.left = clamp(left, 52, rect.width - 52) + "px";
      tip.style.top = Math.max(28, (y(metric === "tokens" ? p.tokens : p.cost) / H) * rect.height - 10) + "px";
    };
    svg.onmouseleave = () => { hover.style.display = "none"; tip.hidden = true; };

    const total = series.reduce((a, b) => a + (metric === "tokens" ? b.tokens : b.cost), 0);
    $("#trend-summary").textContent = metric === "tokens"
      ? `${fmtTokens(total)} tokens · ${fmtMoney(series.reduce((a, b) => a + b.cost, 0))}`
      : `${fmtMoney(total)} · ${fmtTokens(series.reduce((a, b) => a + b.tokens, 0))} tokens`;
    const title = $("#trend-title");
    title.textContent = state.range === "today" ? "24 小时用量" : state.range === "7d" ? "7 天用量" : "30 天用量";
    $$("#trend-seg button").forEach(b => b.classList.toggle("active", b.dataset.metric === metric));
  }

  function renderDonut() {
    const models = state.data.models;
    const total = models.reduce((a, b) => a + b.tokens, 0) || 1;
    const svg = $("#donut");
    const R = 52, C = 2 * Math.PI * R;
    let offset = 0;
    let out = `<circle class="track" cx="70" cy="70" r="${R}"/>`;
    models.forEach((m, i) => {
      const frac = m.tokens / total;
      const len = Math.max(0, frac * C - 2);
      const color = D.MODEL_COLORS[i % D.MODEL_COLORS.length];
      out += `<circle class="seg" cx="70" cy="70" r="${R}" stroke="${color}" stroke-dasharray="${len.toFixed(2)} ${C.toFixed(2)}" stroke-dashoffset="${(-offset).toFixed(2)}"/>`;
      offset += frac * C;
    });
    svg.innerHTML = out;
    $("#donut-total").textContent = fmtTokens(total);
    $("#donut-legend").innerHTML = models.map((m, i) => {
      const color = D.MODEL_COLORS[i % D.MODEL_COLORS.length];
      return `<div class="donut-legend-row"><i style="background:${color}"></i><span title="${esc(m.name)}">${esc(m.name)}</span><b>${Math.round(m.tokens / total * 100)}%</b></div>`;
    }).join("");
  }

  function renderHeatmap() {
    const allDays = state.data.heatmap;
    const weeks = window.innerWidth < 680 ? 13 : window.innerWidth < 1700 ? 26 : 53;
    const days = allDays.slice(-weeks * 7);
    if (!days.length) {
      $("#heat-months").innerHTML = "";
      $("#heat-grid").innerHTML = `<div class="empty-state"><b>等待历史数据</b><span>热力图读取 Magpie 桌面版的 <code>/api/usage/heatmap</code>；headless 网关没有此路由。</span></div>`;
      $("#heat-summary").textContent = "—";
      return;
    }
    const max = Math.max(1, ...days.map(d => d.tokens));
    const shownWeeks = Math.ceil(days.length / 7);
    const months = [];
    let lastMonth = -1;
    for (let w = 0; w < shownWeeks; w++) {
      const d = new Date(days[w * 7].date + "T00:00:00");
      const month = d.getMonth();
      months.push(`<span>${month !== lastMonth ? (month + 1) + "月" : ""}</span>`);
      lastMonth = month;
    }
    $("#heat-months").style.gridTemplateColumns = `repeat(${shownWeeks}, minmax(0, 1fr))`;
    $("#heat-months").innerHTML = months.join("");
    $("#heat-grid").innerHTML = days.map(d => {
      const pct = d.tokens / max;
      const level = pct === 0 ? 0 : pct < .18 ? 1 : pct < .36 ? 2 : pct < .62 ? 3 : 4;
      const isToday = d.date === new Date().toISOString().slice(0, 10);
      return `<div class="heat-cell${isToday ? " today" : ""}" data-level="${level}" title="${d.date} · ${fmtTokens(d.tokens)} tokens · ${d.calls || 0} 次调用"></div>`;
    }).join("");
    const total = days.reduce((a, b) => a + b.tokens, 0);
    $("#heat-summary").textContent = `${shownWeeks} 周 · ${fmtTokens(total)} tokens`;
    const stamp = document.querySelector(".heat-card .stamp");
    if (stamp) stamp.textContent = shownWeeks + " 周";
  }

  function renderLogs() {
    const q = state.logQuery.toLowerCase();
    const logs = state.data.logs.filter(r => {
      if (!q) return true;
      return [r.session, r.model, r.provider, r.agent].join(" ").toLowerCase().includes(q);
    }).slice(0, 22);
    $("#log-body").innerHTML = logs.map(r => {
      const meta = D.agentMeta(r.agent);
      const dt = new Date(r.at);
      const time = `${pad2(dt.getHours())}:${pad2(dt.getMinutes())}:${pad2(dt.getSeconds())}`;
      const pm = D.providerMeta(r.provider);
      return `<tr>
        <td><span class="t">${time}</span></td>
        <td><span class="log-agent"><img src="${agentIcon(r.agent)}" alt=""><span><b>${esc(meta.name)}</b><small>${esc(r.session)}</small></span></span></td>
        <td><span class="route-cell"><img src="${providerIcon(r.provider)}" alt=""><code>${esc(r.model)}</code><span class="arrow">·</span><span style="font-size:8px;color:var(--faint)">${esc(pm.name)}</span></span></td>
        <td><span class="status ${STATUS_LOG[r.status] || ""}"><i></i>${r.status === "ok" ? "200" : r.status === "run" ? "流式" : r.status === "retry" ? "改道" : "错误"}</span></td>
        <td class="num">${fmtTokens(r.tokens)}</td>
        <td class="num">${r.ttft ? r.ttft + "ms" : "—"}</td>
        <td class="num">${r.tps ? r.tps.toFixed(0) : "—"}</td>
        <td class="num money">${r.cost != null ? fmtMoney(r.cost) : "—"}</td>
      </tr>`;
    }).join("") || `<tr><td colspan="8" class="empty-row">没有匹配的请求</td></tr>`;
  }

  function renderDecision() {
    const dec = effectiveDecision();
    if (!dec) {
      $("#decision-title").textContent = "等待请求";
      $("#decision-text").textContent = "Agent 发出的每个请求都会在这里实时播放。";
      $("#decision-tries").innerHTML = "";
      return;
    }
    $("#decision-title").textContent = dec.title || "等待请求";
    $("#decision-group").textContent = dec.group || "—";
    $("#decision-rule").textContent = dec.rule || "规则 —";
    $("#decision-classifier").textContent = dec.confidence != null
      ? `${dec.intent || "—"} · ${(dec.confidence * 100).toFixed(0)}%${dec.classifierMs ? ` · ${dec.classifierMs}ms` : ""}`
      : (dec.intent && dec.intent !== "—" ? dec.intent : "");
    $("#decision-text").textContent = dec.narrative || narrativeOf(dec.session || {});
    $("#decision-tries").innerHTML = (dec.tries || []).map((t, i) => {
      const pm = D.providerMeta(t.provider);
      const cls = t.state === "ok" ? "ok" : t.state === "fail" ? "fail" : "pending";
      const arrow = i ? `<span class="try-arrow">›</span>` : "";
      return `${arrow}<span class="try-pill ${cls}" title="${esc(t.why || "")}"><img src="${providerIcon(t.provider)}" alt="">${esc((t.model || "").split("/").pop())}${t.state === "fail" ? " ✕" : t.state === "pending" ? " …" : ""}</span>`;
    }).join("");
  }

  function renderStatus() {
    $("#status-events").textContent = `${state.events} 条事件`;
    $("#last-update").textContent = state.paused ? "演示已暂停" : "刚刚更新";
    const tps = state.data.sessions.filter(s => s.tps).reduce((a, s) => a + s.tps, 0);
    $("#global-tps").textContent = `${tps.toFixed(1)} tok/s`;
    $("#clock").textContent = new Date().toLocaleTimeString("zh-CN", { hour12: false });
  }

  /* ------------------------------------------------------------- simulate --- */
  const SPAWN_POOL = [
    { title: "补全 provider 图标映射", agent: "cursor", provider: "moonshot", model: "kimi-k2.5", group: "cheap-and-fast", mode: "order", rule: "规则 1 · cheap", intent: "code", confidence: .89, effort: "low", tokens: 3400, tps: 81.2 },
    { title: "把 trace 长轮询接进 HUD", agent: "codex", provider: "openai", model: "gpt-5.2-codex", group: "daily-coding", mode: "smart", rule: "规则 2 · hard-to-strong", intent: "code", confidence: .91, effort: "medium", tokens: 4200, tps: 121.7 },
    { title: "解释 cache_read 的计费口径", agent: "claude", provider: "anthropic", model: "claude-sonnet-4-5", group: "daily-coding", mode: "smart", rule: "规则 3 · explain", intent: "explain", confidence: .93, effort: "low", tokens: 2800, tps: 69.2 },
    { title: "整理 8 周活跃热力图", agent: "gemini", provider: "google", model: "gemini-3-pro", group: "long-context", mode: "smart", rule: "规则 4 · long-context", intent: "analysis", confidence: .87, effort: "high", tokens: 5100, tps: 85.4 },
    { title: "生成 Lighthouse 报告摘要", agent: "opencode", provider: "deepseek", model: "deepseek-v4", group: "cheap-and-fast", mode: "order", rule: "规则 1 · cheap", intent: "summarize", confidence: .95, effort: "low", tokens: 2200, tps: 102.3 },
    { title: "检查 subagent 会话归属", agent: "claude", provider: "openrouter", model: "claude-opus-4-5", group: "daily-coding", mode: "smart", rule: "规则 2 · hard-to-strong", intent: "debug", confidence: .84, effort: "high", tokens: 6800, tps: 58.7 }
  ];

  function demoTick() {
    if (state.paused || state.mode !== "demo" || window.__OBS_FREEZE) return;
    const now = Date.now();
    state.lastTick = now;
    let completed = 0;
    state.data.sessions.forEach(s => {
      if (s.status === "queued") {
        s._wait = (s._wait || 0) + 1;
        if (s._wait > 3 + Math.random() * 4) {
          s.status = "streaming";
          s.tps = 60 + Math.random() * 70;
          s._wait = 0;
          state.events++;
        }
        return;
      }
      if (s.status !== "streaming") return;
      const dt = 1.2;
      const delta = Math.max(1, s.tps * dt * (0.8 + Math.random() * 0.45));
      s.tokens += Math.round(delta);
      s.tps = clamp(s.tps + (Math.random() - 0.5) * 4, 28, 168);
      s._age = (s._age || 0) + dt;
      state.data.kpis.tokens += Math.round(delta);
      state.data.kpis.cost += delta / 1e6 * 1.35;
      const target = 300000 + Math.random() * 60000;
      if (s.tokens > target) {
        s.status = "done";
        completed++;
        state.events++;
        state.data.recent.unshift({ ...s });
        if (state.data.recent.length > 8) state.data.recent.pop();
      }
    });
    if (completed) {
      state.data.sessions = state.data.sessions.filter(s => s.status !== "done");
      state.data.kpis.requests += completed;
      state.data.kpis.active = state.data.sessions.length;
    }
    if (state.data.sessions.length < 4 && Math.random() < 0.5) spawnSession();
    if (!state.data.sessions.length) spawnSession();
    state.data.kpis.active = state.data.sessions.length;

    // Keep the last hour and the current heat cell moving.
    const last = state.data.series[state.data.series.length - 1];
    last.tokens += Math.round(40000 + Math.random() * 90000);
    last.cost = +(last.cost + 0.05 + Math.random() * 0.12).toFixed(3);
    const today = state.data.heatmap[state.data.heatmap.length - 1];
    today.tokens = Math.round(state.data.series.reduce((a, b) => a + b.tokens, 0));
    today.calls = state.data.kpis.requests;

    computeView();
    renderKPIs();
    renderSessions();
    renderRouteStage();
    renderDecision();
    renderTrend();
    renderDonut();
    renderStatus();
  }

  function spawnSession() {
    const t = SPAWN_POOL[Math.floor(Math.random() * SPAWN_POOL.length)];
    const meta = D.agentMeta(t.agent);
    const id = "s-" + Math.random().toString(16).slice(2, 6);
    const tries = [{ provider: t.provider, model: t.model, state: "pending", ms: 0, why: "in flight" }];
    if (Math.random() < 0.28) {
      const alt = t.provider === "anthropic" ? "openrouter" : t.provider === "openai" ? "openrouter" : "anthropic";
      tries.unshift({ provider: alt, model: t.model, state: "fail", ms: 900 + Math.random() * 1800, why: "429 · rate limited" });
      tries[tries.length - 1].state = "ok";
      tries[tries.length - 1].why = "streaming";
    }
    state.data.sessions.unshift({
      id, title: t.title, agent: t.agent, provider: t.provider, model: t.model, served: t.model,
      group: t.group, mode: t.mode, rule: t.rule, intent: t.intent, confidence: t.confidence,
      effort: t.effort, status: "queued", tokens: 0, tps: 0, startedAt: Date.now(),
      ttft: 0, tries, fallbacks: tries.filter(x => x.state === "fail").length, routeId: 9900 + Math.floor(Math.random() * 99)
    });
    state.events++;
    // Add a log row for the new request.
    state.data.logs.unshift({
      id: "r-" + id, at: new Date().toISOString(), agent: t.agent, session: t.title,
      provider: t.provider, model: t.model, status: "run", tokens: 0, ttft: 0, tps: 0, cost: 0
    });
    if (state.data.logs.length > 24) state.data.logs.pop();
  }

  /* ---------------------------------------------------------------- events --- */
  function bindEvents() {
    $("#style-toggle").addEventListener("click", (e) => {
      e.stopPropagation();
      const menu = $("#style-menu");
      $("#settings-menu").hidden = true;
      menu.hidden = !menu.hidden;
      syncStyleMenu();
    });
    $("#settings-toggle").addEventListener("click", (e) => {
      e.stopPropagation();
      const menu = $("#settings-menu");
      $("#style-menu").hidden = true;
      menu.hidden = !menu.hidden;
      syncSettingsMenu();
    });
    $("#settings-menu").addEventListener("click", e => {
      const b = e.target.closest("button[data-layout],button[data-density],button[data-motion]");
      if (!b) return;
      if (b.dataset.layout) applySetting("layout", b.dataset.layout);
      if (b.dataset.density) applySetting("density", b.dataset.density);
      if (b.dataset.motion) applySetting("motion", b.dataset.motion);
    });
    $("#style-menu").addEventListener("click", e => {
      const b = e.target.closest(".style-item");
      if (!b) return;
      applyStyle(b.dataset.style);
      $("#style-menu").hidden = true;
    });
    document.addEventListener("click", e => {
      const menu = $("#style-menu");
      if (!menu.hidden && !e.target.closest("#style-menu") && !e.target.closest("#style-toggle")) menu.hidden = true;
      const settings = $("#settings-menu");
      if (!settings.hidden && !e.target.closest("#settings-menu") && !e.target.closest("#settings-toggle")) settings.hidden = true;
    });
    document.addEventListener("keydown", e => {
      if (e.key === "Escape") { $("#style-menu").hidden = true; $("#settings-menu").hidden = true; }
    });

    $("#theme-toggle").addEventListener("click", () => {
      const root = document.documentElement;
      root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
      try { localStorage.setItem("magpie.theme", root.dataset.theme); } catch (_) {}
      setTimeout(() => { renderTrend(); drawWires(); }, 30);
    });

    $("#demo-toggle").addEventListener("click", () => {
      state.paused = !state.paused;
      renderMode();
      renderStatus();
      toast(state.paused ? "演示已暂停" : "演示继续");
    });

    $("#refresh").addEventListener("click", () => {
      if (state.mode === "live") connectLive(true);
      else {
        state.data = D.mockState();
        state.selectedSession = null;
        state.filter = null;
        renderAll();
        toast("演示快照已刷新");
      }
    });

    $("#conn-pill").addEventListener("click", () => {
      if (state.mode === "live") { switchDemo(); }
      else connectLive();
    });

    $("#range-seg").addEventListener("click", e => {
      const b = e.target.closest("button[data-range]");
      if (!b) return;
      state.range = b.dataset.range;
      $$("#range-seg button").forEach(x => x.classList.toggle("active", x === b));
      computeView();
      renderKPIs();
      renderTrend();
      renderStatus();
      if (state.mode === "live") connectLive(true);
    });

    $("#hero-modes").addEventListener("click", e => {
      const b = e.target.closest("button[data-hero]");
      if (b) setHeroMode(b.dataset.hero);
    });

    $("#trend-seg").addEventListener("click", e => {
      const b = e.target.closest("button[data-metric]");
      if (!b) return;
      state.trendMetric = b.dataset.metric;
      renderTrend();
    });

    $("#session-list").addEventListener("click", e => {
      const card = e.target.closest(".session-card");
      if (!card) return;
      const id = card.dataset.session;
      state.selectedSession = state.selectedSession === id ? null : id;
      state.filter = null;
      renderSessions();
      renderRouteStage();
      renderDecision();
      if (state.selectedSession) {
        const s = selectedSession();
        if (s) toast(`正在查看：${s.title}`);
      }
    });
    $("#session-list").addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") {
        const card = e.target.closest(".session-card");
        if (card) { e.preventDefault(); card.click(); }
      }
    });

    $$(".mini-tab[data-session-tab]").forEach(b => b.addEventListener("click", () => {
      state.sessionTab = b.dataset.sessionTab;
      $$(".mini-tab[data-session-tab]").forEach(x => x.classList.toggle("active", x === b));
      renderSessions();
    }));

    $("#route-stage").addEventListener("click", e => {
      const radarNode = e.target.closest(".radar-node");
      if (radarNode) {
        const v = radarNode.dataset.provider;
        state.filter = state.filter && state.filter.type === "provider" && state.filter.value === v ? null : { type: "provider", value: v };
        state.selectedSession = null;
        renderSessions();
        renderDecision();
        toast(state.filter ? "已筛选：" + D.providerMeta(v).name : "筛选已清除");
        return;
      }
      const agent = e.target.closest(".agent-node");
      const provider = e.target.closest(".provider-node");
      if (agent) {
        const v = agent.dataset.agent;
        state.filter = state.filter && state.filter.type === "agent" && state.filter.value === v ? null : { type: "agent", value: v };
      } else if (provider) {
        const v = provider.dataset.provider;
        state.filter = state.filter && state.filter.type === "provider" && state.filter.value === v ? null : { type: "provider", value: v };
      } else return;
      state.selectedSession = null;
      renderSessions();
      renderRouteStage();
      renderDecision();
      toast(state.filter ? "已筛选：" + (state.filter.type === "agent" ? D.agentMeta(state.filter.value).name : D.providerMeta(state.filter.value).name) : "筛选已清除");
    });
    $("#route-stage").addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") {
        const n = e.target.closest(".agent-node,.provider-node");
        if (n) { e.preventDefault(); n.click(); }
      }
    });

    $("#log-search").addEventListener("input", e => {
      state.logQuery = e.target.value.trim();
      renderLogs();
    });

    $("#log-export").addEventListener("click", () => {
      const rows = state.data.logs;
      const head = ["time", "agent", "session", "provider", "model", "status", "tokens", "ttft_ms", "tps", "cost_usd"];
      const csv = [head.join(",")].concat(rows.map(r => [
        r.at, r.agent, r.session, r.provider, r.model, r.status, r.tokens, r.ttft, r.tps, r.cost
      ].map(v => `"${String(v == null ? "" : v).replace(/"/g, '""')}"`).join(","))).join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `magpie-requests-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast("CSV 已导出");
    });

    $$(".nav-item[data-view]").forEach(b => b.addEventListener("click", () => {
      $$(".nav-item[data-view]").forEach(x => x.classList.toggle("active", x === b));
      const view = b.dataset.view;
      const target = view === "overview" ? $("#grid")
        : view === "routing" ? $(".hero")
        : view === "usage" ? $(".chart-card")
        : view === "sessions" ? $(".live-panel")
        : $(".quota-card");
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      toast("已定位到 " + b.textContent.trim());
    }));

    // Global shortcuts: / focuses search, space pauses demo, t toggles theme.
    document.addEventListener("keydown", e => {
      if (e.target.matches("input, textarea")) return;
      if (e.key === "/") { e.preventDefault(); $("#log-search").focus(); }
      if (e.key === " ") { e.preventDefault(); $("#demo-toggle").click(); }
      if (e.key.toLowerCase() === "t") { e.preventDefault(); $("#theme-toggle").click(); }
    });

    let resizeTimer = null;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        renderTrend(); renderHeatmap(); renderQuotas(); drawWires();
        if (state.heroMode === "radar") renderRadarView(true);
        if (state.heroMode === "loom") renderLoomView(true);
        if (state.heroMode === "rhythm") renderRhythmView(true);
      }, 120);
    });

    setInterval(() => {
      $("#clock").textContent = new Date().toLocaleTimeString("zh-CN", { hour12: false });
      if (!state.paused) {
        // Refresh relative ages in the session list without a full re-render.
        $$(".session-card").forEach(card => {
          const s = visibleSessions().find(x => x.id === card.dataset.session);
          if (!s) return;
          const spans = card.querySelectorAll(".session-bottom span");
          if (spans[1]) spans[1].textContent = fmtAge(Date.now() - s.startedAt);
        });
      }
    }, 1000);
  }

  /* ----------------------------------------------------------------- live --- */
  async function connectLive(silent) {
    try {
      if (!silent) toast("正在连接 Magpie…");
      const period = state.range === "7d" ? "week" : state.range === "30d" ? "month" : "today";
      const data = await D.fetchLive(period);
      state.mode = "live";
      state.data = data;
      state.liveError = false;
      if (!silent) {
        state.selectedSession = null;
        state.filter = null;
      }
      clearInterval(state.liveTimer);
      state.liveTimer = setInterval(() => connectLive(true), 2500);
      renderAll();
      if (!silent) toast("已连接 Magpie：" + (data.gateway || "127.0.0.1:3425"));
    } catch (err) {
      if (state.mode !== "live") {
        toast("无法连接本地网关，继续使用演示数据");
        switchDemo();
      } else {
        $("#conn-pill").dataset.mode = "offline";
        $("#conn-label").textContent = "连接中断";
        $("#live-dot").className = "live-dot off";
        if (!state.liveError) {
          state.liveError = true;
          toast("实时连接中断，保留最后一次快照");
        }
      }
    }
  }

  function switchDemo() {
    clearInterval(state.liveTimer);
    state.liveTimer = null;
    state.mode = "demo";
    state.data = D.mockState();
    state.selectedSession = null;
    state.filter = null;
    renderAll();
  }

  /* ------------------------------------------------------------- settings --- */
  function syncSettingsMenu() {
    const root = document.documentElement;
    $$("#layout-seg button").forEach(b => b.classList.toggle("active", b.dataset.layout === (root.dataset.layout || "auto")));
    $$("#density-seg button").forEach(b => b.classList.toggle("active", b.dataset.density === (root.dataset.density || "cozy")));
    $$("#motion-seg button").forEach(b => b.classList.toggle("active", b.dataset.motion === (root.dataset.motion || "full")));
  }
  function applySetting(kind, value) {
    const root = document.documentElement;
    root.dataset[kind] = value;
    try { localStorage.setItem("magpie." + kind, value); } catch (_) {}
    syncSettingsMenu();
    renderAll();
    requestAnimationFrame(drawWires);
    const names = { layout: { auto: "自动", fit: "一屏", comfort: "舒展" }, density: { compact: "紧凑", cozy: "标准", spacious: "宽松" }, motion: { full: "全部", soft: "轻柔", off: "关闭" } };
    const fallback = kind === "layout" && value === "fit" && (window.innerWidth < 1200 || window.innerHeight < 900);
    toast((kind === "layout" ? "布局：" : kind === "density" ? "密度：" : "动效：") + ((names[kind] || {})[value] || value)
      + (fallback ? "（当前尺寸改用滚动）" : ""));
  }

  /* ---------------------------------------------------------------- style --- */
  const STYLE_NAMES = { control: "控制室", pixel: "像素", paper: "纸感", neon: "霓虹" };
  function syncStyleMenu() {
    const style = document.documentElement.dataset.style || "control";
    $$(".style-item").forEach(b => b.classList.toggle("active", b.dataset.style === style));
  }
  function applyStyle(style) {
    document.documentElement.dataset.style = style;
    try { localStorage.setItem("magpie.style", style); } catch (_) {}
    syncStyleMenu();
    renderAll();
    if (state.heroMode === "route") requestAnimationFrame(drawWires);
    toast("风格：" + (STYLE_NAMES[style] || style));
  }

  /* ---------------------------------------------------------------- toast --- */
  let toastTimer = null;
  function toast(msg) {
    const el = $("#toast");
    el.textContent = msg;
    el.hidden = false;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.classList.remove("show");
      setTimeout(() => { el.hidden = true; }, 220);
    }, 2200);
  }

  /* ------------------------------------------------------------------ init --- */
  function init() {
    try { console.info("%c Magpie Observatory v0.6 · route / radar / loom / rhythm · 4 styles · layout settings", "color:#8b7cf6;font-weight:bold"); } catch (_) {}
    try {
      const hostTheme = new URLSearchParams(location.search).get("hostTheme");
      if (hostTheme === "light" || hostTheme === "dark") {
        if (!localStorage.getItem("magpie.theme")) document.documentElement.dataset.theme = hostTheme;
      }
      const saved = localStorage.getItem("magpie.theme");
      if (saved === "light") document.documentElement.dataset.theme = "light";
      if (saved === "dark") document.documentElement.dataset.theme = "dark";
      const savedStyle = localStorage.getItem("magpie.style");
      if (savedStyle) document.documentElement.dataset.style = savedStyle;
      ["layout", "density", "motion"].forEach(k => {
        const v = localStorage.getItem("magpie." + k);
        if (v) document.documentElement.dataset[k] = v;
      });
    } catch (_) {}
    syncStyleMenu();
    syncSettingsMenu();
    computeView();
    renderAll();
    bindEvents();
    setInterval(demoTick, 1200);
    // Countdowns should move even when no new request arrives.
    setInterval(() => {
      (state.data.quotas || []).forEach(q => (q.windows || []).forEach(w => {
        if (typeof w.resetsIn === "number" && w.resetsIn > 0) w.resetsIn -= 1;
      }));
      renderQuotas();
    }, 60000);
    requestAnimationFrame(flightLoop);
    // A small delayed redraw catches web-font/layout settling.
    setTimeout(() => { renderTrend(); drawWires(); }, 120);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
