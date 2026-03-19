/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./**/*.tsx", "./**/*.ts"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        heading: ["Space Grotesk", "sans-serif"],
        body: ["Inter", "sans-serif"]
      },
      colors: {
        primary: {
          50: "#f0f4ff",
          100: "#e0e9ff",
          200: "#c7d6fe",
          300: "#a4b9fc",
          400: "#8294f7",
          500: "#667eea",
          600: "#5464d6",
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
          500: "#8b5cf6",
          600: "#7c3aed",
          700: "#6d28d9",
          800: "#5b21b6",
          900: "#4c1d95"
        },
        surface: {
          DEFAULT: "#ffffff",
          muted: "#f3f4f6",
          subtle: "#f9fafb"
        },
        canvas: "#F5F3EF",
        ink: {
          DEFAULT: "#1a1a1a",
          muted: "#888888",
          subtle: "#AAAAAA"
        },
        accent: {
          DEFAULT: "#C05A3C",
          light: "#E8E4DC"
        },
        border: "#1a1a1a",
        "border-muted": "#E8E4DC"
      },
      letterSpacing: {
        widest: "0.15em"
      }
    },
    plugins: []
  }
}
