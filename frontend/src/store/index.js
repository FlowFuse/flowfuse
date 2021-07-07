import { createStore, createLogger } from 'vuex'
import account from './account'

export default createStore({
    modules: {
        account
    },
    plugins: [createLogger()]
})
