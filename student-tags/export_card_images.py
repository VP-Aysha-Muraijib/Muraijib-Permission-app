# -*- coding: utf-8 -*-
"""
Export ONE image per student - each card as its own PNG named after the
student - and pack every class into a single .zip file.

    python export_card_images.py

Output:
    output/images/5-1_Student_Cards.zip
        Afra Eida.png
        Aldmani Alblooshi.png
        ...
    output/images/5-2_Student_Cards.zip
    ...

Use --keep-folders to also leave the loose PNG files on disk.

Everything runs locally.  The images contain passwords, so treat the zip
files exactly like the printed cards.
"""

from __future__ import annotations

import argparse
import io
import os
import re
import shutil
import sys
import zipfile

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE_DIR)

try:
    import pymupdf                      # PyMuPDF - turns the PDF page into a PNG
except ImportError:                     # pragma: no cover
    try:
        import fitz as pymupdf
    except ImportError:
        print("\n[X] This script also needs PyMuPDF.")
        print("    Please run:  pip install pymupdf\n")
        sys.exit(1)

from reportlab.pdfgen import canvas as rl_canvas
from reportlab.lib.units import mm

import config as CFG
import generate_tags as G


# ---------------------------------------------------------------------------
#  Settings you may want to change
# ---------------------------------------------------------------------------
IMAGE_DPI = 300           # 300 = print quality.  200 = smaller files.
IMAGE_MARGIN_MM = 2.0     # white border around the card inside the image
IMAGE_FORMAT = "png"      # "png" (recommended) or "jpg"


_INVALID_FILENAME = re.compile(r'[<>:"/\\|?*\x00-\x1f]')


def safe_filename(name: str, fallback: str = "student") -> str:
    """Make a file name that is valid on Windows, macOS and Linux."""
    cleaned = _INVALID_FILENAME.sub("", name or "").strip().strip(".")
    cleaned = re.sub(r"\s+", " ", cleaned)
    return cleaned or fallback


def render_card_png(student, fonts, geo, plan, dpi: int) -> bytes:
    """Draw a single card on its own page and return it as image bytes."""
    bleed = IMAGE_MARGIN_MM * mm
    page_w = geo.card_w + 2 * bleed
    page_h = geo.card_h + 2 * bleed

    buffer = io.BytesIO()
    c = rl_canvas.Canvas(buffer, pagesize=(page_w, page_h))
    renderer = G.Renderer(fonts, geo, plan)
    renderer.draw_card(c, bleed, bleed, student)
    c.showPage()
    c.save()
    buffer.seek(0)

    document = pymupdf.open(stream=buffer.read(), filetype="pdf")
    try:
        pixmap = document[0].get_pixmap(dpi=dpi, alpha=False)
        if IMAGE_FORMAT.lower() in ("jpg", "jpeg"):
            return pixmap.tobytes("jpg", jpg_quality=92)
        return pixmap.tobytes("png")
    finally:
        document.close()


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(
        description="Export one image per student and zip them per class."
    )
    parser.add_argument("-i", "--input", help="Excel file (overrides config.py)")
    parser.add_argument("-o", "--output", help="Output folder (overrides config.py)")
    parser.add_argument("--dpi", type=int, default=IMAGE_DPI,
                        help=f"image resolution (default {IMAGE_DPI})")
    parser.add_argument("--keep-folders", action="store_true",
                        help="also keep the loose PNG files next to the zip")
    args = parser.parse_args(argv)

    excel = G._path(args.input or CFG.EXCEL_FILE)
    out_root = os.path.join(G._path(args.output or CFG.OUTPUT_FOLDER), "images")

    print()
    print("=" * 52)
    print("  STUDENT TAGS  -  one image per student")
    print("=" * 52)

    if not os.path.exists(excel):
        print(f"\n[X] Excel file not found: {excel}\n")
        return 1

    students, report = G.load_students(excel)
    if not students:
        print("\n[X] No students found in the file.\n")
        return 1

    geo = G.build_geometry()
    fonts = G.register_fonts()
    groups = G.group_by_class(students)
    plan = G.plan_cards(groups, fonts, geo)

    print(f"  Students   : {report.total} in {len(report.classes)} classes")
    print(f"  Card image : {geo.card_w / mm:.0f} x {geo.card_h / mm:.0f} mm "
          f"at {args.dpi} dpi")
    print()

    os.makedirs(out_root, exist_ok=True)
    grand_total = 0

    for class_name, items in groups:
        safe_class = re.sub(r"[^\w\-]+", "_", class_name) or "class"
        zip_path = os.path.join(out_root, f"{safe_class}_Student_Cards.zip")
        folder = os.path.join(out_root, safe_class)
        if args.keep_folders:
            os.makedirs(folder, exist_ok=True)

        used = {}
        with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as archive:
            for student in items:
                display = G.format_name(student.name) or "Unnamed student"
                stem = safe_filename(display)
                # two students with the same name keep separate files
                used[stem] = used.get(stem, 0) + 1
                if used[stem] > 1:
                    stem = f"{stem} ({used[stem]})"
                filename = f"{stem}.{IMAGE_FORMAT.lower()}"

                data = render_card_png(student, fonts, geo, plan, args.dpi)
                archive.writestr(filename, data)
                if args.keep_folders:
                    with open(os.path.join(folder, filename), "wb") as handle:
                        handle.write(data)
                grand_total += 1

        size_mb = os.path.getsize(zip_path) / (1024 * 1024)
        print(f"  [OK] {os.path.relpath(zip_path, BASE_DIR)}"
              f"  ({len(items)} images, {size_mb:.1f} MB)")

    print()
    print(f"  Done - {grand_total} card images in {len(groups)} zip files.")
    print("  These images contain passwords; share them as carefully as the")
    print("  printed cards.")
    print()
    return 0


if __name__ == "__main__":
    sys.exit(main())
