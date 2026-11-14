/* ---------------------------------------------------------------- tapestry
 * Tapestry — the day's data woven on a loom:
 *   - warp threads = the six hottest quota windows, thickness = used %
 *   - weft threads = live sessions crossing them, colour = agent
 *   - the weave itself is a woven basket pattern (over/under)
 *   - a legend strip names each warp thread
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "tapestry";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done");
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 400, M = 32;
    const n = quotas.length || 1;
    const xStep = (W - M * 2) / (n + 1);
    const warp = quotas.map((w, i) => {
      const x = M + (i + 1) * xStep;
      const thick = 2 + (w.used / 100) * 7;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      return `<line class="tap-warp${hot ? " hot" : ""}" x1="${x.toFixed(1)}" y1="${M}" x2="${x.toFixed(1)}" y2="${H - M}"
        stroke="${hot ? "var(--red)" : m.color || "#8b7cf6"}" stroke-width="${thick.toFixed(1)}" stroke-linecap="round" opacity=".85"/>`;
    }).join("");

    const weft = sessions.slice(0, 12).map((s, i) => {
      const y = M + 24 + i * ((H - M * 2 - 48) / 11);
      const m = metaOf(ameta, s.agent);
      const dash = s.status === "err" ? "3 5" : s.status === "done" ? "1 6" : "";
      const glow = s.tps && s.tps > 25;
      return `<line class="tap-weft${s.status === "err" ? " dead" : ""}${glow ? " glow" : ""}" x1="${M}" y1="${y.toFixed(1)}" x2="${W - M}" y2="${y.toFixed(1)}"
        stroke="${m.color || "#56d4dd"}" stroke-width="${(1.2 + Math.min(3, (s.tokens || 0) / 4e6)).toFixed(1)}"
        ${dash ? `stroke-dasharray="${dash}"` : ""} stroke-linecap="round" opacity=".8"/>`;
    }).join("");

    // tiny knots where weft crosses warp on hot windows only
    const knots = [];
    quotas.forEach((w, wi) => {
      if (w.used < 60) return;
      const x = M + (wi + 1) * xStep;
      sessions.slice(0, 6).forEach((s, si) => {
        const y = M + 24 + si * ((H - M * 2 - 48) / 11);
        const m = metaOf(ameta, s.agent);
        knots.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.2" fill="${m.color || "#56d4dd"}" opacity=".9"/>`);
      });
    });

    const legend = quotas.map((w, i) => {
      const m = metaOf(pmeta, w.prov);
      return `<span><i style="background:${m.color || "#8b7cf6"}"></i>${esc((m.name || w.prov).slice(0, 7))} ${Math.round(w.used)}%</span>`;
    }).join("");

    host.innerHTML = `
      <div class="tap-wrap">
        <div class="tap-head"><b>TAPESTRY</b><span>经=配额 纬=会话 · 结=交互热点</span></div>
        <svg viewBox="0 0 400 400" preserveAspectRatio="xMidYMid meet">
          <rect x="${M - 14}" y="${M - 14}" width="${W - M * 2 + 28}" height="${H - M * 2 + 28}" rx="10"
            fill="color-mix(in srgb, var(--card-2) 40%, transparent)" stroke="var(--line)" stroke-width="1"/>
          ${weft}${warp}${knots.join("")}
        </svg>
        <div class="tap-legend">${legend || "<span>无配额窗口</span>"}</div>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "织锦", eyebrow: "TAPESTRY", render };
})();
