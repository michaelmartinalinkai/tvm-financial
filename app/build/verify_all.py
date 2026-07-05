#!/usr/bin/env python3
import json, pathlib
from playwright.sync_api import sync_playwright
BASE = pathlib.Path('/Users/bink/linkai-agent/clients/tvm/financial-app/www')
OUT = '/private/tmp/claude-501/-Users-bink-linkai-agent-binky-brain/f561dc32-1de3-46eb-96c5-100b89f32807/scratchpad'
SEED = open('/tmp/seed_state.json').read()
APP = (BASE/'build/index.candidate.html').as_uri()
init = "try{sessionStorage.setItem('sd_unlocked','1');localStorage.setItem('slowdough_v1',%s);}catch(e){}" % json.dumps(SEED)
errors=[]
with sync_playwright() as p:
    b=p.chromium.launch(channel="chrome"); pg=b.new_page(viewport={'width':390,'height':844})
    pg.on("console", lambda m: errors.append(m.text) if m.type=="error" else None)
    pg.on("pageerror", lambda e: errors.append("PAGEERROR: "+str(e)))
    pg.route("**/financial/api/**", lambda r: r.abort())
    pg.add_init_script(init); pg.goto(APP); pg.wait_for_timeout(1400)
    def nav(js): pg.evaluate(js); pg.wait_for_timeout(700)
    def shot(n): f=f"{OUT}/pv_{n}.png"; pg.screenshot(path=f,full_page=True); print("shot",n)
    shot("home")
    nav("go('add')"); shot("add_expense")
    # switch to transfer type if a data-type toggle exists
    try: pg.click("[data-type='transfer']", timeout=2500); pg.wait_for_timeout(500); shot("add_transfer")
    except Exception as e: print("transfer toggle:",e)
    nav("go('history')"); shot("history")
    nav("go('reports')"); shot("reports")
    nav("go('cats')"); shot("categories")
    try:
        vid=pg.evaluate("(state.villas&&state.villas[0])?state.villas[0].id:''")
        if vid: nav(f"selVilla='{vid}';go('villaview')"); shot("villa")
    except Exception as e: print("villa:",e)
    b.close()
print("CONSOLE_ERRORS:", errors[:20] if errors else "none")
