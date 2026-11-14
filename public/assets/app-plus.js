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
    scrubReplay(s.replay.idx);
    toast("回放模式 · 拖动时间轴 · R 或 × 退出");
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
  }
  function exitReplay() {
    const s = state();
    if (s._replayTimer) { clearInterval(s._replayTimer); s._replayTimer = null; const p = $("#replay-play"); if (p) p.textContent = "▶"; }
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
    if (s._replayTimer) { clearInterval(s._replayTimer); s._replayTimer = null; $("#replay-play").textContent = "▶"; return; }
    s._replayTimer = setInterval(() => {
      if (!s.replay) { clearInterval(s._replayTimer); s._replayTimer = null; return; }
      const next = s.replay.idx + 1;
      if (next >= s.replayBuf.length) { clearInterval(s._replayTimer); s._replayTimer = null; $("#replay-play").textContent = "▶"; return; }
      $("#replay-range").value = next;
      scrubReplay(next);
    }, 600);
    $("#replay-play").textContent = "⏸";
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

  // Copy a link that re-opens the board in exactly this state: hero view,
  // range, and cinema flag. The inverse of applyUrlState().
  async function shareStateLink() {
    const s = state();
    if (!s) return;
    const p = new URLSearchParams();
    if (s.heroMode && s.heroMode !== "route") p.set("view", s.heroMode);
    if (s.range && s.range !== "today") p.set("range", s.range);
    if (s.cinema) p.set("cinema", "1");
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
  function updateCinemaStats() {
    const el = $("#ch-stats");
    const s = state();
    if (!el || !s || !s.cinema) return;
    const k = (s.view && s.view.kpis) || s.data.kpis || {};
    el.textContent = `${fmtTokens(k.tokens)} · ${fmtMoney(k.cost)} · ${k.requests || 0} 请求`;
  }

  /* ======================================================= notifications === */

  function alertRules() {
    let r = { quota: 88, err: 5 };
    try { const v = JSON.parse(localStorage.getItem("magpie.rules") || "{}"); if (v.quota) r.quota = +v.quota; if (v.err) r.err = +v.err; } catch (_) {}
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
      </div>
      <div class="records-sub">成就墙 · ${Object.keys(bag).length}/${ACHIEVEMENTS.length} 已解锁</div>
      ${(() => {
        try {
          const seen = JSON.parse(localStorage.getItem("magpie.viewSeen") || "[]");
          const total = (Obs.api.VIEW_META || []).length;
          const pct = total ? Math.min(100, Math.round(seen.length / total * 100)) : 0;
          return `<div class="dex"><div class="dex-row"><b>图鉴</b><span>${seen.length}/${total} · ${pct}%</span></div>
            <div class="dex-bar"><i style="width:${pct}%"></i></div>
            <div class="dex-legend">${total ? "已看过 " + seen.length + " 个不同视图" : ""}</div></div>`;
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
    { id: "magpie-200", name: "鹊上眉梢", test: s => (parseInt(localStorage.getItem("magpie.clicks") || "0", 10) || 0) >= 200, sub: "点台鹊 200 次" }
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
    });
    try { localStorage.setItem("magpie.badges", JSON.stringify(bag)); } catch (_) {}
  }

  /* =========================================================== digest ======= */
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
    const top = {};
    (s.data.logs || []).forEach(l => { top[l.provider] = (top[l.provider] || 0) + (l.tokens || 0); });
    const topP = Object.entries(top).sort((a, b) => b[1] - a[1])[0];
    const meta = topP && Obs.api.providerMeta ? Obs.api.providerMeta(topP[0]) : null;
    const y2 = days[days.length - 3];
    const dTok = y2 && y2.tokens ? Math.round((y.tokens - y2.tokens) / y2.tokens * 100) : null;
    const dCall = y2 && y2.calls && y.calls != null ? Math.round((y.calls - y2.calls) / y2.calls * 100) : null;
    const card = document.createElement("div");
    card.className = "digest-card";
    card.innerHTML = `
      <div class="digest-head"><b>昨日报告</b><span>DAILY DIGEST</span></div>
      <div class="digest-grid">
        <div><small>tokens</small><b>${fmtTokens(y.tokens)}${dTok != null ? `<em class="dig ${dTok >= 0 ? "up" : "down"}">${dTok >= 0 ? "▲" : "▼"}${Math.abs(dTok)}%</em>` : ""}</b></div>
        <div><small>调用</small><b>${y.calls || 0}${dCall != null ? `<em class="dig ${dCall >= 0 ? "up" : "down"}">${dCall >= 0 ? "▲" : "▼"}${Math.abs(dCall)}%</em>` : ""}</b></div>
        <div><small>连续使用</small><b>${dayStreak()} 天</b></div>
        <div><small>最常用</small><b>${meta ? esc(meta.name) : "—"}</b></div>
        ${(() => {
          try {
            const seen = JSON.parse(localStorage.getItem("magpie.viewSeen") || "[]");
            const total = (Obs.api.VIEW_META || []).length;
            const pct = total ? Math.round(seen.length / total * 100) : 0;
            return `<div><small>图鉴</small><b>${seen.length}/${total} <em class="dig">${pct}%</em></b></div>`;
          } catch (_) { return ""; }
        })()}
      </div>
      <div class="digest-foot">连续使用 ${dayStreak()} 天 · ${dTok != null ? (dTok >= 0 ? "较前日 +" + dTok + "%" : "较前日 " + dTok + "%") : "保持热度"}
        <button class="mini-btn digest-week" type="button">看周报 →</button></div>`;
    card.addEventListener("click", e => {
      if (e.target.closest(".digest-week")) { weeklyReport(); }
      card.remove();
    });
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
    const rq = $("#rule-quota"), re = $("#rule-err");
    if (rq && re) {
      const r = alertRules();
      rq.value = r.quota; re.value = r.err;
      $("#rule-quota-v").textContent = r.quota + "%";
      $("#rule-err-v").textContent = r.err + " 条";
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
    ["rule-quota", "rule-err"].forEach(id => {
      const el = $("#" + id);
      if (el) el.addEventListener("input", () => {
        const r = alertRules();
        if (id === "rule-quota") r.quota = +el.value; else r.err = +el.value;
        try { localStorage.setItem("magpie.rules", JSON.stringify(r)); } catch (_) {}
        $("#rule-quota-v").textContent = r.quota + "%";
        $("#rule-err-v").textContent = r.err + " 条";
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
      if (e.target.matches("input, textarea, select, [contenteditable]")) return;
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
    $("#palette-input").value = "";
    renderPalette("");
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
        items.push({ kind: "视图", icon: "i-route", title: v.title || id, sub: (v.eyebrow || "") + hot, search: (v.title + " " + (v.eyebrow || "") + " " + id).toLowerCase(), run: () => { Obs.api.setHeroMode(id); closePalette(); } });
      });
    }
    // core views from the meta catalog
    if (s && s.VIEW_META) s.VIEW_META.forEach(v => {
      items.push({ kind: "视图", icon: v.icon, title: v.title, sub: v.eyebrow, search: (v.title + " " + v.eyebrow + " " + v.id + " " + (v.group || "") + " " + (v.hint || "")).toLowerCase(), run: () => { Obs.api.setHeroMode(v.id); closePalette(); } });
    });
    // actions
    items.push(
      { kind: "动作", icon: "i-expand", title: "影院模式", sub: "O · 全屏只看这一个视图", search: "cinema 影院 全屏".toLowerCase(), run: toggleCinema },
      { kind: "动作", icon: "i-pause", title: s && s.paused ? "继续演示" : "暂停演示", sub: "快捷键 Space", search: "pause 暂停 播放".toLowerCase(), run: () => $("#demo-toggle").click() },
      { kind: "动作", icon: "i-clock", title: "回放最近3分钟", sub: "快捷键 R", search: "replay 回放 时间轴".toLowerCase(), run: () => { state() && state().replay ? exitReplay() : startReplay(); } },
      { kind: "动作", icon: "i-link", title: "复制状态链接", sub: "?view&range&cinema 快照 URL · ⌘S", search: "share 分享 链接 状态 url".toLowerCase(), run: shareStateLink },
      { kind: "动作", icon: "i-pin", title: "设为默认视图", sub: "下次打开直达当前视图", search: "default 默认 视图 pin".toLowerCase(), run: () => { if (s && s.heroMode) { localStorage.setItem("magpie.defaultView", s.heroMode); toast("默认视图：" + (Obs.api.viewMeta(s.heroMode) || {}).title); closePalette(); } } },
      { kind: "动作", icon: "i-arrow", title: "导出今日分享图", sub: "1200×630 PNG", search: "share 分享 导出 截图".toLowerCase(), run: () => shareToday() },
      { kind: "动作", icon: "i-arrow", title: "导出本周分享图", sub: "1200×630 PNG · 近7天", search: "share 分享 导出 周 截图 week".toLowerCase(), run: () => shareToday("week") },
      { kind: "动作", icon: "i-arrow", title: "导出对比分享图", sub: "今日 vs 昨日 · 1200×630 PNG", search: "share 分享 对比 导出 compare".toLowerCase(), run: shareCompare },
      { kind: "动作", icon: "i-arrow", title: "导出月度分享图", sub: "近30天 · 1200×630 PNG", search: "share 分享 月度 导出 month".toLowerCase(), run: () => shareToday("month") },
      { kind: "动作", icon: "i-link", title: "导出回放播放器", sub: "独立 HTML · 帧内嵌 · 可拖条", search: "replay 回放 导出 html 播放器".toLowerCase(), run: exportReplayHtml },
      { kind: "动作", icon: "i-link", title: "复制页面链接", sub: "当前视图 / 区间 / 影院", search: "link 链接 复制 分享 url".toLowerCase(), run: copySnapshotLink },
      { kind: "动作", icon: "i-link", title: "复制回放链接", sub: "近3分钟快照打包进 URL", search: "link 回放 链接 replay share".toLowerCase(), run: shareReplayLink },
      { kind: "动作", icon: "i-db", title: "本周报告", sub: "7天柱状 + 峰值 + 最热路由", search: "weekly 周报 报告 本周".toLowerCase(), run: weeklyReport },
      { kind: "动作", icon: "i-overview", title: s && s.layoutEdit ? "退出排布模式" : "进入排布模式", sub: "拖拽重排卡片", search: "layout 排布 拖拽 布局".toLowerCase(), run: () => applyExtra("layout-edit") },
      { kind: "动作", icon: "i-server", title: "网关对比", sub: "默认 vs 锁定 · 并列四指标", search: "gateway 网关 对比 compare multi".toLowerCase(), run: compareGateways },
      { kind: "动作", icon: "i-trophy", title: "个人战绩", sub: "等级 / 连击 / 纪录", search: "records 战绩 等级 成就".toLowerCase(), run: showRecords },
      { kind: "动作", icon: "i-link", title: "复制视图快照", sub: "当前视图 + KPI + 配额摘要", search: "snapshot 快照 复制 copy".toLowerCase(), run: copyViewSnapshot },
      { kind: "动作", icon: "i-doc", title: "复制今日票据", sub: "markdown 摘要 · 日报/聊天直贴", search: "receipt 票据 摘要 markdown copy".toLowerCase(), run: copyReceipt }
    );
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
    return items;
  }
  function renderPalette(q) {
    const list = $("#palette-list");
    if (!list) return;
    const query = (q || "").toLowerCase();
    const items = paletteItems().filter(it => !query || it.search.includes(query) || it.title.toLowerCase().includes(query));
    list.innerHTML = items.map((it, i) => `<button class="pal-item" data-idx="${i}"><svg><use href="#${it.icon}"/></svg><span><b>${esc(it.title)}</b><small>${esc(it.sub)}</small></span><em>${esc(it.kind)}</em></button>`).join("");
    $$(".pal-item", list).forEach(b => b.addEventListener("click", () => {
      const it = items[+b.dataset.idx];
      if (it && it.run) it.run();
      closePalette();
    }));
  }
  // palette input listeners — bound lazily on first open
  document.addEventListener("DOMContentLoaded", () => {
    const inp = $("#palette-input");
    if (inp) {
      inp.addEventListener("input", e => renderPalette(e.target.value));
      let palIdx = -1;
      inp.addEventListener("keydown", e => {
        const items = [...document.querySelectorAll(".pal-item")];
        if (e.key === "Escape") closePalette();
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
      });
      inp.addEventListener("input", () => { palIdx = -1; document.querySelectorAll(".pal-item").forEach(b => b.classList.remove("kb-focus")); });
    }
  });

})();
