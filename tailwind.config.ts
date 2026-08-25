import type { Config } from 'tailwindcss';

// Token values match docs/DESIGN.md's "Visual style notes" palette table.
// Colors resolve through CSS variables (defined in src/app/globals.css) so
// light/dark both work through the same Tailwind class names — see
// docs/ARCHITECTURE.md's "Styling & responsive strategy".
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        border: 'var(--border)',
        text: 'var(--text)',
        'text-secondary': 'var(--text-secondary)',
        accent: 'var(--accent)',
        'accent-ink': 'var(--accent-ink)',
        'warn-bg': 'var(--warn-bg)',
        'warn-text': 'var(--warn-text)',
      },
      borderRadius: {
        card: '12px',
      },
      fontFamily: {
        sans: ['var(--font-inter)', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['var(--font-manrope)', 'var(--font-inter)', 'sans-serif'],
      },
      maxWidth: {
        content: '640px',
      },
    },
  },
  plugins: [],
};

export default config;
