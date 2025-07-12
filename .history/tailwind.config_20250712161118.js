/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./app/**/*.{js,ts,jsx,tsx}",
    "./src/**/*.{js,ts,jsx,tsx}", // include if using src folder structure
  ],
  theme: {
    extend: {},
  },
  plugins: [],
  darkMode: "class", // optional: for dark mode toggle
};
