/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2563EB',
          hover: '#1E40AF',
          light: '#EFF6FF',
        },
        success: {
          DEFAULT: '#16A34A',
          light: '#F0FDF4',
        },
        error: {
          DEFAULT: '#DC2626',
          light: '#FEF2F2',
        },
        warning: {
          DEFAULT: '#F59E0B',
          light: '#FFFBEB',
        },
        state: {
          gsl: '#2563EB',
          moderated: '#16A34A',
          unmoderated: '#EA580C',
          voting: '#9333EA',
          suspension: '#6B7280',
        }
      },
      fontFamily: {
        mono: ['"Roboto Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}
