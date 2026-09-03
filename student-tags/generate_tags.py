# -*- coding: utf-8 -*-
"""
=====================================================================
 Student Tags  ~  printable student login cards from an Excel file
 بطاقات دخول الطالبات - تُنشأ تلقائيًا من ملف إكسل
=====================================================================

Usage / طريقة التشغيل:

    python generate_tags.py

Everything is configured in  config.py .
All processing happens locally. Nothing is uploaded anywhere.
كل المعالجة تتم محليًا، ولا تُرسل أي بيانات إلى أي جهة خارجية.
"""

from __future__ import annotations

import os
import re
import sys
import argparse
from dataclasses import dataclass, field
from typing import List, Dict, Tuple, Optional, Sequence

# --------------------------------------------------------------------------
# Friendly dependency check
# --------------------------------------------------------------------------
_MISSING: List[str] = []
try:
    import pandas as pd
except ImportError:                                        # pragma: no cover
    _MISSING.append("pandas")
try:
    import openpyxl  # noqa: F401  (used by pandas to read .xlsx)
except ImportError:                                        # pragma: no cover
    _MISSING.append("openpyxl")
try:
    from reportlab.pdfgen import canvas as rl_canvas
    from reportlab.lib.pagesizes import A4, LETTER, landscape, portrait
    from reportlab.lib.units import mm
    from reportlab.lib.colors import HexColor
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    from reportlab.lib.utils import ImageReader
except ImportError:                                        # pragma: no cover
    _MISSING.append("reportlab")

if _MISSING:                                               # pragma: no cover
    print("\n[X] Missing libraries: " + ", ".join(_MISSING))
    print("    Please run:  pip install -r requirements.txt\n")
    sys.exit(1)

# Optional - only needed for Arabic names.
try:
    import arabic_reshaper
    from bidi.algorithm import get_display
    ARABIC_SUPPORT = True
except ImportError:                                        # pragma: no cover
    ARABIC_SUPPORT = False

try:
    from PIL import Image
    PIL_AVAILABLE = True
except ImportError:                                        # pragma: no cover
    PIL_AVAILABLE = False

import config as CFG

BASE_DIR = os.path.dirname(os.path.abspath(__file__))


def _path(p: str) -> str:
    """Resolve a config path relative to the project folder."""
    return p if os.path.isabs(p) else os.path.join(BASE_DIR, p)


# ==========================================================================
#  SECTION 1 - TEXT HELPERS (Arabic shaping, natural sort, normalisation)
# ==========================================================================

_ARABIC_RE = re.compile(
    r"[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]"
)

# Arabic-Indic and Eastern Arabic-Indic digits -> ASCII digits
_DIGIT_MAP = {ord(c): str(i % 10) for i, c in enumerate("٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹")}


def has_arabic(text: str) -> bool:
    return bool(_ARABIC_RE.search(text or ""))


def shape(text: str) -> str:
    """
    Prepare a string for drawing inside the PDF.

    Arabic is reshaped (letters joined) and reordered for right-to-left
    display.  Latin text, e-mails and passwords are returned untouched so
    they always stay left-to-right.
    """
    if not text:
        return ""
    if not has_arabic(text):
        return text
    if not ARABIC_SUPPORT:
        return text
    return get_display(arabic_reshaper.reshape(text))


def ascii_digits(text: str) -> str:
    return (text or "").translate(_DIGIT_MAP)


def natural_key(text: str):
    """
    Natural numeric sort key.
      5-1, 5-2, 5-10, 6-1   (not 5-1, 5-10, 5-2)
    Digit runs are compared as integers, everything else as lowercase text.
    """
    text = ascii_digits(str(text or ""))
    parts = re.split(r"(\d+)", text)
    key = []
    for part in parts:
        if part.isdigit():
            key.append((0, int(part), ""))
        elif part:
            key.append((1, 0, part.lower()))
    return key


_CLASS_RE = re.compile(r"^\s*(\d{1,2})\s*[-–—_/\\.\s]\s*(\d{1,2})\s*$")


def normalize_class(raw: str) -> Tuple[str, bool]:
    """
    Clean a class/section value.  Returns (normalised, is_valid_pattern).
    "٥ - ١", "5/1", "5 _ 1"  ->  "5-1"
    Anything unusual is kept as-is (never dropped) but flagged as not matching
    the expected  grade-section  pattern.
    """
    text = ascii_digits(str(raw or "")).strip()
    text = re.sub(r"\s+", " ", text)
    if not text:
        return "", False
    m = _CLASS_RE.match(text)
    if m:
        return f"{int(m.group(1))}-{int(m.group(2))}", True
    return text, False


_LOWER_PARTICLES = {"bin", "bint", "of", "the"}


def format_name(name: str) -> str:
    """Apply NAME_CASE from config.  Arabic text is never modified."""
    name = (name or "").strip()
    if not name or has_arabic(name):
        return name
    mode = str(getattr(CFG, "NAME_CASE", "as_is")).lower()
    if mode == "upper":
        return name.upper()
    if mode != "title":
        return name
    words = []
    for i, word in enumerate(name.split()):
        parts = [p_.capitalize() for p_ in re.split(r"(['-])", word) if p_ != ""]
        fixed = "".join(parts)
        if i > 0 and fixed.lower() in _LOWER_PARTICLES:
            fixed = fixed.lower()
        words.append(fixed)
    return " ".join(words)


