/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        base: "#0E0E0E",       // main background
        surface: "#161616",    // header, panels
        text: "#E6E6E6",       // primary text
        textDim: "#A0A0A0",    // secondary text
        accent: "#00FFFA",     // cyan hints
        lime: "#A9DF05",       // lime hints
        border: "#2A2A2A",     // divider lines
      },
      fontFamily: {
        sans: ["Lexend"],      // only Lexend
      },
    },
  },
  plugins: [],
}
