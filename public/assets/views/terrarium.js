/* ---------------------------------------------------------------- terrarium
 * Terrarium — each provider window is a glass jar:
 *   water level = used %, the live tps fizzles as bubbles, and each
 *   session tries-chain is a little fish swimming inside. Over 85% the
 *   jar tips red and the fish surface.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "terrarium";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done");
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    // group live sessions by their provider so each jar gets its own fish
    const byProv = new Map();
    sessions.forEach(s => byProv.set(s.provider, (byProv.get(s.provider) || 0) + 1));

    const jars = quotas.map((w, i) => {
      const pm = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const lvl = Math.min(100, Math.max(4, w.used));
      const fish = sessions.filter(s => s.provider === w.prov).slice(0, 4);
      const fishes = fish.map((f, j) => {
        const am = metaOf(ameta, f.agent);
        const dur = 6 + (j % 3) * 2; // swim period
        const y = 22 + j * 12;       // lane height (px from top)
        return `<ellipse class="ter-fish${f.status === "err" ? " dead" : ""}"
            style="--fc:${am.color || "#8b7cf6"};animation-duration:${dur}s;top:${y}px"
            cx="0" cy="0" rx="7" ry="4"/>`;
      }).join("");
      const bubbles = Array.from({ length: Math.min(5, Math.ceil((w.used / 20)) + 1) }, (_, j) =>
        `<circle class="ter-bub" style="animation-delay:${(j * 0.4).toFixed(1)}s;animation-duration:${(2.4 - Math.min(1.4, w.used / 60)).toFixed(2)}s" cx="${18 + j * 13}" cy="0" r="${1.5 + (j % 2)}"/>`
      ).join("");
      return `<div class="ter-jar${hot ? " hot" : ""}" style="--pc:${pm.color || "#56d4dd"}">
        <svg viewBox="0 0 100 110" preserveAspectRatio="none" aria-hidden="true">
          <defs><clipPath id="ter-c${i}"><path d="M14 8 L86 8 L82 104 Q81 106 79 106 L21 106 Q19 106 18 104 Z"/></clipPath></defs>
          <path class="ter-glass" d="M14 8 L86 8 L82 104 Q81 106 79 106 L21 106 Q19 106 18 104 Z"/>
          <g clip-path="url(#ter-c${i})">
            <rect class="ter-water${hot ? " hot" : ""}" x="12" y="${106 - lvl * 0.95}" width="76" height="${lvl * 0.95 + 6}"/>
            <path class="ter-surface" d="M12 ${106 - lvl * 0.95} Q32 ${103 - lvl * 0.95} 50 ${106 - lvl * 0.95} T88 ${106 - lvl * 0.95}" stroke="${pm.color || "var(--accent)"}" stroke-width="1.5" fill="none" opacity=".8"/>
            ${bubbles}
            ${fishes}
          </g>
        </svg>
        <div class="ter-tag">
          <b>${Math.round(w.used)}%</b>
          <small>${esc(pm.name || w.prov)}</small>
          <span>${esc(w.name)}</span>
          ${byProv.get(w.prov) ? `<em>${byProv.get(w.prov)} 鱼</em>` : ""}
        </div>
      </div>`;
    }).join("");

    if (!jars) { host.innerHTML = `<div class="ter-empty">无配额窗口</div>`; return; }

    const hotN = quotas.filter(w => w.used >= 85).length;
    host.innerHTML = `
      <div class="ter-wrap">
        <div class="ter-head"><b>TERRARIUM</b><span>每窗=玻璃罐 · 水位=用量% · 鱼=会话${hotN ? " · " + hotN + " 罐将沸" : ""}</span></div>
        <div class="ter-grid">${jars}</div>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "生态罐", eyebrow: "TERRARIUM", render };
})();
