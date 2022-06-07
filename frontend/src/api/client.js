import axios from 'axios'
import store from '@/store'

const client = axios.create({
    headers: {
        'Content-Type': 'application/json'
    },
    timeout: 30000
})

client.interceptors.response.use(function (response) {
    return response
}, function (error) {
    if (error.response && error.response.status === 401 && !store.state.account.pending && !store.state.account.loginInflight) {
        // 401 when !pending && !loginInflight means the session has expired
        store.dispatch('account/logout')
        return Promise.reject(error)
    } else if (!error.response) {
        // network error
        store.dispatch('account/setOffline', true)
    }
    return Promise.reject(error)
})

export default client
