/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: '#3e4095',
          'blue-dark': '#2c2e6d',
          'blue-light': '#f0f2fb',
          'blue-subtle': '#e4e7f8',
          red: '#ed3237',
          'red-dark': '#c82126',
          'red-light': '#fef1f2',
          'red-subtle': '#fde2e3',
        },
      },
      borderRadius: {
        DEFAULT: '3px',
        sm: '3px',
        md: '3px',
        lg: '3px',
        xl: '3px',
        '2xl': '3px',
        '3xl': '3px',
        full: '9999px',
        none: '0',
      },
      fontFamily: {
        sans: ['Inter', 'Be Vietnam Pro', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.07), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
        'elevated': '0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
        'glow-blue': '0 0 15px rgba(62, 64, 149, 0.25)',
        'glow-red': '0 0 15px rgba(237, 50, 55, 0.25)',
      },
      animation: {
        'fade-in': 'fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-up': 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-down': 'slideDown 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'scale-in': 'scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'pulse-subtle': 'pulseSubtle 2s infinite ease-in-out',
        'wiggle': 'wiggle 1s ease-in-out infinite',
        'stamp': 'stamp 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
        'modal-in': 'modalIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'modal-out': 'modalOut 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'backdrop-in': 'backdropIn 0.25s ease-out forwards',
        'backdrop-out': 'backdropOut 0.2s ease-in forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        modalIn: {
          '0%': { opacity: '0', transform: 'scale(0.95) translateY(12px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        modalOut: {
          '0%': { opacity: '1', transform: 'scale(1) translateY(0)' },
          '100%': { opacity: '0', transform: 'scale(0.95) translateY(12px)' },
        },
        backdropIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        backdropOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.85', transform: 'scale(1.02)' },
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
        stamp: {
          '0%': { opacity: '0', transform: 'scale(2) rotate(-15deg)' },
          '70%': { opacity: '0.9', transform: 'scale(0.95) rotate(-3deg)' },
          '100%': { opacity: '1', transform: 'scale(1) rotate(0deg)' },
        },
      },
    },
  },
  plugins: [],
}
