/* ==========================================================================
   Magpie Observatory — 会话瀑布 (session waterfall / Gantt) view module.
   Standalone classic script: registers window.ObservatoryViews.waterfall.
   Every log row is laid on a shared time axis, grouped by session; each bar is
   a pale first-token segment followed by a solid streaming segment.
   ========================================================================== */
(function () {
  "use strict";

  const AUX_TITLE = "直接调用";
  const AUX_KEYS = { "": 1, "-": 1, "—": 1, "–": 1, "null": 1, "n/a": 1 };
  const STATUS_TEXT = { ok: "完成", run: "运行中", retry: "重试", err: "失败" };
  const TICKS = 4;                 // intervals → TICKS + 1 labels
  const MIN_ROWS = 3, MAX_ROWS = 8, MAX_TRACKS = 4, ROW_H = 46, ROW_GAP = 6;

  const HOSTS = new WeakMap();
  let selection = null;            // selected session key, shared across ticks

  /* ------------------------------------------------------------- sanity --- */
  const num = (v) => { const n = Number(v); return isFinite(n) ? n : 0; };
  const pad2 = (n) => String(n).padStart(2, "0");

  function clock(ms) {
    const d = new Date(ms);
    return pad2(d.getHours()) + ":" + pad2(d.getMinutes()) + ":" + pad2(d.getSeconds());
  }
  function clockShort(ms) {
    const d = new Date(ms);
    return pad2(d.getHours()) + ":" + pad2(d.getMinutes());
  }
  function fmtDur(ms) {
    if (!isFinite(ms) || ms <= 0) return "0s";
    if (ms < 1000) return Math.round(ms) + "ms";
    if (ms < 60000) { const s = ms / 1000; return (s < 10 ? s.toFixed(1) : String(Math.round(s))) + "s"; }
    const m = Math.floor(ms / 60000), s = Math.round((ms % 60000) / 1000);
    return m + "m" + (s ? s + "s" : "");
  }
  // aux ("—" / "" / null) calls carry no session and are bucketed together.
  function sessionKey(v) {
    const s = v == null ? "" : String(v).trim();
    return AUX_KEYS[s.toLowerCase()] ? AUX_TITLE : s;
  }
  // ttft + tokens/tps; a zero tps falls back to a 50 tps estimate, capped at 60s.
  function durationOf(r) {
    const ttft = Math.max(0, num(r.ttft));
    const tokens = Math.max(0, num(r.tokens));
    const tps = Math.max(0, num(r.tps));
    const stream = tps > 0 ? tokens / tps * 1000 : Math.min(Math.max(tokens, 200) / 50 * 1000, 60000);
    return { ttft, stream, dur: ttft + stream };
  }
  function bump(map, key) { map.set(key, (map.get(key) || 0) + 1); }
  function top(map) {
    let best = null, bestN = -1;
    map.forEach((n, k) => { if (n > bestN) { bestN = n; best = k; } });
    return best;
  }
  // How many lanes fit: measured from the real lane area once it is laid out,
  // never from the content (the lane box is flex-sized, so this stays stable).
  function rowCapacity(st) {
    const box = st && st.rows ? st.rows.clientHeight : 0;
    const first = st && st.rows && st.rows.firstElementChild && st.rows.firstElementChild.classList.contains("wf-row")
      ? st.rows.firstElementChild.getBoundingClientRect().height : 0;
    const rowH = first > 20 ? first : ROW_H;
    if (box < 40) return MIN_ROWS;
    const fit = Math.floor((box + ROW_GAP) / (rowH + ROW_GAP));
    return Math.max(MIN_ROWS, Math.min(MAX_ROWS, isFinite(fit) ? fit : MIN_ROWS));
  }

  /* -------------------------------------------------------------- model --- */
  function buildModel(ctx, st) {
    const logs = Array.isArray(ctx.logs) ? ctx.logs : [];
    const groups = new Map();
    for (const r of logs) {
      if (!r) continue;
      const t = Date.parse(r.at);
      if (!isFinite(t)) continue;
      const key = sessionKey(r.session);
      let g = groups.get(key);
      if (!g) {
        g = { key, title: key, aux: key === AUX_TITLE, reqs: [], tokens: 0, agents: new Map(), providers: new Map() };
        groups.set(key, g);
      }
      const d = durationOf(r);
      g.reqs.push({ t, ttft: d.ttft, dur: d.dur, r });
      g.tokens += Math.max(0, num(r.tokens));
      bump(g.agents, r.agent || "unknown");
      bump(g.providers, r.provider || "unknown");
    }

    const all = [];
    groups.forEach(g => {
      if (!g.reqs.length) return;
      g.reqs.sort((a, b) => a.t - b.t);
      // Concurrent requests in one session would hide each other: give each a
      // sub-track where it does not overlap the one already there.
      const lastEnd = [];
      g.reqs.forEach(q => {
        let track = lastEnd.findIndex(end => q.t >= end);
        if (track < 0) {
          if (lastEnd.length < MAX_TRACKS) { lastEnd.push(0); track = lastEnd.length - 1; }
          else {
            track = 0;
            for (let i = 1; i < lastEnd.length; i++) if (lastEnd[i] < lastEnd[track]) track = i;
          }
        }
        lastEnd[track] = q.t + q.dur;
        q.track = track;
      });
      g.tracks = Math.max(1, lastEnd.length);
      g.start = g.reqs[0].t;
      g.end = g.reqs.reduce((m, q) => Math.max(m, q.t + q.dur), g.start);
      g.span = g.end - g.start;
      g.agent = top(g.agents) || "unknown";
      g.provider = top(g.providers) || "unknown";
      g.errs = g.reqs.filter(q => q.r.status === "err").length;
      all.push(g);
    });

    const aux = all.filter(g => g.aux);
    const busy = all.filter(g => !g.aux).sort((a, b) => a.start - b.start || a.end - b.end);
    const ordered = busy.concat(aux);                       // auxiliary calls always last
    const cap = rowCapacity(st);
    let rows = ordered;
    if (ordered.length > cap) {
      const room = aux.length ? cap - 1 : cap;
      rows = busy.slice(Math.max(0, busy.length - Math.max(1, room))).concat(aux);
    }

    let t0 = Infinity, t1 = -Infinity, reqs = 0, tokens = 0, errs = 0;
    rows.forEach(g => {
      t0 = Math.min(t0, g.start);
      t1 = Math.max(t1, g.end);
      reqs += g.reqs.length;
      tokens += g.tokens;
      errs += g.errs;
    });
    if (!rows.length) { t0 = t1 = 0; }
    const span = Math.max(1, t1 - t0);
    const slow = rows.reduce((b, g) => (!b || g.span > b.span ? g : b), null);
    const ticks = [];
    for (let i = 0; i <= TICKS; i++) {
      const p = i / TICKS;
      ticks.push({ pct: p * 100, at: t0 + p * span });
    }

    return {
      logs, total: logs.length, t0, t1, span, ticks, rows, reqs, tokens, errs,
      sessions: ordered.length, dropped: ordered.length - rows.length, slow,
      short: span >= 600000,
      empty: logs.length < 2 || !rows.length
    };
  }

  function signature(m, ctx, st) {
    return [
      m.empty ? "e" : "d", m.total, m.t0, m.span, m.short ? 1 : 0, selection || "", ctx.motion || "full",
      m.rows.map(g => g.key + ":" + g.reqs.map(q =>
        q.t + "," + q.dur.toFixed(2) + "," + q.ttft.toFixed(2) + "," + q.r.provider + "," +
        q.r.status + "," + q.r.tokens + "," + q.r.tps + "," + q.r.model + "," + q.track).join(";")).join("|")
    ].join("~");
  }

  /* --------------------------------------------------------------- shell --- */
  function stateFor(host) {
    let st = HOSTS.get(host);
    if (!st) {
      st = { root: null, tip: null, rows: null, sig: null, model: null, ctx: null, host: null, ro: null, cap: null, entered: false, timer: null };
      HOSTS.set(host, st);
    }
    return st;
  }

  function mount(host, st) {
    host.innerHTML = "";
    const root = document.createElement("div");
    root.className = "wf-root";
    root.innerHTML =
      '<div class="wf-main">' +
        '<div class="wf-axis"><span class="wf-axis-pad"></span><div class="wf-ticks"></div></div>' +
        '<div class="wf-rows"></div>' +
        '<div class="wf-foot"></div>' +
      "</div>" +
      '<aside class="wf-side" aria-label="会话列表"></aside>' +
      '<div class="wf-tip" role="tooltip" hidden></div>';
    host.appendChild(root);
    st.root = root;
    st.tip = root.querySelector(".wf-tip");
    st.rows = root.querySelector(".wf-rows");
    bind(root, st);
    if (typeof ResizeObserver === "function" && !st.ro) {
      // The stage decides how many lanes fit; re-render only when that changes.
      st.ro = new ResizeObserver(() => {
        if (!st.host || !st.ctx || !st.root) return;
        if (rowCapacity(st) === st.cap) return;
        st.sig = null;
        render(st.host, st.ctx);
      });
      st.ro.observe(host);
      st.ro.observe(st.rows);
    }
  }

  function bind(root, st) {
    root.addEventListener("pointermove", (e) => {
      const bar = e.target.closest ? e.target.closest(".wf-bar") : null;
      if (!bar) { hideTip(st); return; }
      const rect = root.getBoundingClientRect();
      showTip(st, bar, e.clientX - rect.left, e.clientY - rect.top);
    });
    root.addEventListener("pointerleave", () => hideTip(st));
    root.addEventListener("focusin", (e) => {
      const bar = e.target.closest ? e.target.closest(".wf-bar") : null;
      if (!bar) return;
      const rect = root.getBoundingClientRect();
      const b = bar.getBoundingClientRect();
      showTip(st, bar, b.left + b.width / 2 - rect.left, b.top - rect.top);
    });
    root.addEventListener("focusout", () => hideTip(st));
    root.addEventListener("click", (e) => {
      const el = e.target.closest ? e.target.closest("[data-wf-toggle]") : null;
      if (!el) return;
      toggle(st, el.dataset.wfToggle);
    });
    root.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      const el = e.target.closest ? e.target.closest("[data-wf-toggle]") : null;
      if (!el) return;
      e.preventDefault();
      toggle(st, el.dataset.wfToggle);
    });
  }

  function toggle(st, key) {
    if (!key) return;
    selection = selection === key ? null : key;
    if (st.ctx) render(st.host, st.ctx);
  }

  function showTip(st, bar, x, y) {
    const m = st.model;
    if (!m || !st.tip) return;
    const g = m.rows[Number(bar.dataset.gi)];
    const q = g && g.reqs[Number(bar.dataset.bi)];
    if (!q) { hideTip(st); return; }
    const ctx = st.ctx || {};
    const esc = ctx.esc || ((v) => String(v == null ? "" : v));
    const fmtTok = ctx.fmtTokens || ((n) => String(num(n)));
    const meta = ctx.providerMeta ? ctx.providerMeta(q.r.provider) : { name: q.r.provider };
    st.tip.innerHTML =
      '<b>' + esc(meta.name) + " · " + esc(q.r.model || "—") + "</b>" +
      "<span>" + esc(g.title) + "</span>" +
      "<span>tokens <b>" + fmtTok(q.r.tokens) + "</b> · TTFT <b>" + (q.ttft > 0 ? fmtDur(q.ttft) : "—") +
      "</b> · TPS <b>" + (num(q.r.tps) > 0 ? num(q.r.tps).toFixed(1) : "—") + "</b></span>" +
      "<span>" + esc(STATUS_TEXT[q.r.status] || q.r.status || "—") + " · " + clock(q.t) + "</span>";
    st.tip.hidden = false;
    const rect = st.root.getBoundingClientRect();
    const clamp = ctx.clamp || ((n, a, b) => Math.max(a, Math.min(b, n)));
    st.tip.style.left = clamp(x, 108, Math.max(108, rect.width - 108)) + "px";
    st.tip.style.top = clamp(y - 10, 34, Math.max(34, rect.height - 8)) + "px";
  }

  function hideTip(st) { if (st.tip && !st.tip.hidden) st.tip.hidden = true; }

  /* --------------------------------------------------------------- paint --- */
  function paint(st, m, ctx) {
    const esc = ctx.esc || ((v) => String(v == null ? "" : v));
    const fmtTok = ctx.fmtTokens || ((n) => String(num(n)));
    const pMeta = ctx.providerMeta || (() => ({ color: "#8b7cf6", name: "" }));
    const aIcon = ctx.agentIcon || (() => "");
    const root = st.root;

    root.dataset.motion = ctx.motion || "full";
    root.classList.toggle("is-empty", !!m.empty);

    if (m.empty) {
      st.rows.innerHTML =
        '<div class="wf-empty">' +
          '<svg viewBox="0 0 64 40" aria-hidden="true">' +
            '<rect x="6" y="6" width="30" height="6" rx="3"/>' +
            '<rect x="16" y="17" width="42" height="6" rx="3"/>' +
            '<rect x="10" y="28" width="22" height="6" rx="3"/>' +
          "</svg>" +
          "<b>账本累计到 2 条以上请求，这里就会铺出瀑布</b>" +
          "<span>每一行是一个会话，横向是请求时间；淡色段是首 token，实色段是流式输出，" +
          "失败请求描红并打上斜纹，重试请求带琥珀色左边。</span>" +
        "</div>";
      root.querySelector(".wf-ticks").innerHTML = "";
      root.querySelector(".wf-foot").innerHTML = "";
      root.querySelector(".wf-side").innerHTML = sideEmpty(ctx);
      st.entered = true;
      hideTip(st);
      return;
    }

    root.querySelector(".wf-ticks").innerHTML = m.ticks.map((t, i) =>
      '<span class="wf-tick' + (i === 0 ? " is-first" : i === m.ticks.length - 1 ? " is-last" : "") + '"' +
      ' style="left:' + t.pct.toFixed(3) + '%">' + (m.short ? clockShort(t.at) : clock(t.at)) + "</span>").join("");

    st.rows.innerHTML = m.rows.map((g, i) => {
      const sel = selection === g.key;
      const dim = !!selection && !sel;
      const color = pMeta(g.provider).color || "var(--accent)";
      const bars = g.reqs.map((q, j) => {
        const left = (q.t - m.t0) / m.span * 100;
        const width = Math.max(q.dur / m.span * 100, 0.02);
        const ttft = q.dur > 0 ? Math.min(100, q.ttft / q.dur * 100) : 0;
        const st2 = ["ok", "run", "retry", "err"].indexOf(q.r.status) >= 0 ? q.r.status : "ok";
        return '<span class="wf-bar wf-st-' + st2 + (ttft > 0 ? "" : " wf-solo") + '"' +
          ' data-gi="' + i + '" data-bi="' + j + '" tabindex="0"' +
          ' style="left:' + left.toFixed(3) + "%;width:" + width.toFixed(3) + "%;--wf-c:" + esc(color) +
          ";--wf-tracks:" + g.tracks + ";--wf-track:" + q.track + '"' +
          ' aria-label="' + esc(clock(q.t) + " " + (q.r.model || "") + " " + fmtTok(q.r.tokens) + " tokens") + '">' +
          '<i class="wf-hit" aria-hidden="true"></i>' +
          (ttft > 0 ? '<i class="wf-ttft" style="width:' + ttft.toFixed(2) + '%"></i>' : "") +
          '<i class="wf-stream" style="left:' + ttft.toFixed(2) + '%"></i>' +
          "</span>";
      }).join("");
      return '<div class="wf-row' + (sel ? " is-sel" : "") + (dim ? " is-dim" : "") + '"' +
        ' data-session="' + esc(g.key) + '" style="--i:' + i + '">' +
        '<div class="wf-row-head" data-wf-toggle="' + esc(g.key) + '" role="button" tabindex="0"' +
        ' title="' + esc(g.title + " · " + g.reqs.length + " 次请求") + '">' +
          '<span class="wf-agent"><img src="' + esc(aIcon(g.agent)) + '" alt=""></span>' +
          '<span class="wf-copy"><b class="wf-title">' + esc(g.title) + "</b>" +
          "<small>" + g.reqs.length + " 次 · " + fmtTok(g.tokens) + " tokens</small></span>" +
        "</div>" +
        '<div class="wf-lane">' +
          m.ticks.map(t => '<i class="wf-grid" style="left:' + t.pct.toFixed(3) + '%"></i>').join("") +
          bars +
        "</div>" +
      "</div>";
    }).join("");

    root.querySelector(".wf-foot").innerHTML =
      "<span>" + (m.dropped > 0
        ? "另有 " + m.dropped + " 个更早会话未显示"
        : m.sessions + " 个会话 · " + m.reqs + " 次请求") + "</span>" +
      (m.errs ? '<span class="wf-foot-bad">' + m.errs + " 次失败</span>" : "") +
      '<span class="wf-legend">' +
        '<span class="wf-key"><i class="wf-key-ttft"></i>首 token</span>' +
        '<span class="wf-key"><i class="wf-key-stream"></i>流式</span>' +
        '<span class="wf-key"><i class="wf-key-bad"></i>失败</span>' +
        '<span class="wf-key"><i class="wf-key-retry"></i>重试</span>' +
      "</span>";

    root.querySelector(".wf-side").innerHTML = sideHTML(m, ctx, esc, fmtTok, aIcon);

    if (!st.entered && (ctx.motion || "full") !== "off") {
      root.classList.add("wf-enter");
      clearTimeout(st.timer);
      st.timer = setTimeout(() => root.classList.remove("wf-enter"), 900 + m.rows.length * 60);
    }
    st.entered = true;
    hideTip(st);
  }

  function sideEmpty(ctx) {
    const esc = ctx.esc || ((v) => String(v == null ? "" : v));
    return '<span class="wf-side-title">' + esc("SESSION WATERFALL") + "</span>" +
      '<p class="wf-side-note">暂无会话。<br>Magpie 账本写入请求后，这里会列出每个会话的请求数、token 与时间跨度。</p>';
  }

  function sideHTML(m, ctx, esc, fmtTok, aIcon) {
    const slow = m.slow;
    const items = m.rows.map(g => {
      const sel = selection === g.key;
      const dim = !!selection && !sel;
      return '<button type="button" class="wf-item' + (sel ? " is-sel" : "") + (dim ? " is-dim" : "") + '"' +
        ' data-wf-toggle="' + esc(g.key) + '" aria-pressed="' + (sel ? "true" : "false") + '">' +
        '<span class="wf-item-ic"><img src="' + esc(aIcon(g.agent)) + '" alt=""></span>' +
        '<span class="wf-item-copy"><b>' + esc(g.title) + "</b>" +
        "<small>" + g.reqs.length + " 次 · " + fmtTok(g.tokens) + " tokens</small></span>" +
        '<span class="wf-item-span"><b>' + fmtDur(g.span) + "</b><small>" + clock(g.start) + "</small></span>" +
      "</button>";
    }).join("");

    return '<span class="wf-side-title">' + esc("SESSION WATERFALL") + "</span>" +
      '<div class="wf-sum">' +
        '<div class="wf-stat"><span>会话</span><b>' + m.sessions + "</b></div>" +
        '<div class="wf-stat"><span>请求</span><b>' + m.reqs + "</b></div>" +
        '<div class="wf-stat"><span>Token</span><b>' + fmtTok(m.tokens) + "</b></div>" +
        '<div class="wf-stat wf-slow"><span>最慢会话</span><b>' + fmtDur(slow ? slow.span : 0) + "</b>" +
          "<small>" + esc(slow ? slow.title : "—") + "</small></div>" +
      "</div>" +
      '<div class="wf-list">' + items + "</div>" +
      '<p class="wf-side-note">' + esc(m.dropped > 0
        ? "点击会话聚焦 · 另有 " + m.dropped + " 个更早会话未显示"
        : "点击会话聚焦这一行") + "</p>";
  }

  /* ---------------------------------------------------------------- api --- */
  function render(host, ctx) {
    if (!host) return;
    ctx = ctx || {};
    const st = stateFor(host);
    st.host = host;
    st.ctx = ctx;
    if (!st.root || !host.contains(st.root)) {
      if (st.ro) { st.ro.disconnect(); st.ro = null; }
      mount(host, st);
      st.sig = null;
      st.entered = false;
    }
    const model = buildModel(ctx, st);
    st.cap = rowCapacity(st);
    const sig = signature(model, ctx, st);
    if (sig === st.sig) return;
    st.sig = sig;
    st.model = model;
    paint(st, model, ctx);
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews["waterfall"] = { title: "会话瀑布", eyebrow: "SESSION WATERFALL", render };
})();
