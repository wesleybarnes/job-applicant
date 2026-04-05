/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#4B9CD3',
          600: '#2563EB',
          700: '#1D4ED8',
          800: '#1E3A8A',
          900: '#1E3A5F',
          950: '#0F172A',
        },
        sky: {
          50:  '#F0F9FF',
          100: '#E0F2FE',
          300: '#7DD3FC',
          400: '#38BDF8',
          500: '#4B9CD3',
          600: '#0284C7',
        },
      },
      fontFamily: {
        display: ['Inter', 'system-ui', 'sans-serif'],
        sans:    ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'card':       '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(75,156,211,0.08)',
        'card-hover': '0 4px 32px rgba(37,99,235,0.15)',
        'blue':       '0 0 24px rgba(75,156,211,0.3)',
        'button':     '0 2px 8px rgba(37,99,235,0.3)',
      },
    },
  },
  plugins: [],
}
