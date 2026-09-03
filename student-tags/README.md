# Student Tags — printable student login cards
### بطاقات دخول الطالبات — جاهزة للطباعة والقص

Turn an Excel file of student accounts into a clean, print-ready PDF of
wide badge-style login cards: **10 cards on every A4 page**, grouped and
sorted by class.

يحوّل ملف إكسل يحتوي على حسابات الطالبات إلى ملف PDF أنيق جاهز للطباعة،
**١٠ بطاقات في كل صفحة A4**، مرتّبة حسب الصف والشعبة.

```
┌───────────────────────────────────────────────────┐
│  ┌─────┐                                    ┌───┐ │
│  │ 5-1 │          Afra Eida                 │ 🤖│ │  name + character
│  └─────┘                                    └───┘ │
│  ┌─────────────────────────────────────────────┐  │
│  │ EMAIL      stuf20200014344@moe.sch.ae       │  │  12 pt
│  │ ─────────────────────────────────────────── │  │
│  │ PASSWORD   mruaePdrVd%6                     │  │  18 pt
│  └─────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────┘
                    94 × 51 mm
```

The login panel spans the **full width** of the card, so the e-mail and the
password are as large as the page allows. Their size is calculated from your
own data, not hard-coded — change the grid and everything rescales.

---

## 1. Install Python

1. Download Python from <https://www.python.org/downloads/>
2. During installation tick **“Add Python to PATH”** (important on Windows).

## 2. Install the libraries

Double-clicking `run.bat` does this for you the first time.
To do it manually:

```bash
pip install -r requirements.txt
```

## 3. Put your Excel file in `input/`

```
input/students.xlsx
```

Two layouts are recognised **automatically**:

**A. One sheet per class** — the format exported by the MOE system.
The sheet name is the class (`5-1`, `5-2`, …) and each row is one line:

```
MOUZA ALSAADI (stuf20210010402@moe.sch.ae) : KpOvWqE$jwCc
```

**B. A normal table** with these columns:

| Class | Student Name | Email | Password |
|-------|--------------|-------|----------|
| 5-1   | Afra Eida    | afra@moe.sch.ae | mruaePdrVd%6 |

If your column headers are spelled differently, add your spelling to
`COLUMN_CLASS`, `COLUMN_NAME`, `COLUMN_EMAIL`, `COLUMN_PASSWORD` in
`config.py`. Empty rows are skipped, and a missing value never stops the run —
it is simply shown as `—` and counted in the report.

## 4. Add the character (optional)

```
assets/character.png
```

Replace this one file to change the character on every card — nothing else to
edit. A **standing (tall)** character is placed beside the name; a **wide**
picture is placed under the name. The aspect ratio is always preserved.
If the file is missing, the cards simply use the full width instead.

## 5. Add the school logo (optional)

```
assets/logo.png
```

Shown in the page header. Turn it off with `SHOW_LOGO = False`.

## 6. Run it

**Windows:** double-click `run.bat`
**macOS / Linux:** `./run.sh`
**Any system:**

```bash
python generate_tags.py
```

Optional arguments:

```bash
python generate_tags.py -i input/other_file.xlsx -o output
python generate_tags.py --no-per-class          # only the combined PDF
```

## 7. Where the PDFs are

```
output/Student_Tags.pdf                 all classes, in order
output/classes/5-1_Student_Tags.pdf     one file per class
output/classes/5-2_Student_Tags.pdf
output/classes/5-10_Student_Tags.pdf
```

Print at **100 % scale** — never “fit to page” — so the cards keep their size.

---

## Changing the design

Everything lives in **`config.py`**. The most useful settings:

| Setting | What it does |
|---|---|
| `ROWS_PER_PAGE`, `COLUMNS_PER_PAGE` | cards per page (`5 × 2 = 10`). Card size, margins, gaps **and font sizes** are recalculated automatically. `2 × 4` → bigger, `2 × 7` → 14 per page, `4 × 5` → 20 small tall cards. |
| `PAGE_MARGIN_MM`, `GAP_BETWEEN_CARDS_MM`, `CARD_PADDING_MM` | printing margins and cutting space |
| `START_EACH_CLASS_ON_NEW_PAGE` | `True` = a class never shares a page with another class |
| `SHOW_CLASS_HEADER`, `SHOW_PAGE_NUMBER` | the small header line on top of each page |
| `SHOW_CUT_LINES`, `SHOW_CROP_MARKS` | the card outline and corner marks for cutting |
| `NAME_CASE` | `"title"` → `Afra Eida`, `"upper"` → `AFRA EIDA`, `"as_is"` → exactly as in Excel |
| `SORT_STUDENTS_BY` | `"name"` (A–Z) or `"file"` (Excel order) |
| `CHARACTER_LAYOUT`, `CHARACTER_SIDE`, `CHARACTER_MAX_WIDTH_RATIO` | where the character goes and how big it is |
| `STUDENT_NAME_FONT_SIZE`, `EMAIL_FONT_SIZE`, `PASSWORD_FONT_SIZE` | **maximum** sizes — the program picks the largest size that actually fits your data and uses it on every card |
| `COLOR_*` | all colours, as normal hex values (`"#1F5FA8"`) |

