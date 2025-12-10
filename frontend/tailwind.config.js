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
          bg: 'var(--bg-primary)',
          sidebar: 'var(--bg-secondary)',
          activity: 'var(--bg-activity)',
          accent: 'var(--accent)',
          text: 'var(--text-primary)',
          dim: 'var(--text-secondary)',
          border: 'var(--border)',
        }
      }
    },
  },
  plugins: [],
}