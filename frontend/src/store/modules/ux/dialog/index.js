import { markRaw } from 'vue'

const initialState = () => ({
    dialog: {
        boxClass: null,
        cancelLabel: null,
        canBeCanceled: true,
        confirmLabel: null,
        contentClass: '',
        disablePrimary: false,
        header: null,
        html: null,
        is: null,
        kind: null,
        onCancel: null,
        onConfirm: null,
        subHeader: null,
        text: null,
        textLines: null,
        notices: []
    }
})

const meta = {
    persistence: { }
}

const state = initialState

const getters = {}

const mutations = {
    clearDialog (state) {
        state.dialog = initialState().dialog
    },

    setDialog (state, {
        payload,
        onConfirm,
        onCancel
    }) {
        if (typeof (payload) === 'string') {
            state.dialog.content = payload
        } else {
            // msg is an object, let's break it apart
            state.dialog.header = payload.header
            state.dialog.text = payload.text
            state.dialog.textLines = payload.text?.split('\n')
            state.dialog.html = payload.html
            state.dialog.is = payload.is ? payload.is : undefined
            state.dialog.confirmLabel = payload.confirmLabel
            state.dialog.cancelLabel = payload.cancelLabel
            state.dialog.kind = payload.kind
            state.dialog.disablePrimary = payload.disablePrimary
            state.dialog.notices = payload.notices
            if (Object.prototype.hasOwnProperty.call(payload, 'canBeCanceled')) {
                state.dialog.canBeCanceled = payload.canBeCanceled
            }
            state.dialog.boxClass = payload.boxClass
        }
        state.dialog.onConfirm = onConfirm
        state.dialog.onCancel = onCancel
    },
    setDisablePrimary (state, disablePrimaryState) {
        state.dialog.disablePrimary = disablePrimaryState
    }
}

const actions = {
    onDialogCancel ({ commit, state }) {
        state.dialog.onCancel?.()
    },
    async clearDialog ({ commit, dispatch }, cancelled) {
        if (cancelled) {
            await dispatch('onDialogCancel')
        }

        commit('clearDialog')
    },

    async showDialogHandlers ({ commit, dispatch }, { payload, onConfirm, onCancel }) {
        await dispatch('clearDialog', false)

        return commit('setDialog', {
            payload,
            onConfirm,
            onCancel
        })
    },
    setDisablePrimary ({ commit }, state) {
        commit('setDisablePrimary', state)
    }
}

export default {
    namespaced: true,
    state,
    initialState: initialState(),
    getters,
    mutations,
    actions,
    meta
}
