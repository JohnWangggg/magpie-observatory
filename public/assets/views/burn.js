/* ==========================================================================
   burn.js — 燃烧速率 BURN RATE view
   One row per provider quota window: how fast the % is dropping right now,
   what the line is projected to be at reset, and how that compares to the
   flat pace a window was designed for. Sorted riskiest first.
   Standalone classic script. Registers window.ObservatoryViews["burn"].
   ========================================================================== */
(function () {
  "use strict";

  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const num = v => { const n = Number(v); return isFinite(n) ? n : 0; };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function fmtT(v) { const n = num(v); return n >= 1e6 ? (n / 1e6).toFixed(1) + "M" : n >= 1e3 ? (n / 1e3).toFixed(1) + "K" : String(Math.round(n)); }
  function fmtH(h) {
    if (h == null) return "—";
    if (h < 1) return Math.round(h * 60) + "m";
    if (h < 48) return h.toFixed(1) + "h";
    return Math.round(h / 24) + "d";
  }

  /* --------------------------------------------------------- burn math --- */
  // Same projection math as the quota card: window slope → projected left at
  // reset, minus the flat pace that "should" be true if burn was even.
  function burnRows(ctx) {
    const rows = [];
    (ctx.data.quotaHistory || []).forEach(entry => {
      (entry.lines || []).forEach(line => {
        const pts = (line.points || []).filter(p => p && p.at && isFinite(Number(p.left)));
        if (pts.length < 2) return;
        const last = pts[pts.length - 1];
        const winStart = Date.parse(last.start || pts[0].at);
        let from = pts[0];
        for (let i = pts.length - 1; i >= 0; i--) {
          if (winStart && Date.parse(pts[i].at) < winStart) break;
          from = pts[i];
        }
        const hours = (Date.parse(last.at) - Date.parse(from.at)) / 3600000;
        const rate = hours > 0.1 ? Math.max(0, (from.left - last.left) / hours) : 0;
        const resetMs = last.resetsAt ? Date.parse(last.resetsAt) : null;
        const toResetH = resetMs != null ? Math.max(0, (resetMs - Date.parse(last.at)) / 3600000) : null;
        // Window duration from start → reset gives the flat pace: if the
        // window is 5h and we're 2h in, even burn = 40%.
        const winH = resetMs != null && winStart ? Math.max(0.5, (resetMs - winStart) / 3600000) : null;
        const elapsedH = resetMs != null ? winH - toResetH : hours;
        const flat = winH != null ? clamp(elapsedH / winH, 0, 1) * 100 : null;
        const projected = toResetH != null ? last.left - rate * toResetH : null;
        const over = flat != null ? (100 - last.left) - flat : null; // >0 = ahead of pace
        const risk = projected == null ? "flat" : projected < 0 ? "red" : projected < 20 ? "amber" : "green";
        rows.push({
          name: (entry.name || entry.provider) + " · " + (line.name || "窗口"),
          provider: entry.provider,
          left: last.left, rate, resetH: toResetH, projected, flat, over, risk,
          used: 100 - last.left, pts: pts.slice(-24),
          sortKey: projected == null ? last.left : projected
        });
      });
    });
    return rows.sort((a, b) => a.sortKey - b.sortKey);
  }

  /* -------------------------------------------------------------- DOM --- */
  function render(host, ctx) {
    host.classList.add("view-burn");
    const rows = burnRows(ctx);
    const sig = rows.map(r => r.provider + r.name + Math.round(r.left)).join("|");
    if (host.dataset.sig === sig) return;
    host.dataset.sig = sig;

    if (!rows.length) {
      host.innerHTML = `<div class="empty-state"><b>燃烧速率暂无数据</b><span>需要网关的 <code>quotaHistory</code> 打点；headless 网关无此路由。</span></div>`;
      return;
    }
    const meta = ctx.providerMeta || (k => ({ name: k }));
    host.innerHTML = `
      <div class="burn-list">
        ${rows.map(r => {
          const m = meta(r.provider) || {};
          const pct = Math.round(r.used);
          const proj = r.projected != null ? Math.max(0, r.projected) : null;
          const overTxt = r.over == null ? "" : (r.over > 0 ? `+${Math.round(r.over)}% 超前` : `${Math.round(-r.over)}% 落后`);
          return `<div class="burn-row ${r.risk}" role="button" tabindex="0" aria-expanded="false" aria-label="${esc(r.name)} · 已用${pct}% · ${r.rate.toFixed(1)}%/h" data-idx="${rows.indexOf(r)}" data-prov="${esc(r.provider)}" data-win="${esc(r.name)}">
            <div class="burn-name">
              <b>${esc(m.name || r.provider)}</b>
              <span>${esc(r.name.split(" · ").slice(1).join(" · "))}</span>
            </div>
            <div class="burn-bar">
              <div class="burn-track">
                <div class="burn-flat" style="left:${r.flat != null ? clamp(r.flat, 0, 100) : 0}%"></div>
                <div class="burn-fill" style="width:${clamp(pct, 0, 100)}%"></div>
                ${proj != null ? `<div class="burn-proj" style="left:${clamp(100 - proj, 0, 100)}%"></div>` : ""}
              </div>
            </div>
            <div class="burn-nums">
              <b>${pct}%</b>
              <span>${r.rate.toFixed(1)}%/h</span>
              ${proj != null ? `<small>→ ${Math.round(100 - proj)}% @重置</small>` : ""}
            </div>
            <div class="burn-eta">
              <span>${r.resetH != null ? "重置 " + fmtH(r.resetH) : "—"}</span>
              <em>${overTxt}</em>
            </div>
          </div>`;
        }).join("")}
      </div>`;
    // Hover tooltip on a track: project the cursor x → window %, show where
    // that puts usage / flat pace / projection. Detach on mouseleave.
    let tip = null;
    host.querySelectorAll(".burn-track").forEach((track, i) => {
      const r = rows[i];
      track.addEventListener("mousemove", e => {
        if (!tip) {
          tip = document.createElement("div");
          tip.className = "burn-tip";
          host.appendChild(tip);
        }
        const rect = track.getBoundingClientRect();
        const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
        const flat = r.flat != null ? clamp(r.flat, 0, 100) : null;
        const over = r.over == null ? null : (r.over > 0 ? `+${Math.round(r.over)}%` : `${Math.round(-r.over)}%`);
        tip.innerHTML = `
          <b>${r.used.toFixed(1)}%</b> 已用
          <span>${r.rate.toFixed(2)}%/h</span>
          ${flat != null ? `<span>flat ${flat.toFixed(0)}%</span>` : ""}
          ${over != null ? `<span>${over} pace</span>` : ""}
          ${r.resetH != null ? `<small>重置 ${fmtH(r.resetH)}</small>` : ""}`;
        tip.style.left = `${e.clientX - host.getBoundingClientRect().left + 12}px`;
        tip.style.top = `${e.clientY - host.getBoundingClientRect().top - 6}px`;
      });
      track.addEventListener("mouseleave", () => { if (tip) { tip.remove(); tip = null; } });
    });
    if (!host.dataset.expandBound) {
      host.dataset.expandBound = "1";
      host.addEventListener("click", e => {
        const row = e.target.closest(".burn-row");
        if (!row) return;
        const idx = +row.dataset.idx;
        const r = burnRows(ctx)[idx];
        if (!r) return;
        const was = row.classList.contains("open");
        host.querySelectorAll(".burn-detail").forEach(d => d.remove());
        host.querySelectorAll(".burn-row").forEach(x => { x.classList.remove("open"); x.setAttribute("aria-expanded", "false"); });
        if (was) return;
        row.classList.add("open");
        row.setAttribute("aria-expanded", "true");
        const det = document.createElement("div");
        det.className = "burn-detail";
        det.innerHTML = `
          <div class="bd-curve">${sparkSvg(r.pts, r)}</div>
          <div class="bd-meta">
            <span>${r.pts.length} 个打点 · ${r.pts[0].at.slice(5, 16)} → ${r.pts[r.pts.length - 1].at.slice(5, 16)}</span>
            <span>窗口起点 ${Math.round(100 - r.pts[0].left)}% · 当前 ${Math.round(100 - r.left)}%</span>
            <button class="bd-csv" title="导出该窗口打点 CSV"><svg><use href="#i-arrow"/></svg>CSV</button>
          </div>`;
        row.after(det);
        det.querySelector(".bd-csv")?.addEventListener("click", e => {
          e.stopPropagation();
          const head = ["at", "left", "used", "start", "resetsAt"];
          const csv = [head.join(",")].concat(r.pts.map(p =>
            [p.at, p.left, (100 - p.left).toFixed(2), p.start || "", p.resetsAt || ""].join(",")
          )).join("\n");
          const a = document.createElement("a");
          a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
          a.download = `burn-${r.provider}-${r.name.replace(/[^a-z0-9]+/gi, "_")}.csv`;
          a.click();
          URL.revokeObjectURL(a.href);
        });
        // Hover the expanded sparkline → nearest point's left% + time.
        const curve = det.querySelector(".bd-curve");
        let ptip = null;
        curve.addEventListener("mousemove", e => {
          if (!ptip) {
            ptip = document.createElement("div");
            ptip.className = "burn-ptip";
            host.appendChild(ptip);
          }
          const rect = curve.getBoundingClientRect();
          const t = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
          const idx = Math.round(t * (r.pts.length - 1));
          const p = r.pts[idx];
          ptip.innerHTML = `<b>${(100 - p.left).toFixed(1)}%</b> 已用<span>${p.at.slice(5, 16)}</span>`;
          ptip.style.left = `${e.clientX - host.getBoundingClientRect().left + 10}px`;
          ptip.style.top = `${e.clientY - host.getBoundingClientRect().top - 30}px`;
        });
        curve.addEventListener("mouseleave", () => { if (ptip) { ptip.remove(); ptip = null; } });
      });
      // Keyboard nav inside burn: ↓/↑ move a focus ring, Enter expands,
      // Esc collapses. Focus is a class, not real DOM focus — keeps rows
      // clickable without stealing tab order.
      if (!host.dataset.kbBound) {
        host.dataset.kbBound = "1";
        let kbIdx = -1;
        host.addEventListener("keydown", e => {
          const rows = [...host.querySelectorAll(".burn-row")];
          if (!rows.length) return;
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            kbIdx = e.key === "ArrowDown" ? Math.min(rows.length - 1, kbIdx + 1) : Math.max(0, kbIdx - 1);
            rows.forEach((r, i) => r.classList.toggle("kb-focus", i === kbIdx));
            rows[kbIdx]?.scrollIntoView({ block: "nearest" });
          }
          if (e.key === "Enter" && kbIdx >= 0) rows[kbIdx]?.click();
          if (e.key === "Escape") { host.querySelectorAll(".burn-detail").forEach(d => d.remove()); rows.forEach(r => r.classList.remove("open", "kb-focus")); kbIdx = -1; }
        });
        host.tabIndex = 0;
      }
    }
  }

  function sparkSvg(pts, row) {
    const W = 100, H = 30, pad = 2;
    const min = Math.min(...pts.map(p => p.left)), max = Math.max(...pts.map(p => p.left));
    const span = Math.max(1, max - min);
    const x = i => pad + (i / Math.max(1, pts.length - 1)) * (W - pad * 2);
    const y = v => pad + (1 - (v - min) / span) * (H - pad * 2);
    const d = pts.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.left).toFixed(1)}`).join(" ");
    // Flat-pace ghost line: a straight run from the window's first point to
    // where the flat pace would put us at the last point — shows at a glance
    // whether we're ahead of or behind even burn.
    let flat = "";
    if (row && row.flat != null) {
      const yf = y(100 - row.flat);
      flat = `<line x1="${x(0).toFixed(1)}" y1="${y(pts[0].left).toFixed(1)}" x2="${x(pts.length - 1).toFixed(1)}" y2="${yf.toFixed(1)}" stroke="var(--dim)" stroke-width="1" stroke-dasharray="3 3" opacity=".7"/>`;
    }
    return `<svg class="burn-spark" viewBox="0 0 ${W} ${H}">${flat}<path d="${d}" fill="none" stroke="var(--accent)" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews["burn"] = {
    title: "燃烧速率",
    eyebrow: "BURN RATE",
    render: render
  };
})();
