/** @type {import('tailwindcss').Config} */

/**
 * Les couleurs de marque sont pilotées par des variables CSS (voir src/index.css)
 * pour le style unique DEDSEC : noir, blanc tranchant et accent orange sécurité.
 *
 * Aucun violet, aucun néon générique : les accents restent rares et fonctionnels.
 */
export default {
  content: ['./index.html', './offsidian/index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // surfaces
        void: 'rgb(var(--void) / <alpha-value>)',
        ink: 'rgb(var(--ink) / <alpha-value>)',
        panel: 'rgb(var(--panel) / <alpha-value>)',
        elev: 'rgb(var(--elev) / <alpha-value>)',
        // texte
        bone: 'rgb(var(--bone) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        dim: 'rgb(var(--dim) / <alpha-value>)',
        // accents
        signal: {
          DEFAULT: 'rgb(var(--signal) / <alpha-value>)',
          soft: 'rgb(var(--signal-soft) / <alpha-value>)',
        },
        static: 'rgb(var(--static) / <alpha-value>)',
        alert: {
          DEFAULT: 'rgb(var(--alert) / <alpha-value>)',
          soft: 'rgb(var(--alert-soft) / <alpha-value>)',
        },
        ok: 'rgb(var(--ok) / <alpha-value>)',
        warm: 'rgb(var(--warm) / <alpha-value>)',
      },
      fontFamily: {
        mono: [
          'ui-monospace',
          'SFMono-Regular',
          'SF Mono',
          'Menlo',
          'Consolas',
          '"DejaVu Sans Mono"',
          '"Liberation Mono"',
          'monospace',
        ],
        sans: [
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Inter',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      letterSpacing: {
        widest2: '0.22em',
        widest3: '0.34em',
      },
      borderRadius: {
        none: '0px',
        hair: '2px',
      },
      boxShadow: {
        glow: '0 0 46px -14px rgb(var(--signal) / 0.42)',
        alert: '0 0 40px -14px rgb(var(--alert) / 0.4)',
        panel: '0 30px 70px -40px rgba(0,0,0,0.95)',
        inset: 'inset 0 1px 0 0 rgb(var(--bone) / 0.05)',
      },
      keyframes: {
        blink: { '0%,49%': { opacity: '1' }, '50%,100%': { opacity: '0' } },
        scan: { '0%': { transform: 'translateY(-12%)' }, '100%': { transform: 'translateY(112%)' } },
        tracking: {
          '0%': { transform: 'translateY(-20vh)', opacity: '0' },
          '8%': { opacity: '0.5' },
          '92%': { opacity: '0.35' },
          '100%': { transform: 'translateY(120vh)', opacity: '0' },
        },
        drift: {
          '0%': { transform: 'translate3d(0,0,0)', opacity: '0' },
          '14%': { opacity: '0.6' },
          '86%': { opacity: '0.35' },
          '100%': { transform: 'translate3d(0,-140px,0)', opacity: '0' },
        },
        glitchBottom: {
          '0%,91%,100%': { transform: 'translate(0,0)', opacity: '0' },
          '92%': { transform: 'translate(3px,1px)', opacity: '0.8' },
          '95%': { transform: 'translate(-3px,-1px)', opacity: '0.6' },
          '99%': { transform: 'translate(1px,1px)', opacity: '0.45' },
        },
        flicker: {
          '0%,100%': { opacity: '1' },
          '48%': { opacity: '0.86' },
          '50%': { opacity: '0.7' },
          '52%': { opacity: '0.9' },
        },
        sweep: { '0%': { transform: 'translateX(-120%)' }, '100%': { transform: 'translateX(220%)' } },
        rotateSlow: { to: { transform: 'rotate(360deg)' } },
        breathe: { '0%,100%': { opacity: '0.82' }, '50%': { opacity: '1' } },
        slice: {
          '0%, 88%, 100%': { transform: 'translateX(0)' },
          '90%': { transform: 'translateX(-6px)' },
          '92%': { transform: 'translateX(5px)' },
          '94%': { transform: 'translateX(-2px)' },
        },
      },
      animation: {
        blink: 'blink 1.05s step-end infinite',
        scan: 'scan 8s linear infinite',
        tracking: 'tracking 11s linear infinite',
        flicker: 'flicker 7s steps(1,end) infinite',
        glitchBottom: 'glitchBottom 8.4s steps(1,end) infinite',
        sweep: 'sweep 3.6s ease-in-out infinite',
        slice: 'slice 9s steps(1,end) infinite',
        'spin-slow': 'rotateSlow 26s linear infinite',
        'spin-slower': 'rotateSlow 48s linear infinite',
      },
    },
  },
  plugins: [],
}
