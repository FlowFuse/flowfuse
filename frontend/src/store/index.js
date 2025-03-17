import { createStore } from 'vuex'

import commonActions from './common/actions.js'
import commonMutations from './common/mutations.js'
import account from './modules/account/index.js'
import product from './modules/product/index.js'
import ux from './modules/ux/index.js'
import storagePlugin from './plugins/storage.plugin.js'

export default createStore({
    modules: {
        account,
        product,
        ux
    },
    actions: {
        ...commonActions
    },
    mutations: {
        ...commonMutations
    },
    plugins: [storagePlugin]
})
