// The page Magpie frames is only a launcher: the dashboard is served by the
// plugin's local service. Magpie's page CSP forbids fetch/XHR/WebSocket, so a
// navigation is the one network action it can take.
(async () => {
  const DEFAULT_PORT = 3488;
  let port = DEFAULT_PORT;
  let service = "";
  let theme = "";

  try {
    const t = await window.magpie?.ready;
    if (t && typeof t.dark === "boolean") theme = t.dark ? "dark" : "light";
  } catch { /* older Magpie, or no bridge */ }
  try {
    const s = window.magpie?.service;
    if (typeof s === "string" && s) service = s;
  } catch { /* desktop: no service path */ }
  try {
    const o = await window.magpie?.options?.get?.();
    if (o && Number.isFinite(Number(o.port)) && Number(o.port) > 0) port = Number(o.port);
  } catch { /* default port */ }

  const q = new URLSearchParams();
  if (theme) q.set("hostTheme", theme);
  const suffix = q.toString() ? `?${q}` : "";
  const target = service || `http://127.0.0.1:${port}/`;

  setTimeout(() => {
    const said = document.getElementById("said");
    const retry = document.getElementById("retry");
    if (!said) return;
    said.textContent = `本地观测台服务没有响应（127.0.0.1:${port}）`;
    if (retry) {
      retry.hidden = false;
      retry.onclick = () => location.reload();
    }
  }, 5000);

  location.replace(target + suffix);
})();
