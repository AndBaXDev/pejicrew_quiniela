/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        metal: {
          950: '#080808',
          900: '#111111',
          800: '#1a1a1a',
          700: '#242424',
          600: '#2e2e2e',
          500: '#3d3d3d',
          400: '#555555',
          300: '#888888',
          200: '#bbbbbb',
          100: '#e8e8e8',
        },
        blood: {
          900: '#3d0000',
          800: '#5c0000',
          700: '#7a0000',
          600: '#990000',
          500: '#bb1100',
          400: '#dd2200',
          300: '#ff4422',
        },
      },
      fontFamily: {
        metal: ['"Bebas Neue"', 'system-ui', 'sans-serif'],
        display: ['"Oswald"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