def clean(value) -> str:
    """Turn any Excel cell into a trimmed string ('' for empty/NaN)."""
    if value is None:
        return ""
    try:
        if pd.isna(value):
            return ""
    except (TypeError, ValueError):
        pass
    text = str(value).strip()
    if text.lower() in {"nan", "none", "nat"}:
        return ""
    return re.sub(r"\s+", " ", text)


# ==========================================================================
#  SECTION 2 - DATA LOADING
# ==========================================================================

@dataclass
class Student:
    name: str = ""
    email: str = ""
    password: str = ""
    class_name: str = ""
    class_valid: bool = True


@dataclass
class LoadReport:
    total: int = 0
    classes: List[str] = field(default_factory=list)
    skipped_empty: int = 0
    unparsed_rows: int = 0
    missing_names: int = 0
    missing_emails: int = 0
    missing_passwords: int = 0
    invalid_classes: List[str] = field(default_factory=list)


# "NAME (email@domain) : password"  -- the format used by the MOE export
_COMBINED_RE = re.compile(
    r"^\s*(?P<name>.+?)\s*[\(\[]\s*(?P<email>[^\s()\[\]]+@[^\s()\[\]]+)\s*[\)\]]"
    r"\s*[:：]\s*(?P<password>\S.*?)\s*$"
)
# Fallback: "NAME  email  password" separated by ":" only
_LOOSE_RE = re.compile(
    r"^\s*(?P<name>.+?)\s+(?P<email>[^\s]+@[^\s]+)\s*[:：]\s*(?P<password>\S.*?)\s*$"
)


def parse_combined_line(line: str) -> Optional[Student]:
    for rx in (_COMBINED_RE, _LOOSE_RE):
        m = rx.match(line)
        if m:
            return Student(
                name=clean(m.group("name")),
                email=clean(m.group("email")),
                password=m.group("password").strip(),
            )
    return None


def _pick_column(columns: Sequence[str], candidates: Sequence[str]) -> Optional[str]:
    lower = {str(c).strip().lower(): c for c in columns}
    for cand in candidates:
        hit = lower.get(str(cand).strip().lower())
        if hit is not None:
            return hit
    # last resort: partial match
    for cand in candidates:
        for key, original in lower.items():
            if str(cand).strip().lower() in key:
                return original
    return None


