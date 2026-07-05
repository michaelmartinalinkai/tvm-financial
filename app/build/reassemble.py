#!/usr/bin/env python3
# Reassemble modules -> single index.html, syntax-check.
import subprocess, sys, pathlib
BASE = pathlib.Path('/Users/bink/linkai-agent/clients/tvm/financial-app/www')
MODS = ['01_core','02_compute','03_router','04_home','05_bills','06_goals_debts',
        '07_business','08_history','09_reports','10_categories','11_detailviews',
        '12_settings','13_shared_render','14_actions_init']
head = (BASE/'build/head.html').read_text(encoding='utf-8')
tail = (BASE/'build/tail.html').read_text(encoding='utf-8')
body = '\n'.join((BASE/f'build/mod/{m}.js').read_text(encoding='utf-8') for m in MODS)
out = head + '\n' + body + '\n' + tail
target = BASE/'build/index.candidate.html'
target.write_text(out, encoding='utf-8')
print(f"reassembled -> {target}  ({len(out)} bytes)")
# extract inline script for node --check
import re
scripts = re.findall(r'<script(?![^>]*\bsrc=)[^>]*>(.*?)</script>', out, re.S)
(BASE/'build/_check.js').write_text('\n;\n'.join(scripts), encoding='utf-8')
r = subprocess.run(['node','--check',str(BASE/'build/_check.js')], capture_output=True, text=True)
if r.returncode==0:
    print("✅ node --check PASSED")
else:
    print("❌ node --check FAILED:\n"+r.stderr[:2000]); sys.exit(1)
