/* ==========================================================================
   Magpie Observatory — hero view module: cost treemap
   Provider → model cost structure as a squarified treemap (vanilla, no deps).
   Area = tokens (falls back to cost, then calls, when tokens are all zero).
   Registers window.ObservatoryViews["treemap"].
   ========================================================================== */
(function () {
  "use strict";

  const PAD = 5;            // stage padding around the map
  const GUT = 3;            // gutter between provider tiles
  const TILE_PAD = 4;       // model area inset inside a provider tile
  const MODEL_GUT = 3;      // gutter between model tiles
  const HEAD_H = 18;        // provider header strip height
  const MIN_LABEL_W = 58;   // a label needs at least this much room…
  const MIN_LABEL_H = 36;   // …otherwise the tile stays colour-only
  const MIN_MID_H = 22;     // name-only label threshold
  const MIN_HEAD_W = 84;    // a provider header needs this much width…
  const MIN_HEAD_H = 46;    // …and this much height before it eats the body
  const WIDE_HEAD_W = 132;  // above this the header can carry the share too
  const MAX_STAGGER = 18;

  // Per-host UI state (focus / hover / signature / last size) lives in closures.
  const states = new WeakMap();

  function num(v) { const n = Number(v); return isFinite(n) && n > 0 ? n : 0; }

  function px(v) { return (Math.round(v * 10) / 10) + "px"; }

  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

  function esc(ctx, s) {
    if (ctx && typeof ctx.esc === "function") return ctx.esc(s);
    return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }

  function count(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ","); }

  function fmtVal(ctx, unit, v) {
    if (unit === "tokens") return ctx && typeof ctx.fmtTokens === "function" ? ctx.fmtTokens(v) : count(v);
    if (unit === "cost") return ctx && typeof ctx.fmtMoney === "function" ? ctx.fmtMoney(v) : "$" + Number(v).toFixed(2);
    return count(v);
  }

  function pct(v, total) {
    if (!(total > 0)) return "0%";
    const p = (v / total) * 100;
    if (p >= 99.5) return "100%";
    if (p >= 10) return Math.round(p) + "%";
    if (p >= 1) return p.toFixed(1) + "%";
    if (p > 0) return p.toFixed(2) + "%";
    return "0%";
  }

  const UNIT_WORD = { tokens: "tokens", cost: "USD", calls: "次调用" };

  // ---------------------------------------------------------------- data ---

  function safeMeta(ctx, key) {
    try {
      if (ctx && typeof ctx.providerMeta === "function") {
        const m = ctx.providerMeta(key) || {};
        return { name: m.name || key, color: m.color || "var(--accent)", icon: m.icon || "" };
      }
    } catch (_) { /* fall through */ }
    return { name: key || "unknown", color: "var(--accent)", icon: "" };
  }

  function providerKey(ctx, row) {
    let key = "";
    try {
      if (ctx && typeof ctx.providerOfModel === "function") {
        key = ctx.providerOfModel(row && row.name, row && row.provider);
      }
    } catch (_) { key = ""; }
    key = String(key || (row && row.provider) || "unknown").trim().toLowerCase();
    return key || "unknown";
  }

  // "google/gemini-3-pro" inside the Google tile reads better as "gemini-3-pro".
  function displayName(name, key) {
    const s = String(name || "—");
    const i = s.indexOf("/");
    if (i > 0) {
      const head = s.slice(0, i).toLowerCase().replace(/[\s_]+/g, "-");
      if (head && (head === key || key.indexOf(head) === 0 || head.indexOf(key) === 0)) return s.slice(i + 1) || s;
    }
    return s;
  }

  function buildTree(ctx) {
    const data = ctx && ctx.data ? ctx.data : {};
    const models = Array.isArray(data.models) ? data.models : [];
    const logs = Array.isArray(ctx && ctx.logs) ? ctx.logs : [];

    let tokenSum = 0;
    for (let i = 0; i < models.length; i++) tokenSum += num(models[i] && models[i].tokens);
    const fromLogs = !models.length || tokenSum <= 0;   // no model ledger → aggregate requests

    const groups = new Map();
    function slot(key) {
      let g = groups.get(key);
      if (!g) { g = { key: key, entries: new Map() }; groups.set(key, g); }
      return g;
    }
    function add(g, name, part) {
      let e = g.entries.get(name);
      if (!e) { e = { name: name, label: displayName(name, g.key), tokens: 0, calls: 0, cost: 0 }; g.entries.set(name, e); }
      e.tokens += part.tokens; e.calls += part.calls; e.cost += part.cost;
    }

    if (!fromLogs) {
      for (let i = 0; i < models.length; i++) {
        const m = models[i];
        if (!m) continue;
        const v = num(m.tokens);
        if (v <= 0) continue;
        add(slot(providerKey(ctx, m)), String(m.name || m.model || "—"), { tokens: v, calls: 0, cost: 0 });
      }
    } else {
      for (let i = 0; i < logs.length; i++) {
        const row = logs[i];
        if (!row) continue;
        add(slot(providerKey(ctx, row)), String(row.model || "—"), {
          tokens: num(row.tokens), calls: 1, cost: num(row.cost)
        });
      }
    }

    let tokens = 0, cost = 0, calls = 0;
    groups.forEach(g => g.entries.forEach(e => { tokens += e.tokens; cost += e.cost; calls += e.calls; }));
    const unit = tokens > 0 ? "tokens" : (cost > 0 ? "cost" : "calls");

    const providers = [];
    groups.forEach(g => {
      const list = [];
      g.entries.forEach(e => {
        const v = e[unit];
        if (!(v > 0)) return;
        list.push({
          name: e.name, label: e.label, provider: g.key, value: v,
          tokens: e.tokens, calls: e.calls, cost: e.cost
        });
      });
      if (!list.length) return;
      list.sort((a, b) => b.value - a.value || String(a.name).localeCompare(String(b.name)));
      const total = list.reduce((a, m) => a + m.value, 0);
      const meta = safeMeta(ctx, g.key);
      providers.push({
        key: g.key, name: meta.name, color: meta.color, icon: meta.icon,
        value: total, models: list
      });
    });
    providers.sort((a, b) => b.value - a.value || String(a.key).localeCompare(String(b.key)));

    const total = providers.reduce((a, p) => a + p.value, 0);
    let modelCount = 0, topModel = null, topProvider = null;
    providers.forEach((p, pi) => {
      p.share = total ? p.value / total : 0;
      p.pi = pi;
      modelCount += p.models.length;
      p.models.forEach(m => {
        m.share = total ? m.value / total : 0;
        if (!topModel || m.value > topModel.value) { topModel = m; topModel.providerName = p.name; topModel.providerKey = p.key; }
      });
      if (!topProvider || p.value > topProvider.value) topProvider = p;
    });

    return {
      unit: unit, source: fromLogs ? "logs" : "models", total: total,
      providers: providers, modelCount: modelCount,
      topModel: topModel, topProvider: topProvider
    };
  }

  // -------------------------------------------------------------- layout ---

  function worstRatio(max, min, side, sum) {
    const s2 = sum * sum, side2 = side * side;
    return Math.max((side2 * max) / s2, s2 / (side2 * min));
  }

  // Squarified treemap: values sorted descending, rows laid along the short side.
  function squarify(values, rect) {
    const n = values.length;
    const out = [];
    if (!n || !(rect.w > 0) || !(rect.h > 0)) return out;
    let total = 0;
    for (let i = 0; i < n; i++) total += values[i];
    if (!(total > 0)) return out;
    const scale = (rect.w * rect.h) / total;
    const areas = [];
    for (let i = 0; i < n; i++) areas.push(values[i] * scale);

    let x = rect.x, y = rect.y, w = rect.w, h = rect.h, i = 0;
    while (i < n) {
      const side = Math.min(w, h);
      if (!(side > 0)) {
        for (let k = i; k < n; k++) out.push({ x: x, y: y, w: 0, h: 0 });
        break;
      }
      let rMax = areas[i], rMin = areas[i], sum = areas[i], end = i + 1;
      let worst = worstRatio(rMax, rMin, side, sum);
      while (end < n) {
        const a = areas[end];
        const nMax = a > rMax ? a : rMax, nMin = a < rMin ? a : rMin, nSum = sum + a;
        const nWorst = worstRatio(nMax, nMin, side, nSum);
        if (nWorst > worst) break;
        rMax = nMax; rMin = nMin; sum = nSum; worst = nWorst; end++;
      }
      if (w >= h) {
        const cw = sum / h;
        let cy = y;
        for (let k = i; k < end; k++) {
          const ch = areas[k] / cw;
          out.push({ x: x, y: cy, w: cw, h: ch });
          cy += ch;
        }
        x += cw; w -= cw;
      } else {
        const ch = sum / w;
        let cx = x;
        for (let k = i; k < end; k++) {
          const cw2 = areas[k] / ch;
          out.push({ x: cx, y: y, w: cw2, h: ch });
          cx += cw2;
        }
        y += ch; h -= ch;
      }
      i = end;
    }
    return out;
  }

  function gut(r, g) {
    return { x: r.x + g / 2, y: r.y + g / 2, w: Math.max(0, r.w - g), h: Math.max(0, r.h - g) };
  }

  function geometry(tree, st, w, h) {
    const map = { x: PAD, y: PAD, w: Math.max(0, w - PAD * 2), h: Math.max(0, h - PAD * 2) };
    const provs = st.focus ? tree.providers.filter(p => p.key === st.focus) : tree.providers;
    const rects = squarify(provs.map(p => p.value), map);
    const out = [];
    provs.forEach((p, i) => {
      const raw = rects[i];
      if (!raw) return;
      const tile = gut(raw, GUT);
      if (tile.w < 2 || tile.h < 2) return;
      const head = (tile.w >= MIN_HEAD_W && tile.h >= MIN_HEAD_H) ? HEAD_H : 0;
      const body = {
        x: TILE_PAD,
        y: head + TILE_PAD,
        w: Math.max(0, tile.w - TILE_PAD * 2),
        h: Math.max(0, tile.h - head - TILE_PAD * 2)
      };
      const mrects = squarify(p.models.map(m => m.value), body);
      const models = [];
      p.models.forEach((m, j) => {
        const r = mrects[j];
        if (!r) return;
        const t = gut(r, MODEL_GUT);
        if (t.w < 1.5 || t.h < 1.5) {         // keep the colour, drop the noise
          models.push({ m: m, x: r.x, y: r.y, w: Math.max(0.5, r.w), h: Math.max(0.5, r.h), j: j });
          return;
        }
        models.push({ m: m, x: t.x, y: t.y, w: t.w, h: t.h, j: j });
      });
      out.push({ p: p, x: tile.x, y: tile.y, w: tile.w, h: tile.h, head: head, models: models, i: i });
    });
    return out;
  }

  // Provider hue, stepped down in lightness per sibling; nothing hardcoded.
  // The ceiling stays low enough that --fg stays >4.5:1 on every brand hue.
  function modelMix(color, j, n) {
    const t = n <= 1 ? 1 : 1 - (j / (n - 1)) * 0.55;
    const p = Math.round(34 + t * 32);
    return "color-mix(in srgb, " + color + " " + p + "%, var(--card-2))";
  }

  // ------------------------------------------------------------- markup ---

  function tipText(ctx, tree, p, m) {
    const word = UNIT_WORD[tree.unit] || tree.unit;
    if (!m) {
      return p.name + " · " + fmtVal(ctx, tree.unit, p.value) + " " + word +
        " · " + pct(p.value, tree.total) + " · " + p.models.length + " 个模型";
    }
    return p.name + " · " + m.name + " · " + fmtVal(ctx, tree.unit, m.value) + " " + word +
      " · " + pct(m.value, tree.total);
  }

  function emptyHtml(tree, ctx) {
    const hasModels = !!(ctx && ctx.data && Array.isArray(ctx.data.models) && ctx.data.models.length);
    const hasLogs = !!(ctx && Array.isArray(ctx.logs) && ctx.logs.length);
    return '<div class="tree-board tree-empty"><div class="empty-state">' +
      '<b>还没有成本结构</b>' +
      (hasModels || hasLogs
        ? '<span>模型用量与请求流水都还没有可计量的 token / 费用。</span>'
        : '<span>视图会在 <code>data.models</code> 或 <code>logs</code> 到达后自动出现。</span>') +
      '<span>来源：用量账单的 <code>models</code>，缺失时回退到请求流水按 provider × model 聚合。</span>' +
      '</div></div>';
  }

  function crumbsHtml(ctx, st, tree) {
    if (!st.focus) {
      return '<span class="tree-crumb tree-crumb-on">全部</span>';
    }
    const p = tree.providers.filter(x => x.key === st.focus)[0];
    const name = p ? p.name : st.focus;
    const color = p ? p.color : "var(--accent)";
    return '<button class="tree-crumb" data-back="1" type="button">全部</button>' +
      '<span class="tree-crumb-sep">/</span>' +
      '<span class="tree-crumb-cur"><i style="background:' + esc(ctx, color) + '"></i>' +
      esc(ctx, name) + '</span>' +
      '<button class="tree-crumb-back" data-back="1" type="button" title="返回全部">↩ 返回</button>';
  }

  function statHtml(ctx, tree) {
    const word = UNIT_WORD[tree.unit] || tree.unit;
    const tp = tree.topProvider, tm = tree.topModel;
    return '<div class="tree-stats">' +
      '<div class="tree-stat"><small>总 ' + esc(ctx, word) + '</small><b>' + esc(ctx, fmtVal(ctx, tree.unit, tree.total)) + '</b></div>' +
      '<div class="tree-stat"><small>最大 provider</small><b title="' + esc(ctx, tp ? tp.name : "—") + '">' +
        esc(ctx, tp ? tp.name : "—") + ' <i>' + esc(ctx, tp ? pct(tp.value, tree.total) : "0%") + '</i></b></div>' +
      '<div class="tree-stat"><small>最大模型</small><b title="' + esc(ctx, tm ? tm.name : "—") + '">' +
        esc(ctx, tm ? tm.label : "—") + ' <i>' + esc(ctx, tm ? pct(tm.value, tree.total) : "0%") + '</i></b></div>' +
      '<div class="tree-stat"><small>模型数</small><b>' + tree.modelCount + '</b></div>' +
      '</div>';
  }

  function listHtml(ctx, st, tree) {
    const rows = tree.providers.map(p => {
      const on = st.focus === p.key;
      return '<button class="tree-row' + (on ? " tree-active" : "") + '" type="button" data-p="' + esc(ctx, p.key) + '"' +
        ' title="' + esc(ctx, tipText(ctx, tree, p)) + '" aria-pressed="' + (on ? "true" : "false") + '">' +
        '<span class="tree-row-top">' +
          '<i class="tree-row-dot" style="background:' + esc(ctx, p.color) + '"></i>' +
          '<span class="tree-row-name">' + esc(ctx, p.name) + '</span>' +
          '<span class="tree-row-share">' + esc(ctx, pct(p.value, tree.total)) + '</span>' +
        '</span>' +
        '<span class="tree-row-bar"><i style="width:' + (p.share * 100).toFixed(2) + '%;background:' + esc(ctx, p.color) + '"></i></span>' +
        '<span class="tree-row-sub">' + esc(ctx, fmtVal(ctx, tree.unit, p.value)) + ' · ' + p.models.length + ' 个模型</span>' +
      '</button>';
    }).join("");
    return '<aside class="tree-side">' +
      '<div class="tree-side-title"><span>COST TREEMAP</span><span>' + esc(ctx, UNIT_WORD[tree.unit] || tree.unit) + '</span></div>' +
      statHtml(ctx, tree) +
      '<div class="tree-list">' + rows + '</div>' +
      '<div class="tree-side-note">' + (st.focus ? "点击「全部」返回上一层" : "点击方块或列表下钻 provider") + '</div>' +
      '</aside>';
  }

  function tilesHtml(ctx, st, tree, geom) {
    return geom.map(t => {
      const p = t.p;
      const on = st.focus === p.key;
      const head = t.head
        ? '<span class="tree-head' + (t.w < WIDE_HEAD_W ? " tree-head-solo" : "") + '">' +
          '<b>' + esc(ctx, p.name) + '</b><i>' + esc(ctx, pct(p.value, tree.total)) + '</i></span>'
        : "";
      const solo = (!t.head && t.w >= MIN_LABEL_W && t.h >= MIN_LABEL_H)
        ? '<span class="tree-solo" title="' + esc(ctx, tipText(ctx, tree, p)) + '">' + esc(ctx, p.name) + '</span>' : "";
      const models = t.models.map(x => {
        const big = x.w >= MIN_LABEL_W && x.h >= MIN_LABEL_H;
        const mid = !big && x.w >= MIN_LABEL_W && x.h >= MIN_MID_H;
        const share = pct(x.m.value, tree.total);
        let body = "";
        if (big) {
          body = '<b class="tree-model-name">' + esc(ctx, x.m.label) + '</b>' +
            '<i class="tree-model-share">' + esc(ctx, share) +
            (x.h >= 48 ? ' · ' + esc(ctx, fmtVal(ctx, tree.unit, x.m.value)) : "") + '</i>';
        } else if (mid) {
          body = '<b class="tree-model-name">' + esc(ctx, x.m.label) + '</b>';
        }
        const cls = "tree-model" + (big ? " tree-tall" : mid ? " tree-mid" : " tree-tiny") + (on ? " tree-in" : "");
        return '<div class="' + cls + '" data-p="' + esc(ctx, p.key) + '" data-m="' + esc(ctx, x.m.name) + '"' +
          ' style="left:' + px(x.x) + ";top:" + px(x.y) + ";width:" + px(x.w) + ";height:" + px(x.h) +
          ";--tree-mix:" + modelMix(p.color, x.j, t.models.length) + ";--tree-d:" + Math.min(x.j, MAX_STAGGER) + '"' +
          ' title="' + esc(ctx, tipText(ctx, tree, p, x.m)) + '">' + body + '</div>';
      }).join("");
      return '<div class="tree-provider' + (on ? " tree-focused" : "") + '" data-p="' + esc(ctx, p.key) + '"' +
        ' role="button" tabindex="0" aria-label="' + esc(ctx, on ? "返回全部" : "下钻 " + p.name) + '"' +
        ' style="left:' + px(t.x) + ";top:" + px(t.y) + ";width:" + px(t.w) + ";height:" + px(t.h) +
        ";--tree-mix:color-mix(in srgb, " + p.color + " 20%, var(--card))" +
        ";--tree-d:" + Math.min(t.i, MAX_STAGGER) + '"' +
        ' title="' + esc(ctx, tipText(ctx, tree, p)) + '">' +
        head + solo + models + '</div>';
    }).join("");
  }

  function barHtml(ctx, st, tree) {
    return '<nav class="tree-crumbs" aria-label="成本层级">' + crumbsHtml(ctx, st, tree) + '</nav>' +
      '<span class="tree-unit">面积 · ' + esc(ctx, UNIT_WORD[tree.unit] || tree.unit) + '</span>';
  }

  // The shell (bar + empty map + side panel) is painted first so the map can be
  // measured; tiles are poured in afterwards, which is what keeps every tile
  // inside the map box.
  function shellHtml(ctx, st, tree, motion) {
    const anim = motion === "off" ? "" : (motion === "soft" ? " tree-anim tree-soft" : " tree-anim");
    return '<div class="tree-board' + anim + '">' +
      '<div class="tree-main">' +
        '<div class="tree-bar">' + barHtml(ctx, st, tree) + '</div>' +
        '<div class="tree-map" role="group" aria-label="成本树图"></div>' +
      '</div>' +
      listHtml(ctx, st, tree) +
      '</div>' +
      '<div class="tree-tip" hidden></div>';
  }

  // --------------------------------------------------------------- state ---

  function stateFor(host) {
    let st = states.get(host);
    if (!st) {
      st = { focus: null, hover: "", sig: "", w: 0, h: 0, ctx: null, tree: null, ro: null, bound: false, mapBound: null };
      states.set(host, st);
    }
    return st;
  }

  function signature(tree, st, w, h, motion) {
    const parts = [tree.unit, tree.source, String(Math.round(tree.total)), st.focus || "", w + "x" + h, motion];
    tree.providers.forEach(p => {
      parts.push(p.key + ":" + Math.round(p.value) + ":" + p.models.map(m => m.name + "=" + Math.round(m.value)).join(","));
    });
    return parts.join("~");
  }

  function applyHover(host, st) {
    const hv = st.hover || "";
    const map = host.querySelector(".tree-map");
    if (map) map.dataset.hover = hv;
    host.querySelectorAll(".tree-provider").forEach(el => {
      el.classList.toggle("tree-on", !!hv && el.dataset.p === hv);
    });
    host.querySelectorAll(".tree-row").forEach(el => {
      el.classList.toggle("tree-on", !!hv && el.dataset.p === hv);
    });
  }

  function watch(host, st) {
    if (st.ro || typeof ResizeObserver !== "function") return;
    st.ro = new ResizeObserver(() => {
      const box = host.getBoundingClientRect();
      const w = Math.round(box.width), h = Math.round(box.height);
      if (w === st.w && h === st.h) return;
      st.w = w; st.h = h; st.sig = "";
      render(host, st.ctx);
    });
    st.ro.observe(host);
  }

  // ---------------------------------------------------------------- bind ---

  function bind(host, st) {
    const map = host.querySelector(".tree-map");
    const tip = host.querySelector(".tree-tip");

    const moveTip = (clientX, clientY, html) => {
      if (!tip || !html) return;
      if (tip.hidden || tip.innerHTML !== html) {
        tip.innerHTML = html;
        tip.hidden = false;
      }
      const box = host.getBoundingClientRect();
      const w = tip.offsetWidth || 160, h = tip.offsetHeight || 34;
      tip.style.left = px(clamp(clientX - box.left + 14, 4, Math.max(4, box.width - w - 4)));
      tip.style.top = px(clamp(clientY - box.top + 14, 4, Math.max(4, box.height - h - 4)));
    };
    const hideTip = () => { if (tip) { tip.hidden = true; tip.innerHTML = ""; } };

    // The map element outlives re-renders, so its listeners are attached once
    // per element; they read the live tree/ctx out of `st` (a stale closure
    // would keep showing the previous tick's numbers).
    if (map && st.mapBound !== map) {
      st.mapBound = map;
      map.addEventListener("pointermove", e => {
        const c = st.ctx, tr = st.tree;
        if (!c || !tr) return;
        const modelEl = e.target.closest ? e.target.closest(".tree-model") : null;
        const provEl = e.target.closest ? e.target.closest(".tree-provider") : null;
        let html = "";
        if (modelEl) {
          const p = tr.providers.filter(x => x.key === modelEl.dataset.p)[0];
          const m = p ? p.models.filter(x => x.name === modelEl.dataset.m)[0] : null;
          if (p) html = '<b>' + esc(c, p.name) + '</b><span>' + esc(c, m ? m.name : modelEl.dataset.m) + '</span>' +
            '<em>' + esc(c, fmtVal(c, tr.unit, m ? m.value : 0)) + ' ' + esc(c, UNIT_WORD[tr.unit] || tr.unit) +
            ' · ' + esc(c, pct(m ? m.value : 0, tr.total)) + '</em>';
        } else if (provEl) {
          const p = tr.providers.filter(x => x.key === provEl.dataset.p)[0];
          if (p) html = '<b>' + esc(c, p.name) + '</b><span>' + p.models.length + ' 个模型</span>' +
            '<em>' + esc(c, fmtVal(c, tr.unit, p.value)) + ' ' + esc(c, UNIT_WORD[tr.unit] || tr.unit) +
            ' · ' + esc(c, pct(p.value, tr.total)) + '</em>';
        }
        if (html) moveTip(e.clientX, e.clientY, html); else hideTip();
      });
      map.addEventListener("pointerleave", () => { hideTip(); st.hover = ""; applyHover(host, st); });

      // Click: any tile drills into its provider; inside a drilled view the
      // open tile's empty/header area goes back up.
      map.addEventListener("click", e => {
        const provEl = e.target.closest ? e.target.closest(".tree-provider") : null;
        const key = provEl ? provEl.dataset.p : null;
        hideTip();
        if (!key) { if (st.focus) { st.focus = null; rerender(host, st); } return; }
        if (st.focus === key) {
          const modelEl = e.target.closest ? e.target.closest(".tree-model") : null;
          if (modelEl) return;
          st.focus = null;
        } else {
          st.focus = key;
        }
        rerender(host, st);
        // Keep the keyboard where the pointer went, so Escape works after a click.
        if (st.focus) {
          const el = host.querySelector(".tree-provider");
          if (el && typeof el.focus === "function") el.focus({ preventScroll: true });
        }
      });
    }

    host.querySelectorAll(".tree-provider").forEach(el => {
      el.addEventListener("keydown", e => {
        if (e.key !== "Enter" && e.key !== " " && e.key !== "Spacebar") return;
        e.preventDefault();
        const key = el.dataset.p;
        st.focus = st.focus === key ? null : key;
        rerender(host, st);
      });
      el.addEventListener("pointerenter", () => { st.hover = el.dataset.p; applyHover(host, st); });
      el.addEventListener("pointerleave", () => { st.hover = ""; applyHover(host, st); });
    });

    host.querySelectorAll("[data-back]").forEach(el => {
      el.addEventListener("click", e => { e.stopPropagation(); st.focus = null; rerender(host, st); });
    });

    host.querySelectorAll(".tree-row").forEach(el => {
      el.addEventListener("pointerenter", () => { st.hover = el.dataset.p; applyHover(host, st); });
      el.addEventListener("pointerleave", () => { st.hover = ""; applyHover(host, st); });
      el.addEventListener("focus", () => { st.hover = el.dataset.p; applyHover(host, st); });
      el.addEventListener("blur", () => { st.hover = ""; applyHover(host, st); });
      el.addEventListener("click", () => {
        st.focus = st.focus === el.dataset.p ? null : el.dataset.p;
        rerender(host, st);
      });
    });

    if (!st.bound) {
      st.bound = true;
      host.addEventListener("keydown", e => {
        if (e.key !== "Escape") return;
        if (st.focus) { st.focus = null; rerender(host, st); }
      });
    }
    applyHover(host, st);
  }

  function rerender(host, st) {
    st.sig = "";
    if (st.ctx) render(host, st.ctx);
  }

  // -------------------------------------------------------------- render ---

  function render(host, ctx) {
    if (!host || !ctx) return;
    const st = stateFor(host);
    st.ctx = ctx;
    if (typeof window.getComputedStyle === "function") {
      const pos = window.getComputedStyle(host).position;
      if (pos === "static") host.style.position = "relative";
    }

    const tree = buildTree(ctx);
    const motion = ctx.motion === "off" ? "off" : (ctx.motion === "soft" ? "soft" : "full");
    const box = host.getBoundingClientRect();
    const w = Math.round(box.width), h = Math.round(box.height);
    st.w = w; st.h = h;

    if (!tree.providers.length || !(tree.total > 0)) {
      const sig = "empty~" + motion;
      if (st.sig !== sig || !host.firstChild) {
        st.sig = sig;
        st.focus = null;
        st.hover = "";
        st.tree = null;
        st.mapBound = null;
        host.innerHTML = emptyHtml(tree, ctx);
      }
      watch(host, st);
      return;
    }

    // Hidden / not yet laid out stage: wait for the ResizeObserver instead of
    // painting a 0×0 map.
    if (w < 60 || h < 60) { watch(host, st); return; }

    if (st.focus && !tree.providers.some(p => p.key === st.focus)) st.focus = null;

    if (!host.querySelector(".tree-map")) host.innerHTML = shellHtml(ctx, st, tree, motion);
    const map = host.querySelector(".tree-map");
    if (!map) { watch(host, st); return; }
    const mw = map.clientWidth, mh = map.clientHeight;
    if (mw < 40 || mh < 40) { watch(host, st); return; }

    const sig = signature(tree, st, mw, mh, motion);
    if (st.sig === sig && map.firstChild) return;
    st.sig = sig;

    map.innerHTML = tilesHtml(ctx, st, tree, geometry(tree, st, mw, mh));
    const side = host.querySelector(".tree-side");
    if (side) side.outerHTML = listHtml(ctx, st, tree);
    const bar = host.querySelector(".tree-bar");
    if (bar) bar.innerHTML = barHtml(ctx, st, tree);
    st.tree = tree;
    bind(host, st);
    watch(host, st);
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews["treemap"] = {
    title: "成本结构",
    eyebrow: "COST TREEMAP",
    render: render
  };
})();
