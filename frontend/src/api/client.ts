import axios, { type AxiosError, type AxiosInstance } from 'axios'

import Alerts from '../services/alerts'

import { useAccountAuthStore } from '@/stores/account-auth'
import { useUxLoadingStore } from '@/stores/ux-loading'

const client: AxiosInstance = axios.create({
    headers: {
        'Content-Type': 'application/json'
    },
    timeout: 30000
})

// Common error handler
client.interceptors.response.use(function (response) {
    return response
}, async function (error: AxiosError<{ error: string, message: string }>) {
    if (/^http/.test(error.config.url)) {
        // This request is to an external URL. Allow this error to pass back to the caller
        return Promise.reject(error)
    }

    if (error.code === 'ERR_NETWORK') {
        // Backend failed to respond
        useUxLoadingStore().setOffline(true)
    } else if (error.response && error.response.status === 401 && !useUxLoadingStore().appLoader && !useAccountAuthStore().loginInflight) {
        // 401 when !pending && !loginInflight means the session has expired
        useAccountAuthStore().logout()
    } else if (error.response && error.response.status === 500) {
        // show toast notification
        Alerts.emit(error.response.data.error + ': ' + error.response.data.message, 'warning', 7500)
    }
    return Promise.reject(error)
})

export default client
