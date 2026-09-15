# -*- coding: utf-8 -*-
from common import *
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.worksheet.formula import ArrayFormula
from openpyxl.formatting.rule import FormulaRule, ColorScaleRule
from openpyxl.chart import BarChart, LineChart, Reference
from openpyxl.chart.label import DataLabelList
from dashboard import list_header, class_counts, place, labels

def build_daily(wb):
    ws = wb.create_sheet(SHEETS["daily"])
    setup_sheet(ws, tab=TEAL)
    ws.column_dimensions["A"].width = 6
    for c, w in zip("BCDEFGHIJ", [13, 24, 13, 8, 12, 16, 16, 12, 12]):
        ws.column_dimensions[c].width = w
    title_block(ws, "الحضور اليومي", "اختاري أي تاريخ (سابق أو حالي) والصف: تظهر حالة التسجيل، ويأخذك الرابط مباشرة إلى عمود ذلك التاريخ في ورقة الصف لإدخال الحضور — يصلح للإدخال بأثر رجعي.", "Daily Attendance – review & navigation")
    put(ws, "A4", "التاريخ", f=font(10, True, NAVY), al=ALIGN_R); input_cell(ws, "B4", None, nf="dd/mm/yyyy")
    put(ws, "C4", "(فارغ = آخر يوم مسجَّل)", f=font(8, False, MUTED, True), al=ALIGN_R)
    put(ws, "D4", "الصف", f=font(10, True, NAVY), al=ALIGN_R); input_cell(ws, "E4", CLASSES[0])
    define(wb, "Daily_DateInput", f"{cq(ws.title)}$B$4"); define(wb, "Daily_Class", f"{cq(ws.title)}$E$4")
    put(ws, "H4", '=IF(Daily_DateInput="",LastRecorded,Daily_DateInput)', f=font(10, True, TEAL), al=ALIGN_C, nf="dd/mm/yyyy"); define(wb, "Daily_Date", f"{cq(ws.title)}$H$4")
    put(ws, "I4", '=IFERROR(MATCH(Daily_Date,Cal_Date,0),0)', f=font(8, False, MUTED), al=ALIGN_C); define(wb, "Daily_DayIdx", f"{cq(ws.title)}$I$4")
    put(ws, "J4", '=IFERROR(MATCH(Daily_Class,ClassList,0),0)', f=font(8, False, MUTED), al=ALIGN_C); define(wb, "Daily_ClsIdx", f"{cq(ws.title)}$J$4")
    put(ws, "G4", "التاريخ الفعّال:", f=font(9, True, NAVY), al=ALIGN_R)
    put(ws, "B5", f'=IF(Daily_DayIdx=0,"⚠ التاريخ ليس يومًا دراسيًا في التقويم",HYPERLINK("#\'"&Daily_Class&"\'!"&ADDRESS({REG_FIRST},{DATE_COL0-1}+Daily_DayIdx),"⬅ فتح عمود هذا اليوم في سجل الصف "&Daily_Class&" للتسجيل"))', f=font(11, True, "1D4ED8"), al=ALIGN_R)
    ws.row_dimensions[5].height = 22
    dv = DataValidation(type="list", formula1="=ActiveClassList", allow_blank=False, error="اختاري صفًا مفعّلًا", errorTitle="قيمة غير صحيحة"); ws.add_data_validation(dv); dv.add(ws["E4"])
    dv2 = DataValidation(type="list", formula1="=Cal_Date", allow_blank=True, error="اختاري يوم دوام من القائمة", errorTitle="تاريخ غير صحيح", prompt="اختاري التاريخ (السابق أو الحالي) الذي تريدين تسجيله أو مراجعته", promptTitle="التاريخ"); ws.add_data_validation(dv2); dv2.add(ws["B4"])
    # day cards
    sums = {}
    for key in SUM_ROW:
        terms = ",".join(f"INDEX({cq(cn)}${DC0}${SUM_ROW[key]}:${DC1}${SUM_ROW[key]},Daily_DayIdx)" for cn in CLASSES)
        sums[key] = f"CHOOSE(Daily_ClsIdx,{terms})"
    conf = "CHOOSE(Daily_ClsIdx," + ",".join(f"INDEX({cq(cn)}${DC0}$7:${DC1}$7,Daily_DayIdx)" for cn in CLASSES) + ")"
    cards = [("اليوم", '=IF(Daily_DayIdx=0,"—",INDEX(Cal_Day,Daily_DayIdx))'), ("يوم دراسي؟", '=IF(Daily_DayIdx=0,"—",IF(INDEX(Cal_School,Daily_DayIdx)=1,"نعم","عطلة"))'),
             ("ضمن الحصر؟", f'=IF(OR(Daily_DayIdx=0,Daily_ClsIdx=0),"—",IF({conf}="✓","✓ محصور","غير محصور"))'),
             ("المسجَّلون", f'=IF(OR(Daily_DayIdx=0,Daily_ClsIdx=0),0,{sums["reg"]})'), ("حاضر", f'=IF(OR(Daily_DayIdx=0,Daily_ClsIdx=0),0,{sums["pres"]})'),
             ("غياب بدون عذر", f'=IF(OR(Daily_DayIdx=0,Daily_ClsIdx=0),0,{sums["abs"]})'), ("غياب بعذر", f'=IF(OR(Daily_DayIdx=0,Daily_ClsIdx=0),0,{sums["exc"]})'),
             ("متأخر", f'=IF(OR(Daily_DayIdx=0,Daily_ClsIdx=0),0,{sums["late"]})'), ("نسبة الحضور", f'=IF(OR(Daily_DayIdx=0,Daily_ClsIdx=0),"—",IF({sums["rate"]}="","—",{sums["rate"]}))')]
    for j, (lab, fm) in enumerate(cards):
        c = 2 + j
        put(ws, (7, c), lab, f=font(9, True, MUTED), bg=LIGHT, al=ALIGN_C, b=box(WHITE))
        put(ws, (8, c), fm, f=font(14, True, NAVY), bg=LIGHT, al=ALIGN_C, b=box(WHITE), nf="0.0%" if j == 8 else None)
    ws.row_dimensions[8].height = 30
    ws.conditional_formatting.add("D8", FormulaRule(formula=['$D$8="غير محصور"'], fill=fill(YEL_F), font=Font(name=FONT, bold=True, color=YEL_T)))
    ws.conditional_formatting.add("D8", FormulaRule(formula=['$D$8="✓ محصور"'], fill=fill(GREEN_F), font=Font(name=FONT, bold=True, color=GREEN_T)))
    section(ws, "A10", "قائمة أطفال الصف وحالتهم في هذا اليوم", None, 8)
    list_header(ws, 11, 1, ["م", "الرقم الطلابي", "اسم الطفل", "الحالة اليوم", "الرمز", "إجمالي الغياب", "حالة المتابعة", "التواصل مع ولي الأمر"])
    for i in range(1, SLOTS + 1):
        r = 11 + i
        mrow = f"((Daily_ClsIdx-1)*{SLOTS}+{i})"
        put(ws, f"A{r}", f'=IF(B{r}="","",{i})', f=font(10), al=ALIGN_C, b=bottom())
        put(ws, f"B{r}", f'=IF(Daily_ClsIdx=0,"",INDEX(Stu_ID,{mrow}))', f=font(10), al=ALIGN_C, b=bottom())
        put(ws, f"C{r}", f'=IF(B{r}="","",INDEX(Stu_Name,{mrow}))', f=font(10, True), al=ALIGN_R, b=bottom())
        val = f"INDEX({GRID('Daily_ClsIdx')},{i},Daily_DayIdx)"; cf = f"INDEX({CONFROW('Daily_ClsIdx')},Daily_DayIdx)"
        put(ws, f"E{r}", f'=IF(OR(B{r}="",Daily_DayIdx=0),"",IF({cf}<>"✓","",{CODE_OF(val)}))', f=font(10), al=ALIGN_C, b=bottom())
        put(ws, f"D{r}", f'=IF(B{r}="","",IF(INDEX(Stu_StStatus,{mrow})<>"نشط","غير نشط",IF(Daily_DayIdx=0,"—",IF(E{r}="","غير محصور",INDEX(StatusLabels,MATCH(E{r},StatusCodes,0))))))', f=font(10, True), al=ALIGN_C, b=bottom())
        put(ws, f"F{r}", f'=IF(B{r}="","",INDEX(Stu_Abs,{mrow}))', f=font(10), al=ALIGN_C, b=bottom())
        put(ws, f"G{r}", f'=IF(B{r}="","",INDEX(Stu_Status,{mrow}))', f=font(10), al=ALIGN_C, b=bottom())
        put(ws, f"H{r}", f'=IF(B{r}="","",INDEX(Stu_ContactReq,{mrow}))', f=font(10), al=ALIGN_C, b=bottom())
    rg = f"D12:D{11+SLOTS}"
    for val, bg, fg in [("حاضر", GREEN_F, GREEN_T), ("غياب بدون عذر", ABS_F, ABS_T), ("غياب بعذر", EXC_F, EXC_T), ("متأخر", LATE_F, LATE_T), ("غير محصور", YEL_F, YEL_T)]:
        ws.conditional_formatting.add(rg, FormulaRule(formula=[f'$D12="{val}"'], fill=fill(bg), font=Font(name=FONT, bold=True, color=fg)))
    ws.conditional_formatting.add(f"G12:G{11+SLOTS}", FormulaRule(formula=['ISNUMBER(SEARCH("حرجة",$G12))'], fill=fill(RED_F), font=Font(name=FONT, bold=True, color=RED_T)))
    ws.conditional_formatting.add(f"G12:G{11+SLOTS}", FormulaRule(formula=['ISNUMBER(SEARCH("⚠",$G12))'], fill=fill(YEL_F), font=Font(name=FONT, bold=True, color=YEL_T)))
    ws.conditional_formatting.add(f"H12:H{11+SLOTS}", FormulaRule(formula=['ISNUMBER(SEARCH("مطلوب",$H12))'], fill=fill(ORG_F), font=Font(name=FONT, bold=True, color=ORG_T)))
    r0 = 11 + SLOTS + 3
    section(ws, f"A{r0}", "جميع الصفوف في هذا اليوم", "All classes – selected day", 8)
    list_header(ws, r0 + 1, 1, ["", "الصف", "ضمن الحصر؟", "المسجَّلون", "حاضر", "غياب بدون عذر", "غياب بعذر", "متأخر", "نسبة الحضور"])
    for k, cn in enumerate(CLASSES):
        r = r0 + 2 + k
        put(ws, f"B{r}", f'=IF(INDEX(ClassActive,{k+1})="نعم",{cq(cn)}$B$2,"")', f=font(10, True), al=ALIGN_C, b=bottom())
        G = lambda e: f'=IF(OR($B{r}="",Daily_DayIdx=0),"",{e})'
        put(ws, f"C{r}", G(f'IF(INDEX({cq(cn)}${DC0}$7:${DC1}$7,Daily_DayIdx)="✓","✓","غير محصور")'), f=font(10), al=ALIGN_C, b=bottom())
        for j, key in enumerate(["reg", "pres", "abs", "exc", "late", "rate"]):
            put(ws, (r, 4 + j), G(f"INDEX({cq(cn)}${DC0}${SUM_ROW[key]}:${DC1}${SUM_ROW[key]},Daily_DayIdx)"), f=font(10), al=ALIGN_C, b=bottom(), nf="0.0%" if key == "rate" else None)
    ws.conditional_formatting.add(f"C{r0+2}:C{r0+2+NCLS}", FormulaRule(formula=[f'$C{r0+2}="غير محصور"'], fill=fill(YEL_F), font=Font(name=FONT, bold=True, color=YEL_T)))
    ws.freeze_panes = "A12"
    protect(ws)
    return ws


