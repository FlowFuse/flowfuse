module.exports = {
    mode: 'jit',
    purge: {
        enabled: true,
        content: [
            'src/**/*.scss',
            'src/**/*.js',
            'docs/**/*.js',
            'src/**/*.vue',
            'docs/**/*.vue'
        ]
    },
    darkMode: false, // or 'media' or 'class'
    theme: {
        extend: {}
    },
    variants: {
        extend: {}
    },
    plugins: []
}
