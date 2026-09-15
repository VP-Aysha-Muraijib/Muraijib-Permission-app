# -*- coding: utf-8 -*-
from common import *
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.worksheet.formula import ArrayFormula
from openpyxl.worksheet.table import Table, TableStyleInfo
from openpyxl.formatting.rule import FormulaRule

STU_HDR = ["م", "الرقم الطلابي", "اسم الطفل", "الصف", "الشعبة", "الحالة الدراسية", "تاريخ الالتحاق", "اسم ولي الأمر", "رقم التواصل",
           "أيام الدوام", "الحضور", "الغياب", "غياب بعذر", "تأخير", "نسبة الحضور", "نسبة الغياب", "مستوى التنبيه", "حالة المتابعة", "آخر تاريخ غياب",
           "بلوغ حد المتابعة", "بلوغ الغياب المتكرر", "بلوغ الغياب المرتفع", "بلوغ الحالة الحرجة", "تاريخ آخر تواصل", "طريقة آخر تواصل", "تم التواصل؟",
           "التواصل مع ولي الأمر", "الإجراء المطلوب", "فئة الحضور", "ملاحظات", "رقم مكرر؟",
           "مشمول في فلتر اللوحة", "حالة اليوم المحدد", "حضور الفترة", "أيام الفترة", "مستوى بلغه اليوم", "تسلسل تنبيه اليوم",
           "مفتاح المتابعة", "مفتاح الأعلى حضورًا", "مفتاح الدعم", "مفتاح الحرجة", "مشمول في التقرير", "مفتاح التقرير", "حضور فترة التقرير", "أيام فترة التقرير", "غياب فترة التقرير", "رقم الصف", "رقم الصف الداخلي", "حالة يوم التقرير", "تسلسل غائبي يوم التقرير"]
STU_NAMES = {"B": "Stu_ID", "C": "Stu_Name", "D": "Stu_Class", "E": "Stu_Section", "F": "Stu_StStatus", "G": "Stu_Join", "H": "Stu_Guardian", "I": "Stu_Phone",
             "J": "Stu_Days", "K": "Stu_Pres", "L": "Stu_Abs", "M": "Stu_Exc", "N": "Stu_Late", "O": "Stu_Rate", "P": "Stu_AbsRate", "Q": "Stu_Level", "R": "Stu_Status",
             "S": "Stu_LastAbs", "T": "Stu_D3", "U": "Stu_D5", "V": "Stu_D10", "W": "Stu_D15", "X": "Stu_LastContact", "Y": "Stu_Method", "Z": "Stu_Contacted",
             "AA": "Stu_ContactReq", "AB": "Stu_Action", "AC": "Stu_Cat", "AD": "Stu_Notes", "AE": "Stu_Dup", "AF": "Stu_InFilter", "AG": "Stu_Today",
             "AH": "Stu_PAtt", "AI": "Stu_PTot", "AJ": "Stu_LvlToday", "AK": "Stu_AlertSeq", "AL": "Stu_KeyFU", "AM": "Stu_KeyTop", "AN": "Stu_KeySup",
             "AO": "Stu_KeyCrit", "AP": "Stu_RptIn", "AQ": "Stu_KeyRpt", "AR": "Stu_RAtt", "AS": "Stu_RTot", "AT": "Stu_RAbs", "AU": "Stu_C", "AV": "Stu_I", "AW": "Stu_RToday", "AX": "Stu_RAbsSeq"}

def period_counts(S, rr, start, end):
    """Return (attended_formula_part, total_formula_part, absent_part) for register row rr within [start,end]."""
    RNG = f"{cq(S)}${DC0}{rr}:${DC1}{rr}"
    D = f"{cq(S)}${DC0}$5:${DC1}$5"; SCH = f"{cq(S)}${DC0}$6:${DC1}$6"; CONF = f"{cq(S)}${DC0}$7:${DC1}$7"
    crit = f'{CONF},"✓",{SCH},1,{D},">="&MAX({cq(S)}$U{rr},{start}),{D},"<="&{end}'
    P = f'COUNTIFS({RNG},"حاضر",{crit})+COUNTIFS({crit})-COUNTIFS({RNG},"<>",{crit})'
    A = f'COUNTIFS({RNG},"غياب بدون عذر",{crit})'; E = f'COUNTIFS({RNG},"غياب بعذر",{crit})'; Lt = f'COUNTIFS({RNG},"متأخر",{crit})'
    att = f'{P}+IF(LateAsPresent="نعم",{Lt},0)'
    tot = f'{P}+{A}+{E}+{Lt}'
    ab = f'{A}+{E}'
    return att, tot, ab

