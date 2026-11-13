/* ==========================================================================
   Magpie Observatory — 请求工厂 (request factory) view module.
   Standalone classic script: registers window.ObservatoryViews.factory.

   Optional theme, not a monitoring default: every session becomes a parcel on
   a four-station conveyor — 排队 → 流式 → 完成 — with a 返工 lane for errors and
   retries. A parcel keeps its provider hue and its agent/model/token ledger; a
   streaming parcel also carries how much of its budget it has already
   produced. Hover a parcel shows its ledger line, click pins it into the side
   panel. The numbers are the gateway's; only the staging is playful.
   ========================================================================== */
(function () {
  "use strict";

  const MAX = 12;              // parcels on the belt at once
  const TIP_W = 300;           // .factory-tip max-width
  const TIP_H = 158;           // generous 5-line height, keeps the tip inside
  const MIN_MS = 8000;         // floor for the progress denominator
  const STAGGER_MAX = 8;       // cap the flip-in stagger so 12 parcels do not crawl

  // The four stations, in belt order. `flow` stations animate their belt.
  const STATIONS = [
    { key: "queue",  name: "排队", en: "QUEUE",  tone: "queue",  flow: true },
    { key: "run",    name: "流式", en: "STREAM", tone: "run",    flow: true },
    { key: "done",   name: "完成", en: "DONE",   tone: "done",   flow: false },
    { key: "rework", name: "返工", en: "REWORK", tone: "rework", flow: false }
  ];
  const STATION_OF = { queued: "queue", streaming: "run", done: "done", error: "rework" };
  const RANK = { streaming: 0, queued: 1, done: 2, error: 3 };
  const STATUS_TEXT = { queued: "排队", streaming: "流式", done: "完成", error: "失败" };
  const LEGEND = [
    { tone: "queue",  name: "排队", text: "等待账号并发 / 槽位" },
    { tone: "run",    name: "流式", text: "正在生成，进度条 = 已生成比例" },
    { tone: "done",   name: "完成", text: "已交付，停在工位上" },
    { tone: "rework", name: "返工", text: "琥珀 = 重试，红 = 失败" }
  ];

  const HOSTS = new WeakMap();
  let pinned = null;           // pinned parcel id, survives every data tick

  /* ------------------------------------------------------------ helpers --- */
  const num = (v) => { const n = Number(v); return isFinite(n) ? n : 0; };
  const identity = (v) => String(v == null ? "" : v);
  const plain = (n) => String(Math.round(n * 100) / 100);

  function tpsText(tps) {
    if (!(tps > 0)) return "0";
    return tps >= 100 ? String(Math.round(tps)) : (Math.round(tps * 10) / 10).toFixed(1);
  }

  function fmtDur(ms) {
    const s = Math.max(0, Math.round(ms / 1000));
    if (s < 60) return s + "s";
    return Math.floor(s / 60) + "m " + String(s % 60).padStart(2, "0") + "s";
  }

  // Map whatever the gateway calls a status onto the four stations.
  function kindOf(status, tps) {
    const k = String(status == null ? "" : status).trim().toLowerCase();
    if (k === "streaming" || k === "run" || k === "running" || k === "active" || k === "live") return "streaming";
    if (k === "queued" || k === "queue" || k === "pending" || k === "waiting" || k === "hold") return "queued";
    if (k === "done" || k === "ok" || k === "success" || k === "complete" || k === "completed" || k === "pass") return "done";
    if (k === "error" || k === "err" || k === "fail" || k === "failed" || k === "retry" || k === "retried" ||
        k === "cancel" || k === "canceled" || k === "cancelled" || k === "timeout") return "error";
    return tps > 0 ? "streaming" : "queued";
  }

  /* -------------------------------------------------------------- model --- */
  function buildModel(ctx) {
    const data = (ctx && ctx.data) || {};
    const num2 = num;
    const pMeta = (ctx && ctx.providerMeta) || (() => ({}));
    const ofModel = (ctx && ctx.providerOfModel) || ((model, provider) => provider || "");
    const pIcon = (ctx && ctx.providerIcon) || (() => "");
    const aMeta = (ctx && ctx.agentMeta) || (() => ({}));
    const aIcon = (ctx && ctx.agentIcon) || (() => "");
    const now = Date.now();

    // Sessions first (active), then recent; dedupe by id so a session that has
    // just landed in `recent` never shows twice.
    const raw = [];
    (Array.isArray(data.sessions) ? data.sessions : []).forEach(r => { if (r && typeof r === "object") raw.push(r); });
    (Array.isArray(data.recent) ? data.recent : []).forEach(r => { if (r && typeof r === "object") raw.push(r); });
    const seen = new Set();
    const rows = [];
    raw.forEach((r, i) => {
      const id = String(r.id != null && r.id !== "" ? r.id : "x" + i);
      if (seen.has(id)) return;
      seen.add(id);
      rows.push({ row: r, id });
    });

    const parcels = rows.map(({ row, id }) => {
      const pkey = String(ofModel(row.model, row.provider) || row.provider || "unknown").toLowerCase();
      const pm = pMeta(pkey) || {};
      const am = aMeta(row.agent) || {};
      const tokens = Math.max(0, num2(row.tokens));
      const tps = Math.max(0, num2(row.tps));
      const kind = kindOf(row.status, tps);
      const startedAt = num2(row.startedAt);
      const tries = Array.isArray(row.tries) ? row.tries.length : Math.max(0, num2(row.tries));
      const fallbacks = Math.max(0, num2(row.fallbacks));
      const subs = Array.isArray(row.subagents) ? row.subagents.length : Math.max(0, num2(row.subagents));
      const denom = Math.max(MIN_MS, tokens / Math.max(tps, 1) * 1000);
      let progress = 0;
      if (kind === "streaming") progress = clamp((now - startedAt) / denom, 0, 1);
      else if (kind === "done" || kind === "error") progress = 1;
      const tone = kind === "error" ? ((fallbacks > 0 || tries > 1) ? "amber" : "red") : kind;
      return {
        id, kind, station: STATION_OF[kind], tone, progress,
        rank: RANK[kind],
        title: row.title || row.model || "—",
        agent: row.agent || "unknown",
        agentName: am.name || row.agent || "Agent",
        agentIcon: aIcon(row.agent),
        model: row.model || "—",
        provider: pkey,
        providerName: pm.name || pkey,
        color: pm.color || "var(--accent)",
        icon: pIcon(pkey),
        tokens, tps,
        elapsed: kind === "streaming" ? Math.max(0, now - startedAt) : 0,
        tries, fallbacks, subs,
        status: kind === "error" ? (tone === "amber" ? "重试" : "失败") : STATUS_TEXT[kind]
      };
    });

    // Active first, freshest first inside a rank; then cap the belt.
    parcels.sort((a, b) => (a.rank - b.rank) || 0);
    const shown = parcels.slice(0, MAX);

    const byStation = { queue: [], run: [], done: [], rework: [] };
    shown.forEach(p => { byStation[p.station].push(p); });

    const byId = Object.create(null);
    shown.forEach(p => { byId[p.id] = p; });

    let tpsSum = 0, tpsN = 0;
    let slowest = null;
    shown.forEach(p => {
      if (p.tps > 0) { tpsSum += p.tps; tpsN++; }
      if (p.kind === "streaming" && (!slowest || p.elapsed > slowest.elapsed)) slowest = p;
    });

    const counts = {
      queue: byStation.queue.length,
      run: byStation.run.length,
      done: byStation.done.length,
      rework: byStation.rework.length
    };
    const retried = byStation.rework.filter(p => p.tone === "amber").length;

    return {
      parcels: shown,
      byStation, byId,
      counts,
      active: counts.queue + counts.run,
      done: counts.done,
      rework: counts.rework,
      retried,
      failed: counts.rework - retried,
      avgTps: tpsN ? tpsSum / tpsN : 0,
      slowest,
      empty: shown.length === 0,
      hidden: Math.max(0, parcels.length - shown.length),
      pinned: (pinned != null && byId[pinned]) || null
    };
  }

  function signature(m, motion) {
    const parts = m.parcels.map(p => [p.id, p.station, p.tone, p.tokens, p.tps, p.tries, p.fallbacks, p.model, p.provider, p.agent, Math.round(p.progress * 100)].join(":")).join("|");
    return [m.empty ? "e" : "d", m.counts.queue, m.counts.run, m.counts.done, m.counts.rework,
      Math.round(m.avgTps * 10), pinned || "", motion, parts].join("~");
  }

  /* -------------------------------------------------------------- shell --- */
  function stateFor(host) {
    let st = HOSTS.get(host);
    if (!st) {
      st = {
        host, root: null, line: null, hstats: null, side: null, tip: null, empty: null,
        stations: {}, parcelEls: new Map(), ctx: null, model: null, sig: null, brandSub: null
      };
      HOSTS.set(host, st);
    }
    return st;
  }

  function mount(host, st) {
    host.innerHTML = "";
    const root = document.createElement("div");
    root.className = "factory-root";

    let lineHTML = "";
    STATIONS.forEach((s, i) => {
      if (i > 0) {
        lineHTML += '<div class="factory-link" aria-hidden="true"><i></i><i></i><i></i></div>';
      }
      lineHTML +=
        '<section class="factory-st" data-key="' + s.key + '" data-tone="' + s.tone + '" data-flow="0">' +
          '<header class="factory-st-head">' +
            '<span class="factory-st-dot"></span>' +
            '<span class="factory-st-name">' + s.name + '</span>' +
            '<span class="factory-st-en">' + s.en + '</span>' +
            '<b class="factory-st-count">0</b>' +
          '</header>' +
          '<div class="factory-st-lane" role="list">' +
            '<div class="factory-belt" aria-hidden="true"></div>' +
          '</div>' +
        '</section>';
    });

    root.innerHTML =
      '<div class="factory-main">' +
        '<div class="factory-head">' +
          '<div class="factory-brand"><span class="factory-brand-lbl">FACTORY</span>' +
            '<b class="factory-brand-sub"></b></div>' +
          '<div class="factory-hstats"></div>' +
        '</div>' +
        '<div class="factory-line">' + lineHTML + '</div>' +
        '<div class="factory-empty" hidden>' +
          '<svg viewBox="0 0 120 44" aria-hidden="true">' +
            '<rect x="4" y="14" width="30" height="18" rx="4"/>' +
            '<rect x="38" y="14" width="30" height="18" rx="4" class="factory-empty-b"/>' +
            '<rect x="72" y="14" width="30" height="18" rx="4" class="factory-empty-c"/>' +
            '<path d="M104 23h12M34 23h4M68 23h4"/>' +
          '</svg>' +
          '<b>产线上还没有包裹</b>' +
          '<span>这个视图读取 <code>ctx.data.sessions</code> 与 <code>ctx.data.recent</code>：' +
          '每个会话变成一个包裹，按状态落在 排队 / 流式 / 完成 / 返工 四个工位上。' +
          '网关没有请求时这里保持为空。</span>' +
        '</div>' +
      '</div>' +
      '<aside class="factory-side" aria-label="请求工厂面板"></aside>' +
      '<div class="factory-tip" role="tooltip" hidden></div>';
    host.appendChild(root);

    st.root = root;
    st.line = root.querySelector(".factory-line");
    st.hstats = root.querySelector(".factory-hstats");
    st.brandSub = root.querySelector(".factory-brand-sub");
    st.side = root.querySelector(".factory-side");
    st.tip = root.querySelector(".factory-tip");
    st.empty = root.querySelector(".factory-empty");

    STATIONS.forEach(s => {
      const el = root.querySelector('.factory-st[data-key="' + s.key + '"]');
      st.stations[s.key] = {
        el,
        lane: el.querySelector(".factory-st-lane"),
        count: el.querySelector(".factory-st-count")
      };
    });

    bind(st);
  }

  function parcelFrom(st, node) {
    if (!node || !st.model) return null;
    return st.model.byId[node.dataset.id] || null;
  }

  function bind(st) {
    const root = st.root;
    root.addEventListener("pointermove", (e) => {
      const p = e.target && e.target.closest ? e.target.closest(".factory-parcel") : null;
      if (!p) { hideTip(st); return; }
      showTip(st, p);
    });
    root.addEventListener("pointerleave", () => hideTip(st));
    root.addEventListener("focusin", (e) => {
      const p = e.target && e.target.closest ? e.target.closest(".factory-parcel") : null;
      if (!p) return;
      showTip(st, p);
    });
    root.addEventListener("focusout", () => hideTip(st));
    root.addEventListener("click", (e) => {
      const node = e.target && e.target.closest ? e.target.closest(".factory-parcel") : null;
      const p = parcelFrom(st, node);
      if (!p) return;
      pinned = pinned === p.id ? null : p.id;
      if (st.ctx) render(st.host, st.ctx);
    });
    root.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && pinned != null) {
        pinned = null;
        if (st.ctx) render(st.host, st.ctx);
        return;
      }
      if (e.key !== "Enter" && e.key !== " ") return;
      const node = e.target && e.target.closest ? e.target.closest(".factory-parcel") : null;
      const p = parcelFrom(st, node);
      if (!p) return;
      e.preventDefault();
      pinned = pinned === p.id ? null : p.id;
      if (st.ctx) render(st.host, st.ctx);
    });
  }

  /* ------------------------------------------------------------ tooltip --- */
  function hideTip(st) { if (st.tip && !st.tip.hidden) st.tip.hidden = true; }

  function showTip(st, node) {
    const p = parcelFrom(st, node);
    if (!p || !st.tip) { hideTip(st); return; }
    const ctx = st.ctx || {};
    const esc = ctx.esc || identity;
    const fmtTok = ctx.fmtTokens || identity;
    st.tip.innerHTML =
      "<b>" + esc(p.title) + "</b>" +
      "<span>agent <b>" + esc(p.agentName) + "</b> · 模型 <b>" + esc(p.model) + "</b></span>" +
      "<span>供应商 <b>" + esc(p.providerName) + "</b> · 状态 <b>" + esc(p.status) + "</b>" +
        (p.kind === "streaming" ? " · 进度 " + Math.round(p.progress * 100) + "%" : "") + "</span>" +
      "<span>tokens <b>" + esc(fmtTok(p.tokens)) + "</b> · TPS <b>" + esc(tpsText(p.tps)) + "</b>" +
        (p.elapsed ? " · 已在制 " + esc(fmtDur(p.elapsed)) : "") + "</span>" +
      "<span>tries <b>" + esc(p.tries) + "</b> · fallbacks <b>" + esc(p.fallbacks) + "</b>" +
        (p.subs ? " · 子代理 <b>" + esc(p.subs) + "</b>" : "") + "</span>";
    st.tip.hidden = false;
    // Anchored to the parcel, not the pointer, against fixed bounds: the tip
    // never has to be measured, so a stale layout pass cannot push it outside.
    const root = st.root.getBoundingClientRect();
    const box = node.getBoundingClientRect();
    const boxTop = box.top - root.top;
    const boxBottom = box.bottom - root.top;
    const maxLeft = Math.max(4, root.width - TIP_W - 4);
    let flip = false;
    let top = boxBottom + 6;
    if (top + TIP_H > root.height - 2) {
      flip = true;
      top = Math.max(TIP_H + 2, boxTop - 6);
    }
    st.tip.style.left = clamp(box.left - root.left, Math.min(4, maxLeft), maxLeft) + "px";
    st.tip.style.top = top + "px";
    st.tip.style.transform = flip ? "translate(0, -100%)" : "none";
  }

  /* -------------------------------------------------------------- paint --- */
  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

  function parcelHTML(p, ctx) {
    const escFn = ctx.esc || identity;
    const fmtTok = ctx.fmtTokens || identity;
    const retryBadge = (p.tries > 1 || p.fallbacks > 0) ? " ×" + Math.max(p.tries, 1 + p.fallbacks) : "";
    const track = (p.kind === "queued")
      ? ""
      : '<span class="factory-parcel-track"><i style="width:' + Math.round(p.progress * 100) + '%"></i></span>';
    return '<span class="factory-parcel-edge"></span>' +
      '<span class="factory-parcel-pic"><img src="' + escFn(p.icon) + '" alt="" loading="lazy"></span>' +
      '<b class="factory-parcel-title" title="' + escFn(p.title) + '">' + escFn(p.title) + '</b>' +
      '<span class="factory-parcel-badge" data-tone="' + p.tone + '">' + escFn(p.status) + escFn(retryBadge) + '</span>' +
      '<span class="factory-parcel-meta">' +
        '<img class="factory-parcel-aic" src="' + escFn(p.agentIcon) + '" alt="" loading="lazy">' +
        '<span class="factory-parcel-agent">' + escFn(p.agentName) + '</span>' +
        '<span class="factory-parcel-model" title="' + escFn(p.model) + '">' + escFn(p.model) + '</span>' +
      '</span>' +
      '<span class="factory-parcel-fig">' +
        '<b class="factory-parcel-tok">' + escFn(fmtTok(p.tokens)) + '</b>' +
        '<i class="factory-parcel-tps">' + escFn(tpsText(p.tps)) + ' TPS</i>' +
      '</span>' +
      track;
  }

  function syncParcels(st, m, ctx) {
    const seen = st.parcelEls;
    const keep = new Set();
    let fresh = 0;

    STATIONS.forEach(s => {
      const lane = st.stations[s.key].lane;
      m.byStation[s.key].forEach((p, idx) => {
        keep.add(p.id);
        let rec = seen.get(p.id);
        if (!rec) {
          const el = document.createElement("article");
          el.tabIndex = 0;
          el.setAttribute("role", "listitem");
          rec = { el, sig: null, cls: null, isNew: true };
          seen.set(p.id, rec);
          el.addEventListener("animationend", () => {
            el.classList.remove("is-new");
            rec.isNew = false;
            rec.cls = el.className;
          });
        }
        const stagger = Math.min(fresh, STAGGER_MAX);
        if (rec.isNew) fresh++;

        const cls = "factory-parcel factory-k-" + p.kind +
          (p.kind === "queued" ? " is-static" : "") +
          (p.id === pinned ? " is-pin" : "") +
          (rec.isNew ? " is-new" : "");
        if (rec.cls !== cls) { rec.el.className = cls; rec.cls = cls; }

        const sig = [p.id, p.tone, p.status, p.tokens, p.tps, p.tries, p.fallbacks, p.model, p.provider,
          p.agent, p.kind, pinned === p.id ? "1" : "0"].join("|");
        if (rec.sig !== sig) {
          rec.el.innerHTML = parcelHTML(p, ctx);
          rec.sig = sig;
          rec.el.dataset.id = p.id;
          rec.el.dataset.tone = p.tone;
          rec.el.style.setProperty("--c", p.color);
          rec.el.style.setProperty("--i", String(stagger));
          rec.el.setAttribute("aria-pressed", p.id === pinned ? "true" : "false");
          rec.el.setAttribute("aria-label", [
            p.title, p.agentName, p.model, p.providerName, p.status,
            (ctx.fmtTokens || identity)(p.tokens) + " tokens", tpsText(p.tps) + " TPS",
            "tries " + p.tries, "fallbacks " + p.fallbacks,
            p.id === pinned ? "已钉选" : "点击钉选"
          ].join(" · "));
        }
        // Progress is updated in place so its CSS transition can run between ticks.
        const fill = rec.el.querySelector(".factory-parcel-track > i");
        if (fill) fill.style.width = Math.round(p.progress * 100) + "%";

        // Move only when the slot is wrong: re-inserting a node restarts its
        // CSS animations, which would break the bob and the flip-in.
        const want = lane.children[idx + 1];   // children[0] is the belt
        if (want !== rec.el) lane.insertBefore(rec.el, want || null);
      });
    });

    for (const [id, rec] of seen) {
      if (keep.has(id)) continue;
      rec.el.remove();
      seen.delete(id);
    }
  }

  function headHTML(m) {
    const stat = (label, value, unit) =>
      '<span class="factory-hstat"><b>' + value + (unit ? '<i>' + unit + '</i>' : '') + '</b><span>' + label + '</span></span>';
    return stat("在制", m.active) +
      stat("完成", m.done) +
      stat("返工", m.rework) +
      stat("平均 TPS", tpsText(m.avgTps));
  }

  function sideHTML(m, ctx) {
    if (m.empty) {
      return '<div class="factory-side-title">FACTORY</div>' +
        '<p class="factory-side-empty">暂无请求 · 产线待机</p>' +
        '<p class="factory-note">数据真实 · 表现游戏化</p>';
    }
    const row = (s) =>
      '<li class="factory-count" data-tone="' + s.tone + '">' +
        '<span class="factory-count-dot"></span>' +
        '<span class="factory-count-name">' + s.name + '<i>' + s.en + '</i></span>' +
        '<b>' + m.counts[s.key] + '</b>' +
      '</li>';

    let pinHTML;
    if (m.pinned) {
      const p = m.pinned;
      pinHTML =
        '<div class="factory-pin" data-tone="' + p.tone + '" style="--c:' + (ctx.esc || identity)(p.color) + '">' +
          '<div class="factory-pin-head"><img src="' + (ctx.esc || identity)(p.icon) + '" alt="" loading="lazy">' +
            '<b>' + (ctx.esc || identity)(p.title) + '</b></div>' +
          '<div class="factory-pin-row"><span>工位</span><b>' + (ctx.esc || identity)(p.status) + '</b></div>' +
          '<div class="factory-pin-row"><span>供应商</span><b>' + (ctx.esc || identity)(p.providerName) + '</b></div>' +
          '<div class="factory-pin-row"><span>模型</span><b>' + (ctx.esc || identity)(p.model) + '</b></div>' +
          '<div class="factory-pin-row"><span>Agent</span><b>' + (ctx.esc || identity)(p.agentName) + '</b></div>' +
          '<div class="factory-pin-row"><span>Token</span><b>' + (ctx.fmtTokens || identity)(p.tokens) + '</b></div>' +
          '<div class="factory-pin-row"><span>TPS</span><b>' + (ctx.esc || identity)(tpsText(p.tps)) + '</b></div>' +
          '<div class="factory-pin-row"><span>tries / fallbacks</span><b>' + p.tries + ' / ' + p.fallbacks + '</b></div>' +
          (p.elapsed ? '<div class="factory-pin-row"><span>已在制</span><b>' + (ctx.esc || identity)(fmtDur(p.elapsed)) + '</b></div>' : '') +
          '<div class="factory-pin-hint">点击包裹取消钉选 · Esc 也可</div>' +
        '</div>';
    } else {
      pinHTML = '<div class="factory-pin-empty">点击任意包裹 · 钉在此处查看明细</div>';
    }

    const slow = m.slowest
      ? '<div class="factory-side-stat"><span>最慢在制</span><b title="' + (ctx.esc || identity)(m.slowest.title) + '">' +
          (ctx.esc || identity)(m.slowest.title) + '</b><i>' + (ctx.esc || identity)(fmtDur(m.slowest.elapsed)) + '</i></div>'
      : '<div class="factory-side-stat"><span>最慢在制</span><b>—</b><i>产线空闲</i></div>';

    const legend =
      '<div class="factory-legend">' +
        LEGEND.map(l => '<div class="factory-legend-row" data-tone="' + l.tone + '">' +
          '<span class="factory-legend-dot"></span><b>' + l.name + '</b><span>' + l.text + '</span></div>').join("") +
      '</div>';

    return '<div class="factory-side-title">FACTORY</div>' +
      '<ul class="factory-counts">' + STATIONS.map(row).join("") + '</ul>' +
      '<div class="factory-side-grid">' +
        '<div class="factory-side-stat"><span>吞吐（完成）</span><b>' + m.done + '</b><i>个包裹已交付</i></div>' +
        '<div class="factory-side-stat"><span>平均 TPS</span><b>' + (ctx.esc || identity)(tpsText(m.avgTps)) + '</b><i>全部在制 + 完成</i></div>' +
        slow +
      '</div>' +
      pinHTML +
      legend +
      '<p class="factory-note">数据真实 · 表现游戏化</p>' +
      (m.hidden ? '<p class="factory-note factory-note-sub">另有 ' + m.hidden + ' 个包裹未上产线（上限 ' + MAX + '）</p>' : '');
  }

  function paint(st, m, ctx) {
    const root = st.root;
    const motion = ctx.motion || "full";
    root.dataset.motion = motion;
    root.classList.toggle("is-empty", !!m.empty);

    st.line.hidden = !!m.empty;
    st.empty.hidden = !m.empty;
    st.brandSub.textContent = m.empty ? "待机" :
      (m.hidden ? m.parcels.length + " / " + (m.parcels.length + m.hidden) + " 在产线" : m.parcels.length + " 个包裹在产线");

    st.hstats.innerHTML = m.empty ? "" : headHTML(m);

    STATIONS.forEach(s => {
      const rec = st.stations[s.key];
      const n = m.counts[s.key];
      rec.count.textContent = String(n);
      rec.el.classList.toggle("is-idle", n === 0);
      rec.el.classList.toggle("is-tone", s.key === "rework" && m.retried > 0 && m.failed === 0);
      rec.el.dataset.flow = (s.flow && n > 0) ? "1" : "0";
    });

    syncParcels(st, m, ctx);
    st.side.innerHTML = sideHTML(m, ctx);
    if (m.empty) hideTip(st);
  }

  /* ---------------------------------------------------------------- api --- */
  function render(host, ctx) {
    if (!host || !ctx) return;
    const st = stateFor(host);
    st.host = host;
    if (!st.root) mount(host, st);
    st.ctx = ctx;
    const motion = ctx.motion === "off" ? "off" : (ctx.motion === "soft" ? "soft" : "full");
    const m = buildModel(ctx);
    const sig = signature(m, motion);
    if (sig === st.sig && st.model) return;
    st.sig = sig;
    st.model = m;
    paint(st, m, ctx);
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews["factory"] = {
    title: "请求工厂",
    eyebrow: "REQUEST FACTORY",
    render
  };
})();
