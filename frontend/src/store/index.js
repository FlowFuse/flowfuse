import { createStore } from 'vuex'
import account from './account.js'

export default createStore({
    modules: {
        account
    },
    plugins: []
})
