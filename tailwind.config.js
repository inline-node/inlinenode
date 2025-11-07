/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Light mode
        base: "#F5F7FA",
        surface: "#FFFFFF",
        text: "#121212",
        textDim: "#5C5C5C",
        accent: "#00C7C0",
        lime: "#A1C900",
        border: "#DADDE2",

        // Dark mode
        darkBase: "#0E0E0E",
        darkSurface: "#161616",
        darkText: "#E6E6E6",
        darkTextDim: "#A0A0A0",
        darkAccent: "#00FFFA",
        darkLime: "#A9DF05",
        darkBorder: "#2A2A2A",
      },
      fontFamily: {
        sans: ["Lexend"],
      },
    },
  },
  plugins: [],
};
