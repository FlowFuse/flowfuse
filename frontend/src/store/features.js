import featuresApi from '@/api/features'

export default {
    namespaced: true,
    state: {
        // is billing (EE) enabled server-side
        billing: null
    },
    mutations: {
        setFeatures (state, features) {
            state.billing = features.billing
        }
    },
    actions: {
        async checkState (state) {
            try {
                const features = await featuresApi.getFeatures()
                state.commit('setFeatures', features)
            } catch (err) {
                console.error(err)
            }
        }
    }
}
