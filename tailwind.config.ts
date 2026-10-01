import type { Config } from "tailwindcss";

/** Channel-based var so Tailwind opacity modifiers (bg-card/80) keep working. */
function v(name: string): string {
  return `rgb(var(--tt-${name}) / <alpha-value>)`;
}

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: v("primary"),
          dark: v("primary-dark"),
          light: v("primary-light"),
          foreground: v("primary-fg"),
        },
        accent: {
          DEFAULT: v("accent"),
          dark: v("accent-dark"),
          light: v("accent-light"),
          foreground: v("accent-fg"),
        },
        clay: {
          DEFAULT: v("clay"),
          dark: v("clay-dark"),
        },
        pine: {
          DEFAULT: v("pine"),
          dark: v("pine-dark"),
        },
        background: v("bg"),
        foreground: v("fg"),
        card: v("card"),
        muted: v("muted"),
        "muted-foreground": v("muted-fg"),
        border: v("border"),
        destructive: v("destructive"),
      },
      fontFamily: {
        sans: ["Plus Jakarta Sans Variable", "Vazirmatn Variable", "Tahoma", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(31, 41, 36, 0.06), 0 8px 24px -12px rgba(28, 74, 60, 0.25)",
        pop: "0 12px 40px -12px rgba(31, 41, 36, 0.35)",
      },
    },
  },
  plugins: [],
};

export default config;
