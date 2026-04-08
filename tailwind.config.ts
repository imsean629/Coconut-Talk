import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './client/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        coconut: {
          shell: '#6E4D3D',
          bark: '#8B674E',
          cream: '#FFF8EF',
          foam: '#F6EAD8',
          palm: '#8FB996',
          leaf: '#588157',
          sand: '#E6D5BE',
          ink: '#2E241F',
        },
      },
      fontSize: {
        xs: ['0.58rem', { lineHeight: '0.9rem' }],
        sm: ['0.7rem', { lineHeight: '1.1rem' }],
        base: ['0.82rem', { lineHeight: '1.35rem' }],
        lg: ['0.94rem', { lineHeight: '1.45rem' }],
        xl: ['1.06rem', { lineHeight: '1.55rem' }],
        '2xl': ['1.32rem', { lineHeight: '1.8rem' }],
        '3xl': ['1.7rem', { lineHeight: '2.1rem' }],
        '4xl': ['2.05rem', { lineHeight: '2.45rem' }],
      },
      boxShadow: {
        float: '0 24px 60px rgba(74, 48, 33, 0.12)',
        soft: '0 16px 40px rgba(93, 63, 38, 0.10)',
      },
      fontFamily: {
        sans: ['"Trebuchet MS"', '"Segoe UI"', 'sans-serif'],
      },
      backgroundImage: {
        tropical:
          'radial-gradient(circle at top left, rgba(143, 185, 150, 0.22), transparent 28%), radial-gradient(circle at bottom right, rgba(230, 213, 190, 0.8), transparent 30%), linear-gradient(135deg, #fff9f0 0%, #f7ecdd 48%, #fef8f1 100%)',
      },
    },
  },
  plugins: [],
} satisfies Config;