def build_master(wb):
    ws = wb.create_sheet(SHEETS["stu"])
    setup_sheet(ws, tab="9CA3AF")
    title_block(ws, "قاعدة بيانات الأطفال الموحدة", "تُجمَّع تلقائيًا من أوراق الصفوف (tblStudents) — الإدخال يتم في ورقة كل صف، وهذه الورقة للعرض والفلترة والتحليل فقط", "Master student table (auto)")
    widths = [4, 11, 22, 9, 7, 9, 11, 16, 13, 6, 6, 6, 6, 6, 8, 8, 7, 14, 11, 11, 11, 11, 11, 11, 12, 8, 16, 30, 12, 20, 8] + [9] * 19
    header_row(ws, 4, 1, STU_HDR, widths=widths, height=42)
    for c in range(32, 51):
        ws.cell(4, c).fill = fill(MUTED); ws.cell(4, c).font = font(8, True, WHITE)
    for ci, S in enumerate(CLASSES):
        for i in range(1, SLOTS + 1):
            r = STU_FIRST + ci * SLOTS + i - 1
            rr = REG_FIRST + i - 1
            M = lambda col: f'=IF({cq(S)}${col}{rr}="","",{cq(S)}${col}{rr})'
            f = {"A": f'=IF(B{r}="","",ROW()-{STU_FIRST-1})', "B": M("B"), "C": M("C"), "D": f'=IF(B{r}="","",{cq(S)}$B$2)',
                 "E": f'=IF(B{r}="","",MID(D{r},FIND("-",D{r}&"-")+1,10))', "F": f'=IF(B{r}="","","نشط")', "G": f'=IF(B{r}="","","")', "H": M("K"), "I": M("J"),
                 "J": M("M"), "K": M("N"), "L": M("D"), "M": M("E"), "N": M("F"), "O": M("G"), "P": M("O"), "Q": M("T"), "R": M("H"), "S": M("P"),
                 "T": M("V"), "U": M("W"), "V": M("X"), "W": M("Y"), "X": M("R"), "Y": M("S"), "Z": M("Q"), "AA": M("I"),
                 "AB": f'=IF(Q{r}="","",INDEX(LevelActions,MATCH(Q{r},LevelValues,0)))',
                 "AC": f'=IF(J{r}="","",IF(J{r}=0,"—",IF(AND(L{r}=0,M{r}=0),Cat_L1,IF(O{r}>=Cat_95,Cat_L2,IF(O{r}>=Cat_90,Cat_L3,Cat_L4)))))',
                 "AD": M("L"), "AE": f'=IF(B{r}="","",IF(COUNTIF($B${STU_FIRST}:$B${STU_LAST},B{r})>1,"مكرر!",""))',
                 "AF": f'=IF(AND(B{r}<>"",F{r}="نشط",OR(Dash_Class="الكل",D{r}=Dash_Class)),1,0)',
                 "AG": f'=IF(OR(AF{r}=0,Dash_DayIdx=0),"",IF(INDEX({cq(S)}${DC0}$7:${DC1}$7,Dash_DayIdx)<>"✓","",{CODE_OF(f"INDEX({cq(S)}${DC0}{rr}:${DC1}{rr},Dash_DayIdx)")}))',
                 "AJ": f'=IF(AF{r}=0,0,IF(W{r}=Dash_Date,Thr_Critical,IF(V{r}=Dash_Date,Thr_High,IF(U{r}=Dash_Date,Thr_Repeated,IF(T{r}=Dash_Date,Thr_FollowUp,0)))))',
                 "AK": f'=IF(AJ{r}>0,COUNTIF($AJ${STU_FIRST}:AJ{r},">0"),"")',
                 "AL": f'=IF(AND(B{r}<>"",F{r}="نشط",Q{r}<>"",Q{r}>0),L{r}*1000+(999-ROW()),"")',
                 "AM": f'=IF(AND(AF{r}=1,J{r}<>"",J{r}>0),ROUND(O{r}*10000,0)*1000000+K{r}*1000+(999-ROW()),"")',
                 "AN": f'=IF(AND(AF{r}=1,J{r}<>"",J{r}>0),(L{r}+M{r})*10000000+ROUND((1-O{r})*10000,0)*1000+(999-ROW()),"")',
                 "AO": f'=IF(AND(AF{r}=1,Q{r}<>"",Q{r}>=Thr_Critical),L{r}*1000+(999-ROW()),"")',
                 "AP": f'=IF(AND(B{r}<>"",F{r}="نشط",OR(Rpt_Class="الكل",D{r}=Rpt_Class)),1,0)',
                 "AQ": f'=IF(AND(AP{r}=1,Q{r}<>"",Q{r}>0),L{r}*1000+(999-ROW()),"")',
                 "AU": ci + 1, "AV": i,
                 "AW": f'=IF(OR(AP{r}=0,Rpt_DayIdx=0),"",IF(INDEX({cq(S)}${DC0}$7:${DC1}$7,Rpt_DayIdx)<>"✓","",{CODE_OF(f"INDEX({cq(S)}${DC0}{rr}:${DC1}{rr},Rpt_DayIdx)")}))',
                 "AX": f'=IF(AND(AP{r}=1,OR(AW{r}="A",AW{r}="E")),COUNTIFS($AP${STU_FIRST}:AP{r},1,$AW${STU_FIRST}:AW{r},"A")+COUNTIFS($AP${STU_FIRST}:AP{r},1,$AW${STU_FIRST}:AW{r},"E"),"")'}
            att, tot, ab = period_counts(S, rr, "Dash_PStart", "Dash_PEnd")
            f["AH"] = f'=IF(AF{r}=0,"",{att})'; f["AI"] = f'=IF(AF{r}=0,"",{tot})'
            att2, tot2, ab2 = period_counts(S, rr, "Rpt_PStart", "Rpt_PEnd")
            f["AR"] = f'=IF(AP{r}=0,"",{att2})'; f["AS"] = f'=IF(AP{r}=0,"",{tot2})'; f["AT"] = f'=IF(AP{r}=0,"",{ab2})'
            for col, fm in f.items():
                c = put(ws, f"{col}{r}", fm, f=font(9), al=ALIGN_C)
            for col in ["C", "H", "R", "AB", "AD"]:
                ws[f"{col}{r}"].alignment = ALIGN_R
            for col in ["G", "S", "T", "U", "V", "W", "X"]:
                ws[f"{col}{r}"].number_format = "dd/mm/yyyy"
            ws[f"O{r}"].number_format = "0.0%"; ws[f"P{r}"].number_format = "0.0%"
            for col in list(STU_NAMES)[31:]:
                ws[f"{col}{r}"].font = font(8, False, MUTED)
    for col, name in STU_NAMES.items():
        define(wb, name, f"{cq(ws.title)}${col}${STU_FIRST}:${col}${STU_LAST}")
    tab = Table(displayName="tblStudents", ref=f"A4:AX{STU_LAST}")
    tab.tableStyleInfo = TableStyleInfo(name="TableStyleLight1", showRowStripes=True)
    ws.add_table(tab)
    ws.freeze_panes = "D5"
    rg = f"A{STU_FIRST}:AD{STU_LAST}"
    ws.conditional_formatting.add(f"R{STU_FIRST}:R{STU_LAST}", FormulaRule(formula=[f'AND($Q{STU_FIRST}<>"",$Q{STU_FIRST}>=Thr_Critical)'], fill=fill(RED_F), font=Font(name=FONT, bold=True, color=RED_T)))
    ws.conditional_formatting.add(f"R{STU_FIRST}:R{STU_LAST}", FormulaRule(formula=[f'AND($Q{STU_FIRST}<>"",$Q{STU_FIRST}=Thr_High)'], fill=fill(DORG_F), font=Font(name=FONT, bold=True, color=DORG_T)))
    ws.conditional_formatting.add(f"R{STU_FIRST}:R{STU_LAST}", FormulaRule(formula=[f'AND($Q{STU_FIRST}<>"",$Q{STU_FIRST}=Thr_Repeated)'], fill=fill(ORG_F), font=Font(name=FONT, bold=True, color=ORG_T)))
    ws.conditional_formatting.add(f"R{STU_FIRST}:R{STU_LAST}", FormulaRule(formula=[f'AND($Q{STU_FIRST}<>"",$Q{STU_FIRST}=Thr_FollowUp)'], fill=fill(YEL_F), font=Font(name=FONT, bold=True, color=YEL_T)))
    ws.conditional_formatting.add(f"AE{STU_FIRST}:AE{STU_LAST}", FormulaRule(formula=[f'$AE{STU_FIRST}="مكرر!"'], fill=fill(RED_F), font=Font(name=FONT, bold=True, color=RED_T)))
    ws.conditional_formatting.add(f"AA{STU_FIRST}:AA{STU_LAST}", FormulaRule(formula=[f'ISNUMBER(SEARCH("مطلوب",$AA{STU_FIRST}))'], fill=fill(ORG_F), font=Font(name=FONT, bold=True, color=ORG_T)))
    protect(ws)
    return ws


