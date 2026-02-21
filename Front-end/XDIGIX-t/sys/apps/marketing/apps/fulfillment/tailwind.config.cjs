/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        navy: { 900: '#0a0b1a', 800: '#0f1025', 700: '#1a1b3e' },
      },
    },
  },
  plugins: [],
};
