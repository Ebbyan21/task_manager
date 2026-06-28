/** @type {import('tailwindcss').Config} */
module.exports = {
  // Referensi konfigurasi tema (jika Anda membangun Tailwind saat produksi)
  content: ["./src/renderer/**/*.{html,js}"],
  theme: {
    extend: {
      colors: {
        // Palet warna khusus Studio Kreatif
        "studio-dark":    "#0F0F1A",
        "studio-card":    "#1A1A2E",
        "studio-border":  "#2D2D44",
        "studio-accent":  "#7C3AED", // Ungu kreatif
        "studio-accent2": "#06B6D4", // Cyan
        "studio-text":    "#E2E8F0",
        "studio-muted":   "#94A3B8",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};