/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Warm healthcare palette — calm greens + warm neutrals, not neon/cyber
        brand: {
          50: '#f2f6ef',
          100: '#e2ecdd',
          200: '#c6d9bd',
          300: '#a3c094',
          400: '#7fa66e',
          500: '#638c52',
          600: '#4e7040',
          700: '#3f5a35',
          800: '#34492d',
          900: '#2b3c26',
        },
        warm: {
          50: '#faf6f0',
          100: '#f3ead9',
          200: '#e6d4b5',
          300: '#d7b98a',
          400: '#c89d62',
          500: '#b98545',
        },
        accent: {
          50: '#fdeeea',
          100: '#f9d5cc',
          200: '#f2a895',
          300: '#ea7c5f',
          400: '#e2593a',
          500: '#c9442a',
        },
      },
      fontFamily: {
        sans: ['Nunito', 'Segoe UI', 'system-ui', 'sans-serif'],
        display: ['"Fredoka"', 'Nunito', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl2: '1.5rem',
      },
      boxShadow: {
        card: '0 2px 12px rgba(43,60,38,0.08)',
        lift: '0 6px 20px rgba(43,60,38,0.14)',
      },
      fontSize: {
        '2xl': '1.6rem',
        '3xl': '2rem',
        '4xl': '2.5rem',
        '5xl': '3rem',
        '6xl': '3.5rem',
      },
    },
  },
  plugins: [],
};
