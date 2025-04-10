import axios from 'axios'

import Alerts from '../services/alerts.js'
import store from '../store/index.js'

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
    if (error.code === 'ERR_NETWORK') {
        // Backend failed to respond
        store.dispatch('account/setOffline', true)
    } else if (error.response && error.response.status === 401 && !store.state.account.pending && !store.state.account.loginInflight) {
        // 401 when !pending && !loginInflight means the session has expired
        store.dispatch('account/logout')
    } else if (error.response && error.response.status === 500) {
        // show toast notification
        Alerts.emit(error.response.data.error + ': ' + error.response.data.message, 'warning', 7500)
    }
    return Promise.reject(error)
})

export default client
