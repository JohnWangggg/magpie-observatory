/* ==========================================================================
   Magpie Observatory — hero view module: 蜂巢 (BEEHIVE).
   Standalone classic script. Registers window.ObservatoryViews["bees"].

   Hives = providers (from the quota ledger plus any provider a session used),
   ranked by running sessions then tokens; each hive is a hexagon wearing its
   provider colour, its active count and a ring for its first quota window.
   Bees = sessions (ctx.data.sessions + ctx.data.recent) orbiting their hive,
   sized by output tokens and coloured by agent; a session's demo subagents
   ride around the parent bee. Hover lights a family up, click pins it.
   ========================================================================== */
(function () {
  "use strict";

  const OTHER = "__other__";        // fallback hive for providers outside the top five
  const MAX_HIVES = 5;
  const MAX_SUBS = 3;               // a parent bee carries at most three subagents
  const GOLDEN = 137.508;           // phase spread, degrees
  const FALLBACK_W = 900;           // measured stage is unavailable (host hidden)
  const FALLBACK_H = 340;
  const NUMERIC = /^-?\d+(\.\d+)?$/;

  const STATUS_LABEL = { streaming: "流式", queued: "排队", done: "完成", error: "失败" };
  const RUNNING = { streaming: 1, queued: 1 };

  // Per-host UI state lives in a closure-guarded WeakMap, never on window.
  const HOSTS = new WeakMap();

  /* ------------------------------------------------------------- helpers --- */
  function num(v) { const n = Number(v); return isFinite(n) && n > 0 ? n : 0; }

  function clampTo(v, lo, hi) {
    if (hi < lo) return (lo + hi) / 2;
    return v < lo ? lo : v > hi ? hi : v;
  }

  function hash32(s) {
    let h = 2166136261;
    s = String(s);
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return h >>> 0;
  }

  function statusOf(v) {
    const s = String(v == null ? "" : v).toLowerCase();
    if (RUNNING[s] || s === "done" || s === "error") return s;
    if (s === "run" || s === "running" || s === "ok") return s === "ok" ? "done" : "streaming";
    if (s === "err" || s === "fail" || s === "failed") return "error";
    if (s === "retry" || s === "pending" || s === "wait" || s === "waiting") return "queued";
    return "done";
  }

  function fmtWait(min) {
    const m = num(min);
    if (!m) return "—";
    if (m < 60) return Math.round(m) + "m";
    const h = Math.floor(m / 60), rem = Math.round(m % 60);
    if (h < 24) return h + "h" + (rem ? rem + "m" : "");
    return Math.floor(h / 24) + "d" + (h % 24) + "h";
  }

  function fmtTps(v) { const n = num(v); return n ? (n >= 100 ? Math.round(n) : n.toFixed(1)) : "—"; }

  function tokensOf(ctx, v) {
    if (ctx.fmtTokens) return ctx.fmtTokens(v);
    const n = num(v);
    return n >= 1e6 ? (n / 1e6).toFixed(1) + "M" : n >= 1e3 ? (n / 1e3).toFixed(1) + "K" : String(Math.round(n));
  }

  // The SVG hexagon the hive sits in; shared by every hive so it is defined once.
  const HEX_POINTS = "50,3 93,27 93,83 50,107 7,83 7,27";
  const VIEW = "0 0 100 110";

  /* --------------------------------------------------------------- model --- */
  function buildModel(ctx) {
    const data = ctx.data || {};
    const meta = function (key) {
      const m = ctx.providerMeta ? ctx.providerMeta(key) : null;
      return m || { name: String(key), color: "#8b7cf6", icon: "" };
    };
    const providerOf = function (s) {
      const key = ctx.providerOfModel ? ctx.providerOfModel(s.model, s.provider) : (s.provider || "unknown");
      return String(key == null || key === "" ? "unknown" : key);
    };

    const hives = new Map();
    function ensure(key) {
      if (!hives.has(key)) {
        const m = meta(key);
        hives.set(key, {
          key: key, name: m.name || key, color: m.color || "#8b7cf6", icon: m.icon || "",
          active: 0, failed: 0, tokens: 0, bees: [], other: key === OTHER,
          quota: null, plan: "", balance: "", account: ""
        });
      }
      return hives.get(key);
    }

    // Providers from the quota ledger come first, so a hive with no session in
    // flight still shows its ring.
    const quotas = Array.isArray(ctx.quotas) ? ctx.quotas
      : (Array.isArray(data.quotas) ? data.quotas : []);
    quotas.forEach(function (q) {
      if (!q || !q.provider) return;
      const h = ensure(String(q.provider));
      const w = (Array.isArray(q.windows) ? q.windows : [])[0];
      if (!h.quota && w) {
        h.quota = {
          name: String(w.name || "额度"),
          used: clampTo(num(w.used), 0, 100),
          resetsIn: w.resetsIn
        };
      }
      if (!h.plan && q.plan) h.plan = String(q.plan);
      if (!h.balance && q.balance) h.balance = String(q.balance);
      if (!h.account && q.name) h.account = String(q.name);
    });

    // Sessions → bees. The live rows are the tail of the same list, so an id
    // seen once wins and duplicate ids never double up.
    const rows = [];
    const seen = Object.create(null);
    const push = function (s) {
      if (!s || !s.id) return;
      const id = String(s.id);
      if (seen[id]) return;
      seen[id] = 1;
      rows.push(s);
    };
    (Array.isArray(data.sessions) ? data.sessions : []).forEach(push);
    (Array.isArray(data.recent) ? data.recent : []).forEach(push);

    let maxTokens = 1;
    rows.forEach(function (s) { maxTokens = Math.max(maxTokens, num(s.tokens)); });

    const bees = rows.map(function (s) {
      const tokens = num(s.tokens);
      const subs = (Array.isArray(s.subagents) ? s.subagents : []).slice(0, MAX_SUBS).map(function (sub, i) {
        return {
          id: String((sub && sub.id) || (String(s.id) + "-sub-" + i)),
          name: String((sub && sub.name) || "子代理 " + (i + 1)),
          agent: String((sub && sub.agent) || s.agent || "unknown"),
          model: String((sub && sub.model) || "—"),
          status: statusOf(sub && sub.status),
          tps: num(sub && sub.tps)
        };
      });
      return {
        id: String(s.id),
        title: String(s.title || "会话 " + String(s.id).slice(0, 6)),
        agent: String(s.agent || "unknown"),
        provider: providerOf(s),
        model: String(s.model || "—"),
        group: String(s.group || ""),
        status: statusOf(s.status),
        tokens: tokens,
        tps: num(s.tps),
        ttft: num(s.ttft),
        tries: Array.isArray(s.tries) ? s.tries.length : 0,
        fallbacks: num(s.fallbacks),
        startedAt: num(s.startedAt),
        subs: subs,
        size: 6 + Math.sqrt(tokens / maxTokens) * 10
      };
    });

    bees.forEach(function (b) {
      const h = ensure(b.provider);
      h.bees.push(b);
      if (RUNNING[b.status]) h.active++;
      if (b.status === "error") h.failed++;
      h.tokens += b.tokens;
    });

    const ranked = Array.from(hives.values()).sort(function (a, b) {
      return b.active - a.active || b.tokens - a.tokens || String(a.key).localeCompare(String(b.key));
    });
    const top = ranked.slice(0, MAX_HIVES);
    const rest = ranked.slice(MAX_HIVES).filter(function (h) { return h.bees.length; });

    let list = top;
    if (rest.length) {
      const other = {
        key: OTHER, name: "其他", color: "", icon: "", other: true,
        active: 0, failed: 0, tokens: 0, bees: [], quota: null, plan: "", balance: "", account: ""
      };
      rest.forEach(function (h) {
        other.bees = other.bees.concat(h.bees);
        other.active += h.active;
        other.failed += h.failed;
        other.tokens += h.tokens;
      });
      list = top.concat([other]);
    }

    let subCount = 0, running = 0;
    bees.forEach(function (b) {
      subCount += b.subs.length;
      if (RUNNING[b.status]) running++;
    });

    return {
      hives: list, bees: bees, maxTokens: maxTokens, subCount: subCount, running: running,
      empty: list.length === 0,
      sig: list.map(function (h) {
        return [h.key, h.bees.length, h.active, h.tokens, h.quota ? h.quota.used : ""].join(":");
      }).join("|") + "#" + bees.map(function (b) {
        return [b.id, b.status, Math.round(b.size * 10), b.subs.length, b.subs.map(function (s) { return s.status; }).join("")].join(",");
      }).join("|")
    };
  }

  /* -------------------------------------------------------------- layout --- */
  // Deterministic meadow: at most three hives per row, odd rows nudged half a
  // step so the grid reads as a hex field. Sizes and orbit radii shrink with
  // the stage so every bee stays on the grass.
  function layout(W, H, n) {
    const rows = n <= 3 ? 1 : 2;
    const counts = [];
    const base = Math.floor(n / rows), extra = n % rows;
    for (let r = 0; r < rows; r++) counts.push(base + (r < extra ? 1 : 0));
    const widest = Math.max.apply(null, counts);
    const cellW = W / widest, cellH = H / rows;
    const hex = Math.max(34, Math.min(96, Math.min(cellW * 0.46, cellH * 0.42)));
    const orbit = Math.max(14, Math.min(hex * 0.5 + 22, Math.min(cellW, cellH) * 0.5 - 6));
    const padX = Math.min(W * 0.26, orbit + hex * 0.5 + 6);
    const padY = Math.min(H * 0.28, orbit + hex * 0.62 + 4);
    const slots = [];
    counts.forEach(function (c, r) {
      const spacing = W / (c + 1);
      const shift = (r % 2 === 1) ? spacing * 0.3 : 0;
      const y = cellH * (r + 0.5);
      for (let i = 0; i < c; i++) {
        slots.push({
          x: clampTo(spacing * (i + 1) + shift, padX, W - padX),
          y: clampTo(y, padY, H - padY)
        });
      }
    });
    return { rows: rows, hex: Math.round(hex), orbit: Math.round(orbit), slots: slots };
  }

  /* ---------------------------------------------------------------- paint --- */
  function esc(ctx, v) {
    if (ctx.esc) return ctx.esc(v);
    return String(v == null ? "" : v)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function css(v) {
    const s = String(v == null ? "" : v);
    return NUMERIC.test(s) || /^(var\(--[a-z0-9-]+\)|#[0-9a-f]{3,8})$/i.test(s.trim()) ? s.trim() : "";
  }

  function hexSVG() {
    return '<svg class="bees-hex" viewBox="' + VIEW + '" aria-hidden="true" focusable="false">' +
        '<polygon points="' + HEX_POINTS + '"/>' +
        '<polygon class="bees-hex-in" points="' + HEX_POINTS + '"/>' +
      "</svg>";
  }

  function quotaSVG(h) {
    if (!h.quota) return "";
    const used = clampTo(h.quota.used, 0, 100);
    return '<svg class="bees-ring" viewBox="' + VIEW + '" aria-hidden="true" focusable="false">' +
        '<circle class="bees-ring-track" cx="50" cy="55" r="47"/>' +
        '<circle class="bees-ring-arc" cx="50" cy="55" r="47" pathLength="100" ' +
          'stroke-dasharray="' + used.toFixed(1) + ' 100"/>' +
      "</svg>";
  }

  function hiveHTML(ctx, h, slot, L, ctxEsc) {
    const label = h.name + " · " + h.bees.length + " 只蜜蜂 · " + h.active + " 个活跃会话";
    const icon = h.icon && ctx.providerIcon ? String(ctx.providerIcon(h.key) || "") : "";
    let core = '<span class="bees-hive-core">';
    if (icon) core += '<img class="bees-hive-icon" src="' + ctxEsc(icon) + '" alt="">';
    core += '<b class="bees-hive-name">' + ctxEsc(h.name) + "</b>";
    core += '<span class="bees-hive-count">' + (h.active ? h.active + " 活跃" : h.bees.length ? h.bees.length + " 只" : "空闲") + "</span>";
    if (h.quota) core += '<span class="bees-hive-quota">' + Math.round(h.quota.used) + "%</span>";
    core += "</span>";

    return '<button type="button" class="bees-hive' + (h.other ? " is-other" : "") + '"' +
      ' data-hive="' + ctxEsc(h.key) + '"' +
      ' style="left:' + Math.round(slot.x) + "px;top:" + Math.round(slot.y) + "px;--bees-hex:" + L.hex + "px;" +
        (h.color ? "--bees-hc:" + css(h.color) + ";" : "") + '"' +
      ' aria-label="' + ctxEsc(label) + '">' + hexSVG() + quotaSVG(h) + core + "</button>";
  }

  // One orbit: the slot anchors at the hive centre, the orbit spins, the flit
  // carries the radius and cancels the orbit's rotation so the bee stays upright.
  function beeHTML(ctx, spec, hiveKey, radius, dur, delay, extraClass, ctxEsc, origin) {
    const size = Math.max(5, Math.round(spec.size * 10) / 10);
    const hash = hash32(spec.id);
    const a0 = Math.round((hash % 3600) / 10);
    const buzz = (1.1 + (hash % 90) / 100).toFixed(2);
    const flap = (0.16 + (hash % 14) / 100).toFixed(2);
    const spin = "--bees-dur:" + dur + "s;--bees-delay:" + delay + "s";
    const anchor = origin ? "left:" + Math.round(origin.x) + "px;top:" + Math.round(origin.y) + "px" : "";
    return '<span class="bees-slot"' + (anchor ? ' style="' + anchor + '"' : "") + ">" +
        '<span class="bees-orbit" style="' + spin + '">' +
          '<span class="bees-flit" style="--bees-r:' + radius + "px;--bees-a0:" + a0 + "deg;" + spin + '">' +
            '<button type="button" class="bees-bee' + (extraClass || "") + '"' +
              ' data-bee="' + ctxEsc(spec.id) + '" data-hive="' + ctxEsc(hiveKey) + '"' +
              ' data-status="' + spec.status + '"' +
              ' style="--bees-s:' + size + "px;--bees-c:" + css(agentColor(ctx, spec.agent)) + ";" +
                "--bees-buzz:" + buzz + "s;--bees-flap:" + flap + 's"' +
              ' aria-label="' + ctxEsc(spec.label) + '">' +
              '<span class="bees-wings"><i></i><i></i></span>' +
              '<span class="bees-body"></span>' +
              '<span class="bees-state"></span>' +
            "</button>" +
            (spec.subs || "") +
          "</span>" +
        "</span>" +
      "</span>";
  }

  function agentColor(ctx, agent) {
    const m = ctx.agentMeta ? ctx.agentMeta(agent) : null;
    return (m && m.color) || "#8b7cf6";
  }

  function buildMeadow(ctx, field, model, L) {
    const ctxEsc = function (v) { return esc(ctx, v); };
    let html = '<div class="bees-ground" aria-hidden="true"></div>';
    model.hives.forEach(function (h, i) {
      const slot = L.slots[Math.min(i, L.slots.length - 1)];
      html += hiveHTML(ctx, h, slot, L, ctxEsc);
      h.bees.forEach(function (b, j) {
        const hash = hash32(b.id);
        const ring = Math.round((j % 2 ? L.orbit : L.orbit * 0.66) + Math.floor(j / 4) * 7);
        const dur = (5.4 + (hash % 42) / 10).toFixed(1);
        const delay = (-(hash % 90) / 10).toFixed(1);
        // Subagents circle inside the parent's own ring, so the pair still fits
        // the grass the layout reserved for this hive.
        const subRadius = b.subs.length ? Math.max(8, Math.min(ring * 0.45, 9 + b.size * 1.1)) : 0;
        const radius = Math.max(8, ring - subRadius);
        let subs = "";
        b.subs.forEach(function (sub) {
          const sHash = hash32(sub.id);
          subs += beeHTML(ctx, {
            id: sub.id, size: b.size * 0.6, agent: sub.agent, status: sub.status,
            label: sub.name + " · 子代理 · " + sub.model
          }, h.key, Math.round(subRadius),
            (3 + (sHash % 22) / 10).toFixed(1), (-(sHash % 60) / 10).toFixed(1), " is-sub", ctxEsc);
        });
        html += beeHTML(ctx, {
          id: b.id, size: b.size, agent: b.agent, status: b.status,
          label: b.title + " · " + STATUS_LABEL[b.status] + " · " + tokensOf(ctx, b.tokens) + " tokens",
          subs: subs
        }, h.key, radius, dur, delay, "", ctxEsc, slot);
      });
    });
    field.innerHTML = html;
  }

  /* --------------------------------------------------------------- panel --- */
  function quotaBar(h) {
    if (!h.quota) return '<i class="bees-row-bar is-none"><b></b></i>';
    const used = clampTo(h.quota.used, 0, 100);
    const lv = used >= 90 ? "bad" : used >= 70 ? "warn" : "ok";
    return '<i class="bees-row-bar" data-lv="' + lv + '"><b style="width:' + used.toFixed(1) + '%"></b></i>';
  }

  function sideHTML(ctx, st, model) {
    const ctxEsc = function (v) { return esc(ctx, v); };
    let html = '<div class="bees-side-head">' +
        '<span class="bees-side-title">BEEHIVE</span>' +
        '<span class="bees-side-note">数据真实 · 表现游戏化</span>' +
      "</div>";

    html += '<div class="bees-stats">' +
        '<div class="bees-stat"><span>蜂巢</span><b>' + model.hives.length + "</b><small>providers</small></div>" +
        '<div class="bees-stat"><span>活跃</span><b>' + model.running + "</b><small>sessions</small></div>" +
        '<div class="bees-stat"><span>蜜蜂</span><b>' + model.bees.length + "</b><small>+" + model.subCount + " 子代理</small></div>" +
      "</div>";

    let rows = "";
    model.hives.forEach(function (h) {
      const quota = h.quota ? Math.round(h.quota.used) + "% " + h.quota.name
        : h.balance ? h.balance : h.plan || "—";
      const icon = h.icon && ctx.providerIcon ? String(ctx.providerIcon(h.key) || "") : "";
      rows += '<button type="button" class="bees-row' + (h.other ? " is-other" : "") + '" data-hive="' + ctxEsc(h.key) + '"' +
          (h.color ? ' style="--bees-hc:' + css(h.color) + '"' : "") + ">" +
          (icon ? '<img class="bees-row-icon" src="' + ctxEsc(icon) + '" alt="">' : '<i class="bees-row-dot"></i>') +
          '<span class="bees-row-main"><b>' + ctxEsc(h.name) + "</b>" +
            "<small>" + h.active + " 活跃 · " + h.bees.length + " 只 · " + ctxEsc(tokensOf(ctx, h.tokens)) + " tokens</small></span>" +
          '<span class="bees-row-quota">' + ctxEsc(quota) + "</span>" +
          quotaBar(h) +
        "</button>";
    });
    html += '<div class="bees-list"><span class="bees-list-title">蜂巢排行 · 活跃优先</span>' + rows + "</div>";

    html += pinHTML(ctx, st, model, ctxEsc);

    html += '<p class="bees-hint">悬停蜜蜂或蜂巢看细节 · 点击钉选 · 再点一次取消</p>';
    return html;
  }

  function pinHTML(ctx, st, model, ctxEsc) {
    const pin = st.pin;
    if (!pin) {
      return '<div class="bees-pin is-empty"><span>未钉选</span>' +
        "<small>悬停看细节，点击蜂巢钉选它的蜜蜂，点击蜜蜂钉选该会话。</small></div>";
    }
    if (pin.type === "hive") {
      const h = model.hives.filter(function (x) { return x.key === pin.key; })[0];
      if (!h) return '<div class="bees-pin is-empty"><span>未钉选</span></div>';
      let list = "";
      h.bees.slice().sort(function (a, b) { return b.tokens - a.tokens; }).forEach(function (b) {
        list += '<button type="button" class="bees-pin-bee" data-bee="' + ctxEsc(b.id) + '" data-hive="' + ctxEsc(h.key) + '"' +
            ' data-status="' + b.status + '" style="--bees-c:' + css(agentColor(ctx, b.agent)) + '">' +
            '<i class="bees-dot"></i><span>' + ctxEsc(b.title) + "</span>" +
            "<small>" + STATUS_LABEL[b.status] + " · " + ctxEsc(tokensOf(ctx, b.tokens)) + "</small>" +
          "</button>";
      });
      return '<div class="bees-pin">' +
          '<div class="bees-pin-head"><b>' + ctxEsc(h.name) + "</b><span>已钉选蜂巢</span></div>" +
          '<div class="bees-pin-meta">' + h.active + " 活跃 · " + h.bees.length + " 只蜜蜂 · " + h.failed + " 失败 · " +
            ctxEsc(tokensOf(ctx, h.tokens)) + " tokens" +
            (h.quota ? " · " + h.quota.name + " " + Math.round(h.quota.used) + "%（" + ctxEsc(fmtWait(h.quota.resetsIn)) + " 后重置）" : "") +
          "</div>" +
          (list || '<p class="bees-pin-none">该蜂巢暂无蜜蜂</p>') +
        "</div>";
    }
    const b = model.bees.filter(function (x) { return x.id === pin.key; })[0];
    if (!b) return '<div class="bees-pin is-empty"><span>未钉选</span></div>';
    const hive = model.hives.filter(function (x) { return x.key === b.provider; })[0];
    let subs = "";
    if (b.subs.length) {
      subs = '<div class="bees-pin-subs">' + b.subs.map(function (s) {
        return '<span class="bees-pin-sub"><i class="bees-dot" data-status="' + s.status + '"></i>' +
          ctxEsc(s.name) + " · " + ctxEsc(s.model) + " · " + esc(ctx, STATUS_LABEL[s.status]) + "</span>";
      }).join("") + "</div>";
    }
    return '<div class="bees-pin">' +
        '<div class="bees-pin-head"><b>' + ctxEsc(b.title) + "</b><span>已钉选会话</span></div>" +
        '<div class="bees-pin-meta">' + ctxEsc(b.agent) + " · " + ctxEsc(b.model) + " · " +
          ctxEsc((hive && hive.name) || b.provider) + "</div>" +
        '<div class="bees-pin-grid">' +
          "<span>状态</span><b>" + STATUS_LABEL[b.status] + "</b>" +
          "<span>tokens</span><b>" + ctxEsc(tokensOf(ctx, b.tokens)) + "</b>" +
          "<span>TPS</span><b>" + ctxEsc(fmtTps(b.tps)) + "</b>" +
          "<span>回合</span><b>" + b.tries + (b.fallbacks ? " · 改道 " + b.fallbacks : "") + "</b>" +
        "</div>" + subs +
      "</div>";
  }

  /* ----------------------------------------------------------- highlight --- */
  // One focus at a time: a hovered element wins over a pinned one.
  function focusOf(st) {
    const src = st.hover || st.pin;
    if (!src) return null;
    if (src.type === "hive") return { hive: src.key, bee: null, src: src };
    return { hive: src.hive || null, bee: src.key, src: src };
  }

  function applyState(st) {
    if (!st.meadow) return;
    const f = st.focus = focusOf(st);
    const pin = st.pin;
    const hives = st.meadow.querySelectorAll(".bees-hive");
    for (let i = 0; i < hives.length; i++) {
      const el = hives[i];
      const key = el.dataset.hive;
      const pinned = !!(pin && pin.type === "hive" && pin.key === key);
      const inFocus = !f || f.hive === key;
      el.classList.toggle("is-hot", !!(f && f.hive === key));
      el.classList.toggle("is-pinned", pinned);
      el.classList.toggle("is-dim", !inFocus);
    }
    const bees = st.meadow.querySelectorAll(".bees-bee");
    for (let i = 0; i < bees.length; i++) {
      const el = bees[i];
      const id = el.dataset.bee;
      const pinned = !!(pin && pin.type === "bee" && pin.key === id);
      const inFocus = !f || f.hive === el.dataset.hive || f.bee === id;
      el.classList.toggle("is-hot", !!(f && f.bee === id));
      el.classList.toggle("is-lit", inFocus && !!(f || pinned));
      el.classList.toggle("is-pinned", pinned);
      el.classList.toggle("is-dim", !inFocus);
    }
  }

  function hideTip(st) {
    if (st.tip) { st.tip.hidden = true; st.tip.dataset.owner = ""; }
  }

  function showTip(st, el, x, y) {
    const ctx = st.ctx || {};
    const model = st.model;
    if (!st.tip || !model || !el) return;
    const ctxEsc = function (v) { return esc(ctx, v); };
    let html = "";
    if (el.classList.contains("bees-bee")) {
      const id = el.dataset.bee;
      const b = model.bees.filter(function (x) { return x.id === id; })[0];
      if (!b) { hideTip(st); return; }
      const hive = model.hives.filter(function (x) { return x.key === b.provider; })[0];
      html = "<b>" + ctxEsc(b.title) + "</b>" +
        "<span>" + ctxEsc(b.agent) + " · " + ctxEsc(b.model) + "</span>" +
        "<span>蜂巢 " + ctxEsc((hive && hive.name) || b.provider) + "</span>" +
        "<span>tokens <b>" + ctxEsc(tokensOf(ctx, b.tokens)) + "</b> · TPS <b>" + ctxEsc(fmtTps(b.tps)) + "</b></span>" +
        "<span>状态 <b>" + STATUS_LABEL[b.status] + "</b> · 回合 <b>" + b.tries + "</b>" +
          (b.fallbacks ? " · 改道 " + b.fallbacks : "") + "</span>" +
        "<span>子代理 <b>" + b.subs.length + "</b>" + (b.subs.length ? "（" + ctxEsc(b.subs.map(function (s) { return s.name; }).join("、")) + "）" : "") + "</span>";
    } else {
      const key = el.dataset.hive;
      const h = model.hives.filter(function (x) { return x.key === key; })[0];
      if (!h) { hideTip(st); return; }
      html = "<b>" + ctxEsc(h.name) + (h.other ? "（其他）" : "") + "</b>" +
        "<span>" + h.active + " 个活跃 · " + h.bees.length + " 只蜜蜂 · " + h.failed + " 失败</span>" +
        "<span>累计 <b>" + ctxEsc(tokensOf(ctx, h.tokens)) + "</b> tokens</span>" +
        (h.quota
          ? "<span>额度 " + ctxEsc(h.quota.name) + " <b>" + Math.round(h.quota.used) + "%</b> · " +
            ctxEsc(fmtWait(h.quota.resetsIn)) + " 后重置</span>"
          : "<span>" + ctxEsc(h.balance || h.plan || "无额度数据") + "</span>") +
        "<span>点击钉选该蜂巢的蜜蜂</span>";
    }
    st.tip.innerHTML = html;
    st.tip.hidden = false;
    st.tip.dataset.owner = el.dataset.bee || el.dataset.hive || "";
    const rect = st.root.getBoundingClientRect();
    const clamp = ctx.clamp || clampTo;
    const tw = st.tip.offsetWidth || 190;
    st.tip.style.left = (clamp(x - rect.left, tw / 2 + 6, Math.max(tw / 2 + 6, rect.width - tw / 2 - 6)) - tw / 2) + "px";
    st.tip.style.top = clamp(y - rect.top - 12, st.tip.offsetHeight + 8, Math.max(st.tip.offsetHeight + 8, rect.height - 6)) + "px";
    st.tip.style.transform = (y - rect.top - 12 < st.tip.offsetHeight + 8) ? "translateY(0)" : "translateY(-100%)";
  }

  /* --------------------------------------------------------------- events --- */
  function pick(st, target) {
    if (!target || !target.closest) return null;
    const bee = target.closest(".bees-bee");
    if (bee && st.meadow && st.meadow.contains(bee)) return bee;
    const hive = target.closest(".bees-hive");
    if (hive && st.meadow && st.meadow.contains(hive)) return hive;
    return null;
  }

  // Every pinnable node speaks the same language: data-bee pins a session,
  // data-hive pins a hive. That covers meadow bees/hives and the side list.
  function targetOf(target) {
    if (!target || !target.closest) return null;
    const el = target.closest("[data-bee],[data-hive]");
    if (!el || !el.dataset) return null;
    if (el.dataset.bee) return { type: "bee", key: el.dataset.bee, hive: el.dataset.hive || null, el: el };
    if (el.dataset.hive) return { type: "hive", key: el.dataset.hive, hive: el.dataset.hive, el: el };
    return null;
  }

  function togglePin(st, hit) {
    const same = st.pin && st.pin.type === hit.type && st.pin.key === hit.key;
    st.pin = same ? null : { type: hit.type, key: hit.key, hive: hit.hive };
    hideTip(st);
    applyState(st);
    paintSide(st);
  }

  function bind(root, st) {
    root.addEventListener("pointermove", function (e) {
      const el = pick(st, e.target);
      if (!el) {
        if (st.hover) { st.hover = null; applyState(st); }
        hideTip(st);
        return;
      }
      const type = el.classList.contains("bees-bee") ? "bee" : "hive";
      const key = type === "bee" ? el.dataset.bee : el.dataset.hive;
      if (!st.hover || st.hover.type !== type || st.hover.key !== key) {
        st.hover = { type: type, key: key, hive: el.dataset.hive };
        applyState(st);
      }
      showTip(st, el, e.clientX, e.clientY);
    });
    root.addEventListener("pointerleave", function () {
      if (st.hover) { st.hover = null; applyState(st); }
      hideTip(st);
    });
    root.addEventListener("click", function (e) {
      const hit = targetOf(e.target);
      if (hit) togglePin(st, hit);
    });
    root.addEventListener("keydown", function (e) {
      if (e.key !== "Enter" && e.key !== " ") return;
      // Buttons already turn Enter/Space into a click; this covers the few
      // nodes a browser leaves alone and stops the page from scrolling.
      const hit = targetOf(e.target);
      if (hit) { e.preventDefault(); e.stopPropagation(); togglePin(st, hit); }
    });
  }

  function paintSide(st) {
    if (!st.side || !st.model) return;
    st.side.innerHTML = sideHTML(st.ctx || {}, st, st.model);
    st.sideSig = st.painted + "~" + (st.pin ? st.pin.type + ":" + st.pin.key : "-");
  }

  /* ----------------------------------------------------------- lifecycle --- */
  function stateFor(host) {
    let st = HOSTS.get(host);
    if (!st) {
      st = {
        host: host, root: null, meadow: null, side: null, tip: null, empty: null,
        model: null, ctx: null, painted: "", sideSig: "", hover: null, pin: null,
        focus: null, lastEmpty: null, motion: "full"
      };
      HOSTS.set(host, st);
    }
    return st;
  }

  function mount(host, st) {
    host.innerHTML = "";
    const root = document.createElement("div");
    root.className = "bees-root";
    root.innerHTML =
      '<div class="bees-meadow">' +
        '<div class="bees-field"></div>' +
        '<div class="bees-empty" hidden><b>暂无蜂巢</b>' +
          "<span>Magpie 报告配额或会话之后，蜂巢与蜜蜂会出现在草地上。</span></div>" +
      "</div>" +
      '<aside class="bees-side" aria-label="蜂巢统计"></aside>' +
      '<div class="bees-tip" role="tooltip" hidden></div>';
    host.appendChild(root);
    st.root = root;
    st.meadow = root.querySelector(".bees-meadow");
    st.side = root.querySelector(".bees-side");
    st.tip = root.querySelector(".bees-tip");
    st.empty = root.querySelector(".bees-empty");
    st.hover = null;
    st.pin = null;
    st.painted = "";
    st.sideSig = "";
    st.lastEmpty = null;
    bind(root, st);
  }

  function measure(st) {
    let w = 0, h = 0;
    if (st.meadow && st.meadow.getBoundingClientRect) {
      const r = st.meadow.getBoundingClientRect();
      if (r.width > 60 && r.height > 60) { w = r.width; h = r.height; }
    }
    if (!w || !h) {
      const host = st.host && st.host.getBoundingClientRect ? st.host.getBoundingClientRect() : null;
      if (host && host.width > 60 && host.height > 60) { w = host.width; h = host.height; }
    }
    return { w: w || FALLBACK_W, h: h || FALLBACK_H, real: !!(w && h) };
  }

  function render(host, ctx) {
    if (!host) return;
    ctx = ctx || {};
    const st = stateFor(host);
    st.ctx = ctx;
    st.motion = ctx.motion || "full";
    if (!st.root || !host.contains(st.root)) mount(host, st);
    st.root.dataset.motion = st.motion;

    const model = st.model = buildModel(ctx);
    const size = measure(st);
    const L = layout(size.w, size.h, Math.max(1, model.hives.length));
    const signature = [
      size.real ? Math.round(size.w) : "x", size.real ? Math.round(size.h) : "y",
      L.hex, L.orbit, st.motion, model.sig
    ].join("~");

    if (signature !== st.painted) {
      st.painted = signature;
      st.empty.hidden = !model.empty;
      const field = st.meadow.querySelector(".bees-field");
      if (field) {
        field.hidden = model.empty;
        if (model.empty) field.innerHTML = "";
        else buildMeadow(ctx, field, model, L);
      }
      if (model.empty) { st.pin = null; st.hover = null; hideTip(st); }
      paintSide(st);
    }
    applyState(st);
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews["bees"] = { title: "蜂巢", eyebrow: "BEEHIVE", render: render };
})();
