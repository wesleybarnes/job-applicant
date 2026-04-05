/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#1e0a4a',
          950: '#120630',
        },
        gold: {
          300: '#fde68a',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
        },
      },
      fontFamily: {
        display: ['Sora', 'Inter', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'glow':    '0 0 0 1px rgba(124,58,237,0.15), 0 4px 20px rgba(124,58,237,0.10)',
        'glow-lg': '0 0 0 1px rgba(124,58,237,0.2),  0 8px 40px rgba(124,58,237,0.15)',
        'gold':    '0 4px 20px rgba(245,158,11,0.25)',
      },
    },
  },
  plugins: [],
}
