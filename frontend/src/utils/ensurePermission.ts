import { type WatchStopHandle, watch } from 'vue'
import type { NavigationGuardNext, RouteLocationNormalized } from 'vue-router'

import { useAccountAuthStore } from '@/stores/account-auth.js'
import { useAccountSettingsStore } from '@/stores/account-settings.js'

/**
 * A 'beforeEnter' router function that ensures the user has a particular permission
 * or they are an admin
 */
export default function (scope: string) {
    return function (to: RouteLocationNormalized, from: RouteLocationNormalized, next: NavigationGuardNext) {
        const authStore = useAccountAuthStore()
        const settingsStore = useAccountSettingsStore()
        let settingsWatcher: WatchStopHandle | undefined
        let userWatcher: WatchStopHandle | undefined

        function proceed () {
            if (settingsWatcher) {
                settingsWatcher()
            }
            if (authStore.user?.admin || settingsStore.settings[scope]) {
                next()
            } else {
                next('/')
            }
        }

        function waitForUser () {
            if (!authStore.user) {
                // Setup a watch
                userWatcher = watch(() => authStore.user, (user) => {
                    if (user) {
                        if (userWatcher) userWatcher()
                        waitForSettings()
                    }
                })
            } else {
                waitForSettings()
            }
        }
        function waitForSettings () {
            if (!settingsStore.settings) {
                settingsWatcher = watch(
                    () => settingsStore.settings,
                    () => { proceed() }
                )
            } else {
                proceed()
            }
        }

        waitForUser()
    }
}
