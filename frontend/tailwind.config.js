/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'mv-bg':       '#0A0E17',
        'mv-surface':  '#111827',
        'mv-border':   '#1F2937',
        'mv-teal':     '#00E5CC',
        'mv-amber':    '#FFB300',
        'mv-danger':   '#FF1744',
        'mv-safe':     '#00E676',
        'mv-tier1':    '#00C853',
        'mv-tier2':    '#69F0AE',
        'mv-tier3':    '#FFD600',
        'mv-tier4':    '#FF6D00',
        'mv-tier5':    '#D50000',
      },
      fontFamily: {
        'mono':  ['"IBM Plex Mono"', 'monospace'],
        'sans':  ['"DM Sans"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