def build_classdaily(wb):
    """Compact class x day summary (tblClassDaily): one row per class and school day, fed by the register summary rows."""
    ws = wb.create_sheet(SHEETS["cd"])
    setup_sheet(ws, grid=True)
    header_row(ws, 1, 1, ["الصف", "التاريخ", "المحصورون", "حاضر", "غياب بدون عذر", "غياب بعذر", "متأخر"], widths=[10, 12, 10, 8, 10, 10, 8], height=24)
    r = 2
    for cn in CLASSES:
        for di, d in enumerate(DATES):
            col = L(DATE_COL0 + di)
            ws.cell(r, 1, f"={cq(cn)}$B$2"); ws.cell(r, 2, d).number_format = "dd/mm/yyyy"
            for j, key in enumerate(["reg", "pres", "abs", "exc", "late"]):
                ws.cell(r, 3 + j, f"={cq(cn)}{col}{SUM_ROW[key]}")
            r += 1
    last = r - 1
    for col, name in {"A": "CD_Class", "B": "CD_Date", "C": "CD_Reg", "D": "CD_Pres", "E": "CD_Abs", "F": "CD_Exc", "G": "CD_Late"}.items():
        define(wb, name, f"{cq(ws.title)}${col}$2:${col}${last}")
    tab = Table(displayName="tblClassDaily", ref=f"A1:G{last}")
    tab.tableStyleInfo = TableStyleInfo(name="TableStyleLight1", showRowStripes=False)
    ws.add_table(tab)
    ws.sheet_state = "hidden"
    protect(ws)
    return ws


