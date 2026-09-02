/// <reference types="vitest" />

import { fileURLToPath, URL } from 'url'
import { defineConfig, configDefaults } from 'vitest/config'
import Vue from '@vitejs/plugin-vue'

export default defineConfig({
    plugins: [Vue({
        template: {
            transformAssetUrls: {
                includeAbsolute: false
            }
        }
    })],
    test: {
        globals: true,
        environment: 'jsdom',
        // app.orchestrator.spec.js sits close enough to the 5s default that
        // full-suite load tips it over. On its own it takes 1.9s, on this
        // branch and on main alike; the locale catalogues add a few percent to
        // the suite's import time, and that was enough to make the timeout
        // reproducible. Headroom, not cover for a hang.
        testTimeout: 15000,
        exclude: [...configDefaults.exclude, 'coverage/*', '**/cypress/**', '**/dist/**'],
        coverage: {
            provider: 'istanbul',
            reportsDirectory: 'coverage/reports/frontend',
            all: true,
            reporter: [ 'json' ]
        }
    },
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('../frontend/src', import.meta.url))
        }
    }
})
