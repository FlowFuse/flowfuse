module.exports = {
    mode: 'jit',
    purge: {
        enabled: true,
        content: [
            "frontend/public/index.html",
            "frontend/src/**/*.js",
            "frontend/src/**/*.vue"
        ],
        safelist: [
            'forge-status-stopped',
            'forge-status-error',
            'forge-status-safe',
            'forge-status-running',
            'forge-status-starting',
            'forge-log-entry-level-info',
            'forge-log-entry-level-warn',
            'forge-log-entry-level-error',
        ]
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
