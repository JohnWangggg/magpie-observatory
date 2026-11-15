/* ------------------------------------------------------------------ forecast
 * Forecast — burn-down chart with exhaustion projection:
 * every quota window draws its % remaining history as a
 * sparkline, extended by a dotted projection line to the
 * moment it hits 0% (or its reset). Windows forecast to
 * exhaust before reset get an amber skull marker;
 * sessions are pressure gauges on the margin.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "forecast";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const fmtH = min => {
    if (min == null || !isFinite(min)) return "—";
    if (min < 60) return Math.max(1, Math.round(min)) + "m";
    if (min < 60 * 24) return (min / 60).toFixed(1) + "h";
    return (min / 60 / 24).toFixed(1) + "d";
  };

  function render(host, ctx) {
    const hist = ctx.data.quotaHistory || [];
    const quotas = ctx.data.quotas || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = Math.max(640, host.clientWidth || 760), H = Math.max(280, (host.clientHeight || 360) - 32), PAD = 18, TOP = 28, BOT = 48;

    // Assemble windows: use live `used` + `resetsIn`, and the history line
    // when present for slope estimation.
    const rows = [];
    quotas.forEach(q => {
      const histQ = hist.find(h => h.provider === q.provider) ||
        hist.find(h => h.name === q.name);
      (q.windows || []).slice(0, 2).forEach((w, wi) => {
        const used = Number(w.used) || 0;
        const resetsIn = w.resetsIn == null ? null : Number(w.resetsIn);
        // slope: % of quota consumed per minute. Prefer history line slope
        // over the current window; fall back to used/elapsed.
        let burnRate = 0;
        const line = histQ && histQ.lines && histQ.lines[wi];
        if (line && line.points && line.points.length >= 4) {
          const pts = line.points;
          const last = pts[pts.length - 1];
          // find where this window started (last reset point)
          let startPt = pts[0];
          for (let i = pts.length - 1; i >= 0; i--) {
            if (pts[i].left > last.left + 5) { startPt = pts[i]; break; }
            if (i < pts.length - 1 && pts[i].left >= 99) { startPt = pts[i]; break; }
          }
          const spanMs = new Date(last.at) - new Date(startPt.at);
          const consumed = 100 - last.left;
          if (spanMs > 0 && consumed > 0) burnRate = consumed / (spanMs / 60000);
        }
        if (!burnRate && resetsIn != null) {
          // guess window length from name
          const nameM = String(w.name || "").match(/(\d+)\s*([hdw])/i);
          let periodMin = 7 * 24 * 60;
          if (nameM) {
            const v = +nameM[1];
            periodMin = /h/i.test(nameM[2]) ? v * 60 : /d/i.test(nameM[2]) ? v * 60 * 24 : v * 60 * 24 * 7;
          }
          const elapsed = Math.max(30, periodMin - resetsIn);
          burnRate = used / elapsed;
        }
        const left = 100 - used;
        const toEmpty = burnRate > 0 ? left / burnRate : Infinity;
        const exhaustsBeforeReset = resetsIn != null && toEmpty < resetsIn;
        rows.push({
          prov: q.provider, plan: q.name || q.provider, win: w.name || "额度",
          used, left, resetsIn, burnRate, toEmpty,
          exhaustsBeforeReset, balance: resetsIn == null,
          histLine: line ? line.points : null
        });
      });
    });
    rows.sort((a, b) => (a.toEmpty === Infinity ? 9e9 : a.toEmpty) - (b.toEmpty === Infinity ? 9e9 : b.toEmpty));
    const show = rows.slice(0, 6);

    const rowH = (H - TOP - BOT) / Math.max(1, show.length);

    // --- draw --------------------------------------------------------------
    const grid = [];
    for (let p = 0; p <= 4; p++) {
      const y = TOP + p * 14;
      grid.push(`<line x1="${PAD + 118}" y1="${y}" x2="${W - PAD}" y2="${y}" stroke="var(--line-2)" stroke-width=".5" opacity=".6"/>`);
    }

    const lines = show.map((r, i) => {
      const m = metaOf(pmeta, r.prov);
      const col = m.color || "#8ab4f8";
      const y0 = TOP + i * rowH + 8;
      const chartX = PAD + 118;
      const chartW = W - PAD - chartX;

      // burn line: history last 24 pts if present, else synthetic ramp
      let path = "", proj = "", skull = "";
      const pts = r.histLine ? r.histLine.slice(-24) : null;
      const plotW = chartW * .62;
      if (pts && pts.length >= 2) {
        const maxLeft = Math.max(...pts.map(p => p.left), 1);
        const minLeft = Math.min(...pts.map(p => p.left));
        const span = Math.max(1, maxLeft - Math.min(0, minLeft));
        path = pts.map((p, j) => `${(chartX + j / (pts.length - 1) * plotW).toFixed(1)},${(y0 + 12 - (p.left / 100) * 12).toFixed(1)}`)
          .join(" L");
        path = `M ${path}`;
      } else {
        path = `M ${chartX} ${y0} L ${chartX + plotW} ${(y0 + 12 - r.left * .12).toFixed(1)}`;
      }
      // projection: from end of history to exhaustion or reset
      const nowX = chartX + plotW;
      const endMin = r.resetsIn != null ? Math.min(r.resetsIn, r.toEmpty === Infinity ? r.resetsIn : r.toEmpty) : Math.min(r.toEmpty, 60 * 24 * 7);
      const projX = nowX + Math.min(chartW * .34, (endMin / (60 * 24 * 7)) * chartW * .34);
      const projLeft = Math.max(0, r.left - r.burnRate * endMin);
      proj = `<line x1="${nowX}" y1="${(y0 + 12 - r.left * .12).toFixed(1)}" x2="${projX.toFixed(1)}" y2="${(y0 + 12 - projLeft * .12).toFixed(1)}" stroke="${r.exhaustsBeforeReset ? "var(--amber)" : col}" stroke-width="1" stroke-dasharray="2 2" opacity=".8"/>`;
      if (r.exhaustsBeforeReset) {
        skull = `<g class="fc-skull"><circle cx="${projX.toFixed(1)}" cy="${(y0 + 12).toFixed(1)}" r="3.4" fill="var(--amber)" opacity=".9"/>
          <text x="${projX.toFixed(1)}" y="${(y0 + 15).toFixed(1)}" text-anchor="middle" font-size="6" fill="#201404">!</text></g>`;
      } else if (r.resetsIn != null) {
        skull = `<text x="${projX.toFixed(1)}" y="${(y0 + 15).toFixed(1)}" text-anchor="end" class="fc-reset">↻${fmtH(r.resetsIn)}</text>`;
      }

      const state = r.exhaustsBeforeReset ? `⚠ ${fmtH(r.toEmpty)}` : r.balance ? `余额` : `↻${fmtH(r.resetsIn)}`;
      const stateCls = r.exhaustsBeforeReset ? "fc-warn" : "";
      return `<g class="fc-row">
        <text x="${PAD}" y="${y0 + 4}" class="fc-name">${esc((m.name || r.prov).slice(0, 9))}</text>
        <text x="${PAD}" y="${y0 + 14}" class="fc-win">${esc(r.win)} · ${Math.round(r.used)}%</text>
        <path d="${path}" fill="none" stroke="${col}" stroke-width="1.6" stroke-linecap="round"/>
        ${proj}${skull}
        <text x="${W - PAD}" y="${y0 + 8}" class="fc-eta ${stateCls}" text-anchor="end">${state}</text>
      </g>`;
    }).join("");

    // pressure gauges — sessions on the margin
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 4);
    const gauges = sessions.map((s, i) => {
      const col = (ctx.agentMeta && ctx.agentMeta[s.agent] && ctx.agentMeta[s.agent].color) || "#a8c8f8";
      const x = PAD + i * 70;
      const y = H - 34;
      const pct = Math.min(1, (s.tps || 0) / 100);
      return `<g class="fc-gauge">
        <rect x="${x}" y="${y}" width="56" height="7" rx="3.5" fill="var(--card-2)" stroke="var(--line-2)"/>
        <rect x="${x + 1.5}" y="${y + 1.5}" width="${(53 * pct).toFixed(1)}" height="4" rx="2" fill="${col}"/>
        <text x="${x + 28}" y="${y + 18}" class="fc-glabel" text-anchor="middle">${esc(String(s.agent || "?").slice(0, 8))} ${(s.tps || 0).toFixed(0)}t/s</text>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const warnN = show.filter(r => r.exhaustsBeforeReset).length;

    host.innerHTML = `
      <div class="fc-wrap">
        <div class="fc-head"><b>FORECAST</b><span>历史烧线 → 虚线投影${warnN ? " · ⚠ " + warnN + " 窗前耗尽" : " · 全部撑到重置"}</span></div>
        <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="${W}" height="${H}" fill="var(--card)" rx="10"/>
          ${grid.join("")}
          <text x="${PAD + 118}" y="${TOP - 6}" class="fc-axis">剩余% 历史 →</text>
          <text x="${W - PAD}" y="${TOP - 6}" class="fc-axis" text-anchor="end">→ 投影</text>
          ${lines}
          ${gauges}
          <g class="fc-card">
            <rect x="${W - 120}" y="${H - 34}" width="106" height="24" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="${W - 112}" y="${H - 18}" class="fc-k">${fmt(k.tokens)}</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "预测", eyebrow: "FORECAST", render };
})();
