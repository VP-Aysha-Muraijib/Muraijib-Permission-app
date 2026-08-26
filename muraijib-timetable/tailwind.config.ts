import type { Config } from 'tailwindcss';

/**
 * الألوان كلها تشير إلى CSS Variables في app/tokens.css.
 * تغيير الهوية البصرية لاحقًا يتم من ملف واحد، لا من عشرات المكوّنات.
 */
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: 'var(--brand-primary)',
          soft: 'var(--brand-primary-soft)',
          tint: 'var(--brand-primary-tint)',
          ink: 'var(--brand-primary-ink)',
        },
        accent: {
          DEFAULT: 'var(--brand-accent)',
          soft: 'var(--brand-accent-soft)',
        },
        canvas: 'var(--surface-canvas)',
        surface: {
          DEFAULT: 'var(--surface)',
          raised: 'var(--surface-raised)',
          sunken: 'var(--surface-sunken)',
        },
        line: {
          DEFAULT: 'var(--border)',
          strong: 'var(--border-strong)',
        },
        ink: {
          DEFAULT: 'var(--text)',
          muted: 'var(--text-muted)',
          faint: 'var(--text-faint)',
          invert: 'var(--text-invert)',
        },
        ok: { DEFAULT: 'var(--ok)', soft: 'var(--ok-soft)' },
        warn: { DEFAULT: 'var(--warn)', soft: 'var(--warn-soft)' },
        danger: { DEFAULT: 'var(--danger)', soft: 'var(--danger-soft)' },
        info: { DEFAULT: 'var(--info)', soft: 'var(--info-soft)' },
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        DEFAULT: 'var(--radius)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        raised: 'var(--shadow-raised)',
        overlay: 'var(--shadow-overlay)',
      },
      fontFamily: {
        sans: ['var(--font-arabic)', 'system-ui', 'sans-serif'],
        numeric: ['var(--font-numeric)', 'var(--font-arabic)', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
    },
  },
  plugins: [],
};

export default config;
