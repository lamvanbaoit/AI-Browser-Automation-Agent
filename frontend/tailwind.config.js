/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          primary: '#ffffff',
          secondary: '#f3f4f6',
          border: '#e5e7eb',
        }
      }
    },
  },
  plugins: [],
}