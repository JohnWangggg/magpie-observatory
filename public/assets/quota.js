// The allowance forecast, kept out of the DOM so it can be tested.
// A window is "bad" when the last 90 minutes' slope reaches zero before the
// window resets; "warn" when it is within 45% of that reset.
(function () {
  "use strict";
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

  function rows(quotas, history, nowMs) {
    const out = [];
    const now = Number(nowMs) || Date.now();
    for (const q of quotas || []) {
      const hist = (history || []).find((h) =>
        h.provider === q.provider && String(h.user || "") === String(q.user || "")
      );
      for (const w of q.windows || []) {
        const used = clamp(Number(w.used) || 0, 0, 100);
        const left = 100 - used;
        let rate = 0;
        let sampled = false;
        if (hist) {
          const line = (hist.lines || []).find((l) => l.name === w.name);
          const pts = (line && line.points ? line.points : [])
            .filter((p) => p && Number.isFinite(Number(p.left)) && p.at)
            .map((p) => ({
              at: Date.parse(p.at),
              left: clamp(Number(p.left), 0, 100),
              start: p.start || null,
              resetsAt: p.resetsAt || null
            }))
            .filter((p) => Number.isFinite(p.at))
            .sort((a, b) => a.at - b.at);
          if (pts.length >= 2) {
            const last = pts[pts.length - 1];
            const start = Date.parse(last.start || pts[0].start || "");
            const resetAt = Date.parse(last.resetsAt || "");
            let windowMin = null;
            if (Number.isFinite(start) && Number.isFinite(resetAt) && resetAt > start) {
              windowMin = (resetAt - start) / 60000;
            } else {
              const m = /(\d+(?:\.\d+)?)\s*([hdm])/i.exec(String(w.name || ""));
              if (m) {
                const n = Number(m[1]), unit = m[2].toLowerCase();
                windowMin = unit === "d" ? n * 1440 : unit === "h" ? n * 60 : n;
              }
            }
            // Do not extrapolate a 30-day window from an 18-minute burst.
            // Short windows need 30 minutes; long ones need at least 2% of
            // their span, capped at 6 hours.
            const needMin = windowMin ? Math.min(360, Math.max(30, windowMin * 0.02)) : 30;
            const lookback = Math.max(90, needMin);
            const end = last.at;
            const recent = pts.filter((p) => end - p.at <= lookback * 60000 && now - p.at < 26 * 3600000);
            const current = pts.filter((p) =>
              (!last.start || p.start === last.start) &&
              (!last.resetsAt || p.resetsAt === last.resetsAt)
            );
            let sample = null;
            const spanOf = (list) => list.length >= 2 ? (list[list.length - 1].at - list[0].at) / 60000 : 0;
            if (spanOf(recent) >= needMin * 0.8) sample = recent;
            else if (spanOf(current) >= needMin * 0.8) sample = current;
            if (sample) {
              sampled = true;
              const a = sample[0], b = sample[sample.length - 1];
              const mins = (b.at - a.at) / 60000;
              if (mins > 0) rate = (a.left - b.left) / mins;
            }
          }
        }
        const eta = rate > 0.001 ? left / rate : null;
        const reset = w.resetsIn == null ? null : Number(w.resetsIn);
        let sev = "good";
        if (eta != null && reset != null) {
          if (eta < reset) sev = "bad";
          else if (eta < reset * 1.2) sev = "warn";
        } else if (eta != null) {
          if (eta < 24 * 60) sev = "bad";
          else if (eta < 3 * 24 * 60) sev = "warn";
        } else if (used >= 90) sev = "bad";
        else if (used >= 80) sev = "warn";
        else if (reset != null && !sampled) sev = "unknown";
        // A balance with no reset can still be nearly gone even if the
        // recent slope is slow.
        if (reset == null && used >= 90) sev = "bad";
        else if (reset == null && used >= 80 && sev === "good") sev = "warn";
        out.push({ q, w, used, left, rate, eta, reset, sampled, sev });
      }
    }
    return out.sort((a, b) => {
      const rank = { bad: 0, warn: 1, good: 2, unknown: 3 };
      if (rank[a.sev] !== rank[b.sev]) return rank[a.sev] - rank[b.sev];
      const ar = a.eta != null && a.reset ? a.eta / a.reset : 9;
      const br = b.eta != null && b.reset ? b.eta / b.reset : 9;
      if (ar !== br) return ar - br;
      return b.used - a.used;
    });
  }

  const api = { rows };
  if (typeof window !== "undefined") window.ObservatoryQuota = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
