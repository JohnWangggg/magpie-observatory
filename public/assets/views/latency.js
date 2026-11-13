/* ==========================================================================
   Magpie Observatory — 延迟热力 (latency heatmap) view module.
   Standalone classic script: registers window.ObservatoryViews.latency.

   x = one column per accumulated data snapshot (60 max, oldest dropped),
   y = 7 latency buckets (slowest on top), cell = how many requests of that
   snapshot landed in that bucket. Colours run --card-3 → --accent → --cyan.
   A latency sample is ttft, or the total ms scaled down when ttft is absent.
   ========================================================================== */
(function () {
  "use strict";

  const EDGES = [250, 500, 1000, 2000, 5000, 10000];   // bucket upper bound, ms
  const RANGE = ["0 – 250 ms", "250 – 500 ms", "0.5 – 1 s", "1 – 2 s", "2 – 5 s", "5 – 10 s", "10 s 以上"];
  const SHORT = ["0–250", "250–500", "0.5–1s", "1–2s", "2–5s", "5–10s", "10s+"];
  const BUCKETS = 7;
  const MAX_ROWS = 60;        // snapshots kept; the oldest column is dropped
  const LABEL_EVERY = 8;      // a time label roughly every 8 columns
  const MS_TO_TTFT = 0.35;    // no ttft on the row: scale total ms down to a first-token estimate

  const HOSTS = new WeakMap();  // per-host ring buffer + hover/tooltip state

  /* -------------------------------------------------------------- helpers --- */
  const num = function (v) { const n = Number(v); return isFinite(n) ? n : 0; };
  const plain = function (v) { return String(v == null ? "" : v); };
  function pad2(n) { return String(n).padStart(2, "0"); }
  function clock(ms) {
    const d = new Date(ms);
    return pad2(d.getHours()) + ":" + pad2(d.getMinutes()) + ":" + pad2(d.getSeconds());
  }
  function age(ms) {
    const s = Math.max(0, Math.round((Date.now() - ms) / 1000));
    if (s < 60) return s + "s 前";
    const m = Math.floor(s / 60);
    if (m < 60) return m + "m" + pad2(s % 60) + "s 前";
    return Math.floor(m / 60) + "h" + pad2(m % 60) + "m 前";
  }
  function fmtMs(ms) {
    const v = num(ms);
    if (v <= 0) return "—";
    if (v >= 10000) return "≥10s";
    if (v < 1000) return Math.round(v) + "ms";
    if (v < 10000) return (v / 1000).toFixed(v < 2000 ? 2 : 1).replace(/\.0+$/, "") + "s";
    return Math.round(v / 1000) + "s";
  }
  function bucketOf(lat) {
    for (let i = 0; i < EDGES.length; i++) if (lat < EDGES[i]) return i;
    return EDGES.length;                      // 10 s and above
  }
  // Five colour steps between an empty cell and the busiest one. The scale is
  // shared by every column so snapshots stay comparable; a buffer whose cells
  // all hold the same count falls back to the palest filled step.
  function level(count, bufMax) {
    if (!(count > 0)) return 0;
    const span = Math.max(1, bufMax - 1);
    return Math.max(1, Math.min(5, 1 + Math.floor((count - 1) * 4 / span)));
  }

  /* ---------------------------------------------------------------- model --- */
  // One snapshot: how many requests fell in each latency bucket.
  function collect(logs) {
    const counts = [0, 0, 0, 0, 0, 0, 0];
    let total = 0;
    for (let i = 0; i < logs.length; i++) {
      const r = logs[i];
      if (!r) continue;
      const ttft = num(r.ttft);
      let lat = ttft > 0 ? ttft : 0;
      if (!lat) {
        const ms = num(r.ms);
        lat = ms > 0 ? ms * MS_TO_TTFT : 0;
      }
      if (!lat) continue;
      counts[bucketOf(lat)]++;
      total++;
    }
    return { counts: counts, total: total };
  }

  // Percentile over the buffered counts: interpolated inside the bucket the
  // target rank lands in, so P50/P90 stay meaningful without keeping every
  // raw latency alive.
  function quantile(pooled, total, q) {
    if (!total) return 0;
    const target = q * total;
    let seen = 0;
    for (let i = 0; i < BUCKETS; i++) {
      const c = pooled[i];
      if (!c) continue;
      if (seen + c >= target) {
        const lo = i === 0 ? 0 : EDGES[i - 1];
        const hi = i === BUCKETS - 1 ? lo * 2 : EDGES[i];
        const pos = Math.max(0, Math.min(1, (target - seen) / c));
        return lo + pos * (hi - lo);
      }
      seen += c;
    }
    return EDGES[BUCKETS - 2];
  }

  function buildModel(st) {
    const rows = st.rows;
    const pooled = [0, 0, 0, 0, 0, 0, 0];
    let samples = 0, bufMax = 0;
    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      for (let i = 0; i < BUCKETS; i++) {
        const c = row.counts[i];
        pooled[i] += c;
        if (c > bufMax) bufMax = c;
      }
      samples += row.total;
    }
    let hot = -1;
    for (let i = 0; i < BUCKETS; i++) if (hot < 0 || pooled[i] > pooled[hot]) hot = i;
    let pooledMax = 0;
    for (let i = 0; i < BUCKETS; i++) if (pooled[i] > pooledMax) pooledMax = pooled[i];
    return {
      rows: rows, pooled: pooled, pooledMax: pooledMax, samples: samples, bufMax: bufMax,
      hot: samples ? hot : -1,
      hotShare: samples && hot >= 0 ? pooled[hot] / samples : 0,
      p50: samples ? quantile(pooled, samples, 0.5) : 0,
      p90: samples ? quantile(pooled, samples, 0.9) : 0,
      empty: !rows.length || !samples
    };
  }

  /* ---------------------------------------------------------------- state --- */
  function stateFor(host) {
    let st = HOSTS.get(host);
    if (!st) {
      st = {
        host: null, ctx: null, root: null, grid: null, ys: null, side: null, tip: null,
        cap: null, capSide: null, empty: null,
        rows: [], lastKey: null, version: 0, painted: -1, sig: null,
        entered: false, timer: null, model: null,
        hotC: null, hotCell: null, hotNodes: null, hotLab: null
      };
      HOSTS.set(host, st);
    }
    return st;
  }

  // Append at most one column per data snapshot: the snapshot identity is the
  // fetch timestamp (demo data never moves it) plus the newest ledger id.
  function accumulate(st, ctx) {
    const logs = Array.isArray(ctx.logs) ? ctx.logs : [];
    if (!logs.length) return;
    const key = num(ctx.data && ctx.data.fetchedAt) + "|" + (logs[0] && logs[0].id != null ? logs[0].id : "");
    if (key === st.lastKey && st.rows.length) return;
    st.lastKey = key;
    const snap = collect(logs);
    if (!snap.total) return;                  // nothing carried a latency: no column
    st.rows.push({ at: Date.now(), key: key, counts: snap.counts, total: snap.total });
    if (st.rows.length > MAX_ROWS) st.rows.splice(0, st.rows.length - MAX_ROWS);
    st.version++;
  }

  /* ---------------------------------------------------------------- shell --- */
  function mount(host, st) {
    host.innerHTML = "";
    const root = document.createElement("div");
    root.className = "lat-root";
    root.innerHTML =
      '<div class="lat-main">' +
        '<div class="lat-cap-row"><span class="lat-cap"></span><span class="lat-cap-side"></span></div>' +
        '<div class="lat-body">' +
          '<div class="lat-ys"></div>' +
          '<div class="lat-scroll"><div class="lat-grid"></div></div>' +
        "</div>" +
        '<div class="lat-empty" hidden><b>暂无延迟样本</b>' +
          "<span>Magpie 账本写入带 ttft 的请求后，每次数据刷新会在这里累积一列。</span></div>" +
      "</div>" +
      '<aside class="lat-side" aria-label="延迟统计"></aside>' +
      '<div class="lat-tip" role="tooltip" hidden></div>';
    host.appendChild(root);
    st.root = root;
    st.grid = root.querySelector(".lat-grid");
    st.ys = root.querySelector(".lat-ys");
    st.side = root.querySelector(".lat-side");
    st.tip = root.querySelector(".lat-tip");
    st.cap = root.querySelector(".lat-cap");
    st.capSide = root.querySelector(".lat-cap-side");
    st.empty = root.querySelector(".lat-empty");
    st.hotC = null; st.hotCell = null; st.hotNodes = null; st.hotLab = null;
    bind(root, st);
  }

  /* ------------------------------------------------------------ tooltip --- */
  function hideTip(st) {
    if (st.tip && !st.tip.hidden) st.tip.hidden = true;
  }

  function clearHighlight(st) {
    if (st.hotLab) st.hotLab.classList.remove("is-hot");
    if (st.hotNodes) for (let i = 0; i < st.hotNodes.length; i++) st.hotNodes[i].classList.remove("is-hot");
    if (st.hotCell) st.hotCell.classList.remove("is-hover");
    st.hotLab = null; st.hotNodes = null; st.hotCell = null; st.hotC = null;
  }

  function highlight(st, cell) {
    if (st.hotCell === cell) return;
    clearHighlight(st);
    if (!cell || !st.grid) return;
    const nodes = st.grid.querySelectorAll('.lat-cell[data-c="' + cell.dataset.c + '"]');
    for (let i = 0; i < nodes.length; i++) nodes[i].classList.add("is-hot");
    cell.classList.add("is-hover");
    st.hotC = cell.dataset.c;
    st.hotNodes = nodes;
    st.hotCell = cell;
    const lab = st.ys && st.ys.children[BUCKETS - Number(cell.dataset.b)];
    if (lab) { lab.classList.add("is-hot"); st.hotLab = lab; }
  }

  function showTip(st, c, b, x, y) {
    const m = st.model, ctx = st.ctx || {};
    if (!m || !st.tip) return;
    const row = m.rows[c];
    if (!row) { hideTip(st); return; }
    const esc = ctx.esc || plain;
    const n = row.counts[b];
    const share = row.total ? n / row.total : 0;
    st.tip.innerHTML =
      "<b>" + esc(clock(row.at)) + " · " + esc(age(row.at)) + "</b>" +
      "<span>延迟区间 " + esc(RANGE[b]) + "</span>" +
      "<span>样本 <b>" + n + "</b> · 占本次快照 <b>" + Math.round(share * 100) + "</b>%</span>" +
      "<span>该快照共 <b>" + row.total + "</b> 个延迟样本</span>";
    st.tip.hidden = false;
    const rect = st.root.getBoundingClientRect();
    const clamp = ctx.clamp || function (v, lo, hi) { return Math.max(lo, Math.min(hi, v)); };
    st.tip.style.left = clamp(x - rect.left, 120, Math.max(120, rect.width - 120)) + "px";
    st.tip.style.top = clamp(y - rect.top - 8, 44, Math.max(44, rect.height - 8)) + "px";
  }

  function bind(root, st) {
    root.addEventListener("pointermove", function (e) {
      const cell = e.target && e.target.closest ? e.target.closest(".lat-cell") : null;
      if (!cell) { hideTip(st); highlight(st, null); return; }
      showTip(st, Number(cell.dataset.c), Number(cell.dataset.b), e.clientX, e.clientY);
      highlight(st, cell);
    });
    root.addEventListener("pointerleave", function () { hideTip(st); highlight(st, null); });
  }

  /* --------------------------------------------------------------- paint --- */
  function legendHTML() {
    let sw = "";
    for (let lv = 1; lv <= 5; lv++) sw += '<i class="lat-lv" data-lv="' + lv + '"></i>';
    return '<div class="lat-legend">' +
        '<span class="lat-legend-title">每格请求数</span>' +
        '<span class="lat-legend-scale">' + sw + "</span>" +
        '<span class="lat-legend-cap">少 → 多</span>' +
        '<span class="lat-legend-cap"><i class="lat-lv" data-lv="0"></i>无样本</span>' +
      "</div>";
  }

  function sideHTML(m, cols, esc) {
    const head = '<span class="lat-side-title">LATENCY HEATMAP</span>';
    if (m.empty) {
      return head + '<p class="lat-note">暂无延迟样本。<br>账本写入带 ttft 的请求后，每次数据刷新会在这里累积一列。</p>' + legendHTML();
    }
    let dist = "";
    for (let dr = 0; dr < BUCKETS; dr++) {
      const b = BUCKETS - 1 - dr;
      const n = m.pooled[b];
      const w = n ? Math.max(3, Math.round(n / Math.max(1, m.pooledMax) * 100)) : 0;
      dist += '<div class="lat-dist-row' + (b === m.hot ? " is-hot" : "") + '">' +
          '<span class="lat-dist-lab">' + esc(SHORT[b]) + "</span>" +
          '<i class="lat-dist-bar" data-lv="' + level(n, m.pooledMax) + '"><b style="width:' + w + '%"></b></i>' +
          '<em class="lat-dist-n">' + n + "</em>" +
        "</div>";
    }
    return head +
      '<div class="lat-stats">' +
        '<div class="lat-stat"><span>样本</span><b>' + m.samples + '</b><small>' + cols + ' 个快照</small></div>' +
        '<div class="lat-stat"><span>P50</span><b>' + esc(fmtMs(m.p50)) + '</b><small>缓存的延迟</small></div>' +
        '<div class="lat-stat"><span>P90</span><b>' + esc(fmtMs(m.p90)) + '</b><small>P90</small></div>' +
        '<div class="lat-stat lat-stat-wide"><span>最热区间</span><b>' + esc(SHORT[m.hot]) +
          '</b><small>占全部样本 ' + Math.round(m.hotShare * 100) + '%</small></div>' +
      "</div>" +
      '<div class="lat-dist">' + dist + "</div>" +
      legendHTML() +
      '<p class="lat-note">热力在页面打开期间持续累积：每次数据刷新追加一列，最多保留 ' + MAX_ROWS +
        " 列，超出后丢弃最早一列。</p>";
  }

  function paint(st, ctx) {
    const esc = ctx.esc || plain;
    const m = st.model, cols = m.rows.length;
    const enter = !st.entered && (ctx.motion || "full") !== "off";
    const fresh = st.version !== st.painted;
    const root = st.root;

    root.dataset.motion = ctx.motion || "full";
    st.empty.hidden = !m.empty;
    st.cap.innerHTML = m.empty
      ? "<b>等待数据</b> · 每次数据刷新累积一列"
      : "<b>" + cols + "</b> / " + MAX_ROWS + " 个快照 · 每列一次数据刷新 · 每格 = 该快照落在该延迟区间的请求数";
    st.capSide.textContent = cols > 1 ? clock(m.rows[0].at) + " → " + clock(m.rows[cols - 1].at) : "";

    let ys = '<span class="lat-ys-pad"></span>';
    for (let dr = 0; dr < BUCKETS; dr++) {
      ys += '<span class="lat-ylab">' + esc(SHORT[BUCKETS - 1 - dr]) + "</span>";
    }
    st.ys.innerHTML = ys;

    st.grid.style.setProperty("--lat-cols", String(Math.max(1, cols)));
    // Column 0 and every 8th column carry a time; the newest column keeps one
    // too, as long as it does not sit on top of the previous label.
    const lastGap = cols > 1 ? (cols - 1) - Math.floor((cols - 1) / LABEL_EVERY) * LABEL_EVERY : LABEL_EVERY;
    let html = "";
    for (let c = 0; c < cols; c++) {
      const last = c === cols - 1;
      html += '<span class="lat-tick' + (c === 0 ? " is-first" : last ? " is-last" : "") + '">' +
        (c % LABEL_EVERY === 0 || (last && lastGap >= LABEL_EVERY - 2) ? esc(clock(m.rows[c].at)) : "") + "</span>";
    }
    for (let dr = 0; dr < BUCKETS; dr++) {
      const b = BUCKETS - 1 - dr;
      for (let c = 0; c < cols; c++) {
        const lv = level(m.rows[c].counts[b], m.bufMax);
        html += '<i class="lat-cell lat-lv" data-lv="' + lv + '" data-b="' + b + '" data-c="' + c + '"' +
          (fresh && !enter && c === cols - 1 ? ' data-new="1"' : "") +
          (enter ? ' style="--i:' + c + '"' : "") + "></i>";
      }
    }
    st.grid.innerHTML = html;
    st.side.innerHTML = sideHTML(m, cols, esc);

    st.painted = st.version;
    clearHighlight(st);
    hideTip(st);
    if (enter) {
      root.classList.add("lat-enter");
      clearTimeout(st.timer);
      st.timer = setTimeout(function () { root.classList.remove("lat-enter"); },
        700 + Math.min(cols, MAX_ROWS) * 16);
    }
    st.entered = true;
  }

  /* ---------------------------------------------------------------- api --- */
  function render(host, ctx) {
    if (!host) return;
    ctx = ctx || {};
    const st = stateFor(host);
    st.host = host;
    st.ctx = ctx;
    if (!st.root || !host.contains(st.root)) {
      mount(host, st);
      st.sig = null;
      st.entered = false;
      st.painted = -1;
    }
    accumulate(st, ctx);
    st.model = buildModel(st);
    const m = st.model;
    const sig = [st.version, st.lastKey, m.rows.length, m.samples, m.bufMax,
      m.empty ? "e" : "d", ctx.motion || "full"].join("~");
    if (sig === st.sig) return;
    st.sig = sig;
    paint(st, ctx);
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews["latency"] = { title: "延迟热力", eyebrow: "LATENCY HEATMAP", render: render };
})();
