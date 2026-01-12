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
        serif: ['Merriweather', 'serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        ink: '#1a1a1a',
        paper: '#f5f5f0',
        accent: '#d4af37', // Muted Gold
      },
      typography: {
        DEFAULT: {
          css: {
            '--tw-prose-body': '#1a1a1a',
            '--tw-prose-headings': '#1a1a1a',
            '--tw-prose-bold': '#1a1a1a',
            '--tw-prose-quotes': '#1a1a1a',
            'maxWidth': 'none',
            'fontSize': '0.9375rem',
            'lineHeight': '1.8',
            'h1': {
              fontFamily: 'Merriweather, serif',
              fontWeight: '700',
              fontSize: '1.75em',
              marginTop: '2em',
              marginBottom: '1em',
              borderBottom: '2px solid #d4af37',
              paddingBottom: '0.5em',
            },
            'h2': {
              fontFamily: 'Merriweather, serif',
              fontWeight: '700',
              fontSize: '1.4em',
              marginTop: '2em',
              marginBottom: '1em',
              borderBottom: '1px solid rgba(26, 26, 26, 0.15)',
              paddingBottom: '0.5em',
              color: '#1a1a1a',
            },
            'h3': {
              fontFamily: 'Merriweather, serif',
              fontWeight: '700',
              fontSize: '1.2em',
              marginTop: '1.75em',
              marginBottom: '0.75em',
              color: '#1a1a1a',
            },
            'h4': {
              fontFamily: 'Merriweather, serif',
              fontWeight: '600',
              fontSize: '1.1em',
              marginTop: '1.5em',
              marginBottom: '0.5em',
              color: '#d4af37',
            },
            'p': {
              marginTop: '1.25em',
              marginBottom: '1.25em',
            },
            'ul, ol': {
              marginTop: '1em',
              marginBottom: '1em',
              paddingLeft: '1.5em',
            },
            'li': {
              marginTop: '0.5em',
              marginBottom: '0.5em',
            },
            'li > ul, li > ol': {
              marginTop: '0.5em',
              marginBottom: '0.5em',
            },
            'blockquote': {
              borderLeftWidth: '3px',
              borderLeftColor: '#d4af37',
              fontStyle: 'italic',
              backgroundColor: 'rgba(212, 175, 55, 0.08)',
              padding: '1em 1.5em',
              marginTop: '1.5em',
              marginBottom: '1.5em',
              borderRadius: '0 4px 4px 0',
            },
            'blockquote p': {
              marginTop: '0.5em',
              marginBottom: '0.5em',
            },
            'strong': {
              color: '#1a1a1a',
              fontWeight: '700',
            },
            'hr': {
              borderColor: 'rgba(26, 26, 26, 0.15)',
              marginTop: '2.5em',
              marginBottom: '2.5em',
            },
            'code': {
              backgroundColor: 'rgba(26, 26, 26, 0.05)',
              padding: '0.2em 0.4em',
              borderRadius: '3px',
              fontSize: '0.875em',
            },
          },
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'fade-out': 'fadeOut 0.2s ease-in',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translate(-50%, 10px)' },
          '100%': { opacity: '1', transform: 'translate(-50%, 0)' },
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
