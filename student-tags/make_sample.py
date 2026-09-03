# -*- coding: utf-8 -*-
"""
Create a SAMPLE Excel file with fake data and build a sample PDF,
so the design can be checked without touching any real student data.

    python make_sample.py

Output:  samples/sample_students.xlsx  and  samples/Sample_Student_Tags.pdf
"""
import os
import random
import sys

import pandas as pd

BASE = os.path.dirname(os.path.abspath(__file__))
SAMPLES = os.path.join(BASE, "samples")

FIRST = ["Maitha", "Alyazia", "Sheikha", "Noura", "Hessa", "Salma", "Dana",
         "Amna", "Reem", "Shamma", "Latifa", "Mouza", "Hind", "Wadima",
         "Fatima", "Aisha", "Mariam", "Rouda", "Ghaya", "Jouri", "Bakhita"]
LAST = ["Al Balushi", "Alnuaimi", "Al Kaabi", "Alshamsi", "Aldhaheri",
        "Almenhali", "Al Ansari", "Alblooshi", "Ali Abdullah Al Balushi",
        "Alqahtani", "Bahader", "Alameri", "Almuharrami", "Al Rashdi"]

EDGE_CASES = [
    ("Jo", "j@x.ae", "1"),                                    # very short
    ("Sheikha Ali Abdullah Mohammed Al Balushi Alnuaimi",     # very long name
     "stuf20220013184.longest.address@moe.sch.ae", "vz4M4ryZ$X$L"),
    ("Student With A Very Long Email Address",
     "student.with.an.extremely.long.address@moe.sch.ae", "P@ssw0rd!VeryLong#2026"),
    ("Student Without Email", "", "Kp0vWqE$jwCc"),
    ("Student Without Password", "nopass@moe.sch.ae", ""),
    ("", "noname@moe.sch.ae", "abc123XYZ"),                   # missing name
]

ALPHABET = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!#$%"


def fake_password(rng):
    return "".join(rng.choice(ALPHABET) for _ in range(12))


def fake_email(rng):
    return f"stuf{rng.randint(20200000000, 20260099999)}@moe.sch.ae"


def build():
    rng = random.Random(20260903)
    os.makedirs(SAMPLES, exist_ok=True)
    rows = []

    def add(class_name, name, email, password):
        rows.append({"Class": class_name, "Student Name": name,
                     "Email": email, "Password": password})

    def student(rng_):
        return f"{rng_.choice(FIRST)} {rng_.choice(LAST)}"

    for _ in range(25):                       # 5-1 : exactly one full page + 5
        add("5-1", student(rng), fake_email(rng), fake_password(rng))
    for _ in range(25):                       # 5-2
        add("5-2", student(rng), fake_email(rng), fake_password(rng))
    for _ in range(8):                        # 5-10 : proves natural sorting
        add("5-10", student(rng), fake_email(rng), fake_password(rng))
    for _ in range(18):                       # 6-1 : less than one page
        add("6-1", student(rng), fake_email(rng), fake_password(rng))
    for _ in range(45):                       # 7-3 : three pages
        add("7-3", student(rng), fake_email(rng), fake_password(rng))
    # edge cases + messy class values + an empty row
    for name, email, password in EDGE_CASES:
        add("٨ - ٢", name, email, password)          # Arabic-Indic digits
    add("8/2", "Mixed Separator Student", fake_email(rng), fake_password(rng))
    add("", "", "", "")                               # completely empty row

    xlsx = os.path.join(SAMPLES, "sample_students.xlsx")
    pd.DataFrame(rows).to_excel(xlsx, index=False)
    print(f"[OK] sample data -> {os.path.relpath(xlsx, BASE)}")
    return xlsx


if __name__ == "__main__":
    path = build()
    sys.path.insert(0, BASE)
    import config as CFG
    import generate_tags

    CFG.MAKE_PER_CLASS_PDFS = False
    CFG.MAIN_PDF_NAME = "Sample_Student_Tags.pdf"
    sys.exit(generate_tags.main(["-i", path, "-o", "samples"]))
