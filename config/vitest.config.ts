/// <reference types="vitest" />

import { fileURLToPath, URL } from 'url'
import { defineConfig } from 'vitest/config'
import Vue from '@vitejs/plugin-vue'

export default defineConfig({
    plugins: [
        Vue(),
    ],
    test: {
        globals: true,
        environment: 'jsdom',
        coverage: {
            provider: 'istanbul',
            src: ['./frontend/src'],
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
