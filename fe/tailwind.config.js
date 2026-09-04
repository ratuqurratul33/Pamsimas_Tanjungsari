/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        pamsimas: {
          blue: '#0070A8',
          teal: '#0A9CA8',
          sky: '#0EA5E9',
        },
      },
      boxShadow: {
        'glass-glow': '0 1px 2px rgba(16, 24, 40, 0.06)',
        'card-elevated': '0 2px 6px rgba(16, 24, 40, 0.08)',
      },
      keyframes: {
        'ambient-drift': {
          '0%, 100%': { transform: 'translate3d(0, 0, 0) scale(1)' },
          '50%': { transform: 'translate3d(2.5rem, -1.75rem, 0) scale(1.08)' },
        },
      },
      animation: {
        'ambient-drift': 'ambient-drift 12s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
