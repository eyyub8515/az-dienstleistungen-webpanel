import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#0B0F14',
        surface: '#121821',
        border: '#1F2833',
        muted: '#94A3B8',
        accent: '#D4AF37',
      },
      boxShadow: {
        premium: '0 10px 30px rgba(0,0,0,0.25)',
      },
    },
  },
  plugins: [],
};

export default config;
