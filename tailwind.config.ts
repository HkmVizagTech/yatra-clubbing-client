import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        gold: { DEFAULT: '#E07B00', dark: '#B85C00' },
        cream: { DEFAULT: '#FBF5E9', dark: '#F0E8D6' },
        bark: { DEFAULT: '#2A1A08', light: '#6E5C44', sidebar: '#1E1208' },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
