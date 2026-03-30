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
}, async function (error) {
    if (/^http/.test(error.config.url)) {
        // This request is to an external URL. Allow this error to pass back to the caller
        return Promise.reject(error)
    }

    // Dynamic import breaks the circular dep: client.js → account-auth.js → api/* → client.js
    const { useAccountAuthStore } = await import('../stores/account-auth.js')
    const { useUxLoadingStore } = await import('../stores/ux-loading.js')
    const authStore = useAccountAuthStore()
    if (error.code === 'ERR_NETWORK') {
        // Backend failed to respond
        useUxLoadingStore().setOffline(true)
    } else if (error.response && error.response.status === 401 && !useUxLoadingStore().appLoader && !authStore.loginInflight) {
        // 401 when !pending && !loginInflight means the session has expired
        authStore.logout()
    } else if (error.response && error.response.status === 500) {
        // show toast notification
        Alerts.emit(error.response.data.error + ': ' + error.response.data.message, 'warning', 7500)
    }
    return Promise.reject(error)
})

export default client
