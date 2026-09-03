# -*- coding: utf-8 -*-
"""
=============================================================
 Student Tags - Central Configuration / ملف الإعدادات المركزي
=============================================================

Everything you may want to change lives in THIS file.
كل ما قد ترغبين بتعديله موجود في هذا الملف فقط.

After editing, just run again:   python generate_tags.py
"""

# ---------------------------------------------------------------
# 1) SCHOOL IDENTITY / هوية المدرسة
# ---------------------------------------------------------------
SCHOOL_NAME = "Muraijib School"        # printed small on top of each page ("" = hide)
SCHOOL_NAME_AR = ""                    # optional Arabic name, e.g. "مدرسة المريجب"
SHOW_SCHOOL_NAME = True

SHOW_LOGO = True                       # logo is drawn only if the file below exists
LOGO_IMAGE = "assets/logo.png"
LOGO_ON_CARD = False                   # True = tiny logo inside every card (uses ink)
LOGO_ON_PAGE = True                    # True = logo in the page header

# ---------------------------------------------------------------
# 2) FILES & FOLDERS / الملفات والمجلدات
# ---------------------------------------------------------------
EXCEL_FILE = "input/students.xlsx"     # put your Excel file here
EXCEL_SHEET = None                     # None = all sheets, or "5-1" for one sheet only
OUTPUT_FOLDER = "output"
MAIN_PDF_NAME = "Student_Tags.pdf"
PER_CLASS_FOLDER = "classes"           # output/classes/5-1_Student_Tags.pdf
MAKE_PER_CLASS_PDFS = True

CHARACTER_IMAGE = "assets/character.png"   # optional cartoon character
FONTS_FOLDER = "fonts"

# ---------------------------------------------------------------
# 3) EXCEL FORMAT / صيغة ملف الإكسل
# ---------------------------------------------------------------
# "auto"     -> detect automatically (recommended)
# "combined" -> one text line per student:  NAME (email) : password
#               and the SHEET NAME is the class  (e.g. sheet "5-1")
# "columns"  -> a normal table with the column names configured below
EXCEL_FORMAT = "auto"

# Used only when EXCEL_FORMAT is "columns".
# Several spellings are accepted; the first one found in the file wins.
COLUMN_CLASS    = ["Class", "class", "Grade", "Section", "الصف", "الصف/الشعبة"]
COLUMN_NAME     = ["Student Name", "Name", "Student", "اسم الطالبة", "الاسم"]
COLUMN_EMAIL    = ["Email", "E-mail", "Username", "البريد الإلكتروني", "البريد"]
COLUMN_PASSWORD = ["Password", "Pass", "كلمة المرور", "الرقم السري"]

# When EXCEL_FORMAT is "combined", the class comes from the sheet name.
# If your sheets are named differently you can map them here, e.g. {"Sheet1": "5-1"}
SHEET_TO_CLASS = {}

# ---------------------------------------------------------------
# 4) PAGE & GRID / الصفحة وتوزيع البطاقات
# ---------------------------------------------------------------
PAGE_SIZE = "A4"                 # "A4" or "LETTER"
PAGE_ORIENTATION = "portrait"    # "portrait" | "landscape" | "auto"

ROWS_PER_PAGE = 5                # 5 x 4 = 20 cards per A4 page
COLUMNS_PER_PAGE = 4

PAGE_MARGIN_MM = 9.0             # safe printing margin on every side
GAP_BETWEEN_CARDS_MM = 3.5       # space between cards (room for scissors)
CARD_PADDING_MM = 3.0            # inner padding of a card

START_EACH_CLASS_ON_NEW_PAGE = True   # never mix two classes on one page

# ---------------------------------------------------------------
# 5) PAGE HEADER / ترويسة الصفحة
# ---------------------------------------------------------------
SHOW_CLASS_HEADER = True         # "Class 5-1" on top of every page
CLASS_HEADER_TEXT = "Class {class_name}"      # {class_name} is replaced
SHOW_PAGE_NUMBER = True          # "Page 1 of 2"
PAGE_NUMBER_TEXT = "Page {page} of {total}"
HEADER_FONT_SIZE = 9.0
HEADER_HEIGHT_MM = 8.0           # space reserved for the header

# ---------------------------------------------------------------
# 6) CUTTING HELP / علامات القص
# ---------------------------------------------------------------
SHOW_CUT_LINES = True            # thin border around every card
CUT_LINE_WIDTH = 0.5             # pt - thin enough to disappear after cutting
SHOW_CROP_MARKS = False          # small corner ticks at the page edges
CROP_MARK_LENGTH_MM = 3.0