def _sheet_looks_combined(frame) -> bool:
    """A sheet is 'combined' when its cells look like 'NAME (email) : password'."""
    if frame.shape[1] == 0:
        return False
    hits = 0
    checked = 0
    # include the header row, because in this export the header IS a student
    values = [str(c) for c in frame.columns] + [
        str(v) for v in frame.iloc[:, 0].head(10).tolist()
    ]
    for value in values:
        text = clean(value)
        if not text:
            continue
        checked += 1
        if parse_combined_line(text):
            hits += 1
    return checked > 0 and hits >= max(1, checked // 2)


def load_students(excel_path: str) -> Tuple[List[Student], LoadReport]:
    """Read the Excel file and return the students plus a short report."""
    report = LoadReport()
    students: List[Student] = []

    if not os.path.exists(excel_path):
        raise FileNotFoundError(excel_path)

    book = pd.ExcelFile(excel_path)
    sheet_names = book.sheet_names
    if CFG.EXCEL_SHEET:
        wanted = [s for s in sheet_names if s == CFG.EXCEL_SHEET]
        if not wanted:
            raise ValueError(
                f"Sheet '{CFG.EXCEL_SHEET}' not found. Available: {sheet_names}"
            )
        sheet_names = wanted

    for sheet in sheet_names:
        raw = book.parse(sheet, header=0, dtype=str)
        mode = CFG.EXCEL_FORMAT
        if mode == "auto":
            mode = "combined" if _sheet_looks_combined(raw) else "columns"

        if mode == "combined":
            class_name, valid = normalize_class(
                CFG.SHEET_TO_CLASS.get(sheet, sheet)
            )
            # In this layout the first student was consumed as the header,
            # so read the sheet again without a header row.
            body = book.parse(sheet, header=None, dtype=str)
            for _, row in body.iterrows():
                line = clean(row.iloc[0]) if len(row) else ""
                if not line:
                    report.skipped_empty += 1
                    continue
                student = parse_combined_line(line)
                if student is None:
                    # keep the row - maybe only the name is present
                    report.unparsed_rows += 1
                    student = Student(name=line)
                student.class_name = class_name
                student.class_valid = valid
                students.append(student)
        else:
            columns = list(raw.columns)
            col_class = _pick_column(columns, CFG.COLUMN_CLASS)
            col_name = _pick_column(columns, CFG.COLUMN_NAME)
            col_email = _pick_column(columns, CFG.COLUMN_EMAIL)
            col_pass = _pick_column(columns, CFG.COLUMN_PASSWORD)
            if col_name is None:
                print(f"    ! Sheet '{sheet}': no student-name column found, skipped.")
                continue
            for _, row in raw.iterrows():
                name = clean(row.get(col_name)) if col_name else ""
                email = clean(row.get(col_email)) if col_email else ""
                password = str(row.get(col_pass)).strip() if col_pass else ""
                if password.lower() in {"nan", "none", "nat"}:
                    password = ""
                raw_class = clean(row.get(col_class)) if col_class else sheet
                if not any([name, email, password]):
                    report.skipped_empty += 1
                    continue
                class_name, valid = normalize_class(raw_class or sheet)
                students.append(
                    Student(name, email, password, class_name, valid)
                )

    # ---- report ----------------------------------------------------------
    for s in students:
        if not s.name:
            report.missing_names += 1
        if not s.email:
            report.missing_emails += 1
        if not s.password:
            report.missing_passwords += 1
        if not s.class_valid and s.class_name not in report.invalid_classes:
            report.invalid_classes.append(s.class_name)
    report.total = len(students)
    report.classes = sorted({s.class_name for s in students}, key=natural_key)
    return students, report


def group_by_class(students: Sequence[Student]) -> "list[tuple[str, list[Student]]]":
    """Group students per class, classes sorted naturally, names sorted A-Z."""
    buckets: Dict[str, List[Student]] = {}
    for s in students:
        buckets.setdefault(s.class_name, []).append(s)
    ordered = sorted(buckets.keys(), key=natural_key)
    if str(getattr(CFG, "SORT_STUDENTS_BY", "name")).lower() == "file":
        return [(c, buckets[c]) for c in ordered]
    return [(c, sorted(buckets[c], key=lambda s: natural_key(s.name))) for c in ordered]


# ==========================================================================
#  SECTION 3 - FONTS
# ==========================================================================

FONT_NAME_REGULAR = "TagSans"
FONT_NAME_BOLD = "TagSans-Bold"
FONT_NAME_MONO = "TagMono"
FONT_NAME_MONO_BOLD = "TagMono-Bold"


def register_fonts() -> Dict[str, str]:
    """
    Register the fonts shipped in fonts/.  Falls back to Helvetica so the
    program never crashes because of a missing font file.
    """
    folder = _path(CFG.FONTS_FOLDER)
    mapping = {
        FONT_NAME_REGULAR: (CFG.FONT_REGULAR, "Helvetica"),
        FONT_NAME_BOLD: (CFG.FONT_BOLD, "Helvetica-Bold"),
        FONT_NAME_MONO: (CFG.FONT_MONO_REGULAR, "Courier"),
        FONT_NAME_MONO_BOLD: (CFG.FONT_MONO_BOLD, "Courier-Bold"),
    }
    resolved: Dict[str, str] = {}
    for alias, (filename, fallback) in mapping.items():
        full = os.path.join(folder, filename) if filename else ""
        if full and os.path.exists(full):
            try:
                pdfmetrics.registerFont(TTFont(alias, full))
                resolved[alias] = alias
                continue
            except Exception as exc:                       # pragma: no cover
                print(f"    ! Could not load font {filename}: {exc}")
        print(f"    ! Font '{filename}' not found - using {fallback} instead.")
        resolved[alias] = fallback

    if not CFG.USE_MONO_FOR_CREDENTIALS:
        resolved[FONT_NAME_MONO] = resolved[FONT_NAME_REGULAR]
        resolved[FONT_NAME_MONO_BOLD] = resolved[FONT_NAME_BOLD]
    return resolved


# ==========================================================================
#  SECTION 4 - TEXT FITTING (wrap + auto shrink, never overflow the card)
# ==========================================================================

def text_width(text: str, font: str, size: float) -> float:
    return pdfmetrics.stringWidth(text, font, size)


def wrap_words(text: str, font: str, size: float, max_width: float,
               measure=None) -> List[str]:
    """
    Greedy word wrap; a single word longer than the line is split by letters.

    `measure` converts a candidate line into the exact string that will be
    drawn.  For Arabic this is the reshaped/bidi version, so the width is
    measured on what the reader actually sees - while the wrapping itself
    still happens on the original (logical) word order.  That keeps the first
    line of a right-to-left name at the top, where it belongs.
    """
    if measure is None:
        def measure(value):
            return value

    def width(value):
        return text_width(measure(value), font, size)

    words = text.split()
    lines: List[str] = []
    current = ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if width(candidate) <= max_width or not current:
            if width(candidate) > max_width and not current:
                # one very long word - break it
                piece = ""
                for ch in word:
                    if width(piece + ch) <= max_width or not piece:
                        piece += ch
                    else:
                        lines.append(piece)
                        piece = ch
                current = piece
            else:
                current = candidate
        else:
            lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines or [""]


def truncate(text: str, font: str, size: float, max_width: float) -> str:
    if text_width(text, font, size) <= max_width:
        return text
    ellipsis = "…"
    out = text
    while out and text_width(out + ellipsis, font, size) > max_width:
        out = out[:-1]
    return (out + ellipsis) if out else ""


def fit_lines(
    text: str,
    font: str,
    max_width: float,
    max_lines: int,
    size_max: float,
    size_min: float,
    step: float = 0.25,
) -> Tuple[List[str], float]:
    """
    Find the biggest font size at which `text` fits into `max_lines` lines.
    The returned lines are ready to be drawn (Arabic already shaped).
    Truncation is only used as a last resort.
    """
    text = (text or "").strip()
    if not text:
        return [""], size_max
    size = size_max
    while size >= size_min:
        lines = wrap_words(text, font, size, max_width, measure=shape)
        if len(lines) <= max_lines:
            return [shape(line) for line in lines], size
        size -= step
    lines = wrap_words(text, font, size_min, max_width, measure=shape)[:max_lines]
    drawn = [shape(line) for line in lines]
    if drawn:
        drawn[-1] = truncate(drawn[-1] + "…", font, size_min, max_width)
    return drawn, size_min


def fit_single_line(
    text: str, font: str, max_width: float, size_max: float, size_min: float,
    step: float = 0.25,
) -> Tuple[str, float]:
    text = (text or "").strip()
    size = size_max
    while size >= size_min:
        if text_width(text, font, size) <= max_width:
            return text, size
        size -= step
    return truncate(text, font, size_min, max_width), size_min


def fit_email(
    email: str, font: str, max_width: float, size_max: float, size_min: float,
    max_lines: int = 2,
) -> Tuple[List[str], float]:
    """
    E-mails stay on one line whenever possible.  If they are too long we split
    right after the '@' (still perfectly readable) instead of shrinking to an
    unreadable size.
    """
    email = (email or "").strip()
    if not email:
        return [""], size_max
    line, size = fit_single_line(email, font, max_width, size_max, size_min + 1.0)
    if text_width(email, font, size) <= max_width:
        return [email], size
    if max_lines < 2:
        return [truncate(email, font, size_min, max_width)], size_min
    if "@" in email:
        head, tail = email.split("@", 1)
        head += "@"
        size = size_max
        while size >= size_min:
            if (text_width(head, font, size) <= max_width
                    and text_width(tail, font, size) <= max_width):
                return [head, tail], size
            size -= 0.25
        return ([truncate(head, font, size_min, max_width),
                 truncate(tail, font, size_min, max_width)], size_min)
    return [truncate(email, font, size_min, max_width)], size_min


# ==========================================================================
#  SECTION 5 - PAGE GEOMETRY
# ==========================================================================

@dataclass
class Geometry:
    page_w: float
    page_h: float
    margin: float
    gap: float
    cols: int
    rows: int
    header_h: float
    card_w: float
    card_h: float

    @property
    def per_page(self) -> int:
        return self.cols * self.rows

    def card_origin(self, index_on_page: int) -> Tuple[float, float]:
        """Bottom-left corner of the card, filling the page left->right, top->bottom."""
        row = index_on_page // self.cols
        col = index_on_page % self.cols
        x = self.margin + col * (self.card_w + self.gap)
        top = self.page_h - self.margin - self.header_h
        y = top - (row + 1) * self.card_h - row * self.gap
        return x, y


def build_geometry() -> Geometry:
    base = A4 if str(CFG.PAGE_SIZE).upper() == "A4" else LETTER
    cols, rows = int(CFG.COLUMNS_PER_PAGE), int(CFG.ROWS_PER_PAGE)

    orientation = str(CFG.PAGE_ORIENTATION).lower()
    if orientation == "auto":
        # pick the orientation giving the card the most balanced shape
        def score(size):
            w, h = size
            cw = (w - 2 * CFG.PAGE_MARGIN_MM * mm - (cols - 1) * CFG.GAP_BETWEEN_CARDS_MM * mm) / cols
            ch = (h - 2 * CFG.PAGE_MARGIN_MM * mm - CFG.HEADER_HEIGHT_MM * mm
                  - (rows - 1) * CFG.GAP_BETWEEN_CARDS_MM * mm) / rows
            return cw * ch if (cw > 0 and ch > 0) else -1
        page = portrait(base) if score(portrait(base)) >= score(landscape(base)) else landscape(base)
    elif orientation == "landscape":
        page = landscape(base)
    else:
        page = portrait(base)

    page_w, page_h = page
    margin = CFG.PAGE_MARGIN_MM * mm
    gap = CFG.GAP_BETWEEN_CARDS_MM * mm
    header_h = (CFG.HEADER_HEIGHT_MM * mm
                if (CFG.SHOW_CLASS_HEADER or CFG.SHOW_SCHOOL_NAME or CFG.SHOW_PAGE_NUMBER)
                else 0.0)

    card_w = (page_w - 2 * margin - (cols - 1) * gap) / cols
    card_h = (page_h - 2 * margin - header_h - (rows - 1) * gap) / rows

    if card_w <= 20 or card_h <= 20:
        raise ValueError(
            "The chosen grid does not fit on the page. "
            "Reduce ROWS_PER_PAGE / COLUMNS_PER_PAGE or the margins in config.py."
        )
    return Geometry(page_w, page_h, margin, gap, cols, rows, header_h, card_w, card_h)


# ==========================================================================
#  SECTION 6 - DRAWING
# ==========================================================================

class Renderer:
    def __init__(self, fonts: Dict[str, str], geo: Geometry, email_lines: int = 1):
        self.f = fonts
        self.geo = geo
        self.email_lines = max(1, int(email_lines))
        self.c_border = HexColor(CFG.COLOR_CARD_BORDER)
        self.c_accent = HexColor(CFG.COLOR_ACCENT)
        self.c_accent_soft = HexColor(CFG.COLOR_ACCENT_SOFT)
        self.c_text = HexColor(CFG.COLOR_TEXT)
        self.c_muted = HexColor(CFG.COLOR_TEXT_MUTED)
        self.c_panel = HexColor(CFG.COLOR_PANEL_BG)
        self.c_panel_border = HexColor(CFG.COLOR_PANEL_BORDER)
        self.c_header = HexColor(CFG.COLOR_HEADER_TEXT)
        self.c_placeholder = HexColor(CFG.COLOR_PLACEHOLDER)

        self.character = self._load_image(CFG.CHARACTER_IMAGE)
        self.logo = self._load_image(CFG.LOGO_IMAGE) if CFG.SHOW_LOGO else None

    # -- assets ------------------------------------------------------------
    @staticmethod
    def _load_image(relative: str):
        if not relative:
            return None
        full = _path(relative)
        if not os.path.exists(full):
            return None
        try:
            reader = ImageReader(full)
            width, height = reader.getSize()
            return {"reader": reader, "w": width, "h": height,
                    "ratio": (width / height) if height else 1.0}
        except Exception as exc:                           # pragma: no cover
            print(f"    ! Could not read image '{relative}': {exc}")
            return None

    def _draw_image_fitted(self, c, img, x, y, w, h):
        """Draw centred inside the box, keeping the original aspect ratio."""
        if not img or w <= 0 or h <= 0:
            return
        ratio = img["ratio"] or 1.0
        draw_w, draw_h = w, w / ratio
        if draw_h > h:
            draw_h, draw_w = h, h * ratio
        c.drawImage(img["reader"], x + (w - draw_w) / 2, y + (h - draw_h) / 2,
                    width=draw_w, height=draw_h, mask="auto",
                    preserveAspectRatio=True, anchor="c")

    # -- page furniture ----------------------------------------------------
    def draw_page_header(self, c, class_name: str, page: int, total: int):
        geo = self.geo
        if geo.header_h <= 0:
            return
        base_y = geo.page_h - geo.margin - geo.header_h + 2.2 * mm
        c.setFillColor(self.c_header)

        left_parts = []
        if CFG.SHOW_SCHOOL_NAME and CFG.SCHOOL_NAME:
            left_parts.append(CFG.SCHOOL_NAME)
        if CFG.SHOW_SCHOOL_NAME and CFG.SCHOOL_NAME_AR:
            left_parts.append(shape(CFG.SCHOOL_NAME_AR))
        left_x = geo.margin
        if CFG.SHOW_LOGO and CFG.LOGO_ON_PAGE and self.logo:
            size = geo.header_h - 2.0 * mm
            self._draw_image_fitted(c, self.logo, geo.margin,
                                    geo.page_h - geo.margin - geo.header_h + 1.0 * mm,
                                    size * (self.logo["ratio"] or 1.0), size)
            left_x = geo.margin + size * (self.logo["ratio"] or 1.0) + 2.0 * mm
        if left_parts:
            c.setFont(self.f[FONT_NAME_REGULAR], CFG.HEADER_FONT_SIZE)
            c.drawString(left_x, base_y, "  ".join(left_parts))

        if CFG.SHOW_CLASS_HEADER and class_name:
            c.setFont(self.f[FONT_NAME_BOLD], CFG.HEADER_FONT_SIZE + 1.0)
            c.setFillColor(self.c_accent)
            c.drawCentredString(geo.page_w / 2, base_y,
                                shape(CFG.CLASS_HEADER_TEXT.format(class_name=class_name)))

        if CFG.SHOW_PAGE_NUMBER:
            c.setFont(self.f[FONT_NAME_REGULAR], CFG.HEADER_FONT_SIZE)
            c.setFillColor(self.c_header)
            c.drawRightString(geo.page_w - geo.margin, base_y,
                              CFG.PAGE_NUMBER_TEXT.format(page=page, total=total))

    def draw_crop_marks(self, c):
        if not CFG.SHOW_CROP_MARKS:
            return
        geo, length = self.geo, CFG.CROP_MARK_LENGTH_MM * mm
        c.setStrokeColor(self.c_border)
        c.setLineWidth(0.3)
        top = geo.page_h - geo.margin - geo.header_h
        xs = [geo.margin + i * (geo.card_w + geo.gap) for i in range(geo.cols)]
        xs += [x + geo.card_w for x in xs]
        ys = [top - (r + 1) * geo.card_h - r * geo.gap for r in range(geo.rows)]
        ys += [y + geo.card_h for y in ys]
        for x in xs:
            c.line(x, geo.margin - length, x, geo.margin - 1)
            c.line(x, top + 1, x, top + length)
        for y in ys:
            c.line(geo.margin - length, y, geo.margin - 1, y)
            c.line(geo.page_w - geo.margin + 1, y, geo.page_w - geo.margin + length, y)

    # -- the card ----------------------------------------------------------
    def draw_card(self, c, x: float, y: float, student: Student):
        w, h = self.geo.card_w, self.geo.card_h
        pad = CFG.CARD_PADDING_MM * mm
        radius = CFG.CARD_CORNER_RADIUS_MM * mm

        # 1. outline
        if CFG.SHOW_CUT_LINES:
            c.setStrokeColor(self.c_border)
            c.setLineWidth(CFG.CUT_LINE_WIDTH)
            c.roundRect(x, y, w, h, radius, stroke=1, fill=0)

        inner_x = x + pad
        inner_w = w - 2 * pad
        cursor = y + h - pad                       # we draw downwards

        # 2. accent rule + class chip
        if CFG.SHOW_CLASS_ON_CARD and student.class_name:
            chip_text = (f"{CFG.LABEL_CLASS} {student.class_name}".strip()
                         if CFG.LABEL_CLASS else student.class_name)
            chip_text = shape(chip_text)
            chip_font = self.f[FONT_NAME_BOLD]
            chip_size = CFG.CLASS_FONT_SIZE
            chip_w = text_width(chip_text, chip_font, chip_size) + 4.4 * mm
            chip_h = chip_size + 3.2
            chip_y = cursor - chip_h
            c.setFillColor(self.c_accent_soft)
            c.setStrokeColor(self.c_accent_soft)
            c.roundRect(inner_x, chip_y, min(chip_w, inner_w), chip_h,
                        chip_h / 2, stroke=0, fill=1)
            c.setFillColor(self.c_accent)
            c.setFont(chip_font, chip_size)
            c.drawString(inner_x + 2.2 * mm, chip_y + 2.4, chip_text)

            if CFG.LOGO_ON_CARD and self.logo:
                self._draw_image_fitted(c, self.logo,
                                        x + w - pad - chip_h * (self.logo["ratio"] or 1.0),
                                        chip_y, chip_h * (self.logo["ratio"] or 1.0), chip_h)
            cursor = chip_y - 2.0 * mm

        # 3. credentials panel is anchored to the BOTTOM of the card
        panel_h = self._credentials_height()
        panel_y = y + pad
        self._draw_credentials(c, inner_x, panel_y, inner_w, panel_h, student)

        # 4. remaining space is shared by the name and the character
        free_top = cursor
        free_bottom = panel_y + panel_h + 2.0 * mm
        free_h = max(free_top - free_bottom, 6.0)

        mode = str(CFG.CHARACTER_MISSING_MODE).lower()
        wanted = bool(CFG.CHARACTER_AREA_ENABLED) and (
            self.character is not None or mode in ("reserve", "placeholder"))
        show_character = wanted and (self.character is not None or mode == "placeholder")

        layout = str(getattr(CFG, "CHARACTER_LAYOUT", "auto")).lower()
        if layout == "auto":
            ratio = self.character["ratio"] if self.character else 0.45
            layout = "side" if ratio < 0.8 else "band"

        name_x, name_w = inner_x, inner_w
        name_top, name_bottom = free_top, free_bottom
        char_box = None

        if wanted and layout == "side":
            # The picture gets a vertical strip running from the top of the
            # card down to the credentials panel; the name keeps the rest.
            strip_top = y + h - pad
            strip_h = max(strip_top - free_bottom, 6.0)
            ratio = self.character["ratio"] if self.character else 0.45
            strip_w = min(inner_w * float(CFG.CHARACTER_MAX_WIDTH_RATIO),
                          strip_h * ratio)
            gap_x = 1.2 * mm
            if str(CFG.CHARACTER_SIDE).lower() == "left":
                char_box = (inner_x, free_bottom, strip_w, strip_h)
                name_x = inner_x + strip_w + gap_x
            else:
                char_box = (inner_x + inner_w - strip_w, free_bottom, strip_w, strip_h)
            name_w = inner_w - strip_w - gap_x
        elif wanted and layout == "band":
            char_h = min(free_h * float(CFG.CHARACTER_AREA_RATIO), free_h * 0.60)
            if char_h > 3:
                box_x, box_w = inner_x, inner_w
                if self.character:
                    target_w = min(inner_w, char_h * (self.character["ratio"] or 1.0))
                    align = str(CFG.CHARACTER_ALIGN).lower()
                    if align == "left":
                        box_x, box_w = inner_x, target_w
                    elif align == "right":
                        box_x, box_w = inner_x + inner_w - target_w, target_w
                char_box = (box_x, free_bottom, box_w, char_h)
                name_bottom = free_bottom + char_h

        # 4a. student name (largest element, auto wrapped and auto shrunk)
        name_font = self.f[FONT_NAME_BOLD]
        lines, size = fit_lines(
            format_name(student.name) or CFG.MISSING_VALUE_TEXT,
            name_font, name_w, int(CFG.STUDENT_NAME_MAX_LINES),
            CFG.STUDENT_NAME_FONT_SIZE, CFG.STUDENT_NAME_MIN_FONT_SIZE,
        )
        leading = size * 1.18
        block_h = leading * len(lines)
        area_h = max(name_top - name_bottom, block_h)
        start_y = name_bottom + (area_h - block_h) / 2.0 + block_h - size
        start_y = min(start_y, name_top - size)
        c.setFillColor(self.c_text)
        c.setFont(name_font, size)
        for i, line in enumerate(lines):
            c.drawCentredString(name_x + name_w / 2, start_y - i * leading, line)

        # 4b. character / picture
        if char_box and show_character:
            bx, by, bw, bh = char_box
            if self.character:
                self._draw_image_fitted(c, self.character, bx, by, bw, bh)
            else:
                c.saveState()
                c.setStrokeColor(self.c_placeholder)
                c.setLineWidth(0.5)
                c.setDash(1.6, 1.6)
                c.roundRect(bx, by + 1.0, bw, bh - 2.0, 1.2 * mm, stroke=1, fill=0)
                c.restoreState()

    # -- credentials block -------------------------------------------------
    # These constants are shared by the height calculation and the drawing
    # code, so the panel is always exactly as tall as its content.
    PANEL_PAD = 1.8 * mm
    LABEL_GAP = 1.0
    DIVIDER_SPACE_ABOVE = 1.6 * mm
    DIVIDER_SPACE_BELOW = 1.4 * mm

    def _credentials_height(self) -> float:
        label = CFG.LABEL_FONT_SIZE
        return (2 * self.PANEL_PAD
                + label + self.LABEL_GAP
                + CFG.EMAIL_FONT_SIZE * 1.12 * self.email_lines
                + self.DIVIDER_SPACE_ABOVE + self.DIVIDER_SPACE_BELOW
                + label
                + CFG.PASSWORD_FONT_SIZE * 1.16
                + 0.8 * mm)

    def _draw_credentials(self, c, x, y, w, h, student: Student):
        radius = CFG.PANEL_CORNER_RADIUS_MM * mm
        c.setFillColor(self.c_panel)
        c.setStrokeColor(self.c_panel_border)
        c.setLineWidth(0.4)
        c.roundRect(x, y, w, h, radius, stroke=1, fill=1)

        inner_pad = self.PANEL_PAD
        tx = x + inner_pad
        tw = w - 2 * inner_pad
        cursor = y + h - inner_pad

        # --- e-mail ---
        c.setFillColor(self.c_muted)
        c.setFont(self.f[FONT_NAME_BOLD], CFG.LABEL_FONT_SIZE)
        cursor -= CFG.LABEL_FONT_SIZE
        c.drawString(tx, cursor, shape(CFG.LABEL_EMAIL))
        cursor -= self.LABEL_GAP

        email = student.email or CFG.MISSING_VALUE_TEXT
        mono = self.f[FONT_NAME_MONO]
        e_lines, e_size = fit_email(email, mono, tw, CFG.EMAIL_FONT_SIZE,
                                    CFG.EMAIL_MIN_FONT_SIZE, self.email_lines)
        c.setFillColor(self.c_text)
        c.setFont(mono, e_size)
        for line in e_lines:
            cursor -= e_size * 1.12
            c.drawString(tx, cursor, line)

        # --- divider ---
        cursor -= self.DIVIDER_SPACE_ABOVE
        c.setStrokeColor(self.c_panel_border)
        c.setLineWidth(0.4)
        c.line(tx, cursor, tx + tw, cursor)

        # --- password ---
        cursor -= self.DIVIDER_SPACE_BELOW
        c.setFillColor(self.c_muted)
        c.setFont(self.f[FONT_NAME_BOLD], CFG.LABEL_FONT_SIZE)
        cursor -= CFG.LABEL_FONT_SIZE
        c.drawString(tx, cursor, shape(CFG.LABEL_PASSWORD))

        password = student.password or CFG.MISSING_VALUE_TEXT
        mono_bold = self.f[FONT_NAME_MONO_BOLD]
        p_text, p_size = fit_single_line(password, mono_bold, tw,
                                         CFG.PASSWORD_FONT_SIZE, CFG.PASSWORD_MIN_FONT_SIZE)
        cursor -= p_size * 1.16
        c.setFillColor(self.c_accent)
        c.setFont(mono_bold, p_size)
        c.drawString(tx, cursor, p_text)


# ==========================================================================
#  SECTION 7 - PDF BUILDING
# ==========================================================================

def _pages_for(groups, geo: Geometry) -> int:
    if CFG.START_EACH_CLASS_ON_NEW_PAGE:
        return sum(max(1, -(-len(items) // geo.per_page)) for _, items in groups)
    total = sum(len(items) for _, items in groups)
    return max(1, -(-total // geo.per_page))


def needed_email_lines(groups, fonts: Dict[str, str], geo: Geometry) -> int:
    """
    Decide once for the whole document whether e-mails need one or two lines,
    so that every card in every class has exactly the same panel height.
    """
    inner_w = geo.card_w - 2 * CFG.CARD_PADDING_MM * mm - 2 * (1.8 * mm)
    font = fonts[FONT_NAME_MONO]
    limit = CFG.EMAIL_MIN_FONT_SIZE
    for _, students in groups:
        for s in students:
            if s.email and text_width(s.email, font, limit) > inner_w:
                return 2
    return 1


def build_pdf(groups, out_path: str, fonts: Dict[str, str], geo: Geometry,
              email_lines: int = 1) -> int:
    os.makedirs(os.path.dirname(out_path) or ".", exist_ok=True)
    c = rl_canvas.Canvas(out_path, pagesize=(geo.page_w, geo.page_h))
    c.setTitle(CFG.PDF_TITLE)
    c.setAuthor(CFG.PDF_AUTHOR)
    c.setSubject("Student login cards")
    renderer = Renderer(fonts, geo, email_lines=email_lines)

    total_pages = _pages_for(groups, geo)
    page_no = 0
    slot = 0
    current_class = ""
    page_open = False

    def start_page(class_name: str):
        nonlocal page_no, page_open
        page_no += 1
        renderer.draw_page_header(c, class_name, page_no, total_pages)
        renderer.draw_crop_marks(c)
        page_open = True

    for class_name, students in groups:
        if CFG.START_EACH_CLASS_ON_NEW_PAGE and page_open and slot > 0:
            c.showPage()
            slot = 0
            page_open = False
        current_class = class_name
        for student in students:
            if slot == 0:
                if page_open:
                    c.showPage()
                start_page(current_class)
            elif slot % geo.per_page == 0:
                c.showPage()
                slot = 0
                start_page(current_class)
            x, y = geo.card_origin(slot)
            renderer.draw_card(c, x, y, student)
            slot += 1
            if slot >= geo.per_page:
                slot = 0
                c.showPage()
                page_open = False

    if page_open:
        c.showPage()
    c.save()
    return page_no


# ==========================================================================
#  SECTION 8 - MAIN
# ==========================================================================

def print_report(report: LoadReport, geo: Geometry):
    print("  " + "-" * 46)
    print(f"  Total students     : {report.total}")
    print(f"  Classes            : {len(report.classes)}  "
          f"({', '.join(report.classes) if report.classes else '-'})")
    print(f"  Missing names      : {report.missing_names}")
    print(f"  Missing emails     : {report.missing_emails}")
    print(f"  Missing passwords  : {report.missing_passwords}")
    print(f"  Invalid class names: {len(report.invalid_classes)}"
          + (f"  ({', '.join(report.invalid_classes)})" if report.invalid_classes else ""))
    print(f"  Empty rows skipped : {report.skipped_empty}")
    if report.unparsed_rows:
        print(f"  Rows without email/password : {report.unparsed_rows}")
    print(f"  Card size          : {geo.card_w / mm:.1f} x {geo.card_h / mm:.1f} mm "
          f"({geo.cols} x {geo.rows} = {geo.per_page} per page)")
    print("  " + "-" * 46)
    # NOTE: passwords are never printed to the console or to any log file.


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(
        description="Create printable student login cards (PDF) from an Excel file."
    )
    parser.add_argument("-i", "--input", help="Excel file (overrides config.py)")
    parser.add_argument("-o", "--output", help="Output folder (overrides config.py)")
    parser.add_argument("--no-per-class", action="store_true",
                        help="Only build the single combined PDF")
    args = parser.parse_args(argv)

    excel = _path(args.input or CFG.EXCEL_FILE)
    out_dir = _path(args.output or CFG.OUTPUT_FOLDER)

    print()
    print("=" * 52)
    print("  STUDENT TAGS  -  building printable login cards")
    print("=" * 52)
    print(f"  Excel file : {excel}")

    if not os.path.exists(excel):
        print("\n[X] Excel file not found.")
        print(f"    Please place your file at: {excel}")
        print("    (or change EXCEL_FILE in config.py)\n")
        return 1

    print("  Reading data ...")
    try:
        students, report = load_students(excel)
    except Exception as exc:
        print(f"\n[X] Could not read the Excel file: {exc}\n")
        return 1

    if not students:
        print("\n[X] No students found in the file.\n")
        return 1

    geo = build_geometry()
    print_report(report, geo)

    fonts = register_fonts()
    groups = group_by_class(students)

    email_lines = needed_email_lines(groups, fonts, geo)

    main_pdf = os.path.join(out_dir, CFG.MAIN_PDF_NAME)
    pages = build_pdf(groups, main_pdf, fonts, geo, email_lines)
    print(f"  [OK] {os.path.relpath(main_pdf, BASE_DIR)}  ({pages} pages)")

    if CFG.MAKE_PER_CLASS_PDFS and not args.no_per_class:
        class_dir = os.path.join(out_dir, CFG.PER_CLASS_FOLDER)
        os.makedirs(class_dir, exist_ok=True)
        for class_name, items in groups:
            safe = re.sub(r"[^\w\-]+", "_", class_name) or "class"
            path = os.path.join(class_dir, f"{safe}_Student_Tags.pdf")
            n = build_pdf([(class_name, items)], path, fonts, geo, email_lines)
            print(f"  [OK] {os.path.relpath(path, BASE_DIR)}"
                  f"  ({len(items)} students, {n} pages)")

    print()
    print("  Done. Open the PDF files inside the 'output' folder and print them.")
    print("  Tip: print at 100% scale (no 'fit to page') so the cards keep their size.")
    print()
    return 0


if __name__ == "__main__":
    sys.exit(main())
