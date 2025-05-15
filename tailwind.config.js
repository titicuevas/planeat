/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'breakfast': '#4ade80', // verde suave
        'lunch': '#f87171',     // rojo suave
        'dinner': '#60a5fa',    // azul suave
      }
    },
  },
  plugins: [],
} 