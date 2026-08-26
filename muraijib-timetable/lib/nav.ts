export interface NavItem {
  href: string;
  label: string;
  /** مفتاح الأيقونة في lucide-react. */
  icon: string;
  /** يُعرض عداد بجانب البند (مثل عدد التعارضات). */
  counter?: 'conflicts' | 'underload';
}

export const NAV: Array<{ section?: string; items: NavItem[] }> = [
  {
    items: [
      { href: '/', label: 'الرئيسية', icon: 'LayoutDashboard' },
      { href: '/timetable', label: 'الجدول المدرسي', icon: 'CalendarRange' },
    ],
  },
  {
    section: 'البيانات',
    items: [
      { href: '/teachers', label: 'المعلمات', icon: 'Users' },
      { href: '/classes', label: 'الصفوف والشعب', icon: 'School' },
      { href: '/subjects', label: 'المواد', icon: 'BookOpen' },
      { href: '/workload', label: 'الأنصبة', icon: 'Gauge', counter: 'underload' },
    ],
  },
  {
    section: 'الإدارة',
    items: [
      { href: '/agent', label: 'مساعد الجدول الذكي', icon: 'Sparkles' },
      { href: '/conflicts', label: 'التعارضات', icon: 'TriangleAlert', counter: 'conflicts' },
      { href: '/analytics', label: 'التحليلات', icon: 'ChartColumn' },
      { href: '/print', label: 'مركز الطباعة', icon: 'Printer' },
    ],
  },
  {
    section: 'السجل',
    items: [
      { href: '/versions', label: 'النسخ', icon: 'GitBranch' },
      { href: '/audit', label: 'سجل التغييرات', icon: 'ScrollText' },
      { href: '/import', label: 'استيراد البيانات', icon: 'Upload' },
      { href: '/settings', label: 'الإعدادات', icon: 'Settings' },
    ],
  },
];
