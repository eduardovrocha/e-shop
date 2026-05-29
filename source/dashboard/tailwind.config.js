/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        brand: {
          cream: '#F6E6CF',
          sand: '#E8D1B0',
          gold: '#D4A261',
          navy: '#0D2B45',
        },
        andrequice: {
          cream: '#FAF5EE',
          sand: '#E8D1B0',
          border: '#A8947D',
          gold: '#D4A261',
          copper: '#B86E2E',
          navy: '#0D2B45',
          azure: '#4C7FA3',
          brown: '#4A2E1A',
        },
      },
      boxShadow: {
        soft: '0 2px 12px rgba(74, 46, 26, 0.08)',
        card: '0 4px 24px rgba(74, 46, 26, 0.10)',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Playfair Display', 'Georgia', 'serif'],
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '20%':       { transform: 'rotate(-15deg)' },
          '60%':       { transform: 'rotate(12deg)' },
          '80%':       { transform: 'rotate(-8deg)' },
        },
        dropdown: {
          from: { opacity: '0', transform: 'translateY(-8px) scale(0.97)' },
          to:   { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up':   'accordion-up 0.2s ease-out',
        wiggle:           'wiggle 0.4s ease-in-out',
        dropdown:         'dropdown 0.15s ease-out forwards',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
