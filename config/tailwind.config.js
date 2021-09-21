module.exports = {
    mode: 'jit',
    purge: {
        enabled: true,
        content: [
            "frontend/public/index.html",
            "frontend/src/**/*.js",
            "frontend/src/**/*.vue"
        ],
    },
    darkMode: false, // or 'media' or 'class'
    theme: {
        extend: {},
    },
    variants: {
        extend: {},
    },
    plugins: [
        require('@tailwindcss/forms')
    ],
}
