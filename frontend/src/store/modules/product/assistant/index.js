import messagingService from '../../../../services/messaging.service.js'
const MAX_DEBUG_LOG_ENTRIES = 100 // maximum number of debug log entries to keep

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

/**
 * @typedef {Object} ContextOption
 * @prop {string} value - the value of the context option, e.g. 'palette'
 * @prop {string} name - the name of the context option, e.g. 'Palette' - this is what is shown in the selected context chip
 * @prop {string} label - the label of the context option, e.g. 'Add Palette to context' - this is what is shown in the dropdown menu when selecting context options
 * @prop {string} menuIcon - the name of the icon to show in the dropdown menu when selecting context options, e.g. 'CubeIcon'
 * @prop {boolean|undefined} [showAsChip] - whether to show this context option as a chip when selected. Defaults to true. If false, the context option will not be shown as a chip when selected, but will still be included in the context list as an option.
 * @prop {string|undefined} [onSelectAction] - an optional action to invoke when this context option is selected.
 */

/**
 * @type {Array<ContextOption>} ALL_CONTEXT_OPTIONS - a list of all available context options. This is used to populate the dropdown menu when selecting context options in the chat ui.
 */
const ALL_CONTEXT_OPTIONS = [
    {
        value: 'palette',
        name: 'Palette',
        label: 'Add Palette to context',
        menuIcon: 'CubeIcon',
        showAsChip: true
    },
    {
        value: 'visible-debug-logs',
        name: 'Debug Logs',
        label: 'Add Debug Logs (all visible)',
        menuIcon: 'ViewListIcon',
        showAsChip: false,
        onSelectAction: 'requestDebugLogContextVisibleEntries'
    },
    {
        value: 'visible-debug-errors',
        name: 'Error Logs',
        label: 'Add Debug Logs (errors only)',
        menuIcon: 'ViewListIcon',
        showAsChip: false,
        onSelectAction: 'requestDebugLogContextVisibleErrorEntries'
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
        selectedContext: [...ALL_CONTEXT_OPTIONS].filter(option => !option.onSelectAction), // don't add items with onSelectAction (they are handled differently)
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
    immersiveDevice: (state, getters, rootState) => {
        return rootState.context.device
    },
    hasUserSelection: (state) => {
        return state.selectedNodes.length
    },
    hasContextSelection: (state) => {
        return state.selectedContext.length
    },
    hasDebugLogsSelected: (state, getters) => {
        return getters.debugLog?.length > 0
    },
    isFeaturePaletteEnabled: (state) => {
        return state.assistantFeatures.commands?.['get-palette']?.enabled ?? false
    },
    isFeatureDebugLogContextEnabled: (state) => {
        return state.assistantFeatures.debugLogContext?.enabled ?? false
    },
    /**
     * Returns the list of context options that are currently available based on the assistant features, filtering out
     * options that are not available. This is used to populate the dropdown menu when selecting context options in the chat ui.
     */
    availableContextOptions: (state, getters) => {
        const options = ALL_CONTEXT_OPTIONS.filter(option => {
            switch (true) {
            case option.value === 'visible-debug-logs':
            case option.value === 'visible-debug-errors':
                return getters.isFeatureDebugLogContextEnabled
            case option.value === 'palette':
                return getters.isFeaturePaletteEnabled
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
        if (getters.isFeatureDebugLogContextEnabled === false) {
            return null
        }
        return state.debugLog || []
    },
    allowedInboundOrigins: (state, getters) => {
        const allowedOrigins = [window.origin]

        if (getters.immersiveInstance?.url) {
            allowedOrigins.push(getters.immersiveInstance.url)
        }

        if (getters.immersiveDevice?.editor?.url) {
            // todo this might not be needed because it's just the path to the editor tunnel, not an actual origin
            //   and the only origin we might receive messages is the current window origin
            allowedOrigins.push(getters.immersiveDevice.editor.url)
        }

        return allowedOrigins
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
    ADD_DEBUG_LOG_CONTEXT (state, debugLog) {
        if (!debugLog) {
            return
        }
        const entries = (Array.isArray(debugLog) ? debugLog : [debugLog]).filter(Boolean)
        if (entries.length === 0) {
            return
        }

        // so long as the uuid of the entry is not already present, add it.
        entries.forEach(e => {
            if (!state.debugLog.some(logEntry => logEntry.uuid === e.uuid)) {
                state.debugLog.push(e) // push will add to the end of the array, which is the most recent entries at the end
            }
        })
        // remove any excess entries beyond the max, keeping the most recent ones
        if (state.debugLog.length > MAX_DEBUG_LOG_ENTRIES) {
            state.debugLog.splice(0, state.debugLog.length - MAX_DEBUG_LOG_ENTRIES) // splice will remove the oldest entries at the start of the array
        }
    },
    REMOVE_DEBUG_LOG_CONTEXT (state, debugLog) {
        if (!debugLog) {
            return
        }
        const entries = (Array.isArray(debugLog) ? debugLog : [debugLog]).filter(Boolean)
        if (entries.length === 0) {
            return
        }
        // for each entry, get the uuid and find the matching log entry & remove it
        entries.forEach(e => {
            const index = state.debugLog.findIndex(logEntry => logEntry.uuid === e.uuid)
            if (index !== -1) {
                state.debugLog.splice(index, 1)
            }
        })
    },
    RESET_DEBUG_LOG_CONTEXT (state) {
        state.debugLog = []
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
        if (!getters.allowedInboundOrigins.includes(payload.origin)) {
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
        // case payload.data.type === 'debug-log-entry':
        case payload.data.type === 'debug-log-context-add':
            return dispatch('addDebugLogContext', payload.data.debugLog)
        case payload.data.type === 'debug-log-context-remove':
            return dispatch('removeDebugLogContext', payload.data.debugLog)
        case payload.data.type === 'debug-log-context-clear':
            return dispatch('resetDebugLogContext')
        default:
            // do nothing
        }
    },
    /**
     * Sends the list of registered debug log entries to the assistant, to sync
     * the state of debug log context between Node-RED and the expert.
     */
    sendDebugLogRegister: async ({ dispatch, state }) => {
        // get a list of uuids from state.debugLog and send them to assistant
        const register = state.debugLog.map(entry => entry.uuid)
        return dispatch('sendMessage', {
            type: 'debug-log-context-registered',
            params: { register }
        })
    },
    /**
     * Requests the debug log entries that are currently visible in the debug sidebar.
     * NOTE: This first clears the current debug log context in state so that incoming entries replace the current context instead of adding to it.
     */
    requestDebugLogContextVisibleEntries: async ({ dispatch, state }) => {
        state.debugLog = []
        return dispatch('sendMessage', {
            type: 'debug-log-context-get-entries',
            params: { visibleOnly: true, fatal: true, error: true, warn: true, info: true, debug: true, trace: false }
        })
    },
    /**
     * Requests the debug log entries that are currently visible in the debug sidebar, but only errors and fatals.
     * NOTE: This first clears the current debug log context in state so that incoming entries replace the current context instead of adding to it.
     */
    requestDebugLogContextVisibleErrorEntries: async ({ dispatch, state }) => {
        state.debugLog = []
        return dispatch('sendMessage', {
            type: 'debug-log-context-get-entries',
            params: { visibleOnly: true, fatal: true, error: true, warn: false, info: false, debug: false, trace: false }
        })
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
    addDebugLogContext: async ({ commit, dispatch }, debugLog) => {
        commit('ADD_DEBUG_LOG_CONTEXT', debugLog)
        dispatch('sendDebugLogRegister') // sync node-red state with expert state after adding new entries
    },
    removeDebugLogContext: async ({ commit, dispatch }, debugLog) => {
        commit('REMOVE_DEBUG_LOG_CONTEXT', debugLog)
        dispatch('sendDebugLogRegister') // sync node-red state with expert state after removing entries
    },
    resetDebugLogContext: async ({ commit, dispatch }) => {
        commit('RESET_DEBUG_LOG_CONTEXT')
        dispatch('sendDebugLogRegister') // sync node-red state with expert state after clearing entries
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
