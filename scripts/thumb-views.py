#!/usr/bin/env python3
# Generates a PNG thumbnail per view — iterates VIEW_META ids, calls
# window.Obs.api.setHeroMode, screenshots .hero → public/shots/<id>.png.
# Usage: python3 scripts/thumb-views.py [--limit N] [--width W] [--height H]

import re, subprocess, sys, time
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
LIMIT = 336
if "--limit" in sys.argv:
    LIMIT = int(sys.argv[sys.argv.index("--limit") + 1])

app = (ROOT / "public/assets/app.js").read_text()
meta = re.search(r"VIEW_META\s*=\s*\[([\s\S]*?)\];", app).group(1)
ids = re.findall(r'\{\s*id:\s*"(\w+)"', meta)[:LIMIT]

(ROOT / "public/shots").mkdir(parents=True, exist_ok=True)
server = subprocess.Popen(["node", "preview.mjs"], cwd=ROOT,
                          stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1.2)

try:
    with sync_playwright() as p:
        b = p.chromium.launch(args=["--no-sandbox"])
        pg = b.new_page(viewport={"width": 1560, "height": 940})
        pg.goto("http://127.0.0.1:8777/", wait_until="networkidle")
        pg.wait_for_selector(".hero", timeout=15000)
        pg.wait_for_timeout(2200)
        done, fail = [], []
        for i, vid in enumerate(ids, 1):
            try:
                pg.evaluate(f"window.Obs?.api?.setHeroMode('{vid}')")
                pg.wait_for_timeout(750)
                pg.locator(".hero .route-stage, .route-stage").screenshot(path=str(ROOT / "public/shots" / f"{vid}.png"))
                title = pg.evaluate("document.querySelector('#hero-title')?.textContent || ''")
                done.append((vid, title))
                print(f"[{i}/{len(ids)}] {vid} → {title}")
            except Exception as e:
                fail.append(vid); print(f"  × {vid}: {str(e)[:80]}")
        b.close()
finally:
    server.terminate()

print(f"\ndone: {len(done)}/{len(ids)} → public/shots/")
if fail: print("failed:", ", ".join(fail))
