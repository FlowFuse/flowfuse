import axios from 'axios'

import Alerts from '../services/alerts.js'

const client = axios.create({
    headers: {
        'Content-Type': 'application/json'
    },
    timeout: 30000
})

// Common error handler
client.interceptors.response.use(function (response) {
    return response
}, function (error) {
    if (/^http/.test(error.config.url)) {
        // This request is to an external URL. Allow this error to pass back to the caller
        return Promise.reject(error)
    }

    // This is an error response from our own API (or failure to reach it)
    // Lazy require to avoid circular dependency:
    // api/client.js → stores/account-auth.js → api/user.js → api/client.js
    const { useAccountAuthStore } = require('../stores/account-auth.js')
    const { useUxLoadingStore } = require('../stores/ux-loading.js')
    const store = require('../store/index.js').default
    if (error.code === 'ERR_NETWORK') {
        // Backend failed to respond
        useUxLoadingStore().setOffline(true)
    } else if (error.response && error.response.status === 401 && !useUxLoadingStore().appLoader && !useAccountAuthStore().loginInflight) {
        // 401 when !pending && !loginInflight means the session has expired
        store.dispatch('account/logout')
    } else if (error.response && error.response.status === 500) {
        // show toast notification
        Alerts.emit(error.response.data.error + ': ' + error.response.data.message, 'warning', 7500)
    }
    return Promise.reject(error)
})

export default client
