/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        navy: {
          50: '#f2f6fb',
          100: '#e2ebf5',
          200: '#c3d5e8',
          300: '#94b4d4',
          400: '#5f8dbb',
          500: '#3d6fa2',
          600: '#2d5787',
          700: '#1b3a6b',
          800: '#12294d',
          900: '#0b1f3a',
        },
      },
    },
  },
  plugins: [],
}
