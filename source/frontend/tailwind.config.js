/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
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
      fontFamily: {
        serif: ['Playfair Display', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      boxShadow: {
        soft: '0 2px 12px rgba(74, 46, 26, 0.08)',
        card: '0 4px 24px rgba(74, 46, 26, 0.10)',
        gold: '0 2px 12px rgba(212, 162, 97, 0.25)',
      },
      spacing: {
        safe: 'env(safe-area-inset-bottom)',
      },
      keyframes: {
        dropdown: {
          from: { opacity: '0', transform: 'translateY(-8px) scale(0.97)' },
          to:   { opacity: '1', transform: 'translateY(0)   scale(1)' },
        },
      },
      animation: {
        dropdown: 'dropdown 0.15s ease-out forwards',
      },
    },
  },
  plugins: [],
}
