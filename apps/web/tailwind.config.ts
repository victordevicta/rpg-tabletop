import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        obsidian: {
          950: '#0a0a0f',
          900: '#0f0f1a',
          800: '#14141f',
          700: '#1a1a2e',
          600: '#1e1e35',
          500: '#252540',
        },
        amber: {
          DEFAULT: '#b8860b',
          light: '#d4a017',
          dark: '#8b6508',
          glow: '#ffd700',
        },
        crimson: {
          DEFAULT: '#8b0000',
          light: '#a00000',
          dark: '#6b0000',
        },
      },
      fontFamily: {
        display: ['"Cinzel"', 'Georgia', 'serif'],
        body: ['"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      animation: {
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'slide-in': 'slide-in 0.2s ease-out',
      },
      keyframes: {
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 5px #b8860b40' },
          '50%': { boxShadow: '0 0 20px #b8860b80' },
        },
        'slide-in': {
          from: { transform: 'translateX(-8px)', opacity: '0' },
          to: { transform: 'translateX(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