def build_events(wb):
    """Hidden raw list of absence events (unexcused + excused): up to EV_PER_STUDENT per child, per class block."""
    ws = wb.create_sheet(SHEETS["ev"])
    setup_sheet(ws, grid=True)
    header_row(ws, 1, 1, ["الرقم الطلابي", "اسم الطفل", "الصف", "التاريخ", "النوع", "الغياب التراكمي", "تسلسل"], widths=[12, 22, 9, 12, 12, 8, 8], height=24)
    r = 2
    for cn in CLASSES:
        P = cq(cn)
        for i in range(1, SLOTS + 1):
            rr = REG_FIRST + i - 1
            row = f"{P}${DC0}{rr}:${DC1}{rr}"; conf = f"{P}${DC0}$7:${DC1}$7"; dts = f"{P}${DC0}$5:${DC1}$5"
            for n in range(1, EV_PER_STUDENT + 1):
                ws.cell(r, 1, f'=IF({P}$B{rr}="","",{P}$B{rr})')
                ws.cell(r, 2, f'=IF(A{r}="","",{P}$C{rr})')
                ws.cell(r, 3, f'=IF(A{r}="","",{P}$B$2)')
                ws.cell(r, 4).value = ArrayFormula(f"D{r}", f'=IF(A{r}="","",IFERROR(SMALL(IF((({row}="غياب بدون عذر")+({row}="غياب بعذر"))*({conf}="✓"),{dts}),{n}),""))')
                ws.cell(r, 4).number_format = "dd/mm/yyyy"
                ws.cell(r, 5, f'=IF(D{r}="","",INDEX({row},MATCH(D{r},{dts},0)))')
                ws.cell(r, 6, f'=IF(D{r}="","",COUNTIFS({row},"غياب بدون عذر",{conf},"✓",{dts},"<="&D{r}))')
                ws.cell(r, 7, f'=IF(D{r}="",0,1)' if r == 2 else f'=G{r-1}+IF(D{r}="",0,1)')
                r += 1
    last = r - 1
    for col, name in {"A": "EV_ID", "B": "EV_Name", "C": "EV_Class", "D": "EV_Date", "E": "EV_Type", "F": "EV_Cum", "G": "EV_Seq"}.items():
        define(wb, name, f"{cq(ws.title)}${col}$2:${col}${last}")
    ws.sheet_state = "hidden"
    protect(ws)
    return last


