import messagingService from '../../../../services/messaging.service.js'
const MAX_DEBUG_LOG_ENTRIES = 10 // maximum number of debug log entries to keep

const eventsRegistry = {
    'editor:open': {
        nodeRedEvent: 'editor:open', // this is the Node-RED event
        propertyBag: 'editorState',
        propertyName: 'editorOpen',
        propertyValue: true
    },
    'editor:close': {
        nodeRedEvent: 'testing stuff matey',
        propertyBag: 'editorState',
        propertyName: 'editorOpen',
        propertyValue: false
    },
    'search:open': {
        nodeRedEvent: 'search:open',
        propertyBag: 'editorState',
        propertyName: 'searchOpen',
        propertyValue: true
    },
    'search:close': {
        nodeRedEvent: 'search:close',
        propertyBag: 'editorState',
        propertyName: 'searchOpen',
        propertyValue: false
    },
    'actionList:open': {
        nodeRedEvent: 'actionList:open',
        propertyBag: 'editorState',
        propertyName: 'actionListOpen',
        propertyValue: true
    },
    'actionList:close': {
        nodeRedEvent: 'actionList:close',
        propertyBag: 'editorState',
        propertyName: 'actionListOpen',
        propertyValue: false
    },
    'type-search:open': {
        nodeRedEvent: 'type-search:open',
        propertyBag: 'editorState',
        propertyName: 'typeSearchOpen',
        propertyValue: true
    },
    'type-search:close': {
        nodeRedEvent: 'type-search:close',
        propertyBag: 'editorState',
        propertyName: 'typeSearchOpen',
        propertyValue: false
    }
}

const ALL_CONTEXT_OPTIONS = [
    {
        value: 'palette',
        name: 'Palette',
        title: 'Include installed palette nodes in context',
        menuIcon: 'CubeIcon'
    },
    {
        value: 'debug',
        name: 'Debug',
        title: 'Include debug messages logs in context (last 10 messages)',
        menuIcon: 'ViewListIcon'
    }
]

const initialState = () => {
    const initialEditorState = {}
    Object.values(eventsRegistry).forEach(eventDetails => {
        if (eventDetails.propertyBag === 'editorState') {
            initialEditorState[eventDetails.propertyName] = false // default to false
        }
    })

    return {
        version: null,
        supportedActions: {},
        assistantFeatures: {},
        palette: {},
        scope: {
            target: 'nr-assistant',
            scope: 'flowfuse-expert',
            source: 'flowfuse-expert'
        },
        nodeRedVersion: null,
        selectedNodes: [],
        selectedContext: [...ALL_CONTEXT_OPTIONS],
        debugLog: [],
        editorState: { ...initialEditorState }
    }
}

const meta = {
    persistence: {}
}

const state = initialState()

const getters = {
    immersiveInstance: (state, getters, rootState) => {
        return rootState.context.instance
    },
    hasUserSelection: (state) => {
        return state.selectedNodes.length
    },
    hasContextSelection: (state) => {
        return state.selectedContext.length
    },
    isFeaturePaletteEnabled: (state) => {
        return state.assistantFeatures.commands?.['get-palette']?.enabled ?? false
    },
    isFeatureDebugLogEnabled: (state) => {
        return state.assistantFeatures.debugLog?.enabled ?? false
    },
    availableContextOptions: (state, getters) => {
        const options = ALL_CONTEXT_OPTIONS.filter(option => {
            if (option.value === 'debug' && getters.isFeatureDebugLogEnabled === false) {
                return false
            }
            if (option.value === 'palette' && getters.isFeaturePaletteEnabled === false) {
                return false
            }
            return true
        })
        return options
    },
    getSelectedContext: (state, getters) => {
        const availableOptions = {}
        getters.availableContextOptions.forEach(option => {
            availableOptions[option.value] = option
        })
        return state.selectedContext.filter(c => availableOptions[c.value])
    },
    paletteContribOnly: (state, getters) => {
        if (getters.isFeaturePaletteEnabled === false) {
            return null
        }
        const palette = { ...(state.palette || {}) }
        delete palette['node-red']
        return palette
    },
    debugLog: (state, getters) => {
        if (getters.isFeatureDebugLogEnabled === false) {
            return null
        }
        return state.debugLog || []
    }
}

const mutations = {
    SET_VERSION (state, version) {
        state.version = version
    },
    SET_SUPPORTED_ACTIONS (state, supportedActions) {
        state.supportedActions = supportedActions
    },
    SET_PALETTE (state, palette) {
        state.palette = palette ?? {}
    },
    SET_SELECTED_NODES (state, selection) {
        state.selectedNodes = selection
    },
    SET_SELECTED_CONTEXT (state, context) {
        state.selectedContext = context || []
    },
    ADD_DEBUG_LOG_ENTRY (state, entry) {
        if (!entry) {
            return
        }
        const entries = (Array.isArray(entry) ? entry : [entry]).filter(Boolean)
        if (entries.length === 0) {
            return
        }
        // if the new len + existing len > max, trim the oldest entries
        const totalEntries = state.debugLog.length + entries.length
        if (totalEntries > MAX_DEBUG_LOG_ENTRIES) {
            const excess = totalEntries - MAX_DEBUG_LOG_ENTRIES
            state.debugLog.splice(0, excess)
        }
        state.debugLog.push(...entries)
    },
    SET_FEATURES (state, features) {
        state.assistantFeatures = features
    },
    SET_NODE_RED_VERSION (state, version) {
        state.nodeRedVersion = version
    },
    SET_REGISTERED_EVENT_PROPERTY (state, { registeredEvent, data }) {
        const propertyBag = registeredEvent.propertyBag
        if (!propertyBag || !Object.prototype.hasOwnProperty.call(state, propertyBag)) {
            return
        }
        const propertyName = registeredEvent.propertyName
        const propertyValue = registeredEvent.propertyValue || false
        if (!propertyName) {
            return
        }
        state[propertyBag][propertyName] = propertyValue
    },
    RESET (state) {
        const newState = initialState()
        Object.keys(newState).forEach(key => {
            state[key] = newState[key]
        })
    }
}

