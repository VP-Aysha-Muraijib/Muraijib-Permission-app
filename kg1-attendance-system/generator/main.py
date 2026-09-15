# -*- coding: utf-8 -*-
import sys, time
from openpyxl import Workbook
from common import *
from settings_cal import build_settings, build_calendar
from registers import build_register
from master_db import build_master, build_classdaily, build_events, build_contact_log, build_absence_log, build_followup
from dashboard import build_calc, build_dashboard
from others import build_daily, build_profile, build_trends
from report_guide import build_report, build_guide
import testdata
import glob, re

def load_real(docx_dir):
    """Read the school's Word class lists (KG1-1 .. KG1-7) -> {class: [dict]}."""
    import docx
    out = {}
    for f in glob.glob(docx_dir + "/*KG1-*.docx"):
        n = int(re.search(r"KG1-(\d)", f).group(1)); cls = f"KG1-{n}"
        t = docx.Document(f).tables[0]
        hdr = [c.text.strip() for c in t.rows[0].cells]
        col = {h: i for i, h in enumerate(hdr)}
        studs = []
        for row in t.rows[1:]:
            cells = [c.text.strip() for c in row.cells]
            name = re.sub(r"\s+", " ", cells[col["اسم الطالب"]])
            if not name: continue
            sid = cells[col["رقم الطالب"]].strip()
            phones = [x.strip() for x in cells[col["الهاتف المتحرك للأبوين"]].split(",") if x.strip()]
            seen = []; [seen.append(x) for x in phones if x not in seen]
            parts = [w for w in name.split(" ") if w not in ("بن", "بنت")]
            guardian = " ".join(parts[1:]) if len(parts) > 1 else ""
            studs.append({"id": int(sid) if sid.isdigit() else sid, "name": name, "guardian": guardian,
                          "phone": seen[0] if seen else "", "extra": seen[1:], "gender": cells[col["النوع"]]})
        out[cls] = studs
    return out

def build(path, with_demo=True, real=None):
    t0 = time.time()
    wb = Workbook(); wb.remove(wb.active)
    build_settings(wb)
    build_calendar(wb)
    regs = [build_register(wb, cn, i) for i, cn in enumerate(CLASSES)]
    build_master(wb)
    build_classdaily(wb)
    build_events(wb)
    build_contact_log(wb)
    build_absence_log(wb)
    build_followup(wb)
    calc_rows = build_calc(wb)
    build_dashboard(wb, calc_rows)
    build_daily(wb)
    build_profile(wb)
    build_trends(wb)
    build_report(wb)
    build_guide(wb)
    # sheet order
    order = [SHEETS["dash"], SHEETS["daily"]] + CLASSES + [SHEETS["fu"], SHEETS["alog"], SHEETS["clog"], SHEETS["prof"], SHEETS["trend"], SHEETS["rpt"], SHEETS["stu"], SHEETS["cal"], SHEETS["set"], SHEETS["guide"], SHEETS["cd"], SHEETS["ev"], SHEETS["calc"]]
    wb._sheets = [wb[n] for n in order]
    wb.active = 0
    if with_demo:
        students = testdata.make_students()
        for ci, cn in enumerate(CLASSES[:ACTIVE_CLASSES]):
            ws = wb[cn]
            for i, s in enumerate(students[cn]):
                r = REG_FIRST + i
                ws[f"B{r}"] = s["id"]; ws[f"C{r}"] = s["name"]; ws[f"K{r}"] = s["guardian"]; ws[f"J{r}"] = s["phone"]; ws[f"Z{r}"] = s["phone"]
                if s.get("phone2"): ws[f"AA{r}"] = s["phone2"]
                for d, v in enumerate(s["grid"]):
                    ws.cell(r, DATE_COL0 + d, v or "حاضر")
            ws["K2"] = DATES[testdata.REC_DAYS - 1 - (1 if ci == 4 else 0)]
            ws[f"L{REG_FIRST+3}"] = "متابعة مستمرة مع الأسرة"
        logs = testdata.make_contacts(students)
        wl = wb[SHEETS["clog"]]
        for k, (d, sid, m, note) in enumerate(logs):
            r = LOG_FIRST + k
            wl[f"A{r}"] = d; wl[f"B{r}"] = sid; wl[f"F{r}"] = m; wl[f"G{r}"] = note
        wb[SHEETS["prof"]]["B4"] = students[CLASSES[0]][5]["name"]
    if real:
        for cn in CLASSES:
            ws = wb[cn]
            for i, s in enumerate(real.get(cn, [])):
                assert i < SLOTS, cn
                r = REG_FIRST + i
                ws[f"B{r}"] = s["id"]; ws[f"C{r}"] = s["name"]; ws[f"K{r}"] = s["guardian"]; ws[f"J{r}"] = s["phone"]
                for j, ph in enumerate(([s["phone"]] + s["extra"])[:4]):
                    ws[f"{['Z','AA','AB','AC'][j]}{r}"] = ph
                for d in range(NDAYS):
                    ws.cell(r, DATE_COL0 + d, "حاضر")
    # normalise data validations to Excel's canonical form (no leading "=", messages enabled)
    names = {n: dn.attr_text for n, dn in wb.defined_names.items()}
    for ws in wb.worksheets:
        for dv in ws.data_validations.dataValidation:
            for attr in ("formula1", "formula2"):
                v = getattr(dv, attr)
                if isinstance(v, str) and v.startswith("="):
                    v = v[1:]
                if isinstance(v, str) and v in names:      # resolve defined names to direct references
                    v = names[v]
                setattr(dv, attr, v)
            if dv.showErrorMessage is None or (dv.showErrorMessage is False and not getattr(dv, "_keep_soft", False)):
                dv.showErrorMessage = True
            dv.showInputMessage = True
            dv.showDropDown = False
    if not with_demo and not real:      # blank template: every attendance cell starts as "حاضر"
        for cn in CLASSES:
            ws = wb[cn]
            for r in range(REG_FIRST, REG_LAST + 1):
                for d in range(NDAYS):
                    ws.cell(r, DATE_COL0 + d, "حاضر")
    wb.calculation.fullCalcOnLoad = True
    wb.save(path)
    print("saved", path, "in", round(time.time() - t0, 1), "s")
    return students if with_demo else None

if __name__ == "__main__":
    # usage: main.py demo.xlsx blank.xlsx [real.xlsx docx_dir]
    build(sys.argv[1], with_demo=True)
    if len(sys.argv) > 2:
        build(sys.argv[2], with_demo=False)
    if len(sys.argv) > 4:
        real = load_real(sys.argv[4])
        print({k: len(v) for k, v in sorted(real.items())})
        build(sys.argv[3], with_demo=False, real=real)
