/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                retro: {
                    green: '#00FF41',
                    dark: '#0D0D0D',
                    gray: '#1A1A1A',
                }
            },
            keyframes: {
                'slide-in-right': {
                    '0%': { transform: 'translateX(100%)' },
                    '100%': { transform: 'translateX(0)' },
                }
            },
            animation: {
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'slide-in-right': 'slide-in-right 0.2s ease-out',
            }
        },
    },
    plugins: [],
    corePlugins: {
        preflight: false,
    },
    important: '.koin-scope',
}
