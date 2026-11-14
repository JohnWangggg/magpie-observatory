/* ==========================================================================
   Magpie Observatory — hero view module: 开局 (PLAY).
   Standalone classic script. Registers window.ObservatoryViews["play"].

   The dashboard stops reporting and starts keeping score: every request log
   entry becomes a play. A vinyl dial ring has one lit tick per provider; the
   needle sweeps to whichever provider handled the latest call. Each call
   lands in a terminal-style stream with a judgment — PERFECT for a fast first
   token, GREAT for a clean route, GOOD for a fallback, MISS for a failure.
   Consecutive non-misses build a combo; the best run survives in localStorage.

   Reads: ctx.logs, ctx.kpis, ctx.providerMeta/providerOfModel, ctx.agentMeta.
   Writes: none — self-contained DOM + canvas inside the host .stage-view.
   ========================================================================== */
(function () {
  "use strict";

  const HOSTS = new WeakMap();
  const TOOLS = ["Read", "Edit", "Bash", "Grep", "Glob", "Write", "Task", "WebFetch", "LSP", "Notebook"];
  const JUDGE_COLOR = { PERFECT: "#7ff3ff", GREAT: "#4ade80", GOOD: "#fbbf24", MISS: "#ff6b6b" };
  const TICKS = 40;
  const SWEEP_MS = 520;          // needle easing time to the newest call
  const STREAM_MAX = 18;

  /* ------------------------------------------------------------- helpers --- */
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const num = v => { const n = Number(v); return isFinite(n) ? n : 0; };
  function hash32(s) {
    let h = 2166136261;
    s = String(s);
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return h >>> 0;
  }
  function fmtTok(v) {
    const n = num(v);
    if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
    if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
    return String(Math.round(n));
  }
  function fmtMs(v) {
    const n = num(v);
    if (!n) return "—";
    if (n >= 60000) return (n / 60000).toFixed(1) + "m";
    if (n >= 1000) return (n / 1000).toFixed(1) + "s";
    return Math.round(n) + "ms";
  }

  /* ------------------------------------------------------------ judgement -- */
  // One call → one verdict. The whole game hangs on these four words.
  function judge(log, kpis) {
    if (!log || log.status === "err" || log.status === "error") return "MISS";
    const ttft = num(log.ttft);
    const cache = num(kpis && kpis.cache);
    if (ttft > 0 && ttft < 500) return "PERFECT";
    if (cache >= 80) return "PERFECT";
    if (log.status === "ok" || log.status === "done") return "GREAT";
    if (log.status === "retry") return "GOOD";
    return "GOOD";
  }
  function toolOf(log) {
    // Demo logs carry no tool field; derive a plausible one from the request
    // so the stream reads like a session, not a metric dump.
    const seed = hash32(String(log.id || log.ts || ""));
    const tool = TOOLS[seed % TOOLS.length];
    const target = log.provider ? (log.model || log.provider) : (log.model || "unknown");
    return { tool, target };
  }

  /* ----------------------------------------------------------------- state - */
  function st(host) {
    let s = HOSTS.get(host);
    if (!s) {
      s = {
        mounted: false,
        dial: null, needle: null, ticks: [], stream: null,
        comboEl: null, bestEl: null, judgeEl: null,
        seenIds: new Set(), lastTickAt: 0,
        needleAt: 0, needleFrom: 0, needleTo: 0, needleStart: 0,
        combo: 0, best: 0, judged: { PERFECT: 0, GREAT: 0, GOOD: 0, MISS: 0 },
        tickHeat: new Float32Array(TICKS),
        recent: [], stepIdx: -1,
        raf: 0
      };
      try { s.best = +localStorage.getItem("magpie.playBest") || 0; } catch (_) {}
      HOSTS.set(host, s);
    }
    return s;
  }

  /* -------------------------------------------------------------- DOM ---- */
  function mount(host) {
    const s = st(host);
    if (s.mounted) return;
    host.innerHTML = "";
    host.className = "stage-view view-play";

    // left: the dial
    const dialWrap = document.createElement("div");
    dialWrap.className = "play-dial-wrap";
    dialWrap.innerHTML = `
      <svg class="play-dial" viewBox="0 0 400 400" aria-hidden="true">
        <defs>
          <radialGradient id="pg-center" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="rgba(127,243,255,.14)"/>
            <stop offset="60%" stop-color="rgba(139,124,246,.06)"/>
            <stop offset="100%" stop-color="transparent"/>
          </radialGradient>
        </defs>
        <circle cx="200" cy="200" r="186" fill="url(#pg-center)"/>
        <g class="play-ticks"></g>
        <g class="play-needle-g">
          <line class="play-needle" x1="200" y1="200" x2="200" y2="34" stroke="var(--accent)" stroke-width="2.4" stroke-linecap="round"/>
          <circle cx="200" cy="34" r="4.5" fill="var(--accent)" class="play-needle-tip"/>
        </g>
        <g class="play-hub">
          <circle cx="200" cy="200" r="52" class="play-hub-ring"/>
          <text class="play-hub-label" x="200" y="196" text-anchor="middle">COMBO</text>
          <text class="play-hub-num" x="200" y="220" text-anchor="middle">0</text>
          <text class="play-hub-mult" x="200" y="238" text-anchor="middle">×1.0</text>
        </g>
      </svg>
      <div class="play-dial-foot"><span class="play-foot-label">CALLS</span><b class="play-foot-num">0</b></div>`;

    // right: the call stream + judgment
    const right = document.createElement("div");
    right.className = "play-right";
    right.innerHTML = `
      <div class="play-score">
        <div class="play-score-row">
          <div class="play-judge" id="play-judge">READY</div>
          <div class="play-combo-box">
            <div class="play-combo-label">COMBO</div>
            <div class="play-combo-num"><b id="play-combo">0</b><small>×<span id="play-mult">1.0</span></small></div>
          </div>
          <div class="play-best-box">
            <div class="play-best-label">BEST</div>
            <div class="play-best-num" id="play-best">0</div>
          </div>
        </div>
        <div class="play-judge-dots" id="play-judge-dots"></div>
      </div>
      <div class="play-stream-wrap">
        <div class="play-stream-head"><span>CALL STREAM</span><span id="play-stream-count">0 / 0</span></div>
        <div class="play-stream" id="play-stream"></div>
      </div>`;

    host.appendChild(dialWrap);
    host.appendChild(right);

    s.dial = dialWrap.querySelector(".play-ticks");
    s.needle = dialWrap.querySelector(".play-needle-g");
    s.stream = right.querySelector("#play-stream");
    s.streamCount = right.querySelector("#play-stream-count");
    s.comboEl = right.querySelector("#play-combo");
    s.multEl = right.querySelector("#play-mult");
    s.bestEl = right.querySelector("#play-best");
    s.judgeEl = right.querySelector("#play-judge");
    s.judgeDots = right.querySelector("#play-judge-dots");
    s.callsEl = dialWrap.querySelector(".play-foot-num");
    s.hubNum = dialWrap.querySelector(".play-hub-num");
    s.hubMult = dialWrap.querySelector(".play-hub-mult");

    // paint the tick ring once
    s.dial.innerHTML = "";
    s.ticks = [];
    for (let i = 0; i < TICKS; i++) {
      const a = (i / TICKS) * Math.PI * 2 - Math.PI / 2;
      const cos = Math.cos(a), sin = Math.sin(a);
      const l = document.createElementNS("http://www.w3.org/2000/svg", "line");
      l.setAttribute("x1", 200 + cos * 172);
      l.setAttribute("y1", 200 + sin * 172);
      l.setAttribute("x2", 200 + cos * 186);
      l.setAttribute("y2", 200 + sin * 186);
      l.setAttribute("class", "play-tick");
      l.dataset.i = i;
      s.dial.appendChild(l);
      s.ticks.push(l);
    }
    s.mounted = true;
  }

  /* ------------------------------------------------------------ provider --- */
  function providerIndex(logs, providers) {
    const map = {};
    (providers || []).forEach((p, i) => { map[p.id || p.name || p] = i; });
    const latest = logs && logs[0];
    const name = latest && latest.provider;
    if (name != null && map[name] != null) return map[name];
    return 0;
  }

  /* -------------------------------------------------------------- render --- */
  function render(host, ctx) {
    mount(host);
    const s = st(host);
    const logs = (ctx && ctx.logs) || [];
    const providers = (ctx && ctx.data && ctx.data.providers) || [];
    const kpis = (ctx && ctx.kpis) || {};

    // —— colour the ticks by provider —————————————————————————————————————
    const provColors = providers.map(p => (ctx.providerMeta && ctx.providerMeta(p.id || p.name || p).color) || "#8b7cf6");
    const nProv = Math.max(1, providers.length);
    s.ticks.forEach((tick, i) => {
      const pIdx = Math.floor(i / TICKS * nProv);
      tick.style.stroke = provColors[pIdx] || "#8b7cf6";
    });

    // —— new logs → events ———————————————————————————————————————————————
    let newest = null;
    for (const log of logs) {
      const id = log.id || log.ts;
      if (s.seenIds.has(id)) continue;
      s.seenIds.add(id);
      newest = newest || log;
      const j = judge(log, kpis);
      s.judged[j] = (s.judged[j] || 0) + 1;
      if (j === "MISS") s.combo = 0; else s.combo++;
      if (s.combo > s.best) {
        s.best = s.combo;
        try { localStorage.setItem("magpie.playBest", String(s.best)); } catch (_) {}
      }
      if (ctx.game && ctx.game.comboMilestone) ctx.game.comboMilestone(s.combo);
      const pIdx = providerIndex([log], providers);
      const tickIdx = Math.floor(pIdx / Math.max(1, providers.length) * TICKS);
      s.tickHeat[tickIdx] = 1.0;
      s.tickHeat[clamp(tickIdx - 1, 0, TICKS - 1)] = Math.max(s.tickHeat[clamp(tickIdx - 1, 0, TICKS - 1)], 0.5);
      s.tickHeat[clamp(tickIdx + 1, 0, TICKS - 1)] = Math.max(s.tickHeat[clamp(tickIdx + 1, 0, TICKS - 1)], 0.5);
      pushStreamLine(s, log, j, ctx);
      s.recent.unshift({ log, j, el: null });
      s.recent[0].el = s.stream.firstChild;
      if (s.recent.length > STREAM_MAX) s.recent.length = STREAM_MAX;
    }
    // keep the seen set bounded
    if (s.seenIds.size > 400) {
      const arr = [...s.seenIds];
      arr.slice(0, 200).forEach(id => s.seenIds.delete(id));
    }

    // —— needle target ——————————————————————————————————————————————————
    if (newest) {
      const pIdx = providerIndex(logs, providers);
      s.needleTo = pIdx / Math.max(1, providers.length);
      // shortest arc
      let diff = s.needleTo - s.needleAt;
      if (diff > 0.5) diff -= 1; else if (diff < -0.5) diff += 1;
      s.needleFrom = s.needleAt;
      s.needleStart = performance.now();
      s.needleDelta = diff;
      const jLatest = judge(newest, kpis);
      flashJudge(s, jLatest);
      if (jLatest === "PERFECT") {
        const wrap = s.dial.closest(".play-dial-wrap");
        if (wrap) {
          wrap.classList.remove("perfect-flash");
          void wrap.offsetWidth;
          wrap.classList.add("perfect-flash");
          setTimeout(() => wrap.classList.remove("perfect-flash"), 700);
        }
      }
    }

    // —— HUD numbers ————————————————————————————————————————————————————
    s.comboEl.textContent = s.combo;
    const mult = 1 + Math.min(4, Math.floor(s.combo / 5));
    s.multEl.textContent = mult.toFixed(1);
    s.hubNum.textContent = s.combo;
    s.hubMult.textContent = "×" + mult.toFixed(1);
    s.bestEl.textContent = s.best;
    s.callsEl.textContent = fmtTok(kpis.requests || logs.length);
    s.streamCount.textContent = s.judged.PERFECT + s.judged.GREAT + s.judged.GOOD + s.judged.MISS + " / " + s.seenIds.size;
    paintJudgeDots(s);

    // —— keep animating —————————————————————————————————————————————————
    if (!s.raf) s.raf = requestAnimationFrame(t => tick(s, t, ctx));
    bindStep(ctx);
  }

  function flashJudge(s, j) {
    s.judgeEl.textContent = j;
    s.judgeEl.style.color = JUDGE_COLOR[j] || "var(--text)";
    s.judgeEl.classList.remove("judge-flash");
    void s.judgeEl.offsetWidth;
    s.judgeEl.classList.add("judge-flash");
  }
  function paintJudgeDots(s) {
    const total = s.judged.PERFECT + s.judged.GREAT + s.judged.GOOD + s.judged.MISS;
    const dots = [];
    const cap = 40;
    const scale = total > cap ? cap / total : 1;
    [["PERFECT", s.judged.PERFECT], ["GREAT", s.judged.GREAT], ["GOOD", s.judged.GOOD], ["MISS", s.judged.MISS]].forEach(([k, n]) => {
      const m = Math.max(0, Math.round(n * scale));
      for (let i = 0; i < m; i++) dots.push(`<i class="play-dot" style="background:${JUDGE_COLOR[k]}" title="${k}"></i>`);
    });
    s.judgeDots.innerHTML = dots.join("");
  }

  function pushStreamLine(s, log, j, ctx) {
    const { tool, target } = toolOf(log);
    const meta = (ctx.providerMeta && ctx.providerMeta(log.provider)) || {};
    const color = meta.color || "#8b7cf6";
    const name = meta.name || log.provider || "?";
    const line = document.createElement("div");
    line.className = "play-line" + (j === "MISS" ? " miss" : "");
    line.innerHTML = `
      <span class="play-line-judge" style="color:${JUDGE_COLOR[j]}">${j.slice(0, 1)}</span>
      <span class="play-line-tool">${esc(tool)}</span>
      <span class="play-line-arrow">→</span>
      <span class="play-line-target" style="color:${color}">${esc(name)}</span>
      <span class="play-line-model">${esc(target)}</span>
      <span class="play-line-ms">${fmtMs(log.ttft)}</span>
      <span class="play-line-tok">${fmtTok(log.tokens)}</span>`;
    s.stream.prepend(line);
    while (s.stream.children.length > STREAM_MAX) s.stream.lastChild.remove();
  }

  /* ----------------------------------------------------------- animation --- */
  function tick(s, t, ctx) {
    if (!st(document.querySelector(".view-play"))) { s.raf = 0; return; }
    const host = document.querySelector(".view-play");
    if (!host || host.hidden) { s.raf = 0; return; }

    // needle easing
    const p = clamp((t - s.needleStart) / SWEEP_MS, 0, 1);
    const ease = 1 - Math.pow(1 - p, 3);
    s.needleAt = s.needleFrom + (s.needleDelta || 0) * ease;
    if (s.needleAt > 1) s.needleAt -= 1;
    if (s.needleAt < 0) s.needleAt += 1;
    const ang = s.needleAt * 360;
    s.needle.setAttribute("transform", `rotate(${ang} 200 200)`);

    // tick heat decay + paint
    for (let i = 0; i < TICKS; i++) {
      s.tickHeat[i] *= 0.94;
      const h = s.tickHeat[i];
      const el = s.ticks[i];
      if (h > 0.03) {
        el.style.opacity = 0.25 + h * 0.75;
        el.style.strokeWidth = 1.5 + h * 2.5;
      } else {
        el.style.opacity = 0.16;
        el.style.strokeWidth = 1.5;
      }
    }
    s.raf = requestAnimationFrame(tt => tick(s, tt, ctx));
  }

  /* ----------------------------------------------------- step through calls -- */
  // ←/→ walks the call stream: the line lights up, the needle swings to that
  // call's provider sector, the judge flashes again. Esc returns to live.
  function stepStream(dir, ctx) {
    const host = document.querySelector(".view-play");
    if (!host || host.hidden) return;
    const s = st(host);
    if (!s.recent.length) return;
    const next = clamp(s.stepIdx + dir, -1, s.recent.length - 1);
    s.stepIdx = next;
    s.recent.forEach((r, i) => { if (r.el) r.el.classList.toggle("stepped", i === next); });
    if (next < 0) return;
    const r = s.recent[next];
    const providers = (ctx && ctx.data && ctx.data.providers) || [];
    const pIdx = providerIndex([r.log], providers);
    s.needleTo = pIdx / Math.max(1, providers.length);
    let diff = s.needleTo - s.needleAt;
    if (diff > 0.5) diff -= 1; else if (diff < -0.5) diff += 1;
    s.needleFrom = s.needleAt;
    s.needleStart = performance.now();
    s.needleDelta = diff;
    flashJudge(s, r.j);
  }

  let stepBound = false;
  function bindStep(ctx) {
    if (stepBound) return;
    stepBound = true;
    document.addEventListener("keydown", e => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.target && e.target.matches && e.target.matches("input, textarea, select, [contenteditable]")) return;
      const host = document.querySelector(".view-play");
      if (!host || host.hidden) return;
      if (e.key === "ArrowLeft") { e.preventDefault(); stepStream(1, ctx); }
      if (e.key === "ArrowRight") { e.preventDefault(); stepStream(-1, ctx); }
      if (e.key === "Escape") { const s = st(host); s.stepIdx = -1; s.recent.forEach(r => r.el && r.el.classList.remove("stepped")); }
    });
  }

  /* ------------------------------------------------------------- register -- */
  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews["play"] = {
    title: "开局",
    eyebrow: "PLAY · EVERY CALL IS A BEAT",
    render: render
  };
})();
