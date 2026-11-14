#!/usr/bin/env python3
# Health-checks every hero view: iterates VIEW_META ids, calls
# window.Obs.api.setHeroMode, then asserts the .route-stage inside #view-<id>
# has non-trivial DOM (elements or SVG nodes) and no thrown render error.
# Usage: python3 scripts/smoke-views.py [--limit N] [--verbose]

import re, subprocess, sys, time
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
LIMIT = 400
if "--limit" in sys.argv:
    LIMIT = int(sys.argv[sys.argv.index("--limit") + 1])
VERBOSE = "--verbose" in sys.argv
ERRORS_ONLY = "--errors-only" in sys.argv
app = (ROOT / "public/assets/app.js").read_text()
meta = re.search(r"VIEW_META\s*=\s*\[([\s\S]*?)\];", app).group(1)
ids = re.findall(r'\{\s*id:\s*"(\w+)"', meta)[:LIMIT]

server = subprocess.Popen(["node", "preview.mjs"], cwd=ROOT,
                          stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1.2)

ok, empty, errors = [], [], []
try:
    with sync_playwright() as p:
        b = p.chromium.launch(args=["--no-sandbox"])
        pg = b.new_page(viewport={"width": 1560, "height": 940})
        page_errors = []
        pg.on("pageerror", lambda e: page_errors.append(str(e)))
        pg.on("console", lambda m: page_errors.append(m.text) if m.type == "error" else None)
        pg.goto("http://127.0.0.1:8777/", wait_until="networkidle")
        pg.wait_for_selector(".hero", timeout=15000)
        pg.wait_for_timeout(2200)
        for i, vid in enumerate(ids, 1):
            page_errors.clear()
            try:
                pg.evaluate(f"window.Obs?.api?.setHeroMode('{vid}')")
                pg.wait_for_timeout(450)
                stat = pg.evaluate(f"""(() => {{
                  const host = document.querySelector('#view-{vid} .route-stage')
                              || document.querySelector('#view-{vid}');
                  if (!host) return {{ host: 0 }};
                  const els = host.querySelectorAll('*').length;
                  const svgs = host.querySelectorAll('svg *').length;
                  const cv = host.querySelector('canvas');
                  const canvas = cv && (cv.clientWidth > 0 || cv.width > 0) ? 1 : 0;
                  return {{ host: 1, els, svgs, canvas, text: (host.textContent || '').trim().length }};
                }})()""")
                if not stat.get("host"):
                    empty.append((vid, "no host")); print(f"  × {vid}: no host")
                elif stat["els"] < 3 and stat["svgs"] < 3 and not stat["canvas"] and stat["text"] < 4:
                    empty.append((vid, "empty stage")); print(f"  × {vid}: empty stage")
                else:
                    ok.append(vid)
                    if VERBOSE and not ERRORS_ONLY: print(f"[{i}/{len(ids)}] {vid} els={stat['els']} svgs={stat['svgs']}")
                if page_errors:
                    errors.append((vid, page_errors[:2]))
                    print(f"  ⚠ {vid}: {page_errors[0][:70]}")
            except Exception as e:
                errors.append((vid, [str(e)])); print(f"  ✗ {vid}: {str(e)[:70]}")
        b.close()
finally:
    server.terminate()

print(f"\nsmoke: {len(ok)} ok / {len(empty)} empty / {len(errors)} errored")
if empty: print("empty:", ", ".join(v for v, _ in empty))
if errors:
    print("errors:")
    for v, es in errors[:20]: print(f"  {v}: {es[0][:90]}")
