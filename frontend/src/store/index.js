import { createStore } from 'vuex'

import account from './account.js'
import storagePlugin from './plugins/storage.plugin.js'
import product from './product.js'

export default createStore({
    modules: {
        account,
        product
    },
    plugins: [storagePlugin]
})
