# -*- coding: utf-8 -*-
from common import *
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.worksheet.formula import ArrayFormula
from openpyxl.formatting.rule import FormulaRule, CellIsRule

REG_HDR = ["م", "الرقم الطلابي", "اسم الطفل", "الحضور", "الغياب", "نسبة الحضور", "حالة المتابعة", "التواصل مع ولي الأمر",
           "الحالة الدراسية", "تاريخ الالتحاق", "اسم ولي الأمر", "رقم التواصل", "ملاحظات", "أيام الدوام", "غياب بعذر", "تأخير",
           "نسبة الغياب", "آخر تاريخ غياب", "تم التواصل؟", "تاريخ آخر تواصل", "طريقة آخر تواصل", "مستوى التنبيه", "بدء الاحتساب",
           "تاريخ بلوغ حد المتابعة", "تاريخ بلوغ الغياب المتكرر", "تاريخ بلوغ الغياب المرتفع", "تاريخ بلوغ الحالة الحرجة"]
REG_W = [4, 12, 30, 7, 7, 8, 15, 15, 9, 11, 22, 14, 22, 6, 6, 6, 7, 11, 8, 11, 12, 7, 11, 11, 11, 11, 11]
INPUT_COLS = {"B", "C", "I", "J", "K", "L", "M"}

