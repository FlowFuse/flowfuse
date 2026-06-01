import { defineStore } from 'pinia'
import { computed, ref, watchEffect } from 'vue'

export type ThemeMode = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'ff-theme-mode'

function readStoredMode (): ThemeMode {
    try {
        const direct = localStorage.getItem(STORAGE_KEY)
        if (direct === 'light' || direct === 'dark' || direct === 'system') return direct
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_) { /* ignore */ }
    return 'system'
}

export const useThemeStore = defineStore('theme', () => {
    const mode = ref<ThemeMode>(readStoredMode())
    const systemPrefersDark = ref(false)

    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    systemPrefersDark.value = mql.matches
    mql.addEventListener('change', (e) => { systemPrefersDark.value = e.matches })

    // Cross-tab sync — `storage` events fire in OTHER tabs when the key changes,
    // so toggling theme in tab A updates tab B without reload.
    window.addEventListener('storage', (e) => {
        if (e.key !== STORAGE_KEY || !e.newValue) return
        if (e.newValue === 'light' || e.newValue === 'dark' || e.newValue === 'system') {
            mode.value = e.newValue
        }
    })

    const effective = computed<'light' | 'dark'>(() =>
        mode.value === 'system'
            ? (systemPrefersDark.value ? 'dark' : 'light')
            : mode.value
    )

    watchEffect(() => {
        document.documentElement.dataset.theme = effective.value
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        try { localStorage.setItem(STORAGE_KEY, mode.value) } catch (_) { /* ignore */ }
    })

    function setMode (m: ThemeMode) {
        mode.value = m
    }

    return { mode, systemPrefersDark, effective, setMode }
})
