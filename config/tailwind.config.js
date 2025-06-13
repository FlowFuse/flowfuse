module.exports = {
    mode: 'jit',
    purge: {
        enabled: true,
        content: [
            'frontend/public/index.html',
            'frontend/src/**/*.js',
            'frontend/src/**/*.vue'
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
            'forge-log-entry-level-system',
            'forge-minimal-status-error',
            'forge-minimal-status-crashed',
            'forge-minimal-status-suspended',
            'forge-minimal-status-stopped',
            'forge-minimal-status-info',
            'forge-minimal-status-safe',
            'forge-minimal-status-warning',
            'forge-minimal-status-success',
            'forge-minimal-status-connected',
            'forge-minimal-status-running',
            'forge-minimal-status-importing',
            'forge-minimal-status-starting'
        ]
    },
    darkMode: false, // or 'media' or 'class'
    theme: {
        extend: {
            colors: {
                teal: {
                    50: '#E4FBFC',
                    100: '#C4F3F5',
                    200: '#B2EBEE',
                    300: '#8CE2E7',
                    400: '#74D4D9',
                    500: '#50C3C9',
                    600: '#35AAB0',
                    700: '#31959A',
                    800: '#397B7E',
                    900: '#406466'
                }
            }
        }
    },
    variants: {
        extend: {}
    }
}
