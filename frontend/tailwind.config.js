/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Inspired by Linear's palette — near-black with a single accent
        brand: {
          50:  '#F0FDFA',
          100: '#CCFBF1',
          200: '#99F6E4',
          300: '#5EEAD4',
          400: '#2DD4BF',
          500: '#14B8A6',
          600: '#0D9488',
          700: '#0F766E',
          800: '#115E59',
          900: '#134E4A',
        },
        surface: {
          bg:     '#09090B',
          card:   '#0F0F12',
          hover:  '#18181B',
          border: '#27272A',
          elevated: '#1C1C1F',
        },
        ink: {
          primary:   '#FAFAFA',
          secondary: '#A1A1AA',
          tertiary:  '#71717A',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      borderRadius: {
        'card': '12px',
        'pill': '999px',
      },
      boxShadow: {
        'card':       '0 0 0 1px rgba(39,39,42,0.8)',
        'card-hover': '0 0 0 1px rgba(39,39,42,1), 0 4px 16px rgba(0,0,0,0.4)',
        'glow':       '0 0 24px rgba(20,184,166,0.1)',
        'glow-lg':    '0 0 60px rgba(20,184,166,0.12)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { opacity: '0', transform: 'translateY(8px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
}
