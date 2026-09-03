#!/usr/bin/env bash
# Student Tags - build the printable PDF cards (macOS / Linux)
set -e
cd "$(dirname "$0")"
python3 -c "import pandas, openpyxl, reportlab" 2>/dev/null || \
    python3 -m pip install -r requirements.txt
python3 generate_tags.py
