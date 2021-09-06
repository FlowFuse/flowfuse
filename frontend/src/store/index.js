import { createStore, createLogger } from 'vuex'
import account from './account'
import breadcrumbs from './breadcrumbs'

export default createStore({
    modules: {
        account,
        breadcrumbs
    },
    plugins: [createLogger()]
})
