'use client';

import * as React from 'react';

/**
 * بديل next/link للنسخة أحادية الملف.
 *
 * التنقّل بالمسار (History API) لا يعمل في صفحة مستضافة بلا خادم يعيد كتابة المسارات،
 * فيُستخدم التنقّل بالتجزئة (#/...) — وهو ما يجعل الروابط قابلة للمشاركة والرجوع للخلف.
 */
export default function Link({
  href,
  children,
  ...rest
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  return (
    <a href={`#${href}`} {...rest}>
      {children}
    </a>
  );
}
