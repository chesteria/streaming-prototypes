import type { Config } from 'tailwindcss';

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'v2-bg': '#0F1923',
        'v2-card-bg': '#1A2A3A',
        'v2-surface': '#2A3A4A',
        'v2-accent': 'var(--v2-accent-color, #ff5500)',
        'v2-text-primary': '#FFFFFF',
        'v2-text-secondary': '#8899AA',
        'v2-text-tertiary': '#667788',
        'v2-focus-border': 'rgba(255, 255, 255, 0.4)',
        'v2-focus-btn-bg': '#FFFFFF',
        'v2-focus-btn-text': '#0F1923',
      },
      fontFamily: {
        roboto: ['Roboto', 'sans-serif'],
      },
      spacing: {
        'nav-h': '120px',
        'content-x': '60px',
        'rail-gap': '16px',
      },
      borderRadius: {
        'tile': '12px',
      },
      transitionDuration: {
        'focus': '200ms',
        'scroll': '300ms',
        'fade': '600ms',
      },
      boxShadow: {
        'v2-focus': '0 0 0 2px rgba(255, 255, 255, 0.4), 0 0 24px rgba(255, 255, 255, 0.15)',
        'v2-card': '0 4px 24px rgba(0, 0, 0, 0.4)',
      }
    },
  },
  plugins: [],
} satisfies Config;
