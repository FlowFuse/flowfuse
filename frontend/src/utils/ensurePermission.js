import { watch } from 'vue'

import store from '../store/index.js'
import { useAccountAuthStore } from '../stores/account-auth.js'

/**
 * A 'beforeEnter' router function that ensures the user has a particular permission
 * or they are an admin
 */
export default function (scope) {
    return function (to, from, next) {
        const authStore = useAccountAuthStore()
        let settingsWatcher
        let userWatcher

        function proceed () {
            if (settingsWatcher) {
                settingsWatcher()
            }
            if (authStore.user?.admin || store.state.account.settings[scope]) {
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
            if (!store.state.account.settings) {
                settingsWatcher = store.watch(
                    (state) => state.account.settings,
                    (_) => { proceed() }
                )
            } else {
                proceed()
            }
        }

        waitForUser()
    }
}