# ---------------------------------------------------------------
# 7) CARD CONTENT / محتوى البطاقة
# ---------------------------------------------------------------
SHOW_CLASS_ON_CARD = True
# How student names are displayed:
#   "as_is" -> exactly as written in Excel (mixed UPPER / Title case)
#   "title" -> Nice Consistent Title Case  (recommended, Arabic is never changed)
#   "upper" -> ALL CAPITALS
NAME_CASE = "title"
# Order of the students inside one class: "name" (A-Z) or "file" (Excel order)
SORT_STUDENTS_BY = "name"
LABEL_EMAIL = "EMAIL"
LABEL_PASSWORD = "PASSWORD"
LABEL_CLASS = ""                 # e.g. "Class" -> "Class 5-1"; "" -> just "5-1"
MISSING_VALUE_TEXT = "—"         # shown when a cell is empty

# Character / picture area inside the card.
CHARACTER_AREA_ENABLED = True
# Share of the free space (the part above the e-mail/password panel) that is
# given to the picture.  0.45 = the picture takes 45%, the name takes 55%.
CHARACTER_AREA_RATIO = 0.45
# How the picture is placed inside the card:
#   "auto" -> tall pictures go to the side, wide pictures go under the name
#   "side" -> a vertical strip beside the name (best for a standing character)
#   "band" -> a horizontal strip under the name
CHARACTER_LAYOUT = "auto"
CHARACTER_SIDE = "right"         # "right" | "left"   (used by the side layout)
CHARACTER_MAX_WIDTH_RATIO = 0.42 # at most 42% of the card width
CHARACTER_ALIGN = "center"       # "left" | "center" | "right" (band layout only)
# What to do when assets/character.png does not exist:
#   "reserve"     -> keep the empty space (so you can add a sticker later)
#   "placeholder" -> draw a light dashed box
#   "collapse"    -> remove the space and enlarge the rest of the card
CHARACTER_MISSING_MODE = "collapse"

# ---------------------------------------------------------------
# 8) FONTS / الخطوط
# ---------------------------------------------------------------
# Bundled inside fonts/ - they support Arabic + English and are print friendly.
FONT_REGULAR = "NotoSansArabic-Regular.ttf"
FONT_BOLD = "NotoSansArabic-Bold.ttf"
# A monospaced font makes passwords unmistakable (0 vs O, l vs 1).
FONT_MONO_REGULAR = "NotoSansMono-Regular.ttf"
FONT_MONO_BOLD = "NotoSansMono-Bold.ttf"
USE_MONO_FOR_CREDENTIALS = True

# Maximum font sizes - the program shrinks text automatically when needed.
STUDENT_NAME_FONT_SIZE = 10.5
STUDENT_NAME_MIN_FONT_SIZE = 6.5
STUDENT_NAME_MAX_LINES = 3
CLASS_FONT_SIZE = 7.5
LABEL_FONT_SIZE = 5.2
EMAIL_FONT_SIZE = 7.2
EMAIL_MIN_FONT_SIZE = 4.8
PASSWORD_FONT_SIZE = 11.5
PASSWORD_MIN_FONT_SIZE = 6.5

# ---------------------------------------------------------------
# 9) COLOURS / الألوان  (ink friendly - white card + soft accent)
# ---------------------------------------------------------------
COLOR_CARD_BORDER = "#B9C6D6"    # card outline
COLOR_ACCENT = "#1F5FA8"         # main accent (class chip, name)
COLOR_ACCENT_SOFT = "#EAF1F9"    # very light accent fill
COLOR_TEXT = "#12263A"           # main text
COLOR_TEXT_MUTED = "#6B7C90"     # labels
COLOR_PANEL_BG = "#F6F8FB"       # credentials panel background
COLOR_PANEL_BORDER = "#DCE5EF"
COLOR_HEADER_TEXT = "#5A6B7E"
COLOR_PLACEHOLDER = "#C9D4E0"

CARD_CORNER_RADIUS_MM = 2.0
PANEL_CORNER_RADIUS_MM = 1.5

# ---------------------------------------------------------------
# 10) PDF METADATA / بيانات الملف
# ---------------------------------------------------------------
PDF_TITLE = "Student Login Tags"
PDF_AUTHOR = SCHOOL_NAME
