// The page Magpie frames is only a launcher: the dashboard is served by the
// plugin's local service. Magpie's page CSP forbids fetch/XHR/WebSocket, so a
// navigation is the one network action it can take.
//
// Nothing here may block the navigation. The bridge's ready/options calls are
// each given a short deadline: a slow or broken host must still land on the
// service, and the service (not this page) reports whether Magpie itself is
// readable.
(async () => {
  const DEFAULT_PORT = 3488;
  let port = DEFAULT_PORT;
  let service = "";
  let theme = "";
  let lang = "";

  const said = document.getElementById("said");
  const retry = document.getElementById("retry");

  // Resolve a bridge promise, or give up after `ms`. A rejected/absent bridge
  // resolves to undefined rather than blocking the launcher.
  const within = (p, ms) => new Promise((resolve) => {
    let done = false;
    const finish = (v) => { if (!done) { done = true; resolve(v); } };
    const timer = setTimeout(() => finish(undefined), ms);
    Promise.resolve(p).then(
      (v) => { clearTimeout(timer); finish(v); },
      () => { clearTimeout(timer); finish(undefined); }
    );
  });

  const isZh = () => {
    const q = new URLSearchParams(location.search).get("lang");
    const v = q || lang || navigator.language || "zh";
    return String(v).toLowerCase().startsWith("zh");
  };
  const say = (zh, en) => { if (said) said.textContent = isZh() ? zh : en; };

  const t = await within(window.magpie?.ready, 1500);
  if (t && typeof t.dark === "boolean") theme = t.dark ? "dark" : "light";
  if (t && typeof t.lang === "string" && t.lang) lang = t.lang;

  try {
    const s = window.magpie?.service;
    if (typeof s === "string" && s) service = s;
  } catch { /* desktop: no service path */ }

  const o = await within(window.magpie?.options?.get?.(), 1500);
  if (o && Number.isFinite(Number(o.port)) && Number(o.port) > 0) port = Number(o.port);
  if (o && typeof o.lang === "string" && o.lang) lang = o.lang;

  try {
    const q = new URLSearchParams(location.search).get("lang");
    if (q) lang = q;
  } catch { /* no query */ }

  try {
    document.documentElement.lang = isZh() ? "zh-CN" : "en";
    if (retry) retry.textContent = isZh() ? "重试" : "Retry";
  } catch { /* static text; the service still opens */ }

  say("正在连接本地观测台服务…", "Connecting to the local Observatory service…");

  const q = new URLSearchParams();
  if (theme) q.set("hostTheme", theme);
  if (lang) q.set("lang", lang);
  const suffix = q.toString() ? `?${q}` : "";
  // The quiet view is the product: three questions, one screen. There is no
  // second dashboard to fall back to.
  const base = service || `http://127.0.0.1:${port}/`;
  const target = base.endsWith("/") ? base : base + "/";

  // If the service is not up, the browser shows its own connection error and
  // this page is gone. Say what to do before navigating, so the 5-second
  // window still shows a useful line if the reader stops it.
  setTimeout(() => {
    say(
      `正在打开 127.0.0.1:${port} … 如果没有反应：在 Magpie 里关掉再打开「观测台」，或运行 magpie plugin off/on magpie-observatory`,
      `Opening 127.0.0.1:${port} … If nothing happens: turn Observatory off and on in Magpie, or run magpie plugin off/on magpie-observatory`
    );
    if (retry) retry.hidden = false;
    if (retry) retry.onclick = () => location.reload();
  }, 2500);

  location.replace(target + suffix);
})();
