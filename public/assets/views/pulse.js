/* ------------------------------------------------------------------ pulse
 * Pulse view — a bedside-monitor trace per session: amplitude = live tps,
 * heart-rate readout = total tps, error sessions flatline.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "pulse";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function wavePath(w, h, amp, phase, freq) {
    const mid = h / 2, pts = [];
    const n = Math.max(60, Math.floor(w / 6));
    for (let i = 0; i <= n; i++) {
      const x = (i / n) * w;
      // ECG-ish: sharp R-spike + T-wave bump + baseline wander
      const t = (i / n) * freq * Math.PI * 2 + phase;
      const s = Math.sin(t);
      const spike = Math.pow(Math.abs(s), 24) * Math.sign(s) * 1.4;
      const twave = Math.pow(Math.max(0, Math.sin(t + 0.9)), 6) * 0.35;
      const wander = Math.sin(t * 0.33) * 0.1;
      const y = mid - (spike + twave + wander) * amp;
      pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }
    return `M ${pts.join(" L ")}`;
  }

  function render(host, ctx) {
    const all = (ctx.data.sessions || []).concat(ctx.data.recent || []);
    const sessions = all.slice(0, 6);
    const ameta = ctx.agentMeta || {};
    const ametaOf = k => (typeof ameta === "function" ? ameta(k) : (ameta[k] || {}));
    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const phase = (Date.now() / 900) % (Math.PI * 2);

    const totalTps = sessions.reduce((a, s) => a + (s.tps || 0), 0);
    const bpm = Math.round(totalTps * 0.9);
    const rowH = H / Math.max(1, sessions.length + 1);

    let traces = "", labels = "";
    sessions.forEach((s, i) => {
      const col = ametaOf(s.agent).color || "#8b7cf6";
      const dead = s.status === "error" || s.status === "failed";
      const amp = dead ? 0 : Math.min(rowH * 0.42, (s.tps || 0) * 0.85 + 7);
      const y0 = rowH * (i + 1);
      const cy = y0 + rowH / 2;
      const w = W - 150;
      const d = dead
        ? `M 60 ${cy} L ${w} ${cy}`
        : wavePath(w - 60, rowH * 0.9, amp, phase + i * 1.3, 1.4 + (s.tps || 0) / 90);
      traces += `<g class="pu-trace ${dead ? "flat" : ""}">
        <path d="${d}" transform="translate(60,${(cy - rowH * 0.45).toFixed(1)})" fill="none"
          stroke="${col}" stroke-width="1.6" stroke-linejoin="round" opacity="${dead ? ".4" : ".9"}"/>
        <path d="${d}" transform="translate(60,${(cy - rowH * 0.45).toFixed(1)})" fill="none"
          stroke="${col}" stroke-width="4" stroke-linejoin="round" opacity="${dead ? "0" : ".18"}"/>
      </g>`;
      labels += `<g class="pu-lab">
        <circle cx="18" cy="${cy}" r="3" fill="${col}" opacity="${dead ? ".35" : "1"}"/>
        <text x="28" y="${cy + 3}" class="pu-name">${esc((s.title || s.agent || "?").slice(0, 8))}</text>
        <text x="${W - 60}" y="${cy + 3}" class="pu-tps" text-anchor="end">${dead ? "—" : Math.round(s.tps || 0) + " t/s"}</text>
      </g>`;
    });

    const beat = bpm > 0 ? `<g class="pu-bpm">
      <text x="${W - 14}" y="34" text-anchor="end" class="pu-bpm-n">${bpm}</text>
      <text x="${W - 14}" y="48" text-anchor="end" class="pu-bpm-u">BPM · tokens/s</text>
      <circle cx="${W - 20}" cy="62" r="4" class="pu-heart" style="animation-duration:${Math.max(0.4, 60 / Math.max(20, bpm)).toFixed(2)}s"/>
    </g>` : "";

    if (!sessions.length) {
      host.innerHTML = `<div class="pu-empty">暂无会话 · 监护仪待机</div>`;
      return;
    }

    host.innerHTML = `
      <div class="pu-wrap">
        <svg class="pu-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
          <defs>
            <pattern id="pu-grid" width="22" height="22" patternUnits="userSpaceOnUse">
              <path d="M 22 0 H 0 V 22" fill="none" stroke="rgba(255,255,255,.05)" stroke-width=".6"/>
            </pattern>
          </defs>
          <rect width="${W}" height="${H}" fill="url(#pu-grid)"/>
          ${traces}${labels}${beat}
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = {
    title: "脉搏",
    eyebrow: "PULSE MONITOR",
    render
  };
})();
