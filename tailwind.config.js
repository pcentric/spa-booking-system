/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#3c2212',
          gold: '#e7ad1b',
          orange: '#bc6b38',
        },
        booking: {
          requested: '#b0d9e9',
          confirmed: '#f3e0e4',
          staff: '#ced4d8',
          roomtherapist: '#c8e6f0',
          inprogress: '#f6ece0',
          disabled: '#e8e8e8',
        },
        cardtext: '#123c22',
        pink: {
          600: '#EC4899',
        },
        blue: {
          600: '#3B82F6',
        },
      },
    },
  },
  plugins: [],
}
