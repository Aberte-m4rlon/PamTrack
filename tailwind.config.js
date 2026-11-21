/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#176B4B',
          secondary: '#24966A',
          emerald: '#10B981',
          mint: '#DFF7E8',
          ink: '#183329',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: '#176B4B',
          foreground: '#FFFFFF',
        },
        secondary: {
          DEFAULT: '#24966A',
          foreground: '#FFFFFF',
        },
        accent: {
          DEFAULT: '#DFF7E8',
          foreground: '#183329',
        },
        destructive: {
          DEFAULT: '#DC2626',
          foreground: '#FFFFFF',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', '"Inter"', 'system-ui', 'sans-serif'],
        display: ['"Outfit"', '"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.25rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        glass: '0 10px 35px -5px rgba(23, 107, 75, 0.16), 0 4px 12px rgba(24, 51, 41, 0.08)',
        'glass-lg': '0 20px 50px -10px rgba(23, 107, 75, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.55)',
      },
      backdropBlur: {
        glass: '18px',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
