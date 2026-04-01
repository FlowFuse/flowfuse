import { watch } from 'vue'

import { useAccountAuthStore } from '@/stores/account-auth.js'

/**
 * A 'beforeEnter' router function that ensures the user is an admin
 */
export default function (to, from, next) {
    const authStore = useAccountAuthStore()
    let watcher
    function proceed () {
        if (watcher) {
            watcher()
        }
        if (authStore.user?.admin) {
            next()
        } else {
            next('/')
        }
    }
    // Check if we've loaded the current user yet
    if (!authStore.user) {
        // Setup a watch
        watcher = watch(() => authStore.user, (user) => {
            if (user) proceed()
        })
    } else {
        proceed()
    }
}
