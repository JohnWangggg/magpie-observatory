/* ---------------------------------------------------------------- pinboard
 * Pinboard — the dashboard's talking points pinned to a corkboard:
 *   KPI chips, quota flags, top sessions and the attention strip become
 *   index cards with tape corners, laid out like a detective's wall.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "pinboard";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 5);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {};
    const pmeta = ctx.providerMeta || {};
    const metaOf = (m, kk) => (typeof m === "function" ? m(kk) : (m[kk] || {}));
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const fmtMoney = ctx.fmtMoney || (v => "$" + Number(v).toFixed(2));

    // jittered deterministic layout so cards look pinned, not gridded
    const jit = (i, s) => (((i * 73 + s * 31) % 17) / 17 - 0.5) * 14;

    // top-left cluster: the six KPIs as sticky notes
    const kpiCards = [
      { t: "请求", v: (k.requests || 0).toLocaleString(), u: "次", c: "#8b7cf6" },
      { t: "Tokens", v: fmt(k.tokens), u: "", c: "#56d4dd" },
      { t: "费用", v: fmtMoney(k.cost), u: "USD", c: "#4ade80" },
      { t: "缓存", v: (k.cache || 0).toFixed(1) + "%", u: "", c: "#fbbf24" },
      { t: "TPS", v: (k.tps || 0).toFixed(1), u: "tok/s", c: "#f472b6" },
      { t: "活跃", v: String(k.active || 0), u: "会话", c: "#60a5fa" }
    ].map((it, i) => `
      <div class="pb-card pb-k" style="--pc:${it.c};transform:rotate(${jit(i, 1).toFixed(1)}deg)">
        <div class="pb-tape"></div>
        <small>${it.t}</small><b>${it.v}</b><span>${it.u}</span>
      </div>`).join("");

    // quota board column: the hottest windows as flag cards
    const qCards = quotas.map((w, i) => {
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      return `<div class="pb-card pb-q${hot ? " hot" : ""}" style="--pc:${m.color || "#f59e0b"};transform:rotate(${jit(i, 2).toFixed(1)}deg)">
        <div class="pb-tape"></div>
        <small>${esc(m.name || w.prov)}</small><b>${Math.round(w.used)}%</b><span>${esc(w.name)}</span>
        <div class="pb-bar"><i style="width:${Math.min(100, w.used)}%;background:${hot ? "var(--red)" : m.color || "var(--accent)"}"></i></div>
      </div>`;
    }).join("");

    // session cluster: live cards as Polaroid snaps
    const sCards = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const age = Date.now() - s.startedAt;
      const ageTxt = age > 3600e3 ? (age / 3600e3).toFixed(1) + "h" : age > 60e3 ? Math.round(age / 60e3) + "m" : Math.max(1, Math.round(age / 1e3)) + "s";
      return `<div class="pb-card pb-s" style="--pc:${m.color || "#8b7cf6"};transform:rotate(${jit(i, 3).toFixed(1)}deg)">
        <div class="pb-tape"></div>
        <small>${esc(m.name || s.agent)}</small><b>${esc((s.title || "").slice(0, 14))}</b>
        <div class="pb-row"><span>${fmt(s.tokens || 0)}</span><span>${s.tps ? s.tps.toFixed(0) + " tok/s" : "—"}</span><span>${ageTxt}</span></div>
      </div>`;
    }).join("");

    // attention line pinned under the board
    const quotaHot = quotas.filter(w => w.used >= 85).length;
    const errs = (ctx.data.logs || []).filter(l => l.status === "err").length;
    const attn = quotaHot
      ? `${quotaHot} 个配额窗口 ≥85% · ${errs} 条失败`
      : errs >= 3 ? `${errs} 条请求失败` : `一切平稳 · ${sessions.length} 会话活跃`;

    host.innerHTML = `
      <div class="pb-wrap">
        <div class="pb-head"><b>PINBOARD</b><span>钉板 · KPI/配额/会话一眼看全</span></div>
        <div class="pb-board">
          <div class="pb-zone pb-z1"><em>KPI</em>${kpiCards}</div>
          <div class="pb-zone pb-z2"><em>配额</em>${qCards}</div>
          <div class="pb-zone pb-z3"><em>会话</em>${sCards}</div>
        </div>
        <div class="pb-attn"><i></i>${esc(attn)}</div>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "钉板", eyebrow: "PINBOARD", render };
})();
