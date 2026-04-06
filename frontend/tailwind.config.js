/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#ECFEFF',
          100: '#CFFAFE',
          200: '#A5F3FC',
          300: '#67E8F9',
          400: '#22D3EE',
          500: '#06B6D4',
          600: '#0891B2',
          700: '#0E7490',
          800: '#155E75',
          900: '#164E63',
        },
        primary: {
          50:  '#ECFEFF',
          100: '#CFFAFE',
          200: '#A5F3FC',
          300: '#67E8F9',
          400: '#22D3EE',
          500: '#06B6D4',
          600: '#0891B2',
          700: '#0E7490',
          800: '#155E75',
          900: '#164E63',
          950: '#083344',
        },
        surface: {
          bg:     '#0A0F1C',
          card:   '#111827',
          hover:  '#1E293B',
          border: '#1E293B',
        },
        ink: {
          primary:   '#F1F5F9',
          secondary: '#94A3B8',
          tertiary:  '#64748B',
        },
        gold: {
          300: '#FCD34D',
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#D97706',
        },
      },
      fontFamily: {
        display: ['Inter', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
        sans:    ['Inter', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
      },
      borderRadius: {
        'card': '16px',
        'pill': '999px',
      },
      boxShadow: {
        'card':       '0 0 0 1px rgba(30,41,59,0.8), 0 4px 12px rgba(0,0,0,0.3)',
        'card-hover': '0 0 0 1px rgba(6,182,212,0.3), 0 8px 30px rgba(0,0,0,0.4)',
        'float':      '0 24px 60px rgba(0,0,0,0.5)',
        'glow':       '0 0 20px rgba(6,182,212,0.15)',
        'glow-lg':    '0 0 40px rgba(6,182,212,0.2)',
      },
      backgroundImage: {
        'hero-mesh': 'radial-gradient(at 27% 37%, rgba(6,182,212,0.08) 0, transparent 50%), radial-gradient(at 97% 21%, rgba(59,130,246,0.06) 0, transparent 50%), radial-gradient(at 52% 99%, rgba(16,185,129,0.05) 0, transparent 50%)',
        'grid-pattern': 'linear-gradient(rgba(30,41,59,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(30,41,59,0.5) 1px, transparent 1px)',
      },
      backgroundSize: {
        'grid': '40px 40px',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'pulse-slow': 'pulse 4s ease-in-out infinite',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { opacity: '0', transform: 'translateY(16px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        glowPulse: { '0%, 100%': { boxShadow: '0 0 20px rgba(6,182,212,0.15)' }, '50%': { boxShadow: '0 0 40px rgba(6,182,212,0.3)' } },
      },
    },
  },
  plugins: [],
}
