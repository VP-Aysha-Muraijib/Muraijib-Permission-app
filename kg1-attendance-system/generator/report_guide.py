# -*- coding: utf-8 -*-
from common import *
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.formatting.rule import FormulaRule
from openpyxl.worksheet.page import PageMargins
from openpyxl.worksheet.pagebreak import Break
from dashboard import list_header, class_counts

def build_report(wb):
    ws = wb.create_sheet(SHEETS["rpt"])
    setup_sheet(ws, tab=NAVY)
    for c, w in zip("ABCDEFGH", [22, 11, 11, 11, 11, 12, 14, 18]):
        ws.column_dimensions[c].width = w
    ws.row_dimensions[1].height = 46; ws.row_dimensions[2].height = 30
    letterhead(ws, (3, 6), rows=(1, 2))
    cc = Alignment(horizontal="centerContinuous", vertical="center")
    put(ws, "A3", '="ملخص الحضور والغياب – "&SectionName&"   |   KG1 Attendance Summary"', f=font(13, True, NAVY), al=cc)
    for col in "BCDEFGH": ws[f"{col}3"].alignment = cc
    ws.row_dimensions[3].height = 26
    ws["A3"].border = Border(bottom=side(TEAL, "medium"))
    for col in "BCDEFGH": ws[f"{col}3"].border = Border(bottom=side(TEAL, "medium"))
    put(ws, "A4", "نوع التقرير", f=font(9, True, NAVY), al=ALIGN_R); input_cell(ws, "B4", "يوم")
    put(ws, "C4", "التاريخ", f=font(9, True, NAVY), al=ALIGN_R); input_cell(ws, "D4", None, nf="dd/mm/yyyy")
    put(ws, "E4", "الصف", f=font(9, True, NAVY), al=ALIGN_R); input_cell(ws, "F4", "الكل")
    put(ws, "G4", '="تاريخ الطباعة: "&TEXT(TODAY(),"dd/mm/yyyy")', f=font(8, False, MUTED), al=Alignment(horizontal="left"))
    define(wb, "Rpt_Period", f"{cq(ws.title)}$B$4"); define(wb, "Rpt_DateInput", f"{cq(ws.title)}$D$4"); define(wb, "Rpt_Class", f"{cq(ws.title)}$F$4")
    dv = DataValidation(type="list", formula1="=RptPeriodList", allow_blank=False); ws.add_data_validation(dv); dv.add(ws["B4"])
    dv2 = DataValidation(type="list", formula1="=FilterClassList", allow_blank=False); ws.add_data_validation(dv2); dv2.add(ws["F4"])
    dv3 = DataValidation(type="list", formula1="=Cal_Date", allow_blank=True, error="اختاري يوم دوام من القائمة", errorTitle="تاريخ غير صحيح"); ws.add_data_validation(dv3); dv3.add(ws["D4"])
    # hidden calc (column J/K – outside print area)
    ws.column_dimensions["J"].width = 20; ws.column_dimensions["K"].width = 14
    calc = [("Rpt_Date", "التاريخ الفعّال", '=IF(Rpt_DateInput="",LastRecorded,Rpt_DateInput)', "dd/mm/yyyy"),
            ("Rpt_PStart", "بداية الفترة", '=IF(Rpt_Period="يوم",Rpt_Date,IF(Rpt_Period="الأسبوع",Rpt_Date-WEEKDAY(Rpt_Date,2)+1,IF(Rpt_Period="الشهر",DATE(YEAR(Rpt_Date),MONTH(Rpt_Date),1),IF(Rpt_Period="الفصل الدراسي",IFERROR(INDEX(TermStart,MATCH(Rpt_Date,TermStart,1)),YearStart),YearStart))))', "dd/mm/yyyy"),
            ("Rpt_PEnd", "نهاية الفترة", '=IF(Rpt_Period="يوم",Rpt_Date,IF(Rpt_Period="الأسبوع",Rpt_PStart+6,IF(Rpt_Period="الشهر",EOMONTH(Rpt_Date,0),IF(Rpt_Period="الفصل الدراسي",IFERROR(INDEX(TermEnd,MATCH(Rpt_Date,TermStart,1)),YearEnd),YearEnd))))', "dd/mm/yyyy"),
            ("Rpt_DayIdx", "ترتيب اليوم", '=IFERROR(MATCH(Rpt_Date,Cal_Date,0),0)', None),
            ("Rpt_First", "أول يوم دوام في الفترة", '=COUNTIF(Cal_Date,"<"&Rpt_PStart)+1', None)]
    for i, (name, lab, fm, nf) in enumerate(calc):
        put(ws, f"J{2+i}", lab, f=font(8, False, MUTED), al=ALIGN_R); put(ws, f"K{2+i}", fm, f=font(8, False, MUTED), al=ALIGN_C, nf=nf)
        define(wb, name, f"{cq(ws.title)}$K${2+i}")
    put(ws, "A5", '="تقرير "&IF(Rpt_Period="يوم","يومي",IF(Rpt_Period="الأسبوع","أسبوعي",IF(Rpt_Period="الشهر","شهري",IF(Rpt_Period="الفصل الدراسي","فصلي","سنوي"))))&"  ("&TEXT(Rpt_PStart,"dd/mm/yyyy")&" – "&TEXT(Rpt_PEnd,"dd/mm/yyyy")&")   |   الصف: "&Rpt_Class', f=font(11, True, TEAL), al=ALIGN_R)
    ws.row_dimensions[5].height = 22
    put(ws, "A6", "🖨 للطباعة: اختاري نوع التقرير (يوم / الأسبوع / الشهر / الفصل / العام) والتاريخ والصف في الخلايا الصفراء ثم اضغطي Ctrl+P — الصفحة مضبوطة على A4.", f=font(8, False, MUTED, True), al=ALIGN_R)
    # summary cards
    cards = [("عدد الأطفال", "=SUM(Stu_RptIn)", None), ("الأيام المسجَّلة في الفترة", '=COUNTIFS(Cal_Date,">="&Rpt_PStart,Cal_Date,"<="&Rpt_PEnd,Cal_Reg,">0")', None),
             ("نسبة الحضور", '=IF(SUM(Stu_RTot)=0,"—",SUM(Stu_RAtt)/SUM(Stu_RTot))', "0.0%"), ("إجمالي حالات الغياب في الفترة", "=SUM(Stu_RAbs)", None),
             ('="حالات المتابعة ("&Thr_FollowUp&"+)"', '=COUNTIFS(Stu_RptIn,1,Stu_Level,">="&Thr_FollowUp)', None), ('="حالات حرجة ("&Thr_Critical&"+)"', '=COUNTIFS(Stu_RptIn,1,Stu_Level,">="&Thr_Critical)', None)]
    for j, (lab, fm, nf) in enumerate(cards):
        r = 7 + (j // 3) * 3; c = 1 + (j % 3) * 3
        for rr in (r, r + 1):
            for cc in range(c, c + 2):
                ws.cell(rr, cc).fill = fill(LIGHT); ws.cell(rr, cc).border = box(WHITE)
        put(ws, (r, c), lab, f=font(9, True, MUTED), al=Alignment(horizontal="centerContinuous", vertical="center")); ws.cell(r, c + 1).alignment = Alignment(horizontal="centerContinuous")
        put(ws, (r + 1, c), fm, f=font(16, True, NAVY), al=Alignment(horizontal="centerContinuous", vertical="center"), nf=nf); ws.cell(r + 1, c + 1).alignment = Alignment(horizontal="centerContinuous")
        ws.row_dimensions[r + 1].height = 26
    # class table
    section(ws, "A13", "ملخص الصفوف في الفترة", None, 8)
    list_header(ws, 14, 1, ["الصف", "عدد الأطفال", "نسبة الحضور", "الغياب (بدون عذر)", "غياب بعذر", '="حالات "&Thr_FollowUp&"+"', '="حالات "&Thr_Critical&"+"'])
    for k in range(NCLS):
        r = 15 + k
        put(ws, f"A{r}", f'=IF(INDEX(ClassActive,{k+1})<>"نعم","",IF(OR(Rpt_Class="الكل",Rpt_Class=INDEX(ClassList,{k+1})),INDEX(ClassList,{k+1}),""))', f=font(10, True), al=ALIGN_C, b=None)
        G = lambda e: f'=IF($A{r}="","",{e})'
        put(ws, f"B{r}", G(f'COUNTIFS(Stu_Class,$A{r},Stu_StStatus,"نشط")'), f=font(10), al=ALIGN_C, b=None)
        P, Lt, A, E = [f'SUMIFS({c},CD_Class,$A{r},CD_Date,">="&Rpt_PStart,CD_Date,"<="&Rpt_PEnd)' for c in ("CD_Pres", "CD_Late", "CD_Abs", "CD_Exc")]
        put(ws, f"C{r}", G(f'IF(({P}+{A}+{E}+{Lt})=0,"—",({P}+IF(LateAsPresent="نعم",{Lt},0))/({P}+{A}+{E}+{Lt}))'), f=font(10, True, TEAL), al=ALIGN_C, b=None, nf="0.0%")
        put(ws, f"D{r}", G(A), f=font(10), al=ALIGN_C, b=None); put(ws, f"E{r}", G(E), f=font(10), al=ALIGN_C, b=None)
        put(ws, f"F{r}", G(f'COUNTIFS(Stu_Class,$A{r},Stu_StStatus,"نشط",Stu_Level,">="&Thr_FollowUp)'), f=font(10), al=ALIGN_C, b=None)
        put(ws, f"G{r}", G(f'COUNTIFS(Stu_Class,$A{r},Stu_StStatus,"نشط",Stu_Level,">="&Thr_Critical)'), f=font(10), al=ALIGN_C, b=None)
    ws.conditional_formatting.add("G15:G21", FormulaRule(formula=['AND($G15<>"",$G15>0)'], fill=fill(RED_F), font=Font(name=FONT, bold=True, color=RED_T)))
    # cases
    section(ws, "A24", "أهم الحالات التي تحتاج إلى متابعة (مرتبة حسب إجمالي الغياب)", None, 8)
    list_header(ws, 25, 1, ["اسم الطفل", "الصف", "إجمالي الغياب", "نسبة الحضور", "المستوى", "تم التواصل؟", "الإجراء المطلوب"])
    ws.merge_cells("G25:H25")
    for k in range(1, 16):
        r = 25 + k
        idx = f"IFERROR(MATCH(LARGE(Stu_KeyRpt,{k}),Stu_KeyRpt,0),\"\")"
        put(ws, f"J{r}", f"={idx}", f=font(8, False, MUTED), al=ALIGN_C)
        G = lambda e: f'=IF($J{r}="","",{e})'
        put(ws, f"A{r}", G(f"INDEX(Stu_Name,$J{r})"), f=font(10, True), al=ALIGN_R, b=None)
        put(ws, f"B{r}", G(f"INDEX(Stu_Class,$J{r})"), f=font(10), al=ALIGN_C, b=None)
        put(ws, f"C{r}", G(f"INDEX(Stu_Abs,$J{r})"), f=font(10, True), al=ALIGN_C, b=None)
        put(ws, f"D{r}", G(f"INDEX(Stu_Rate,$J{r})"), f=font(10), al=ALIGN_C, b=None, nf="0.0%")
        put(ws, f"E{r}", G(f"INDEX(Stu_Status,$J{r})"), f=font(10, True), al=ALIGN_C, b=None)
        put(ws, f"F{r}", G(f"INDEX(Stu_Contacted,$J{r})"), f=font(10, True), al=ALIGN_C, b=None)
        put(ws, f"G{r}", G(f"INDEX(Stu_Action,$J{r})"), f=font(9), al=ALIGN_R, b=None); ws.merge_cells(f"G{r}:H{r}")
        put(ws, f"K{r}", G(f"INDEX(Stu_Level,$J{r})"), f=font(8, False, MUTED), al=ALIGN_C)
    ws.conditional_formatting.add("A26:H40", FormulaRule(formula=['AND($K26<>"",$K26>=Thr_Critical)'], fill=fill(RED_F), font=Font(name=FONT, bold=True, color=RED_T), stopIfTrue=True))
    ws.conditional_formatting.add("E26:E40", FormulaRule(formula=['AND($K26<>"",$K26=Thr_High)'], fill=fill(DORG_F), font=Font(name=FONT, bold=True, color=DORG_T)))
    ws.conditional_formatting.add("E26:E40", FormulaRule(formula=['AND($K26<>"",$K26=Thr_Repeated)'], fill=fill(ORG_F), font=Font(name=FONT, bold=True, color=ORG_T)))
    ws.conditional_formatting.add("E26:E40", FormulaRule(formula=['AND($K26<>"",$K26=Thr_FollowUp)'], fill=fill(YEL_F), font=Font(name=FONT, bold=True, color=YEL_T)))
    ws.conditional_formatting.add("F26:F40", FormulaRule(formula=['$F26="لا"'], fill=fill(ORG_F), font=Font(name=FONT, bold=True, color=ORG_T)))
    put(ws, "A41", '=IF(COUNT(Stu_KeyRpt)=0,"لا توجد حالات تحتاج إلى متابعة ✓",IF(COUNT(Stu_KeyRpt)>15,"تُعرض أول 15 حالة من أصل "&COUNT(Stu_KeyRpt)&" – القائمة الكاملة في ورقة «قائمة المتابعة»",""))', f=font(9, False, MUTED, True), al=ALIGN_R)
    # ---- period day-by-day breakdown (daily / weekly / monthly)
    R = "Rpt_Class"
    section(ws, "A44", "تفصيل أيام الفترة (للتقرير اليومي والأسبوعي والشهري)", None, 8)
    list_header(ws, 45, 1, ["التاريخ", "اليوم", "المسجَّلون", "الحاضرون", "غياب بدون عذر", "غياب بعذر", "متأخر", "نسبة الحضور"])
    show = 'OR(Rpt_Period="يوم",Rpt_Period="الأسبوع",Rpt_Period="الشهر")'
    for k in range(1, 24):
        r = 45 + k
        put(ws, f"A{r}", f'=IF({show},IFERROR(IF(INDEX(Cal_Date,Rpt_First+{k-1})>Rpt_PEnd,"",INDEX(Cal_Date,Rpt_First+{k-1})),""),"")', f=font(9, True), al=ALIGN_C, b=None, nf="dd/mm/yyyy")
        put(ws, f"B{r}", f'=IF(A{r}="","",INDEX(Cal_Day,MATCH(A{r},Cal_Date,0)))', f=font(9), al=ALIGN_C, b=None)
        P = class_counts(R, "P", f"A{r}"); A = class_counts(R, "A", f"A{r}"); E = class_counts(R, "E", f"A{r}"); Lt = class_counts(R, "L", f"A{r}")
        put(ws, f"C{r}", f'=IF(A{r}="","",{P}+{A}+{E}+{Lt})', f=font(9), al=ALIGN_C, b=None)
        put(ws, f"D{r}", f'=IF(A{r}="","",{P}+{Lt})', f=font(9), al=ALIGN_C, b=None)
        put(ws, f"E{r}", f'=IF(A{r}="","",{A})', f=font(9), al=ALIGN_C, b=None)
        put(ws, f"F{r}", f'=IF(A{r}="","",{E})', f=font(9), al=ALIGN_C, b=None)
        put(ws, f"G{r}", f'=IF(A{r}="","",{Lt})', f=font(9), al=ALIGN_C, b=None)
        put(ws, f"H{r}", f'=IF(OR(A{r}="",C{r}=0),"",(D{r}-IF(LateAsPresent="نعم",0,G{r}))/C{r})', f=font(9, True, TEAL), al=ALIGN_C, b=None, nf="0.0%")
    ws.conditional_formatting.add("A46:H68", FormulaRule(formula=['AND($A46<>"",$C46=0)'], font=Font(name=FONT, color=MUTED, italic=True)))
    put(ws, "A69", f'=IF({show},IF(COUNT(A46:A68)=0,"لا توجد أيام دوام في هذه الفترة",""),"— هذا الجدول للتقارير اليومية والأسبوعية والشهرية فقط —")', f=font(9, False, MUTED, True), al=ALIGN_R)
    # ---- absentees of the selected day (daily report)
    section(ws, "A71", "الغائبون والمتأخرون في يوم التقرير (للتقرير اليومي)", None, 8)
    put(ws, "A72", '=IF(Rpt_Period<>"يوم","— هذه القائمة تظهر عند اختيار نوع التقرير «يوم» —",IF(Rpt_DayIdx=0,"⚠ التاريخ ليس يوم دوام",IF(COUNT(Stu_RAbsSeq)=0,"لا يوجد غائبون في هذا اليوم ✓","إجمالي الغائبين: "&COUNT(Stu_RAbsSeq)&" (بدون عذر: "&COUNTIFS(Stu_RptIn,1,Stu_RToday,"A")&" – بعذر: "&COUNTIFS(Stu_RptIn,1,Stu_RToday,"E")&") – المتأخرون: "&COUNTIFS(Stu_RptIn,1,Stu_RToday,"L"))))', f=font(9, True, ORG_T), al=ALIGN_R)
    list_header(ws, 73, 1, ["اسم الطفل", "الصف", "حالة اليوم", "إجمالي الغياب", "مستوى المتابعة", "تم التواصل؟", "رقم ولي الأمر"])
    ws.merge_cells("G73:H73")
    for k in range(1, 31):
        r = 73 + k
        idx = f'IFERROR(MATCH({k},Stu_RAbsSeq,0),"")'
        put(ws, f"J{r}", f'=IF(Rpt_Period="يوم",{idx},"")', f=font(8, False, MUTED), al=ALIGN_C)
        G = lambda e: f'=IF($J{r}="","",{e})'
        put(ws, f"A{r}", G(f"INDEX(Stu_Name,$J{r})"), f=font(10, True), al=ALIGN_R, b=None)
        put(ws, f"B{r}", G(f"INDEX(Stu_Class,$J{r})"), f=font(10), al=ALIGN_C, b=None)
        put(ws, f"C{r}", G(f'INDEX(StatusLabels,MATCH(INDEX(Stu_RToday,$J{r}),StatusCodes,0))'), f=font(10, True), al=ALIGN_C, b=None)
        put(ws, f"D{r}", G(f"INDEX(Stu_Abs,$J{r})"), f=font(10, True), al=ALIGN_C, b=None)
        put(ws, f"E{r}", G(f"INDEX(Stu_Status,$J{r})"), f=font(9, True), al=ALIGN_C, b=None)
        put(ws, f"F{r}", G(f"INDEX(Stu_Contacted,$J{r})"), f=font(10, True), al=ALIGN_C, b=None)
        put(ws, f"G{r}", G(f"INDEX(Stu_Phone,$J{r})"), f=font(10), al=ALIGN_C, b=None); ws.merge_cells(f"G{r}:H{r}")
    ws.conditional_formatting.add("C74:C103", FormulaRule(formula=['$C74="غياب بدون عذر"'], fill=fill(ABS_F), font=Font(name=FONT, bold=True, color=ABS_T)))
    ws.conditional_formatting.add("C74:C103", FormulaRule(formula=['$C74="غياب بعذر"'], fill=fill(EXC_F), font=Font(name=FONT, color=EXC_T)))
    ws.conditional_formatting.add("E74:E103", FormulaRule(formula=['ISNUMBER(SEARCH("حرجة",$E74))'], fill=fill(RED_F), font=Font(name=FONT, bold=True, color=RED_T)))
    ws.conditional_formatting.add("E74:E103", FormulaRule(formula=['ISNUMBER(SEARCH("⚠",$E74))'], fill=fill(YEL_F), font=Font(name=FONT, bold=True, color=YEL_T)))
    ws.conditional_formatting.add("F74:F103", FormulaRule(formula=['$F74="لا"'], fill=fill(ORG_F), font=Font(name=FONT, bold=True, color=ORG_T)))
    put(ws, "A104", '=IF(COUNT(Stu_RAbsSeq)>30,"تُعرض أول 30 حالة من أصل "&COUNT(Stu_RAbsSeq),"")', f=font(9, False, MUTED, True), al=ALIGN_R)
    # ---- signatures & approval (end of the document)
    approval_block(ws, "A107", "A108", "A109", size=11)
    put(ws, "A110", "التوقيع: ______________________", f=font(9, False, MUTED), al=ALIGN_R)
    principal_block(ws, "G107", "G108", "G110", size=11)
    for rr in range(107, 111): ws.row_dimensions[rr].height = 20
    thin = Border(left=side(), right=side(), top=side(), bottom=side())
    for rg, first in [("A15:G21", "$A15"), ("A26:H40", "$A26"), ("A46:H68", "$A46"), ("A74:H103", "$A74")]:
        ws.conditional_formatting.add(rg, FormulaRule(formula=[f'{first}<>""'], border=thin))
    ws.print_area = "A1:H111"
    ws.print_title_rows = "1:3"
    ws.page_setup.orientation = "portrait"; ws.page_setup.paperSize = ws.PAPERSIZE_A4
    ws.page_setup.fitToWidth = 1; ws.page_setup.fitToHeight = 0; ws.sheet_properties.pageSetUpPr.fitToPage = True
    ws.page_margins = PageMargins(left=0.5, right=0.5, top=0.6, bottom=0.6)
    ws.print_options.horizontalCentered = True
    ws.oddFooter.center.text = "&A – &D"
    protect(ws)
    return ws


GUIDE = [
    ("h", "دليل الاستخدام السريع"),
    ("p", "هذا الملف نظام متكامل لمتابعة وتحليل الحضور والغياب لقسم الروضة الأولى KG1. الإدخال اليومي يتم في ورقة كل صف، وكل ما عداه (لوحة المتابعة، القوائم، السجلات، التقارير) يُحدَّث تلقائيًا."),
    ("h2", "الإعداد مرة واحدة في بداية العام"),
    ("s", "1. افتحي ورقة «الإعدادات» وراجعي اسم المدرسة والعام الدراسي وحدود التنبيه (3 / 5 / 10 / 15) والفصول الدراسية والعطلات الرسمية."),
    ("s", "2. في ورقة كل صف (KG1-1 … KG1-7) الأطفال مُدخلون مرة واحدة: الرقم الطلابي، الاسم، رقم التواصل (قائمة منسدلة بأرقام ولي الأمر) واسم ولي الأمر. لا تكرري الأسماء في أي ورقة أخرى."),
    ("s", "3. طفل انسحب أو انتقل؟ امسحي رقمه الطلابي واسمه من ورقة الصف فيخرج من كل الإحصائيات. طفل جديد؟ اكتبيه في أول سطر فارغ."),
    ("s", "4. الصفوف السبعة KG1-1 … KG1-7 جاهزة. لإيقاف صف (دمج أو إغلاق): في «الإعدادات» غيّري «مفعّل» إلى لا وأخفي ورقته؛ يمكن إعادة تفعيله في أي وقت دون فقد البيانات."),
    ("h2", "الاستخدام اليومي (أقل من دقيقة لكل صف)"),
    ("s", "الخطوة 1: افتحي ورقة الصف؛ تُفتح مباشرة على أعمدة الأيام بجانب الأسماء. للانتقال: «عمود اليوم»، أو اختاري التاريخ في «الانتقال إلى تاريخ»، أو اختاري الأسبوع في «الانتقال إلى أسبوع» (أسابيع الإجازة معلَّمة) ثم اضغطي الرابط."),
    ("s", "الإدخال بأثر رجعي: لكل يوم دراسي عمود جاهز منذ بداية العام، فيمكن تسجيل غياب أي يوم سابق؛ وما دام التاريخ ضمن «الحصر مكتمل حتى» يُعتبر الباقون حاضرين."),
    ("s", "الخطوة 2: كل خانات الحضور تبدأ بـ «حاضر». في عمود اليوم غيّري حالة من غاب من القائمة المنسدلة إلى «غياب بعذر» أو «غياب بدون عذر» أو «متأخر»."),
    ("s", "الخطوة 3: خانة «الحصر مكتمل حتى» أعلى الورقة: تُحتسب فقط أيام الدوام حتى هذا التاريخ (الأيام بعده لا تدخل في أي إحصائية ولو كانت «حاضر»). اتركيها فارغة ليُحتسب حتى اليوم تلقائيًا، أو ضعي تاريخًا أقدم إذا لم تُكملي حصر الأيام الأخيرة بعد."),
    ("s", "الخطوة 4: احفظي الملف، ثم افتحي «لوحة المتابعة» لمشاهدة نسب الحضور وتنبيهات اليوم ومن وصل إلى حد التنبيه."),
    ("s", "الخطوة 5: تواصلي مع أولياء الأمور المطلوبين، وسجّلي كل تواصل في ورقة «سجل التواصل» (التاريخ + الرقم الطلابي + الطريقة + النتيجة). يتحول عمود «تم التواصل؟» إلى نعم تلقائيًا."),
    ("h2", "معنى الألوان ومستويات التنبيه"),
    ("s", "أخضر: منتظم (أقل من 3 غيابات). أصفر: يحتاج متابعة (3+) – ذكّري ولي الأمر. برتقالي: غياب متكرر (5+) – ضرورة التواصل مع ولي الأمر. برتقالي داكن: غياب مرتفع (10+) – تدخل إداري مطلوب. أحمر: حالة حرجة (15+) – يظهر الطفل في قائمة «حالات الغياب الحرجة»."),
    ("s", "تُحتسب في حدود التنبيه أيام الغياب بدون عذر فقط. الغياب بعذر يُعرض في عمود مستقل ويؤثر على نسبة الحضور. المتأخر يُعتبر حاضرًا (يمكن تغيير ذلك في الإعدادات)."),
    ("s", "نسبة الحضور = (أيام الحضور + التأخير) ÷ الأيام المحصورة × 100. لا تُحتسب العطلات (من الإعدادات) ولا الأيام بعد تاريخ «الحصر مكتمل حتى»."),
    ("s", "«تم التواصل؟» = نعم إذا سُجِّل تواصل بتاريخ يساوي أو يلي تاريخ بلوغ الطفل مستواه الحالي؛ فإذا ارتفع مستواه بعد التواصل يعود إلى «لا» ليُطلب تواصل جديد."),
    ("h2", "الأوراق"),
    ("s", "لوحة المتابعة: مؤشرات اليوم، التنبيهات اليومية، نسبة الحضور العامة حسب الفترة (اليوم/الأسبوع/الشهر/الفصل/العام)، مقارنة الصفوف، الأعلى حضورًا، من يحتاج دعمًا، الحالات الحرجة. اختيار صف معين يحدّث كل الأرقام."),
    ("s", "الحضور اليومي: مراجعة حالة أي يوم لأي صف والانتقال السريع إلى عمود التسجيل. | قائمة المتابعة: كل من بلغ 3 غيابات أو أكثر مرتبين حسب الأولوية. | سجل الغياب: كل حالة غياب في سطر مستقل مع الفلاتر. | ملف الطفل: اختيار اسم لعرض ملفه وتقويم حضوره الشهري."),
    ("s", "الاتجاهات: التحليل اليومي والأسبوعي والشهري والفصلي. | التقرير: خانة الطباعة – تقرير يومي (مع قائمة غائبي اليوم) أو أسبوعي أو شهري (مع تفصيل الأيام) أو فصلي أو سنوي، لكل الصفوف أو صف محدد، مضبوط على A4 ويُطبع بـ Ctrl+P. | الطلاب + التقويم + قاعدة البيانات: أوراق تلقائية للتحليل، لا تحتاج إلى إدخال."),
    ("h2", "الحماية والأخطاء الشائعة"),
    ("s", "الأوراق محمية بدون كلمة مرور؛ الخلايا الصفراء فقط قابلة للتعديل. لإلغاء الحماية عند الحاجة: مراجعة ← إلغاء حماية الورقة."),
    ("s", "لا تُدرجي ولا تحذفي صفوفًا أو أعمدة داخل أوراق الصفوف؛ استخدمي الصفوف الثلاثين الجاهزة بالترتيب. الأعمدة المخفية بعد «ملاحظات» حسابات مساعدة وأرقام الهواتف الإضافية."),
    ("s", "الرقم الطلابي يجب أن يكون فريدًا؛ يرفض الملف الرقم المكرر ويلوّنه بالأحمر. حالة الحضور تُختار من القائمة فقط."),
    ("s", "عند فتح الملف في Excel قد يظهر «تمكين التحرير» أو «تمكين المحتوى» – اضغطيه ليتم حساب المعادلات. الملف لا يحتوي على وحدات ماكرو."),
]

def build_guide(wb):
    ws = wb.create_sheet(SHEETS["guide"])
    setup_sheet(ws, tab="9CA3AF")
    ws.column_dimensions["A"].width = 130
    r = 1
    for kind, text in GUIDE:
        if kind == "h":
            put(ws, f"A{r}", text, f=font(18, True, NAVY), al=ALIGN_R); ws.row_dimensions[r].height = 30
        elif kind == "h2":
            r += 1; put(ws, f"A{r}", text, f=font(12, True, TEAL), al=ALIGN_R, b=Border(bottom=side(TEAL, "medium"))); ws.row_dimensions[r].height = 24
        elif kind == "p":
            put(ws, f"A{r}", text, f=font(10), al=ALIGN_RW); ws.row_dimensions[r].height = 34
        else:
            put(ws, f"A{r}", text, f=font(10), al=ALIGN_RW); ws.row_dimensions[r].height = 18 * (1 + len(text) // 120)
        r += 1
    put(ws, f"A{r+1}", '=HYPERLINK("#\'لوحة المتابعة\'!A1","⬅ العودة إلى لوحة المتابعة")', f=font(11, True, "1D4ED8"), al=ALIGN_R)
    protect(ws)
    return ws