def build_profile(wb):
    ws = wb.create_sheet(SHEETS["prof"])
    setup_sheet(ws, tab=TEAL)
    ws.column_dimensions["A"].width = 16
    for c in range(2, 33):
        ws.column_dimensions[L(c)].width = 4.6
    title_block(ws, "ملف حضور الطفل", "اختاري اسم الطفل لعرض ملفه الكامل: الإحصائيات، تواريخ الغياب، سجل التواصل، وتقويم الحضور الشهري", "Student Attendance Profile")
    def merged(ref_range, value, **kw):
        first = ref_range.split(":")[0]
        c = put(ws, first, value, **kw); ws.merge_cells(ref_range); return c
    put(ws, "A4", "اسم الطفل", f=font(10, True, NAVY), al=ALIGN_R)
    c = input_cell(ws, "B4", None, al=ALIGN_R); ws.merge_cells("B4:H4")
    dv = DataValidation(type="list", formula1="=Stu_Name", allow_blank=True, error="اختاري اسمًا من القائمة", errorTitle="اسم غير موجود"); ws.add_data_validation(dv); dv.add(ws["B4"])
    put(ws, "AD4", '=IFERROR(MATCH($B$4,Stu_Name,0),"")', f=font(8, False, MUTED), al=ALIGN_C); define(wb, "Prof_Row", f"{cq(ws.title)}$AD$4")
    put(ws, "AE4", '=IF(Prof_Row="","",INDEX(Stu_ID,Prof_Row))', f=font(8, False, MUTED), al=ALIGN_C); define(wb, "Prof_ID", f"{cq(ws.title)}$AE$4")
    put(ws, "AF4", '=IF(Prof_Row="","",INDEX(Stu_C,Prof_Row))', f=font(8, False, MUTED), al=ALIGN_C); define(wb, "Prof_C", f"{cq(ws.title)}$AF$4")
    put(ws, "AC4", '=IF(Prof_Row="","",INDEX(Stu_I,Prof_Row))', f=font(8, False, MUTED), al=ALIGN_C); define(wb, "Prof_I", f"{cq(ws.title)}$AC$4")
    # hidden mirror of the selected child's register row (statuses), the class's counted-day row and the dates
    for j in range(NDAYS):
        c = 2 + j
        ws.cell(60, c, f'=IF(Prof_Row="","",INDEX({GRID("Prof_C")},Prof_I,{j+1}))')
        ws.cell(61, c, f'=IF(Prof_Row="","",INDEX({CONFROW("Prof_C")},{j+1}))')
        ws.cell(62, c, f"={cq(CLASSES[0])}{L(DATE_COL0 + j)}$5").number_format = "dd/mm/yyyy"
    put(ws, "A60", "صف الطفل (مرآة)", f=font(8, False, MUTED)); put(ws, "A61", "محصور", f=font(8, False, MUTED)); put(ws, "A62", "التاريخ", f=font(8, False, MUTED))
    for rr in (60, 61, 62): ws.row_dimensions[rr].hidden = True
    MROW = f"$B$60:${L(1 + NDAYS)}$60"; MCONF = f"$B$61:${L(1 + NDAYS)}$61"; MDATES = f"$B$62:${L(1 + NDAYS)}$62"
    define(wb, "Prof_Statuses", f"{cq(ws.title)}{MROW}"); define(wb, "Prof_Counted", f"{cq(ws.title)}{MCONF}"); define(wb, "Prof_Dates", f"{cq(ws.title)}{MDATES}")
    put(ws, "A5", '=IF($B$4="","⬆ اختاري اسم الطفل من القائمة المنسدلة",IF(Prof_Row="","⚠ الاسم غير موجود في قائمة الأطفال",""))', f=font(9, False, ORG_T, True), al=ALIGN_R)
    G = lambda e: f'=IF(Prof_Row="","",{e})'
    info = [("الرقم الطلابي", "INDEX(Stu_ID,Prof_Row)", None), ("الصف", "INDEX(Stu_Class,Prof_Row)", None), ("الحالة الدراسية", "INDEX(Stu_StStatus,Prof_Row)", None),
            ("تاريخ الالتحاق", 'IF(INDEX(Stu_Join,Prof_Row)="","بداية العام",INDEX(Stu_Join,Prof_Row))', "dd/mm/yyyy"),
            ("ولي الأمر", "INDEX(Stu_Guardian,Prof_Row)", None), ("رقم التواصل", "INDEX(Stu_Phone,Prof_Row)", None),
            ("الإجراء المطلوب", "INDEX(Stu_Action,Prof_Row)", None), ("التواصل مع ولي الأمر", "INDEX(Stu_ContactReq,Prof_Row)", None)]
    for i, (lab, e, nf) in enumerate(info):
        r = 7 + i
        put(ws, f"A{r}", lab, f=font(10), al=ALIGN_R, b=bottom())
        merged(f"B{r}:H{r}", G(e), f=font(10, True, NAVY if i < 6 else ORG_T), al=ALIGN_R, b=bottom(), nf=nf)
    stats = [("أيام الدوام", "INDEX(Stu_Days,Prof_Row)", None), ("الحضور", "INDEX(Stu_Pres,Prof_Row)", None), ("الغياب", "INDEX(Stu_Abs,Prof_Row)", None),
             ("غياب بعذر", "INDEX(Stu_Exc,Prof_Row)", None), ("التأخير", "INDEX(Stu_Late,Prof_Row)", None), ("نسبة الحضور", 'IF(INDEX(Stu_Rate,Prof_Row)="","—",INDEX(Stu_Rate,Prof_Row))', "0.0%"),
             ("مستوى المتابعة", "INDEX(Stu_Status,Prof_Row)", None), ("فئة الحضور", "INDEX(Stu_Cat,Prof_Row)", None)]
    for i, (lab, e, nf) in enumerate(stats):
        r = 7 + i
        merged(f"J{r}:M{r}", lab, f=font(10), al=ALIGN_R, b=bottom(), bg=LIGHT)
        merged(f"N{r}:P{r}", G(e), f=font(11, True, NAVY), al=ALIGN_C, b=bottom(), bg=LIGHT, nf=nf)
    ws.conditional_formatting.add("N13", FormulaRule(formula=['ISNUMBER(SEARCH("حرجة",$N$13))'], fill=fill(RED_F), font=Font(name=FONT, bold=True, color=RED_T)))
    ws.conditional_formatting.add("N13", FormulaRule(formula=['ISNUMBER(SEARCH("⚠",$N$13))'], fill=fill(YEL_F), font=Font(name=FONT, bold=True, color=YEL_T)))
    ws.conditional_formatting.add("B14", FormulaRule(formula=['ISNUMBER(SEARCH("مطلوب",$B$14))'], fill=fill(ORG_F), font=Font(name=FONT, bold=True, color=ORG_T)))
    # absence dates & contact log
    section(ws, "A17", "تواريخ الغياب (بدون عذر)", "Absence dates", 8)
    section(ws, "J17", "سجل التواصل مع ولي الأمر", "Parent contact history", 23)
    for ref, lab in [("A18", "#"), ("B18:E18", "التاريخ"), ("F18:H18", "اليوم"), ("J18:M18", "التاريخ"), ("N18:P18", "الطريقة"), ("Q18:R18", "الغيابات حينها"), ("S18:AF18", "النتيجة / ملاحظات")]:
        if ":" in ref: merged(ref, lab, f=font(9, True, WHITE), bg=TEAL, al=ALIGN_C, b=box(TEAL))
        else: put(ws, ref, lab, f=font(9, True, WHITE), bg=TEAL, al=ALIGN_C, b=box(TEAL))
    ws.row_dimensions[18].height = 24
    for k in range(1, 21):
        r = 18 + k
        ws[f"B{r}"] = ArrayFormula(f"B{r}", f'=IF(Prof_Row="","",IFERROR(SMALL(IF((Prof_Statuses="غياب بدون عذر")*(Prof_Counted="✓"),Prof_Dates),{k}),""))')
        style(ws[f"B{r}"], f=font(9, True), al=ALIGN_C, b=bottom(), nf="dd/mm/yyyy"); ws.merge_cells(f"B{r}:E{r}")
        put(ws, f"A{r}", f'=IF(B{r}="","",{k})', f=font(9), al=ALIGN_C, b=bottom())
        merged(f"F{r}:H{r}", f'=IF(B{r}="","",INDEX(Cal_Day,MATCH(B{r},Cal_Date,0)))', f=font(9), al=ALIGN_C, b=bottom())
        if k <= 10:
            merged(f"J{r}:M{r}", G(f'IFERROR(INDEX(Log_Date,MATCH({k},Log_Seq,0)),"")'), f=font(9, True), al=ALIGN_C, b=bottom(), nf="dd/mm/yyyy")
            merged(f"N{r}:P{r}", G(f'IFERROR(INDEX(Log_Method,MATCH({k},Log_Seq,0)),"")'), f=font(9), al=ALIGN_C, b=bottom())
            merged(f"Q{r}:R{r}", G(f'IFERROR(INDEX(Log_Count,MATCH({k},Log_Seq,0)),"")'), f=font(9), al=ALIGN_C, b=bottom())
            merged(f"S{r}:AF{r}", G(f'IFERROR(INDEX(Log_Notes,MATCH({k},Log_Seq,0)),"")'), f=font(9), al=ALIGN_R, b=bottom())
    ws.conditional_formatting.add("A19:H38", FormulaRule(formula=['AND($A19<>"",$A19>=Thr_Critical)'], fill=fill(RED_F), font=Font(name=FONT, bold=True, color=RED_T)))
    ws.conditional_formatting.add("A19:H38", FormulaRule(formula=['AND($A19<>"",$A19>=Thr_High)'], fill=fill(DORG_F)))
    ws.conditional_formatting.add("A19:H38", FormulaRule(formula=['AND($A19<>"",$A19>=Thr_Repeated)'], fill=fill(ORG_F)))
    ws.conditional_formatting.add("A19:H38", FormulaRule(formula=['AND($A19<>"",$A19>=Thr_FollowUp)'], fill=fill(YEL_F)))
    put(ws, "A39", "يُلوَّن الغياب الذي بلغ حد التنبيه بلون المستوى. تُعرض أول 20 حالة غياب وأحدث 10 تواصلات.", f=font(8, False, MUTED, True), al=ALIGN_R)
    # monthly calendar grid
    section(ws, "A41", "تقويم الحضور الشهري", "Monthly attendance calendar  (✓ حاضر · ✕ غائب · ○ بعذر · م متأخر)", 10)
    put(ws, "A42", "الشهر", f=font(9, True, WHITE), bg=NAVY, al=ALIGN_C, b=box(NAVY))
    for d in range(1, 32):
        put(ws, (42, 1 + d), d, f=font(8, True, WHITE), bg=NAVY, al=ALIGN_C, b=box(NAVY))
    months = []
    y, m = YEAR_START.year, YEAR_START.month
    while (y, m) <= (YEAR_END.year, YEAR_END.month):
        months.append((y, m)); m += 1
        if m == 13: y, m = y + 1, 1
    for i, (y, m) in enumerate(months):
        r = 43 + i
        put(ws, f"A{r}", f"{AR_MONTHS[m-1]} {y}", f=font(9, True, NAVY), al=ALIGN_R, b=box(), bg=LIGHT)
        for d in range(1, 32):
            ix = f"MATCH(DATE({y},{m},{d}),Prof_Dates,0)"
            fm = f'=IF(Prof_Row="","",IFERROR(IF(DAY(DATE({y},{m},{d}))<>{d},"",IF(INDEX(Prof_Counted,{ix})<>"✓","",IF(INDEX(Prof_Statuses,{ix})="","✓",INDEX(StatusSymbols,MATCH(INDEX(Prof_Statuses,{ix}),StatusLabels,0))))),""))'
            put(ws, (r, 1 + d), fm, f=font(9, True), al=ALIGN_C, b=box("EEF0F3"))
        ws.row_dimensions[r].height = 18
    grid = f"B43:AF{42+len(months)}"
    for sym, bg, fg in [("✓", GREEN_F, GREEN_T), ("✕", ABS_F, ABS_T), ("○", EXC_F, EXC_T), ("م", LATE_F, LATE_T)]:
        ws.conditional_formatting.add(grid, FormulaRule(formula=[f'B43="{sym}"'], fill=fill(bg), font=Font(name=FONT, bold=True, color=fg)))
    ws.freeze_panes = "A6"
    protect(ws)
    return ws


