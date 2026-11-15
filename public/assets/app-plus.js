/* ==========================================================================
   Magpie Observatory — feature layer (app-plus)
   Loaded BEFORE app.js. Registers hooks on window.Obs; the core calls them
   after render, after each demo tick, at bind time and at init.
   Every feature here is additive — if a hook is missing the core still runs.
   ========================================================================== */
(function () {
  "use strict";

  window.Obs = window.Obs || {
    hooks: { afterRender: [], afterTick: [], bind: [], init: [] },
    game: {},
    api: null
  };
  const Obs = window.Obs;
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const esc = v => String(v == null ? "" : v).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const api = () => Obs.api;
  const state = () => Obs.api && Obs.api.state;
  const toast = msg => Obs.api && Obs.api.toast && Obs.api.toast(msg);
  const fmtTokens = n => (Obs.api && Obs.api.fmtTokens ? Obs.api.fmtTokens(n) : String(n));
  const fmtMoney = n => (Obs.api && Obs.api.fmtMoney ? Obs.api.fmtMoney(n) : String(n));

  /* =========================================================== sound ======= */
  // WebAudio blips: completed request = high chirp, failed = low thud.
  let _actx = null;
  function beep(kind) {
    if (!state() || !state().sound) return;
    try {
      const ctx = _actx || (_actx = new (window.AudioContext || window.webkitAudioContext)());
      const t = ctx.currentTime;
      const osc = ctx.createOscillator(), g = ctx.createGain();
      osc.connect(g); g.connect(ctx.destination);
      const [f0, f1, dur, vol] = kind === "err" ? [180, 120, .22, .05]
        : kind === "warn" ? [420, 300, .14, .035] : [620, 880, .1, .028];
      osc.frequency.setValueAtTime(f0, t);
      osc.frequency.exponentialRampToValueAtTime(f1, t + dur);
      g.gain.setValueAtTime(.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + .02);
      g.gain.exponentialRampToValueAtTime(.0001, t + dur);
      osc.start(t); osc.stop(t + dur + .02);
    } catch (_) {}
  }
  Obs.game.beep = beep;

  /* ========================================================== replay ======= */
  // Ring-buffer of snapshots; "回放" freezes the feed and scrubs history.
  const REPLAY_MAX = 180;
  function pushReplay() {
    const s = state();
    if (!s || s.replay || s._replayBusy) return;
    s.replayBuf = s.replayBuf || [];
    s.replayBuf.push({ t: Date.now(), data: JSON.parse(JSON.stringify(s.data)) });
    if (s.replayBuf.length > REPLAY_MAX) s.replayBuf.shift();
  }
  function startReplay() {
    const s = state();
    if (!s) return;
    if (s.replay) return;
    if (!s.replayBuf || !s.replayBuf.length) { toast("还没有可回放的历史"); return; }
    s.replay = { idx: s.replayBuf.length - 1, saved: s.data };
    s.paused = true;
    const bar = $("#replay-bar");
    if (bar) bar.hidden = false;
    const range = $("#replay-range");
    range.max = s.replayBuf.length - 1;
    range.value = s.replay.idx;
    // Restore a persisted A-B loop (clamped to the current buffer).
    try { const saved = JSON.parse(localStorage.getItem("magpie.replayAB") || "null"); if (saved && saved[0] != null && saved[1] != null) s.replayAB = [Math.min(saved[0], s.replayBuf.length - 1), Math.min(saved[1], s.replayBuf.length - 1)]; } catch (_) {}
    try { const v = +(localStorage.getItem("magpie.replaySpeed") || "0"); if (v) s.replaySpeed = v; } catch (_) {}
    const spd = $("#replay-speed"); if (spd) spd.textContent = (s.replaySpeed || 1) + "×";
    const db = $("#replay-diff-btn"); if (db && !db.dataset.bound) { db.dataset.bound = "1"; db.addEventListener("click", () => document.dispatchEvent(new KeyboardEvent("keydown", { key: "d" }))); }
    const t60 = $("#replay-tail60"); if (t60 && !t60.dataset.bound) { t60.dataset.bound = "1"; t60.addEventListener("click", () => { const tgt = Math.max(0, s.replayBuf.length - 60); range.value = tgt; scrubReplay(tgt); }); }
    const t30 = $("#replay-tail30"); if (t30 && !t30.dataset.bound) { t30.dataset.bound = "1"; t30.addEventListener("click", () => { const tgt = Math.max(0, s.replayBuf.length - 30); range.value = tgt; scrubReplay(tgt); }); }
    const h30 = $("#replay-head30"); if (h30 && !h30.dataset.bound) { h30.dataset.bound = "1"; h30.addEventListener("click", () => { const tgt = Math.min(30, s.replayBuf.length - 1); range.value = tgt; scrubReplay(tgt); }); }
    scrubReplay(s.replay.idx);
    toast("回放模式 · 拖动时间轴 · R 或 × 退出");
    const hint = bar && bar.querySelector(".rep-hint");
    if (bar && !hint) bar.insertAdjacentHTML("beforeend", `<span class="rep-hint" title="空格 播放 · ←→ 步进 · Shift+←→ 10帧 · Home/End 首末 · A/B 设循环端 · Shift+A/B 微调 · X 清循环 · C 对比 · D diff · ? 帧KPI · R 退出" style="font:8px var(--font);color:var(--faint);margin-left:auto;cursor:help">?键位</span>`);
    const hintEl = bar && bar.querySelector(".rep-hint");
    if (hintEl && !hintEl.dataset.bound) { hintEl.dataset.bound = "1"; hintEl.addEventListener("click", () => {
      $(".keys-card")?.remove();
      const card = document.createElement("div");
      card.className = "gwcmp-card keys-card";
      card.innerHTML = `<div class="digest-head"><b>回放键位</b><span>KEYS</span></div>` + [["空格", "播放/暂停"], ["←→", "步进 1 帧"], ["Shift+←→", "步 10 帧"], ["Home/End", "首/末帧"], ["A / B", "设循环端点"], ["Shift+A/B", "端点微调 ±1"], ["X", "清 A-B 循环"], ["C", "A-B 帧对比"], ["D", "diff vs 首/A 帧"], ["?", "当前帧 KPI"], ["右键mark", "设/清 A-B"], ["双击strip", "清 A-B"], ["拖A/B标", "调端点"], ["R", "退出回放"]].map(([k, d]) => `<div class="cmp-r"><span>${k}</span><b></b><em></em><b>${d}</b></div>`).join("");
      card.addEventListener("click", () => card.remove());
      document.body.appendChild(card);
      const rb = $("#replay-bar");


      if (rb) { const bb = rb.getBoundingClientRect(); card.style.top = "auto"; card.style.left = bb.left + bb.width / 2 + "px"; card.style.bottom = (innerHeight - bb.top + 8) + "px"; }
      setTimeout(() => card.classList.add("in"), 10);
    }); }
    // Tick strip under the scrubber: one dot per B-key mark, click to jump.
    let strip = $("#replay-marks");
    if (!strip) {
      strip = document.createElement("div");
      strip.id = "replay-marks";
      strip.style.cssText = "position:relative;height:14px;margin-top:2px";
      if (bar) bar.appendChild(strip);
    }
      // Zebra backing: alternate 10-frame blocks get a faint wash so distance
      // reads at a glance on long buffers.
      strip.style.backgroundImage = "repeating-linear-gradient(90deg, transparent 0, transparent " + (10 / Math.max(1, s.replayBuf.length - 1) * 100).toFixed(2) + "%, color-mix(in srgb, var(--fg) 5%, transparent) " + (10 / Math.max(1, s.replayBuf.length - 1) * 100).toFixed(2) + "%, color-mix(in srgb, var(--fg) 5%, transparent) " + (20 / Math.max(1, s.replayBuf.length - 1) * 100).toFixed(2) + "%)";
    let marks = [];
    try { marks = JSON.parse(localStorage.getItem("magpie.replayMarks") || "[]"); } catch (_) {}
    const max = Math.max(1, s.replayBuf.length - 1);
    if (strip) {
      strip.innerHTML = marks.length > 10
        ? marks.map(m => `<i style="position:absolute;left:${(m.idx / max * 100).toFixed(1)}%;top:2px;width:3px;height:5px;background:var(--amber);border-radius:1px;opacity:.55;cursor:pointer" data-mi="${m.idx}" title="跳到第 ${m.idx} 帧 · ${s.replayBuf[m.idx] ? new Date(s.replayBuf[m.idx].t).toTimeString().slice(0, 8) : ""}"></i>`).join("")
        : marks.map(m => `<i style="position:absolute;left:${(m.idx / max * 100).toFixed(1)}%;top:0;width:4px;height:8px;background:var(--amber);border-radius:1px;cursor:pointer" data-mi="${m.idx}" title="跳到第 ${m.idx} 帧 · ${s.replayBuf[m.idx] ? new Date(s.replayBuf[m.idx].t).toTimeString().slice(0, 8) : ""}"></i>`).join("");
      strip.onclick = e => { const j = e.target.closest?.(".rep-edge")?.dataset.jump; if (j != null) { range.value = j; scrubReplay(+j); return; } const i = e.target.dataset.mi; if (i != null) { range.value = i; scrubReplay(+i); } };
      if (!strip.dataset.dragBound) { strip.dataset.dragBound = "1"; strip.addEventListener("mousedown", e => {
        const end = e.target.closest(".rep-ab-end");
        if (!end || !s.replayAB) return;
        e.preventDefault();
        const which = +end.dataset.end;
        const move = ev => {
          const bb = strip.getBoundingClientRect();
          const idx = Math.round(((ev.clientX - bb.left) / bb.width) * max);
          const ab = [...s.replayAB];
          ab[which] = Math.min(which ? s.replayBuf.length - 1 : ab[1] - 1, Math.max(which ? ab[0] + 1 : 0, idx));
          s.replayAB = ab;
          strip.querySelectorAll(".rep-ab, .rep-ab-end").forEach(x => x.remove());
          const l = ab[0] / max * 100, w = (ab[1] - ab[0]) / max * 100;
          strip.insertAdjacentHTML("beforeend", `<i class="rep-ab" style="position:absolute;left:${l.toFixed(1)}%;width:${w.toFixed(1)}%;top:0;height:100%;background:color-mix(in srgb,var(--amber) 20%,transparent);pointer-events:none"></i><i class="rep-ab-end" data-end="0" style="position:absolute;left:${l.toFixed(1)}%;top:-3px;font:700 7px var(--num);color:var(--amber);cursor:ew-resize" title="A端 帧${ab[0]} · ${s.replayBuf[ab[0]] ? new Date(s.replayBuf[ab[0]].t).toTimeString().slice(0, 5) : ""}">A</i><i class="rep-ab-end" data-end="1" style="position:absolute;left:calc(${l.toFixed(1)}% + ${w.toFixed(1)}% - 6px);top:-3px;font:700 7px var(--num);color:var(--amber);cursor:ew-resize" title="B端 帧${ab[1]} · ${s.replayBuf[ab[1]] ? new Date(s.replayBuf[ab[1]].t).toTimeString().slice(0, 5) : ""}">B</i>`);
        };
        const up = () => {
          try { localStorage.setItem("magpie.replayAB", JSON.stringify(s.replayAB)); } catch (_) {}
          toast(`A-B 循环 ${s.replayAB[0]}→${s.replayAB[1]}`);
          document.removeEventListener("mousemove", move);
          document.removeEventListener("mouseup", up);
        };

        document.addEventListener("mousemove", move);
        document.addEventListener("mouseup", up);
      }); }
      // Shaded spans between consecutive B-marks: a mark pair = a watched
      strip.addEventListener("mousedown", e => {
        const panEl = e.target.closest(".rep-ab[data-pan]");
        if (!panEl || !s.replayAB || e.target.closest(".rep-ab-end")) return;
        e.preventDefault();
        const startX = e.clientX, span = s.replayAB[1] - s.replayAB[0], orig = s.replayAB[0];
        const move = ev => {
          const bb = strip.getBoundingClientRect();
          const dIdx = Math.round((ev.clientX - startX) / bb.width * max);
          const newA = Math.min(s.replayBuf.length - 1 - span, Math.max(0, orig + dIdx));
          s.replayAB = [newA, newA + span];
          strip.querySelectorAll(".rep-ab, .rep-ab-end").forEach(x => x.remove());
          const l = s.replayAB[0] / max * 100, w = span / max * 100;
          strip.insertAdjacentHTML("beforeend", `<i class="rep-ab" data-pan="1" style="position:absolute;left:${l.toFixed(1)}%;width:${w.toFixed(1)}%;top:0;height:100%;background:color-mix(in srgb,var(--amber) 20%,transparent);cursor:grab"></i><i class="rep-ab-end" data-end="0" style="position:absolute;left:${l.toFixed(1)}%;top:-3px;font:700 7px var(--num);color:var(--amber);cursor:ew-resize">A</i><i class="rep-ab-end" data-end="1" style="position:absolute;left:calc(${l.toFixed(1)}% + ${w.toFixed(1)}% - 6px);top:-3px;font:700 7px var(--num);color:var(--amber);cursor:ew-resize">B</i>`);
        };
        const up = () => {
          try { localStorage.setItem("magpie.replayAB", JSON.stringify(s.replayAB)); } catch (_) {}
          toast(`A-B 循环 ${s.replayAB[0]}→${s.replayAB[1]}`);
          document.removeEventListener("mousemove", move);
          document.removeEventListener("mouseup", up);
        };
        document.addEventListener("mousemove", move);
        document.addEventListener("mouseup", up);
      });
      if (!strip.dataset.dblBound) { strip.dataset.dblBound = "1"; strip.addEventListener("dblclick", e => {
        const st = state();
        if (st && st.replayAB) {
          st.replayAB = null;
          try { localStorage.setItem("magpie.replayAB", "null"); } catch (_) {}
          strip.querySelectorAll(".rep-ab, .rep-ab-end").forEach(x => x.remove());
          toast("A-B 循环已清");
        }
      }); }
      // stretch, drawn as a translucent band.
      const spans = marks.slice(0, -1).map((m, i) => {
        const n = marks[i + 1];
        const l = m.idx / max * 100, w = (n.idx - m.idx) / max * 100;
        return `<i style="position:absolute;left:${l.toFixed(1)}%;width:${w.toFixed(1)}%;top:0;height:100%;background:color-mix(in srgb,var(--amber) 10%,transparent);pointer-events:none" title="第${m.idx}→${n.idx}帧区段"></i>`;
      }).join("");
      if (spans) strip.innerHTML += `<div style="position:absolute;inset:0;pointer-events:none">${spans}</div>`;
      // Long-press a mark → set an A-B loop between that mark and the current
      // frame (replay loops inside [A,B] until the next long-press).
      strip.oncontextmenu = e => {
        const i = e.target.dataset.mi;
        if (i == null) return;
        e.preventDefault();
        const now = s.replay ? s.replay.idx : 0;
        const a = Math.min(+i, now), b = Math.max(+i, now);
        s.replayAB = s.replayAB && s.replayAB[0] === a && s.replayAB[1] === b ? null : [a, b];
        toast(s.replayAB ? `A-B 循环 · ${a}→${b}` : "A-B 循环已取消");
        // Repaint the A-B band immediately (strip only renders on start).
        strip.querySelectorAll(".rep-ab").forEach(x => x.remove());
        if (s.replayAB) {
          const l = s.replayAB[0] / max * 100, w = (s.replayAB[1] - s.replayAB[0]) / max * 100;
          strip.insertAdjacentHTML("beforeend", `<i class="rep-ab" style="position:absolute;left:${l.toFixed(1)}%;width:${w.toFixed(1)}%;top:0;height:100%;background:color-mix(in srgb,var(--amber) 20%,transparent);pointer-events:none" title="A-B循环 ${s.replayAB[0]}→${s.replayAB[1]}"></i>`);
        }
        try { localStorage.setItem("magpie.replayAB", JSON.stringify(s.replayAB)); } catch (_) {}
      };
      if (!strip.dataset.hoverBound || !strip.querySelector(".rep-hover-tip")) {
        strip.dataset.hoverBound = "1";
        const tip = document.createElement("div");
        tip.className = "rep-hover-tip";
        tip.style.cssText = "position:absolute;top:-16px;padding:0 4px;font:7px var(--num);color:var(--fg);background:var(--card);border:1px solid var(--line);border-radius:3px;pointer-events:none;white-space:nowrap;transform:translateX(-50%);z-index:3";
        tip.hidden = true;
        strip.appendChild(tip);
        strip.addEventListener("mousemove", e => {
          if (e.target.dataset?.mi != null) { tip.hidden = true; return; }
          const bb = strip.getBoundingClientRect();
          const fi = Math.round(((e.clientX - bb.left) / bb.width) * max);
          const ci = clamp(fi, 0, s.replayBuf.length - 1);
          tip.textContent = `帧${ci} · ${s.replayBuf[ci] ? new Date(s.replayBuf[ci].t).toTimeString().slice(0, 8) : ""}`;
          tip.style.left = `${(ci / max * 100).toFixed(1)}%`;
          tip.hidden = false;
        });
        strip.addEventListener("mouseleave", () => { tip.hidden = true; });
      }
      // Per-frame token-density minimap along the bottom edge.
      try {
        const toks = s.replayBuf.map(f => (f.data.kpis || {}).tokens || 0);
        const deltas = toks.map((t, k) => k === 0 ? 0 : Math.max(0, t - toks[k - 1]));
        const dmax = Math.max(1, ...deltas);
        strip.innerHTML += `<div style="position:absolute;left:0;right:0;bottom:0;height:3px;pointer-events:none;display:flex;align-items:flex-end;gap:0">${deltas.map(d => `<i style="flex:1;height:${Math.max(10, d / dmax * 100).toFixed(0)}%;background:color-mix(in srgb,var(--accent) ${(20 + d / dmax * 60).toFixed(0)}%,transparent)"></i>`).join("")}</div>`;
      } catch (_) {}
      // (start-time A-B band uses .rep-ab too so contextmenu can clear it)
      // A-B loop highlight: a red band over the looped stretch.
      if (s.replayAB) {
        const l = s.replayAB[0] / max * 100, w = (s.replayAB[1] - s.replayAB[0]) / max * 100;
        strip.innerHTML += `<i class="rep-ab" data-pan="1" style="position:absolute;left:${l.toFixed(1)}%;width:${w.toFixed(1)}%;top:0;height:100%;background:color-mix(in srgb,var(--amber) 20%,transparent);cursor:grab" title="A-B循环 ${s.replayAB[0]}→${s.replayAB[1]} · ${s.replayBuf[s.replayAB[0]] && s.replayBuf[s.replayAB[1]] ? Math.round((s.replayBuf[s.replayAB[1]].t - s.replayBuf[s.replayAB[0]].t) / 1000) + "s" : ""} · 拖动平移"></i>`;
        strip.innerHTML += `<i class="rep-ab-end" data-end="0" style="position:absolute;left:${l.toFixed(1)}%;top:-3px;font:700 7px var(--num);color:var(--amber);cursor:ew-resize" title="A端 帧${s.replayAB[0]} · ${s.replayBuf[s.replayAB[0]] ? new Date(s.replayBuf[s.replayAB[0]].t).toTimeString().slice(0, 5) : ""}">A</i><i class="rep-ab-end" data-end="1" style="position:absolute;left:calc(${l.toFixed(1)}% + ${w.toFixed(1)}% - 6px);top:-3px;font:700 7px var(--num);color:var(--amber);cursor:ew-resize" title="B端 帧${s.replayAB[1]} · ${s.replayBuf[s.replayAB[1]] ? new Date(s.replayBuf[s.replayAB[1]].t).toTimeString().slice(0, 5) : ""}">B</i>`;
      }
      // First/last frame quick-jump paddles at the strip edges.
      strip.innerHTML += `<button type="button" class="rep-edge" data-jump="0" style="position:absolute;left:0;top:0;height:100%;width:10px;border:0;background:color-mix(in srgb,var(--accent) 12%,transparent);cursor:pointer" title="跳到首帧 帧0"></button>`;
      strip.innerHTML += `<i class="rep-played" style="position:absolute;left:0;width:0;top:0;height:100%;background:color-mix(in srgb,var(--accent) 18%,transparent);pointer-events:none"></i>`;
      strip.innerHTML += `<button type="button" class="rep-edge" data-jump="${s.replayBuf.length - 1}" style="position:absolute;right:0;top:0;height:100%;width:10px;border:0;background:color-mix(in srgb,var(--accent) 12%,transparent);cursor:pointer" title="跳到末帧 帧${s.replayBuf.length - 1}"></button>`;
    }
      // Frame-number scale: 3 ticks (start / mid / end) so the strip reads
      // as an axis instead of an anonymous bar.
      strip.innerHTML += `<div style="position:absolute;left:0;right:0;bottom:-2px;display:flex;justify-content:space-between;pointer-events:none;font:7px var(--num);color:var(--faint)" title="帧刻度：0 → ${s.replayBuf.length - 1}"><span>0</span><span>${Math.round(max / 2)}</span><span>${s.replayBuf.length - 1}</span></div>`;
      strip.innerHTML += `<div style="position:absolute;inset:0;pointer-events:none">${Array.from({ length: Math.floor((s.replayBuf.length - 1) / 10) + 1 }, (_, k) => `<i style="position:absolute;left:${(k * 10 / max * 100).toFixed(1)}%;bottom:-6px;width:1px;height:3px;background:var(--faint);opacity:.5"></i>`).join("")}</div>`;
    // Session-start dots on the same strip: startedAt → position over the
    // buffer span (completion time isn't recorded; start is the marker).
    try {
      const t0 = s.replayBuf[0].t, tN = s.replayBuf[s.replayBuf.length - 1].t;
      const span = Math.max(1, tN - t0);
      const dots = (s.data.recent || []).filter(x => x.startedAt && x.startedAt >= t0 && x.startedAt <= tN)
        .map(x => `<i style="position:absolute;left:${((x.startedAt - t0) / span * 100).toFixed(1)}%;top:6px;width:4px;height:4px;background:var(--accent);border-radius:50%;opacity:.6" title="${esc(x.title)} 开始"></i>`).join("");
      if (strip) strip.innerHTML += `<div style="position:absolute;inset:0;pointer-events:none">${dots}</div>`;
    } catch (_) {}
    // Error-frame dots: red tick wherever the frame's cumulative errors rose
    // (a failure happened inside that frame's window).
    try {
      const errDots = s.replayBuf.map((f, i) => {
        const prev = s.replayBuf[i - 1];
        const e0 = prev && prev.data.kpis ? prev.data.kpis.errors || 0 : 0;
        const e1 = f.data.kpis ? f.data.kpis.errors || 0 : 0;
        return e1 > e0 ? `<i style="position:absolute;left:${(i / Math.max(1, s.replayBuf.length - 1) * 100).toFixed(1)}%;top:0;width:4px;height:4px;background:var(--red);border-radius:50%" title="第${i}帧 +${e1 - e0} 错误"></i>` : "";
      }).join("");
      if (strip) strip.innerHTML += `<div style="position:absolute;inset:0;pointer-events:none">${errDots}</div>`;
    } catch (_) {}
    // Token-delta shimmer: a tiny tick where the frame's total tokens jumped
    // (visible burst of work between two samples).
    try {
      const dts = s.replayBuf.map((f, i) => {
        const prev = s.replayBuf[i - 1];
        const d = prev && f.data.kpis && prev.data.kpis ? (f.data.kpis.tokens || 0) - (prev.data.kpis.tokens || 0) : 0;
        return d > 4000 ? `<i style="position:absolute;left:${(i / Math.max(1, s.replayBuf.length - 1) * 100).toFixed(1)}%;top:0;width:3px;height:3px;background:var(--green);border-radius:50%;opacity:.7" title="第${i}帧 +${fmtTokens(d)} tok"></i>` : "";
      }).join("");
      if (strip) strip.innerHTML += `<div style="position:absolute;inset:0;pointer-events:none">${dts}</div>`;
    } catch (_) {}
    // Mini tps sparkline across the strip: 40 samples of per-frame tps.
    try {
      const pts = s.replayBuf.map((f, i) => ({ x: i / Math.max(1, s.replayBuf.length - 1) * 100, y: f.data.kpis ? f.data.kpis.tps || 0 : 0 }));
      const maxY = Math.max(1, ...pts.map(p => p.y));
      const step = Math.max(1, Math.floor(pts.length / 40));
      const poly = pts.filter((_, i) => i % step === 0).map(p => `${p.x.toFixed(1)},${(10 - p.y / maxY * 9).toFixed(1)}`).join(" ");
      if (strip) strip.innerHTML += `<svg style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none" viewBox="0 0 100 10" preserveAspectRatio="none"><polyline points="${poly}" fill="none" stroke="var(--accent)" stroke-width=".8" opacity=".5"/></svg>`;
      const peak = pts.reduce((a, p) => p.y > a.y ? p : a, pts[0]);
      if (peak && peak.y > 0 && strip) strip.innerHTML += `<svg style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none" viewBox="0 0 100 10" preserveAspectRatio="none"><circle cx="${peak.x.toFixed(1)}" cy="${(10 - peak.y / maxY * 9).toFixed(1)}" r="1.1" fill="var(--amber)"><title>tps 峰值 ${peak.y.toFixed(1)}/s</title></circle></svg>`;
    } catch (_) {}
    // Error markers: a red tick on every frame where the error count rose.
    try {
      const errs2 = s.replayBuf.map(f => (f.data.kpis || {}).errors || 0);
      const marks2 = errs2.map((e2, k) => k > 0 && e2 > errs2[k - 1] ? k : -1).filter(k => k >= 0);
      if (marks2.length) strip.innerHTML += `<div style="position:absolute;inset:0;pointer-events:none">${marks2.map(k => `<i style="position:absolute;left:${(k / Math.max(1, s.replayBuf.length - 1) * 100).toFixed(1)}%;top:-4px;width:4px;height:4px;border-radius:50%;background:var(--red)" title="帧${k} 出现错误(err=${errs2[k]})"></i>`).join("")}</div>`;
    } catch (_) {}
    // Day boundaries: a faint vertical rule where the frame's date changes.
    try {
      const dayMarks = s.replayBuf.map((f, k) => k > 0 && new Date(f.t).toDateString() !== new Date(s.replayBuf[k - 1].t).toDateString() ? k : -1).filter(k => k >= 0);
    // Largest time-gap between consecutive frames: marks where capture paused.
    try {
      let maxGap = 0, gapAt = -1;
      for (let k = 1; k < s.replayBuf.length; k++) {
        const dt = s.replayBuf[k].t - s.replayBuf[k - 1].t;
        if (dt > maxGap) { maxGap = dt; gapAt = k; }
      }
      if (gapAt >= 0 && maxGap > 5000 && strip)
        strip.innerHTML += `<i style="position:absolute;left:${(gapAt / Math.max(1, s.replayBuf.length - 1) * 100).toFixed(1)}%;top:0;bottom:0;width:2px;background:var(--faint);opacity:.8;pointer-events:none" title="帧${gapAt} 前间隔 ${(maxGap / 1000).toFixed(1)}s"></i>`;
    } catch (_) {}
    // (per-frame error red dots above already mark error-growth frames; a
    // shaded cluster band is unnecessary and cumulative errors never drop)
      if (dayMarks.length) strip.innerHTML += `<div style="position:absolute;inset:0;pointer-events:none">${dayMarks.map(k => `<i style="position:absolute;left:${(k / Math.max(1, s.replayBuf.length - 1) * 100).toFixed(1)}%;top:-6px;bottom:-6px;width:1px;background:var(--accent);opacity:.55" title="跨日 · 帧${k} · ${new Date(s.replayBuf[k].t).toLocaleDateString("zh-CN")}"></i>`).join("")}</div>`;
    } catch (_) {}
    // Cumulative cost at the last frame, as a tiny caption on the strip.
    try {
      const lastF = s.replayBuf[s.replayBuf.length - 1];
      const cost = lastF && lastF.data.kpis ? lastF.data.kpis.cost || lastF.data.kpis.spend || 0 : 0;
      if (strip && cost) strip.innerHTML += `<span style="position:absolute;right:2px;top:0;font-size:8px;color:var(--muted);pointer-events:none">$${(+cost).toFixed(3)}</span>`;
    } catch (_) {}
  }
  function scrubReplay(idx) {
    const s = state();
    if (!s || !s.replay) return;
    const buf = s.replayBuf;
    const i = clamp(Math.round(idx), 0, buf.length - 1);
    s.replay.idx = i;
    s.data = buf[i].data;
    Obs.api.computeView();
    Obs.api.renderAll();
    $("#replay-time").textContent = new Date(buf[i].t).toTimeString().slice(0, 8);
    const idxEl = $("#replay-idx");
    if (idxEl) idxEl.textContent = `帧 ${i}/${buf.length - 1}`;
    const rng = $("#replay-range");
    if (rng) rng.title = `帧 ${i}/${buf.length - 1} · ${new Date(buf[i].t).toTimeString().slice(0, 8)}`;
    const played = document.querySelector("#replay-strip .rep-played");
    if (played) played.style.width = `${(i / Math.max(1, buf.length - 1) * 100).toFixed(1)}%`;
    const kpiEl = $("#replay-kpi");
    if (kpiEl) { const kk = buf[i].data.kpis || {}; kpiEl.textContent = `TOK ${fmtTokens(kk.tokens || 0)} · ${kk.tps != null ? kk.tps.toFixed(1) : "—"}/s`; }
    if (kpiEl && s.replayAB) { const [a2, b2] = s.replayAB; if (i >= a2 && i <= b2) kpiEl.textContent += ` · AB ${i - a2 + 1}/${b2 - a2 + 1}`; }
    const sp = $("#replay-span");
    if (sp) sp.textContent = `[${new Date(buf[0].t).toTimeString().slice(0, 5)}→${new Date(buf[buf.length - 1].t).toTimeString().slice(0, 5)}]`;
    // Current-frame cursor on the marks strip (persistent, distinct from the
    // hover cursor).
    const stripEl = $("#replay-marks");
    if (stripEl) {
      let cur = stripEl.querySelector(".rep-now");
      if (!cur) {
        cur = document.createElement("i");
        cur.className = "rep-now";
        cur.style.cssText = "position:absolute;top:0;width:2px;height:100%;background:var(--fg);opacity:.55;pointer-events:none;z-index:2";
        stripEl.appendChild(cur);
      }
      cur.style.left = (i / Math.max(1, buf.length - 1) * 100).toFixed(1) + "%";
      cur.title = `帧 ${i} · ${new Date(buf[i].t).toTimeString().slice(0, 8)}`;
    }
    // Live diff strip (D key): keeps Δ vs frame 0 fresh while scrubbing.
    const dEl = $("#rep-diff");
    if (dEl && s._replayDiff) {
      const baseI = s.replayAB ? s.replayAB[0] : 0;
      const base = buf[baseI] && buf[baseI].data.kpis, curK = buf[i].data.kpis;
      if (base && curK) dEl.textContent = `Δ vs ${s.replayAB ? "A帧" : "首帧"} · tok ${((curK.tokens - base.tokens) >= 0 ? "+" : "")}${fmtTokens(curK.tokens - base.tokens)} · err ${(curK.errors || 0) - (base.errors || 0)}`;
    }
  }
  function exitReplay() {
    const s = state();
    if (s._replayTimer) { clearInterval(s._replayTimer); s._replayTimer = null; const p = $("#replay-play"); if (p) p.textContent = "▶"; }
    s._replayDiff = false;
    const dd = $("#rep-diff"); if (dd) dd.remove();
    s.data = s.replay.saved;
    s.replay = null;
    s.paused = false;
    const bar = $("#replay-bar");
    if (bar) bar.hidden = true;
    Obs.api.computeView();
    Obs.api.renderAll();
    toast("已退出回放");
  }
  Obs.onKeyR = e => { if (state() && state().replay) exitReplay(); else startReplay(); };

  // Play/pause auto-step inside the replay bar.
  function toggleReplayPlay() {
    const s = state();
    if (!s || !s.replay) return;
    const speed = s.replaySpeed || 1;
    s._replayTimer = setInterval(() => {
      if (!s.replay) { clearInterval(s._replayTimer); s._replayTimer = null; return; }
      const next = s.replay.idx + 1;
      // A-B loop: right-click a mark sets [A,B]; playback wraps inside it.
      if (s.replayAB && next > s.replayAB[1]) { s.replay.idx = s.replayAB[0] - 1; scrubReplay(s.replayAB[0]); return; }
      if (next >= s.replayBuf.length) {
        if (s.replayLoop) { s.replay.idx = -1; scrubReplay(0); return; }
        clearInterval(s._replayTimer); s._replayTimer = null; $("#replay-play").textContent = "▶"; return;
      }
      $("#replay-range").value = next;
      scrubReplay(next);
    }, Math.max(80, Math.round(600 / speed)));
    $("#replay-play").textContent = "⏸";
  }

  function cycleReplaySpeed() {
    const s = state();
    if (!s) return;
    s.replaySpeed = ((s.replaySpeed || 1) >= 4) ? 1 : (s.replaySpeed || 1) * 2;
    const b = $("#replay-speed"); if (b) b.textContent = s.replaySpeed + "×";
    if (b) b.title = `回放速度 ${s.replaySpeed}× · 点击→${s.replaySpeed >= 4 ? 1 : s.replaySpeed * 2}×`;
    // live-respeed a running timer
    if (s._replayTimer) { clearInterval(s._replayTimer); s._replayTimer = null; $("#replay-play").textContent = "▶"; toggleReplayPlay(); }
    toast(`回放速度 ${s.replaySpeed}×`);
    try { localStorage.setItem("magpie.replaySpeed", String(s.replaySpeed)); } catch (_) {}
  }


  // Delta-encode a buffer: fields identical to the previous frame collapse to
  // {r:idx} references; decode resolves them back. Halves link/file size on
  // quiet periods where the KPI line is the only thing that moved.
  function deltaFrames(buf, mapFn) {
    const out = [];
    let prev = null;
    buf.forEach((f, i) => {
      const mapped = mapFn(f);
      const keys = Object.keys(mapped).filter(k => k !== "t");
      if (prev) {
        const same = keys.every(k => JSON.stringify(mapped[k]) === JSON.stringify(prev[k]));
        if (same) { out.push({ t: f.t, r: i - 1 }); return; }
      }
      prev = { ...mapped };
      out.push(mapped);
    });
    return out;
  }
  function undeltaFrames(frames) {
    return frames.map((f, i) => {
      if (f.r == null) return f;
      const src = frames[f.r];
      return { ...src, t: f.t, r: undefined };
    });
  }
  // Share the whole replay window as a link: frames minified → deflate →
  // base64url → #replay=. Receiver restores the buffer and starts scrubbing.
  async function shareReplayLink() {
    const s = state();
    if (!s || !s.replayBuf || !s.replayBuf.length) { toast("还没有可回放的历史"); return; }
    const frames = deltaFrames(s.replayBuf, f => ({
      t: f.t,
      k: f.data.kpis,
      q: (f.data.quotas || []).map(q => ({ p: q.provider, w: (q.windows || []).map(w => ({ n: w.name, u: Math.round(w.used), r: w.resetsIn })) })),
      l: (f.data.logs || []).slice(0, 12).map(l => ({ a: l.agent, p: l.provider, m: l.model, st: l.status, t: l.ttft, k: l.tokens })),
      n: (f.data.sessions || []).length
    }));
    try {
      const json = JSON.stringify(frames);
      const cs = new CompressionStream("deflate-raw");
      const blob = await new Response(new Blob([json]).stream().pipeThrough(cs)).blob();
      const buf = await blob.arrayBuffer();
      const b64 = btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
      const url = location.origin + location.pathname + "#replay=" + b64;
      await navigator.clipboard.writeText(url);
      toast("回放链接已复制 · " + frames.length + " 帧 · " + Math.round(b64.length / 1024) + "KB");
    } catch (_) { toast("链接生成失败"); }
  }

  // Palette "回放书签" → jump the scrubber to a B-key mark.
  function showReplayMarks() {
    $(".gwcmp-card")?.remove();
    let marks = [];
    try { marks = JSON.parse(localStorage.getItem("magpie.replayMarks") || "[]"); } catch (_) {}
    const card = document.createElement("div");
    card.className = "gwcmp-card";
    card.innerHTML = `<div class="digest-head"><b>回放书签</b><span>REPLAY MARKS</span></div>` +
      (marks.length
        ? `<div class="gwcmp-grid" style="grid-template-columns:1fr">${marks.map((m, i) => `<div class="gc-row" data-mark="${m.idx}" style="cursor:pointer"><span>#${i + 1} · 第 ${m.idx} 帧</span><b>${new Date(m.t).toLocaleTimeString("zh-CN", { hour12: false })}</b></div>`).join("")}</div>`
        : `<div class="digest-foot">还没有书签 · 回放中按 B 标记</div>`) +
      `<div class="digest-foot">点击行 → 跳到该帧 · 点击外关闭</div>`;
    card.addEventListener("click", e => {
      const row = e.target.closest("[data-mark]");
      if (row) {
        const idx = +row.dataset.mark;
        const s = state();
        if (s && !s.replay) startReplay();
        const range = $("#replay-range");
        if (range && s.replay) { range.value = Math.min(+range.max, idx); scrubReplay(Math.min(+range.max, idx)); }
        toast(`跳到第 ${idx} 帧`);
      }
      card.remove();
    });
    document.body.appendChild(card);
    setTimeout(() => card.classList.add("in"), 10);
    closePalette();
  }

  // Palette "回放帧对比" → side-by-side KPI delta table of the A-B loop's two
  // boundary frames (right-click a mark to set the loop first).

  // Palette "帧快照" → the frame KPI cards saved from the ? pop.
  function showFrameSnaps() {
    $(".gwcmp-card")?.remove();
    let snaps = [];
    try { snaps = JSON.parse(localStorage.getItem("magpie.frameSnaps") || "[]"); } catch (_) {}
    if (!snaps.length) { toast("还没有帧快照 · 回放中按 ? 后点「存为记录」"); closePalette(); return; }
    const card = document.createElement("div");
    card.className = "gwcmp-card snaps-card";
    card.innerHTML = `<div class="digest-head"><b>帧快照</b><span>${snaps.length} 条</span></div>` +
      snaps.slice(-12).reverse().map((s2, i, arr) => { const dt = i > 0 ? Math.round((arr[i - 1].t - s2.t) / 1000) : null; return `<div class="cmp-r"><span>#${s2.idx}</span><b>${fmtTokens(s2.k.tokens || 0)}</b><em>${dt != null ? "-" + dt + "s" : ""}</em><b>${new Date(s2.t).toTimeString().slice(0, 8)}</b></div>`; }).join("") +
      `<small style="opacity:.55">点击行复制该帧KPI · <button type="button" class="mini-btn snap-clear" style="font-size:8px">清空</button> · 点空白关</small>`;
    card.addEventListener("click", e => {
      const row = e.target.closest(".cmp-r");
      if (e.target.closest(".snap-clear")) { try { localStorage.setItem("magpie.frameSnaps", "[]"); } catch (_) {} card.remove(); toast("帧快照已清空"); return; }
      if (row) { const i = [...card.querySelectorAll(".cmp-r")].indexOf(row); const s2 = snaps.slice(-12).reverse()[i]; if (s2) navigator.clipboard?.writeText(`帧${s2.idx} tok=${s2.k.tokens} tps=${s2.k.tps} calls=${s2.k.calls} err=${s2.k.errors}`).then(() => toast("已复制")); return; }
      card.remove();
    });
    document.body.appendChild(card);
    setTimeout(() => card.classList.add("in"), 10);
    closePalette();
  }
  function compareReplayFrames() {
    $(".gwcmp-card")?.remove();
    const s = state();
    if (!s || !s.replayAB || !s.replayBuf) { toast("先右键一个书签设 A-B 区间"); closePalette(); return; }
    const [a, b] = s.replayAB;
    const fa = s.replayBuf[a], fb = s.replayBuf[b];
    if (!fa || !fb) { toast("帧越界"); closePalette(); return; }
    const K = [["tokens", "TOK", fmtTokens], ["tps", "TPS", v => v != null ? v.toFixed(1) : "—"], ["calls", "调用", v => v], ["errors", "错误", v => v], ["cost", "成本$", v => v != null ? (+v).toFixed(3) : "—"], ["cache", "缓存%", v => v != null ? (+v).toFixed(1) : "—"]];
    const card = document.createElement("div");
    card.className = "gwcmp-card";
    const rows = K.map(([k, label, fmt]) => {
      const va = fa.data.kpis ? fa.data.kpis[k] : null, vb = fb.data.kpis ? fb.data.kpis[k] : null;
      const d = (va != null && vb != null) ? vb - va : null;
      return `<div class="cmp-r"><span>${label}</span><b>${fmt ? fmt(va) : va}</b><em class="${d > 0 ? "up" : d < 0 ? "down" : ""}">${d != null ? (d > 0 ? "+" : "") + (k === "cost" ? d.toFixed(3) : k === "tps" || k === "cache" ? d.toFixed(1) : d) : "—"}</em><b>${fmt ? fmt(vb) : vb}</b></div>`;
    }).join("");
    const sessA = (fa.data.sessions || []).length, sessB = (fb.data.sessions || []).length;
    const sessRow = `<div class="cmp-r"><span>会话</span><b>${sessA}</b><em class="${sessB > sessA ? "up" : sessB < sessA ? "down" : ""}">${sessB > sessA ? "+" + (sessB - sessA) : sessB - sessA}</em><b>${sessB}</b></div>`;
    card.innerHTML = `<div class="digest-head"><b>帧对比</b><span>A=${a} → B=${b}</span></div>${rows}${sessRow}<small style="opacity:.55">A→B 区间 ${b - a} 帧 · <button type="button" class="mini-btn cmp-copy">复制对比</button> <button type="button" class="mini-btn cmp-goto" data-f="${a}">去A</button><button type="button" class="mini-btn cmp-goto" data-f="${b}">去B</button></small>`;
    card.addEventListener("click", e => {
      if (e.target.closest(".cmp-copy")) {
        navigator.clipboard?.writeText(`回放帧对比 A=${a} → B=${b}(区间 ${b - a} 帧)\n` + K.map(([k, label, fmt]) => `${label}: ${fmt ? fmt(fa.data.kpis?.[k]) : fa.data.kpis?.[k]} → ${fmt ? fmt(fb.data.kpis?.[k]) : fb.data.kpis?.[k]}`).join("\n")).then(() => toast("对比已复制"));
        return;
      }
      const go = e.target.closest(".cmp-goto");
      if (go) {
        const idx = +go.dataset.f;
        const r = $("#replay-range");
        if (r && s.replay) { r.value = idx; scrubReplay(idx); }
        card.remove();
        return;
      }
      card.remove();
    });
    document.body.appendChild(card);
    setTimeout(() => card.classList.add("in"), 10);
    closePalette();
  }

  // Download the replay buffer as a compact JSON file (delta frames, same
  // shape as shareReplayLink but on disk instead of a URL hash).
  function exportReplayJson() {
    const s = state();
    if (!s || !s.replayBuf || !s.replayBuf.length) { toast("还没有可回放的历史"); return; }
    const frames = deltaFrames(s.replayBuf, f => ({
      t: f.t,
      k: f.data.kpis,
      l: (f.data.logs || []).map(l => ({ a: l.agent, p: l.provider, m: l.model, st: l.status, t: l.ttft, k: l.tokens }))
    }));
    const blob = new Blob([JSON.stringify({ app: "magpie-observatory", kind: "replay", exportedAt: new Date().toISOString(), frames }, null, 0)], { type: "application/json" });
    const a = document.createElement("a");
    a.download = `magpie-replay-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-")}.json`;
    a.href = URL.createObjectURL(blob);
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast(`回放已导出 ${frames.length} 帧 JSON`);
  }

  // Palette "导出AB区间" → download just the looped frames as compact JSON.
  function exportABRange() {
    const s = state();
    if (!s || !s.replayAB || !s.replayBuf) { toast("先右键一个书签设 A-B 区间"); closePalette(); return; }
    const [a, b] = s.replayAB;
    const frames = deltaFrames(s.replayBuf.slice(a, b + 1), f => ({ t: f.t, k: f.data.kpis, n: (f.data.sessions || []).length }));
    const blob = new Blob([JSON.stringify({ v: 1, kind: "ab-range", a, b, frames }, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `magpie-ab-${a}-${b}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 2000);
    toast(`AB 区间 ${frames.length} 帧已导出`);
    closePalette();
  }

  // Copy a link that re-opens the board in exactly this state: hero view,
  // range, and cinema flag. The inverse of applyUrlState().
  async function shareStateLink() {
    const s = state();
    if (!s) return;
    const p = new URLSearchParams();
    if (s.heroMode && s.heroMode !== "route") p.set("view", s.heroMode);
    if (s.range && s.range !== "today") p.set("range", s.range);
    if (s.cinema) p.set("cinema", "1");
    if (s.vmGroup) p.set("group", s.vmGroup);
    // Cross-device snapshot: favorites + pins + notes + hidden KPIs, base64url.
    try {
      const st = {
        f: JSON.parse(localStorage.getItem("magpie.favorites") || "[]"),
        p: JSON.parse(localStorage.getItem("magpie.pinnedSessions") || "[]"),
        n: JSON.parse(localStorage.getItem("magpie.scratchNotes") || "[]").slice(-8),
        h: JSON.parse(localStorage.getItem("magpie.kpiHidden") || "[]"),
      };
      if (st.f.length || st.p.length || st.n.length || st.h.length) {
        p.set("st", btoa(unescape(encodeURIComponent(JSON.stringify(st)))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""));
      }
    } catch (_) {}
    const url = location.origin + location.pathname + (p.size ? "?" + p : "");
    try {
      await navigator.clipboard.writeText(url);
      toast("状态链接已复制" + (s.heroMode && s.heroMode !== "route" ? ` · ${Obs.api.viewMeta(s.heroMode).title}` : ""));
    } catch (_) { toast("复制失败"); }
  }

  // Export the buffer as a fully standalone HTML player: frames embedded,
  // own scrubber + play button + KPI readout + per-frame log table. No
  // dependencies — file opens anywhere, even offline.
  function exportReplayHtml() {
    const s = state();
    if (!s || !s.replayBuf || !s.replayBuf.length) { toast("还没有可回放的历史"); return; }
    const frames = deltaFrames(s.replayBuf, f => ({
      t: f.t,
      k: { requests: f.data.kpis && f.data.kpis.requests, tokens: f.data.kpis && f.data.kpis.tokens, cost: f.data.kpis && f.data.kpis.cost, tps: f.data.kpis && f.data.kpis.tps },
      l: (f.data.logs || []).slice(0, 14).map(l => ({ a: l.agent, p: l.provider, m: l.model, st: l.status, t: l.ttft, k: l.tokens }))
    }));
    const start = new Date(frames[0].t).toTimeString().slice(0, 8);
    const end = new Date(frames[frames.length - 1].t).toTimeString().slice(0, 8);
    const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>Magpie Replay ${start}</title>
<meta name="viewport" content="width=device-width,initial-scale=1"><style>
*{box-sizing:border-box;margin:0}body{background:#06070b;color:#e6e9f2;font:14px/1.5 Inter,system-ui,sans-serif;min-height:100vh;display:flex;flex-direction:column;align-items:center;padding:32px 20px}
.hd{display:flex;align-items:baseline;gap:14px;margin-bottom:22px}.hd b{font-size:22px}.hd span{font:600 11px monospace;color:#7ff3ff;letter-spacing:.2em}
.bar{width:min(760px,100%);display:flex;align-items:center;gap:12px;margin-bottom:18px}
.bar button{background:#141828;border:1px solid #262c45;color:#e6e9f2;border-radius:10px;width:38px;height:38px;font-size:15px;cursor:pointer}
.bar input{flex:1;accent-color:#8b7cf6}
.bar code{font:600 12px monospace;color:#8b93a7}
.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;width:min(760px,100%);margin-bottom:18px}
.k{background:#0e1118;border:1px solid #1c2130;border-radius:14px;padding:14px 16px}.k small{display:block;color:#8b93a7;font-size:10px;letter-spacing:.14em;text-transform:uppercase;margin-bottom:4px}.k b{font:700 22px/1.1 ui-monospace,monospace}
.logs{width:min(760px,100%);background:#0e1118;border:1px solid #1c2130;border-radius:14px;overflow:hidden}
.logs h3{font:600 10px monospace;letter-spacing:.2em;color:#8b93a7;padding:12px 16px;border-bottom:1px solid #1c2130}
table{width:100%;border-collapse:collapse;font:12px/1.6 ui-monospace,monospace}td{padding:6px 16px;border-bottom:1px solid #141828;color:#c7cede}td.ok{color:#4ade80}td.err{color:#ff6b6b}td.run{color:#fbbf24}td:last-child{text-align:right;color:#8b93a7}
</style></head><body>
<div class="hd"><b>Magpie Replay</b><span>${start} → ${end} · ${frames.length} FRAMES</span></div>
<div class="bar"><button id="play">▶</button><input id="range" type="range" min="0" max="${frames.length - 1}" value="0"><code id="time"></code></div>
<div class="kpis"><div class="k"><small>requests</small><b id="k-req">—</b></div><div class="k"><small>tokens</small><b id="k-tok">—</b></div><div class="k"><small>cost</small><b id="k-cost">—</b></div><div class="k"><small>tps</small><b id="k-tps">—</b></div></div>
<div class="logs"><h3>REQUEST LOG</h3><table id="tbl"></table></div>
<script>
const F=${JSON.stringify(frames)};
const $=i=>document.getElementById(i);
const fmtT=n=>n>=1e6?(n/1e6).toFixed(1)+"M":n>=1e3?(n/1e3).toFixed(1)+"K":Math.round(n);
function show(i){
  let f=F[i];if(f.r!=null){const src=F[f.r];f={...src,t:f.t}}$("range").value=i;
  $("time").textContent=new Date(f.t).toTimeString().slice(0,8);
  const k=f.k||{};$("k-req").textContent=(k.requests??"—").toLocaleString?.()??k.requests;$("k-tok").textContent=fmtT(k.tokens||0);$("k-cost").textContent="$"+(k.cost||0).toFixed(1);$("k-tps").textContent=(k.tps||0).toFixed(1);
  $("tbl").innerHTML=(f.l||[]).map(l=>\`<tr><td class="\${l.st}">\${l.st.toUpperCase().slice(0,4)}</td><td>\${l.a}</td><td>\${l.m||"—"}</td><td>\${l.t?l.t+"ms":"—"}</td><td>\${fmtT(l.k||0)}</td></tr>\`).join("")||"<tr><td>no logs</td></tr>";
}
let tm=null;$("range").oninput=e=>{stop();show(+e.target.value)};
function stop(){clearInterval(tm);tm=null;$("play").textContent="▶"}
$("play").onclick=()=>{if(tm){stop();return}let i=+$("range").value;tm=setInterval(()=>{i++;if(i>=F.length){stop();return}show(i)},600);$("play").textContent="⏸"};
document.addEventListener("keydown",e=>{if(e.key===" "){e.preventDefault();$("play").click()}if(e.key==="ArrowLeft")show(Math.max(0,+$("range").value-1));if(e.key==="ArrowRight")show(Math.min(F.length-1,+$("range").value+1))});
show(F.length-1);
</scr` + `ipt></body></html>`;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([html], { type: "text/html" }));
    a.download = `magpie-replay-${new Date().toISOString().slice(0, 10)}.html`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast("回放播放器已导出 · " + frames.length + " 帧");
  }

  // A pasted #replay= link rebuilds a lightweight buffer: sessions/logs are
  // stubs carrying just enough for the cards; the scrub still animates.
  async function loadReplayHash() {
    const m = location.hash.match(/replay=([A-Za-z0-9_-]+)/);
    if (!m) return;
    try {
      const b64 = m[1].replace(/-/g, "+").replace(/_/g, "/");
      const bin = Uint8Array.from(atob(b64 + "==".slice((b64.length % 4 + 3) % 4)), c => c.charCodeAt(0));
      const ds = new DecompressionStream("deflate-raw");
      const txt = await new Response(new Blob([bin]).stream().pipeThrough(ds)).text();
      const frames = undeltaFrames(JSON.parse(txt));
      const s = state();
      if (!s) return;
      s.replayBuf = frames.map(f => ({
        t: f.t,
        data: {
          ...s.data,
          kpis: f.k,
          quotas: (f.q || []).map(q => ({ provider: q.p, windows: (q.w || []).map(w => ({ name: w.n, used: w.u, resetsIn: w.r })) })),
          logs: (f.l || []).map((l, i) => ({ id: "rh-" + i, agent: l.a, provider: l.p, model: l.m, status: l.st, ttft: l.t, tokens: l.k, at: new Date(f.t).toISOString() })),
          sessions: s.data.sessions,
          series: s.data.series,
          models: s.data.models,
          heatmap: s.data.heatmap
        }
      }));
      startReplay();
      history.replaceState(null, "", location.pathname + location.search);
    } catch (_) { toast("回放链接无效"); }
  }

  /* =========================================================== cinema ====== */
  function setCinema(on) {
    const s = state();
    if (!s) return;
    if (on && !s.cinema) s._cinemaStart = Date.now();
    if (!on && s._cinemaStart) {
      const ms = Date.now() - s._cinemaStart;
      try {
        const acc = parseFloat(localStorage.getItem("magpie.cinemaMs") || "0") || 0;
        localStorage.setItem("magpie.cinemaMs", String(acc + ms));
      } catch (_) {}
      s._cinemaStart = null;
    }
    s.cinema = !!on;
    if (!on) s.ambient = false;
    document.body.classList.toggle("cinema", s.cinema);
    const btn = $("#cinema-toggle");
    if (btn) btn.classList.toggle("on", s.cinema);
    const meta = (Obs.api.viewMeta && Obs.api.viewMeta(s.heroMode)) || {};
    const chV = $("#ch-view"), chE = $("#ch-eyebrow");
    if (chV) chV.textContent = meta.title || "";
    if (chE) chE.textContent = meta.eyebrow || "";
    updateCinemaStats();
    if (s.cinema) toast("影院模式 · O / Esc 退出 · G 巡游 · A 氛围");
    requestAnimationFrame(() => {
      Obs.api.drawWires && Obs.api.drawWires();
      const custom = window.ObservatoryViews && window.ObservatoryViews[s.heroMode];
      if (custom) Obs.api.renderAll();
    });
  }
  function toggleCinema() { setCinema(!(state() && state().cinema)); }
  /* ------------------------------------------------------------ ambient ===
   * One-key screensaver: cinema frame + tour rotation together. Esc / O / A
   * all exit and stop the tour if ambient started it. */
  function setAmbient(on) {
    const s = state();
    if (!s) return;
    if (on) {
      s.ambient = true;
      // Favourite-first rotation: the pool is favourites in pick order, then
      // every other view, so a long idle runs the good stuff before filler.
      const meta = Obs.api.VIEW_META || [];
      const favs = (s.favorites || []).filter(id => meta.some(v => v.id === id));
      const rest = meta.filter(v => !favs.includes(v.id)).map(v => v.id);
      s.tourPool = favs.concat(rest);
      setCinema(true);
      if (!s.tour && Obs.api.startTour) Obs.api.startTour();
      toast("氛围模式 · " + (favs.length ? favs.length + " 个收藏优先 · " : "") + "自动轮播 · A / O / Esc 退出");
    } else {
      s.ambient = false;
      if (s.tour && Obs.api.stopTour) Obs.api.stopTour(true);
      setCinema(false);
    }
  }
  /* --------------------------------------------- new-session magpie call
   * The mascot announces arrivals: when a session id appears that was not
   * in the previous live set, the bird hops once (and chirps if sound on).
   * Runs on a 1.5s beat — cheap, two Set diffs. */
  function startSessionWatch() {
    if (!state()) return;
    state()._prevSessions = new Set(
      (state().data.sessions || []).filter(x => x.status !== "done").map(x => x.id));
    if (state()._sessWatch) clearInterval(state()._sessWatch);
    state()._sessWatch = setInterval(() => {
      const s = state();
      if (!s || s.paused || s.replay) return;
      const cur = new Set((s.data.sessions || []).filter(x => x.status !== "done").map(x => x.id));
      let arrived = false;
      cur.forEach(id => { if (!s._prevSessions.has(id)) arrived = true; });
      s._prevSessions = cur;
      if (!arrived) return;
      const mc = $("#mascot");
      if (mc) {
        mc.classList.remove("mascot-hop");
        void mc.offsetWidth;
        mc.classList.add("mascot-hop");
        setTimeout(() => mc.classList.remove("mascot-hop"), 520);
      }
      beep("ok");
    }, 1500);
  }

  function toggleAmbient() { setAmbient(!(state() && state().ambient)); }
  // Expose for the core's keyboard layer — Esc/O/E in app.js delegate here.
  Obs.toggleCinema = toggleCinema;
  Obs.setAmbient = setAmbient;
  Obs.toggleAmbient = toggleAmbient;
  Obs.setCinema = setCinema;
  Obs.exportPNG = exportPNG;
  Obs.shareStateLink = shareStateLink;
  Obs.copyReceipt = copyReceipt;
  Obs.weeklyReport = weeklyReport;
  Obs.showDigestNow = () => { const s = state(); if (s) { s._digestShown = false; try { localStorage.removeItem("magpie.digest"); } catch (_) {} maybeShowDigest(); } };
  function updateCinemaStats() {
    const el = $("#ch-stats");
    const s = state();
    if (!el || !s || !s.cinema) return;
    const k = (s.view && s.view.kpis) || s.data.kpis || {};
    el.textContent = `${fmtTokens(k.tokens)} · ${fmtMoney(k.cost)} · ${k.requests || 0} 请求`;
  }

  /* ======================================================= notifications === */

  function alertRules() {
    let r = { quota: 88, err: 5, cost: 50 };
    try { const v = JSON.parse(localStorage.getItem("magpie.rules") || "{}"); if (v.quota) r.quota = +v.quota; if (v.err) r.err = +v.err; if (v.cost != null) r.cost = +v.cost; } catch (_) {}
    return r;
  }
  function checkAlerts() {
    const s = state();
    if (!s || !s.notify || !("Notification" in window) || Notification.permission !== "granted") return;
    const now = Date.now();
    s._alertAt = s._alertAt || {};
    const rules = alertRules();
    (s.data.quotas || []).forEach(q => (q.windows || []).forEach(w => {
      if (w.used < rules.quota) return;
      const key = "q:" + q.provider + ":" + w.name;
      if (now - (s._alertAt[key] || 0) < 3600e3) return;
      s._alertAt[key] = now;
      const meta = Obs.api.providerMeta ? Obs.api.providerMeta(q.provider) : {};
      pushAlert("额度告急 · " + (meta.name || q.provider), `${w.name} 窗口已到 ${Math.round(w.used)}%${w.resetsIn != null ? " · " + Obs.api.fmtReset(w.resetsIn) : ""}`);
    }));
    const errs = (s.data.logs || []).filter(l => l.status === "err").length;
    if (errs >= rules.err && now - (s._alertAt.err || 0) >= 600e3) {
      s._alertAt.err = now;
      pushAlert("请求失败增多", `最近 ${errs} 条请求失败，注意检查路由健康`);
    }
    // daily cost threshold — sums today's logs only; resets on date change.
    const today = new Date().toISOString().slice(0, 10);
    const dayCost = (s.data.logs || []).filter(l => (l.at || "").slice(0, 10) === today)
      .reduce((sum, l) => sum + (l.cost || 0), 0);
    if (rules.cost > 0 && dayCost >= rules.cost && s._alertAt.costDay !== today) {
      s._alertAt.costDay = today;
      pushAlert("今日成本超预算", `已 $${dayCost.toFixed(2)} ≥ 阈值 $${rules.cost}`);
    }
  }
  function pushAlert(title, body) {
    try { new Notification(title, { body, icon: "assets/icon.png", silent: true }); } catch (_) {}
  }

  /* ============================================================ share ====== */
  function shareToday(period) {
    const s = state();
    if (!s) return;
    const month = period === "month";
    const week = period === "week";
    const heat = (s.data.heatmap || []).slice(month ? -30 : week ? -7 : -1);
    const k = (week || month)
      ? { ...s.data.kpis, tokens: heat.reduce((a, d) => a + (d.tokens || 0), 0), cost: heat.reduce((a, d) => a + (d.tokens || 0), 0) / 1e6 * 1.32, requests: heat.reduce((a, d) => a + (d.calls || 0), 0) }
      : ((s.view && s.view.kpis) || s.data.kpis);
    const streak = dayStreak();
    const c = document.createElement("canvas");
    c.width = 1200; c.height = 630;
    const g = c.getContext("2d");
    const bg = g.createLinearGradient(0, 0, 1200, 630);
    bg.addColorStop(0, "#0a0b14"); bg.addColorStop(.55, "#12142b"); bg.addColorStop(1, "#0a1a24");
    g.fillStyle = bg; g.fillRect(0, 0, 1200, 630);
    for (let i = 0; i < 140; i++) {
      const r = Math.random();
      g.globalAlpha = .12 + r * .35;
      g.fillStyle = i % 7 ? "#cdd6ff" : "#7ff3ff";
      g.beginPath(); g.arc(Math.random() * 1200, Math.random() * 630, r * 1.4, 0, Math.PI * 2); g.fill();
    }
    g.globalAlpha = 1;
    g.fillStyle = "#7ff3ff";
    g.font = "600 22px Inter, sans-serif";
    g.fillText("Magpie Observatory", 60, 74);
    g.fillStyle = "rgba(255,255,255,.4)";
    g.font = "500 14px Inter, sans-serif";
    g.fillText(month
      ? "30 days · " + heat[0].date + " → " + heat[heat.length - 1].date + " · " + (s.mode === "live" ? "live" : "demo")
      : week
        ? "week of " + heat[0].date + " → " + heat[heat.length - 1].date + " · " + (s.mode === "live" ? "live" : "demo")
        : new Date().toISOString().slice(0, 10) + " · " + (s.mode === "live" ? "live" : "demo"), 60, 98);
    g.textAlign = "right";
    g.fillStyle = "#ffffff";
    g.font = "700 96px Inter, sans-serif";
    g.fillText(fmtTokens(k.tokens), 1140, 200);
    g.font = "500 20px Inter, sans-serif";
    g.fillStyle = "rgba(255,255,255,.5)";
    g.fillText(month ? "tokens / 30d" : week ? "tokens this week" : "tokens today", 1140, 232);
    g.fillStyle = "#7ff3ff";
    g.font = "700 54px Inter, sans-serif";
    g.fillText(fmtMoney(k.cost), 1140, 300);
    g.font = "500 17px Inter, sans-serif";
    g.fillStyle = "rgba(255,255,255,.45)";
    g.fillText(month ? "cost / 30d" : week ? "cost / wk" : "cost", 1140, 328);
    g.textAlign = "left";
    if (streak > 1) {
      const label = `${streak}`;
      g.fillStyle = "rgba(255,180,60,.16)";
      g.strokeStyle = "rgba(255,180,60,.5)";
      g.lineWidth = 1.4;
      roundRect(g, 60, 138, 150, 44, 22); g.fill(); g.stroke();
      g.fillStyle = "#ffb84d";
      g.font = "700 20px Inter, sans-serif";
      g.fillText(label, 82, 167);
      g.font = "500 15px Inter, sans-serif";
      g.fillStyle = "rgba(255,200,130,.8)";
      g.fillText("day streak", 82 + g.measureText(label).width + 10, 166);
    }
    const base = 540, bh = 190;
    const spark = (week || month) ? heat : (s.data.heatmap || []).slice(-7);
    const bw = month ? 26 : 74;
    const max = Math.max(1, ...spark.map(d => d.tokens));
    spark.forEach((d, i) => {
      const x = 60 + i * (bw + 18), hgt = Math.max(6, d.tokens / max * bh);
      const grad = g.createLinearGradient(0, base - hgt, 0, base);
      grad.addColorStop(0, "#8b7cf6"); grad.addColorStop(1, "rgba(139,124,246,.14)");
      g.fillStyle = grad;
      roundRect(g, x, base - hgt, bw, hgt, 9); g.fill();
      g.fillStyle = "rgba(255,255,255,.42)";
      g.font = "500 12px Inter, sans-serif";
      g.textAlign = "center";
      g.fillText(d.date.slice(5), x + bw / 2, base + 24);
      g.fillStyle = "rgba(255,255,255,.7)";
      if (d.tokens === max && spark.filter(x => x.tokens === max).length === 1) {
        g.fillStyle = "#fbbf24";
        g.font = "600 11px Inter, sans-serif";
        g.fillText("峰值", x + bw / 2, base - hgt - 8);
      }
      g.font = "600 13px Inter, sans-serif";
      g.fillText(fmtTokens(d.tokens), x + bw / 2, base - hgt - 12);
      g.textAlign = "left";
    });
    const byP = new Map();
    (s.data.logs || []).forEach(l => byP.set(l.provider, (byP.get(l.provider) || 0) + (l.tokens || 0)));
    let top = { k: "—", t: 0 };
    byP.forEach((v, kk) => { if (v > top.t) top = { k: kk, t: v }; });
    g.fillStyle = "rgba(255,255,255,.5)";
    g.font = "500 14px Inter, sans-serif";
    g.fillText(week ? "top route this week" : "top route today", 60, 380);
    g.fillStyle = "#ffffff";
    g.font = "600 26px Inter, sans-serif";
    const pMeta = Obs.api.providerMeta ? Obs.api.providerMeta(top.k) : {};
    g.fillText((pMeta.name || top.k) + " · " + fmtTokens(top.t), 60, 412);
    g.fillStyle = "rgba(255,255,255,.28)";
    g.font = "500 13px Inter, sans-serif";
    g.fillText("requests " + k.requests + "  ·  TPS " + (k.tps || 0).toFixed(1) + "  ·  cache " + (k.cache || 0).toFixed(1) + "%", 60, 596);
    c.toBlob(b => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(b);
      a.download = `magpie-${month ? "month-" : week ? "week-" : ""}${heat[heat.length - 1].date}.png`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast(month ? "已导出月度分享图" : week ? "已导出本周分享图" : "已导出今日分享图");
    }, "image/png");
  }
  function roundRect(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }

  // Side-by-side compare card: today vs yesterday, four deltas.
  function shareCompare() {
    const s = state();
    if (!s) return;
    const heat = s.data.heatmap || [];
    const t = heat[heat.length - 1], y = heat[heat.length - 2];
    if (!t || !y) { toast("没有足够的历史做对比"); return; }
    const dt = (a, b) => b ? Math.round((a - b) / b * 100) : 0;
    const rows = [
      ["tokens", t.tokens, y.tokens],
      ["calls", t.calls, y.calls],
      ["cost", +(t.tokens / 1e6 * 1.32).toFixed(2), +(y.tokens / 1e6 * 1.32).toFixed(2)]
    ];
    const c = document.createElement("canvas");
    c.width = 1200; c.height = 630;
    const g = c.getContext("2d");
    const bg = g.createLinearGradient(0, 0, 1200, 630);
    bg.addColorStop(0, "#0a0b14"); bg.addColorStop(1, "#141021");
    g.fillStyle = bg; g.fillRect(0, 0, 1200, 630);
    g.fillStyle = "#7ff3ff"; g.font = "600 22px Inter, sans-serif";
    g.fillText("Magpie Observatory", 60, 74);
    g.fillStyle = "rgba(255,255,255,.4)"; g.font = "500 14px Inter, sans-serif";
    g.fillText(t.date + " vs " + y.date, 60, 98);
    rows.forEach(([name, a, b], i) => {
      const x = 60, y0 = 200 + i * 130;
      const delta = dt(a, b);
      const arrow = delta > 0 ? "▲" : delta < 0 ? "▼" : "·";
      const col = delta > 0 ? "#4ade80" : delta < 0 ? "#ff6b6b" : "#9aa3b2";
      g.fillStyle = "rgba(255,255,255,.4)"; g.font = "500 15px Inter, sans-serif";
      g.fillText(name, x, y0 - 34);
      g.textAlign = "left";
      g.fillStyle = "#fff"; g.font = "700 52px Inter, sans-serif";
      g.fillText(name === "cost" ? "$" + a : fmtTokens(a), x, y0 + 20);
      g.fillStyle = "rgba(255,255,255,.3)"; g.font = "500 22px Inter, sans-serif";
      g.fillText("vs " + (name === "cost" ? "$" + b : fmtTokens(b)), x + g.measureText(name === "cost" ? "$" + a : fmtTokens(a)).width + 28, y0 + 20);
      g.fillStyle = col; g.font = "700 28px Inter, sans-serif";
      g.textAlign = "right";
      g.fillText(arrow + " " + Math.abs(delta) + "%", 1140, y0 + 14);
      g.textAlign = "left";
    });
    g.fillStyle = "rgba(255,255,255,.25)"; g.font = "500 13px Inter, sans-serif";
    g.fillText("magpie-observatory · compare card", 60, 596);
    c.toBlob(b => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(b);
      a.download = `magpie-compare-${t.date}.png`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast("已导出对比分享图");
    }, "image/png");
  }

  // On-screen weekly report card — the PNG card's quick-glance sibling.
  function weeklyReport() {
    const s = state();
    if (!s) return;
    const heat = (s.data.heatmap || []).slice(-7);
    if (!heat.length) return;
    const tot = heat.reduce((a, d) => a + (d.tokens || 0), 0);
    const calls = heat.reduce((a, d) => a + (d.calls || 0), 0);
    const max = Math.max(1, ...heat.map(d => d.tokens));
    const best = heat.slice().sort((a, b) => b.tokens - a.tokens)[0];
    const byP = new Map();
    (s.data.logs || []).forEach(l => byP.set(l.provider, (byP.get(l.provider) || 0) + (l.tokens || 0)));
    const top = [...byP.entries()].sort((a, b) => b[1] - a[1])[0];
    const meta = top && Obs.api.providerMeta ? Obs.api.providerMeta(top[0]) : null;
    const old = $(".weekly-card");
    if (old) old.remove();
    const card = document.createElement("div");
    card.className = "weekly-card";
    card.innerHTML = `
      <div class="digest-head"><b>本周报告</b><span>${esc(heat[0].date.slice(5))} → ${esc(heat[heat.length - 1].date.slice(5))}</span></div>
      <div class="weekly-bars">${heat.map(d => {
        const h = Math.max(6, Math.round(d.tokens / max * 84));
        const isBest = d === best;
        return `<div class="wb${isBest ? " best" : ""}" style="height:${h}px" title="${esc(d.date)} · ${fmtTokens(d.tokens)}"></div>`;
      }).join("")}</div>
      <div class="digest-grid">
        <div><small>本周 tokens</small><b>${fmtTokens(tot)}</b></div>
        <div><small>本周调用</small><b>${calls.toLocaleString()}</b></div>
        <div><small>峰值日</small><b>${esc(best.date.slice(5))} · ${fmtTokens(best.tokens)}</b></div>
        <div><small>最热路由</small><b>${meta ? esc(meta.name) : "—"}</b></div>
      </div>
      <div class="digest-foot">点击任意处关闭 · ⌘K → 导出本周分享图可得 PNG</div>`;
    card.addEventListener("click", () => card.remove());
    document.body.appendChild(card);
    setTimeout(() => card.classList.add("in"), 10);
  }


  // Compare the default gateway against the locked one (magpie.gw) side by
  // side — the multi-device story without a merge layer.
  async function compareGateways() {
    const locked = (localStorage.getItem("magpie.gw") || "").trim();
    const old = $(".gwcmp-card"); if (old) old.remove();
    const card = document.createElement("div");
    card.className = "gwcmp-card";
    card.innerHTML = `<div class="digest-head"><b>网关对比</b><span>GATEWAY COMPARE</span></div><div class="digest-foot">拉取中…</div>`;
    card.addEventListener("click", () => card.remove());
    document.body.appendChild(card);
    setTimeout(() => card.classList.add("in"), 10);
    const grab = async gw => {
      const q = gw ? `?gw=${encodeURIComponent(gw)}` : "";
      const res = await fetch("api/snapshot" + q, { headers: (Obs.api.apiHeaders && Obs.api.apiHeaders()) || {}, cache: "no-store" });
      const body = await res.json();
      const u = (body.data && body.data.usage) || {};
      return { gw: body.gateway || gw || "default", calls: u.calls || 0, errors: u.errors || 0, tokens: (u.input || 0) + (u.output || 0) + (u.cache_read || 0), cost: u.cost || 0, err: !body.ok };
    };
    try {
      const [a, b] = await Promise.all([grab(""), grab(locked || "")]);
      const row = (label, x, y) => `<div class="gc-row"><span>${label}</span><b>${x}</b></div>`;
      card.innerHTML = `
        <div class="digest-head"><b>网关对比</b><span>GW COMPARE</span></div>
        <div class="gwcmp-grid">
          <div class="gwcmp-col"><h4>${esc(a.gw)}</h4>${row("calls", a.calls.toLocaleString())}${row("tokens", fmtTokens(a.tokens))}${row("cost", "$" + a.cost.toFixed(2))}${row("errors", a.errors)}</div>
          <div class="gwcmp-vs">VS</div>
          <div class="gwcmp-col"><h4>${esc(b.gw)}</h4>${row("calls", b.calls.toLocaleString())}${row("tokens", fmtTokens(b.tokens))}${row("cost", "$" + b.cost.toFixed(2))}${row("errors", b.errors)}</div>
        </div>
        <div class="digest-foot">左 = 默认探测 · 右 = ${locked ? esc(locked) + "（锁定）" : "同默认（未锁定网关）"} · 点击关闭</div>`;
    } catch (_) {
      card.innerHTML = `<div class="digest-head"><b>网关对比</b><span>GW COMPARE</span></div><div class="digest-foot">快照拉取失败——确认网关在线</div>`;
    }
  }

  /* ===================================================== heatmap day pop ==== */
  // Hover a cell → floating card with the day's tokens/calls, Δ vs the
  // previous day, weekday. Delegated so 371 cells share one listener.
  function bindHeatPop() {
    const grid = $("#heat-grid");
    if (!grid) return;
    const pop = document.createElement("div");
    pop.className = "heat-pop";
    pop.hidden = true;
    document.body.appendChild(pop);
    let cur = null;
    grid.addEventListener("mouseover", e => {
      const cell = e.target.closest(".heat-cell");
      if (!cell) { pop.hidden = true; cur = null; return; }
      const idx = [...grid.children].indexOf(cell);
      const days = ((state() && state().data.heatmap) || []).slice(-grid.children.length);
      const d = days[idx];
      if (!d) return;
      const prev = days[idx - 1];
      const delta = prev && prev.tokens ? Math.round((d.tokens - prev.tokens) / prev.tokens * 100) : null;
      const wd = ["日", "一", "二", "三", "四", "五", "六"][new Date(d.date + "T00:00:00").getDay()];
      cur = d.date;
      pop.innerHTML = `<b>${d.date.slice(5)} · 周${wd}</b><span>${fmtTokens(d.tokens)} tokens</span><span>${(d.calls || 0).toLocaleString()} 次调用</span>${delta != null ? `<em class="${delta >= 0 ? "up" : "down"}">${delta >= 0 ? "▲" : "▼"} ${Math.abs(delta)}% vs 前日</em>` : ""}`;
      pop.hidden = false;
    });
    grid.addEventListener("mousemove", e => {
      if (!cur) return;
      const cell = e.target.closest(".heat-cell");
      if (!cell) return;
      const r = cell.getBoundingClientRect();
      pop.style.left = Math.min(innerWidth - 168, Math.max(8, r.left + r.width / 2 - 82)) + "px";
      pop.style.top = Math.max(8, r.top - pop.offsetHeight - 10) + "px";
    });
    grid.addEventListener("mouseleave", () => { pop.hidden = true; cur = null; });
    // Long-press a heat cell → copy that day's figures.
    let heatLp = null;
    grid.addEventListener("touchstart", e => {
      const cell = e.target.closest(".heat-cell");
      if (!cell) return;
      const idx = [...grid.children].indexOf(cell);
      heatLp = setTimeout(() => {
        const days = ((state() && state().data.heatmap) || []).slice(-grid.children.length);
        const d = days[idx];
        if (!d) return;
        navigator.clipboard?.writeText(`${d.date}: ${d.tokens} tokens, ${d.calls || 0} calls`).then(() => toast(`${d.date.slice(5)} 已复制`));
      }, 600);
    }, { passive: true });
    ["touchend", "touchmove", "touchcancel"].forEach(ev => grid.addEventListener(ev, () => clearTimeout(heatLp), { passive: true }));
  }
  /* ====================================================== export PNG ====== */
  // Serialize the active stage view's largest SVG (or canvas) into a PNG.
  // Route view = DOM, so it falls back to a toast; canvas games rasterize
  // straight through; SVGs get cloned, styles inlined, drawn at 2×.
  function exportPNG() {
    const s = state();
    const host = document.querySelector(".stage-view:not([hidden])") || $(".route-stage");
    if (!host) { toast("没有可导出的视图"); return; }
    const cv = host.querySelector("canvas");
    const meta = (Obs.api.viewMeta && s) ? Obs.api.viewMeta(s.heroMode) : {};
    const name = `magpie-${s ? s.heroMode : "view"}-${new Date().toISOString().slice(0, 10)}`;
    if (cv) {
      const a = document.createElement("a");
      a.download = name + ".png"; a.href = cv.toDataURL("image/png"); a.click();
      toast(`已导出 ${meta.title || "视图"}.png`); return;
    }
    const svg = [...host.querySelectorAll("svg")].sort((a, b) =>
      (b.clientWidth * b.clientHeight) - (a.clientWidth * a.clientHeight))[0];
    if (!svg) { toast("此视图没有 SVG/Canvas · 暂不支持导出"); return; }
    const clone = svg.cloneNode(true);
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    const vb = (svg.viewBox && svg.viewBox.baseVal && svg.viewBox.baseVal.width)
      ? svg.viewBox.baseVal
      : { width: svg.clientWidth || 800, height: svg.clientHeight || 300 };
    clone.setAttribute("width", vb.width); clone.setAttribute("height", vb.height);
    const bg = getComputedStyle(document.documentElement).getPropertyValue("--bg").trim() || "#0b0c12";
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("width", "100%"); rect.setAttribute("height", "100%"); rect.setAttribute("fill", bg);
    clone.insertBefore(rect, clone.firstChild);
    const css = [...document.styleSheets].map(sh => { try { return [...sh.cssRules].map(r => r.cssText).join(""); } catch (_) { return ""; } }).join("");
    const st = document.createElementNS("http://www.w3.org/2000/svg", "style");
    st.textContent = css;
    clone.insertBefore(st, clone.firstChild);
    const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], { type: "image/svg+xml" }));
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = vb.width * 2; c.height = vb.height * 2;
      const cx = c.getContext("2d");
      cx.fillStyle = bg; cx.fillRect(0, 0, c.width, c.height);
      cx.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      const a = document.createElement("a");
      a.download = name + ".png"; a.href = c.toDataURL("image/png"); a.click();
      toast(`已导出 ${meta.title || "视图"}.png`);
    };
    img.onerror = () => { URL.revokeObjectURL(url); toast("导出失败 · 该视图无法序列化"); };
    img.src = url;
  }

  // Copy a link that opens this page in the same state (view + range + cinema).
  async function copySnapshotLink() {
    const s = state();
    if (!s) return;
    const u = new URL(location.origin + location.pathname);
    u.searchParams.set("view", s.heroMode || "route");
    u.searchParams.set("range", s.range || "today");
    if (s.cinema) u.searchParams.set("cinema", "1");
    if (s.mode === "live") u.searchParams.set("gw", localStorage.getItem("magpie.gw") || "");
    await navigator.clipboard.writeText(u.toString());
    toast("页面链接已复制 · 当前视图 " + (Obs.api.viewMeta(s.heroMode) || {}).title);
  }
  function applyUrlState() {
    const s = state();
    if (!s) return;
    const p = new URLSearchParams(location.search);
    const v = p.get("view"), r = p.get("range");
    if (v && Obs.api.viewMeta(v)) Obs.api.setHeroMode(v);
    else {
      const dv = localStorage.getItem("magpie.defaultView");
      if (dv && Obs.api.viewMeta(dv) && dv !== s.heroMode) Obs.api.setHeroMode(dv);
    }
    if (r && ["today", "7d", "30d"].includes(r)) {
      s.range = r;
      const btn = document.querySelector(`#range-seg button[data-range="${r}"]`);
      if (btn) { document.querySelectorAll("#range-seg button").forEach(b => b.classList.toggle("active", b === btn)); }
      Obs.api.computeView(); Obs.api.renderAll();
    }
    if (p.get("cinema") === "1") setCinema(true);
    const g = p.get("group");
    if (g) {
      s.vmGroup = g;
      try { localStorage.setItem("magpie.vmGroup", g); } catch (_) {}
    }
    // Restore the cross-device snapshot blob (?st=).
    const stP = p.get("st");
    if (stP) {
      try {
        const st = JSON.parse(decodeURIComponent(escape(atob(stP.replace(/-/g, "+").replace(/_/g, "/")))));
        if (Array.isArray(st.f)) localStorage.setItem("magpie.favorites", JSON.stringify(st.f));
        if (Array.isArray(st.p)) localStorage.setItem("magpie.pinnedSessions", JSON.stringify(st.p));
        if (Array.isArray(st.n)) localStorage.setItem("magpie.scratchNotes", JSON.stringify(st.n));
        if (Array.isArray(st.h)) localStorage.setItem("magpie.kpiHidden", JSON.stringify(st.h));
        const s2 = state();
        if (s2) {
          s2.favorites = st.f || s2.favorites;
          s2.pinnedSessions = st.p || s2.pinnedSessions;
          Obs.api.renderAll && Obs.api.renderAll();
        }
      } catch (_) {}
    }
    const gw = p.get("gw");
    if (gw !== null) {
      if (gw) localStorage.setItem("magpie.gw", gw); else localStorage.removeItem("magpie.gw");
      state().liveTries = 0;
      clearInterval(state().liveTimer);
      if (state().mode === "live") Obs.api.connectLive();
      syncExtrasMenu();
    }
    if (v || r || p.get("cinema")) toast("已进入分享的快照状态");
  }


  /* ==================================================== heatmap day → log == */
  // Click a heat cell → its date becomes the log query (the row filter now
  // also searches the ISO date). Click a filled cell again to release.
  function bindHeatDay() {
    const grid = $("#heat-grid");
    if (!grid) return;
    grid.addEventListener("click", e => {
      const cell = e.target.closest(".heat-cell");
      if (!cell) return;
      const date = (cell.title || "").slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
      const was = state().logQuery === date;
      state().logQuery = was ? "" : date;
      const qs = $("#log-search");
      if (qs) qs.value = state().logQuery;
      Obs.api.renderAll();
      document.querySelector(".log-card, #log-body")?.scrollIntoView({ behavior: "smooth", block: "center" });
      toast(was ? "已放开日期过滤" : `日志过滤：${date}`);
    });
    // Right-click a heat cell → copy its ISO date.
    grid.addEventListener("contextmenu", e => {
      const cell = e.target.closest(".heat-cell");
      if (!cell) return;
      e.preventDefault();
      const date = (cell.title || "").slice(0, 10);
      navigator.clipboard?.writeText(date).then(() => toast(`日期已复制：${date}`));
    });
  }

  /* ====================================================== attn → detail == */
  // A warn/bad attention chip is a door: click it to open the thing it's
  // telling you about — quota alert → burn view (row highlighted), error
  // burst → the log table filtered down.
  /* --------------------------------------------- session-list keyboard nav
   * The quota grid and log table already take arrows; the live session
   * rail deserves the same: ↓/↑ walks cards, Enter selects (same as a
   * click — log search follows), Escape clears. */
  function bindSessionKb() {
    const list = $("#session-list");
    if (!list) return;
    list.tabIndex = 0;
    let sKb = -1;
    list.addEventListener("keydown", e => {
      const cards = [...list.querySelectorAll(".session-card")];
      if (!cards.length) return;
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        sKb = e.key === "ArrowDown" ? Math.min(cards.length - 1, sKb + 1) : Math.max(0, sKb - 1);
        cards.forEach((c, i) => c.classList.toggle("kb-focus", i === sKb));
        cards[sKb]?.scrollIntoView({ block: "nearest" });
      }
      if (e.key === "Enter" && sKb >= 0) { e.preventDefault(); cards[sKb]?.click(); }
      if (e.key === "Escape") { cards.forEach(c => c.classList.remove("kb-focus")); sKb = -1; }
    });
  }

  const GOALS = [0, 500000, 1000000, 2000000, 5000000];
  function bindAttnGoto() {
    const strip = $("#attn-strip");
    if (!strip) return;
    strip.addEventListener("click", e => {
      const item = e.target.closest(".attn-item.goto");
      if (!item) return;
      if (item.dataset.goto === "goal") {
        const cur = +(localStorage.getItem("magpie.dailyGoal") || "0") || 0;
        const next = GOALS[(GOALS.indexOf(cur) + 1) % GOALS.length];
        localStorage.setItem("magpie.dailyGoal", String(next));
        toast(next ? `今日目标 → ${next / 1e6}M tokens` : "今日目标已关闭");
        renderAttn && renderAttn();
        return;
      }
      gotoBurnOrLogs(item);
    });
    strip.addEventListener("contextmenu", e => {
      const item = e.target.closest(".attn-item[data-aid]");
      if (!item || !item.dataset.aid) return;
      e.preventDefault();
      state().attnDismissed = state().attnDismissed || new Set();
      state().attnDismissed.add(item.dataset.aid);
      item.remove();
      toast("已忽略该项 · 刷新生效");
    });
    // ←→ on the attention strip — focus ring between chips, Enter to act.
    strip.tabIndex = 0;
    let aKb = -1;
    strip.addEventListener("keydown", e => {
      const items = [...strip.querySelectorAll(".attn-item")];
      if (!items.length) return;
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault();
        aKb = e.key === "ArrowRight" ? Math.min(items.length - 1, aKb + 1) : Math.max(0, aKb - 1);
        items.forEach((it, i) => it.classList.toggle("kb-focus", i === aKb));
      }
      if (e.key === "Enter" && aKb >= 0) items[aKb]?.click();
      if (e.key === "Escape") { items.forEach(it => it.classList.remove("kb-focus")); aKb = -1; }
    });
  }

  // Shared jump: quota card row OR attention chip → burn view + row open.
  function gotoBurnOrLogs(item) {
    const dest = item.dataset.goto;
    if (dest === "burn") {
      Obs.api.setHeroMode("burn");
      setTimeout(() => {
        const prov = item.dataset.prov;
        const rows = [...document.querySelectorAll(".burn-row")];
        const hit = rows.find(r => r.dataset.prov === prov);
        (hit || rows[0])?.click();
        (hit || rows[0])?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }, 120);
    }
    if (dest === "logs") {
      const q = $("#log-search");
      if (q) { q.value = "err"; state().logQuery = "err"; Obs.api.renderAll(); }
      document.querySelector(".log-card, #log-body")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    if (dest === "records") showRecords();
    if (dest === "weekly") weeklyReport();
  }

  // Bind quota card rows to the same burn jump.
  function bindQuotaGoto() {
    const list = $("#quota-list");
    if (!list) return;
    list.addEventListener("click", e => {
      const item = e.target.closest(".quota-item.goto");
      if (item) gotoBurnOrLogs(item);
    });
    list.addEventListener("contextmenu", e => {
      const item = e.target.closest(".quota-item.goto");
      if (!item) return;
      e.preventDefault();
      navigator.clipboard?.writeText(item.dataset.prov).then(() => toast(`provider key 已复制：${item.dataset.prov}`));
    });
    list.addEventListener("dblclick", e => {
      const item = e.target.closest(".quota-item.goto");
      if (!item) return;
      const name = item.querySelector(".quota-top b")?.textContent;
      if (name) navigator.clipboard?.writeText(name).then(() => toast(`配额名已复制：${name}`));
    });
    // ←→ on the quota grid — horizontal kb-focus, Enter → burn.
    list.tabIndex = 0;
    let qKb = -1;
    list.addEventListener("keydown", e => {
      const items = [...list.querySelectorAll(".quota-item")];
      if (!items.length) return;
      if (e.key === "ArrowRight" || e.key === "ArrowLeft" || e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const fwd = e.key === "ArrowRight" || e.key === "ArrowDown";
        qKb = fwd ? Math.min(items.length - 1, qKb + 1) : Math.max(0, qKb - 1);
        items.forEach((it, i) => it.classList.toggle("kb-focus", i === qKb));
        items[qKb]?.scrollIntoView({ block: "nearest" });
      }
      if (e.key === "Enter" && qKb >= 0) gotoBurnOrLogs(items[qKb]);
      if (e.key === "Escape") { items.forEach(it => it.classList.remove("kb-focus")); qKb = -1; }
    });
  }

  /* ==================================================== heatmap month focus == */
  // Click a month label over the heatmap → that month's cells stay lit,
  // everything else dims. Click again (or another month) to release.
  function bindHeatMonth() {
    const months = $("#heat-months");
    const grid = $("#heat-grid");
    if (!months || !grid) return;
    months.addEventListener("click", e => {
      const spans = [...months.children];
      const idx = spans.indexOf(e.target.closest("span"));
      if (idx < 0) return;
      const label = e.target.closest("span").textContent.trim();
      if (!label) return;
      const month = parseInt(label, 10);
      const days = ((state() && state().data.heatmap) || []).slice(-grid.children.length);
      let hit = -1;
      days.forEach((d, i) => { if (+d.date.slice(5, 7) === month) hit = i; });
      if (hit < 0) { toast("这个月没有数据"); return; }
      const was = months.dataset.focus === String(month);
      months.dataset.focus = was ? "" : String(month);
      [...grid.children].forEach((cell, i) => {
        const d = days[i];
        cell.style.opacity = (!was && d && +d.date.slice(5, 7) !== month) ? ".18" : "";
        cell.style.transform = (!was && d && +d.date.slice(5, 7) === month) ? "scale(1.15)" : "";
      });
      toast(was ? "已放开月份聚焦" : `聚焦 ${month} 月 · 再点取消`);
    });
    // Double-click a month label → log query becomes YYYY-MM so the log table
    // filters to that whole month.
    months.addEventListener("dblclick", e => {
      const span = e.target.closest("span");
      if (!span || !span.textContent.trim()) return;
      const m = String(parseInt(span.textContent, 10)).padStart(2, "0");
      const days = (state().data.heatmap || []);
      const hit = days.find(d => +d.date.slice(5, 7) === +m);
      const yr = hit ? hit.date.slice(0, 4) : new Date().getFullYear();
      const q = `${yr}-${m}`;
      state().logQuery = state().logQuery === q ? "" : q;
      const qs = $("#log-search");
      if (qs) qs.value = state().logQuery;
      Obs.api.renderAll();
      toast(state().logQuery ? `日志过滤：${q}` : "已放开月份过滤");
    });
    // ←→ on the month labels → same click as a mouse click.
    months.tabIndex = 0;
    months.addEventListener("keydown", e => {
      const spans = [...months.children].filter(s => s.textContent.trim());
      if (!spans.length) return;
      const cur = spans.findIndex(s => s.classList.contains("kb-focus"));
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault();
        const next = e.key === "ArrowRight" ? Math.min(spans.length - 1, cur + 1) : Math.max(0, cur < 0 ? 0 : cur - 1);
        spans.forEach((s, i) => s.classList.toggle("kb-focus", i === next));
      }
      if (e.key === "Enter" && cur >= 0) spans[cur]?.click();
      if (e.key === "Escape") spans.forEach(s => s.classList.remove("kb-focus"));
    });
    // Right-click a month label → export that month's days as CSV.
    months.addEventListener("contextmenu", e => {
      const span = e.target.closest("span");
      if (!span || !span.textContent.trim()) return;
      e.preventDefault();
      const m = parseInt(span.textContent, 10);
      const days = (state().data.heatmap || []).filter(d => +d.date.slice(5, 7) === m);
      if (!days.length) { toast("该月没有数据"); return; }
      const csv = ["date,tokens,calls"].concat(days.map(d => `${d.date},${d.tokens},${d.calls || 0}`)).join("\n");
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
      a.download = `heatmap-${days[0].date.slice(0, 7)}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast(`已导出 ${days.length} 天 · ${days[0].date.slice(0, 7)}`);
    });
  }

  /* =========================================================== streak ====== */
  function dayStreak() {
    const s = state();
    const days = s && s.data.heatmap || [];
    if (!days.length) return 0;
    let streak = 0;
    for (let i = days.length - 1; i >= 0; i--) {
      if (Number(days[i].tokens) > 0) streak++; else break;
    }
    return streak;
  }
  function bestStreak() {
    const s = state();
    const days = s && s.data.heatmap || [];
    let best = 0, run = 0;
    for (const d of days) { if (Number(d.tokens) > 0) { run++; best = Math.max(best, run); } else run = 0; }
    return best;
  }

  /* ============================================================ XP ========= */
  const LEVELS = [
    { at: 0, name: "观测员" }, { at: 1200, name: "记录员" }, { at: 3200, name: "巡线员" },
    { at: 6400, name: "路由师" }, { at: 12000, name: "调度官" }, { at: 20000, name: "观测长" },
    { at: 32000, name: "星图师" }, { at: 50000, name: "织网者" }, { at: 78000, name: "引路人" },
    { at: 120000, name: "观星者" }
  ];
  function lifetimeXp() {
    const s = state();
    const days = s && s.data.heatmap || [];
    const tokens = days.reduce((a, d) => a + (d.tokens || 0), 0);
    const calls = days.reduce((a, d) => a + (d.calls || 0), 0);
    const best = +(localStorage.getItem("magpie.playBest") || 0);
    const daysActive = days.filter(d => d.tokens > 0).length;
    return Math.round(tokens / 1e4 + calls / 2 + best * 40 + daysActive * 60);
  }
  function levelOf(xp) {
    let lvl = 0, name = LEVELS[0].name;
    for (let i = 0; i < LEVELS.length; i++) if (xp >= LEVELS[i].at) { lvl = i; name = LEVELS[i].name; }
    const next = LEVELS[lvl + 1];
    return { lvl, name, next, floor: LEVELS[lvl].at, ceil: next ? next.at : null };
  }
  function renderXp() {
    const xp = lifetimeXp();
    const { lvl, name, next, floor, ceil } = levelOf(xp);
    const lv = $("#xp-level"), nm = $("#xp-name"), fill = $("#xp-ring-fill"), chip = $("#xp-chip");
    if (lv) lv.textContent = "Lv " + lvl;
    if (nm) nm.textContent = name;
    if (fill) {
      const pct = ceil ? Math.min(1, (xp - floor) / (ceil - floor)) : 1;
      fill.style.strokeDashoffset = String(97.4 * (1 - pct));
    }
    if (chip) chip.title = `${name} · ${xp.toLocaleString()} XP` + (next ? ` · 距 ${next.name} 还差 ${(next.at - xp).toLocaleString()}` : " · 顶级");
  }

  /* ====================================================== combo milestone === */
  const COMBO_STEPS = new Set([10, 25, 50, 100, 200, 500]);
  function comboMilestone(combo) {
    if (!COMBO_STEPS.has(combo)) return;
    const label = combo >= 500 ? "传说级" : combo >= 200 ? "大师级" : combo >= 100 ? "精英级" : combo >= 50 ? "高手级" : combo >= 25 ? "进阶级" : "新手级";
    toast(`COMBO ${combo} · ${label}连击`);
    beep("warn");
    if (combo >= 100) {
      const bag = JSON.parse(localStorage.getItem("magpie.badges") || "{}");
      if (!bag["combo-100"]) {
        bag["combo-100"] = new Date().toISOString().slice(0, 10);
        localStorage.setItem("magpie.badges", JSON.stringify(bag));
        toast('解锁成就「百战不殆」· 连击 100');
      }
    }
  }
  Obs.game.comboMilestone = comboMilestone;

  /* ========================================================== records ======= */
  function records() {
    const s = state();
    const days = s && s.data.heatmap || [];
    let bestDay = { date: "—", tokens: 0 }, bestCalls = { date: "—", calls: 0 };
    days.forEach(d => {
      if ((d.tokens || 0) > bestDay.tokens) bestDay = { date: d.date, tokens: d.tokens };
      if ((d.calls || 0) > bestCalls.calls) bestCalls = { date: d.date, calls: d.calls };
    });
    return {
      xp: lifetimeXp(), level: levelOf(lifetimeXp()),
      bestDay, bestCalls,
      bestCombo: +(localStorage.getItem("magpie.playBest") || 0),
      daysActive: days.filter(d => d.tokens > 0).length,
      streak: dayStreak()
    };
  }
  function showRecords() {
    const r = records();
    let bag = {};
    try { bag = JSON.parse(localStorage.getItem("magpie.badges") || "{}"); } catch (_) {}
    const badges = ACHIEVEMENTS.map(a => {
      const date = bag[a.id];
      return `<div class="badge${date ? " on" : ""}" title="${esc(a.name)} · ${esc(a.sub)}${date ? " · " + esc(date.slice(5)) : ""}">
        <b>${date ? "🏅" : "🔒"}</b><span>${esc(a.name)}</span><small>${esc(a.sub)}${date ? " · " + esc(date.slice(5)) : ""}</small></div>`;
    }).join("");
    const card = document.createElement("div");
    card.className = "records-card";
    card.innerHTML = `
      <div class="records-head"><b>个人战绩</b><span>PERSONAL RECORDS</span></div>
      <div class="records-grid">
        <div class="rec"><small>等级</small><b>Lv ${r.level.lvl} · ${r.level.name}</b></div>
        <div class="rec"><small>总经验</small><b>${r.xp.toLocaleString()} XP</b></div>
        <div class="rec"><small>最佳连击</small><b>${r.bestCombo} 连击</b></div>
        <div class="rec"><small>连续使用</small><b>${r.streak} 天</b></div>
        <div class="rec"><small>单日最多 tokens</small><b>${fmtTokens(r.bestDay.tokens)} <span>${r.bestDay.date.slice(5)}</span></b></div>
        <div class="rec"><small>单日最多调用</small><b>${r.bestCalls.calls} <span>${r.bestCalls.date.slice(5)}</span></b></div>
        <div class="rec"><small>活跃天数</small><b>${r.daysActive} 天</b></div>
        <div class="rec"><small>累计切视图</small><b>${(parseInt(localStorage.getItem("magpie.viewCount") || "0", 10) || 0).toLocaleString()} 次</b></div>
        <div class="rec"><small>今日切视图</small><b>${(() => {
          try {
            const d = JSON.parse(localStorage.getItem("magpie.viewCountDay") || "{}");
            return (d.date === new Date().toISOString().slice(0, 10) ? d.n : 0) + " 次";
          } catch (_) { return "0 次"; }
        })()}</b></div>
        <div class="rec"><small>最常看</small><b>${(() => {
          try {
            const h = JSON.parse(localStorage.getItem("magpie.viewHeat") || "{}");
            const top = Object.entries(h).sort((a, b) => b[1] - a[1]).slice(0, 3);
            if (!top.length) return "—";
            return top.map(([id, n]) => {
              const meta = (Obs.api.VIEW_META || []).find(v => v.id === id);
              return (meta ? meta.title : id) + "×" + n;
            }).join(" · ");
          } catch (_) { return "—"; }
        })()}</b></div>
      </div>
      <div class="records-sub">成就墙 · ${Object.keys(bag).length}/${ACHIEVEMENTS.length} 已解锁</div>
      ${(() => {
        try {
          const seen = JSON.parse(localStorage.getItem("magpie.viewSeen") || "[]");
          const total = (Obs.api.VIEW_META || []).length;
          const pct = total ? Math.min(100, Math.round(seen.length / total * 100)) : 0;
          return `<div class="dex"><div class="dex-row"><b>图鉴</b><span>${seen.length}/${total} · ${pct}%</span></div>
            <div class="dex-bar"><i style="width:${pct}%"></i></div>
            <div class="dex-legend">${total ? "已看过 " + seen.length + " 个不同视图" : ""}</div>
            <div class="dex-legend">${(() => {
              try {
                const at = JSON.parse(localStorage.getItem("magpie.viewSeenAt") || "{}");
                const first = Object.values(at).sort()[0];
                if (!first) return "";
                const days = Math.max(1, Math.round((Date.now() - new Date(first).getTime()) / 86400000));
                return `收集了 ${days} 天`;
              } catch (_) { return ""; }
            })()}</div>
          </div>`;
        } catch (_) { return ""; }
      })()}
      ${(() => {
        try {
          const seen = JSON.parse(localStorage.getItem("magpie.viewSeen") || "[]");
          const at = JSON.parse(localStorage.getItem("magpie.viewSeenAt") || "{}");
          const recent = seen.slice(-5).reverse().map(id => {
            const meta = (Obs.api.VIEW_META || []).find(v => v.id === id);
            const d = at[id] || "";
            const when = d.length > 10 ? `${d.slice(5, 10)} ${d.slice(11, 16)}` : d.slice(5);
            return `<div class="dex-item"><b>${esc(meta ? meta.title : id)}</b><span>${when}</span></div>`;
          }).join("");
          return `<div class="dex-legend"><b>最近收集</b>${recent || "—"}</div>`;
        } catch (_) { return ""; }
      })()}
      <div class="badge-wall">${badges}</div>`;
    card.addEventListener("click", () => card.remove());
    document.body.appendChild(card);
    setTimeout(() => card.classList.add("in"), 10);
    setTimeout(() => { card.classList.remove("in"); setTimeout(() => card.remove(), 300); }, 14000);
  }

  /* ========================================================== attention ===== */
  // One strip of "what needs eyes right now" — quota burn, errors, streak, today.
  function renderAttention() {
    const s = state();
    const host = $("#attn-strip");
    if (!host || !s) return;
    const items = [];
    const k = (s.view && s.view.kpis) || s.data.kpis;
    const hot = [];
    (s.data.quotas || []).forEach(q => (q.windows || []).forEach(w => { if (w.used >= 80) hot.push({ q, w }); }));
    hot.sort((a, b) => b.w.used - a.w.used).slice(0, 2).forEach(({ q, w }) => {
      const meta = Obs.api.providerMeta ? Obs.api.providerMeta(q.provider) : {};
      items.push({ cls: w.used >= 92 ? "bad" : "warn", icon: "i-flame", text: `${esc(meta.name || q.provider)} ${esc(w.name)} 窗口 ${Math.round(w.used)}%`, sub: w.resetsIn != null ? Obs.api.fmtReset(w.resetsIn) : (q.balance ? "余额 " + q.balance : ""), goto: "burn", prov: q.provider, aid: `quota-${q.provider}-${w.name}` });
    });
    const errs = (s.data.logs || []).filter(l => l.status === "err").length;
    if (errs >= 3) items.push({ cls: "bad", icon: "i-bolt", text: `${errs} 条请求失败`, sub: "点击看日志", goto: "logs", aid: "err-burst" });
    const streak = dayStreak();
    if (streak >= 2) items.push({ cls: "good", icon: "i-flame", text: `连续使用 ${streak} 天`, sub: streak >= 7 ? "保持热度" : "", goto: "records", aid: "streak" });
    // newest achievement chip (last 7 days only) — keeps the strip playful
    try {
      const bag = JSON.parse(localStorage.getItem("magpie.badges") || "{}");
      const recent = ACHIEVEMENTS.filter(a => {
        const d = bag[a.id];
        return d && (Date.now() - new Date(d).getTime()) < 7 * 86400000;
      }).sort((a, b) => (bag[b.id] || "").localeCompare(bag[a.id] || ""));
      if (recent.length) {
        const a = recent[0];
        items.push({ cls: "good", icon: "i-star", text: `🏅 ${a.name}`, sub: a.sub, goto: "records", aid: `badge-${a.id}` });
      }
    } catch (_) {}
    // today's new-collection chip — keeps the strip playful
    try {
      const seen = JSON.parse(localStorage.getItem("magpie.viewSeen") || "[]");
      const at = JSON.parse(localStorage.getItem("magpie.viewSeenAt") || "{}");
      const today = new Date().toISOString().slice(0, 10);
      const fresh = seen.filter(id => at[id] && at[id].slice(0, 10) === today).length;
      if (fresh) items.push({ cls: "good", icon: "i-sparkle", text: `今日收集 ${fresh} 个新视图`, sub: "去图鉴看看", goto: "records", aid: "dex-today" });
    } catch (_) {}
    // daily goal chip — click cycles 0.5M → 1M → 2M → 5M → off
    const GOALS = [0, 500000, 1000000, 2000000, 5000000];
    let goal = 0;
    try { goal = +(localStorage.getItem("magpie.dailyGoal") || "0") || 0; } catch (_) {}
    if (goal > 0 && (k.tokens || 0) > 0) {
      const pct = Math.min(100, Math.round((k.tokens / goal) * 100));
      items.push({ cls: pct >= 100 ? "good" : "calm", icon: "i-star", text: `今日目标 ${pct}%`, sub: pct >= 100 ? `已达标 ${fmtTokens(k.tokens)}` : `${fmtTokens(k.tokens)} / ${fmtTokens(goal)}`, goto: "goal", aid: "daily-goal", pct });
    }
    const act = s.data.sessions.filter(x => x.status !== "done").length;
    const heat = s.data.heatmap || [];
    const yd = heat.length >= 2 ? heat[heat.length - 2] : null;
    const delta = yd && yd.tokens ? Math.round(((k.tokens || 0) - yd.tokens) / yd.tokens * 100) : null;
    const deltaTxt = delta == null ? "" : ` · 较昨日 ${delta >= 0 ? "+" : ""}${delta}%`;
    items.push({ cls: "calm", icon: "i-sparkle", text: `今日 ${fmtTokens(k.tokens)} tokens · ${fmtMoney(k.cost)}${deltaTxt}`, sub: `${act} 个会话活跃 · ${items.length ? "其余平稳" : "一切平稳"}`, goto: "weekly", aid: "daily" });
    host.hidden = false;
    const dismissed = (s.attnDismissed || new Set());
    host.innerHTML = items.filter(it => !dismissed.has(it.aid)).map(it => `<div class="attn-item ${it.cls}${it.goto ? " goto" : ""}" role="status" ${it.goto ? `data-goto="${it.goto}" data-prov="${it.prov || ""}"` : ""} data-aid="${it.aid || ""}" tabindex="0"><svg><use href="#${it.icon}"/></svg><b>${it.text}</b>${it.sub ? `<small>${it.sub}</small>` : ""}${it.pct != null ? `<i class="attn-goal-bar"><em style="width:${it.pct}%"></em></i>` : ""}</div>`).join("");
  }

  /* ======================================================= achievements ===== */
  const ACHIEVEMENTS = [
    { id: "first-day", name: "初次观测", test: s => s.requests > 0, sub: "看到第一条路由" },
    { id: "streak-3", name: "三日同行", test: s => s.streak >= 3, sub: "连续使用 3 天" },
    { id: "streak-7", name: "七日同辉", test: s => s.streak >= 7, sub: "连续使用 7 天" },
    { id: "streak-30", name: "月度陪伴", test: s => s.streak >= 30, sub: "连续使用 30 天" },
    { id: "tokens-1m", name: "百万字海", test: s => s.tokens >= 1e6, sub: "单日 1M tokens" },
    { id: "tokens-10m", name: "千万星河", test: s => s.tokens >= 1e7, sub: "单日 10M tokens" },
    { id: "parallel-3", name: "三路并发", test: s => s.active >= 3, sub: "同时 3 个会话" },
    { id: "night-owl", name: "夜航人", test: s => new Date().getHours() < 6, sub: "凌晨还在观测" },
    { id: "magpie-50", name: "鹊缘人", test: s => (parseInt(localStorage.getItem("magpie.clicks") || "0", 10) || 0) >= 50, sub: "点台鹊 50 次" },
    { id: "view-50", name: "百景图", test: () => { try { return (JSON.parse(localStorage.getItem("magpie.viewSeen") || "[]")).length >= 50; } catch (_) { return false; } }, sub: "看过 50 个不同视图" },
    { id: "view-100", name: "百景全览", test: () => { try { return (JSON.parse(localStorage.getItem("magpie.viewSeen") || "[]")).length >= 100; } catch (_) { return false; } }, sub: "看过 100 个不同视图 · 大收藏家" },
    { id: "view-all", name: "全图鉴", test: () => { try { const seen = JSON.parse(localStorage.getItem("magpie.viewSeen") || "[]"); return (Obs.api.VIEW_META || []).every(v => seen.includes(v.id)); } catch (_) { return false; } }, sub: "看完全部视图 · 究极收藏家" },
    { id: "cinema-1h", name: "影院常客", test: () => (parseFloat(localStorage.getItem("magpie.cinemaMs") || "0") || 0) >= 3600000, sub: "影院累计 1 小时" },
    { id: "fav-5", name: "收藏家", test: s => s.favCount >= 5, sub: "收藏 5 个视图" },
    { id: "magpie-200", name: "鹊上眉梢", test: s => (parseInt(localStorage.getItem("magpie.clicks") || "0", 10) || 0) >= 200, sub: "点台鹊 200 次" },
    { id: "quota-watch", name: "临界守望", test: () => (Obs.api.state?.data.quotas || []).some(q => (q.windows || []).some(w => (w.used || 0) >= 95)), sub: "单配额窗 ≥95% 出现过" },
    { id: "night-owl-2", name: "长夜同航", test: () => { try { if (new Date().getHours() >= 6) return false; const d = new Date().toISOString().slice(0, 10); const days = JSON.parse(localStorage.getItem("magpie.nightDays") || "[]"); if (!days.includes(d)) { days.push(d); localStorage.setItem("magpie.nightDays", JSON.stringify(days.slice(-40))); } return days.length >= 3; } catch (_) { return false; } }, sub: "凌晨 0-6 点观测 ≥3 天" }
  ];
  function checkAchievements() {
    const s = state();
    if (!s) return;
    let bag = {};
    try { bag = JSON.parse(localStorage.getItem("magpie.badges") || "{}"); } catch (_) {}
    const k = (s.view && s.view.kpis) || s.data.kpis;
    const sig = {
      requests: k.requests || 0, tokens: k.tokens || 0,
      active: s.data.sessions.filter(x => x.status !== "done").length,
      streak: dayStreak(),
      favCount: (s.favorites || []).length
    };
    ACHIEVEMENTS.forEach(a => {
      if (bag[a.id] || !a.test(sig)) return;
      bag[a.id] = new Date().toISOString().slice(0, 10);
      toast(`解锁成就「${a.name}」· ${a.sub}`);
      try { if (Obs.api.confetti) Obs.api.confetti(50 + Math.min(50, Object.keys(bag).length * 2)); } catch (_) {}
    });
    try { localStorage.setItem("magpie.badges", JSON.stringify(bag)); } catch (_) {}
  }

  /* =========================================================== digest ======= */
  // Rolling 7-entry history of digests → reviewable later.
  function digestLog() {
    try { return JSON.parse(localStorage.getItem("magpie.digestLog") || "[]"); } catch (_) { return []; }
  }
  // Palette "历史摘要" → floating list of the last 7 digests.
  function showDigestLog() {
    $(".gwcmp-card")?.remove();
    const log = digestLog().slice().reverse();
    const card = document.createElement("div");
    card.className = "gwcmp-card";
    card.innerHTML = `<div class="digest-head"><b>历史摘要</b><span>DIGEST LOG</span></div>` +
      (log.length
        ? `<div class="gwcmp-grid" style="grid-template-columns:1fr">${log.map(e => `<div class="gc-row"><span>${esc(e.date)}</span><b>${fmtTokens(e.tokens)} · ${e.calls} 调用 · ${e.streak}天</b></div>`).join("")}</div>` +
          `<svg class="dig-bars" viewBox="0 0 ${log.length * 10 + 2} 28" style="margin-top:6px">${(() => { const mx = Math.max(1, ...log.map(e => e.tokens || 0)); return log.map((e, i) => `<rect x="${i * 10 + 1}" y="${26 - Math.round((e.tokens || 0) / mx * 24)}" width="8" height="${Math.max(2, Math.round((e.tokens || 0) / mx * 24))}" rx="1.5" fill="var(--accent)" opacity="${(.4 + i / log.length * .6).toFixed(2)}"/>`).join(""); })()}</svg>`
        : `<div class="digest-foot">还没有摘要历史——明日首访后生成</div>`) +
      `<div class="digest-foot"><button class="mini-btn" id="dl-copy" type="button">复制全部</button> · 保留最近 7 条 · 点击外关闭</div>`;
    card.addEventListener("click", e => {
      if (e.target.closest("#dl-copy")) {
        e.stopPropagation();
        const md = digestLog().slice().reverse().map(e => `| ${e.date} | ${e.tokens} | ${e.calls} | ${e.streak}天 |`).join("\n");
        navigator.clipboard?.writeText(`| 日期 | tokens | 调用 | 连续 |\n|---|---|---|---|\n${md}`).then(() => toast("摘要历史已复制"));
        return;
      }
      card.remove();
    });
    document.body.appendChild(card);
    setTimeout(() => card.classList.add("in"), 10);
    closePalette();
  }
  function maybeShowDigest() {
    const s = state();
    if (!s || s._digestShown) return;
    s._digestShown = true;
    const today = new Date().toISOString().slice(0, 10);
    try {
      const seen = localStorage.getItem("magpie.digest");
      if (seen === today) return;
      localStorage.setItem("magpie.digest", today);
    } catch (_) {}
    const days = s.data.heatmap || [];
    const y = days[days.length - 2];
    if (!y || !y.tokens) return;
    try {
      const log = digestLog();
      log.push({ date: y.date || today, tokens: y.tokens, calls: y.calls || 0, streak: dayStreak(), at: Date.now() });
      localStorage.setItem("magpie.digestLog", JSON.stringify(log.slice(-7)));
    } catch (_) {}
    const logLen = digestLog().length;
    const first = logLen <= 1;
    const milestone = [7, 30, 60, 100].includes(dayStreak());
    const greet = first ? "欢迎回来 · 首次摘要" : milestone ? `${dayStreak()} 天里程碑` : "昨日报告";
    const top = {};
    (s.data.logs || []).forEach(l => { top[l.provider] = (top[l.provider] || 0) + (l.tokens || 0); });
    const topP = Object.entries(top).sort((a, b) => b[1] - a[1])[0];
    const meta = topP && Obs.api.providerMeta ? Obs.api.providerMeta(topP[0]) : null;
    const y2 = days[days.length - 3];
    const dTok = y2 && y2.tokens ? Math.round((y.tokens - y2.tokens) / y2.tokens * 100) : null;
    const dCall = y2 && y2.calls && y.calls != null ? Math.round((y.calls - y2.calls) / y2.calls * 100) : null;
    // Week-over-week: last 7 days vs the 7 before them (heatmap tail).
    const wk = (() => {
      const last7 = days.slice(-7).reduce((a, d) => a + (d.tokens || 0), 0);
      const prev7 = days.slice(-14, -7).reduce((a, d) => a + (d.tokens || 0), 0);
      if (!prev7) return null;
      const pct = Math.round((last7 - prev7) / prev7 * 100);
      return `<div class="dig-wk" style="cursor:pointer" title="近7天 ${fmtTokens(last7)} tok · 前7天 ${fmtTokens(prev7)} tok · 点击滚到热度"><small>周环比</small><b>${pct >= 0 ? "+" : ""}${pct}% <em class="dig ${pct >= 0 ? "up" : "down"}">${pct >= 0 ? "▲" : "▼"} vs 上周</em></b></div>`;
    })();
    const card = document.createElement("div");
    card.className = "digest-card";
    card.innerHTML = `
      <div class="digest-head"><b>${esc(greet)}</b><span>DAILY DIGEST</span></div>
      <div class="digest-grid">
        <div class="dig-tok" style="cursor:pointer" title="点击 → 滚到热度"><small>tokens</small><b>${fmtTokens(y.tokens)}${dTok != null ? `<em class="dig ${dTok >= 0 ? "up" : "down"}">${dTok >= 0 ? "▲" : "▼"}${Math.abs(dTok)}%</em>` : ""}</b></div>
        <div class="dig-call" style="cursor:pointer" title="点击 → 滚到请求日志"><small>调用</small><b>${y.calls || 0}${dCall != null ? `<em class="dig ${dCall >= 0 ? "up" : "down"}">${dCall >= 0 ? "▲" : "▼"}${Math.abs(dCall)}%</em>` : ""}</b></div>
        <div class="dig-streak" style="cursor:pointer" title="点击 → 连续打卡明细"><small>连续使用</small><b>${dayStreak()} 天</b></div>
        ${wk || ""}
        ${(() => {
          // Yesterday's busiest subagent across sessions (count, not tokens).
          const subN = {};
          (s.data.sessions || []).concat(s.data.recent || []).forEach(x => (x.subagents || []).forEach(a => { subN[a.name] = (subN[a.name] || 0) + 1; }));
          const topSub = Object.entries(subN).sort((a, b) => b[1] - a[1])[0];
          return topSub ? `<div class="dig-sub" data-sub="${esc(topSub[0])}" style="cursor:pointer" title="点击 → 过滤含此子代理的会话"><small>子代理</small><b>${esc(topSub[0])} ×${topSub[1]}</b></div>` : "";
        })()}
        ${(() => {
          const errs = (s.data.logs || []).filter(l => l.status === "err").length;
          const total = (s.data.logs || []).length;
          if (!total) return "";
          const pct = Math.round(errs / total * 100);
          return `<div class="dig-errr" style="cursor:pointer" title="点击 → 日志过滤 err"><small>错误率</small><b>${pct}% <em class="dig ${pct > 5 ? "down" : ""}">${errs}/${total}</em></b></div>`;
        })()}
        ${(() => {
          try {
            const seen = JSON.parse(localStorage.getItem("magpie.viewSeen") || "[]");
            const at = JSON.parse(localStorage.getItem("magpie.viewSeenAt") || "{}");
            const total = (Obs.api.VIEW_META || []).length;
            const pct = total ? Math.round(seen.length / total * 100) : 0;
            const todayNew = seen.filter(id => at[id] === today).length;
            const lastMeta = seen.length && Obs.api.viewMeta ? Obs.api.viewMeta(seen[seen.length - 1]) : null;
            const week = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
            const wkNew = seen.filter(id => at[id] && at[id] >= week).length;
            const trend = wkNew > 0 ? `<em class="dig up">▲+${wkNew}本周</em>` : `<em class="dig">稳</em>`;
            return `<div class="dig-dex" style="cursor:pointer" title="${lastMeta ? "最近新增:「" + esc(lastMeta.title) + "」 · " : ""}点击 → 打开视图菜单"><small>图鉴</small><b>${seen.length}/${total} ${trend} <em class="dig">${pct}%${todayNew ? ` · 今日+${todayNew}` : ""}</em></b></div>`;
          } catch (_) { return ""; }
        })()}
        ${(() => {
          const errs = (s.data.logs || []).filter(l => l.status === "err").length;
          const calls = Math.max(1, y.calls || 0);
          const pct = (errs / calls * 100).toFixed(1);
          return `<div class="dig-errr" style="cursor:pointer" title="点击 → 过滤错误日志"><small>错误率</small><b>${pct}% <em class="dig ${errs > calls * .05 ? "down" : "up"}">${errs} 条</em></b></div>`;
        })()}
        ${(() => {
          if (!topP) return "";
          const topM = {};
          (s.data.logs || []).forEach(l => { topM[l.model || "?"] = (topM[l.model || "?"] || 0) + (l.tokens || 0); });
          const [tm, tn] = Object.entries(topM).sort((a, b) => b[1] - a[1])[0] || [];
          return `<div class="dig-top" data-dig-prov="${esc(topP[0])}" style="cursor:pointer" title="点击 → 会话过滤到 ${esc(meta?.name || topP[0])}"><small>最常用</small><b>${esc(meta?.name || topP[0])} <em class="dig">${fmtTokens(topP[1])}</em></b><small style="display:block;margin-top:2px">${esc((tm || "").split("/").pop() || "—")}${tn ? " · " + fmtTokens(tn) : ""}</small></div>`;
        })()}
        ${(() => {
          try {
            const seen = JSON.parse(localStorage.getItem("magpie.viewSeen") || "[]");
            const at = JSON.parse(localStorage.getItem("magpie.viewSeenAt") || "{}");
            const week = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
            const recent = seen.filter(id => at[id] && at[id] >= week).length;
            return `<div><small>本周收集</small><b>${recent} <em class="dig">新视图</em></b></div>`;
          } catch (_) { return ""; }
        })()}
        ${(() => {
          const byHour = new Array(24).fill(0);
          (s.data.logs || []).forEach(l => { if (l.at) byHour[new Date(l.at).getHours()] += l.tokens || 0; });
          let hi = -1, hv = 0;
          for (let h = 0; h < 24; h++) if (byHour[h] > hv) { hv = byHour[h]; hi = h; }
          return hi >= 0 ? `<div><small>高峰时段</small><b>${String(hi).padStart(2, "0")}:00 <em class="dig">${fmtTokens(hv)}</em></b></div>` : "";
        })()}
        ${(() => {
          let slow = null, sms = 0;
          (s.data.sessions || []).concat(s.data.recent || []).forEach(x => {
            const mx = Math.max(0, ...(x.tries || []).map(t => t.ms || 0));
            if (mx > sms) { sms = mx; slow = x; }
          });
          return slow ? `<div><small>最慢会话</small><b>${(sms / 1000).toFixed(1)}s <em class="dig">${esc((slow.title || "?").slice(0, 10))}</em></b></div>` : "";
        })()}
        ${(() => {
          const yd = y.date || "";
          const n = (s.data.sessions || []).concat(s.data.recent || []).filter(x => x.startedAt && new Date(x.startedAt).toISOString().slice(0, 10) === yd).length;
          return n ? `<div><small>昨日会话</small><b>${n} <em class="dig">新增</em></b></div>` : "";
        })()}
        ${(() => {
          let long = null, lms = 0;
          (s.data.sessions || []).concat(s.data.recent || []).forEach(x => {
            const dur = x.finishedAt && x.startedAt ? x.finishedAt - x.startedAt : (x.startedAt ? Date.now() - x.startedAt : 0);
            if (dur > lms) { lms = dur; long = x; }
          });
          return long && lms > 60000 ? `<div><small>最长会话</small><b>${Math.round(lms / 60000)}m <em class="dig">${esc((long.title || "?").slice(0, 10))}</em></b></div>` : "";
        })()}
        ${(() => {
          const errs = (s.data.logs || []).filter(l => l.status === "err");
          if (!errs.length) return `<div><small>错误</small><b>0 <em class="dig up">干净</em></b></div>`;
          const byP = {};
          errs.forEach(l => { byP[l.provider] = (byP[l.provider] || 0) + 1; });
          const [ep, en] = Object.entries(byP).sort((a, b) => b[1] - a[1])[0];
          const ename = Obs.api.providerMeta ? Obs.api.providerMeta(ep).name : ep;
          const emodel = errs.filter(l => l.provider === ep).map(l => (l.model || "").split("/").pop()).sort((a, b) => (errs.filter(x => (x.model || "").split("/").pop() === b).length - errs.filter(x => (x.model || "").split("/").pop() === a).length))[0];
          return `<div class="dig-err" data-dig-prov="${esc(ep)}" style="cursor:pointer" title="点击 → 日志过滤到 ${esc(ename)}"><small>错误聚类</small><b>${errs.length} <em class="dig down">${esc(ename)}·${en}</em></b><small style="display:block;margin-top:2px">${esc(emodel || "")} · 点击下钻</small></div>`;
        })()}
        ${(() => {
          const errs2 = (s.data.logs || []).filter(l => l.status === "err");
          if (errs2.length < 2) return "";
          const byP2 = {};
          errs2.forEach(l => { byP2[l.provider] = (byP2[l.provider] || 0) + 1; });
          const [e2, n2] = Object.entries(byP2).sort((a, b) => b[1] - a[1])[1] || [];
          if (!e2) return "";
          const nm2 = Obs.api.providerMeta ? Obs.api.providerMeta(e2).name : e2;
          return `<div class="dig-err" data-dig-prov="${esc(e2)}" style="cursor:pointer" title="点击 → 日志过滤到 ${esc(nm2)}"><small>次错源</small><b>${esc(nm2)} <em class="dig down">×${n2}</em></b></div>`;
        })()}
        ${(() => {
          const ttfts = (s.data.logs || []).map(l => l.ttft || 0).filter(t => t > 0);
          if (!ttfts.length) return "";
          const avg = ttfts.reduce((a, t) => a + t, 0) / ttfts.length;
          return `<div><small>TTFT 均值</small><b>${avg < 1000 ? Math.round(avg) + "ms" : (avg / 1000).toFixed(1) + "s"} <em class="dig">${ttfts.length} 请求</em></b></div>`;
        })()}
        ${(() => {
          const tpsMax = (s.data.logs || []).reduce((m, l) => Math.max(m, l.tps || 0), 0);
          return tpsMax > 0 ? `<div><small>TPS 峰值</small><b>${tpsMax.toFixed(1)}/s</b></div>` : "";
        })()}
        ${(() => {
          const all = (s.data.sessions || []).concat(s.data.recent || []);
          const tot = all.reduce((a, x) => a + (x.tokens || 0), 0);
          return all.length ? `<div><small>均会话</small><b>${fmtTokens(Math.round(tot / all.length))} <em class="dig">tok</em></b></div>` : "";
        })()}
        ${(() => {
          try {
            const bag = JSON.parse(localStorage.getItem("magpie.badges") || "{}");
            const yd = y.date || "";
            const newly = Object.entries(bag).filter(([, d]) => String(d).slice(0, 10) >= yd).length;
            return newly ? `<div><small>昨日解锁</small><b>${newly} <em class="dig up">新成就</em></b></div>` : "";
          } catch (_) { return ""; }
        })()}
      </div>
      ${(() => {
        // 7-day mini bar under the grid: yesterday's context at a glance.
        const tail = days.slice(-7);
        if (tail.length < 2) return "";
        const pts = tail.map((d, i) => `${i * (70 / (tail.length - 1))},${(26 - (d.tokens || 0) / max * 22).toFixed(1)}`).join(" ");
        const avg = tail.reduce((a, d) => a + (d.tokens || 0), 0) / tail.length;
        return `<svg class="dig-bars" viewBox="0 0 72 28" aria-hidden="true">${tail.map((d, i) => `<rect x="${Math.max(0, i * (70 / (tail.length - 1)) - 3).toFixed(1)}" y="${(26 - (d.tokens || 0) / max * 22).toFixed(1)}" width="6" height="${Math.max(2, ((d.tokens || 0) / max * 22)).toFixed(1)}" rx="1" fill="color-mix(in srgb, var(--accent) 22%, transparent)"><title>${d.date} · ${d.tokens}</title></rect>`).join("")}<polyline points="${pts}" fill="none" stroke="var(--accent)" stroke-width="1.2" stroke-linejoin="round" opacity=".9"/>${tail.map((d, i) => { const spike = (d.tokens || 0) > avg * 2; return `<circle cx="${(i * (70 / (tail.length - 1))).toFixed(1)}" cy="${(26 - (d.tokens || 0) / max * 22).toFixed(1)}" r="${i === tail.length - 2 ? 2.4 : 1.4}" fill="${spike ? "var(--red)" : i === tail.length - 2 ? "var(--accent)" : "color-mix(in srgb, var(--accent) 60%, transparent)"}" stroke="${i === tail.length - 2 ? "#fff" : "none"}" stroke-width=".8"><title>${d.date} · ${d.tokens}${spike ? " · 尖峰·超均值" + Math.round((d.tokens || 0) / Math.max(1, avg)) + "x" : ""}</title></circle>`; }).join("")}</svg>`;
      })()}
      <div class="digest-foot">连续使用 ${dayStreak()} 天${bestStreak() > dayStreak() ? ` <em style="font-size:8px;color:var(--faint)">(最佳 ${bestStreak()})</em>` : " · 最佳"} ${(() => { const t5 = days.slice(-5); return `<span style="display:inline-flex;gap:2px;vertical-align:middle;margin-left:4px">${t5.map(d => `<i style="width:8px;height:8px;border-radius:2px;background:${(d.tokens || 0) > 0 ? "var(--accent)" : "color-mix(in srgb,var(--fg) 10%,transparent)"}" title="${d.date} · ${d.tokens}"></i>`).join("")}</span>`; })()} · ${dTok != null && y2 ? (dTok >= 0 ? "较" + y2.date.slice(5) + " +" + dTok + "%" : "较" + y2.date.slice(5) + " " + dTok + "%") : "保持热度"}
      ${(() => { const mo = new Date().toISOString().slice(0, 7); const moP = new Date(new Date().getFullYear(), new Date().getMonth() - 1).toISOString().slice(0, 7); const mSum = days.filter(d => (d.date || "").startsWith(mo)).reduce((a, d) => a + (d.tokens || 0), 0); const mPrev = days.filter(d => (d.date || "").startsWith(moP)).reduce((a, d) => a + (d.tokens || 0), 0); const dayN = new Date().getDate(), daysInMo = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate(), moPct = Math.round(dayN / daysInMo * 100); return mSum ? `<div style="font-size:8.5px;color:var(--faint);margin-top:2px">本月累计 ${fmtTokens(mSum)} tokens${mPrev ? ` · 上月${fmtTokens(mPrev)}` : ""} · 月过 ${moPct}%<i style="display:block;height:2px;background:color-mix(in srgb,var(--fg) 10%,transparent);border-radius:1px;margin-top:2px"><em style="display:block;height:100%;width:${moPct}%;background:var(--accent);border-radius:1px"></em></i></div>` : ""; })()}
      ${(() => { const q = Math.floor(new Date().getMonth() / 3); const yr = new Date().getFullYear(); const qSum = days.filter(d => { const m = new Date(d.date + "T00:00").getMonth(); return Math.floor(m / 3) === q && new Date(d.date + "T00:00").getFullYear() === yr; }).reduce((a, d) => a + (d.tokens || 0), 0); const qp = q === 0 ? 3 : q - 1, yrP = q === 0 ? yr - 1 : yr; const qPrev = days.filter(d => { const dt = new Date(d.date + "T00:00"); return Math.floor(dt.getMonth() / 3) === qp && dt.getFullYear() === yrP; }).reduce((a, d) => a + (d.tokens || 0), 0); return qSum ? `<div style="font-size:8.5px;color:var(--faint)">本季累计 ${fmtTokens(qSum)}${qPrev ? ` · 上季${fmtTokens(qPrev)}` : ""}</div>` : ""; })()}
      ${(() => { const yr2 = String(new Date().getFullYear()); const yrP = String(new Date().getFullYear() - 1); const ySum = days.filter(d => (d.date || "").startsWith(yr2)).reduce((a, d) => a + (d.tokens || 0), 0); const yPrev = days.filter(d => (d.date || "").startsWith(yrP)).reduce((a, d) => a + (d.tokens || 0), 0); return ySum ? `<div style="font-size:8.5px;color:var(--faint)">本年累计 ${fmtTokens(ySum)}${yPrev ? ` · 上年${fmtTokens(yPrev)}` : ""}</div>` : ""; })()}
      ${(() => { const mo = new Date().toISOString().slice(0, 7); const goal = +(localStorage.getItem("magpie.dailyGoal") || "0") || 0; const moDays = days.filter(d => (d.date || "").startsWith(mo)); const hit = moDays.filter(d => goal > 0 && (d.tokens || 0) >= goal).length; return goal > 0 && hit ? `<div style="font-size:8.5px;color:var(--faint)">本月达标 ${hit}/${moDays.length} 天 · ${Math.round(hit / Math.max(1, moDays.length) * 100)}%</div>` : ""; })()}
      ${(() => { const w1 = days.slice(-7).reduce((a, d) => a + (d.tokens || 0), 0), w0 = days.slice(-14, -7).reduce((a, d) => a + (d.tokens || 0), 0); if (!w0) return ""; const p = Math.round((w1 - w0) / w0 * 100); return `<div style="font-size:8.5px;color:var(--faint)">近7日均 ${fmtTokens(Math.round(w1 / 7))} · 较上周 ${p >= 0 ? "▲ +" : "▼ "}${p}%</div>`; })()}
      ${(() => { const t7 = days.slice(-7).map(d => d.tokens || 0).sort((a, b) => a - b); return t7.length ? `<div style="font-size:8.5px;color:var(--faint)">近7日中位 ${fmtTokens(t7[Math.floor(t7.length / 2)])}</div>` : ""; })()}
      ${(() => { const c7 = days.slice(-7).reduce((a, d) => a + (d.cost != 0 ? d.cost : 0), 0); return c7 > 0 ? `<div style="font-size:8.5px;color:var(--faint)">近7日成本 ${fmtMoney(c7)} · 日均 ${fmtMoney(c7 / 7)}</div>` : ""; })()}
        <button class="mini-btn digest-week" type="button">看周报 →</button>
        <button class="mini-btn digest-md" type="button">复制 MD</button>
        <button class="mini-btn digest-csv" type="button">复制 CSV</button>
        <button class="mini-btn digest-json" type="button">复制 JSON</button></div>`;
    card.addEventListener("click", e => {
      const errCell = e.target.closest(".dig-err");
      if (errCell) {
        const prov = errCell.dataset.digProv;
        // Drill down: filter the session rail to that provider's failures.
        state().filter = { type: "provider", value: prov };
        state().logQuery = prov;
        const qs = $("#log-search"); if (qs) qs.value = prov;
        Obs.api.renderAll && Obs.api.renderAll();
        card.remove();
        toast(`已过滤到 ${prov} · 错误聚类下钻`);
        return;
      }
      const topCell = e.target.closest(".dig-top");
      if (topCell) {
        const prov = topCell.dataset.digProv;
        if (prov) {
          state().filter = { type: "provider", value: prov };
          Obs.api.renderAll && Obs.api.renderAll();
          toast(`已过滤到 ${prov}`);
        }
        card.remove();
        return;
      }
      if (e.target.closest(".digest-week")) { weeklyReport(); }
      else if (e.target.closest(".digest-md")) {
        const errs = (s.data.logs || []).filter(l => l.status === "err").length;
        const md = `## 昨日观测 ${y.date || today}\n- tokens: ${fmtTokens(y.tokens)} (${y.calls || 0} 调用)\n- 连续使用: ${dayStreak()} 天\n- 最常用: ${meta ? meta.name : "—"}\n- 错误: ${errs} 条\n- 图鉴: ${(() => { try { return JSON.parse(localStorage.getItem("magpie.viewSeen") || "[]").length; } catch (_) { return "?"; } })()}/${(Obs.api.VIEW_META || []).length}\n`;
        navigator.clipboard?.writeText(md).then(() => toast("昨日摘要已复制"));
      }
      else if (e.target.closest(".digest-csv")) {
        const errs = (s.data.logs || []).filter(l => l.status === "err").length;
        const csv = `date,tokens,calls,streak,top_provider,errors\n${y.date || today},${y.tokens || 0},${y.calls || 0},${dayStreak()},${topP ? topP[0] : ""},${errs}`;
        navigator.clipboard?.writeText(csv).then(() => toast("昨日摘要 CSV 已复制"));
      }
      else if (e.target.closest(".digest-json")) {
        const errs = (s.data.logs || []).filter(l => l.status === "err").length;
        const payload = { date: y.date || today, tokens: y.tokens || 0, calls: y.calls || 0, streak: dayStreak(), topProvider: topP ? topP[0] : null, errors: errs };
        navigator.clipboard?.writeText(JSON.stringify(payload, null, 2)).then(() => toast("昨日摘要 JSON 已复制"));
      }
      else if (e.target.closest(".dig-wk")) {
        const heat = document.querySelector('[data-slot="heat"], .heatmap-card, #heatmap-card, [data-slot="rhythm"]');
        if (heat) heat.scrollIntoView({ behavior: "smooth", block: "center" });
        toast("滚到热度区 · 看周对比");
        card.remove();
        return;
      }
      else if (e.target.closest(".dig-tok") || e.target.closest(".dig-call")) {
        const tok = e.target.closest(".dig-tok");
        const el = document.querySelector(tok ? '[data-slot="heat"], #heatmap-card' : '[data-slot="logs"], #log-card, .log-card');
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
        toast(tok ? "滚到热度" : "滚到请求日志");
        card.remove();
        return;
      }
      else if (e.target.closest(".dig-dex")) {
        $("#view-picker")?.click();
        card.remove();
        return;
      }
      else if (e.target.closest(".dig-sub")) {
        const name = e.target.closest(".dig-sub").dataset.sub;
        state().filter = { type: "subagent", value: name };
        Obs.api.renderAll && Obs.api.renderAll();
        toast(`已过滤含子代理 ${name} 的会话`);
        card.remove();
        return;
      }
      else if (e.target.closest(".dig-errr")) {
        state().logQuery = "err";
        const qs = $("#log-search"); if (qs) qs.value = "err";
        const el = document.querySelector('[data-slot="logs"], #log-card, .log-card');
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
        toast("日志过滤 → err");
        card.remove();
        return;
      }
      else if (e.target.closest(".dig-streak")) {
        const days2 = (s.data.heatmap || []).slice(-dayStreak()).map(d => `${d.date.slice(5)}:${fmtTokens(d.tokens || 0)}`).join(" · ");
        const lastD = (s.data.heatmap || []).slice(-1)[0];
        toast(days2 ? `连续 ${dayStreak()} 天 · 最后活跃 ${lastD ? lastD.date.slice(5) : "—"} · ${days2}` : `连续 ${dayStreak()} 天`);
        return;
      }
      card.remove();
    });
    beep("ok"); // subtle chime when the daily digest surfaces
    // Swipe the digest away horizontally (touch UIs: dismiss affordance).
    let dgX = null;
    card.addEventListener("touchstart", e => { if (e.touches.length === 1) dgX = e.touches[0].clientX; }, { passive: true });
    card.addEventListener("touchend", e => {
      if (dgX == null || e.changedTouches.length !== 1) return;
      const dx = e.changedTouches[0].clientX - dgX; dgX = null;
      if (Math.abs(dx) > 60) card.remove();
    }, { passive: true });
    // Also surface via Web Notification when permission was granted.
    try {
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        new Notification(`Magpie · ${y.date || "昨日摘要"}`, { body: `${fmtTokens(y.tokens)} tok · ${y.calls || 0} 调用 · ${dayStreak()} 天连续`, icon: "assets/icon.png", silent: true, tag: "obs-digest" });
      }
    } catch (_) {}
    document.body.appendChild(card);
    setTimeout(() => card.classList.add("in"), 10);
    setTimeout(() => { card.classList.remove("in"); setTimeout(() => card.remove(), 300); }, 12000);
  }

  /* ========================================================== attract ====== */
  // Idle for 90s → tour favourites only; any interaction wakes the board.
  const IDLE_MS = 90000;
  function resetIdle() {
    const s = state();
    if (!s) return;
    clearTimeout(s._idleTimer);
    if (s.attract) {
      s.attract = false;
      if (s.ambient) setAmbient(false);
      else if (s.tour) Obs.api.stopTour(true);
      toast("欢迎回来");
    }
    s._idleTimer = setTimeout(() => {
      if (document.hidden || s.paused || s.replay || s.cinema || s.tour) return;
      s.attract = true;
      setAmbient(true);
    }, IDLE_MS);
  }

  /* ======================================================== layout edit ==== */
  const SLOT_IDS = ["hero", "live", "kpi", "chart", "quota", "donut", "heat", "table"];
  function slotEls() { return $$("#grid > [data-slot]"); }
  function applyLayout(order, hidden) {
    const grid = $("#grid");
    if (!grid) return;
    const map = Object.fromEntries(slotEls().map(el => [el.dataset.slot, el]));
    (order || SLOT_IDS).forEach(id => { if (map[id]) grid.appendChild(map[id]); });
    slotEls().forEach(el => { el.classList.toggle("slot-hidden", (hidden || []).includes(el.dataset.slot)); });
  }
  function loadLayout() {
    let order = null, hidden = [];
    try {
      order = JSON.parse(localStorage.getItem("magpie.layout") || "null");
      hidden = JSON.parse(localStorage.getItem("magpie.hidden") || "[]");
    } catch (_) {}
    applyLayout(order, hidden);
  }
  function saveLayout() {
    try {
      localStorage.setItem("magpie.layout", JSON.stringify(slotEls().map(el => el.dataset.slot)));
      localStorage.setItem("magpie.hidden", JSON.stringify(slotEls().filter(el => el.classList.contains("slot-hidden")).map(el => el.dataset.slot)));
    } catch (_) {}
  }
  let dragSlot = null;
  function setLayoutEdit(on) {
    const s = state();
    if (!s) return;
    s.layoutEdit = !!on;
    document.body.classList.toggle("layout-edit", on);
    slotEls().forEach(el => {
      el.draggable = on;
      let x = el.querySelector(".slot-x");
      if (on && !x) {
        x = document.createElement("button");
        x.className = "slot-x";
        x.textContent = "×";
        x.title = "隐藏这张卡";
        x.addEventListener("click", ev => { ev.stopPropagation(); el.classList.add("slot-hidden"); saveLayout(); });
        el.appendChild(x);
      }
      if (x) x.hidden = !on;
    });
    if (on) toast("拖拽卡片换位置 · × 隐藏 · 设置里关闭排布模式");
  }
  function bindLayoutEdit() {
    const grid = $("#grid");
    if (!grid) return;
    grid.addEventListener("dragstart", e => {
      const card = e.target.closest("[data-slot]");
      if (!card || !state() || !state().layoutEdit) return;
      dragSlot = card;
      card.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
    });
    grid.addEventListener("dragover", e => {
      if (!dragSlot || !state() || !state().layoutEdit) return;
      const over = e.target.closest("[data-slot]");
      e.preventDefault();
      if (!over || over === dragSlot) return;
      const r = over.getBoundingClientRect();
      const before = e.clientY < r.top + r.height / 2;
      grid.insertBefore(dragSlot, before ? over : over.nextSibling);
    });
    grid.addEventListener("drop", e => { e.preventDefault(); });
    grid.addEventListener("dragend", () => {
      if (dragSlot) dragSlot.classList.remove("dragging");
      dragSlot = null;
      saveLayout();
    });
  }

  /* ======================================================== scratch notes ==== */
  // KPI 卡拖进 note-card → 钉住当前值;magpie.scratchNotes 持久。
  function scratch() {
    try { return JSON.parse(localStorage.getItem("magpie.scratchNotes") || "[]"); } catch (_) { return []; }
  }
  function renderScratch() {
    const host = $("#note-list"), card = $("#note-card");
    if (!host || !card) return;
    const list = scratch();
    card.hidden = list.length === 0 && !card.classList.contains("note-arm");
    host.innerHTML = list.map((n, i) => `<div class="note-chip" draggable="true" data-note-i="${i}"><b>${esc(n.label)}</b><span>${esc(n.value)}</span><small>${esc(n.at)}</small><button type="button" data-note-rm="${i}" aria-label="移除">×</button></div>`).join("");
  }
  function bindScratch() {
    const card = $("#note-card"), row = $("#kpi-row"), host = $("#note-list");
    if (!card || !row) return;
    row.addEventListener("dragstart", e => {
      const kpi = e.target.closest(".kpi");
      if (!kpi || (state() && state().layoutEdit)) return;
      e.dataTransfer.setData("text/plain", JSON.stringify({ label: kpi.dataset.kpiLabel || "KPI", value: kpi.dataset.kpiValue || "" }));
      e.dataTransfer.effectAllowed = "copy";
      card.hidden = false;
      card.classList.add("note-arm");
    });
    row.addEventListener("dragend", () => card.classList.remove("note-arm"));
    card.addEventListener("dragover", e => { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; card.classList.add("note-over"); });
    card.addEventListener("dragleave", () => card.classList.remove("note-over"));
    card.addEventListener("drop", e => {
      e.preventDefault();
      card.classList.remove("note-over", "note-arm");
      let payload = null;
      try { payload = JSON.parse(e.dataTransfer.getData("text/plain")); } catch (_) {}
      if (!payload) return;
      // Multi-select session drop: one note per session id (title + tokens).
      if (payload.kind === "sessions" && Array.isArray(payload.batch)) {
        const list = scratch();
        const now = new Date().toLocaleTimeString("zh-CN", { hour12: false, hour: "2-digit", minute: "2-digit" });
        payload.batch.forEach(id => {
          const sess = (state().data.sessions || []).concat(state().data.recent || []).find(x => x.id === id);
          if (!sess) return;
          list.push({ label: `${sess.title.slice(0, 18)}`, value: fmtTokens(sess.tokens || 0) + " tok", at: now });
        });
        try { localStorage.setItem("magpie.scratchNotes", JSON.stringify(list.slice(-24))); } catch (_) {}
        renderScratch();
        toast(`已钉 ${payload.batch.length} 个会话`);
        return;
      }
      if (!payload.label) return;
      const list = scratch();
      list.push({ label: payload.label, value: payload.value, at: new Date().toLocaleTimeString("zh-CN", { hour12: false, hour: "2-digit", minute: "2-digit" }) });
      try { localStorage.setItem("magpie.scratchNotes", JSON.stringify(list.slice(-24))); } catch (_) {}
      renderScratch();
      toast(`已钉：${payload.label} ${payload.value}`);
    });
    $("#note-clear")?.addEventListener("click", () => {
      try { localStorage.removeItem("magpie.scratchNotes"); } catch (_) {}
      renderScratch();
      toast("便签已清空");
    });
    $("#note-copy")?.addEventListener("click", () => {
      const list = scratch();
      if (!list.length) { toast("便签为空"); return; }
      const md = `## 便签 ${new Date().toLocaleString("zh-CN", { hour12: false })}\n\n| 指标 | 值 | 时间 |\n| --- | --- | --- |\n` + list.map(n => `| ${n.label} | ${n.value} | ${n.at} |`).join("\n");
      navigator.clipboard?.writeText(md).then(() => toast(`便签已复制(${list.length} 条)`));
    });
    // Long-press / alt-click 复制 → JSON instead of Markdown (power users
    // get both; the regular click stays MD).
    $("#note-copy")?.addEventListener("contextmenu", e => {
      e.preventDefault();
      const list = scratch();
      if (!list.length) { toast("便签为空"); return; }
      navigator.clipboard?.writeText(JSON.stringify(list, null, 2)).then(() => toast(`便签 JSON 已复制(${list.length} 条)`));
    });
    card.addEventListener("click", e => {
      const rm = e.target.closest("[data-note-rm]");
      if (!rm) return;
      const list = scratch();
      list.splice(+rm.dataset.noteRm, 1);
      try { localStorage.setItem("magpie.scratchNotes", JSON.stringify(list)); } catch (_) {}
      renderScratch();
    });
    card.addEventListener("dblclick", e => {
      const chip = e.target.closest(".note-chip");
      const b = chip && chip.querySelector("b");
      if (!b || e.target.closest("[data-note-rm]")) return;
      b.contentEditable = "true"; b.focus();
      const sel = getSelection(); sel && sel.selectAllChildren(b);
      const done = () => {
        b.contentEditable = "false";
        const i = +chip.querySelector("[data-note-rm]").dataset.noteRm;
        const list = scratch();
        if (list[i]) { list[i].label = b.textContent.trim().slice(0, 40) || list[i].label; try { localStorage.setItem("magpie.scratchNotes", JSON.stringify(list)); } catch (_) {} }
        renderScratch();
      };
      b.addEventListener("blur", done, { once: true });
      b.addEventListener("keydown", ev => { if (ev.key === "Enter") { ev.preventDefault(); b.blur(); } }, { once: true });
    });
    // Drag a chip onto another → reorder (persisted via scratch()).
    let dragFrom = -1;
    host.addEventListener("dragstart", e => {
      const chip = e.target.closest(".note-chip");
      if (chip) { dragFrom = +chip.dataset.noteI; e.dataTransfer.effectAllowed = "move"; }
    });
    host.addEventListener("dragover", e => { if (dragFrom >= 0) { e.preventDefault(); e.dataTransfer.dropEffect = "move"; } });
    host.addEventListener("drop", e => {
      const chip = e.target.closest(".note-chip");
      if (!chip || dragFrom < 0) return;
      e.preventDefault();
      const to = +chip.dataset.noteI;
      if (to === dragFrom) { dragFrom = -1; return; }
      const list = scratch();
      const [moved] = list.splice(dragFrom, 1);
      list.splice(to, 0, moved);
      dragFrom = -1;
      try { localStorage.setItem("magpie.scratchNotes", JSON.stringify(list)); } catch (_) {}
      renderScratch();
    });
    renderScratch();
  }

  /* ========================================================= extras ======= */
  function applyExtra(name) {
    const s = state();
    if (!s) return;
    if (name === "layout-edit") {
      s.layoutEdit = !s.layoutEdit;
      setLayoutEdit(s.layoutEdit);
      try { localStorage.setItem("magpie.layoutEdit", s.layoutEdit ? "1" : "0"); } catch (_) {}
    } else if (name === "notify") {
      s.notify = !s.notify;
      if (s.notify && "Notification" in window && Notification.permission === "default") {
        Notification.requestPermission().then(p => { if (p !== "granted") { s.notify = false; syncExtrasMenu(); toast("通知权限未开启"); } });
      }
      try { localStorage.setItem("magpie.notify", s.notify ? "1" : "0"); } catch (_) {}
      toast("通知：" + (s.notify ? "开" : "关"));
    } else if (name === "sound") {
      s.sound = !s.sound;
      try { localStorage.setItem("magpie.sound", s.sound ? "1" : "0"); } catch (_) {}
      toast("声音：" + (s.sound ? "开" : "关"));
    }
    syncExtrasMenu();
  }
  function syncExtrasMenu() {
    $$("#extras-seg button").forEach(b => {
      const k = b.dataset.extra;
      const on = k === "layout-edit" ? state() && state().layoutEdit : k === "notify" ? state() && state().notify : state() && state().sound;
      b.classList.toggle("active", !!on);
    });
    const gwc = $("#gw-current");
    if (gwc) gwc.textContent = localStorage.getItem("magpie.gw") || "自动";
    // The settings 体验 segment delegates through app.js's click handler
    // which only matches layout/density/motion/tour — bind extras ourselves.
    $("#extras-seg") && $("#extras-seg").addEventListener("click", e => {
      const b = e.target.closest("button[data-extra]");
      if (b) { applyExtra(b.dataset.extra); syncExtrasMenu(); }
    });
    const gwi = $("#gw-input");
    if (gwi && !gwi.value) gwi.value = localStorage.getItem("magpie.gw") || "";
    const nr = $("#notify-rules");
    if (nr) nr.hidden = !(state() && state().notify);
    const rq = $("#rule-quota"), re = $("#rule-err"), rc = $("#rule-cost");
    if (rq && re && rc) {
      const r = alertRules();
      rq.value = r.quota; re.value = r.err; rc.value = r.cost;
      $("#rule-quota-v").textContent = r.quota + "%";
      $("#rule-err-v").textContent = r.err + " 条";
      $("#rule-cost-v").textContent = "$" + r.cost;
    }
  }

  /* =========================================================== hooks ======= */
  Obs.hooks.afterRender.push(() => {
    renderAttention();
    updateCinemaStats();
    renderXp();
    checkAchievements();
    checkAlerts();
    pushReplay();
  });
  Obs.hooks.afterTick.push((api, completed) => {
    if (completed) beep("ok");
    const s = state();
    if (!s) return;
    const firstErr = (s.data.logs || []).find(l => l.status === "err");
    if (firstErr && firstErr.id !== s._lastErrId) {
      s._lastErrId = firstErr.id;
      beep("err");
    }
  });
  Obs.hooks.bind.push(() => {
    $("#replay-toggle").addEventListener("click", () => { state() && state().replay ? exitReplay() : startReplay(); });
    $("#replay-x").addEventListener("click", () => exitReplay());
    $("#replay-range").addEventListener("input", e => scrubReplay(+e.target.value));
    $("#replay-play").addEventListener("click", toggleReplayPlay);
    $("#replay-share").addEventListener("click", shareReplayLink);
    $("#replay-speed")?.addEventListener("click", cycleReplaySpeed);
    // «/» step the scrubber by 10 frames.
    $("#replay-back10")?.addEventListener("click", () => { const r = $("#replay-range"); if (r && state()?.replay) { r.value = Math.max(0, +r.value - 10); scrubReplay(+r.value); } });
    $("#replay-fwd10")?.addEventListener("click", () => { const r = $("#replay-range"); if (r && state()?.replay) { r.value = Math.min(state().replayBuf.length - 1, +r.value + 10); scrubReplay(+r.value); } });
    // Hover the scrubber → native tooltip previews the frame under the cursor
    // (tps + tokens of that snapshot, no re-render).
    const rr = $("#replay-range");
    if (rr) {
      const stripEl = $("#replay-marks");
      let cur = stripEl && stripEl.querySelector(".rep-cursor");
      if (stripEl && !cur) {
        cur = document.createElement("i");
        cur.className = "rep-cursor";
        cur.style.cssText = "position:absolute;top:0;width:1px;height:100%;background:var(--fg-2);opacity:0;pointer-events:none;z-index:3";
        stripEl.appendChild(cur);
      }
      rr.addEventListener("mousemove", e => {
        const s2 = state();
        if (!s2 || !s2.replay || !s2.replayBuf.length) return;
        const frac = (e.clientX - rr.getBoundingClientRect().left) / rr.getBoundingClientRect().width;
        const i = Math.min(s2.replayBuf.length - 1, Math.max(0, Math.round(frac * (s2.replayBuf.length - 1))));
        const f = s2.replayBuf[i] && s2.replayBuf[i].data;
        if (f && f.kpis) rr.title = `#${i} · ${fmtTokens(f.kpis.tokens || 0)} tok · ${f.kpis.tps != null ? f.kpis.tps.toFixed(1) : "—"} tok/s · ${f.kpis.errors || 0} 错误`;
        if (cur) { cur.style.left = (frac * 100).toFixed(1) + "%"; cur.style.opacity = ".8"; }
      });
      rr.addEventListener("mouseleave", () => { if (cur) cur.style.opacity = "0"; });
    }
    // Right-click the speed chip → toggle auto-loop replay.
    $("#replay-speed")?.addEventListener("contextmenu", e => {
      e.preventDefault();
      state().replayLoop = !state().replayLoop;
      e.target.title = `回放速度 · 循环${state().replayLoop ? "开" : "关"}`;
      toast("回放循环：" + (state().replayLoop ? "开" : "关"));
    });
    // Home/End jump to first/last frame while replaying.
    document.addEventListener("keydown", e => {
      if (!state()?.replay || e.metaKey || e.ctrlKey) return;
      if (document.activeElement && /INPUT|TEXTAREA/.test(document.activeElement.tagName)) return;
      const r = $("#replay-range");
      if (e.key === "Home") { e.preventDefault(); if (r) { r.value = 0; scrubReplay(0); } }
      if (e.key === "End") { e.preventDefault(); if (r) { r.value = state().replayBuf.length - 1; scrubReplay(+r.value); } }
      // C → open the A-B frame comparison while replaying (needs a set loop).
      if (e.key === "c" || e.key === "C") { e.preventDefault(); compareReplayFrames(); }
      // Shift+←→ scrubs 10 frames; Shift+A/B nudges a set endpoint ±1.
      if (e.shiftKey && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
        e.preventDefault();
        const st = state();
        const nx = Math.min(st.replayBuf.length - 1, Math.max(0, +(r?.value || 0) + (e.key === "ArrowRight" ? 10 : -10)));
        if (r) { r.value = nx; scrubReplay(nx); }
      }
      if (e.shiftKey && (e.key === "A" || e.key === "B")) {
        const st = state();
        if (st.replayAB) {
          const i = e.key === "A" ? 0 : 1;
          st.replayAB[i] = Math.min(st.replayBuf.length - 1, Math.max(0, st.replayAB[i] + (e.key === "A" ? -1 : 1)));
          try { localStorage.setItem("magpie.replayAB", JSON.stringify(st.replayAB)); } catch (_) {}
          toast(`A-B 循环 ${st.replayAB[0]}→${st.replayAB[1]}`);
        }
      }
      if (!e.shiftKey && (e.key === "a" || e.key === "A" || e.key === "b" || e.key === "B")) {
        const st = state();
        const idx = +($("#replay-range")?.value || 0);
        const cur = st.replayAB || [null, null];
        if (e.key === "a" || e.key === "A") st.replayAB = [idx, cur[1] != null && cur[1] > idx ? cur[1] : null];
        else st.replayAB = [cur[0] != null && cur[0] < idx ? cur[0] : null, idx];
        if (st.replayAB[0] == null || st.replayAB[1] == null) st.replayAB = null;
        const stripEl = $("#replay-marks");
        if (stripEl) { stripEl.querySelectorAll(".rep-ab").forEach(x => x.remove()); if (st.replayAB) { const mx = Math.max(1, st.replayBuf.length - 1), l = st.replayAB[0] / mx * 100, w = (st.replayAB[1] - st.replayAB[0]) / mx * 100; stripEl.insertAdjacentHTML("beforeend", `<i class="rep-ab" style="position:absolute;left:${l.toFixed(1)}%;width:${w.toFixed(1)}%;top:0;height:100%;background:color-mix(in srgb,var(--amber) 20%,transparent);pointer-events:none" title="A-B循环 ${st.replayAB[0]}→${st.replayAB[1]}"></i>`); } }
        toast(st.replayAB ? `A-B 循环 ${st.replayAB[0]}→${st.replayAB[1]}` : "A-B 循环已取消");
        try { localStorage.setItem("magpie.replayAB", JSON.stringify(st.replayAB)); } catch (_) {}
      }
      // D → diff mode: a floating strip showing current-frame KPIs vs frame 0
      // while scrubbing, so drift over the replay is visible without AB.
      if (e.key === "d" || e.key === "D") {
        e.preventDefault();
        const st = state();
        st._replayDiff = !st._replayDiff;
        let dEl = $("#rep-diff");
        if (st._replayDiff) {
          if (!dEl) {
            dEl = document.createElement("div");
            dEl.id = "rep-diff";
            dEl.style.cssText = "position:absolute;right:12px;top:-26px;font:9px var(--num);color:var(--muted);background:var(--card);border:1px solid var(--line);border-radius:6px;padding:3px 8px;pointer-events:none;z-index:5";
            $("#replay-bar")?.appendChild(dEl);
          }
          const base = st.replayBuf[0] && st.replayBuf[0].data.kpis;
          const cur = st.replayBuf[+($("#replay-range")?.value || 0)]?.data.kpis;
          if (base && cur) dEl.textContent = `Δ vs 首帧 · tok ${((cur.tokens - base.tokens) >= 0 ? "+" : "")}${fmtTokens(cur.tokens - base.tokens)} · err ${(cur.errors || 0) - (base.errors || 0)}`;
        } else if (dEl) dEl.remove();
        toast(st._replayDiff ? "diff 模式开 · D 关" : "diff 模式关");
      }
      // ? → pop a KPI card for the current frame.
      if (e.key === "?") {
        e.preventDefault();
        const st = state();
        const idx = +(r?.value || 0);
        const f = st.replayBuf[idx];
        if (f) {
          $(".frame-pop")?.remove();
          const pop = document.createElement("div");
          pop.className = "gwcmp-card frame-pop";
          const k = f.data.kpis || {};
          pop.innerHTML = `<div class="digest-head"><b>帧 ${idx}</b><span>回放中 · ${new Date(f.t).toTimeString().slice(0, 8)}<button type="button" class="mini-btn pop-x" style="font-size:8px;margin-left:6px;padding:0 4px" title="关闭">✕</button></span></div><div class="cmp-r"><span>TOK</span><b>${fmtTokens(k.tokens)}</b><em></em><b>${k.tps != null ? k.tps.toFixed(1) : "—"}/s</b></div><div class="cmp-r"><span>调用</span><b>${k.calls || 0}</b><em></em><b style="${(k.errors || 0) > 0 ? "color:var(--red)" : ""}">${k.errors || 0} 错</b></div><div class="cmp-r"><span>会话</span><b>${(f.data.sessions || []).length}</b><em></em><b>${fmtMoney(k.cost)}</b></div>`;
          const pk = idx > 0 && st.replayBuf[idx - 1] ? st.replayBuf[idx - 1].data.kpis : null;
          if (pk) { const dt = (k.tokens || 0) - (pk.tokens || 0), de = (k.errors || 0) - (pk.errors || 0); pop.innerHTML += `<div class="cmp-r"><span>对prevΔ</span><b>${dt >= 0 ? "+" : ""}${fmtTokens(dt)}</b><em class="${de > 0 ? "down" : "up"}">${de !== 0 ? "err " + (de > 0 ? "+" : "") + de : ""}</em><b></b></div>`; }
          const dayK = (st.data.heatmap || []).find(d => d.date === new Date(f.t).toISOString().slice(0, 10));
          if (dayK && dayK.tokens && k.tokens) { const pct = Math.round(k.tokens / Math.max(1, dayK.tokens) * 100); pop.innerHTML += `<div class="cmp-r"><span>占日</span><b>${pct}%</b><em></em><b>当日 ${fmtTokens(dayK.tokens)}</b></div>`; }
          pop.innerHTML += ((f.data.sessions || []).slice(0, 3).map(sx => `<div class="cmp-r" data-sid="${esc(sx.id || "")}" style="cursor:pointer" title="点击选此会话"><span><img src="${Obs.api.agentIcon(sx.agent)}" style="width:9px;height:9px;border-radius:50%;vertical-align:middle;margin-right:3px">${esc((sx.title || "?").slice(0, 14))}</span><b>${fmtTokens(sx.tokens || 0)}</b><em></em><b>${esc(sx.agent || "")}</b></div>`).join("") + ((f.data.sessions || []).length > 3 ? `<small style="opacity:.55">+${(f.data.sessions || []).length - 3} 会话</small>` : ""));
          const agC = {}; (f.data.sessions || []).forEach(sx => agC[sx.agent] = (agC[sx.agent] || 0) + 1);
          const topAg = Object.entries(agC).sort((a, b) => b[1] - a[1])[0];
          if (topAg) pop.innerHTML += `<div class="cmp-r"><span>主导</span><b>${esc(topAg[0])}</b><em></em><b>${topAg[1]} 会话</b></div>`;
          pop.innerHTML += `<div style="margin-top:6px"><button type="button" class="mini-btn snap-save" style="font-size:8.5px">存为记录</button><button type="button" class="mini-btn snap-dl" style="font-size:8.5px;margin-left:4px">导出</button><button type="button" class="mini-btn snap-copy" style="font-size:8.5px;margin-left:4px">复制</button><button type="button" class="mini-btn snap-pin" style="font-size:8.5px;margin-left:4px">钉住</button></div>`;
          pop.innerHTML += `<div style="display:flex;gap:6px;margin-top:4px;font-size:8px">${idx > 0 ? `<button type="button" class="mini-btn fr-prev" style="font-size:8px">← 帧${idx - 1}</button>` : ""}${idx < st.replayBuf.length - 1 ? `<button type="button" class="mini-btn fr-next" style="font-size:8px">帧${idx + 1} →</button>` : ""}</div>`;
          pop.innerHTML += `<div style="margin-top:6px"><button type="button" class="mini-btn snap-save" style="font-size:8.5px">存为记录</button><button type="button" class="mini-btn snap-dl" style="font-size:8.5px;margin-left:4px">导出</button><button type="button" class="mini-btn snap-copy" style="font-size:8.5px;margin-left:4px">复制</button></div>`;
          // Pin the pop just above the replay bar instead of the page centre.
          const barEl = $("#replay-bar");
          if (barEl) { const bb = barEl.getBoundingClientRect(); pop.style.top = "auto"; pop.style.left = bb.left + bb.width / 2 + "px"; pop.style.bottom = (innerHeight - bb.top + 8) + "px"; }
          pop.addEventListener("click", e => {
            if (e.target.closest(".snap-save")) {
              try { const snaps = JSON.parse(localStorage.getItem("magpie.frameSnaps") || "[]"); snaps.push({ idx, t: f.t, k }); localStorage.setItem("magpie.frameSnaps", JSON.stringify(snaps.slice(-20))); toast(`帧 ${idx} 已存 (${snaps.length})`); } catch (_) {}
              return;
            }
            if (e.target.closest(".pop-x")) { pop.remove(); return; }

            if (e.target.closest(".snap-dl")) {
              const blob = new Blob([JSON.stringify({ idx, t: f.t, k, sessions: (f.data.sessions || []).length }, null, 2)], { type: "application/json" });
              const a2 = document.createElement("a"); a2.href = URL.createObjectURL(blob); a2.download = `magpie-frame-${idx}.json`; a2.click(); setTimeout(() => URL.revokeObjectURL(a2.href), 2000);
              return;
            }
            if (e.target.closest(".snap-copy")) { navigator.clipboard?.writeText(`帧${idx} TOK=${fmtTokens(k.tokens)} tps=${k.tps != null ? k.tps.toFixed(1) : "—"} 调用=${k.calls || 0} 错=${k.errors || 0} 会话=${(f.data.sessions || []).length} 成本=${fmtMoney(k.cost)}`).then(() => toast("帧已复制")); return; }
            const sRow = e.target.closest("[data-sid]");
            if (sRow && sRow.dataset.sid) { const sel = document.querySelector(`.qp-item[data-ri="${sRow.dataset.sid}"]`); if (sel) sel.click(); pop.remove(); return; }
            if (e.target.closest(".fr-prev, .fr-next")) { const nx = e.target.closest(".fr-prev") ? idx - 1 : idx + 1; pop.remove(); const r = $("#replay-range"); if (r) { r.value = nx; scrubReplay(nx); } setTimeout(() => { const ev = new KeyboardEvent("keydown", { key: "?" }); document.dispatchEvent(ev); }, 30); return; }
            if (e.target.closest(".snap-pin")) { pop.classList.add("pinned"); e.target.textContent = "已钉"; toast("帧卡已钉住 · 再按?不关"); return; }
            if (!pop.classList.contains("pinned")) pop.remove();
          });
          document.body.appendChild(pop);
          setTimeout(() => pop.classList.add("in"), 10);
        }
      }
      // X → clear the A-B loop without leaving replay.
      if (e.key === "x" || e.key === "X") {
        const st = state();
        if (st.replayAB) {
          st.replayAB = null;
          try { localStorage.setItem("magpie.replayAB", "null"); } catch (_) {}
          $("#replay-marks")?.querySelectorAll(".rep-ab").forEach(x => x.remove());
          toast("A-B 循环已清");
        }
      }

    });
    ["rule-quota", "rule-err", "rule-cost"].forEach(id => {
      const el = $("#" + id);
      if (el) el.addEventListener("input", () => {
        const r = alertRules();
        if (id === "rule-quota") r.quota = +el.value;
        else if (id === "rule-err") r.err = +el.value;
        else r.cost = +el.value;
        try { localStorage.setItem("magpie.rules", JSON.stringify(r)); } catch (_) {}
        $("#rule-quota-v").textContent = r.quota + "%";
        $("#rule-err-v").textContent = r.err + " 条";
        $("#rule-cost-v").textContent = "$" + r.cost;
      });
    });
    $("#cinema-toggle").addEventListener("click", toggleCinema);
    const vmCinema = $("#vm-cinema"), vmAmbient = $("#vm-ambient");
    if (vmCinema) vmCinema.addEventListener("click", () => { setCinema(true); if (Obs.api.closeViewMenu) Obs.api.closeViewMenu(); });
    if (vmAmbient) vmAmbient.addEventListener("click", () => { setAmbient(true); if (Obs.api.closeViewMenu) Obs.api.closeViewMenu(); });
    $("#export-png") && $("#export-png").addEventListener("click", exportPNG);
    $("#cmd-open").addEventListener("click", openPalette);
    $("#xp-chip").addEventListener("click", showRecords);
    $("#gw-save").addEventListener("click", async () => {
      const v = $("#gw-input").value.trim();
      if (v) { localStorage.setItem("magpie.gw", v); toast("锁定网关 " + v + " · 正在连接"); }
      else { localStorage.removeItem("magpie.gw"); toast("已切回自动探测"); }
      state().liveTries = 0;
      clearInterval(state().liveTimer);
      Obs.api.connectLive();
      syncExtrasMenu();
    });
    $("#gw-clear").addEventListener("click", () => { $("#gw-input").value = ""; $("#gw-save").click(); });
    ["mousedown", "mousemove", "keydown", "wheel", "touchstart"].forEach(ev =>
      document.addEventListener(ev, resetIdle, { passive: true })
    );
    resetIdle();
    document.addEventListener("keydown", e => {
      if (e.target instanceof Element && e.target.matches("input, textarea, select, [contenteditable]")) return;
      if (e.key === "Escape" && state() && state().cinema) {
        if (state().ambient) setAmbient(false); else setCinema(false);
      }
      if (e.key.toLowerCase() === "o" && !e.metaKey && !e.ctrlKey && !e.altKey) { e.preventDefault(); toggleCinema(); }
      if (e.key.toLowerCase() === "a" && !e.metaKey && !e.ctrlKey && !e.altKey) { e.preventDefault(); toggleAmbient(); }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); openPalette(); }
      if (e.key.toLowerCase() === "e" && !e.metaKey && !e.ctrlKey && !e.altKey) { e.preventDefault(); exportPNG(); }
      if (e.key.toLowerCase() === "s" && (e.metaKey || e.ctrlKey) && !e.altKey) { e.preventDefault(); shareStateLink(); }

      // Esc while a palette item has focus but the input doesn't: close.
      if (e.key === "Escape") { const pal = $("#cmd-palette"); if (pal && !pal.hidden) closePalette(); }
    });
    document.addEventListener("click", e => {
      const pal = $("#cmd-palette");
      if (pal && !pal.hidden && !e.target.closest("#cmd-palette") && !e.target.closest("#cmd-open")) closePalette();
    });
    // Keep Tab cycling inside the palette while it's open.
    document.addEventListener("keydown", e => {
      if (e.key !== "Tab") return;
      const pal = $("#cmd-palette");
      if (!pal || pal.hidden) return;
      const items = $$("#cmd-palette button, #cmd-palette input").filter(el => el.offsetParent !== null);
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  });
  Obs.hooks.init.push(() => {
    // persisted flags
    ["notify", "sound", "layoutEdit"].forEach(k => {
      try { if (localStorage.getItem("magpie." + k) === "1") state()[k] = true; } catch (_) {}
    });
    state().replay = null; state().replayBuf = [];
    state().cinema = false;
    state().attract = false; state().ambient = false; state()._prevSessions = new Set();
    loadLayout();
    bindLayoutEdit();
    bindScratch();
    bindHeatPop();
    bindHeatMonth();
    bindHeatDay();
    bindAttnGoto();
    bindQuotaGoto();
    bindSessionKb();
    if (state().layoutEdit) setLayoutEdit(true);
    syncExtrasMenu();
    applyUrlState();
    loadReplayHash();
    setTimeout(maybeShowDigest, 1600);
    try { startParticles(); } catch (e) { console.log("[watch] particles threw:", e.message); }
    try { startSessionWatch(); } catch (e) { console.log("[watch] watch threw:", e.message); }
    // PWA: register the shell-cache service worker (Phase 2 deliverable,
    // re-added after the refactor — registration was lost in the rollback).
    if ("serviceWorker" in navigator && location.protocol !== "file:") {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    }
    // ?mode=mini — the 320×180 picture-in-picture layout promised in Phase 2:
    // cinema fullscreen + a shrunken HUD (title + TPS), no chrome.
    if (new URLSearchParams(location.search).get("mode") === "mini") {
      document.body.classList.add("mini");
      setCinema(true);
      const v = new URLSearchParams(location.search).get("view");
      if (v && Obs.api.viewMeta(v)) Obs.api.setHeroMode(v);
    }
  });


  /* ====================================================== session notes === */
  // A "✎" corner chip on every session card; click opens a floating
  // textarea, blur/Ctrl+Enter saves to localStorage keyed by session id.
  // Re-renders keep the note on the card via the has-note class.
  const NOTES_KEY = "magpie.sessionNotes";
  const notes = () => { try { return JSON.parse(localStorage.getItem(NOTES_KEY) || "{}"); } catch (_) { return {}; } };
  const setNote = (id, txt) => {
    const n = notes();
    if (txt && txt.trim()) n[id] = txt.trim().slice(0, 200); else delete n[id];
    try { localStorage.setItem(NOTES_KEY, JSON.stringify(n)); } catch (_) {}
    syncNoteBadges();
  };
  function syncNoteBadges() {
    const n = notes();
    $$(".session-card").forEach(c => {
      const has = !!(n[c.dataset.session] || "").trim();
      c.classList.toggle("has-note", has);
      let chip = c.querySelector(".sess-note");
      if (has && !chip) {
        chip = document.createElement("i");
        chip.className = "sess-note"; chip.textContent = "✎";
        chip.title = "有笔记 — 点击编辑";
        c.appendChild(chip);
      }
      if (chip) chip.hidden = !has;
    });
  }
  // GC: sessions are ephemeral (demo ids rotate) — drop notes whose session
  // is neither live nor in `recent`.
  function gcNotes() {
    const n = notes();
    const alive = new Set();
    ((state() && state().data.sessions) || []).forEach(s => alive.add(s.id));
    ((state() && state().data.recent) || []).forEach(s => alive.add(s.id));
    let dirty = false;
    Object.keys(n).forEach(id => { if (!alive.has(id)) { delete n[id]; dirty = true; } });
    if (dirty) try { localStorage.setItem(NOTES_KEY, JSON.stringify(n)); } catch (_) {}
  }
  Obs.hooks.init.push(() => setTimeout(gcNotes, 3000));
  let notePop = null, noteTarget = null;
  function openNote(card) {
    closeNote();
    noteTarget = card.dataset.session;
    const s = (state().data.sessions || []).concat(state().data.recent || []).find(x => x.id === noteTarget);
    notePop = document.createElement("div");
    notePop.className = "session-pop note-pop";
    const cur = (notes()[noteTarget] || "");
    notePop.innerHTML = `
      <div class="pop-head"><b>${esc(s ? s.title : noteTarget)}</b><span>笔记</span></div>
      <textarea class="note-ta" rows="3" maxlength="200" placeholder="这个会话在做什么… (Ctrl+Enter 保存)">${esc(cur)}</textarea>
      <div class="pop-meta"><span class="note-hint">Enter 换行 · Ctrl+Enter/Esc 关闭</span><span class="note-count">${cur.length}/200</span></div>`;
    document.body.appendChild(notePop);
    const r = card.getBoundingClientRect();
    notePop.style.left = Math.max(8, Math.min(window.innerWidth - 280 - 8, r.left)) + "px";
    notePop.style.top = (r.bottom + 6 + 170 > window.innerHeight ? r.top - 170 - 6 : r.bottom + 6) + "px";
    const ta = notePop.querySelector(".note-ta");
    const cnt = notePop.querySelector(".note-count");
    ta.addEventListener("input", () => { cnt.textContent = ta.value.length + "/200"; });
    ta.addEventListener("keydown", e => {
      if (e.key === "Escape") { e.stopPropagation(); closeNote(true); }
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); closeNote(true); }
      e.stopPropagation();
    });
    ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length);
  }
  function closeNote(save) {
    if (!notePop) return;
    if (save !== false) setNote(noteTarget, notePop.querySelector(".note-ta").value);
    notePop.remove(); notePop = null; noteTarget = null;
  }
  Obs.hooks.afterRender.push(syncNoteBadges);
  Obs.hooks.bind.push(() => {
    $("#session-list").addEventListener("click", e => {
      const chip = e.target.closest(".sess-note");
      if (chip) { e.stopPropagation(); openNote(chip.closest(".session-card")); return; }
      const card = e.target.closest(".session-card");
      if (card && noteTarget === card.dataset.session) { /* keep open */ }
    });
    document.addEventListener("click", e => {
      if (notePop && !e.target.closest(".note-pop") && !e.target.closest(".sess-note")) closeNote();
    });
    document.addEventListener("keydown", e => {
      if (e.key !== "n" && e.key !== "N") return;
      if (e.target instanceof Element && e.target.matches("input, textarea, select, [contenteditable]")) return;
      const card = document.querySelector(".session-card.kb-focus") || document.querySelector(".session-card:hover");
      if (card) { e.preventDefault(); openNote(card); }
    });
  });


  /* ====================================================== ambient particles ====== */
  // A quiet canvas of drifting motes behind the whole dashboard; its density
  // tracks live session count, its hue follows --accent, and it pauses when
  // the tab is hidden or motion is off.
  function startParticles() {
    if (document.documentElement.dataset.motion === "off") return;
    const cv = document.createElement("canvas");
    cv.id = "ambient-particles"; cv.setAttribute("aria-hidden", "true");
    document.body.prepend(cv);
    const ctx = cv.getContext("2d");
    let W = 0, H = 0, parts = [], raf = null;
    function resize() {
      W = cv.width = innerWidth; H = cv.height = innerHeight;
      const target = Math.round(Math.min(160, Math.max(18, (state()?.data.sessions.length || 4) * 12 + innerWidth / 60)));
      while (parts.length < target) parts.push(spawn());
      parts.length = target;
    }
    function spawn() {
      return {
        x: Math.random() * W, y: Math.random() * H,
        r: 0.4 + Math.random() * 1.6,
        vx: (Math.random() - 0.5) * 0.12, vy: -(0.03 + Math.random() * 0.1),
        a: 0.06 + Math.random() * 0.22, p: Math.random() * Math.PI * 2
      };
    }
    function tint() {
      return getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#8b7cf6";
    }
    let col = tint();
    setInterval(() => { col = tint(); }, 3000);
    function frame() {
      if (document.hidden) { raf = null; return; }
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = col;
      const drift = performance.now() / 1200;
      for (const p of parts) {
        p.x += p.vx + Math.sin(drift + p.p) * 0.04;
        p.y += p.vy;
        if (p.y < -4) { p.y = H + 4; p.x = Math.random() * W; }
        if (p.x < -4) p.x = W + 4; else if (p.x > W + 4) p.x = -4;
        ctx.globalAlpha = p.a * (0.6 + 0.4 * Math.sin(drift * 1.4 + p.p));
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(frame);
    }
    addEventListener("resize", resize, { passive: true });
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && !raf) raf = requestAnimationFrame(frame);
    });
    resize();
    raf = requestAnimationFrame(frame);
  }

  /* ========================================================= palette ======= */
  function copyViewSnapshot() {
    const s = state();
    if (!s) return;
    const meta = Obs.api.viewMeta ? Obs.api.viewMeta(s.heroMode) : {};
    const k = (s.view && s.view.kpis) || s.data.kpis || {};
    const quotas = (s.data.quotas || []).map(q => {
      const w = q.windows[0] || {};
      const m = Obs.api.providerMeta ? Obs.api.providerMeta(q.provider) : {};
      return `${m.name || q.provider} ${w.name || ""} ${Math.round(w.used || 0)}%`;
    }).join(" | ");
    const txt = `[Magpie Observatory] ${meta.title || s.heroMode} · ${s.range}
Tokens ${fmtTokens(k.tokens)} · Cost ${fmtMoney(k.cost)} · Sessions ${s.data.sessions.filter(x => x.status !== "done").length} active
Quotas: ${quotas}`;
    navigator.clipboard?.writeText(txt).then(() => toast("视图快照已复制"));
    closePalette();
  }

  function copyReceipt() {
    const s = state();
    if (!s) return;
    const k = (s.view && s.view.kpis) || s.data.kpis || {};
    const heat = s.data.heatmap || [];
    const today = heat[heat.length - 1];
    const quota = (s.data.quotas || []).map(q => {
      const w = q.windows && q.windows[0];
      const m = Obs.api.providerMeta ? Obs.api.providerMeta(q.provider) : {};
      return `| ${esc(m.name || q.provider)} | ${esc(w && w.name || q.name || "")} | ${Math.round((w && w.used) || 0)}% |`;
    }).join("\n");
    const agents = {};
    (s.data.sessions || []).forEach(x => agents[x.agent] = (agents[x.agent] || 0) + 1);
    const agentLine = Object.entries(agents).map(([a, n]) => `${a} ×${n}`).join(" · ");
    const date = today && today.date ? today.date : new Date().toISOString().slice(0, 10);
    const md = `# Magpie 今日票据 · ${date}
- 请求：${(k.requests || 0).toLocaleString()} 次
- Tokens：${fmtTokens(k.tokens)}（环比 ${k.tokensDelta >= 0 ? "+" : ""}${k.tokensDelta || 0}%）
- 费用：${fmtMoney(k.cost)}
- TPS：${k.tps != null ? k.tps.toFixed(1) : "—"}
- 活跃会话：${k.active || 0}（${agentLine || "—"}）
- 缓存命中：${k.cache != null ? k.cache.toFixed(1) : "—"}%

| Provider | 窗口 | 已用 |
| --- | --- | --- |
${quota || "| — | — | — |"}

生成于 Magpie Observatory · ${new Date().toTimeString().slice(0, 5)}`;
    navigator.clipboard?.writeText(md).then(() => toast("今日票据已复制"));
    closePalette();
  }

   /* ========================================================= palette ======= */

  function openPalette() {
    const pal = $("#cmd-palette");
    if (!pal) return;
    pal.hidden = false;
    const inp0 = $("#palette-input");
    const lastQ = localStorage.getItem("magpie.palQ") || "";
    inp0.value = lastQ;
    renderPalette(lastQ);
    if (lastQ) inp0.select();
    setTimeout(() => $("#palette-input").focus(), 30);
  }
  function closePalette() {
    const pal = $("#cmd-palette");
    if (pal) pal.hidden = true;
  }
  function paletteItems() {
    const items = [];
    const meta = Obs.api.viewMeta || (() => null);
    const s = state();
    // Per-view open counts; the most-used views float to the top of the
    // 视图 section so the palette learns your habits.
    const heat = (() => { try { return JSON.parse(localStorage.getItem("magpie.viewHeat") || "{}"); } catch (_) { return {}; } })();
    // views
    if (window.ObservatoryViews) {
      Object.keys(window.ObservatoryViews).sort((a, b) => (heat[b] || 0) - (heat[a] || 0)).forEach(id => {
        const v = window.ObservatoryViews[id];
        const hot = heat[id] ? " · 常用" : "";
        items.push({ kind: "视图", icon: "i-route", title: v.title || id, sub: (v.eyebrow || "") + hot, vid: id, search: (v.title + " " + (v.eyebrow || "") + " " + id).toLowerCase(), run: () => { Obs.api.setHeroMode(id); closePalette(); } });
      });
    }
    // core views from the meta catalog
    if (s && s.VIEW_META) s.VIEW_META.forEach(v => {
      items.push({ kind: "视图", icon: v.icon, title: v.title, sub: v.eyebrow, vid: v.id, search: (v.title + " " + v.eyebrow + " " + v.id + " " + (v.group || "") + " " + (v.hint || "")).toLowerCase(), run: () => { Obs.api.setHeroMode(v.id); closePalette(); } });
    });
    // The currently active hero view floats to the top of the 视图 group.
    if (s && s.heroMode) {
      const cur = items.findIndex(x => x.vid === s.heroMode);
      if (cur > 0) items.unshift(items.splice(cur, 1)[0]);
    }
    // actions
    items.push(
      { kind: "动作", icon: "i-expand", title: "影院模式", sub: "O · 全屏只看这一个视图", search: "cinema 影院 全屏".toLowerCase(), run: toggleCinema },
      { kind: "动作", icon: "i-pause", title: s && s.paused ? "继续演示" : "暂停演示", sub: "快捷键 Space", search: "pause 暂停 播放".toLowerCase(), run: () => $("#demo-toggle").click() },
      { kind: "动作", icon: "i-clock", title: "回放最近3分钟", sub: "快捷键 R", search: "replay 回放 时间轴".toLowerCase(), run: () => { state() && state().replay ? exitReplay() : startReplay(); } },
      { kind: "动作", icon: "i-clock", title: "回放速度", sub: `${s && s.replaySpeed ? s.replaySpeed : 1}× · 点击循环 1→2→4`, search: "replay speed 速度 倍速".toLowerCase(), run: () => { cycleReplaySpeed(); closePalette(); } },
      { kind: "动作", icon: "i-clock", title: "回放循环", sub: `${s && s.replayLoop ? "已开" : "已关"} · 播完自动回头`, search: "replay loop 循环 重复".toLowerCase(), run: () => { if (s) { s.replayLoop = !s.replayLoop; const b = $("#replay-speed"); if (b) b.title = `回放速度 · 循环${s.replayLoop ? "开" : "关"}`; toast(`回放循环 ${s.replayLoop ? "开" : "关"}`); } closePalette(); } },
      { kind: "动作", icon: "i-stack", title: "回放帧对比", sub: "AB 区间两帧 KPI 差表", search: "replay compare 对比 ab 帧".toLowerCase(), run: compareReplayFrames },
      { kind: "动作", icon: "i-pin", title: "回放书签", sub: "列出 B 键标记帧 · 点击跳转", search: "replay bookmark 书签 标记 帧".toLowerCase(), run: showReplayMarks },
      { kind: "动作", icon: "i-pin", title: "帧快照", sub: "?键存下的帧 KPI 列表", search: "frame snap 快照 帧 记录".toLowerCase(), run: showFrameSnaps },
      { kind: "动作", icon: "i-link", title: "复制回放书签 JSON", sub: "B 键标记帧导出", search: "replay marks export 复制 书签 json".toLowerCase(), run: () => { let m = []; try { m = JSON.parse(localStorage.getItem("magpie.replayMarks") || "[]"); } catch (_) {} navigator.clipboard?.writeText(JSON.stringify(m, null, 2)).then(() => toast(m.length + " 个书签已复制")); closePalette(); } },
      { kind: "动作", icon: "i-link", title: "复制状态链接", sub: "?view&range&cinema 快照 URL · ⌘S", search: "share 分享 链接 状态 url".toLowerCase(), run: shareStateLink },
      { kind: "动作", icon: "i-pin", title: "设为默认视图", sub: "下次打开直达当前视图", search: "default 默认 视图 pin".toLowerCase(), run: () => { if (s && s.heroMode) { localStorage.setItem("magpie.defaultView", s.heroMode); toast("默认视图：" + (Obs.api.viewMeta(s.heroMode) || {}).title); closePalette(); } } },
      { kind: "动作", icon: "i-arrow", title: "导出今日分享图", sub: "1200×630 PNG", search: "share 分享 导出 截图".toLowerCase(), run: () => shareToday() },
      { kind: "动作", icon: "i-arrow", title: "导出本周分享图", sub: "1200×630 PNG · 近7天", search: "share 分享 导出 周 截图 week".toLowerCase(), run: () => shareToday("week") },
      { kind: "动作", icon: "i-arrow", title: "导出对比分享图", sub: "今日 vs 昨日 · 1200×630 PNG", search: "share 分享 对比 导出 compare".toLowerCase(), run: shareCompare },
      { kind: "动作", icon: "i-arrow", title: "导出月度分享图", sub: "近30天 · 1200×630 PNG", search: "share 分享 月度 导出 month".toLowerCase(), run: () => shareToday("month") },
      { kind: "动作", icon: "i-link", title: "导出回放播放器", sub: "独立 HTML · 帧内嵌 · 可拖条", search: "replay 回放 导出 html 播放器".toLowerCase(), run: exportReplayHtml },
      { kind: "动作", icon: "i-download", title: "导出回放 JSON", sub: "delta帧 .json 下载", search: "replay 回放 导出 json download".toLowerCase(), run: exportReplayJson },
      { kind: "动作", icon: "i-download", title: "导出AB区间", sub: "回放 A-B 帧存为 JSON", search: "export ab replay range 导出 区间".toLowerCase(), run: exportABRange },
      { kind: "动作", icon: "i-link", title: "复制页面链接", sub: "当前视图 / 区间 / 影院", search: "link 链接 复制 分享 url".toLowerCase(), run: copySnapshotLink },
      { kind: "动作", icon: "i-link", title: "复制回放链接", sub: "近3分钟快照打包进 URL", search: "link 回放 链接 replay share".toLowerCase(), run: shareReplayLink },
      { kind: "动作", icon: "i-doc", title: "历史摘要", sub: "最近 7 条 digest 回看", search: "digest 摘要 历史 回看 log".toLowerCase(), run: showDigestLog },
      { kind: "动作", icon: "i-db", title: "本周报告", sub: "7天柱状 + 峰值 + 最热路由", search: "weekly 周报 报告 本周".toLowerCase(), run: weeklyReport },
      { kind: "动作", icon: "i-overview", title: s && s.layoutEdit ? "退出排布模式" : "进入排布模式", sub: "拖拽重排卡片", search: "layout 排布 拖拽 布局".toLowerCase(), run: () => applyExtra("layout-edit") },
      { kind: "动作", icon: "i-server", title: "网关对比", sub: "默认 vs 锁定 · 并列四指标", search: "gateway 网关 对比 compare multi".toLowerCase(), run: compareGateways },
      { kind: "动作", icon: "i-trophy", title: "个人战绩", sub: "等级 / 连击 / 纪录", search: "records 战绩 等级 成就".toLowerCase(), run: showRecords },
      { kind: "动作", icon: "i-link", title: "复制视图快照", sub: "当前视图 + KPI + 配额摘要", search: "snapshot 快照 复制 copy".toLowerCase(), run: copyViewSnapshot },
      { kind: "动作", icon: "i-doc", title: "复制今日票据", sub: "markdown 摘要 · 日报/聊天直贴", search: "receipt 票据 摘要 markdown copy".toLowerCase(), run: copyReceipt },
      { kind: "动作", icon: "i-check", title: "恢复隐藏 KPI", sub: (() => { try { return JSON.parse(localStorage.getItem("magpie.kpiHidden") || "[]").length + " 已隐藏"; } catch (_) { return "0"; } })(), search: "kpi 隐藏 恢复 hidden restore".toLowerCase(), run: () => { localStorage.removeItem("magpie.kpiHidden"); Obs.api.renderAll && Obs.api.renderAll(); toast("KPI 已恢复"); closePalette(); } },
      { kind: "动作", icon: "i-stack", title: "对比视图", sub: "当前视图 + 次近视图并排", search: "compare 对比 并排 dual side".toLowerCase(), run: toggleCompare }
    );

  // Floating compare pane: renders a chosen registered view beside the hero.
  function toggleCompare() {
    const s = state();
    if (!s) return;
    let pane = $("#compare-pane");
    if (pane) { pane.remove(); toast("对比已关闭"); return; }
    const reg = window.ObservatoryViews || {};
    const ids = Object.keys(reg).filter(id => id !== s.heroMode);
    if (!ids.length) { toast("无可用对比视图"); return; }
    const other = (s.viewRecent || []).find(id => reg[id] && id !== s.heroMode) || ids[0];
    pane = document.createElement("div");
    pane.id = "compare-pane";
    pane.innerHTML = `<div class="cmp-head"><b>${esc(reg[other].title || other)}</b><small>${esc(reg[other].eyebrow || "")}</small><button type="button" id="cmp-x" aria-label="关闭">×</button></div><div class="cmp-body" id="cmp-body"></div>`;
    document.body.appendChild(pane);
    try { reg[other].render($("#cmp-body"), { data: s.data, view: s.view, kpis: (s.view && s.view.kpis) || s.data.kpis || {}, fmtTokens, fmtMoney, esc, clamp, providerMeta: Obs.api.providerMeta, providerIcon: Obs.api.providerIcon, agentMeta: Obs.api.agentMeta, agentIcon: Obs.api.agentIcon, motion: document.documentElement.dataset.motion || "full", game: window.Obs && window.Obs.game }); } catch (e) { $("#cmp-body").innerHTML = `<div class="empty-row">渲染失败：${esc(e.message)}</div>`; }
    pane.querySelector("#cmp-x").addEventListener("click", () => pane.remove());
    toast(`对比视图：${reg[other].title || other} · Esc/× 关闭`);
    closePalette();
  }
    // per-provider burn shortcuts — "看 Claude 烧速" jumps straight to the
    // window row.
    if (s && s.data.quotas) {
      s.data.quotas.forEach(q => {
        const meta = Obs.api.providerMeta ? Obs.api.providerMeta(q.provider) : {};
        items.push({
          kind: "跳转", icon: "i-flame", title: `看 ${meta.name || q.provider} 烧速`,
          sub: q.name || "", search: ("burn 烧速 " + (meta.name || "") + " " + q.provider + " " + (q.name || "")).toLowerCase(),
          run: () => { gotoBurnOrLogs({ dataset: { goto: "burn", prov: q.provider } }); closePalette(); }
        });
      });
    }
    // Re-run the last palette command (stored by title; actions only).
    try {
      const last = JSON.parse(localStorage.getItem("magpie.lastCmd") || "null");
      if (last && last.title) {
        const orig = items.find(x => x.title === last.title);
        if (orig && orig.kind === "动作") { const ago = last.at ? Math.round((Date.now() - last.at) / 60000) : -1; const rel = ago < 0 ? "上次执行" : ago < 1 ? "上次执行·刚刚" : ago < 60 ? `上次执行·${ago}分钟前` : `上次执行·${Math.round(ago / 60)}小时前`; items.unshift({ kind: "重跑", icon: "i-arrow", title: `重跑:${last.title}`, sub: rel, search: ("rerun 重跑 " + last.title).toLowerCase(), run: orig.run }); }
      }
    } catch (_) {}
    // Recent-command history block: the last 5 executed actions, under their
    // own 最近 section (re-run of the tail, not just the latest).
    try {
      const hist = JSON.parse(localStorage.getItem("magpie.cmdHist") || "[]");
      hist.slice(0, 5).forEach(t => {
        const orig = items.find(x => x.title === t && x.kind === "动作");
        if (orig) items.push({ kind: "最近", icon: "i-clock", title: t, sub: "最近执行", search: ("recent 最近 " + t).toLowerCase(), run: orig.run });
      });
    } catch (_) {}
    return items;
  }
  function renderPalette(q) {
    const list = $("#palette-list");
    if (!list) return;
    const query = (q || "").toLowerCase();
    const vOnly = query.startsWith("v:") || query.startsWith("view:");
    const mOnly = query.startsWith("m:") || query.startsWith("memo:");
    const sOnly = query.startsWith("s:") || query.startsWith("sess:");
    const gOnly = query.startsWith("g:") || query.startsWith("goto:");
    const aOnly = query.startsWith("a:") || query.startsWith("act:");
    const q2 = vOnly ? query.replace(/^v(iew)?:/, "") : mOnly ? query.replace(/^m(emo)?:/, "") : sOnly ? query.replace(/^s(ess)?:/, "") : gOnly ? query.replace(/^g(oto)?:/, "") : aOnly ? query.replace(/^a(ct)?:/, "") : query;
    const items = paletteItems().filter(it => (!q2 || it.search.includes(q2) || it.title.toLowerCase().includes(q2)) && (!vOnly || it.kind === "视图") && (!sOnly || it.kind === "会话") && (!gOnly || it.kind === "跳转") && (!aOnly || it.kind === "动作" || it.kind === "重跑"));
    if (mOnly) {
      items.length = 0;
      (scratch() || []).forEach(n => items.push({ kind: "便签", icon: "i-overview", title: n.label, sub: `${n.value} · ${n.at}`, search: (n.label + " " + n.value).toLowerCase(), run: () => { navigator.clipboard?.writeText(`${n.label}: ${n.value}`).then(() => toast("已复制便签")); closePalette(); } }));
      items.push({ kind: "便签", icon: "i-overview", title: "全部便签", sub: `${(scratch() || []).length} 条`, search: "all memo", run: () => { const el = $("#note-card"); if (el) { el.hidden = false; el.scrollIntoView({ behavior: "smooth", block: "center" }); } closePalette(); } });
    }
    if (mOnly && q2) { const keep = items.filter(it => it.search.includes(q2) || it.title.toLowerCase().includes(q2)); items.length = 0; items.push(...keep); }
    if (sOnly) {
      const ss = state();
      items.length = 0;
      if (ss) (ss.data.sessions || []).concat(ss.data.recent || []).forEach(x => {
        items.push({ kind: "会话", icon: "i-overview", img: Obs.api.agentIcon ? Obs.api.agentIcon(x.agent) : null, title: x.title || x.id, sub: `${x.agent || "?"} · ${fmtTokens(x.tokens || 0)} tok`, search: (x.title + " " + (x.agent || "") + " " + (x.model || "")).toLowerCase(), run: () => { ss.selectedSession = x.id; Obs.api.renderAll && Obs.api.renderAll(); closePalette(); } });
      });
      if (q2) { const keep = items.filter(it => it.search.includes(q2) || it.title.toLowerCase().includes(q2)); items.length = 0; items.push(...keep); }
    }
    // Group items by kind: a slim section label before each run of the same
    // kind (视图 / 跳转 / 动作 / 重跑). Keeps the long list scannable.
    let lastKind = "";
    list.innerHTML = items.map((it, i) => {
      const thumb = it.vid ? `<span class="pal-thumb" aria-hidden="true"><img src="shots/${it.vid}.png" alt="" loading="lazy" onerror="this.remove()"></span>` : "";
      const head = it.kind !== lastKind ? `<div class="pal-kind">${esc(it.kind)} <small style="opacity:.55;font-weight:400">${items.filter(x => x.kind === it.kind).length}</small></div>` : "";
      lastKind = it.kind;
      const hotDot = it.vid && ((() => { try { return (JSON.parse(localStorage.getItem("magpie.viewHeat") || "{}"))[it.vid] || 0; } catch (_) { return 0; } })() >= 3) ? `<i class="pal-hot" title="常用"></i>` : "";
      const numBadge = i < 9 ? `<i class="pal-num" title="⌘${i + 1} 直达">${i + 1}</i>` : "";
      const kindDot = `<i style="display:inline-block;width:4px;height:4px;border-radius:50%;margin-right:5px;vertical-align:middle;background:var(--kdot, var(--muted))"></i>`;
      const iconHtml = it.img ? `<img src="${it.img}" alt="" style="width:14px;height:14px;border-radius:50%;flex:none">` : `<svg><use href="#${it.icon}"/></svg>`;
      return head + `<button class="pal-item" data-idx="${i}" title="${it.vid ? "id: " + it.vid : ""}" style="--kdot:${{ "视图": "var(--accent)", "页面": "var(--green)", "会话": "var(--amber)", "动作": "var(--cyan, var(--accent-strong))", "重跑": "var(--red)" }[it.kind] || "var(--muted)"}">${kindDot}${iconHtml}<span><b>${esc(it.title)}</b><small>${esc(it.sub)}</small></span><em>${esc(it.kind)}</em>${thumb}${hotDot}${numBadge}</button>`;
    }).join("");
    if (!list.innerHTML.trim()) {
      list.innerHTML = `<div class="pal-kind">提示</div><div class="pal-empty" style="padding:10px 14px;font-size:9.5px;color:var(--muted)">没有匹配项 · 前缀 v:视图 g:跳转 s:会话 m:便签 a:动作 · ⌘1-9 直达 · → 预览 · 视图名/orrery · agent名/claude · 命令/导出/回放</div>`;
    } else {
      const n = list.querySelectorAll(".pal-item").length;
      if (n > 0 && n <= 3) list.insertAdjacentHTML("afterbegin", `<div class="pal-empty" style="padding:6px 14px 0;font-size:8.5px;color:var(--faint)">仅 ${n} 项 · 按 Enter 直达首个</div>`);
      list.querySelector(".pal-item")?.classList.add("kb-focus");
    }
    // Click a kind header to collapse/expand its group (persisted per kind).
    let collapsed = new Set();
    try { collapsed = new Set(JSON.parse(localStorage.getItem("magpie.palCollapse") || "[]")); } catch (_) {}
    $$(".pal-kind", list).forEach(h => {
      const kind = h.dataset.kind || h.textContent.trim().replace(/\s*\(?\d+\)?\s*$/, "");
      h.dataset.kind = kind;
      h.style.cursor = "pointer";
      h.title = "点击折叠/展开该组";
      let n = h.nextElementSibling;
      const initCollapsed = collapsed.has(kind);
      while (n && !n.classList.contains("pal-kind")) { n.style.display = initCollapsed ? "none" : ""; n = n.nextElementSibling; }
      h.style.opacity = initCollapsed ? ".45" : "";
      if (initCollapsed) { let c = 0, m = h.nextElementSibling; while (m && !m.classList.contains("pal-kind")) { c++; m = m.nextElementSibling; } h.textContent = kind + " (" + c + ")"; }
      h.addEventListener("click", () => {
        let n2 = h.nextElementSibling;
        const collapse = !(n2 && n2.style.display === "none");
        while (n2 && !n2.classList.contains("pal-kind")) { n2.style.display = collapse ? "none" : ""; n2 = n2.nextElementSibling; }
        h.style.opacity = collapse ? ".45" : "";
        h.textContent = kind + " (" + (function () { let c = 0, m = h.nextElementSibling; while (m && !m.classList.contains("pal-kind")) { c++; m = m.nextElementSibling; } return c; })() + ")";
        if (collapse) collapsed.add(kind); else collapsed.delete(kind);
        try { localStorage.setItem("magpie.palCollapse", JSON.stringify([...collapsed])); } catch (_) {}
      });
    });
    $$(".pal-item", list).forEach(b => b.addEventListener("click", (e) => {
      const it = items[+b.dataset.idx];
      if (it && it.run) {
        // Persist the last-executed command for a one-key re-run next time.
        try {
          localStorage.setItem("magpie.lastCmd", JSON.stringify({ title: it.title, at: Date.now() }));
          const hist = [it.title].concat(JSON.parse(localStorage.getItem("magpie.cmdHist") || "[]").filter(t => t !== it.title));
          localStorage.setItem("magpie.cmdHist", JSON.stringify(hist.slice(0, 10)));
        } catch (_) {}
        it.run();
      }
      if (it && it.vid && e.target.closest(".pal-thumb") && Obs.showVlight) Obs.showVlight(it.vid);
      closePalette();
    }));
    $$(".pal-item", list).forEach(b => b.addEventListener("contextmenu", e => {
      // Right-click a view item → pin it as the default hero.
      const it = items[+b.dataset.idx];
      if (it && it.vid) {
        e.preventDefault();
        localStorage.setItem("magpie.defaultView", it.vid);
        toast("默认视图:" + ((Obs.api.viewMeta(it.vid) || {}).title || it.title));
        closePalette();
      }
    }));
  }
  // palette input listeners — bound lazily on first open
  document.addEventListener("DOMContentLoaded", () => {
    const inp = $("#palette-input");
    if (inp) {
      inp.addEventListener("input", e => { try { localStorage.setItem("magpie.palQ", e.target.value); } catch (_) {} renderPalette(e.target.value); });
      let palIdx = -1;
      inp.addEventListener("keydown", e => {
        const items = [...document.querySelectorAll(".pal-item")];
        if (e.key === "Escape") { closePalette(); return; }
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
          e.preventDefault();
          palIdx = e.key === "ArrowDown" ? Math.min(items.length - 1, palIdx + 1) : Math.max(0, palIdx - 1);
          items.forEach((b, i) => b.classList.toggle("kb-focus", i === palIdx));
          items[palIdx]?.scrollIntoView({ block: "nearest" });
          return;
        }
        if (e.key === "Enter") {
          const hit = palIdx >= 0 ? items[palIdx] : $(".pal-item");
          if (hit) hit.click();
          palIdx = -1;
        }
        // → on a focused item: peek at its detail (view items get the 6-char
        // description; actions get a longer search string preview).
        if (e.key === "ArrowRight" && palIdx >= 0) {
          const b = items[palIdx];
          const it = b && paletteItems().filter(x => !inp.value || x.search.includes(inp.value.toLowerCase()) || x.title.toLowerCase().includes(inp.value.toLowerCase()))[+b.dataset.idx];
          if (it) {
            const meta = it.vid && Obs.api.viewMeta ? Obs.api.viewMeta(it.vid) : null;
            toast(meta && meta.eyebrow ? `「${meta.title}」· ${meta.eyebrow}` : `${it.title} · ${it.sub}`);
          }
          e.preventDefault();
        }
        // ⌘/Ctrl + 1-9: speed-dial the Nth item in the current filtered list.
        if (/^[1-9]$/.test(e.key) && (e.metaKey || e.ctrlKey)) {
          const hit = items[+e.key - 1];
          if (hit) { e.preventDefault(); hit.click(); }
        }
      });
      inp.addEventListener("input", () => { palIdx = -1; document.querySelectorAll(".pal-item").forEach(b => b.classList.remove("kb-focus")); });
    }
  });

})();
