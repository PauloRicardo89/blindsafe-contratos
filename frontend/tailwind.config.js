/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          dark:  "#18322e",
          dark2: "#23443e",
          gold:  "#b28a4a",
          goldh: "#9b763c",
          bg:    "#ede4d6",
          card:  "#faf4ea",
          muted: "#7a7060",
        },
      },
      fontFamily: {
        sans: ["Segoe UI", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
}
