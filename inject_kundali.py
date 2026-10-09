#!/usr/bin/env python3
"""Embed a Kundali JSON export into the dashboard template.

Usage: python3 inject_kundali.py <template.html> <input.json> <output.html>
"""
import json, sys

def main(tpl_path, json_path, out_path):
    with open(json_path, encoding="utf-8") as f:
        data = json.load(f)  # fails loudly on invalid JSON
    tpl = open(tpl_path, encoding="utf-8").read()
    marker = "__KUNDALI_JSON__"
    if tpl.count(marker) != 1:
        sys.exit(f"Template must contain the placeholder {marker} exactly once.")
    payload = json.dumps(data, ensure_ascii=False).replace("</", "<\\/")
    open(out_path, "w", encoding="utf-8").write(tpl.replace(marker, payload))
    name = (data.get("input") or {}).get("name", "unnamed")
    print(f"Embedded chart for {name}: {len(payload):,} bytes of data -> {out_path}")

if __name__ == "__main__":
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    main(*sys.argv[1:])
