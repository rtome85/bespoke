/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./**/*.tsx", "./**/*.ts"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#f0f4ff",
          100: "#e0e9ff",
          200: "#c7d6fe",
          300: "#a4b9fc",
          400: "#8294f7",
          500: "var(--color-brand-500)",
          600: "var(--color-brand-600)",
          700: "#454bb8",
          800: "#3a3d94",
          900: "#323476"
        },
        secondary: {
          50: "#f5f3ff",
          100: "#ede9fe",
          200: "#ddd6fe",
          300: "#c4b5fd",
          400: "#a78bfa",
          500: "var(--color-accent-500)",
          600: "var(--color-accent-600)",
          700: "#6d28d9",
          800: "#5b21b6",
          900: "#4c1d95"
        },
        surface: {
          DEFAULT: "var(--color-surface)",
          subtle: "var(--color-surface-subtle)",
          muted: "var(--color-surface-muted)"
        },
        border: {
          DEFAULT: "var(--color-border)",
          subtle: "var(--color-border-subtle)"
        },
        "text-primary": "var(--color-text-primary)",
        "text-secondary": "var(--color-text-secondary)",
        "text-muted": "var(--color-text-muted)",
        error: {
          DEFAULT: "var(--color-error)",
          bg: "var(--color-error-bg)",
          border: "var(--color-error-border)"
        },
        "focus-ring": "var(--color-focus-ring)",
        sidebar: "var(--color-sidebar)",
        "sidebar-hover": "var(--color-sidebar-hover)",
        "sidebar-divide": "var(--color-sidebar-divide)",
        "sidebar-label": "var(--color-sidebar-label)",
        "sidebar-item": "var(--color-sidebar-item)",
        "sidebar-active": "var(--color-sidebar-active)",
        "sidebar-accent": "var(--color-sidebar-accent)",
        canvas: "var(--color-canvas)",
        "canvas-divide": "var(--color-canvas-divide)",
        "canvas-input-border": "var(--color-canvas-input-border)",
        ink: {
          DEFAULT: "var(--color-ink)",
          secondary: "var(--color-ink-secondary)",
          muted: "var(--color-ink-muted)"
        },
        "ink-secondary": "var(--color-ink-secondary)",
        "ink-muted": "var(--color-ink-muted)",
        accent: {
          DEFAULT: "var(--color-sidebar-accent)",
          light: "var(--color-canvas-divide)"
        },
        "border-muted": "var(--color-canvas-divide)",

        // ApplyAI design system (tokens in src/style.css)
        aa: {
          primary: "var(--aa-primary)",
          "primary-hover": "var(--aa-primary-hover)",
          "primary-pressed": "var(--aa-primary-pressed)",
          "primary-soft": "var(--aa-primary-soft)",
          secondary: "var(--aa-secondary)",
          success: "var(--aa-success)",
          "success-soft": "var(--aa-success-soft)",
          "success-strong": "var(--aa-success-strong)",
          warning: "var(--aa-warning)",
          "warning-soft": "var(--aa-warning-soft)",
          "warning-strong": "var(--aa-warning-strong)",
          error: "var(--aa-error)",
          "error-soft": "var(--aa-error-soft)",
          "error-strong": "var(--aa-error-strong)",
          info: "var(--aa-info)",
          purple: "var(--aa-purple)",
          "neutral-50": "var(--aa-neutral-50)",
          "neutral-100": "var(--aa-neutral-100)",
          "neutral-200": "var(--aa-neutral-200)",
          "neutral-300": "var(--aa-neutral-300)",
          "neutral-400": "var(--aa-neutral-400)",
          "neutral-500": "var(--aa-neutral-500)",
          "neutral-600": "var(--aa-neutral-600)",
          "neutral-700": "var(--aa-neutral-700)",
          "neutral-800": "var(--aa-neutral-800)",
          "neutral-900": "var(--aa-neutral-900)",
          surface: "var(--aa-surface)",
          "surface-subtle": "var(--aa-surface-subtle)",
          "surface-brand-soft": "var(--aa-surface-brand-soft)",
          border: "var(--aa-border)",
          "border-subtle": "var(--aa-border-subtle)",
          "text-primary": "var(--aa-text-primary)",
          "text-secondary": "var(--aa-text-secondary)",
          "text-on-primary": "var(--aa-text-on-primary)",
          "text-link": "var(--aa-text-link)",
          "text-disabled": "var(--aa-text-disabled)"
        }
      },
      fontFamily: {
        heading: ["Space Grotesk", "sans-serif"],
        body: ["Inter", "sans-serif"],
        base: "var(--font-family-base)",
        aa: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif"
        ]
      },
      spacing: {
        "aa-1": "var(--aa-space-1)",
        "aa-2": "var(--aa-space-2)",
        "aa-3": "var(--aa-space-3)",
        "aa-4": "var(--aa-space-4)",
        "aa-5": "var(--aa-space-5)",
        "aa-6": "var(--aa-space-6)",
        "aa-8": "var(--aa-space-8)",
        "aa-10": "var(--aa-space-10)",
        "aa-12": "var(--aa-space-12)",
        "aa-16": "var(--aa-space-16)"
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        full: "var(--radius-full)",
        "aa-sm": "var(--aa-radius-sm)",
        "aa-md": "var(--aa-radius-md)",
        "aa-lg": "var(--aa-radius-lg)",
        "aa-xl": "var(--aa-radius-xl)",
        "aa-pill": "var(--aa-radius-pill)"
      },
      fontSize: {
        "aa-h1": ["32px", { lineHeight: "40px", fontWeight: "700" }],
        "aa-h2": ["24px", { lineHeight: "32px", fontWeight: "600" }],
        "aa-h3": ["18px", { lineHeight: "28px", fontWeight: "600" }],
        "aa-body": ["16px", { lineHeight: "24px" }],
        "aa-sm": ["14px", { lineHeight: "20px" }],
        "aa-caption": ["12px", { lineHeight: "16px" }]
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        xl: "var(--shadow-xl)"
      },
      letterSpacing: {
        widest: "0.15em"
      }
    },
    plugins: []
  }
}