def build_register(wb, cname, idx):
    ws = wb.create_sheet(cname)
    setup_sheet(ws, grid=False, zoom=100, tab=TEAL if idx < ACTIVE_CLASSES else "9CA3AF")
    S = cname
    RNG = lambda r: f"${DC0}{r}:${DC1}{r}"
    DATES_R = f"${DC0}$5:${DC1}$5"; SCH = f"${DC0}$6:${DC1}$6"; CONF = f"${DC0}$7:${DC1}$7"
    put(ws, "A1", "سجل الحضور اليومي للصف", f=font(16, True, NAVY), al=ALIGN_R)
    put(ws, "A2", "الصف:", f=font(10, True), al=ALIGN_R)
    input_cell(ws, "B2", cname)
    put(ws, "D2", "الأطفال النشطون:", f=font(10, True), al=ALIGN_R)
    put(ws, "E2", f'=COUNTIFS($I${REG_FIRST}:$I${REG_LAST},"نشط",$B${REG_FIRST}:$B${REG_LAST},"<>")', f=font(11, True, TEAL), al=ALIGN_C)
    put(ws, "F2", "الأيام المسجَّلة:", f=font(10, True), al=ALIGN_R)
    put(ws, "G2", f'=COUNTIF({CONF},"✓")', f=font(11, True, TEAL), al=ALIGN_C)
    put(ws, "H2", "نسبة حضور الصف:", f=font(10, True), al=ALIGN_R)
    put(ws, "I2", f'=IF(SUM(${DC0}${SUM_ROW["reg"]}:${DC1}${SUM_ROW["reg"]})=0,"",(SUM(${DC0}${SUM_ROW["pres"]}:${DC1}${SUM_ROW["pres"]})+IF(LateAsPresent="نعم",SUM(${DC0}${SUM_ROW["late"]}:${DC1}${SUM_ROW["late"]}),0))/SUM(${DC0}${SUM_ROW["reg"]}:${DC1}${SUM_ROW["reg"]}))', f=font(11, True, TEAL), al=ALIGN_C, nf="0.0%")
    put(ws, "K2", f'=HYPERLINK("#{q(S)}!"&ADDRESS({REG_FIRST},{DATE_COL0-1}+IFERROR(MATCH(TODAY(),{DATES_R},1),1)),"⬅ الانتقال إلى عمود اليوم")', f=font(10, True, "1D4ED8"), al=ALIGN_R)
    put(ws, "A3", "الإدخال: اكتبي حالة كل طفل في عمود التاريخ (حاضر / غائب / بعذر / متأخر). الأسرع: سجّلي الغائبين والمتأخرين فقط ثم ضعي ✓ في صف «تأكيد تسجيل اليوم» ليُعتبر الباقون حاضرين.", f=font(9, False, MUTED, True), al=ALIGN_R)
    put(ws, "K3", f'=HYPERLINK("#{q(S)}!"&ADDRESS({REG_FIRST},{DATE_COL0-1}+IFERROR(MATCH(_xlfn.MAXIFS({DATES_R},{CONF},"✓"),{DATES_R},0),1)),"⬅ الانتقال إلى آخر يوم مسجَّل")', f=font(10, True, "1D4ED8"), al=ALIGN_R)
    # date meta rows labels
    lab_col = L(DATE_COL0 - 1)
    for r, t in [(4, "الشهر"), (5, "التاريخ"), (6, "يوم دراسي"), (7, "تأكيد تسجيل اليوم ✓")]:
        put(ws, f"{lab_col}{r}", t, f=font(9, True, NAVY), al=ALIGN_R)
    header_row(ws, 8, 1, REG_HDR, widths=REG_W, height=42)
    # date columns
    for i, d in enumerate(DATES):
        c = DATE_COL0 + i; col = L(c)
        ws.column_dimensions[col].width = 7.2
        put(ws, (4, c), AR_MONTHS[d.month - 1] if (i == 0 or DATES[i-1].month != d.month) else "", f=font(8, True, NAVY), al=Alignment(horizontal="right"))
        put(ws, (5, c), d, nf="dd/mm", f=font(9, True), al=ALIGN_C, b=box())
        put(ws, (6, c), f"={cq(SHEETS['cal'])}$H${CAL_FIRST + i}", nf='"";"";"عطلة"', f=font(8, False, MUTED), al=ALIGN_C)
        input_cell(ws, (7, c), None)
        put(ws, (8, c), AR_DAYS[d.weekday()], f=font(8, True, WHITE), bg=NAVY, al=ALIGN_C, b=box(NAVY))
    ws.row_dimensions[4].height = 14; ws.row_dimensions[5].height = 18; ws.row_dimensions[6].height = 14; ws.row_dimensions[7].height = 20
    # student rows
    for r in range(REG_FIRST, REG_LAST + 1):
        G0 = lambda expr: f'=IF(OR($B{r}="",$I{r}<>"نشط"),"",{expr})'
        crit = f'{SCH},1,{DATES_R},">="&$W{r}'
        f = {}
        f["A"] = f'=IF($B{r}="","",ROW()-{REG_FIRST-1})'
        f["W"] = f'=IF($B{r}="","",IF($J{r}="",YearStart,$J{r}))'
        f["E"] = G0(f'COUNTIFS({RNG(r)},"غائب",{crit})')
        f["O"] = G0(f'COUNTIFS({RNG(r)},"بعذر",{crit})')
        f["P"] = G0(f'COUNTIFS({RNG(r)},"متأخر",{crit})')
        f["D"] = G0(f'COUNTIFS({RNG(r)},"حاضر",{crit})+COUNTIFS({CONF},"✓",{crit})-COUNTIFS({RNG(r)},"<>",{CONF},"✓",{crit})')
        f["N"] = G0(f'$D{r}+$E{r}+$O{r}+$P{r}')
        f["F"] = f'=IF($N{r}="","",IF($N{r}=0,"",($D{r}+IF(LateAsPresent="نعم",$P{r},0))/$N{r}))'
        f["Q"] = f'=IF($N{r}="","",IF($N{r}=0,"",($E{r}+$O{r})/$N{r}))'
        f["V"] = f'=IF($E{r}="","",IF($E{r}>=Thr_Critical,Thr_Critical,IF($E{r}>=Thr_High,Thr_High,IF($E{r}>=Thr_Repeated,Thr_Repeated,IF($E{r}>=Thr_FollowUp,Thr_FollowUp,0)))))'
        f["G"] = f'=IF($B{r}="","",IF($I{r}<>"نشط","غير نشط",INDEX(LevelLabels,MATCH($V{r},LevelValues,0))))'
        f["R"] = f'=IF($E{r}="","",IF($E{r}=0,"",_xlfn.MAXIFS({DATES_R},{RNG(r)},"غائب",{crit})))'
        f["T"] = f'=IF($B{r}="","",IF(_xlfn.MAXIFS(Log_Date,Log_ID,$B{r})=0,"",_xlfn.MAXIFS(Log_Date,Log_ID,$B{r})))'
        f["U"] = f'=IF($T{r}="","",IFERROR(INDEX(Log_Method,MATCH($B{r}&"|"&$T{r},Log_Key,0)),""))'
        f["S"] = f'=IF($V{r}="","",IF($V{r}=0,"—",IF(AND($T{r}<>"",$T{r}>=IF($V{r}=Thr_Critical,$AA{r},IF($V{r}=Thr_High,$Z{r},IF($V{r}=Thr_Repeated,$Y{r},$X{r})))),"نعم","لا")))'
        f["H"] = f'=IF($V{r}="","",IF($V{r}=0,"—",IF($S{r}="نعم","✓ تم التواصل","⚠ التواصل مطلوب")))'
        for col, fm in f.items():
            c = put(ws, f"{col}{r}", fm, f=font(10), al=ALIGN_C, b=box())
        for col, thr in zip(["X", "Y", "Z", "AA"], ["Thr_FollowUp", "Thr_Repeated", "Thr_High", "Thr_Critical"]):
            ws[f"{col}{r}"] = ArrayFormula(f"{col}{r}", f'=IF($E{r}="","",IFERROR(SMALL(IF(({RNG(r)}="غائب")*({SCH}=1)*({DATES_R}>=$W{r}),{DATES_R}),{thr}),""))')
            style(ws[f"{col}{r}"], f=font(10), al=ALIGN_C, b=box(), nf="dd/mm/yyyy")
        for col in ["R", "T", "W", "J"]:
            ws[f"{col}{r}"].number_format = "dd/mm/yyyy"
        ws[f"F{r}"].number_format = "0.0%"; ws[f"Q{r}"].number_format = "0.0%"
        ws[f"C{r}"].alignment = ALIGN_R; ws[f"K{r}"].alignment = ALIGN_R; ws[f"M{r}"].alignment = ALIGN_R
        for col in INPUT_COLS:
            c = ws[f"{col}{r}"]
            c.protection = UNLOCKED; c.fill = fill(INPUT_FILL); c.border = box(INPUT_BORDER); c.font = font(10, False, TXT)
        ws[f"C{r}"].font = font(10, True, TXT)
        for i in range(NDAYS):
            c = ws.cell(r, DATE_COL0 + i)
            c.protection = UNLOCKED; c.font = font(9); c.alignment = ALIGN_C; c.border = box("EEF0F3")
        ws.row_dimensions[r].height = 20
    # summary rows
    labels = {"abs": "غائب", "exc": "بعذر", "late": "متأخر", "pres": "حاضر", "reg": "المسجَّلون", "rate": "نسبة الحضور"}
    put(ws, f"A{SUM_ROW['abs']-1}", "ملخص اليوم (تلقائي)", f=font(10, True, NAVY), al=ALIGN_R)
    for key, r in SUM_ROW.items():
        put(ws, f"C{r}", labels[key], f=font(10, True, NAVY), al=ALIGN_R, bg=LIGHT)
        put(ws, f"{lab_col}{r}", labels[key], f=font(9, True, NAVY), al=ALIGN_R)
        for i in range(NDAYS):
            c = DATE_COL0 + i; col = L(c)
            base = f'$I${REG_FIRST}:$I${REG_LAST},"نشط",$W${REG_FIRST}:$W${REG_LAST},"<="&{col}$5'
            stu = f'{col}${REG_FIRST}:{col}${REG_LAST}'
            if key == "abs": fm = f'=IF({col}$6=1,COUNTIFS({stu},"غائب",{base}),0)'
            elif key == "exc": fm = f'=IF({col}$6=1,COUNTIFS({stu},"بعذر",{base}),0)'
            elif key == "late": fm = f'=IF({col}$6=1,COUNTIFS({stu},"متأخر",{base}),0)'
            elif key == "pres": fm = f'=IF({col}$6=1,COUNTIFS({stu},"حاضر",{base})+IF({col}$7="✓",COUNTIFS($B${REG_FIRST}:$B${REG_LAST},"<>",{base})-COUNTIFS({stu},"<>",{base}),0),0)'
            elif key == "reg": fm = f'={col}{SUM_ROW["abs"]}+{col}{SUM_ROW["exc"]}+{col}{SUM_ROW["late"]}+{col}{SUM_ROW["pres"]}'
            else: fm = f'=IF({col}{SUM_ROW["reg"]}=0,"",({col}{SUM_ROW["pres"]}+IF(LateAsPresent="نعم",{col}{SUM_ROW["late"]},0))/{col}{SUM_ROW["reg"]})'
            put(ws, (r, c), fm, f=font(9, True if key in ("reg", "rate") else False, NAVY if key in ("reg", "rate") else TXT), al=ALIGN_C, bg=LIGHT, nf="0%" if key == "rate" else "0")
    # validations
    dv = DataValidation(type="list", formula1="=StatusLabels", allow_blank=True, error="اختاري: حاضر / غائب / بعذر / متأخر", errorTitle="حالة غير صحيحة", prompt="حاضر / غائب / بعذر / متأخر", promptTitle="حالة الحضور")
    ws.add_data_validation(dv); dv.add(f"{DC0}{REG_FIRST}:{DC1}{REG_LAST}")
    dv2 = DataValidation(type="list", formula1="=ConfirmList", allow_blank=True, error="ضعي ✓ فقط", errorTitle="قيمة غير صحيحة", prompt="ضعي ✓ عند اكتمال تسجيل هذا اليوم؛ عندها تُعتبر الخلايا الفارغة حضورًا", promptTitle="تأكيد تسجيل اليوم")
    ws.add_data_validation(dv2); dv2.add(f"{DC0}7:{DC1}7")
    dv3 = DataValidation(type="list", formula1="=StudentStatusList", allow_blank=True, error="اختاري: نشط / منقول / منسحب", errorTitle="قيمة غير صحيحة")
    ws.add_data_validation(dv3); dv3.add(f"I{REG_FIRST}:I{REG_LAST}")
    dv4 = DataValidation(type="custom", formula1=f"COUNTIF(Stu_ID,B{REG_FIRST})<=1", allow_blank=True, error="هذا الرقم الطلابي مسجَّل مسبقًا لطفل آخر", errorTitle="رقم طلابي مكرر", prompt="رقم فريد لكل طفل (يُكتب مرة واحدة)", promptTitle="الرقم الطلابي")
    ws.add_data_validation(dv4); dv4.add(f"B{REG_FIRST}:B{REG_LAST}")
    dv5 = DataValidation(type="date", operator="between", formula1="YearStart", formula2="YearEnd", allow_blank=True, error="أدخلي تاريخًا ضمن العام الدراسي", errorTitle="تاريخ غير صحيح", prompt="اتركيه فارغًا إذا التحق الطفل من بداية العام", promptTitle="تاريخ الالتحاق")
    ws.add_data_validation(dv5); dv5.add(f"J{REG_FIRST}:J{REG_LAST}")
    dv6 = DataValidation(type="list", formula1="=ClassList", allow_blank=False, error="اختاري صفًا من قائمة الإعدادات", errorTitle="صف غير معروف")
    ws.add_data_validation(dv6); dv6.add(ws["B2"])
    # conditional formatting
    grid = f"{DC0}{REG_FIRST}:{DC1}{REG_LAST}"
    ws.conditional_formatting.add(grid, FormulaRule(formula=[f"{DC0}$6=0"], fill=fill(GRAY_F), stopIfTrue=True))
    ws.conditional_formatting.add(grid, FormulaRule(formula=[f'AND($W{REG_FIRST}<>"",{DC0}$5<$W{REG_FIRST})'], fill=fill(GRAY_F2), stopIfTrue=True))
    ws.conditional_formatting.add(grid, CellIsRule(operator="equal", formula=['"غائب"'], fill=fill(ABS_F), font=Font(name=FONT, bold=True, color=ABS_T)))
    ws.conditional_formatting.add(grid, CellIsRule(operator="equal", formula=['"بعذر"'], fill=fill(EXC_F), font=Font(name=FONT, color=EXC_T)))
    ws.conditional_formatting.add(grid, CellIsRule(operator="equal", formula=['"متأخر"'], fill=fill(LATE_F), font=Font(name=FONT, color=LATE_T)))
    ws.conditional_formatting.add(grid, CellIsRule(operator="equal", formula=['"حاضر"'], font=Font(name=FONT, color=GREEN_T)))
    ws.conditional_formatting.add(f"{DC0}4:{DC1}8", FormulaRule(formula=[f"{DC0}$5=TODAY()"], fill=fill(BLUE_F)))
    ws.conditional_formatting.add(f"{DC0}7:{DC1}7", FormulaRule(formula=[f'AND({DC0}$7="",COUNTA({DC0}${REG_FIRST}:{DC0}${REG_LAST})>0)'], fill=fill(YEL_F), font=Font(name=FONT, color=YEL_T)))
    ws.conditional_formatting.add(f"{DC0}7:{DC1}7", FormulaRule(formula=[f'{DC0}$7="✓"'], fill=fill(GREEN_F), font=Font(name=FONT, bold=True, color=GREEN_T)))
    ws.conditional_formatting.add(f"{DC0}5:{DC1}6", FormulaRule(formula=[f"{DC0}$6=0"], fill=fill(GRAY_F), font=Font(name=FONT, color=MUTED)))
    lvl = f"A{REG_FIRST}:H{REG_LAST}"
    ws.conditional_formatting.add(lvl, FormulaRule(formula=[f'AND($V{REG_FIRST}<>"",$V{REG_FIRST}>=Thr_Critical)'], fill=fill(RED_F), font=Font(name=FONT, bold=True, color=RED_T), border=Border(left=side(RED_T, "medium"), right=side(RED_T, "medium")), stopIfTrue=True))
    for col in ["E", "G"]:
        rg = f"{col}{REG_FIRST}:{col}{REG_LAST}"
        ws.conditional_formatting.add(rg, FormulaRule(formula=[f'AND($V{REG_FIRST}<>"",$V{REG_FIRST}=Thr_High)'], fill=fill(DORG_F), font=Font(name=FONT, bold=True, color=DORG_T)))
        ws.conditional_formatting.add(rg, FormulaRule(formula=[f'AND($V{REG_FIRST}<>"",$V{REG_FIRST}=Thr_Repeated)'], fill=fill(ORG_F), font=Font(name=FONT, bold=True, color=ORG_T)))
        ws.conditional_formatting.add(rg, FormulaRule(formula=[f'AND($V{REG_FIRST}<>"",$V{REG_FIRST}=Thr_FollowUp)'], fill=fill(YEL_F), font=Font(name=FONT, bold=True, color=YEL_T)))
        ws.conditional_formatting.add(rg, FormulaRule(formula=[f'AND($V{REG_FIRST}<>"",$V{REG_FIRST}=0)'], fill=fill(GREEN_F), font=Font(name=FONT, color=GREEN_T)))
    ws.conditional_formatting.add(f"H{REG_FIRST}:H{REG_LAST}", FormulaRule(formula=[f'ISNUMBER(SEARCH("مطلوب",$H{REG_FIRST}))'], fill=fill(ORG_F), font=Font(name=FONT, bold=True, color=ORG_T)))
    ws.conditional_formatting.add(f"B{REG_FIRST}:B{REG_LAST}", FormulaRule(formula=[f'AND($B{REG_FIRST}<>"",COUNTIF(Stu_ID,$B{REG_FIRST})>1)'], fill=fill(RED_F), font=Font(name=FONT, bold=True, color=RED_T)))
    ws.conditional_formatting.add(f"I{REG_FIRST}:I{REG_LAST}", FormulaRule(formula=[f'AND($I{REG_FIRST}<>"",$I{REG_FIRST}<>"نشط")'], fill=fill(GRAY_F), font=Font(name=FONT, color=MUTED)))
    ws.freeze_panes = f"D{REG_FIRST}"
    if idx >= ACTIVE_CLASSES:
        ws.sheet_state = "hidden"
    protect(ws)
    return ws
