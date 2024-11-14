import axios from 'axios'

import Alerts from '../services/alerts.js'
import store from '../store/index.js'

let config = {
    headers: {
        'Content-Type': 'application/json'
    },
    timeout: 30000,
    withCredentials: true

}
if (process.env.hotReloading) {
    const isE2E = Object.prototype.hasOwnProperty.call(window, 'Cypress')
    const baseURL = isE2E ? window.Cypress.config('baseUrl') : 'http://localhost:3000'
    config = {
        ...config,
        baseURL,
        withCredentials: true
    }
}

const client = axios.create(config)

// Authentication
client.interceptors.response.use(function (response) {
    return response
}, function (error) {
    if (error.response && error.response.status === 401 && !store.state.account.pending && !store.state.account.loginInflight) {
        // 401 when !pending && !loginInflight means the session has expired
        store.dispatch('account/logout')
        return Promise.reject(error)
    } else if (error.code === 'ERR_NETWORK') {
        // network error
        store.dispatch('account/setOffline', true)
    }
    return Promise.reject(error)
})

// 500 Internal Server Errors
client.interceptors.response.use(function (response) {
    return response
}, function (error) {
    if (error.response && error.response.status === 500) {
        // show toast notification
        Alerts.emit(error.response.data.error + ': ' + error.response.data.message, 'warning', 7500)
        return Promise.reject(error)
    }
    return Promise.reject(error)
})

export default client
