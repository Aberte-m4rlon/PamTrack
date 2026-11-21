/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#DC2626',
          deep: '#B91C1C',
          secondary: '#EF4444',
          soft: '#FCA5A5',
          rose: '#FFE4E6',
          blush: '#FFF1F2',
          ink: '#24191D',
          muted: '#78716C',
          subtle: '#A8A29E',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: '#DC2626',
          foreground: '#FFFFFF',
        },
        secondary: {
          DEFAULT: '#EF4444',
          foreground: '#FFFFFF',
        },
        accent: {
          DEFAULT: '#FFE4E6',
          foreground: '#24191D',
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
        glass: '0 10px 32px -6px rgba(185, 28, 28, 0.10), 0 4px 12px rgba(36, 25, 29, 0.05)',
        'glass-lg':
          '0 20px 48px -10px rgba(185, 28, 28, 0.16), inset 0 1px 0 rgba(255, 255, 255, 0.85)',
      },
      backdropBlur: {
        glass: '18px',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