def build_contact_log(wb):
    ws = wb.create_sheet(SHEETS["clog"])
    setup_sheet(ws, tab="D97706")
    title_block(ws, "سجل التواصل مع أولياء الأمور", "سجّلي هنا كل تواصل مع ولي الأمر: التاريخ + الرقم الطلابي + الطريقة + النتيجة. يُحدَّث عمود «تم التواصل؟» في جميع الأوراق تلقائيًا", "Parent contact log (input)")
    hdr = ["التاريخ", "الرقم الطلابي", "اسم الطفل", "الصف", "عدد الغيابات عند التواصل", "طريقة التواصل", "نتيجة التواصل / ملاحظات", "المستوى عند التواصل", "مفتاح", "تسلسل الطفل المحدد"]
    header_row(ws, 5, 1, hdr, widths=[12, 12, 22, 9, 11, 14, 40, 14, 3, 3], height=36)
    for r in range(LOG_FIRST, LOG_LAST + 1):
        input_cell(ws, f"A{r}", None, nf="dd/mm/yyyy"); input_cell(ws, f"B{r}", None); input_cell(ws, f"F{r}", None); input_cell(ws, f"G{r}", None, al=ALIGN_R)
        put(ws, f"C{r}", f'=IF(B{r}="","",IFERROR(INDEX(Stu_Name,MATCH(B{r},Stu_ID,0)),"رقم غير موجود"))', f=font(10), al=ALIGN_R, b=box())
        put(ws, f"D{r}", f'=IF(B{r}="","",IFERROR(INDEX(Stu_Class,MATCH(B{r},Stu_ID,0)),""))', f=font(10), al=ALIGN_C, b=box())
        mr = f"MATCH(B{r},Stu_ID,0)"
        put(ws, f"E{r}", f'=IF(OR(B{r}="",A{r}=""),"",IFERROR(COUNTIFS(INDEX({GRID(f"INDEX(Stu_C,{mr})")},INDEX(Stu_I,{mr}),0),"غياب بدون عذر",{CONFROW(f"INDEX(Stu_C,{mr})")},"✓",{DATES_ROW},"<="&A{r}),""))', f=font(10), al=ALIGN_C, b=box())
        put(ws, f"H{r}", f'=IF(E{r}="","",INDEX(LevelLabels,MATCH(E{r},LevelValues,1)))', f=font(10), al=ALIGN_C, b=box())
        put(ws, f"I{r}", f'=IF(OR(B{r}="",A{r}=""),"",B{r}&"|"&A{r})', f=font(8, False, MUTED), al=ALIGN_C)
        put(ws, f"J{r}", f'=IF(AND(B{r}<>"",B{r}=Prof_ID),COUNTIF($B${LOG_FIRST}:B{r},Prof_ID),"")', f=font(8, False, MUTED), al=ALIGN_C)
    for col, name in {"A": "Log_Date", "B": "Log_ID", "C": "Log_Name", "E": "Log_Count", "F": "Log_Method", "G": "Log_Notes", "H": "Log_Level", "I": "Log_Key", "J": "Log_Seq"}.items():
        define(wb, name, f"{cq(ws.title)}${col}${LOG_FIRST}:${col}${LOG_LAST}")
    dv = DataValidation(type="date", operator="between", formula1="YearStart", formula2="DATE(2040,12,31)", allow_blank=True, error="أدخلي تاريخًا صحيحًا", errorTitle="تاريخ غير صحيح"); ws.add_data_validation(dv); dv.add(f"A{LOG_FIRST}:A{LOG_LAST}")
    dv2 = DataValidation(type="custom", formula1=f"COUNTIF(Stu_ID,B{LOG_FIRST})>0", allow_blank=True, error="الرقم الطلابي غير موجود في أوراق الصفوف", errorTitle="رقم غير معروف", prompt="اكتبي الرقم الطلابي كما هو في ورقة الصف", promptTitle="الرقم الطلابي"); ws.add_data_validation(dv2); dv2.add(f"B{LOG_FIRST}:B{LOG_LAST}")
    dv3 = DataValidation(type="list", formula1="=ContactMethods", allow_blank=True, error="اختاري طريقة من القائمة", errorTitle="قيمة غير صحيحة"); ws.add_data_validation(dv3); dv3.add(f"F{LOG_FIRST}:F{LOG_LAST}")
    tab = Table(displayName="tblContactLog", ref=f"A5:J{LOG_LAST}")
    tab.tableStyleInfo = TableStyleInfo(name="TableStyleLight1", showRowStripes=True)
    ws.add_table(tab)
    ws.conditional_formatting.add(f"C{LOG_FIRST}:C{LOG_LAST}", FormulaRule(formula=[f'$C{LOG_FIRST}="رقم غير موجود"'], fill=fill(RED_F), font=Font(name=FONT, bold=True, color=RED_T)))
    ws.conditional_formatting.add(f"A{LOG_FIRST}:H{LOG_LAST}", FormulaRule(formula=[f'AND($B{LOG_FIRST}<>"",OR($A{LOG_FIRST}="",$F{LOG_FIRST}=""))'], fill=fill(YEL_F)))
    ws.freeze_panes = "A6"
    protect(ws)
    return ws


