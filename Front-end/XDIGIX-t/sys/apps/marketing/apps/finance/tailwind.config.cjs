/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#27491F',
        accent: '#FFD300',
        base: '#F4F4F4',
        'madas-text': '#231f20',
        success: '#1B7C54',
        danger: '#E03C31',
        info: '#2563EB'
      },
      fontFamily: {
        sans: ['"Inter"', 'ui-sans-serif', 'system-ui']
      },
      boxShadow: {
        card: '0 16px 32px -12px rgba(35, 31, 32, 0.25)'
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.5rem'
      }
    }
  },
  plugins: [require('@tailwindcss/forms')]
};

