/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // XDIGIX Dark Theme Colors
        navy: {
          900: '#0a0b1a',
          800: '#0f1025',
          700: '#1a1b3e',
          600: '#2d2f5a',
          500: '#3d4068'
        },
        primary: {
          DEFAULT: '#fbbf24',
          400: '#fcd34d',
          500: '#fbbf24',
          600: '#f59e0b'
        },
        accent: '#fbbf24',
        success: '#10b981',
        danger: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6'
      },
      fontFamily: {
        sans: ['"Inter"', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif']
      },
      boxShadow: {
        card: '0 16px 32px -12px rgba(0, 0, 0, 0.4)',
        glow: '0 0 30px rgba(251, 191, 36, 0.2)',
        'glow-lg': '0 0 50px rgba(251, 191, 36, 0.3)'
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem'
      },
      animation: {
        'float': 'float 20s ease-in-out infinite',
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out'
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translate(0, 0) rotate(0deg)' },
          '33%': { transform: 'translate(30px, -30px) rotate(5deg)' },
          '66%': { transform: 'translate(-20px, 20px) rotate(-5deg)' }
        },
        fadeIn: {
          from: { opacity: 0 },
          to: { opacity: 1 }
        },
        slideUp: {
          from: { opacity: 0, transform: 'translateY(10px)' },
          to: { opacity: 1, transform: 'translateY(0)' }
        }
      },
      backgroundImage: {
        'grid-pattern': `
          linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)
        `
      }
    }
  },
  plugins: [require('@tailwindcss/forms')]
};
