/* ==========================================================================
   Magpie Observatory — hero view module: marimekko mosaic
   Provider → model token structure as a Marimekko (mosaic) chart:
   column width = provider share of the total, band height = model share of
   its own provider. Vanilla, classic script, no dependencies.
   Registers window.ObservatoryViews["marimekko"].
   ========================================================================== */
(function () {
  "use strict";

  const PAD_X = 12;          // plot inset, left and right
  const PAD_B = 10;          // plot inset, bottom
  const LABEL_TOP = 28;      // strip above the columns for horizontal labels
  const TIGHT_TOP = 12;      // every column narrow → labels rotate inside
  const NARROW_W = 62;       // below this the provider label goes vertical
  const NAME_MIN_W = 62;     // a band label needs this column width…
  const NAME_MIN_H = 16;     // …and this band height
  const SHARE_MIN_W = 84;    // the second band line needs more of both
  const SHARE_MIN_H = 30;
  const TOP_PROVIDERS = 6;   // head providers, the tail folds into 其他
  const TOP_MODELS = 5;      // head models per provider, same deal
  const OTHER = "__other";
  const OTHER_COLOR = "var(--faint)";
  const STAGGER = 18;        // ms per entrance step
  const STAGGER_CAP = 14;
  const NAME_FS = 10.5;      // svg font sizes, used for the fit() estimate
  const COL_FS = 10;
  const COL_FS_V = 9.5;
  const SHARE_FS = 9;

  const UNIT_WORD = { tokens: "Tokens", calls: "Calls" };

  // Per-host UI state (focus / hover / signature / last size) lives in closures.
  const states = new WeakMap();
  let uid = 0;

  function num(v) { const n = Number(v); return isFinite(n) && n > 0 ? n : 0; }
  function r2(v) { return Math.round(v * 100) / 100; }
  function r4(v) { return Math.round(v * 10000) / 10000; }
  function px(v) { return r2(v) + "px"; }
  function clampNum(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  function count(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ","); }
  function ratio(v, t) { return t > 0 ? v / t : 0; }

  function esc(ctx, s) {
    if (ctx && typeof ctx.esc === "function") return ctx.esc(s);
    return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
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

  function fmtVal(ctx, unit, v) {
    if (unit === "tokens") return ctx && typeof ctx.fmtTokens === "function" ? ctx.fmtTokens(v) : count(v);
    return count(v);
  }

  // Rough advance-width estimate: CJK/fullwidth glyphs take a full em, the
  // rest about .63em (600-weight latin with tracking). Only used to decide
  // when a label has to be elided.
  function textW(s, fs) {
    let w = 0;
    for (let i = 0; i < s.length; i++) w += s.charCodeAt(i) > 0x2e80 ? fs : fs * 0.63;
    return w;
  }

  function fit(s, fs, max) {
    s = String(s == null ? "" : s);
    if (!(max > 0)) return "";
    if (textW(s, fs) <= max) return s;
    let out = "";
    for (let i = 0; i < s.length; i++) {
      const next = out + s.charAt(i);
      if (textW(next + "…", fs) > max) break;
      out = next;
    }
    return out ? out + "…" : "";
  }

  // ---------------------------------------------------------------- data ---

  function safeMeta(ctx, key) {
    try {
      if (ctx && typeof ctx.providerMeta === "function") {
        const m = ctx.providerMeta(key) || {};
        return { name: m.name || key, color: m.color || "var(--accent)" };
      }
    } catch (_) { /* fall through */ }
    return { name: key || "unknown", color: "var(--accent)" };
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

  // "google/gemini-3-pro" inside the Google column reads better as "gemini-3-pro".
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
    const data = (ctx && ctx.data) || {};
    const models = Array.isArray(data.models) ? data.models : [];
    const logs = Array.isArray(ctx && ctx.logs) ? ctx.logs : [];

    let tokenSum = 0;
    for (let i = 0; i < models.length; i++) tokenSum += num(models[i] && models[i].tokens);
    const fromLogs = !models.length || tokenSum <= 0;   // no model ledger → aggregate requests

    const groups = new Map();
    function add(key, name, tokens, calls) {
      let g = groups.get(key);
      if (!g) { g = { key: key, entries: new Map() }; groups.set(key, g); }
      let e = g.entries.get(name);
      if (!e) { e = { name: name, tokens: 0, calls: 0 }; g.entries.set(name, e); }
      e.tokens += tokens; e.calls += calls;
    }

    if (!fromLogs) {
      for (let i = 0; i < models.length; i++) {
        const m = models[i];
        if (!m) continue;
        const v = num(m.tokens);
        if (v <= 0) continue;
        add(providerKey(ctx, m), String(m.name || m.model || "—"), v, 0);
      }
    } else {
      for (let i = 0; i < logs.length; i++) {
        const row = logs[i];
        if (!row) continue;
        add(providerKey(ctx, row), String(row.model || "—"), num(row.tokens), 1);
      }
    }

    // Metric: tokens whenever any exist, calls when the ledger only counts requests.
    let tokens = 0, calls = 0;
    groups.forEach(g => g.entries.forEach(e => { tokens += e.tokens; calls += e.calls; }));
    const unit = tokens > 0 ? "tokens" : "calls";
    const uv = e => (unit === "tokens" ? e.tokens : e.calls);

    const raw = [];
    let topModel = null, rawModelCount = 0;
    groups.forEach(g => {
      const meta = safeMeta(ctx, g.key);
      let value = 0;
      g.entries.forEach(e => {
        const v = uv(e);
        if (!(v > 0)) return;
        value += v;
        rawModelCount++;
        if (!topModel || v > topModel.value) {
          topModel = { name: e.name, label: displayName(e.name, g.key), value: v, providerKey: g.key, providerName: meta.name };
        }
      });
      if (!(value > 0)) return;
      raw.push({ key: g.key, name: meta.name, color: meta.color, value: value, entries: g.entries });
    });
    raw.sort((a, b) => b.value - a.value || String(a.key).localeCompare(String(b.key)));

    const providerCount = raw.length;

    // Top 6 providers + 其他: the tail keeps its own models, so a small
    // provider's biggest model is still visible inside the bucket.
    let provs = raw;
    if (raw.length > TOP_PROVIDERS) {
      const tail = raw.slice(TOP_PROVIDERS);
      const entries = new Map();
      let value = 0;
      tail.forEach(p => {
        value += p.value;
        p.entries.forEach((e, name) => {
          let t = entries.get(name);
          if (!t) { t = { name: name, tokens: 0, calls: 0 }; entries.set(name, t); }
          t.tokens += e.tokens; t.calls += e.calls;
        });
      });
      provs = raw.slice(0, TOP_PROVIDERS);
      provs.push({ key: OTHER, name: "其他", color: OTHER_COLOR, value: value, entries: entries, members: tail.length });
    }

    // Top 5 models per column + 其他 band.
    function bandsOf(p) {
      const list = [];
      p.entries.forEach(e => {
        const v = uv(e);
        if (v > 0) list.push({ name: e.name, value: v });
      });
      list.sort((a, b) => b.value - a.value || String(a.name).localeCompare(String(b.name)));
      if (list.length > TOP_MODELS) {
        const rest = list.slice(TOP_MODELS);
        const value = rest.reduce((a, m) => a + m.value, 0);
        list.length = TOP_MODELS;
        list.push({ name: "其他", value: value, members: rest.length, other: true });
      }
      return list;
    }

    const total = provs.reduce((a, p) => a + p.value, 0);
    let bandCount = 0;
    provs.forEach((p, pi) => {
      p.pi = pi;
      p.share = ratio(p.value, total);
      p.bands = bandsOf(p).map(b => ({
        name: b.name, value: b.value, other: !!b.other, members: b.members || 0,
        label: b.other ? "其他" : displayName(b.name, p.key),
        pshare: ratio(b.value, p.value), tshare: ratio(b.value, total)
      }));
      bandCount += p.bands.length;
    });

    if (topModel) topModel.tshare = ratio(topModel.value, total);

    return {
      unit: unit,
      source: fromLogs ? "logs" : "models",
      total: total,
      providers: provs,
      providerCount: providerCount,
      modelCount: rawModelCount,
      bandCount: bandCount,
      topProvider: provs.length ? raw[0] : null,
      topModel: topModel
    };
  }

  // -------------------------------------------------------------- layout ---

  function layout(tree, st, w, h) {
    const all = st.focus ? tree.providers.filter(p => p.key === st.focus) : tree.providers;
    const base = st.focus && all.length ? all[0].value : tree.total;
    const plotW = Math.max(0, w - PAD_X * 2);

    // Widths first: they decide whether a provider label sits above the
    // column or has to rotate inside it.
    const spans = [];
    let acc = PAD_X, anyWide = false;
    for (let i = 0; i < all.length; i++) {
      const p = all[i];
      const cw = base > 0 ? plotW * ratio(p.value, base) : 0;
      if (cw >= NARROW_W) anyWide = true;
      spans.push({ p: p, i: i, x: acc, w: cw });
      acc += cw;
    }

    const top = anyWide ? LABEL_TOP : TIGHT_TOP;
    const plotH = Math.max(0, h - top - PAD_B);

    const cols = spans.map(s => {
      let y = top;
      const bands = s.p.bands.map(b => {
        const bh = plotH * b.pshare;
        const band = { b: b, y: y, h: bh };
        y += bh;
        return band;
      });
      return { p: s.p, i: s.i, x: s.x, w: s.w, top: top, h: plotH, bands: bands };
    });

    return { top: top, plotW: plotW, plotH: plotH, cols: cols, anyWide: anyWide };
  }

  // Provider hue, stepped per band; the mix stays low enough that --fg and
  // --fg-2 keep their contrast on every brand hue in either theme.
  function bandFill(color, j, n) {
    const mix = n <= 1 ? 62 : Math.round(62 - (j / (n - 1)) * 30);
    return "color-mix(in srgb, " + color + " " + mix + "%, var(--card-2))";
  }

  // ------------------------------------------------------------- markup ---

  function svgInner(ctx, st, tree, lay) {
    // The plot is clipped to a rounded box, so the mosaic's outer corners
    // match the map surface; the labels stay outside the clip.
    let out = '<defs><clipPath id="' + st.clipId + '"><rect x="' + r2(PAD_X) + '" y="' + r2(lay.top) +
      '" width="' + r2(lay.plotW) + '" height="' + r2(lay.plotH) + '" rx="7"></rect></clipPath></defs>' +
      '<g class="mosaic-plot" clip-path="url(#' + st.clipId + ')">';

    for (let ci = 0; ci < lay.cols.length; ci++) {
      const col = lay.cols[ci], p = col.p, n = col.bands.length;
      out += '<g class="mosaic-col' + (st.focus === p.key ? " mosaic-focused" : "") +
        '" data-p="' + esc(ctx, p.key) + '" data-share="' + r4(p.share) + '" data-w="' + r2(col.w) +
        '" style="--mosaic-c:' + esc(ctx, p.color) + '" tabindex="0" role="button" aria-label="' +
        esc(ctx, p.name + " " + pct(p.value, tree.total)) + '">';
      out += '<rect class="mosaic-bed" x="' + r2(col.x) + '" y="' + r2(col.top) +
        '" width="' + r2(col.w) + '" height="' + r2(col.h) + '"></rect>';

      for (let bi = 0; bi < n; bi++) {
        const band = col.bands[bi], b = band.b, wide = col.w >= NAME_MIN_W;
        const shareOn = col.w >= SHARE_MIN_W && band.h >= SHARE_MIN_H;
        out += '<g class="mosaic-band" data-p="' + esc(ctx, p.key) + '" data-m="' + esc(ctx, b.name) +
          '" data-hshare="' + r4(b.pshare) + '" data-tshare="' + r4(b.tshare) + '" data-bh="' + r2(band.h) +
          '" style="--mosaic-fill:' + esc(ctx, bandFill(p.color, bi, n)) + ';--mosaic-d:' +
          Math.min(ci + bi, STAGGER_CAP) + '">';
        out += '<rect class="mosaic-band-fill" x="' + r2(col.x) + '" y="' + r2(band.y) +
          '" width="' + r2(col.w) + '" height="' + r2(band.h) + '"></rect>';
        if (wide && band.h >= NAME_MIN_H) {
          const label = fit(b.label, NAME_FS, col.w - 13);
          if (label) {
            out += '<text class="mosaic-band-name" x="' + r2(col.x + 7) + '" y="' +
              r2(band.y + band.h / 2 + (shareOn ? -1.5 : 3.5)) + '">' + esc(ctx, label) + '</text>';
          }
        }
        if (shareOn) {
          out += '<text class="mosaic-band-share" x="' + r2(col.x + 7) + '" y="' + r2(band.y + band.h / 2 + 11) +
            '">' + esc(ctx, pct(b.value, p.value) + " · " + pct(b.value, tree.total)) + '</text>';
        }
        out += '</g>';
        if (bi < n - 1) {
          out += '<line class="mosaic-sep" x1="' + r2(col.x) + '" y1="' + r2(band.y + band.h) +
            '" x2="' + r2(col.x + col.w) + '" y2="' + r2(band.y + band.h) + '"></line>';
        }
      }

      if (ci < lay.cols.length - 1) {
        out += '<line class="mosaic-sep mosaic-sep-col" x1="' + r2(col.x + col.w) + '" y1="' + r2(col.top) +
          '" x2="' + r2(col.x + col.w) + '" y2="' + r2(col.top + col.h) + '"></line>';
      }
      out += '<rect class="mosaic-ring" x="' + r2(col.x + 1) + '" y="' + r2(col.top + 1) +
        '" width="' + r2(Math.max(0, col.w - 2)) + '" height="' + r2(Math.max(0, col.h - 2)) + '" rx="6"></rect>';
      out += '</g>';
    }
    out += '</g>';   // .mosaic-plot

    // Provider labels live outside the clipped plot so they are never cut.
    for (let ci = 0; ci < lay.cols.length; ci++) {
      const col = lay.cols[ci], p = col.p, cx = col.x + col.w / 2;
      if (col.w >= NARROW_W) {
        const name = fit(p.name, COL_FS, col.w - 6);
        out += '<text class="mosaic-col-label" x="' + r2(cx) + '" y="' + r2(lay.top - 9) +
          '" text-anchor="middle">' + esc(ctx, name) + '</text>';
        if (col.w >= SHARE_MIN_W) {
          out += '<text class="mosaic-col-share" x="' + r2(cx) + '" y="' + r2(lay.top - 21) +
            '" text-anchor="middle">' + esc(ctx, pct(p.value, tree.total)) + '</text>';
        }
      } else {
        // Narrow column: the label hangs downward inside the column, which is
        // also where band labels are suppressed, so nothing collides.
        const label = fit(p.name + " " + pct(p.value, tree.total), COL_FS_V, Math.max(0, col.h - 14));
        const lx = r2(cx + 3.4), ly = r2(col.top + 7);
        out += '<text class="mosaic-col-label mosaic-col-label-v" x="' + lx + '" y="' + ly +
          '" text-anchor="end" transform="rotate(-90 ' + lx + " " + ly + ')">' + esc(ctx, label) + '</text>';
      }
    }

    return out;
  }

  function barInner(ctx, st, tree) {
    let crumbs;
    if (st.focus) {
      const p = tree.providers.filter(x => x.key === st.focus)[0];
      crumbs = '<button class="mosaic-crumb" data-back="1" type="button">全部</button>' +
        '<span class="mosaic-crumb-sep">/</span>' +
        '<span class="mosaic-crumb-cur" style="--mosaic-c:' + esc(ctx, p ? p.color : "var(--accent)") + '"><i></i>' +
        esc(ctx, p ? p.name : st.focus) + "</span>" +
        '<button class="mosaic-crumb-back" data-back="1" type="button" title="返回全部">↩ 返回</button>';
    } else {
      crumbs = '<span class="mosaic-crumb mosaic-crumb-on">全部</span>';
    }
    const word = UNIT_WORD[tree.unit] || tree.unit;
    return '<div class="mosaic-crumbs">' + crumbs + "</div>" +
      '<span class="mosaic-unit">' + esc(ctx, tree.providers.length + " 列 · " + tree.bandCount + " 段 · " + word) + "</span>";
  }

  function sideHtml(ctx, st, tree) {
    const word = UNIT_WORD[tree.unit] || tree.unit;
    const tp = tree.topProvider, tm = tree.topModel;
    let rows = "";
    tree.providers.forEach(p => {
      rows += '<button class="mosaic-row' + (st.focus === p.key ? " mosaic-active" : "") +
        '" data-p="' + esc(ctx, p.key) + '" type="button" style="--mosaic-c:' + esc(ctx, p.color) +
        '" aria-pressed="' + (st.focus === p.key ? "true" : "false") + '">' +
        '<span class="mosaic-row-top"><i class="mosaic-row-dot"></i>' +
        '<span class="mosaic-row-name">' + esc(ctx, p.name) + "</span>" +
        '<span class="mosaic-row-share">' + esc(ctx, pct(p.value, tree.total)) + "</span></span>" +
        '<span class="mosaic-row-bar"><i style="width:' + r2(ratio(p.value, tree.total) * 100) + '%"></i></span>' +
        '<span class="mosaic-row-sub">' + p.bands.length + " 个模型 · " + esc(ctx, fmtVal(ctx, tree.unit, p.value)) +
        (p.members ? " · " + p.members + " 个 provider" : "") + "</span></button>";
    });

    return '<aside class="mosaic-side" aria-label="结构马赛克统计">' +
      '<div class="mosaic-side-title"><span>MARIMEKKO</span><span>' + esc(ctx, word) + "</span></div>" +
      '<div class="mosaic-stats">' +
        '<div class="mosaic-stat"><small>总 ' + esc(ctx, word) + "</small><b>" +
          esc(ctx, fmtVal(ctx, tree.unit, tree.total)) + "</b></div>" +
        '<div class="mosaic-stat"><small>最大 provider</small><b>' +
          esc(ctx, tp ? tp.name : "—") + ' <i>' + esc(ctx, tp ? pct(tp.value, tree.total) : "0%") + "</i></b></div>" +
        '<div class="mosaic-stat"><small>最大模型</small><b>' +
          esc(ctx, tm ? tm.label : "—") + ' <i>' + esc(ctx, tm ? pct(tm.value, tree.total) : "0%") + "</i></b></div>" +
        '<div class="mosaic-stat"><small>结构</small><b>' + tree.providers.length + " × " + tree.bandCount + "</b></div>" +
      "</div>" +
      '<div class="mosaic-list" role="group" aria-label="provider 占比">' + rows + "</div>" +
      '<div class="mosaic-side-note">宽 = provider 占比 · 高 = 模型占该 provider 比</div>' +
      "</aside>";
  }

  function shellHtml(ctx, st, tree, motion) {
    const anim = motion === "off" ? "" : (motion === "soft" ? " mosaic-anim mosaic-soft" : " mosaic-anim");
    return '<div class="mosaic-board' + anim + '">' +
      '<div class="mosaic-main">' +
        '<div class="mosaic-bar">' + barInner(ctx, st, tree) + "</div>" +
        '<div class="mosaic-map"><svg class="mosaic-svg" width="100%" height="100%" preserveAspectRatio="none" ' +
          'role="img" aria-label="provider × 模型结构马赛克"></svg></div>' +
      "</div>" +
      sideHtml(ctx, st, tree) +
      "</div>" +
      '<div class="mosaic-tip" role="tooltip" hidden></div>';
  }

  function emptyHtml(ctx) {
    const hasModels = !!(ctx && ctx.data && Array.isArray(ctx.data.models) && ctx.data.models.length);
    const hasLogs = !!(ctx && Array.isArray(ctx.logs) && ctx.logs.length);
    return '<div class="mosaic-board mosaic-empty"><div class="empty-state">' +
      "<b>还没有结构数据</b>" +
      (hasModels || hasLogs
        ? "<span>用量账单与请求流水里都还没有可计量的 token / 调用。</span>"
        : "<span>视图会在 <code>data.models</code> 或 <code>logs</code> 到达后自动出现。</span>") +
      "<span>来源：用量账单的 <code>models</code>，缺失时回退到请求流水按 provider × model 聚合。</span>" +
      "</div></div>";
  }

  // --------------------------------------------------------------- state ---

  function stateFor(host) {
    let st = states.get(host);
    if (!st) {
      st = { focus: null, hoverP: "", hoverM: "", sig: "", w: 0, h: 0, ctx: null, tree: null,
        ro: null, svg: null, bound: false, clipId: "mosaic-clip-" + (++uid) };
      states.set(host, st);
    }
    return st;
  }

  function signature(tree, st, w, h, motion) {
    const parts = [tree.unit, tree.source, String(Math.round(tree.total)), st.focus || "", w + "x" + h, motion];
    tree.providers.forEach(p => {
      parts.push(p.key + ":" + Math.round(p.value) + ":" +
        p.bands.map(b => b.name + "=" + Math.round(b.value)).join(","));
    });
    return parts.join("|");
  }

  function applyHover(host, st) {
    const svg = host.querySelector(".mosaic-svg");
    if (svg) {
      svg.dataset.hoverP = st.hoverP || "";
      svg.dataset.hoverM = st.hoverM || "";
    }
    host.querySelectorAll(".mosaic-col").forEach(el => {
      el.classList.toggle("mosaic-on", !!st.hoverP && el.dataset.p === st.hoverP);
    });
    host.querySelectorAll(".mosaic-band").forEach(el => {
      el.classList.toggle("mosaic-on", !!st.hoverM && el.dataset.m === st.hoverM && el.dataset.p === st.hoverP);
    });
    host.querySelectorAll(".mosaic-row").forEach(el => {
      el.classList.toggle("mosaic-lit", !!st.hoverP && el.dataset.p === st.hoverP);
      el.classList.toggle("mosaic-active", !!st.focus && el.dataset.p === st.focus);
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

  function rerender(host, st) {
    st.sig = "";
    if (st.ctx) render(host, st.ctx);
  }

  // ---------------------------------------------------------------- bind ---

  function bind(host, st) {
    const svg = host.querySelector(".mosaic-svg");
    const tip = host.querySelector(".mosaic-tip");

    const hideTip = () => { if (tip) { tip.hidden = true; tip.innerHTML = ""; } };
    const moveTip = (clientX, clientY, html) => {
      if (!tip || !html) return;
      if (tip.hidden || tip.innerHTML !== html) {
        tip.innerHTML = html;
        tip.hidden = false;
      }
      const box = host.getBoundingClientRect();
      const w = tip.offsetWidth || 170, h = tip.offsetHeight || 40;
      tip.style.left = px(clampNum(clientX - box.left + 14, 4, Math.max(4, box.width - w - 4)));
      tip.style.top = px(clampNum(clientY - box.top + 14, 4, Math.max(4, box.height - h - 4)));
    };

    if (svg && st.svg !== svg) {
      st.svg = svg;
      // The svg outlives re-renders, so its listeners are bound once and read
      // the live tree/ctx out of `st` (a stale closure would show last tick).
      svg.addEventListener("pointermove", e => {
        const c = st.ctx, tree = st.tree;
        if (!c || !tree) return;
        const bandEl = e.target && e.target.closest ? e.target.closest(".mosaic-band") : null;
        const colEl = e.target && e.target.closest ? e.target.closest(".mosaic-col") : null;
        st.hoverP = bandEl ? bandEl.dataset.p : (colEl ? colEl.dataset.p : "");
        st.hoverM = bandEl ? bandEl.dataset.m : "";
        applyHover(host, st);
        let html = "";
        if (bandEl) {
          const p = tree.providers.filter(x => x.key === bandEl.dataset.p)[0];
          const b = p ? p.bands.filter(x => x.name === bandEl.dataset.m)[0] : null;
          if (p && b) {
            html = "<b>" + esc(c, p.name) + "</b>" +
              "<span>" + esc(c, b.label) + (b.other ? " · " + b.members + " 个模型" : "") + "</span>" +
              "<em>" + esc(c, fmtVal(c, tree.unit, b.value)) + " " + esc(c, UNIT_WORD[tree.unit] || tree.unit) + "</em>" +
              "<em>占 provider " + esc(c, pct(b.value, p.value)) + " · 占总 " + esc(c, pct(b.value, tree.total)) + "</em>";
          }
        } else if (colEl) {
          const p = tree.providers.filter(x => x.key === colEl.dataset.p)[0];
          if (p) {
            html = "<b>" + esc(c, p.name) + "</b>" +
              "<span>" + p.bands.length + " 个模型" + (p.members ? " · " + p.members + " 个 provider" : "") + "</span>" +
              "<em>" + esc(c, fmtVal(c, tree.unit, p.value)) + " " + esc(c, UNIT_WORD[tree.unit] || tree.unit) +
              " · 占总 " + esc(c, pct(p.value, tree.total)) + "</em>";
          }
        }
        if (html) moveTip(e.clientX, e.clientY, html); else hideTip();
      });
      svg.addEventListener("pointerleave", () => {
        hideTip();
        st.hoverP = ""; st.hoverM = "";
        applyHover(host, st);
      });
      svg.addEventListener("click", e => {
        const colEl = e.target && e.target.closest ? e.target.closest(".mosaic-col") : null;
        hideTip();
        if (!colEl) { if (st.focus) { st.focus = null; rerender(host, st); } return; }
        const key = colEl.dataset.p;
        st.focus = st.focus === key ? null : key;
        st.hoverP = ""; st.hoverM = "";
        rerender(host, st);
      });
      svg.addEventListener("keydown", e => {
        if (e.key !== "Enter" && e.key !== " " && e.key !== "Spacebar") return;
        const colEl = e.target && e.target.closest ? e.target.closest(".mosaic-col") : null;
        if (!colEl) return;
        e.preventDefault();
        st.focus = st.focus === colEl.dataset.p ? null : colEl.dataset.p;
        rerender(host, st);
      });
    }

    host.querySelectorAll("[data-back]").forEach(el => {
      el.addEventListener("click", e => {
        e.stopPropagation();
        st.focus = null;
        rerender(host, st);
      });
    });

    host.querySelectorAll(".mosaic-row").forEach(el => {
      const key = el.dataset.p;
      el.addEventListener("pointerenter", () => { st.hoverP = key; st.hoverM = ""; applyHover(host, st); });
      el.addEventListener("pointerleave", () => { st.hoverP = ""; st.hoverM = ""; applyHover(host, st); });
      el.addEventListener("focus", () => { st.hoverP = key; st.hoverM = ""; applyHover(host, st); });
      el.addEventListener("blur", () => { st.hoverP = ""; st.hoverM = ""; applyHover(host, st); });
      el.addEventListener("click", () => {
        st.focus = st.focus === key ? null : key;
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
        st.focus = null; st.hoverP = ""; st.hoverM = "";
        st.tree = null; st.svg = null;
        host.innerHTML = emptyHtml(ctx);
      }
      watch(host, st);
      return;
    }

    // Hidden / not yet laid out stage: wait for the ResizeObserver instead of
    // painting a 0×0 mosaic.
    if (w < 60 || h < 60) { watch(host, st); return; }

    if (st.focus && !tree.providers.some(p => p.key === st.focus)) st.focus = null;

    if (!host.querySelector(".mosaic-map")) host.innerHTML = shellHtml(ctx, st, tree, motion);
    const map = host.querySelector(".mosaic-map");
    const svg = host.querySelector(".mosaic-svg");
    if (!map || !svg) { watch(host, st); return; }

    const mw = Math.round(map.clientWidth), mh = Math.round(map.clientHeight);
    if (mw < 40 || mh < 40) { watch(host, st); return; }

    const sig = signature(tree, st, mw, mh, motion);
    if (st.sig === sig && svg.firstChild) { watch(host, st); return; }
    st.sig = sig;

    const lay = layout(tree, st, mw, mh);
    svg.setAttribute("viewBox", "0 0 " + mw + " " + mh);
    svg.innerHTML = svgInner(ctx, st, tree, lay);

    const bar = host.querySelector(".mosaic-bar");
    if (bar) bar.innerHTML = barInner(ctx, st, tree);
    const side = host.querySelector(".mosaic-side");
    if (side) side.outerHTML = sideHtml(ctx, st, tree);

    st.tree = tree;
    bind(host, st);
    watch(host, st);
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews["marimekko"] = {
    title: "结构马赛克",
    eyebrow: "MARIMEKKO",
    render: render
  };
})();
