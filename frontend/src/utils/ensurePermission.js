import { watch } from 'vue'

import { useAccountAuthStore } from '@/stores/account-auth.js'
import { useAccountSettingsStore } from '@/stores/account-settings.js'

/**
 * A 'beforeEnter' router function that ensures the user has a particular permission
 * or they are an admin
 */
export default function (scope) {
    return function (to, from, next) {
        const authStore = useAccountAuthStore()
        const settingsStore = useAccountSettingsStore()
        let settingsWatcher
        let userWatcher

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
                    (_) => { proceed() }
                )
            } else {
                proceed()
            }
        }

        waitForUser()
    }
}
