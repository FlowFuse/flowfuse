import { createStore } from 'vuex'

import account from './modules/account/account.js'
import product from './modules/product/product.js'
import ux from './modules/ux/ux.js'
import storagePlugin from './plugins/storage.plugin.js'

export default createStore({
    modules: {
        account,
        product,
        ux
    },
    plugins: [storagePlugin]
})
