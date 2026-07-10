/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#FFF5F0',
          100: '#FFE8DA',
          200: '#FFC8A8',
          300: '#FFA675',
          400: '#FF8A4A',
          500: '#FF6B35',
          600: '#E55A2B',
          700: '#CC4A22',
          800: '#B23B1A',
          900: '#8F2E14',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
