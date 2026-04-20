/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#EEEFFE',
          100: '#DFE0FD',
          200: '#C2C4FB',
          300: '#9EA2F8',
          400: '#7A80F4',
          500: '#5E6AD2',
          600: '#4B55B5',
          700: '#3B4399',
          800: '#2C327C',
          900: '#1E2260',
        },
        surface: {
          bg:       '#111111',
          card:     '#191919',
          hover:    '#222222',
          border:   'rgba(255,255,255,0.06)',
          elevated: '#1A1A1A',
        },
        ink: {
          primary:   '#EDEDED',
          secondary: '#9B9B9B',
          tertiary:  '#6B6B6B',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'Menlo', 'monospace'],
      },
      letterSpacing: {
        'heading': '-0.03em',
        'tight': '-0.02em',
      },
      borderRadius: {
        'card': '12px',
      },
      boxShadow: {
        'card':  '0 1px 2px rgba(0,0,0,0.3)',
        'float': '0 8px 40px rgba(0,0,0,0.4)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s cubic-bezier(0.16,1,0.3,1)',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { opacity: '0', transform: 'translateY(10px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
}
