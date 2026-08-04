import { defineStore } from 'pinia'

export const useUxLoadingStore = defineStore('ux-loading', {
    state: () => ({
        appLoader: true,
        offline: null,
        pageLoaders: {}
    }),
    getters: {
        isPageLoading: (state) => Object.keys(state.pageLoaders).length > 0
    },
    actions: {
        setAppLoader (value) {
            this.appLoader = value
        },
        clearAppLoader () {
            this.appLoader = false
        },
        setOffline (value) {
            this.offline = value
        },
        setPageLoader (key) {
            this.pageLoaders[key] = true
        },
        clearPageLoader (key) {
            delete this.pageLoaders[key]
        }
    }
})
