/** @type {import('tailwindcss').Config} */
module.exports = {
  important: true,
  content: ['./src/renderer/**/*.{html,js,vue}'],
  darkMode: 'selector',
  theme: {
    extend: {}
  },
  plugins: [require('daisyui')],
  daisyui: {
    themes: false,
    darkTheme: 'dark',
    base: true,
    styled: true,
    utils: true,
    prefix: '',
    logs: true,
    themeRoot: ':root'
  }
};
