/** @type {import('tailwindcss').Config} */
export default {
  content: ["./app/index.html", "./app/src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0f4f8",
          100: "#d9e2ec",
          500: "#334e68",
          600: "#243b53",
          700: "#102a43",
          900: "#0a1929",
        },
        status: {
          alarm: "#c53030",
          warning: "#d69e2e",
          process: "#3182ce",
          quality: "#805ad5",
          operator: "#38a169",
          maintenance: "#dd6b20",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
