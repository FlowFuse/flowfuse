const path = require('path')

module.exports = {
    content: [
        path.resolve(__dirname, '../frontend/public/index.html'),
        path.resolve(__dirname, '../frontend/src/**/*.js'),
        path.resolve(__dirname, '../frontend/src/**/*.vue')
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
        'forge-minimal-status-stopping',
        'forge-minimal-status-suspending',
        'forge-minimal-status-stopped',
        'forge-minimal-status-suspended',
        'forge-minimal-status-info',
        'forge-minimal-status-offline',
        'forge-minimal-status-success',
        'forge-minimal-status-connected',
        'forge-minimal-status-protected',
        'forge-minimal-status-running',
        'forge-minimal-status-importing',
        'forge-minimal-status-safe',
        'forge-minimal-status-warning',
        'forge-minimal-status-starting',
        'forge-minimal-status-pushing',
        'forge-minimal-status-pulling',
        'forge-minimal-status-loading',
        'forge-minimal-status-rollback',
        'forge-minimal-status-installing',
        'forge-minimal-status-restarting',
        'forge-minimal-status-updating',
        'text-green-400',
        'bg-green-50'
    ],
    theme: {
        extend: {
            colors: {
                gray: {
                    50: 'var(--ff-color-bg-surface)',
                    100: 'var(--ff-color-bg-surface-raised)',
                    200: 'var(--ff-color-border)',
                    300: 'var(--ff-color-border-strong)',
                    400: 'var(--ff-color-text-subtle)',
                    500: 'var(--ff-color-text-subtle)',
                    600: 'var(--ff-color-text-muted)',
                    700: 'var(--ff-color-text-muted)',
                    800: 'var(--ff-color-text)',
                    900: 'var(--ff-color-text)'
                },

                red: {
                    50: 'var(--ff-color-status-error-bg)',
                    100: 'var(--ff-color-status-error-bg)',
                    200: 'var(--ff-color-status-error-bg)',
                    300: 'var(--ff-color-status-error-border)',
                    400: 'var(--ff-color-danger-text)',
                    500: 'var(--ff-color-danger)',
                    600: 'var(--ff-color-danger-strong)',
                    700: 'var(--ff-color-danger-darker)',
                    800: 'var(--ff-color-danger-darker)',
                    900: 'var(--ff-color-danger-darker)'
                },

                green: {
                    50: 'var(--ff-color-status-progress-bg)',
                    100: 'var(--ff-color-status-progress-bg)',
                    200: 'var(--ff-color-status-success-bg)',
                    300: 'var(--ff-color-status-progress-border)',
                    400: 'var(--ff-color-status-success-border)',
                    500: 'var(--ff-color-status-success-text)',
                    600: 'var(--ff-color-status-success-text)',
                    700: 'var(--ff-color-status-success-text)',
                    800: 'var(--ff-color-status-success-text)',
                    900: 'var(--ff-color-status-success-text)'
                },

                yellow: {
                    50: 'var(--ff-color-status-safe-bg)',
                    100: 'var(--ff-color-status-safe-bg)',
                    200: 'var(--ff-color-status-safe-bg)',
                    300: 'var(--ff-color-status-safe-border)',
                    400: 'var(--ff-color-status-warning-bg)',
                    500: 'var(--ff-color-status-safe-text)',
                    600: 'var(--ff-color-status-safe-text)',
                    700: 'var(--ff-color-status-warning-text)',
                    800: 'var(--ff-color-status-warning-text)',
                    900: 'var(--ff-color-status-warning-text)'
                },

                blue: {
                    50: 'var(--ff-color-status-info-surface)',
                    100: 'var(--ff-color-status-info-surface)',
                    200: 'var(--ff-color-status-info-surface)',
                    300: 'var(--ff-color-status-info-surface-border)',
                    400: 'var(--ff-color-link)',
                    500: 'var(--ff-color-link)',
                    600: 'var(--ff-color-link)',
                    700: 'var(--ff-color-link-hover)',
                    800: 'var(--ff-color-link-hover)',
                    900: 'var(--ff-color-link-hover)'
                },

                indigo: {
                    50: 'var(--ff-color-accent-surface)',
                    100: 'var(--ff-color-accent-surface)',
                    200: 'var(--ff-color-accent-light)',
                    300: 'var(--ff-color-accent-light)',
                    400: 'var(--ff-color-focus)',
                    500: 'var(--ff-color-focus)',
                    600: 'var(--ff-color-accent)',
                    700: 'var(--ff-color-accent-hover)',
                    800: 'var(--ff-color-accent-strong)',
                    900: 'var(--ff-color-accent-strong)'
                },

                purple: {
                    50: 'var(--ff-color-status-devmode-bg)',
                    100: 'var(--ff-color-status-devmode-bg)',
                    200: 'var(--ff-color-status-devmode-bg)',
                    300: 'var(--ff-color-status-devmode-border)',
                    400: 'var(--ff-color-status-devmode-border)',
                    500: 'var(--ff-color-status-devmode-text)',
                    600: 'var(--ff-color-status-devmode-text)',
                    700: 'var(--ff-color-status-devmode-text)',
                    800: 'var(--ff-color-status-devmode-text)',
                    900: 'var(--ff-color-status-devmode-text)'
                },

                teal: {
                    50: 'var(--ff-color-status-fleetmode-bg)',
                    100: 'var(--ff-color-status-fleetmode-bg)',
                    200: 'var(--ff-color-status-fleetmode-bg)',
                    300: 'var(--ff-color-status-fleetmode-border)',
                    400: 'var(--ff-color-status-fleetmode-border)',
                    500: 'var(--ff-color-status-fleetmode-border)',
                    600: 'var(--ff-color-status-fleetmode-border)',
                    700: 'var(--ff-color-status-fleetmode-text)',
                    800: 'var(--ff-color-status-fleetmode-text)',
                    900: 'var(--ff-color-status-fleetmode-text)'
                }
            },
            // `white` / `black` split per-context — bg and text want different tokens.
            backgroundColor: {
                white: 'var(--ff-color-bg-app)'
            },
            textColor: {
                white: 'var(--ff-color-text-on-brand)',
                black: 'var(--ff-color-text)'
            }
        }
    }
}
