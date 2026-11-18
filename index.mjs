// Magpie plugin entry: start the local service the plugin page navigates to.
// Magpie's Bun host imports this module and calls server() when the plugin loads.

import { startServer } from "./server.mjs";

let started = null;

function start(options = {}) {
  if (!started) {
    started = startServer(options)
      .then((info) => {
        console.log(`[magpie-observatory] listening on ${info.url}`);
        return info;
      })
      .catch((err) => {
        console.error("[magpie-observatory] could not start:", err?.message || err);
        return null;
      });
  }
  return started;
}

export default {
  id: "magpie-observatory",
  async server(_input, options = {}) {
    // A page-only plugin does not start the host; this one has a page service,
    // so the service can also keep the quota alert alive after the page closes.
    await start({ ...options, monitor: options.notify !== false });
    return {};
  },
};
