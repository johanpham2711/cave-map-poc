import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      colors: {
        // Deep ocean / cave palette
        abyss: {
          950: "#020B12",
          900: "#03111E",
          800: "#051C2E",
          700: "#072840",
        },
        biolum: {
          400: "#22D3EE",  // cyan glow
          500: "#06B6D4",
          600: "#0891B2",
        },
        coral: {
          400: "#FB923C",
          500: "#F97316",
        },
      },
      backgroundImage: {
        "abyss-radial":
          "radial-gradient(ellipse at center, #051C2E 0%, #020B12 100%)",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in": "fadeIn 0.4s ease-out",
        "slide-up": "slideUp 0.35s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
