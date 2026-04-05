/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#EBF5FF',
          100: '#D1E9FF',
          200: '#A3D3FF',
          300: '#75BDFF',
          400: '#47A7FF',
          500: '#1877F2',   // Meta blue
          600: '#0C5FD0',
          700: '#0949A8',
          800: '#063480',
          900: '#042058',
        },
        primary: {
          50:  '#EBF5FF',
          100: '#D1E9FF',
          200: '#A3D3FF',
          300: '#75BDFF',
          400: '#47A7FF',
          500: '#1877F2',
          600: '#0C5FD0',
          700: '#0949A8',
          800: '#063480',
          900: '#042058',
          950: '#021030',
        },
        surface: {
          bg:     '#F0F2F5',
          card:   '#FFFFFF',
          hover:  '#F2F3F5',
          border: '#E4E6EA',
        },
        ink: {
          primary:   '#1C1E21',
          secondary: '#65676B',
          tertiary:  '#8A8D91',
        },
      },
      fontFamily: {
        display: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Inter', 'sans-serif'],
        sans:    ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Inter', 'sans-serif'],
      },
      borderRadius: {
        'card': '12px',
        'pill': '999px',
      },
      boxShadow: {
        'card':  '0 1px 2px rgba(0,0,0,0.1)',
        'card-hover': '0 2px 8px rgba(0,0,0,0.12)',
        'float': '0 8px 24px rgba(0,0,0,0.12)',
        'blue':  '0 0 0 2px rgba(24,119,242,0.3)',
      },
    },
  },
  plugins: [],
}
