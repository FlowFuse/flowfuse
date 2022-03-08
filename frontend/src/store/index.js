import { createStore } from 'vuex'
import account from './account'
import breadcrumbs from './breadcrumbs'
import features from './features'

export default createStore({
    modules: {
        account,
        breadcrumbs,
        features
    },
    plugins: []
})
