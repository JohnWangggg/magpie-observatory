// The service has one job at startup: be there when the page arrives. Two
// copies must never fight over the port - the second adopts the first and
// takes over when it stops. This test starts both and checks the handover.
import assert from "node:assert/strict";
import net from "node:net";
import { startServer, stopAll } from "../server.mjs";

function freePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });
}

async function ready(port) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 800);
  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/ready`, { signal: ctrl.signal });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const port = await freePort();
const first = await startServer({ port });
assert.equal(first.owned, true, "first copy owns the port");
const info = await ready(port);
assert.equal(info?.name, "magpie-observatory", "service answers readiness");

const t0 = Date.now();
const second = await startServer({ port });
const took = Date.now() - t0;
assert.equal(second.owned, false, "second copy adopts instead of failing");
assert.ok(took < 3000, `adoption is quick (${took} ms)`);
assert.equal((await ready(port))?.instance, info.instance, "the same service still answers");

// The owner leaves. The adopted copy must take the port without anyone
// reopening the page.
first.server.closeAllConnections?.();
await new Promise((resolve) => first.server.close(resolve));
let tookOver = null;
for (let i = 0; i < 44 && !tookOver; i++) {
  await sleep(250);
  const now = await ready(port);
  if (now && now.instance !== info.instance) tookOver = now;
}
assert.ok(tookOver, "adopted copy takes over when the owner stops");

stopAll();
console.log(`ok - service start, adopt (${took} ms), and takeover`);
