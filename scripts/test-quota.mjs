// Deterministic checks for the allowance forecast. Run with `npm test`.
import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";

const code = fs.readFileSync(new URL("../public/assets/quota.js", import.meta.url), "utf8");
const sandbox = { window: {} };
vm.runInNewContext(code, sandbox);
const forecast = sandbox.window.ObservatoryQuota;
assert.ok(forecast && typeof forecast.rows === "function", "forecast exports rows");

const NOW = Date.parse("2026-11-18T12:00:00Z");
const q = (windows, user = "u") => ({ provider: "p", name: "Account", user, windows });
const hist = (name, points, user = "u") => ({
  provider: "p", name: "Account", user,
  lines: [{ name, points: points.map(([minAgo, left]) => ({ at: new Date(NOW - minAgo * 60000).toISOString(), left })) }]
});

// 96% used, five days to reset, no burn history: still a red window.
let r = forecast.rows([q([{ name: "Month", used: 96, resetsIn: 5 * 1440 }])], [], NOW);
assert.equal(r.length, 1);
assert.equal(r[0].sev, "bad", "96% used without history is bad");
assert.equal(r[0].eta, null);

// Burn from 30% left to 5% left in an hour, reset in 20 minutes: it runs
// out in ~12 minutes, before the reset.
r = forecast.rows(
  [q([{ name: "5h", used: 95, resetsIn: 20 }])],
  [hist("5h", [[60, 30], [0, 5]])],
  NOW
);
assert.equal(r[0].sev, "bad", "burn reaches zero before reset");
assert.ok(r[0].eta > 10 && r[0].eta < 13, `eta should be ~12m, got ${r[0].eta}`);

// A slow burn with a reset far sooner than the forecast: green.
r = forecast.rows(
  [q([{ name: "5h", used: 40, resetsIn: 100 }])],
  [hist("5h", [[60, 60], [0, 50]])],
  NOW
);
assert.equal(r[0].sev, "good", "reset comes first");

// No reset and no history: only the used percentage can make it red.
r = forecast.rows([q([{ name: "Credits", used: 96, resetsIn: null }])], [], NOW);
assert.equal(r[0].sev, "bad", "credits with 4% left are bad");
r = forecast.rows([q([{ name: "Credits", used: 50, resetsIn: null }])], [], NOW);
assert.equal(r[0].sev, "good", "credits at half are good");

// A slow burn over a long window still matters: 37% left after 12 days,
// reset is 12.3 days away.
r = forecast.rows(
  [q([{ name: "Credits", used: 63, resetsIn: 17737 }])],
  [hist("Credits", [[12 * 1440, 100], [0, 37]])],
  NOW
);
assert.ok(r[0].eta > 9000 && r[0].eta < 11000, `slow long-window eta, got ${r[0].eta}`);
assert.equal(r[0].sev, "bad", "slow burn still misses the reset");

// A long window must not be projected from a short burst.
r = forecast.rows(
  [q([{ name: "Month", used: 37, resetsIn: 40000 }])],
  [hist("Month", [[18, 60], [0, 37]])],
  NOW
);
assert.equal(r[0].eta, null, "18 minutes cannot forecast a 30-day window");
assert.equal(r[0].sev, "unknown");

// A nearly empty balance is bad even when the recent slope is slow.
r = forecast.rows(
  [q([{ name: "Credits", used: 96, resetsIn: null }])],
  [hist("Credits", [[12 * 1440, 20], [0, 4]])],
  NOW
);
assert.equal(r[0].sev, "bad", "4% left in a balance is bad");

// Two accounts with the same provider/user must not share a history line.
r = forecast.rows(
  [
    q([{ name: "5h", used: 95, resetsIn: 60 }], "a"),
    q([{ name: "5h", used: 10, resetsIn: 60 }], "b")
  ],
  [hist("5h", [[60, 30], [0, 5]], "a")],
  NOW
);
assert.equal(r.length, 2);
assert.equal(r[0].q.user, "a", "the burning account sorts first");
assert.equal(r[0].sev, "bad");

console.log("quota forecast: all checks passed");
