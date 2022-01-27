import { createStore } from 'vuex'
import account from './account'
import breadcrumbs from './breadcrumbs'

export default createStore({
    modules: {
        account,
        breadcrumbs
    },
    plugins: []
})
