import store from '@/store'

/**
 * A 'beforeEnter' router function that ensures the user is an admin
 */
export default function (to, from, next) {
    let watcher
    function proceed () {
        if (watcher) {
            watcher()
        }
        if (store.state.account.user.admin) {
            next()
        } else {
            next('/')
        }
    }
    // Check if we've loaded the current user yet
    if (!store.state.account.user) {
        // Setup a watch
        watcher = store.watch(
            (state) => state.account.user,
            (_) => { proceed() }
        )
    } else {
        proceed()
    }
}
