/* ============================================================================
   data.js — بيانات توزيع الأنصبة · مدرسة مريجب للتعليم الأساسي ح2 · 2026-2027
   النطاق: الصفوف 5-8 · مسار اللغة الثالثة · 28 شعبة
   ========================================================================== */
window.APP = window.APP || {};
(function (A) {
  'use strict';

  A.SCHOOL = {
    nameAr: 'مدرسة مريجب للتعليم الأساسي ح2',
    nameEn: 'Muraijib School C 2',
    year:   '2026 - 2027',
    standardLoad: 24,        // النصاب المعياري للمعلمة
    overloadThreshold: 30,   // ما فوقه يُعدّ نصاباً مرتفعاً جداً ويُرفع به تنبيه
    principal: 'د. اليازية الظاهري',
    deputy: 'عائشة النعيمي'
  };

  /* الشعب: الخامس 7 · السادس 7 + متقدم · السابع 7 · الثامن 6 = 28 شعبة */
  A.SECTIONS = (function () {
    const spec = { 5:{gen:7,adv:0}, 6:{gen:7,adv:1}, 7:{gen:7,adv:0}, 8:{gen:6,adv:0} };
    const out = [];
    [5,6,7,8].forEach(g => {
      for (let i=1;i<=spec[g].gen;i++) out.push({ id:g+'/'+i, grade:g, label:String(i), track:'general' });
      if (spec[g].adv) out.push({ id:g+'/ADV', grade:g, label:'ADV', track:'advanced' });
    });
    return out;
  })();

  A.GRADE_NAME = { 5:'الصف الخامس', 6:'الصف السادس', 7:'الصف السابع', 8:'الصف الثامن' };

  /* عدد الحصص الأسبوعية لكل شعبة — الخطة الدراسية الوزارية 2026/2027 (صفوف 5-8) */
  A.SUBJECTS = [
    { id:'islamic',    nameAr:'التربية الإسلامية',                     nameEn:'Islamic Education',   periods:{general:3, advanced:3} },
    { id:'arabic',     nameAr:'اللغة العربية',                          nameEn:'Arabic Language',     periods:{general:5, advanced:5} },
    { id:'social',     nameAr:'الدراسات الاجتماعية والتربية الأخلاقية', nameEn:'Social & Moral Studies', periods:{general:2, advanced:2} },
    { id:'english',    nameAr:'اللغة الإنجليزية',                       nameEn:'English Language',    periods:{general:5, advanced:5} },
    { id:'math',       nameAr:'الرياضيات',                              nameEn:'Mathematics',         periods:{general:7, advanced:7} },
    { id:'science',    nameAr:'العلوم',                                 nameEn:'Science',             periods:{general:6, advanced:7} },
    { id:'ai_tech',    nameAr:'الذكاء الاصطناعي والتكنولوجيا (CCDI)',   nameEn:'AI & Technology (CCDI)', periods:{general:2, advanced:2} },
    { id:'pe',         nameAr:'التربية البدنية والصحية',                nameEn:'Physical & Health Ed',periods:{general:2, advanced:2} },
    { id:'arts',       nameAr:'الفنون (بصرية وسمعية ودراما)',            nameEn:'Arts',                periods:{general:2, advanced:1}, rotating:true },
    { id:'french',     nameAr:'اللغة الفرنسية (اللغة الثالثة)',          nameEn:'French — Third Language',  periods:{general:2, advanced:2}, grades:[6,7,8] },
    { id:'chinese',    nameAr:'اللغة الصينية (اللغة الثالثة)',           nameEn:'Chinese — Third Language', periods:{general:2, advanced:2}, grades:[5] }
  ];

  /* مساعد: توليد مدى شعب */
  function R(g, from, to) { const a=[]; for (let i=from;i<=to;i++) a.push(g+'/'+i); return a; }

  /* ── التوزيع كما ورد في مستندات المدرسة ────────────────────────────────
     rows: [{ teacher, sections:[...] }]  — النصاب يُحسب آلياً              */
  A.DISTRIBUTION = {

    islamic: {
      coordinator: 'مريم خليفة الدرمكي',
      rows: [
        { teacher:'مريم خليفة الدرمكي', sections: R(5,1,5) },
        { teacher:'جميلة صبيح الكعبي',  sections: R(6,1,5) },
        { teacher:'بشرى الكعبي',        sections: ['5/6','5/7','6/6','6/7','6/ADV'], isNew:true },
        { teacher:'صفية الهاشمي',       sections: R(7,1,7), isNew:true },
        { teacher:'موزة سالم',          sections: R(8,1,6) }
      ]
    },

    arabic: {
      coordinator: '',
      rows: [
        { teacher:'شيخة الشامسي',  sections: R(8,1,4) },
        { teacher:'منى الظاهري',   sections: ['8/5','8/6','6/1','6/2'] },
        { teacher:'سلامة العامري', sections: ['7/1','7/2','7/3','5/5'] },
        { teacher:'موزة الشامسي',  sections: ['7/4','7/5','7/6','5/6'] },
        { teacher:'عائشة الغيثي',  sections: ['6/3','6/4','6/5','7/7'] },
        { teacher:'جميلة الدرمكي', sections: ['6/6','6/7','6/ADV','5/7'] },
        { teacher:'راوية الظاهري', sections: R(5,1,4) }
      ]
    },

    social: {
      coordinator: '',
      note: 'تم توزيع مرحلة الصف السابع بين المعلمات.',
      rows: [
        { teacher:'الهن العفاري', sections: R(6,1,7).concat(['6/ADV','7/3','7/4']) },
        { teacher:'زلفة الظاهري', sections: R(8,1,6).concat(['7/1','7/2']),
          note:'المستند يذكر نصاباً (22) بينما الشعب المسندة = 16 حصة' },
        { teacher:'مريم العتيبة', sections: R(5,1,7).concat(['7/5','7/6','7/7']) }
      ]
    },

    english: {
      coordinator: 'فريال فياض',
      rows: [
        { teacher:'ناعمة الكعبي',        sections: ['7/6','7/7','8/1','8/2'] },
        { teacher:'دعاء',                sections: ['5/6','5/7','6/1','6/2','6/3'], isNew:true },
        { teacher:'شمسة',                sections: R(7,1,5) },
        { teacher:'آمنة',                sections: ['6/4','6/5','6/6','6/7'] },
        { teacher:'فريال فياض',          sections: ['8/3','8/4','6/ADV'], note:'منسقة القسم' },
        { teacher:'روبين',               sections: R(5,1,5) },
        { teacher:'*', vacancy:true, sections: ['8/5','8/6'],
          note:'الحاجة إلى معلمة إضافية لتغطية هاتين الشعبتين' }
      ]
    },

    science: {
      coordinator: '',
      rows: [
        { teacher:'هند زيدان',    sections: ['5/1','5/2','5/3','6/ADV'] },
        { teacher:'صالحة السبوسي', sections: ['5/4','5/5','5/6','5/7'] },
        { teacher:'دارين', sections: R(6,1,4) },
        { teacher:'فاطمة', sections: ['6/5','7/5','7/6','7/7'] },
        { teacher:'أنيثا', sections: R(7,1,4) },
        { teacher:'مها',   sections: R(8,1,4) },
        { teacher:'رُدينة', sections: ['6/6','6/7','8/5','8/6'], isNew:true,
          note:'معلمة جديدة — أُسندت إليها الشعب التي كانت مُعلَّمة بـ X في المقترح الأصلي' }
      ]
    },

    /* أقسام بانتظار البيانات — الصفحات جاهزة والشعب مُدرجة */
    math:       { coordinator:'', rows: [
        { teacher:'Ms. Namarig', sections: R(5,1,4) },
        { teacher:'Ms. Maha',    sections: ['5/5','5/6','5/7'], isNew:true },
        { teacher:'Ms. Oumama',  sections: R(6,1,4) },
        { teacher:'Ms. Sheeja',  sections: ['6/5','6/6','6/7','6/ADV'] },
        { teacher:'Ms. Sumaia',  sections: ['7/4','7/5','7/6','7/7'] },
        { teacher:'Ms. Samia',   sections: ['7/1','7/2','7/3'] },
        { teacher:'Ms. Rahila',  sections: ['8/1','8/2','8/3'] },
        { teacher:'Ms. Kanna',   sections: ['8/4','8/5','8/6'] }
      ] },
    /* CCDI — الذكاء الاصطناعي والتكنولوجيا (الحوسبة والتصميم الإبداعي والابتكار)
       شعب الصف السابع السبع موزّعة 3 + 1 + 3؛ أرقام الشعب لم تُحدَّد في المصدر
       فوُزّعت بالتسلسل — قابلة للتعديل من زر «تعديل».                            */
    ai_tech:    { coordinator:'',
      note:'المادة تشمل الذكاء الاصطناعي وCCDI معاً. أرقام شعب الصف السابع وُزّعت بالتسلسل (3 + 1 + 3) لعدم تحديدها في المصدر.',
      rows: [
        { teacher:'Hessa Alsubousi', sections: R(5,1,7).concat(['7/1','7/2','7/3']) },
        { teacher:'Suhaila Alketbi', sections: R(6,1,7).concat(['6/ADV','7/4']) },
        { teacher:'Hessa Alahbabi',  sections: R(8,1,6).concat(['7/5','7/6','7/7']) }
      ] },
    pe:         { coordinator:'', rows: [
        { teacher:'دعاء مصطفى', sections: R(5,1,7).concat(R(7,1,7)) },
        { teacher:'سندس',       sections: R(6,1,7).concat(['6/ADV'], R(8,1,6)) }
      ] },
    /* الفنون — ثلاث معلمات بتخصّصات مختلفة وتناوب أسبوعي على الشعب نفسها.
       حصتا الشعبة تُتقاسَمان بين معلمات التخصّصات المتاحة لذلك الصف،
       فالنصاب المعروض هو حصّة كل معلمة من التناوب (المجموع 55 حصة).
       الدراما للصفوف العليا (السابع والثامن) فقط.                             */
    arts:       { coordinator:'',
      note:'تناوب أسبوعي: حصتا الفنون لكل شعبة تُتقاسَم بين معلمات التخصّصات. البصرية والسمعية لجميع الصفوف، والدراما للصفين السابع والثامن.',
      rows: [
        { teacher:'أمل القبيسي', role:'الفنون البصرية',
          sections: R(5,1,7).concat(R(6,1,7), ['6/ADV'], R(7,1,7), R(8,1,6)) },
        { teacher:'جيهان', role:'الفنون السمعية',
          sections: R(5,1,7).concat(R(6,1,7), ['6/ADV'], R(7,1,7), R(8,1,6)) },
        { teacher:'صابرين', role:'الدراما',
          sections: R(7,1,7).concat(R(8,1,6)),
          note:'الصفوف العليا فقط (السابع والثامن)' }
      ] },

    /* اللغة الفرنسية — الصفوف 6 إلى 8 (21 شعبة). أرقام شعب السابع لم تُحدَّد في
       المصدر فقُسِّمت 3 + 4 بحيث تبقى كل معلمة في صفّين متقاربين.               */
    french:     { coordinator:'',
      note:'تُدرَّس للصفوف السادس والسابع والثامن. أرقام شعب الصف السابع وُزّعت بالتسلسل لعدم تحديدها في المصدر.',
      rows: [
        { teacher:'هيبة',  sections: R(6,1,7).concat(['6/ADV','7/1','7/2','7/3']) },
        { teacher:'حكيمة', sections: R(8,1,6).concat(['7/4','7/5','7/6','7/7']) }
      ] },

    /* اللغة الصينية — الصف الخامس فقط (7 شعب). اسم المعلمة لم يُزوَّد بعد. */
    chinese:    { coordinator:'',
      note:'تُدرَّس للصف الخامس فقط. اسم المعلمة لم يُزوَّد بعد — يُضاف من زر «تعديل».',
      rows: [
        { teacher:'(معلمة اللغة الصينية — لم يُحدَّد الاسم)', sections: R(5,1,7) }
      ] }
  };

})(window.APP);
