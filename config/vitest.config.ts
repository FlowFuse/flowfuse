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
        exclude: [...configDefaults.exclude, 'coverage/*'],
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
