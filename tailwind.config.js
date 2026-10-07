/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        nkk: {
          background: '#18181B',
          panel: '#27272A',
          panelSoft: '#202024',
          red: '#EF233C',
          redDark: '#C1121F',
          pink: '#FF4D8D',
          purple: '#A78BFA',
          blue: '#60A5FA',
          white: '#FFFFFF',
          text: '#D4D4D8',
        },
        brand: {
          50: '#fdf2f8',
          100: '#fce7f3',
          200: '#fbcfe8',
          300: '#f9a8d4',
          400: '#f472b6',
          500: '#ec4899',
          600: '#db2777',
          700: '#be185d',
          800: '#9d174d',
          900: '#831843',
          950: '#500724',
        }
      },
      boxShadow: {
        soft: '0 18px 55px rgba(0, 0, 0, 0.28)',
        neon: '0 0 28px rgba(239, 35, 60, 0.28)',
        pink: '0 0 28px rgba(255, 77, 141, 0.18)',
      }
    },
  },
  plugins: [],
}