def build_trends(wb):
    ws = wb.create_sheet(SHEETS["trend"])
    setup_sheet(ws, tab=TEAL)
    ws.column_dimensions["A"].width = 16
    for c in range(2, 14):
        ws.column_dimensions[L(c)].width = 11
    title_block(ws, "اتجاهات الحضور", "التحليل اليومي والأسبوعي والشهري والفصلي — يُحدَّث تلقائيًا", "Attendance Trends")
    put(ws, "A4", "الصف", f=font(10, True, NAVY), al=ALIGN_R); input_cell(ws, "B4", "الكل")
    define(wb, "Trend_Class", f"{cq(ws.title)}$B$4")
    dv = DataValidation(type="list", formula1="=FilterClassList", allow_blank=False); ws.add_data_validation(dv); dv.add(ws["B4"])
    put(ws, "C4", "(الكل = جميع أطفال KG1)", f=font(8, False, MUTED, True), al=ALIGN_R)
    T = "Trend_Class"
    def stats_cols(ws, r, start, end, first_col=3):
        """attended, registered, absent, excused, late, rate for [start,end] with Trend_Class filter."""
        P = class_counts(T, "P", start=start, end=end); A = class_counts(T, "A", start=start, end=end)
        E = class_counts(T, "E", start=start, end=end); Lt = class_counts(T, "L", start=start, end=end)
        cols = [f'{P}+{A}+{E}+{Lt}', f'{P}+{Lt}', A, E, Lt]
        for j, e in enumerate(cols):
            put(ws, (r, first_col + j), f'=IF($A{r}="","",{e})', f=font(9), al=ALIGN_C, b=bottom())
        c0 = L(first_col); c1 = L(first_col + 1); c4 = L(first_col + 4)
        put(ws, (r, first_col + 5), f'=IF(OR($A{r}="",{c0}{r}=0),"",({c1}{r}-IF(LateAsPresent="نعم",0,{c4}{r}))/{c0}{r})', f=font(9, True, TEAL), al=ALIGN_C, b=bottom(), nf="0.0%")
    # 1. daily – last 15 recorded days
    section(ws, "A6", "الاتجاه اليومي – آخر 15 يومًا مسجَّلًا", "Daily trend", 8)
    list_header(ws, 7, 1, ["التاريخ", "اليوم", "المسجَّلون", "الحاضرون", "غياب بدون عذر", "غياب بعذر", "متأخر", "نسبة الحضور"])
    for k in range(1, 16):
        r = 7 + k; n = f"(Rec_Days-15+{k})"
        put(ws, f"A{r}", f'=IF({n}<1,"",INDEX(Cal_Date,MATCH({n},Cal_RecIdx,0)))', f=font(9, True), al=ALIGN_C, b=bottom(), nf="dd/mm")
        put(ws, f"B{r}", f'=IF(A{r}="","",INDEX(Cal_Day,MATCH(A{r},Cal_Date,0)))', f=font(9), al=ALIGN_C, b=bottom())
        stats_cols(ws, r, f"$A{r}", f"$A{r}")
    lc = LineChart(); lc.title = "Daily Attendance Rate – نسبة الحضور اليومية"; lc.style = 12
    data = Reference(ws, min_col=8, min_row=8, max_row=22); cats = Reference(ws, min_col=1, min_row=8, max_row=22)
    lc.add_data(data, titles_from_data=False); lc.set_categories(cats)
    s = lc.series[0]; s.graphicalProperties.line.solidFill = TEAL; s.graphicalProperties.line.width = 28000; s.marker.symbol = "circle"; s.marker.size = 6; s.marker.graphicalProperties.solidFill = TEAL
    lc.y_axis.scaling.min = 0; lc.y_axis.scaling.max = 1; lc.y_axis.number_format = "0%"; lc.x_axis.number_format = "dd/mm"
    lc.legend = None
    place(ws, lc, 10, 7, 16, 22)
    # 2. weekly – last 10 recorded weeks
    r0 = 25
    section(ws, f"A{r0}", "الاتجاه الأسبوعي – آخر 10 أسابيع دراسية مسجَّلة", "Weekly Attendance Trend", 8)
    # helper: weeks table (all 44 weeks) in columns O..Q
    put(ws, "S6", "أسبوع", f=font(8, True, MUTED)); put(ws, "T6", "أيام مسجَّلة", f=font(8, True, MUTED)); put(ws, "U6", "ترتيب", f=font(8, True, MUTED))
    nweeks = (YEAR_END - YEAR_START).days // 7 + 1
    for w in range(1, nweeks + 1):
        r = 6 + w
        put(ws, f"S{r}", w, f=font(8, False, MUTED)); put(ws, f"T{r}", f'=COUNTIFS(Cal_Week,{w},Cal_Reg,">0")', f=font(8, False, MUTED))
        put(ws, f"U{r}", f'=IF(T{r}>0,COUNTIF($T$7:T{r},">0"),"")', f=font(8, False, MUTED))
    put(ws, "S5", f'=COUNTIF(T7:T{6+nweeks},">0")', f=font(8, True, MUTED)); define(wb, "Rec_Weeks", f"{cq(ws.title)}$S$5")
    list_header(ws, r0 + 1, 1, ["الأسبوع", "من – إلى", "المسجَّلون", "الحاضرون", "غياب بدون عذر", "غياب بعذر", "متأخر", "نسبة الحضور"])
    for k in range(1, 11):
        r = r0 + 1 + k; n = f"(Rec_Weeks-10+{k})"
        put(ws, f"A{r}", f'=IF({n}<1,"",INDEX($S$7:$S${6+nweeks},MATCH({n},$U$7:$U${6+nweeks},0)))', f=font(9, True), al=ALIGN_C, b=bottom(), nf='"الأسبوع "0')
        put(ws, f"I{r}", f'=IF(A{r}="","",YearStart+(A{r}-1)*7)', f=font(8, False, MUTED), al=ALIGN_C, nf="dd/mm/yyyy")
        put(ws, f"J{r}", f'=IF(A{r}="","",I{r}+6)', f=font(8, False, MUTED), al=ALIGN_C, nf="dd/mm/yyyy")
        put(ws, f"B{r}", f'=IF(A{r}="","",TEXT(I{r},"dd/mm")&" – "&TEXT(J{r},"dd/mm"))', f=font(9), al=ALIGN_C, b=bottom())
        stats_cols(ws, r, f"$I{r}", f"$J{r}")
    lc2 = LineChart(); lc2.title = "Weekly Attendance Trend – الاتجاه الأسبوعي"; lc2.style = 12
    data = Reference(ws, min_col=8, min_row=r0 + 2, max_row=r0 + 11); cats = Reference(ws, min_col=2, min_row=r0 + 2, max_row=r0 + 11)
    lc2.add_data(data, titles_from_data=False); lc2.set_categories(cats)
    s = lc2.series[0]; s.graphicalProperties.line.solidFill = NAVY; s.graphicalProperties.line.width = 28000; s.marker.symbol = "circle"; s.marker.size = 6; s.marker.graphicalProperties.solidFill = NAVY
    lc2.y_axis.scaling.min = 0; lc2.y_axis.scaling.max = 1; lc2.y_axis.number_format = "0%"
    lc2.legend = None
    place(ws, lc2, 10, r0 + 1, 16, r0 + 12)
    # 3. monthly
    r1 = r0 + 14
    section(ws, f"A{r1}", "التحليل الشهري", "Monthly Attendance Overview", 8)
    list_header(ws, r1 + 1, 1, ["الشهر", "أيام الدراسة المسجَّلة", "المسجَّلون (طفل×يوم)", "الحضور", "غياب بدون عذر", "غياب بعذر", "متأخر", "متوسط نسبة الحضور"])
    months = []
    y, m = YEAR_START.year, YEAR_START.month
    while (y, m) <= (YEAR_END.year, YEAR_END.month):
        months.append((y, m)); m += 1
        if m == 13: y, m = y + 1, 1
    for i, (y, m) in enumerate(months):
        r = r1 + 2 + i
        put(ws, f"A{r}", f"{AR_MONTHS[m-1]} {y}", f=font(9, True), al=ALIGN_R, b=bottom())
        put(ws, f"I{r}", dt.date(y, m, 1), f=font(8, False, MUTED), al=ALIGN_C, nf="dd/mm/yyyy")
        put(ws, f"J{r}", f"=EOMONTH(I{r},0)", f=font(8, False, MUTED), al=ALIGN_C, nf="dd/mm/yyyy")
        put(ws, f"B{r}", f'=COUNTIFS(Cal_Date,">="&I{r},Cal_Date,"<="&J{r},Cal_Reg,">0")', f=font(9), al=ALIGN_C, b=bottom())
        stats_cols(ws, r, f"$I{r}", f"$J{r}")
    mr0, mr1 = r1 + 2, r1 + 1 + len(months)
    bc = BarChart(); bc.type = "col"; bc.title = "Monthly Attendance Rate – نسبة الحضور الشهرية"; bc.style = 10
    data = Reference(ws, min_col=8, min_row=mr0, max_row=mr1); cats = Reference(ws, min_col=1, min_row=mr0, max_row=mr1)
    bc.add_data(data, titles_from_data=False); bc.set_categories(cats); bc.series[0].graphicalProperties.solidFill = TEAL
    bc.y_axis.scaling.min = 0; bc.y_axis.scaling.max = 1; bc.y_axis.number_format = "0%"; bc.y_axis.majorGridlines = None
    labels(bc)
    bc.legend = None
    place(ws, bc, 10, r1 + 1, 16, r1 + 13)
    # 4. terms + year
    r2 = mr1 + 3
    section(ws, f"A{r2}", "الفصول الدراسية والعام", "Terms & academic year", 8)
    list_header(ws, r2 + 1, 1, ["الفترة", "أيام الدراسة المسجَّلة", "المسجَّلون (طفل×يوم)", "الحضور", "غياب بدون عذر", "غياب بعذر", "متأخر", "متوسط نسبة الحضور"])
    for i in range(4):
        r = r2 + 2 + i
        if i < 3:
            put(ws, f"A{r}", f"=INDEX(TermNames,{i+1})", f=font(9, True), al=ALIGN_R, b=bottom())
            put(ws, f"I{r}", f"=INDEX(TermStart,{i+1})", f=font(8, False, MUTED), al=ALIGN_C, nf="dd/mm/yyyy"); put(ws, f"J{r}", f"=INDEX(TermEnd,{i+1})", f=font(8, False, MUTED), al=ALIGN_C, nf="dd/mm/yyyy")
        else:
            put(ws, f"A{r}", '="العام الدراسي "&AcademicYear', f=font(9, True, NAVY), al=ALIGN_R, b=bottom())
            put(ws, f"I{r}", "=YearStart", f=font(8, False, MUTED), al=ALIGN_C, nf="dd/mm/yyyy"); put(ws, f"J{r}", "=YearEnd", f=font(8, False, MUTED), al=ALIGN_C, nf="dd/mm/yyyy")
        put(ws, f"B{r}", f'=COUNTIFS(Cal_Date,">="&I{r},Cal_Date,"<="&J{r},Cal_Reg,">0")', f=font(9), al=ALIGN_C, b=bottom())
        stats_cols(ws, r, f"$I{r}", f"$J{r}")
    # 5. monthly rate by class matrix
    r3 = r2 + 8
    section(ws, f"A{r3}", "نسبة الحضور الشهرية حسب الصف", "Monthly attendance rate by class", 8)
    list_header(ws, r3 + 1, 1, ["الشهر"] + [f"=INDEX(ClassList,{k+1})" for k in range(NCLS)])
    for i, (y, m) in enumerate(months):
        r = r3 + 2 + i; src = mr0 + i
        put(ws, f"A{r}", f"=A{src}", f=font(9, True), al=ALIGN_R, b=bottom())
        for k in range(NCLS):
            col = L(2 + k); cls = f"{col}${r3+1}"
            P = f'SUMIFS(CD_Pres,CD_Class,{cls},CD_Date,">="&$I{src},CD_Date,"<="&$J{src})'; Lt = f'SUMIFS(CD_Late,CD_Class,{cls},CD_Date,">="&$I{src},CD_Date,"<="&$J{src})'
            reg = f'SUMIFS(CD_Reg,CD_Class,{cls},CD_Date,">="&$I{src},CD_Date,"<="&$J{src})'
            put(ws, f"{col}{r}", f'=IF(INDEX(ClassActive,{k+1})<>"نعم","",IF(({reg})=0,"",({P}+IF(LateAsPresent="نعم",{Lt},0))/({reg})))', f=font(9), al=ALIGN_C, b=bottom(), nf="0.0%")
    ws.conditional_formatting.add(f"B{r3+2}:{L(1+NCLS)}{r3+1+len(months)}", ColorScaleRule(start_type="num", start_value=0.8, start_color="F8B4B4", mid_type="num", mid_value=0.9, mid_color="FFF4CC", end_type="num", end_value=1, end_color="C8E6C9"))
    put(ws, f"A{r3+2+len(months)}", "التلوين: أحمر < 80% · أصفر ≈ 90% · أخضر = 100%. الخلايا الفارغة = لا توجد بيانات مسجَّلة.", f=font(8, False, MUTED, True), al=ALIGN_R)
    ws.freeze_panes = "A5"
    protect(ws)
    return ws
