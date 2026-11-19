// Magpie plugin entry: start the local service the plugin page navigates to.
// Magpie's Bun host imports this module and calls server() when the plugin loads.

import { startServer } from "./server.mjs";

// A failed start must not be cached: the usual cause is a port still held by
// the previous host, and the next call (after the host retries) succeeds.
let starting = null;
let service = null;

function start(options = {}) {
  if (service) return Promise.resolve(service);
  if (starting) return starting;
  starting = startServer(options)
    .then((info) => {
      service = info;
      console.log(`[magpie-observatory] listening on ${info.url}${info.owned === false ? " (adopted)" : ""}`);
      return info;
    })
    .catch((err) => {
      console.error("[magpie-observatory] could not start:", err?.message || err);
      return null;
    })
    .finally(() => { starting = null; });
  return starting;
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
