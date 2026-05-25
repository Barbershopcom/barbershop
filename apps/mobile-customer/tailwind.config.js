/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [
    require('nativewind/preset'),
    require('@barbearia/design-tokens/tailwind-preset'),
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
