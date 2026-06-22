/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
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
      backgroundImage: {
        "hero-soft":
          "linear-gradient(135deg, rgba(236,253,245,0.95) 0%, rgba(255,255,255,0.92) 42%, rgba(209,250,229,0.35) 100%)",
        "hero-soft-dark":
          "linear-gradient(135deg, rgba(6,78,59,0.45) 0%, rgba(17,24,39,0.95) 48%, rgba(4,120,87,0.25) 100%)",
      },
    },
  },
  plugins: [],
};
