/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
        "./components/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Map Tailwind colors to CSS Variables
                primary: 'var(--primary)',
                'primary-dark': 'var(--primary-dark)',
                secondary: 'var(--secondary)',
                accent: 'var(--accent)',

                // Semantic Colors
                main: 'var(--text-main)',       // text-main
                sub: 'var(--text-secondary)',   // text-sub
                inverse: 'var(--text-inverse)', // text-inverse

                // Backgrounds
                'theme-bg': 'var(--bg-main)',
                'theme-card': 'var(--bg-card)',
                'theme-modal': 'var(--bg-modal)',

                // UI Elements
                'input-bg': 'var(--input-bg)',
                'input-border': 'var(--input-border)',
                'input-text': 'var(--input-text)',

                // Table
                'table-header': 'var(--table-header-bg)',
                'table-border': 'var(--table-border)',
            },
            fontFamily: {
                cairo: ['Cairo', 'sans-serif'],
                tajawal: ['Tajawal', 'sans-serif'],
            }
        },
    },
    plugins: [],
}
