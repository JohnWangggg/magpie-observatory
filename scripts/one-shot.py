#!/usr/bin/env python3
# Screenshot one hero view + dump its DOM stats — quick design/debug pass.
# Usage: python3 scripts/one-shot.py <view-id> [out.png] [--wait MS] [--fullpage]

import re, subprocess, sys, time
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
args = [a for a in sys.argv[1:] if not a.startswith("--")]
vid = args[0] if args else "route"
out = Path(args[1]) if len(args) > 1 else Path(f"/tmp/{vid}.png")
WAIT = 2200
if "--wait" in sys.argv:
    WAIT = int(sys.argv[sys.argv.index("--wait") + 1])
FULL = "--fullpage" in sys.argv

app = (ROOT / "public/assets/app.js").read_text()
if f'id: "{vid}"' not in app:
    print(f"view id '{vid}' not in VIEW_META", file=sys.stderr); sys.exit(1)

server = subprocess.Popen(["node", "preview.mjs"], cwd=ROOT,
                          stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1.2)
try:
    with sync_playwright() as p:
        b = p.chromium.launch(args=["--no-sandbox"])
        pg = b.new_page(viewport={"width": 1560, "height": 940})
        errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.goto("http://127.0.0.1:8777/", wait_until="networkidle")
        pg.wait_for_selector(".hero", timeout=15000)
        pg.wait_for_timeout(2200)
        pg.evaluate(f"window.Obs?.api?.setHeroMode('{vid}')")
        pg.wait_for_timeout(WAIT)
        stat = pg.evaluate(f"""(() => {{
          const host = document.querySelector('#view-{vid} .route-stage')
                       || document.querySelector('#view-{vid}');
          return host ? {{
            els: host.querySelectorAll('*').length,
            svgs: host.querySelectorAll('svg').length,
            canvas: !!host.querySelector('canvas'),
            text: (host.textContent || '').trim().slice(0, 120)
          }} : null;
        }})()""")
        title = pg.evaluate("document.querySelector('#hero-title')?.textContent || ''")
        loc = pg.locator(".hero .route-stage, .route-stage").first
        (pg if FULL else loc).screenshot(path=str(out))
        print(f"{vid} '{title}' → {out}")
        print("  stat:", stat)
        if errs: print("  page errors:", errs[:3])
        b.close()
finally:
    server.terminate()
