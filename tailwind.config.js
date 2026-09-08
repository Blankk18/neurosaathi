/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // NeuroSaathi palette — calm sage-teal + warm gold + warm mandarin.
        // Revaluing these tokens re-skins every page in the app automatically.
        brand: {
          50: '#f2f6f4',
          100: '#e0ebe7',
          200: '#c2d8d1',
          300: '#9abcb1',
          400: '#6f9e90',
          500: '#518372',
          600: '#406b5e',
          700: '#36584e',
          800: '#2d4840',
          900: '#263c36',
        },
        warm: {
          50: '#fbf7ef',
          100: '#f5ecdb',
          200: '#ead8b4',
          300: '#ddbe88',
          400: '#d0a361',
          500: '#c28c46',
          600: '#a8743a',
          700: '#8a5c31',
          800: '#704b2c',
          900: '#5c3f27',
        },
        accent: {
          50: '#fef5ee',
          100: '#fde7d5',
          200: '#facda8',
          300: '#f6a96f',
          400: '#f08641',
          500: '#e96a22',
          600: '#d05216',
          700: '#ad4014',
          800: '#8c3516',
          900: '#722e15',
        },
        info: {
          50: '#f0f5fa',
          100: '#dde9f4',
          200: '#c0d6ea',
          300: '#97bbdd',
          400: '#6b9dcb',
          500: '#4d83b8',
          600: '#3b6a9e',
          700: '#335681',
          800: '#2d496b',
          900: '#293e5a',
        },
        danger: {
          50: '#fbf1f1',
          100: '#f6dfdf',
          200: '#ecc4c4',
          300: '#df9e9e',
          400: '#d17373',
          500: '#c25353',
          600: '#ae4040',
          700: '#913535',
          800: '#782f2f',
          900: '#652c2c',
        },
        // Warm off-white used as the app canvas behind everything.
        canvas: '#f6f5f1',
      },
      fontFamily: {
        // Nunito body + script fallbacks for हिन्दी / বাংলা / ગુજરાતી.
        sans: [
          'Nunito',
          'Noto Sans Devanagari',
          'Noto Sans Bengali',
          'Noto Sans Gujarati',
          'Mukta',
          'Segoe UI',
          'system-ui',
          'sans-serif',
        ],
        // Fraunces — warm editorial serif for display/headings.
        display: [
          'Fraunces',
          'Noto Serif Devanagari',
          'Noto Serif Bengali',
          'Noto Serif Gujarati',
          'Georgia',
          'serif',
        ],
      },
      borderRadius: {
        // Calm, refined radii — generous but not squishy.
        xl2: '1.75rem',
        '3xl': '1.25rem',
      },
      boxShadow: {
        // Softer, layered shadows on the brand tone.
        soft: '0 1px 3px rgba(38,60,54,0.05)',
        card: '0 1px 2px rgba(38,60,54,0.04), 0 4px 16px rgba(38,60,54,0.06)',
        lift: '0 2px 6px rgba(38,60,54,0.06), 0 14px 34px rgba(38,60,54,0.12)',
        float: '0 4px 12px rgba(38,60,54,0.10), 0 24px 48px rgba(38,60,54,0.16)',
      },
      fontSize: {
        // Generous sizes — elderly-readable by default.
        '2xl': '1.6rem',
        '3xl': '2.05rem',
        '4xl': '2.6rem',
        '5xl': '3.1rem',
        '6xl': '3.6rem',
      },
    },
  },
  plugins: [],
};
