import type { Config } from "tailwindcss";

/**
 * Design tokens (design-taste rules):
 * - Accent: ONE locked accent — emerald. No purple/violet ("AI lila") anywhere.
 * - Neutrals: slate, single temperature across the whole app.
 * - Shape lock: controls rounded-lg (8px), panels rounded-xl/2xl, badges rounded-full.
 */
export default {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#ecfdf5",
          100: "#d1fae5",
          200: "#a7f3d0",
          300: "#6ee7b7",
          400: "#34d399",
          500: "#10b981",
          600: "#059669",
          700: "#047857",
          800: "#065f46",
          900: "#064e3b",
        },
      },
      fontFamily: {
        sans: ["var(--font-outfit)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      keyframes: {
        "card-flip": {
          "0%": { transform: "rotateY(0deg)" },
          "50%": { transform: "rotateY(90deg)" },
          "100%": { transform: "rotateY(0deg)" },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
