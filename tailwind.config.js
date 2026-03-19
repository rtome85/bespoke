/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./**/*.tsx", "./**/*.ts"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f4ff',
          100: '#e0e9ff',
          200: '#c7d6fe',
          300: '#a4b9fc',
          400: '#8294f7',
          500: 'var(--color-brand-500)',
          600: 'var(--color-brand-600)',
          700: '#454bb8',
          800: '#3a3d94',
          900: '#323476',
        },
        secondary: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: 'var(--color-accent-500)',
          600: 'var(--color-accent-600)',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
        },
        surface: {
          DEFAULT: 'var(--color-surface)',
          subtle: 'var(--color-surface-subtle)',
          muted: 'var(--color-surface-muted)',
        },
        border: {
          DEFAULT: 'var(--color-border)',
          subtle: 'var(--color-border-subtle)',
        },
        'text-primary': 'var(--color-text-primary)',
        'text-secondary': 'var(--color-text-secondary)',
        'text-muted': 'var(--color-text-muted)',
        error: {
          DEFAULT: 'var(--color-error)',
          bg: 'var(--color-error-bg)',
          border: 'var(--color-error-border)',
        },
        'focus-ring': 'var(--color-focus-ring)',
        sidebar: 'var(--color-sidebar)',
        'sidebar-hover': 'var(--color-sidebar-hover)',
        'sidebar-divide': 'var(--color-sidebar-divide)',
        'sidebar-label': 'var(--color-sidebar-label)',
        'sidebar-item': 'var(--color-sidebar-item)',
        'sidebar-active': 'var(--color-sidebar-active)',
        'sidebar-accent': 'var(--color-sidebar-accent)',
        canvas: 'var(--color-canvas)',
        'canvas-divide': 'var(--color-canvas-divide)',
        'canvas-input-border': 'var(--color-canvas-input-border)',
        ink: 'var(--color-ink)',
        'ink-secondary': 'var(--color-ink-secondary)',
        'ink-muted': 'var(--color-ink-muted)',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        full: 'var(--radius-full)',
      },
      fontFamily: {
        base: 'var(--font-family-base)',
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        xl: 'var(--shadow-xl)',
      },
    },
    plugins: []
  }
}
