/** @type {import('tailwindcss').Config} */
module.exports = {
  // 'class' (não 'media'): permite o NativeWind setar o color scheme sem
  // crashar no web ("Cannot manually set color scheme, as dark mode is type media").
  darkMode: 'class',
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
