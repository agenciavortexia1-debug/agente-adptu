/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        serif: ['Lora', 'serif'],
      },
      colors: {
        'bg-main': 'var(--color-bg-main)',
        'surface': 'var(--color-surface)',
        'surface-2': 'var(--color-surface-2)',
        'border-subtle': 'var(--color-border-subtle)',
        'accent-forest': 'var(--color-accent-forest)',
        'accent-mint': 'var(--color-accent-mint)',
        'text-main': 'var(--color-text-main)',
        'text-secondary': 'var(--color-text-secondary)',
        'text-faint': 'var(--color-text-faint)',
      },
    },
  },
  plugins: [],
}