def build_absence_log(wb):
    ws = wb.create_sheet(SHEETS["alog"])
    setup_sheet(ws, tab="9CA3AF")
    title_block(ws, "سجل الغياب", f"يُجمَّع تلقائيًا من أوراق الصفوف: كل حالة غياب (بدون عذر أو بعذر) في سطر مستقل مرتبة حسب الصف ثم الطفل ثم التاريخ (حتى {EV_PER_STUDENT} حالة لكل طفل) — استخدمي أسهم الفلترة في رأس الجدول", "Absence log (auto)")
    put(ws, "A3", "إجمالي حالات الغياب المسجَّلة:", f=font(10, True, NAVY), al=ALIGN_R)
    put(ws, "B3", f"=INDEX(EV_Seq,{NCLS*SLOTS*EV_PER_STUDENT})", f=font(11, True, TEAL), al=ALIGN_C)
    put(ws, "C3", f'=IF(B3>{ALOG_LAST-ALOG_FIRST+1},"⚠ تجاوز عدد الحالات سعة هذا السجل ("&{ALOG_LAST-ALOG_FIRST+1}&") – تُعرض أول "&{ALOG_LAST-ALOG_FIRST+1}&" حالة","")', f=font(9, True, RED_T), al=ALIGN_R)
    hdr = ["التاريخ", "اسم الطفل", "الرقم الطلابي", "الصف", "نوع الغياب", "إجمالي الغياب حتى هذا التاريخ", "مستوى التنبيه", "حالة التواصل (الحالية)", "الملاحظات", "مرجع"]
    header_row(ws, 5, 1, hdr, widths=[12, 22, 12, 9, 10, 12, 16, 18, 24, 3], height=36)
    for r in range(ALOG_FIRST, ALOG_LAST + 1):
        k = r - ALOG_FIRST + 1
        put(ws, f"J{r}", f'=IF({k}>$B$3,"",IFERROR(MATCH({k}-1,EV_Seq,1)+1,1))', f=font(8, False, MUTED), al=ALIGN_C)
        G = lambda expr: f'=IF($J{r}="","",{expr})'
        put(ws, f"A{r}", G(f"INDEX(EV_Date,$J{r})"), f=font(10), al=ALIGN_C, nf="dd/mm/yyyy")
        put(ws, f"B{r}", G(f"INDEX(EV_Name,$J{r})"), f=font(10, True), al=ALIGN_R)
        put(ws, f"C{r}", G(f"INDEX(EV_ID,$J{r})"), f=font(10), al=ALIGN_C)
        put(ws, f"D{r}", G(f"INDEX(EV_Class,$J{r})"), f=font(10), al=ALIGN_C)
        put(ws, f"E{r}", G(f"INDEX(EV_Type,$J{r})"), f=font(10), al=ALIGN_C)
        put(ws, f"F{r}", G(f"INDEX(EV_Cum,$J{r})"), f=font(10), al=ALIGN_C)
        put(ws, f"G{r}", G(f"INDEX(LevelLabels,MATCH(F{r},LevelValues,1))"), f=font(10), al=ALIGN_C)
        put(ws, f"H{r}", G(f'IFERROR(INDEX(Stu_ContactReq,MATCH(C{r},Stu_ID,0)),"")'), f=font(10), al=ALIGN_C)
        put(ws, f"I{r}", G(f'IFERROR(INDEX(Stu_Notes,MATCH(C{r},Stu_ID,0)),"")'), f=font(10), al=ALIGN_R)
    tab = Table(displayName="tblAbsenceLog", ref=f"A5:J{ALOG_LAST}")
    tab.tableStyleInfo = TableStyleInfo(name="TableStyleLight1", showRowStripes=True)
    ws.add_table(tab)
    rg = f"G{ALOG_FIRST}:G{ALOG_LAST}"
    ws.conditional_formatting.add(rg, FormulaRule(formula=[f'AND($F{ALOG_FIRST}<>"",$F{ALOG_FIRST}>=Thr_Critical)'], fill=fill(RED_F), font=Font(name=FONT, bold=True, color=RED_T)))
    ws.conditional_formatting.add(rg, FormulaRule(formula=[f'AND($F{ALOG_FIRST}<>"",$F{ALOG_FIRST}>=Thr_High)'], fill=fill(DORG_F), font=Font(name=FONT, bold=True, color=DORG_T)))
    ws.conditional_formatting.add(rg, FormulaRule(formula=[f'AND($F{ALOG_FIRST}<>"",$F{ALOG_FIRST}>=Thr_Repeated)'], fill=fill(ORG_F), font=Font(name=FONT, bold=True, color=ORG_T)))
    ws.conditional_formatting.add(rg, FormulaRule(formula=[f'AND($F{ALOG_FIRST}<>"",$F{ALOG_FIRST}>=Thr_FollowUp)'], fill=fill(YEL_F), font=Font(name=FONT, bold=True, color=YEL_T)))
    ws.conditional_formatting.add(f"E{ALOG_FIRST}:E{ALOG_LAST}", FormulaRule(formula=[f'$E{ALOG_FIRST}="غياب بدون عذر"'], font=Font(name=FONT, bold=True, color=ABS_T)))
    ws.conditional_formatting.add(f"E{ALOG_FIRST}:E{ALOG_LAST}", FormulaRule(formula=[f'$E{ALOG_FIRST}="غياب بعذر"'], font=Font(name=FONT, color=EXC_T)))
    ws.conditional_formatting.add(f"H{ALOG_FIRST}:H{ALOG_LAST}", FormulaRule(formula=[f'ISNUMBER(SEARCH("مطلوب",$H{ALOG_FIRST}))'], fill=fill(ORG_F), font=Font(name=FONT, bold=True, color=ORG_T)))
    ws.freeze_panes = "A6"
    protect(ws)
    return ws


