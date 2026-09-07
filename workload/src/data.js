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
    principal: 'د. اليازية الظاهري',   principalEn: 'Dr. Alyazia Al Dhaheri',
    deputy:    'عائشة النعيمي',        deputyEn:    'Aisha Al Nuaimi'
  };

  /* الشعب: الخامس 7 · السادس 7 · السابع 7 · الثامن 6 = 27 شعبة (أُلغيت الشعبة المتقدّمة) */
  A.SECTIONS = (function () {
    const spec = { 5:{gen:7,adv:0}, 6:{gen:7,adv:0}, 7:{gen:7,adv:0}, 8:{gen:6,adv:0} };
    const out = [];
    [5,6,7,8].forEach(g => {
      for (let i=1;i<=spec[g].gen;i++) out.push({ id:g+'/'+i, grade:g, label:String(i), track:'general' });
      if (spec[g].adv) out.push({ id:g+'/ADV', grade:g, label:'ADV', track:'advanced' });
    });
    return out;
  })();

  A.GRADE_NAME    = { 5:'الصف الخامس', 6:'الصف السادس', 7:'الصف السابع', 8:'الصف الثامن' };
  A.GRADE_NAME_EN = { 5:'Grade 5', 6:'Grade 6', 7:'Grade 7', 8:'Grade 8' };

  /* عدد الحصص الأسبوعية لكل شعبة — الخطة الدراسية الوزارية 2026/2027 (صفوف 5-8) */
  A.SUBJECTS = [
    { id:'islamic',    nameAr:'التربية الإسلامية',                     nameEn:'Islamic Education',   periods:{general:3, advanced:3} },
    { id:'arabic',     nameAr:'اللغة العربية',                          nameEn:'Arabic Language',     periods:{general:5, advanced:5} },
    { id:'social',     nameAr:'الدراسات الاجتماعية والتربية الأخلاقية', nameEn:'Social & Moral Studies', periods:{general:2, advanced:2} },
    { id:'english',    nameAr:'اللغة الإنجليزية',                       nameEn:'English Language',    periods:{general:5, advanced:5}, lang:'en' },
    { id:'math',       nameAr:'الرياضيات',                              nameEn:'Mathematics',         periods:{general:7, advanced:7}, lang:'en' },
    { id:'science',    nameAr:'العلوم',                                 nameEn:'Science',             periods:{general:6, advanced:7}, lang:'en' },
    { id:'ai_tech',    nameAr:'الذكاء الاصطناعي والتكنولوجيا (CCDI)',   nameEn:'AI & Technology (CCDI)', periods:{general:2, advanced:2} },
    { id:'pe',         nameAr:'التربية البدنية والصحية',                nameEn:'Physical & Health Ed',periods:{general:2, advanced:2} },
    { id:'arts',       nameAr:'الفنون (بصرية وسمعية ودراما)',            nameEn:'Arts',                periods:{general:2, advanced:1} },
    { id:'french',     nameAr:'اللغة الفرنسية (اللغة الثالثة)',          nameEn:'French — Third Language',  periods:{general:2, advanced:2}, lang:'en' }
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
        { teacher:'بشرى الكعبي',        sections: ['5/6','5/7'].concat(R(6,1,4)), isNew:true },
        { teacher:'جميلة صبيح الكعبي',  sections: ['6/5','6/6','6/7','7/6','7/7'] },
        { teacher:'موزة سالم',          sections: R(7,1,5) },
        { teacher:'صفية الهاشمي',       sections: R(8,1,6), isNew:true }
      ]
    },

    arabic: {
      coordinator: 'شيخة الشامسي',
      rows: [
        { teacher:'راوية الظاهري', sections: R(5,1,4) },
        { teacher:'سلامة العامري', sections: ['5/5','7/1','7/2','7/3'] },
        { teacher:'موزة الشامسي',  sections: ['5/6','7/4','7/5','7/6'] },
        { teacher:'منى الظاهري',   sections: ['5/7','8/4','8/5','8/6'] },
        { teacher:'جميلة الدرمكي', sections: ['6/1','6/2','6/6','6/7'] },
        { teacher:'عائشة الغيثي',  sections: ['6/3','6/4','6/5','7/7'] },
        { teacher:'شيخة الشامسي',  sections: R(8,1,3) }
      ]
    },

    social: {
      coordinator: 'الهن الأحبابي',
      note: 'كل معلمة تُدرّس تسع شعب بنصاب موحّد 18 حصة.',
      rows: [
        { teacher:'مريم العتيبة', sections: R(5,1,7).concat(['6/1','6/2']) },
        { teacher:'الهن العفاري', sections: ['6/3','6/4'].concat(R(7,1,7)) },
        { teacher:'زلفة الظاهري', sections: ['6/5','6/6','6/7'].concat(R(8,1,6)) }
      ]
    },

    english: {
      coordinator: 'شمسة عزيز', coordinatorEn: 'Shamsa Aziz',
      rows: [
        { teacher:'روبين',        teacherEn:'Robyn',          sections: R(5,1,5) },
        { teacher:'ناعمة الكعبي', teacherEn:'Naema Al Kaabi', sections: ['5/6','5/7','7/6','7/7'] },
        { teacher:'شمسة عزيز',    teacherEn:'Shamsa Aziz',    sections: R(7,1,4) },
        { teacher:'فريال فياض',   teacherEn:'Ferial Fayyad',  sections: ['7/5','8/4','8/5','8/6'] },
        { teacher:'آمنة الشامسي', teacherEn:'Amna Al Shamsi', sections: ['6/7','8/1','8/2','8/3'] },
        { teacher:'*', vacancy:true, sections: R(6,1,6),
          note:'شاغر — الحاجة إلى معلمة لتغطية شعب الصف السادس الستّ',
          noteEn:'Vacant — a teacher is needed to cover the six Grade 6 classes' }
      ]
    },

    math:       { coordinator:'Ms. Raheela', rows: [
        { teacher:'Ms. Namarig',   sections: R(5,1,3) },
        { teacher:'Ms. Maha',      sections: ['5/5','5/6','5/7'], isNew:true },
        { teacher:'Ms. Oumama',    sections: ['5/4','6/1','6/2','6/3'] },
        { teacher:'Ms. Sheejamol', sections: R(6,4,7) },
        { teacher:'Ms. Samya',     sections: R(7,1,3) },
        { teacher:'Ms. Sumaya',    sections: R(7,4,7) },
        { teacher:'Ms. Raheela',   sections: R(8,1,3) },
        { teacher:'Ms. Kanna',     sections: R(8,4,6) }
      ] },

    science: {
      coordinator: 'أنيتا', coordinatorEn: 'Anita',
      rows: [
        { teacher:'هند زيدان',     teacherEn:'Hind Zidan',       sections: ['5/1','5/2','5/3','5/7'] },
        { teacher:'صالحة السبوسي', teacherEn:'Salha Al Sabusi',  sections: ['5/4','5/5','5/6'] },
        { teacher:'دارين محمد',    teacherEn:'Darin Mohamed',    sections: R(6,1,4) },
        { teacher:'فاطمة صبحي',    teacherEn:'Fatima Sobhi',     sections: ['6/5','7/5','7/6','7/7'] },
        { teacher:'رُدينة',        teacherEn:'Rodaina',          sections: ['6/6','6/7','8/5','8/6'], isNew:true },
        { teacher:'أنيتا',         teacherEn:'Anita',            sections: R(7,1,4) },
        { teacher:'مها النعيمي',   teacherEn:'Maha Alnuaimi',    sections: R(8,1,4) }
      ]
    },

    /* CCDI — الذكاء الاصطناعي والتكنولوجيا · تُدرَّس ببلوك من حصتين متتاليتين */
    ai_tech:    { coordinator:'Suhaila Alkatbi',
      note:'المادة تشمل الذكاء الاصطناعي وCCDI معاً، وتُدرَّس ببلوك من حصتين متتاليتين لكل شعبة.',
      rows: [
        { teacher:'Hissa Alsabusi', sections: R(5,1,7).concat(R(7,1,3)) },
        { teacher:'Suhaila Alkatbi', sections: R(6,1,7).concat(['7/4']) },
        { teacher:'Hissa Al Ahbabi', sections: R(7,5,7).concat(R(8,1,6)) }
      ] },

    pe:         { coordinator:'',
      note:'تُدرَّس لشعبتين معاً في الحصة الواحدة، فالحصص الفعلية على جدول المعلمة 16 لدعاء مصطفى و14 لسندس. وتُدرَّس حصة الجوجيتسو ضمنها: ديانا للخامس والسابع، وجاك للسادس والثامن.',
      rows: [
        { teacher:'دعاء مصطفى', sections: R(5,1,7).concat(R(7,1,7)) },
        { teacher:'سندس',       sections: R(6,1,7).concat(R(8,1,6)) }
      ] },

    arts:       { coordinator:'أمل القبيسي', coordinatorTitle:'منسّقة الأنشطة',
      note:'كل تخصّص يغطّي مراحل محدّدة: البصرية للخامس، والسمعية للسابع، والدراما للسادس، والثامن مقسوم بين التخصّصات الثلاثة.',
      rows: [
        { teacher:'أمل القبيسي', role:'الفنون البصرية', sections: R(5,1,7).concat(['8/1','8/2']) },
        { teacher:'جيهان العسلي', role:'الفنون السمعية', sections: R(7,1,7).concat(['8/3','8/4']) },
        { teacher:'صابرين', role:'الدراما', sections: R(6,1,7).concat(['8/5','8/6']) }
      ] },

    french:     { coordinator:'',
      note:'تُدرَّس لجميع صفوف المدرسة: حكيمة للخامس والسابع، وهيبة للسادس والثامن.',
      noteEn:'Taught across all school grades: Hakima for Grades 5 and 7, Hiba for Grades 6 and 8.',
      rows: [
        { teacher:'حكيمة', teacherEn:'Hakima',      sections: R(5,1,7).concat(R(7,1,7)) },
        { teacher:'هيبة',  teacherEn:'Hiba Ghabri', sections: R(6,1,7).concat(R(8,1,6)) }
      ] }
  };

})(window.APP);