### Changing the font

The fonts live in `fonts/` and are registered automatically — nothing needs to
be installed on the computer. To use a different one, drop the `.ttf` files in
`fonts/` and set `FONT_REGULAR` / `FONT_BOLD` in `config.py`.

Bundled (SIL Open Font License, see `fonts/OFL-*.txt`):

* **Noto Sans Arabic** — names and headings (Arabic **and** English)
* **Noto Sans Mono** — e-mails and passwords, so `0/O` and `1/l` can never be
  confused. Set `USE_MONO_FOR_CREDENTIALS = False` to turn this off.

### Changing the colours

```python
COLOR_ACCENT      = "#1F5FA8"   # class chip, password
COLOR_ACCENT_SOFT = "#EAF1F9"   # chip background
COLOR_CARD_BORDER = "#B9C6D6"   # cut line
COLOR_PANEL_BG    = "#F6F8FB"   # login panel
```

The design is deliberately ink-friendly: a white card, one soft accent, no
full-colour backgrounds.

---

## Class ordering (natural numeric sort)

Classes are sorted by **number**, not as text:

```
5-1, 5-2, 5-3, 5-10, 6-1, 6-2, 7-1, 8-1, 8-10
```

not the wrong `5-1, 5-10, 5-2`. The same order is used for the pages, the
per-class PDFs and the file names. Messy values are cleaned up automatically —
`٥ - ١`, `5/1` and `5 _ 1` all become `5-1`.

## Card size and text size

Nothing is hard-coded. When the program starts it measures your longest
e-mail and password and picks the largest font size that fits the card, then
uses that **same** size on every card so the sheet looks uniform.

A single unusually long e-mail does not shrink the whole document — the size
is taken from the 95th percentile, and that one card shrinks on its own.

Nothing ever leaves its card either: names wrap over two lines and shrink
until they fit, e-mails and passwords shrink, and on narrow cards an e-mail
breaks after the `@`. Truncation is the last resort and is almost never
reached.

Two card shapes are built in and chosen automatically:

* **wide** (the card is at least 1.25× wider than tall) — badge layout, the
  login panel spans the full width and the labels sit beside the values
* **tall** — the class pill on top, then the name, the character and the
  login panel with the labels above the values

## Arabic

Arabic names are fully supported — letters are joined correctly and the word
order is right-to-left (`arabic-reshaper` + `python-bidi`). E-mails, passwords
and class names always stay left-to-right.

---

## Privacy / الخصوصية

* Everything runs **locally**. No internet connection, no API, no cloud.
* Passwords are **never printed** to the console and never written to a log.
* `input/` and `output/` are excluded by `.gitignore`, so real student data
  and generated cards are never committed to the repository.

---

## Checking the design without real data

```bash
python make_sample.py
```

Creates `samples/sample_students.xlsx` with **fake** students and builds
`samples/Sample_Student_Tags.pdf`. It deliberately includes the awkward cases:
very long and very short names, a very long e-mail, missing e-mail, missing
password, missing name, classes `5-1 / 5-2 / 5-10` to prove the sorting, a
class of 18 (one page), a class of 45 (three pages), and messy class values.

---

## Common problems

| Message | Fix |
|---|---|
| `Python is not installed` | Install Python and tick “Add Python to PATH”. |
| `Missing libraries: …` | Run `pip install -r requirements.txt`. |
| `Excel file not found` | Put the file at `input/students.xlsx`, or pass `-i path/to/file.xlsx`. |
| `No students found in the file` | Check `EXCEL_FORMAT` in `config.py`; try `"combined"` or `"columns"` instead of `"auto"`. |
| `Sheet '…' not found` | Set `EXCEL_SHEET = None` in `config.py` to read every sheet. |
| `Font '…' not found` | Keep the `.ttf` files inside `fonts/`. The program falls back to Helvetica and still works. |
| Cards look cut off when printed | Print at 100 % scale, not “fit to page”; or raise `PAGE_MARGIN_MM`. |
| `The chosen grid does not fit on the page` | Lower `ROWS_PER_PAGE` / `COLUMNS_PER_PAGE` or the margins. |
| Permission denied writing the PDF | Close the PDF in the viewer and run again. |
