import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        orange: {
          DEFAULT: '#FF7A3D',
          dark: '#E85D1A',
          light: '#FFF1E8',
        },
        ink: {
          DEFAULT: '#1F1B16',
          soft: '#5A4F45',
        },
        cream: '#FFFAF4',
        border: '#F0E4D6',
        lavender: '#8B7AB8',
        success: '#4CAF50',
      },
      fontFamily: {
        sans: ['Nunito', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        card: '16px',
        block: '24px',
        pill: '100px',
      },
      boxShadow: {
        sm: '0 2px 8px rgba(255, 122, 61, 0.08)',
        md: '0 8px 24px rgba(255, 122, 61, 0.12)',
        lg: '0 16px 48px rgba(31, 27, 22, 0.14)',
      },
    },
  },
  plugins: [],
};

export default config;
