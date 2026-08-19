import { defineStore } from 'pinia'

export const useUxLoadingStore = defineStore('ux-loading', {
    state: () => ({
        appLoader: true,
        offline: null,
        pageLoader: false,
        pageLoaderMessage: null
    }),
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
        setPageLoader (value, message = null) {
            this.pageLoader = value
            this.pageLoaderMessage = value ? message : null
        }
    }
})
