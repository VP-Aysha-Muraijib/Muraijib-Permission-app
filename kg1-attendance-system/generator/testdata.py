# -*- coding: utf-8 -*-
"""Fictional demo data: 5 classes x 20 children, 49 recorded school days (31/08/2026 - 05/11/2026)."""
import random, datetime as dt
from common import *

random.seed(2026)
BOYS = ["أحمد", "محمد", "خالد", "سلطان", "راشد", "سعيد", "حمدان", "زايد", "عبدالله", "يوسف", "عمر", "علي", "ماجد", "حمد", "منصور", "سيف", "ناصر", "فيصل", "طارق", "عبدالرحمن"]
GIRLS = ["مريم", "فاطمة", "عائشة", "شما", "ميرة", "حصة", "نورة", "سارة", "لطيفة", "موزة", "علياء", "ريم", "هند", "مهرة", "شيخة", "دانة", "غالية", "أمل", "سلامة", "جواهر"]
FATHERS = ["محمد", "أحمد", "خالد", "سالم", "راشد", "سعيد", "عبدالله", "علي", "حمد", "ناصر", "سلطان", "عمر", "يوسف", "مبارك", "جمعة", "خليفة", "عيسى", "حسن", "ماجد", "عبيد"]
FAMILIES = ["النعيمي", "المنصوري", "الشامسي", "الكعبي", "المزروعي", "الظاهري", "الحمادي", "البلوشي", "الزعابي", "السويدي", "المهيري", "الكتبي", "القبيسي", "الرميثي", "العامري", "الحوسني", "المرزوقي", "الخييلي", "الدرمكي", "الشحي"]
REC_DAYS = 49          # indices 0..48 recorded (last = Thu 05/11/2026)
TODAY_IDX = 48
CONTACT_METHODS = ["اتصال هاتفي", "رسالة نصية", "WhatsApp", "اجتماع ولي أمر", "أخرى"]

def make_students():
    """Return dict class -> list of student dicts (20 each)."""
    out = {}
    for ci in range(ACTIVE_CLASSES):
        cls = CLASSES[ci]; studs = []
        for i in range(20):
            first = (BOYS if (i + ci) % 2 == 0 else GIRLS)[(i * 3 + ci * 7) % 20]
            father = FATHERS[(i * 5 + ci * 3) % 20]; fam = FAMILIES[(i * 7 + ci * 11) % 20]
            studs.append({"id": 26000 + (ci + 1) * 100 + i + 1, "name": f"{first} {father} {fam}", "guardian": f"{father} {fam}",
                          "phone": f"05{random.choice([0,2,4,5,6])}{random.randint(1000000, 9999999)}", "status": "نشط", "join": None,
                          "grid": [None] * NDAYS, "target": None})
        out[cls] = studs
    # profiles: (class index, slot index, unexcused absences, last-absence-on-today?)
    profiles = {(0, 0): (0, False), (0, 1): (2, False), (0, 2): (3, True), (0, 3): (5, False), (0, 4): (10, False), (0, 5): (16, False),
                (1, 4): (10, True), (2, 3): (5, True), (2, 5): (15, False), (3, 19): (6, False), (4, 19): (1, False),
                (1, 0): (0, False), (2, 0): (0, False), (3, 0): (0, False), (4, 0): (0, False), (3, 5): (11, False), (4, 4): (7, False)}
    out[CLASSES[3]][19]["phone2"] = "0501234567"
    out[CLASSES[0]][0]["phone2"] = "0559876543"
    for ci in range(ACTIVE_CLASSES):
        for i, s in enumerate(out[CLASSES[ci]]):
            n_abs, today = profiles.get((ci, i), (random.choice([0, 0, 0, 1, 1, 2, 2, 3, 4]), False))
            start = 25 if s["join"] else 0
            pool = list(range(start, TODAY_IDX))      # never place random absences on "today" unless designed
            random.shuffle(pool)
            days = sorted(pool[: n_abs - (1 if today else 0)])
            if today: days.append(TODAY_IDX)
            for d in days: s["grid"][d] = "غياب بدون عذر"
            free = [d for d in range(start, REC_DAYS) if s["grid"][d] is None and d != TODAY_IDX]
            random.shuffle(free)
            n_exc = random.choice([0, 0, 0, 1, 1, 2]) if (ci, i) not in {(0, 0), (1, 0), (2, 0), (3, 0), (4, 0)} else 0
            n_late = random.choice([0, 0, 1, 1, 2, 3]) if (ci, i) not in {(0, 0)} else 0
            for d in free[:n_exc]: s["grid"][d] = "غياب بعذر"
            for d in free[n_exc:n_exc + n_late]: s["grid"][d] = "متأخر"
            # a few explicit "حاضر" entries to show the option
            if i in (1, 2):
                for d in free[n_exc + n_late:n_exc + n_late + 2]: s["grid"][d] = "حاضر"
            s["target"] = n_abs
    return out

def confirmed(ci, d):
    if d >= REC_DAYS: return False
    if ci == 4 and d == TODAY_IDX: return False     # class 5 has not completed today's count yet
    return True

def make_contacts(students):
    """List of (date, id, method, note) – dated relative to the student's absence dates."""
    def nth_abs(s, n):
        c = 0
        for d in range(NDAYS):
            if s["grid"][d] == "غياب بدون عذر":
                c += 1
                if c == n: return DATES[d]
        return None
    A = students[CLASSES[0]]; C = students[CLASSES[2]]; D = students[CLASSES[3]]
    logs = []
    logs.append((nth_abs(A[3], 5) + dt.timedelta(days=1), A[3]["id"], "اتصال هاتفي", "تم التواصل مع الأم – وعدت بالانتظام"))
    logs.append((nth_abs(A[4], 3) + dt.timedelta(days=1), A[4]["id"], "رسالة نصية", "تذكير بالانتظام"))
    logs.append((nth_abs(A[5], 5), A[5]["id"], "WhatsApp", "لم يرد – إعادة المحاولة"))
    logs.append((nth_abs(A[5], 15) + dt.timedelta(days=1), A[5]["id"], "اجتماع ولي أمر", "اجتماع مع الوالد – ظروف عائلية، تم الاتفاق على خطة انتظام"))
    logs.append((nth_abs(C[5], 10) + dt.timedelta(days=1), C[5]["id"], "اتصال هاتفي", "تم إبلاغ ولي الأمر بضرورة الانتظام"))
    logs.append((nth_abs(D[5], 3) + dt.timedelta(days=2), D[5]["id"], "اتصال هاتفي", "سبب الغياب: مرض – تم طلب تقرير طبي"))
    logs.sort(key=lambda x: x[0])
    return logs