def build_followup(wb):
    ws = wb.create_sheet(SHEETS["fu"])
    setup_sheet(ws, tab="D97706")
    title_block(ws, "قائمة المتابعة", "الأطفال الذين بلغ غيابهم حد المتابعة أو أكثر — مرتبون تلقائيًا حسب الأولوية (الأعلى غيابًا أولًا). جميع الصفوف.", "Follow-Up List (auto)")
    put(ws, "A3", "عدد الحالات:", f=font(10, True, NAVY), al=ALIGN_R)
    put(ws, "B3", "=COUNT(Stu_KeyFU)", f=font(11, True, TEAL), al=ALIGN_C)
    put(ws, "C3", "تحتاج تواصلًا:", f=font(10, True, NAVY), al=ALIGN_R)
    put(ws, "D3", '=COUNTIFS(Stu_KeyFU,">0",Stu_Contacted,"لا")', f=font(11, True, ORG_T), al=ALIGN_C)
    hdr = ["الأولوية", "اسم الطفل", "الصف", "إجمالي الغياب", "نسبة الحضور", "المستوى", "رقم ولي الأمر", "اسم ولي الأمر", "تم التواصل؟", "تاريخ آخر تواصل", "الإجراء المطلوب", "مرجع"]
    header_row(ws, 5, 1, hdr, widths=[8, 22, 9, 9, 9, 15, 13, 16, 10, 12, 40, 3], height=36)
    FU_LAST = 5 + 60
    for r in range(6, FU_LAST + 1):
        k = r - 5
        put(ws, f"L{r}", f'=IFERROR(MATCH(LARGE(Stu_KeyFU,{k}),Stu_KeyFU,0),"")', f=font(8, False, MUTED), al=ALIGN_C)
        G = lambda expr: f'=IF($L{r}="","",{expr})'
        put(ws, f"A{r}", G(str(k)), f=font(10, True, NAVY), al=ALIGN_C, b=box())
        put(ws, f"B{r}", G(f"INDEX(Stu_Name,$L{r})"), f=font(10, True), al=ALIGN_R, b=box())
        put(ws, f"C{r}", G(f"INDEX(Stu_Class,$L{r})"), f=font(10), al=ALIGN_C, b=box())
        put(ws, f"D{r}", G(f"INDEX(Stu_Abs,$L{r})"), f=font(10, True), al=ALIGN_C, b=box())
        put(ws, f"E{r}", G(f"INDEX(Stu_Rate,$L{r})"), f=font(10), al=ALIGN_C, b=box(), nf="0.0%")
        put(ws, f"F{r}", G(f"INDEX(Stu_Status,$L{r})"), f=font(10, True), al=ALIGN_C, b=box())
        put(ws, f"G{r}", G(f"INDEX(Stu_Phone,$L{r})"), f=font(10), al=ALIGN_C, b=box())
        put(ws, f"H{r}", G(f"INDEX(Stu_Guardian,$L{r})"), f=font(10), al=ALIGN_R, b=box())
        put(ws, f"I{r}", G(f"INDEX(Stu_Contacted,$L{r})"), f=font(10, True), al=ALIGN_C, b=box())
        put(ws, f"J{r}", G(f"INDEX(Stu_LastContact,$L{r})"), f=font(10), al=ALIGN_C, b=box(), nf="dd/mm/yyyy")
        put(ws, f"K{r}", G(f"INDEX(Stu_Action,$L{r})"), f=font(10), al=ALIGN_R, b=box())
        put(ws, f"M{r}", G(f"INDEX(Stu_Level,$L{r})"), f=font(8, False, MUTED), al=ALIGN_C)
    put(ws, "M5", "مستوى", f=font(8, True, WHITE), bg=MUTED, al=ALIGN_C)
    tab = Table(displayName="tblFollowUp", ref=f"A5:M{FU_LAST}")
    tab.tableStyleInfo = TableStyleInfo(name="TableStyleLight1", showRowStripes=False)
    ws.add_table(tab)
    rg = f"A6:K{FU_LAST}"
    ws.conditional_formatting.add(rg, FormulaRule(formula=['AND($M6<>"",$M6>=Thr_Critical)'], fill=fill(RED_F), font=Font(name=FONT, bold=True, color=RED_T), stopIfTrue=True))
    ws.conditional_formatting.add(f"F6:F{FU_LAST}", FormulaRule(formula=['AND($M6<>"",$M6=Thr_High)'], fill=fill(DORG_F), font=Font(name=FONT, bold=True, color=DORG_T)))
    ws.conditional_formatting.add(f"F6:F{FU_LAST}", FormulaRule(formula=['AND($M6<>"",$M6=Thr_Repeated)'], fill=fill(ORG_F), font=Font(name=FONT, bold=True, color=ORG_T)))
    ws.conditional_formatting.add(f"F6:F{FU_LAST}", FormulaRule(formula=['AND($M6<>"",$M6=Thr_FollowUp)'], fill=fill(YEL_F), font=Font(name=FONT, bold=True, color=YEL_T)))
    ws.conditional_formatting.add(f"I6:I{FU_LAST}", FormulaRule(formula=['$I6="لا"'], fill=fill(ORG_F), font=Font(name=FONT, bold=True, color=ORG_T)))
    ws.conditional_formatting.add(f"I6:I{FU_LAST}", FormulaRule(formula=['$I6="نعم"'], fill=fill(GREEN_F), font=Font(name=FONT, bold=True, color=GREEN_T)))
    ws.freeze_panes = "A6"
    protect(ws)
    return ws
