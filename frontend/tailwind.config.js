/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ide: {
          bg: '#1e1e1e',
          sidebar: '#252526',
          activity: '#333333',
          accent: '#007acc',
          text: '#cccccc',
        }
      }
    },
  },
  plugins: [],
}