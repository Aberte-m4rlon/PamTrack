/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#C9182B',
          deep: '#B51224',
          secondary: '#C9182B',
          charcoal: '#343039',
          soft: '#E9E5E8',
          rose: '#F8E7EA',
          pearl: '#F7F3EF',
          blush: '#F8E7EA',
          ink: '#29262B',
          muted: '#777078',
          subtle: '#777078',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: '#C9182B',
          foreground: '#FFFFFF',
        },
        secondary: {
          DEFAULT: '#343039',
          foreground: '#FFFFFF',
        },
        accent: {
          DEFAULT: '#F8E7EA',
          foreground: '#29262B',
        },
        destructive: {
          DEFAULT: '#C9182B',
          foreground: '#FFFFFF',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', '"Inter"', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', '"Inter"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.25rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        glass: '0 14px 36px -8px rgba(41, 38, 43, 0.14), 0 4px 14px rgba(181, 18, 36, 0.08)',
        'glass-lg':
          '0 22px 52px -12px rgba(41, 38, 43, 0.18), inset 0 1.5px 0 rgba(255, 255, 255, 0.92)',
      },
      backdropBlur: {
        glass: '18px',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
