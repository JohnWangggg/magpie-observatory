/* ==========================================================================
   Magpie Observatory — 连击卡牌 (combo chips) view module.
   Standalone classic script: registers window.ObservatoryViews.chips.

   Optional theme, not a monitoring default: every request of the newest 24
   becomes a card. A combo counts consecutive `ok` requests from the newest
   backwards; `retry` keeps the streak alive and lifts the combo multiplier by
   ×1.25 each time, `err` breaks it. Card score = tokens / 1000 × TPS tier ×
   cache factor. Hover lifts a card and shows its ledger line, click pins it
   into the side panel.
   ========================================================================== */
(function () {
  "use strict";

  const MAX_CARDS = 24;        // "latest 24 requests", newest first
  const CACHE_HIGH = 85;       // ctx.kpis.cache at or above this = cache bonus
  const CACHE_MULT = 1.25;
  const RETRY_MULT = 1.25;     // every retry inside the combo
  const STAGGER_MAX = 9;       // cap the flip-in stagger so 24 cards do not crawl
  const TIP_W = 320;           // .chips-tip max-width
  const TIP_H = 132;           // generous 5-line height, used to keep the tip inside

  // TPS tiers: score multiplier by tokens/s.
  const TIERS = [
    { key: "t1", tag: "T1", name: "缓行", mult: 1, range: "<30 TPS" },
    { key: "t2", tag: "T2", name: "稳定", mult: 1.2, range: "30–60 TPS" },
    { key: "t3", tag: "T3", name: "迅捷", mult: 1.5, range: "60–120 TPS" },
    { key: "t4", tag: "T4", name: "极速", mult: 2, range: "≥120 TPS" }
  ];

  const STATUS_TITLE = {
    ok: "成功", retry: "重试（保留连击，倍率 ×1.25）",
    run: "进行中（保留连击）", err: "失败（打断连击）"
  };

  const HOSTS = new WeakMap();
  let pinned = null;           // pinned card id, survives every data tick

  /* ------------------------------------------------------------- helpers --- */
  const num = (v) => { const n = Number(v); return isFinite(n) ? n : 0; };
  const pad2 = (n) => String(n).padStart(2, "0");
  const identity = (v) => String(v == null ? "" : v);

  // Map whatever the gateway calls a status onto the three that matter here.
  function statusKind(s) {
    const k = String(s == null ? "" : s).trim().toLowerCase();
    if (k === "ok" || k === "done" || k === "success" || k === "pass") return "ok";
    if (k === "retry" || k === "retried" || k === "again") return "retry";
    if (k === "err" || k === "error" || k === "fail" || k === "failed" ||
        k === "cancel" || k === "canceled" || k === "cancelled" || k === "timeout") return "err";
    return "run";
  }

  function tierOf(tps) {
    if (tps >= 120) return TIERS[3];
    if (tps >= 60) return TIERS[2];
    if (tps >= 30) return TIERS[1];
    return TIERS[0];
  }

  function clockOf(at) {
    const t = Date.parse(at);
    if (!isFinite(t)) return "—";
    const d = new Date(t);
    return pad2(d.getHours()) + ":" + pad2(d.getMinutes()) + ":" + pad2(d.getSeconds());
  }

  function tpsText(tps) {
    if (!(tps > 0)) return "0";
    return tps >= 100 ? String(Math.round(tps)) : (Math.round(tps * 10) / 10).toFixed(1);
  }

  function fmtScore(v) {
    const n = Math.max(0, num(v));
    if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1) + "K";
    return n.toFixed(1);
  }

  const fmtMult = (m) => "×" + (Math.round(m * 100) / 100);

  // Newest first, without trusting the caller's order. Only re-sorted when
  // every row carries a parseable stamp — otherwise the given order stands.
  function normalizeLogs(logs) {
    const rows = (Array.isArray(logs) ? logs : []).filter(r => r && typeof r === "object");
    let stamped = rows.length > 0;
    for (let i = 0; i < rows.length; i++) {
      if (!isFinite(Date.parse(rows[i].at))) { stamped = false; break; }
    }
    if (stamped) rows.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
    return rows;
  }

  /* --------------------------------------------------------------- model --- */
  function buildModel(ctx) {
    const logs = normalizeLogs(ctx.logs);
    const kpis = ctx.kpis || {};
    const cacheShare = num(kpis.cache);
    // The gateway reports one global cache share, so the bonus is global too.
    const cacheMult = cacheShare >= CACHE_HIGH ? CACHE_MULT : 1;

    const pMeta = ctx.providerMeta || (() => ({ name: "", color: "", icon: "" }));
    const ofModel = ctx.providerOfModel || ((model, provider) => provider || "");
    const pIcon = ctx.providerIcon || (() => "");
    const aMeta = ctx.agentMeta || (() => ({ name: "", color: "" }));
    const aIcon = ctx.agentIcon || (() => "");

    const cards = logs.slice(0, MAX_CARDS).map((row, i) => {
      const pkey = String(ofModel(row.model, row.provider) || row.provider || "unknown").toLowerCase();
      const pm = pMeta(pkey) || {};
      const am = aMeta(row.agent) || {};
      const tokens = Math.max(0, num(row.tokens));
      const tps = Math.max(0, num(row.tps));
      const kind = statusKind(row.status);
      return {
        id: String(row.id != null && row.id !== "" ? row.id : "i" + i),
        at: row.at || "", clock: clockOf(row.at),
        top: i === 0,
        model: row.model || "—",
        provider: pkey,
        providerName: pm.name || pkey,
        color: pm.color || "var(--accent)",
        icon: pIcon(pkey),
        agent: row.agent || "—",
        agentName: am.name || row.agent || "—",
        agentIcon: aIcon(row.agent),
        session: row.session || "",
        status: row.status == null || row.status === "" ? kind : identity(row.status),
        kind,
        tokens,
        tps,
        tier: tierOf(tps),
        cost: num(row.cost),
        base: tokens / 1000,
        inCombo: false, isRetry: false, isPending: false,
        comboIndex: 0, comboMult: 1, score: 0, sig: ""
      };
    });

    // Combo walk: newest backwards. `err` breaks, `ok` counts, `retry` keeps
    // the streak and raises the multiplier, anything else (in-flight) keeps the
    // streak alive without counting.
    let combo = 0, retries = 0, pending = 0, brokenAt = -1;
    for (let i = 0; i < cards.length; i++) {
      const c = cards[i];
      if (c.kind === "err") { brokenAt = i; break; }
      c.inCombo = true;
      if (c.kind === "ok") { combo++; c.comboIndex = combo; }
      else if (c.kind === "retry") { retries++; c.isRetry = true; }
      else { pending++; c.isPending = true; }
    }
    const comboMult = Math.pow(RETRY_MULT, retries);

    let total = 0, errCount = 0;
    let best = null;
    for (const c of cards) {
      c.comboMult = c.inCombo ? comboMult : 1;
      c.score = c.base * c.tier.mult * cacheMult * c.comboMult;
      total += c.score;
      if (c.kind === "err") errCount++;
      if (!best || c.score > best.score) best = c;
      c.sig = [c.top ? "top" : "rest", c.status, c.tokens, c.tps, c.model, c.provider, c.agent, c.comboIndex,
        c.tier.key, Math.round(c.score * 100)].join(",");
    }

    return {
      cards,
      empty: cards.length === 0,
      totalLogs: logs.length,
      hidden: Math.max(0, logs.length - cards.length),
      combo, retries, pending, brokenAt, comboMult, total,
      errCount,
      best,
      cacheShare, cacheMult,
      pinned: cards.filter(c => c.id === pinned)[0] || null
    };
  }

  function signature(m, ctx) {
    return [
      m.empty ? "e" : "d", m.cards.length, m.combo, m.retries, m.brokenAt,
      Math.round(m.total * 100), pinned || "", ctx.motion || "full",
      m.cards.map(c => c.id + ":" + c.sig).join("|")
    ].join("~");
  }

  /* --------------------------------------------------------------- shell --- */
  function stateFor(host) {
    let st = HOSTS.get(host);
    if (!st) {
      st = {
        host, root: null, main: null, hand: null, side: null, tip: null,
        ctx: null, model: null, sig: null,
        cardEls: new Map(), orderSig: "", comboShown: null, pulseTimer: 0
      };
      HOSTS.set(host, st);
    }
    return st;
  }

  function mount(host, st) {
    host.innerHTML = "";
    const root = document.createElement("div");
    root.className = "chips-root";
    root.innerHTML =
      '<div class="chips-main">' +
        '<div class="chips-head">' +
          '<div class="chips-combo"><span class="chips-combo-lbl">COMBO</span>' +
            '<b class="chips-combo-n">×0</b>' +
            '<span class="chips-combo-sub"></span></div>' +
          '<div class="chips-hstats"></div>' +
        "</div>" +
        '<div class="chips-hand" role="list"></div>' +
        '<div class="chips-empty" hidden>' +
          '<svg viewBox="0 0 96 40" aria-hidden="true">' +
            '<rect x="6" y="9" width="34" height="24" rx="5"/>' +
            '<rect x="24" y="6" width="34" height="24" rx="5" class="chips-empty-b"/>' +
            '<rect x="44" y="3" width="34" height="24" rx="5" class="chips-empty-c"/>' +
            '<path d="M54 30h14" />' +
          "</svg>" +
          "<b>还没有可发牌的请求</b>" +
          "<span>这个视图读取请求账本（<code>ctx.logs</code>）：最新 24 条各成一张卡，" +
          "连续 <code>ok</code> 累加连击。<code>retry</code> 保连击并叠 ×1.25，" +
          "<code>err</code> 打断连击。网关没有返回请求时这里保持为空。</span>" +
        "</div>" +
      "</div>" +
      '<aside class="chips-side" aria-label="连击卡牌面板"></aside>' +
      '<div class="chips-tip" role="tooltip" hidden></div>';
    host.appendChild(root);
    st.root = root;
    st.main = root.querySelector(".chips-main");
    st.hand = root.querySelector(".chips-hand");
    st.side = root.querySelector(".chips-side");
    st.tip = root.querySelector(".chips-tip");
    bind(st);
  }

  function cardFrom(st, node) {
    if (!node || !st.model) return null;
    const i = Number(node.dataset.ci);
    return isFinite(i) ? st.model.cards[i] || null : null;
  }

  function bind(st) {
    const root = st.root;
    root.addEventListener("pointermove", (e) => {
      const card = e.target && e.target.closest ? e.target.closest(".chips-card") : null;
      if (!card) { hideTip(st); return; }
      showTip(st, card);
    });
    root.addEventListener("pointerleave", () => hideTip(st));
    root.addEventListener("focusin", (e) => {
      const card = e.target && e.target.closest ? e.target.closest(".chips-card") : null;
      if (!card) return;
      showTip(st, card);
    });
    root.addEventListener("focusout", () => hideTip(st));
    root.addEventListener("click", (e) => {
      const card = e.target && e.target.closest ? e.target.closest(".chips-card") : null;
      const c = cardFrom(st, card);
      if (!c) return;
      pinned = pinned === c.id ? null : c.id;
      if (st.ctx) render(st.host, st.ctx);
    });
    root.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && pinned) {
        pinned = null;
        if (st.ctx) render(st.host, st.ctx);
        return;
      }
      if (e.key !== "Enter" && e.key !== " ") return;
      const card = e.target && e.target.closest ? e.target.closest(".chips-card") : null;
      const c = cardFrom(st, card);
      if (!c) return;
      e.preventDefault();
      pinned = pinned === c.id ? null : c.id;
      if (st.ctx) render(st.host, st.ctx);
    });
  }

  /* ------------------------------------------------------------- tooltip --- */
  const plain = (m) => String(Math.round(m * 100) / 100);

  function breakdown(c, m) {
    const parts = [fmtScore(c.base) + " × " + plain(c.tier.mult) + " (" + c.tier.tag + ")"];
    if (m.cacheMult !== 1) parts.push(plain(m.cacheMult) + " 缓存");
    if (c.comboMult !== 1) parts.push(plain(c.comboMult) + " 连击");
    return parts.join(" × ");
  }

  function comboText(c) {
    if (!c.inCombo) return c.kind === "err" ? "连击之外 · 被 err 打断" : "连击之外";
    if (c.kind === "ok") return "连击内 第 " + c.comboIndex + " 张";
    if (c.kind === "retry") return "连击内 · retry 保留连击";
    return "连击内 · 进行中";
  }

  function showTip(st, node) {
    const m = st.model;
    const c = cardFrom(st, node);
    if (!m || !c || !st.tip) { hideTip(st); return; }
    const ctx = st.ctx || {};
    const esc = ctx.esc || identity;
    const clampFn = ctx.clamp || ((v, a, b) => Math.max(a, Math.min(b, v)));
    st.tip.innerHTML =
      "<b>" + esc(c.model) + "</b>" +
      "<span>" + esc(c.providerName) + " · agent <b>" + esc(c.agentName) + "</b>" +
        (c.session ? " · " + esc(c.session) : "") + "</span>" +
      "<span>tokens <b>" + esc((ctx.fmtTokens || identity)(c.tokens)) + "</b> · TPS <b>" +
        esc(tpsText(c.tps)) + "</b> · <b>" + esc(c.tier.tag) + "</b> " + esc(c.tier.range) + "</span>" +
      "<span>状态 <b>" + esc(c.status) + "</b> · " + esc(comboText(c)) + " · " + esc(c.clock) + "</span>" +
      "<span>得分 <b>+" + esc(fmtScore(c.score)) + "</b> = " + esc(breakdown(c, m)) + "</span>";
    st.tip.hidden = false;
    // Anchored to the card, not the pointer, and placed against fixed bounds:
    // the tip never has to be measured, so a stale layout pass cannot push it
    // outside the stage. Below the card when it fits, above it otherwise.
    const root = st.root.getBoundingClientRect();
    const card = node.getBoundingClientRect();
    const cardTop = card.top - root.top;
    const cardBottom = card.bottom - root.top;
    const maxLeft = Math.max(4, root.width - TIP_W - 4);
    let flip = false;
    let top = cardBottom + 6;
    if (top + TIP_H > root.height - 2) {
      flip = true;
      top = Math.max(TIP_H + 2, cardTop - 6);
    }
    st.tip.style.left = clampFn(card.left - root.left, Math.min(4, maxLeft), maxLeft) + "px";
    st.tip.style.top = top + "px";
    st.tip.style.transform = flip ? "translate(0, -100%)" : "none";
  }

  function hideTip(st) { if (st.tip && !st.tip.hidden) st.tip.hidden = true; }

  /* --------------------------------------------------------------- paint --- */
  function cardHTML(c, ctx) {
    const esc = ctx.esc || identity;
    const fmtTok = ctx.fmtTokens || identity;
    return '<span class="chips-card-top">' +
        '<span class="chips-card-ic" style="--c:' + esc(c.color) + '">' +
          '<img src="' + esc(c.icon) + '" alt="" loading="lazy"></span>' +
        (c.top ? '<span class="chips-card-new">最新</span>' : "") +
        '<span class="chips-card-tier chips-' + c.tier.key + '" title="' + esc(c.tier.range + " → " + fmtMult(c.tier.mult)) + '">' +
          esc(c.tier.tag) + "<i>" + esc(fmtMult(c.tier.mult)) + "</i></span>" +
      "</span>" +
      '<b class="chips-card-model" title="' + esc(c.model) + '">' + esc(c.model) + "</b>" +
      '<span class="chips-card-agent" title="' + esc(c.agentName) + '">' +
        '<img src="' + esc(c.agentIcon) + '" alt="" loading="lazy">' + esc(c.agentName) + "</span>" +
      '<span class="chips-card-nums"><b>' + esc(fmtTok(c.tokens)) + "</b> tok · <b>" +
        esc(tpsText(c.tps)) + "</b> TPS</span>" +
      '<span class="chips-card-foot">' +
        '<span class="chips-card-st chips-st-' + c.kind + '" title="' + esc(STATUS_TITLE[c.kind] || c.status) + '">' +
          esc(c.status) + (c.isRetry ? " ×1.25" : "") + "</span>" +
        '<b class="chips-card-score">+' + esc(fmtScore(c.score)) + "</b>" +
      "</span>";
  }

  function classesFor(c, st, isNew) {
    return "chips-card chips-k-" + c.kind +
      (c.top ? " is-top" : "") +
      (c.inCombo ? " is-combo" : " is-out") +
      (c.id === pinned ? " is-pin" : "") +
      (isNew ? " is-new" : "");
  }

  // Keyed update: reuse a card element by id so only genuinely new cards
  // animate, and only the order that actually changed gets a move.
  function syncHand(st, m, ctx) {
    const seen = st.cardEls;
    const keep = new Set();
    let fresh = 0;
    m.cards.forEach((c, i) => {
      keep.add(c.id);
      let rec = seen.get(c.id);
      if (!rec) {
        const el = document.createElement("div");
        el.setAttribute("role", "listitem");
        el.tabIndex = 0;
        rec = { el, sig: null, isNew: true, timer: 0 };
        seen.set(c.id, rec);
        el.addEventListener("animationend", () => {
          el.classList.remove("is-new");
          rec.isNew = false;
        });
      }
      const stagger = Math.min(fresh, STAGGER_MAX);
      if (rec.isNew) fresh++;
      const classes = classesFor(c, st, rec.isNew);
      if (rec.classes !== classes) { rec.el.className = classes; rec.classes = classes; }
      const sig = c.sig + (c.id === pinned ? "|pin" : "");
      if (rec.sig !== sig) {
        rec.el.innerHTML = cardHTML(c, ctx);
        rec.sig = sig;
        rec.el.setAttribute("aria-label", [c.model, c.providerName, c.agentName, c.status,
          (ctx.fmtTokens || identity)(c.tokens) + " tokens", tpsText(c.tps) + " TPS",
          "得分 +" + fmtScore(c.score), c.id === pinned ? "已钉选" : "点击钉选"].join(" · "));
        rec.el.setAttribute("aria-pressed", c.id === pinned ? "true" : "false");
        rec.el.removeAttribute("title");
      }
      rec.el.dataset.ci = String(i);
      rec.el.dataset.id = c.id;
      rec.el.style.setProperty("--c", c.color);
      rec.el.style.setProperty("--i", String(stagger));
      if (rec.isNew) {
        rec.el.classList.add("is-new");
        rec.classes = rec.el.className;
        clearTimeout(rec.timer);
        rec.timer = setTimeout(() => { rec.isNew = false; rec.el.classList.remove("is-new"); rec.classes = rec.el.className; }, 1500);
      }
    });

    for (const [id, rec] of seen) {
      if (keep.has(id)) continue;
      clearTimeout(rec.timer);
      rec.el.remove();
      seen.delete(id);
    }

    const orderSig = m.cards.map(c => c.id).join("|");
    if (orderSig !== st.orderSig) {
      let cursor = st.hand.firstChild;
      for (const c of m.cards) {
        const el = seen.get(c.id).el;
        if (el === cursor) { cursor = cursor.nextSibling; continue; }
        st.hand.insertBefore(el, cursor);
      }
      st.orderSig = orderSig;
    }
  }

  function headHTML(m) {
    const sub = m.empty
      ? "没有请求"
      : m.combo + " 次 ok 连击" +
        (m.retries ? " · " + m.retries + " 次 retry" : "") +
        (m.pending ? " · " + m.pending + " 条进行中" : "") +
        (m.brokenAt >= 0 ? " · 被 err 打断" : "");
    const stats =
      '<span class="chips-hstat"><b>' + (m.empty ? "0.0" : fmtScore(m.total)) + "</b><i>总分</i></span>" +
      '<span class="chips-hstat chips-hstat-best" title="' +
        (m.best ? (m.best.model + " · +" + fmtScore(m.best.score)) : "没有可结算的卡") + '">' +
        "<b>" + (m.best ? fmtScore(m.best.score) : "—") + "</b><i>最佳卡" +
        (m.best ? " · " + m.best.model : "") + "</i></span>";
    return {
      combo: "×" + m.combo,
      sub,
      stats,
      tone: m.combo > 0 ? "on" : "zero"
    };
  }

  function statHTML(label, value, note, tone) {
    return '<div class="chips-stat' + (tone ? " chips-s-" + tone : "") + '">' +
      "<span>" + label + "</span><b>" + value + "</b><small>" + note + "</small></div>";
  }

  function pinHTML(m, ctx) {
    const esc = ctx.esc || identity;
    const fmtTok = ctx.fmtTokens || identity;
    if (!pinned) {
      return '<div class="chips-pin is-hint"><span class="chips-pin-h">钉选</span>' +
        "<b>点击任意卡牌固定在这里</b>" +
        "<span>钉住的卡会显示完整账本行（模型 / provider / agent / tokens / TPS / 状态 / 得分）。" +
        "再点一次或按 Esc 取消。</span></div>";
    }
    const c = m.pinned;
    if (!c) {
      return '<div class="chips-pin is-stale"><span class="chips-pin-h">钉选</span>' +
        "<b>该请求已滚出最新 " + MAX_CARDS + " 条</b>" +
        "<span>它仍在网关账本里，只是不再发了牌。点别的卡或按 Esc 取消钉选。</span></div>";
    }
    return '<div class="chips-pin" style="--c:' + esc(c.color) + '">' +
      '<span class="chips-pin-h">钉选 · ' + esc(c.clock) + "</span>" +
      '<b class="chips-pin-model" title="' + esc(c.model) + '">' + esc(c.model) + "</b>" +
      '<span class="chips-pin-line">' + esc(c.providerName) + " · agent " + esc(c.agentName) +
        (c.session ? " · " + esc(c.session) : "") + "</span>" +
      '<span class="chips-pin-line">' + esc(fmtTok(c.tokens)) + " tokens · " + esc(tpsText(c.tps)) +
        " TPS · " + esc(c.tier.tag) + " " + esc(fmtMult(c.tier.mult)) + "</span>" +
      '<span class="chips-pin-line">状态 <b class="chips-st-' + c.kind + '">' + esc(c.status) + "</b> · " +
        esc(comboText(c)) + "</span>" +
      '<b class="chips-pin-score">+' + esc(fmtScore(c.score)) + "</b>" +
      '<span class="chips-pin-line chips-pin-calc">' + esc(breakdown(c, m)) + "</span></div>";
  }

  function sideHTML(m, ctx) {
    const esc = ctx.esc || identity;
    const sum =
      '<div class="chips-sum">' +
      statHTML("连击", "×" + m.combo,
        m.combo + " 次 ok" + (m.retries ? " · " + m.retries + " 次 retry " + fmtMult(m.comboMult) : ""),
        m.combo ? "ok" : "zero") +
      statHTML("总分", fmtScore(m.total), "最近 " + m.cards.length + " 条合计", m.total > 0 ? "ok" : "zero") +
      statHTML("最佳卡", m.best ? "+" + fmtScore(m.best.score) : "—",
        m.best ? esc(m.best.model) + " · " + esc(m.best.providerName) : "没有可结算的卡") +
      statHTML("缓存倍率", fmtMult(m.cacheMult),
        "全局缓存命中 " + (Math.round(m.cacheShare * 10) / 10) + "%" + (m.cacheMult !== 1 ? " ≥ " + CACHE_HIGH + "%" : " < " + CACHE_HIGH + "%"),
        m.cacheMult !== 1 ? "cyan" : null) +
      "</div>";
    const legend =
      '<div class="chips-legend">' +
      '<span class="chips-legend-t">TPS 档位</span>' +
      TIERS.map(t =>
        '<span class="chips-tier-row chips-' + t.key + '"><i>' + t.tag + "</i><em>" + t.name + "</em>" +
        "<span>" + t.range + "</span><b>" + fmtMult(t.mult) + "</b></span>").join("") +
      '<span class="chips-tier-row chips-tier-cache"><i>◈</i><em>缓存</em><span>命中 ≥ ' + CACHE_HIGH +
        '%</span><b>' + fmtMult(CACHE_MULT) + "</b></span>" +
      '<span class="chips-tier-row chips-tier-retry"><i>↻</i><em>retry</em><span>保留连击</span><b>' +
        fmtMult(RETRY_MULT) + "</b></span>" +
      "</div>";
    const note = m.empty
      ? "没有请求可发牌：连击 0，总分 0。网关一有账本行，这里就开始翻牌。"
      : (m.hidden ? "另有 " + m.hidden + " 条更早的请求未发牌。" : "全部请求都已发牌。") +
        (m.errCount ? " " + m.errCount + " 张 err 卡打断了连击。" : "");
    return '<div class="chips-side-title">COMBO CHIPS</div>' +
      sum + pinHTML(m, ctx) + legend +
      '<p class="chips-note">纯属好玩 · 数据仍是真实账本</p>' +
      '<p class="chips-note chips-note-sub">' + esc(note) + "</p>";
  }

  function paint(st, m, ctx) {
    const root = st.root;
    const motion = ctx.motion || "full";
    root.dataset.motion = motion;
    root.classList.toggle("is-empty", !!m.empty);
    root.classList.toggle("has-pin", !!m.pinned);
    st.hand.hidden = !!m.empty;
    root.querySelector(".chips-empty").hidden = !m.empty;

    const head = headHTML(m);
    const comboBtn = root.querySelector(".chips-combo-n");
    const prev = st.comboShown;
    comboBtn.textContent = head.combo;
    root.querySelector(".chips-combo-sub").textContent = head.sub;
    root.querySelector(".chips-hstats").innerHTML = head.stats;
    root.querySelector(".chips-combo").dataset.tone = head.tone;
    if (prev !== null && prev !== m.combo && motion !== "off") {
      const combo = root.querySelector(".chips-combo");
      combo.classList.remove("is-pulse");
      void combo.offsetWidth;
      combo.classList.add("is-pulse");
      clearTimeout(st.pulseTimer);
      st.pulseTimer = setTimeout(() => combo.classList.remove("is-pulse"), 700);
    }
    st.comboShown = m.combo;

    syncHand(st, m, ctx);
    st.side.innerHTML = sideHTML(m, ctx);
    if (m.empty) hideTip(st);
  }

  /* ---------------------------------------------------------------- api --- */
  function render(host, ctx) {
    ctx = ctx || {};
    const st = stateFor(host);
    st.host = host;
    if (!st.root) mount(host, st);
    st.ctx = ctx;
    const m = buildModel(ctx);
    const sig = signature(m, ctx);
    if (sig === st.sig && st.model) return;
    st.sig = sig;
    st.model = m;
    paint(st, m, ctx);
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews["chips"] = {
    title: "连击卡牌",
    eyebrow: "COMBO CHIPS",
    render
  };
})();
