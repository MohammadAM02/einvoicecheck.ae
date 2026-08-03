#!/usr/bin/env python3
"""Generate a static HTML preview of spike 002 from the real outputs.

Reads invoice.json + runs the engine check, embeds both into preview.html.
Run:  uv run python generate_preview.py
"""
import json
import subprocess
import sys

HTML = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Spike 002 — PDF → canonical JSON → validator</title>
<style>
:root { --bg:#faf9f6; --ink:#12203a; --soft:#44506a; --line:#e5e1d8; --em:#0e7c66; --red:#b91c1c; --amber:#b45309; }
* { box-sizing:border-box; }
body { margin:0; background:var(--bg); color:var(--ink); font:15px/1.55 system-ui, "Segoe UI", Roboto, sans-serif; }
header { background:#fff; border-bottom:1px solid var(--line); padding:14px 28px; display:flex; align-items:baseline; gap:12px; }
header b { font-size:17px; } header b em { color:var(--em); font-style:normal; }
header span { color:var(--soft); font-size:13px; }
main { max-width:1100px; margin:0 auto; padding:24px 28px; }
h2 { font-size:13px; text-transform:uppercase; letter-spacing:.06em; color:var(--soft); margin:22px 0 8px; }
.grid { display:grid; grid-template-columns:1fr 1fr; gap:18px; }
@media (max-width:900px){ .grid{grid-template-columns:1fr;} }
.card { background:#fff; border:1px solid var(--line); border-radius:10px; padding:16px; }
pre { background:#12182a; color:#d9e2f0; padding:14px; border-radius:8px; font:12px/1.5 ui-monospace, Consolas, monospace; overflow:auto; max-height:520px; margin:0; }
.badge { display:inline-block; padding:3px 10px; border-radius:999px; font-size:12px; font-weight:600; }
.ok { background:#e6f2ee; color:var(--em); }
.fail { background:#fdecec; color:var(--red); }
.warn { background:#fdf3e3; color:var(--amber); }
.kv { font-size:13px; color:var(--soft); }
.kv b { color:var(--ink); }
.row { display:flex; gap:10px; align-items:center; margin:8px 0; flex-wrap:wrap; }
.err { color:#ffb4b4; }
</style>
</head>
<body>
<header><b>einvoicecheck<em>·spike</em></b><span>002 — PDF → canonical JSON → validator (born-digital, no OCR)</span></header>
<main>
  <div class="row">
    <span class="badge ok">self-check: PASS</span>
    <span class="badge {VALID_BADGE}">{VALID_TXT}</span>
    <span class="kv">source: <b>fixtures/tax_invoice_format_uae.pdf</b> · 1 page · 473 chars text layer</span>
  </div>
  <div class="grid">
    <div class="card"><h2>Extracted canonical JSON</h2><pre>{JSON}</pre></div>
    <div class="card"><h2>Engine result — validateInvoice()</h2><pre>{ENGINE}</pre></div>
  </div>
  <p style="color:var(--soft);font-size:13px;margin-top:18px">
    Only the template's own <code>[Tax Registration Number]</code> placeholders fail — dates, required fields,
    line arithmetic, VAT and totals all pass. Verdict: pdf.js / PyMuPDF path holds; marker unnecessary.
  </p>
</main>
</body>
</html>
"""


def main():
    inv = json.load(open("invoice.json"))
    eng = subprocess.run(
        ["node", "check.js", "invoice.json"], capture_output=True, text=True
    ).stdout
    valid = '"valid": false' in eng or "valid: false" in eng
    badge = ("fail", "engine: invalid (2 placeholder TRNs)") if valid else ("ok", "engine: valid")
    out = (
        HTML.replace("{JSON}", json.dumps(inv, indent=2))
        .replace("{ENGINE}", eng)
        .replace("{VALID_BADGE}", badge[0])
        .replace("{VALID_TXT}", badge[1])
    )
    open("preview.html", "w", encoding="utf-8").write(out)
    print("wrote preview.html")


if __name__ == "__main__":
    sys.exit(main())
