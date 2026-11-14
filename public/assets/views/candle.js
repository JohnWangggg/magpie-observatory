/* ----------------------------------------------------------------- candle
 * Candlestick view — every period is a candle:
 *   open  = previous period's tokens, close = this period's tokens,
 *   high  = max(open, close), low = min(open, close).
 * Green when throughput rose, red when it fell. The wick is the range.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "candle";

  const palette = () => ({
    up:   "#5ad4a6",
    down: "#f26d7f",
    wick: "rgba(255,255,255,.5)",
    grid: "rgba(255,255,255,.06)",
    text: "rgba(255,255,255,.45)",
  });

  function fmt(n) {
    if (n >= 1e9) return (n / 1e9).toFixed(1) + "B";
    if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
    if (n >= 1e3) return (n / 1e3).toFixed(1) + "k";
    return String(Math.round(n));
  }

  function render(host, ctx) {
    const series = (ctx.view && ctx.view.series) || ctx.data.series || [];
    const metric = ctx.metric || "tokens";
    const esc = ctx.esc || (x => String(x));

    if (!series.length) {
      host.innerHTML = `<div class="candle-empty">暂无序列数据</div>`;
      return;
    }

    // Build candles
    const candles = series.map((p, i) => {
      const prev = i ? (metric === "tokens" ? series[i - 1].tokens : series[i - 1].cost) : 0;
      const cur = metric === "tokens" ? p.tokens : p.cost;
      return {
        label: p.label,
        open: prev,
        close: cur,
        high: Math.max(prev, cur),
        low: Math.min(prev, cur),
        up: cur >= prev,
        i,
      };
    });

    const maxV = Math.max(1, ...candles.map(c => c.high));
    const pad = { t: 20, r: 60, b: 34, l: 56 };
    const W = host.clientWidth || 800;
    const H = host.clientHeight || 340;
    const iw = W - pad.l - pad.r;
    const ih = H - pad.t - pad.b;
    const n = candles.length;
    const step = iw / Math.max(1, n);
    const bodyW = Math.max(3, Math.min(22, step * 0.62));
    const y = v => pad.t + ih - (v / maxV) * ih;
    const x = i => pad.l + step * (i + 0.5);
    const C = palette();

    // grid
    const gridRows = 5;
    let grid = "";
    for (let g = 0; g <= gridRows; g++) {
      const gv = (maxV / gridRows) * g;
      const gy = y(gv);
      grid += `<line x1="${pad.l}" y1="${gy}" x2="${W - pad.r}" y2="${gy}" stroke="${C.grid}" stroke-width="1" stroke-dasharray="${g ? "3,4" : "0"}"/>`;
      grid += `<text x="${pad.l - 8}" y="${gy + 4}" text-anchor="end" font-size="10" fill="${C.text}">${fmt(gv)}</text>`;
    }

    // candles
    let bars = "";
    candles.forEach(c => {
      const cx = x(c.i);
      const yH = y(c.high), yL = y(c.low);
      const yO = y(c.open), yC = y(c.close);
      const col = c.up ? C.up : C.down;
      const bodyTop = Math.min(yO, yC);
      const bodyH = Math.max(2, Math.abs(yO - yC));
      // wick
      bars += `<line class="candle-wick" x1="${cx}" y1="${yH}" x2="${cx}" y2="${yL}" stroke="${col}" stroke-width="1.5"/>`;
      // body
      bars += `<rect class="candle-body" x="${cx - bodyW / 2}" y="${bodyTop}" width="${bodyW}" height="${bodyH}" fill="${col}" rx="2" opacity="${c.close === 0 && c.open === 0 ? ".18" : ".95"}"><title>${esc(c.label)} · ${fmt(c.close)}</title></rect>`;
      // label every few
      const stepLabel = Math.ceil(n / 10);
      if (c.i % stepLabel === 0 || c.i === n - 1) {
        bars += `<text x="${cx}" y="${H - pad.b + 16}" text-anchor="middle" font-size="10" fill="${C.text}">${esc(c.label)}</text>`;
      }
    });

    // invisible hit-areas per candle (full column, for hover + keys)
    let hits = "";
    candles.forEach(c => {
      hits += `<rect class="candle-hit" data-i="${c.i}" x="${pad.l + step * c.i}" y="${pad.t}" width="${step}" height="${ih}" fill="transparent"/>`;
    });

    // moving average (3-period)
    let ma = "";
    if (n >= 3) {
      let d = "";
      candles.forEach((c, i) => {
        const win = candles.slice(Math.max(0, i - 2), i + 1);
        const avg = win.reduce((a, b) => a + b.close, 0) / win.length;
        d += (i === 0 ? "M" : "L") + x(i).toFixed(1) + "," + y(avg).toFixed(1) + " ";
      });
      ma = `<path d="${d}" fill="none" stroke="rgba(139,124,246,.7)" stroke-width="1.5" stroke-dasharray="4,3"/>`;
    }

    // stats
    const up = candles.filter(c => c.up).length;
    const down = n - up;
    const total = candles.reduce((a, b) => a + b.close, 0);
    const peak = candles.reduce((a, b) => b.high > a.high ? b : a, candles[0]);
    const streak = (() => {
      let s = 0, cur = candles[n - 1].up;
      for (let i = n - 1; i >= 0; i--) {
        if (candles[i].up === cur) s++; else break;
      }
      return { n: s, up: cur };
    })();

    host.innerHTML = `
      <div class="candle-wrap">
        <div class="candle-legend">
          <span class="cl-stat up">▲ ${up}</span>
          <span class="cl-stat down">▼ ${down}</span>
          <span class="cl-streak ${streak.up ? "up" : "down"}">${streak.up ? "↑" : "↓"} ${streak.n} 连${streak.up ? "升" : "降"}</span>
          <span class="cl-peak">峰 ${esc(peak.label)} · ${fmt(peak.high)}</span>
          <span class="cl-total">Σ ${fmt(total)}</span>
          <span class="cl-unit">${metric === "tokens" ? "TOK" : "USD"}</span>
        </div>
        <svg class="candle-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
          ${grid}${ma}${bars}
          <g class="candle-xh" hidden>
            <line class="xh-v" y1="${pad.t}" y2="${H - pad.b}"/>
            <rect class="xh-box" rx="4"/>
            <text class="xh-t1"/><text class="xh-t2"/>
          </g>
          ${hits}
        </svg>
        <div class="candle-ohlc" hidden></div>
      </div>`;

    // crosshair + OHLC card
    const svg = host.querySelector(".candle-svg");
    const xh = host.querySelector(".candle-xh");
    const card = host.querySelector(".candle-ohlc");
    const xhV = xh.querySelector(".xh-v");
    const xhBox = xh.querySelector(".xh-box");
    const xhT1 = xh.querySelector(".xh-t1");
    const xhT2 = xh.querySelector(".xh-t2");

    function showCandle(i) {
      const c = candles[i];
      if (!c) return;
      xh.hidden = false;
      const cx = x(i);
      xhV.setAttribute("x1", cx); xhV.setAttribute("x2", cx);
      const chg = c.open ? ((c.close - c.open) / c.open * 100) : 0;
      xhT1.textContent = `${c.label}  O ${fmt(c.open)}  C ${fmt(c.close)}`;
      xhT2.textContent = `${chg >= 0 ? "+" : ""}${chg.toFixed(1)}%  H ${fmt(c.high)}  L ${fmt(c.low)}`;
      const bw = 172, bx = Math.min(Math.max(cx - bw / 2, pad.l + 2), W - pad.r - bw - 4);
      xhBox.setAttribute("x", bx); xhBox.setAttribute("y", pad.t + 6);
      xhBox.setAttribute("width", bw); xhBox.setAttribute("height", 34);
      xhT1.setAttribute("x", bx + 8); xhT1.setAttribute("y", pad.t + 20);
      xhT2.setAttribute("x", bx + 8); xhT2.setAttribute("y", pad.t + 34);
      host.querySelectorAll(".candle-body").forEach(b => b.classList.toggle("dim", +b.dataset.i !== i));
      card.hidden = false;
      card.innerHTML = `<b>${esc(c.label)}</b> O <em>${fmt(c.open)}</em> H <em>${fmt(c.high)}</em> L <em>${fmt(c.low)}</em> C <em>${fmt(c.close)}</em> <i class="${chg >= 0 ? "up" : "down"}">${chg >= 0 ? "+" : ""}${chg.toFixed(1)}%</i>`;
    }
    function hideCandle() {
      xh.hidden = true; card.hidden = true;
      host.querySelectorAll(".candle-body").forEach(b => b.classList.remove("dim"));
    }

    host.querySelectorAll(".candle-hit").forEach(h => {
      h.addEventListener("pointerenter", () => showCandle(+h.dataset.i));
      h.addEventListener("pointermove", () => showCandle(+h.dataset.i));
      h.addEventListener("pointerleave", hideCandle);
      h.addEventListener("click", () => showCandle(+h.dataset.i));
    });
    svg.addEventListener("pointerleave", hideCandle);

    // keyboard: ←→ walk, Enter pin, Esc clear
    if (!host.hasAttribute("tabindex")) host.tabIndex = 0;
    host.classList.add("kb-focus");
    host.onkeydown = e => {
      const cur = +(host.dataset.sel ?? -1);
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        const next = Math.min(n - 1, Math.max(0, cur + (e.key === "ArrowRight" ? 1 : -1)));
        host.dataset.sel = next; showCandle(next);
      } else if (e.key === "Enter") { e.preventDefault(); showCandle(cur < 0 ? 0 : cur); }
      else if (e.key === "Escape") { host.dataset.sel = -1; hideCandle(); }
    };
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = {
    title: "K线吞吐",
    eyebrow: "CANDLE THROUGHPUT",
    render
  };
})();
