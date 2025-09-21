/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'primary-brand': 'var(--primary-brand)',
        'primary-text': 'var(--primary-text)',
        'secondary-text': 'var(--secondary-text)',
        'background-main': 'var(--background-main)',
        'background-light': 'var(--background-light)',
        'border-color': 'var(--border-color)',
        'error': 'var(--error-color)',
        'queued-bg': 'var(--queued-bg)',
        'queued-text': 'var(--queued-text)',
        'processing-bg': 'var(--processing-bg)',
        'processing-text': 'var(--processing-text)',
        'success-bg': 'var(--success-bg)',
        'success-text': 'var(--success-text)',
        'failed-bg': 'var(--failed-bg)',
        'failed-text': 'var(--failed-text)',
        'etsy': 'var(--etsy-color)',
        'whatsapp': 'var(--whatsapp-color)',
        'amazon': 'var(--amazon-color)',
      },
      fontFamily: {
        main: ['var(--font-family-main)', 'sans-serif'],
      },
      spacing: {
        'xs': 'var(--spacing-xs)',
        'sm': 'var(--spacing-sm)',
        'md': 'var(--spacing-md)',
        'lg': 'var(--spacing-lg)',
        'xl': 'var(--spacing-xl)',
      },
      borderRadius: {
        'sm': 'var(--border-radius-sm)',
        'md': 'var(--border-radius-md)',
        'lg': 'var(--border-radius-lg)',
      }
    },
  },
  plugins: [],
}