const actions = {
    async handleMessage ({ commit, getters, dispatch }, payload) {
        if (payload.origin !== getters.immersiveInstance.url) {
            console.warn('Received message from unknown origin. Ignoring.')
            return
        }
        switch (true) {
        case payload.data.type === 'assistant-ready':
            commit('SET_VERSION', payload.data.version)
            commit('SET_PALETTE', payload.data.palette)
            commit('SET_FEATURES', payload.data.features)
            commit('SET_NODE_RED_VERSION', payload.data.nodeRedVersion)
            dispatch('requestSupportedActions')
            dispatch('requestSelectedNodes')
            dispatch('registerEventListeners')
            return await dispatch('requestPalette')
        case typeof eventsRegistry[payload.data.type] === 'object':
            return dispatch('setRegisteredEventProperty', {
                registeredEvent: eventsRegistry[payload.data.type],
                data: payload.data
            })
        case payload.data.type === 'get-assistant-version':
            return dispatch('setVersion', payload.data.version)
        case payload.data.type === 'get-supported-actions':
            return dispatch('setSupportedActions', payload.data.supportedActions)
        case payload.data.type === 'set-palette':
            return dispatch('setPalette', payload.data.palette)
        case payload.data.type === 'set-assistant-features':
            return dispatch('setFeatures', payload.data.features)
        case payload.data.type === 'set-selection':
            return dispatch('setSelectedNodes', payload.data.selection)
        case payload.data.type === 'debug-log-entry':
            return dispatch('addDebugLogEntry', payload.data.entry)
        default:
            // do nothing
        }
    },
    requestVersion: async ({ dispatch }) => {
        return dispatch('sendMessage', 'get-assistant-version')
    },
    requestSupportedActions: async ({ dispatch }) => {
        return dispatch('sendMessage', { type: 'get-supported-actions' })
    },
    requestPalette: async ({ dispatch }) => {
        return dispatch('sendMessage', { type: 'get-palette' })
    },
    requestSelectedNodes: async ({ dispatch }) => {
        return dispatch('sendMessage', { type: 'get-selection' })
    },
    registerEventListeners: async ({ dispatch }) => {
        return dispatch('sendMessage', {
            type: 'register-event-listeners',
            params: eventsRegistry
        })
    },
    setRegisteredEventProperty: ({ commit }, { registeredEvent, data }) => {
        commit('SET_REGISTERED_EVENT_PROPERTY', { registeredEvent, data })
    },
    setVersion: ({ commit }, version) => {
        commit('SET_VERSION', version)
    },
    setSupportedActions: ({ commit }, supportedActions) => {
        commit('SET_SUPPORTED_ACTIONS', supportedActions)
    },
    setFeatures: ({ commit }, features) => {
        commit('SET_FEATURES', features)
    },
    setPalette: ({ commit }, palette) => {
        commit('SET_PALETTE', palette)
    },
    setSelectedNodes: async ({ commit }, selection) => {
        commit('SET_SELECTED_NODES', selection)
    },
    setSelectedContext: async ({ commit }, context) => {
        commit('SET_SELECTED_CONTEXT', context)
    },
    addDebugLogEntry: async ({ commit }, entry) => {
        commit('ADD_DEBUG_LOG_ENTRY', entry)
    },
    reset: ({ commit }) => {
        commit('RESET')
    },
    resetContextSelection: ({ commit, getters }) => {
        const defaultContext = getters.availableContextOptions
        commit('SET_SELECTED_CONTEXT', defaultContext)
    },
    sendFlowsToImport: async ({ dispatch }, flowsJson) => {
        return dispatch('sendMessage', {
            type: 'invoke-action',
            action: 'custom:import-flow',
            params: {
                flow: flowsJson // parameters to go with the action
            }
        })
    },
    installNodePackage: async ({ dispatch }, packageName) => {
        return dispatch('sendMessage', {
            type: 'invoke-action',
            action: 'core:manage-palette',
            params: {
                view: 'install',
                filter: packageName
            }
        })
    },
    manageNodePackage: async ({ dispatch }, packageName) => {
        return dispatch('sendMessage', {
            type: 'invoke-action',
            action: 'core:manage-palette',
            params: {
                view: 'nodes',
                filter: packageName
            }
        })
    },
    sendMessage ({ getters }, payload) {
        const service = messagingService()
        return service.sendMessage({
            message: {
                ...payload,
                ...state.scope // includes target, source, scope
            },
            target: window.frames['immersive-editor-iframe'],
            targetOrigin: getters.immersiveInstance?.url
        })
    }
}

export default {
    namespaced: true,
    state,
    initialState,
    getters,
    mutations,
    actions,
    meta
}
