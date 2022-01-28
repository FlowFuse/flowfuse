import store from '@/store'

/**
 * A 'beforeEnter' router function that ensures the user has a particular permission
 * or they are an admin
 */
export default function (scope) {
    return function (to, from, next) {
        let settingsWatcher
        let userWatcher

        function proceed () {
            if (settingsWatcher) {
                settingsWatcher()
            }
            if (store.state.account.user.admin || store.state.account.settings[scope]) {
                next()
            } else {
                next('/')
            }
        }

        function waitForUser () {
            if (!store.state.account.user) {
                // Setup a watch
                userWatcher = store.watch(
                    (state) => state.account.user,
                    (_) => { waitForSettings() }
                )
            } else {
                waitForSettings()
            }
        }
        function waitForSettings () {
            if (userWatcher) {
                userWatcher()
            }
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
