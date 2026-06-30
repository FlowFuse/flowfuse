import { defineStore } from 'pinia'
import SemVer from 'semver'

import getAppOrchestrator from '@/services/app.orchestrator'
import { useContextStore } from '@/stores/context.js'

const MAX_DEBUG_LOG_ENTRIES = 100 // maximum number of debug log entries to keep

// --- Expert tool permissions (human-in-the-loop, #421) -----------------------
// Pending tool-approval resolvers, keyed by approval id. Kept at module scope
// (not in store state) so the Map and the Promise resolvers it holds are never
// wrapped in a reactive proxy, which would break their internals.
const pendingToolApprovals = new Map()

const TOOL_POLICIES = ['allow', 'ask', 'deny']
const isToolPolicy = (p) => TOOL_POLICIES.includes(p)
const TOOL_CLASSES = ['read', 'write', 'delete']
// Fail-safe default when a class has no configured default: read allows, the rest ask.
const fallbackForToolClass = (cls) => (cls === 'read' ? 'allow' : 'ask')

// Derive a tool's permission class from its catalog entry. Read tools view only;
// delete tools are destructive writes; everything else that changes flows is write.
export const classOf = (entry) => {
    if (!entry) return 'write'
    if (entry.toolClass === 'read') return 'read'
    if (entry.toolClass === 'delete' || entry.destructive === true) return 'delete'
    return 'write'
}

// Tool groups partition the catalog into the sections shown in the permissions UI
// (flow-building vs FlowFuse platform). Each group is meant to carry its own
// read/write/delete defaults so a default for one never silently applies to the other.
export const TOOL_GROUPS = { FLOW_BUILDING: 'flow-building', PLATFORM: 'platform' }

// Which group a catalog entry belongs to. Today every tool the agent serves is a
// flow-building tool, so everything maps to 'flow-building'.
// TODO(platform-tools): once Steve's platform-tool work is merged into the agent,
// platform tools arrive in the same catalog. Map them to TOOL_GROUPS.PLATFORM here —
// e.g. off a `group`/`target` field added to the catalog entry in buildToolCatalog
// (get_mcp_tools.js) or a tool annotation — so the UI routes them to the FlowFuse
// Platform Tools section and applies that group's own defaults (see the toolDefaults
// TODO below for namespacing the defaults by group at the same time).
export const groupOf = (entry) => entry?.group || TOOL_GROUPS.FLOW_BUILDING

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
    },
    'registry:updates-available': {
        nodeRedEvent: 'registry:updates-available',
        propertyBag: 'editorState',
        propertyName: 'updatesAvailable',
        propertyValue: null,
        useEventData: true // use event data to set this property
    },
    'flows:loaded': {
        nodeRedEvent: 'flows:loaded',
        propertyBag: 'editorState',
        propertyName: 'flowsLoaded',
        propertyValue: true
    },
    'runtime-state': {
        nodeRedEvent: 'runtime-state',
        propertyBag: 'editorState',
        propertyName: 'runtimeState',
        propertyValue: null,
        useEventData: true
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

// Flags that can be used in the assistant to indicate support for features this side in the expert.
// This will prevent the assistant from offering options that aren't supported
// e.g. inhibit showing the "Add debug to context" buttons
// NOTE: Some flags may not be used (since they have no visible effect on NR)
// NOTE: These flags may one day be set based on user level or team settings, but for now we will just set them to true since we support all features in the expert.
const supportedFeatures = {
    debugLogContext: { enabled: true }, // allows the expert to include debug log entries in the expert context
    flowImport: { enabled: true }, // flag to let assistant know flows can be offered to import onto the workspace
    flowSelection: { enabled: true }, // allows user to select nodes on workspace and have that selection sent to the expert context
    paletteManagement: { enabled: true } // allows the expert to send commands to show the palette manager
}

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
        menuIcon: 'Bars4Icon',
        showAsChip: false,
        onSelectAction: 'requestDebugLogContextVisibleEntries'
    },
    {
        value: 'visible-debug-errors',
        name: 'Error Logs',
        label: 'Add Debug Logs (errors only)',
        menuIcon: 'Bars4Icon',
        showAsChip: false,
        onSelectAction: 'requestDebugLogContextVisibleErrorEntries'
    }
]

function buildInitialEditorState () {
    const editorState = {}
    Object.values(eventsRegistry).forEach(eventDetails => {
        if (eventDetails.propertyBag === 'editorState') {
            editorState[eventDetails.propertyName] = false
        }
    })
    return editorState
}

export const useProductAssistantStore = defineStore('product-assistant', {
    state: () => ({
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
        // don't add items with onSelectAction — they are handled differently
        selectedContext: [...ALL_CONTEXT_OPTIONS].filter(option => !option.onSelectAction),
        // NOTE: state is named debugLogEntries to avoid a name conflict with the
        // debugLog getter which gates the feature flag. Use this.debugLogEntries
        // internally; external consumers should read this.debugLog (the getter).
        debugLogEntries: [],
        editorState: { ...buildInitialEditorState() },
        pendingRequests: new Map(), // key is transactionId, value is { resolve, reject, timeout, timestamp, type, action, params }
        // Expert tool permissions (HITL, #421). The catalog + hash are refreshed from
        // the agent; defaults + preferences are the user's choices (persisted below).
        toolCatalog: [],
        toolCatalogHash: null,
        // Standing read/write/delete defaults. Today these are the flow-building tools'
        // defaults (the only tools that exist).
        // TODO(platform-tools): when platform tools land (see groupOf), namespace these
        // by tool group so flow-building and platform actions carry independent defaults,
        // and migrate the persisted shape from { read, write, delete } accordingly.
        toolDefaults: { read: 'allow', write: 'ask', delete: 'ask' },
        toolPreferences: {}
    }),
    getters: {
        isImmersiveInstance: () => {
            const contextStore = useContextStore()

            return contextStore.instance && contextStore.isImmersive
        },
        isImmersiveDevice: () => {
            const contextStore = useContextStore()

            return contextStore.device && contextStore.isImmersive
        },
        hasUserSelection: (state) => state.selectedNodes.length > 0,
        hasContextSelection: (state) => state.selectedContext.length > 0,
        hasDebugLogsSelected () {
            return this.debugLog?.length > 0
        },
        isFeaturePaletteEnabled: (state) => {
            if (!supportedFeatures.paletteManagement?.enabled) {
                return false
            }
            if (state.assistantFeatures?.commands?.['get-palette']?.enabled === false) {
                return false
            }
            // introduced in nr-assistant 0.11.0 were actual support flags
            if (state.assistantFeatures?.paletteManagement?.enabled === false) {
                return false
            }
            return true
        },
        isFeatureDebugLogContextEnabled: (state) => {
            if (!supportedFeatures.debugLogContext?.enabled) {
                return false
            }
            if (!state.assistantFeatures?.debugLogContext?.enabled || !supportedFeatures.debugLogContext?.enabled) {
                return false
            }
            if (!state.nodeRedVersion || !SemVer.valid(state.nodeRedVersion) || SemVer.lt(state.nodeRedVersion, '4.1.6')) {
                // while nr-assistant 0.11.0 with debug log context support can be installed on NR 4.1.5 and below,
                // the feature requires new functionality in Node-RED 4.1.6
                return false
            }
            return true
        },
        /**
         * Returns the list of context options that are currently available based on the assistant features, filtering out
         * options that are not available. This is used to populate the dropdown menu when selecting context options in the chat ui.
         */
        availableContextOptions () {
            return ALL_CONTEXT_OPTIONS.filter(option => {
                switch (true) {
                case option.value === 'visible-debug-logs':
                case option.value === 'visible-debug-errors':
                    return this.isFeatureDebugLogContextEnabled
                case option.value === 'palette':
                    return this.isFeaturePaletteEnabled
                }
                return true
            })
        },
        getSelectedContext (state) {
            const availableOptions = {}
            this.availableContextOptions.forEach(option => {
                availableOptions[option.value] = option
            })
            return state.selectedContext.filter(c => availableOptions[c.value])
        },
        paletteContribOnly (state) {
            if (this.isFeaturePaletteEnabled === false) {
                return null
            }
            const palette = { ...(state.palette || {}) }
            delete palette['node-red']
            return palette
        },
        /**
         * Returns the debug log entries, or null if the feature is disabled.
         * NOTE: Named debugLog (not debugLogEntries) to match the Vuex getter name used by consumers.
         */
        debugLog (state) {
            if (this.isFeatureDebugLogContextEnabled === false) {
                return null
            }
            return state.debugLogEntries || []
        },
        allowedInboundOrigins () {
            const allowedOrigins = [window.origin]
            const instance = useContextStore().instance
            const device = useContextStore().device
            if (instance?.url) allowedOrigins.push(instance.url)
            if (device?.editor?.url) {
                // todo this might not be needed because it's just the path to the editor tunnel, not an actual origin
                //   and the only origin we might receive messages is the current window origin
                allowedOrigins.push(device.editor.url)
            }
            return allowedOrigins
        },
        isEditorRunning: (state) => {
            // NOTE: this is achieved via dynamic event registration for 'flows:loaded' and 'runtime-state' events,
            // which requires nr-assistant version 0.10.1 or later.
            return state.editorState?.flowsLoaded || state.editorState?.runtimeState?.state === 'start'
        },
        // --- Expert tool permissions (HITL, #421) ---
        /** The standing default for a tool class ('read'|'write'|'delete'). */
        defaultForToolClass: (state) => (cls) => {
            const d = state.toolDefaults?.[cls]
            return isToolPolicy(d) ? d : fallbackForToolClass(cls)
        },
        /**
         * Effective policy for a catalog key. An explicit per-tool preference always
         * wins; otherwise the standing default for the tool's class applies.
         */
        toolPolicyFor: (state) => (key) => {
            const explicit = state.toolPreferences[key]
            if (isToolPolicy(explicit)) return explicit
            const entry = state.toolCatalog.find(t => t.key === key)
            const cls = classOf(entry)
            const d = state.toolDefaults?.[cls]
            return isToolPolicy(d) ? d : fallbackForToolClass(cls)
        },
        /**
         * The resolved permission map sent to the agent in the chat context:
         * { defaults, tools: { [key]: 'allow'|'ask'|'deny' } }.
         */
        resolvedToolPermissions: (state) => {
            const defaults = {}
            for (const cls of TOOL_CLASSES) {
                defaults[cls] = isToolPolicy(state.toolDefaults?.[cls]) ? state.toolDefaults[cls] : fallbackForToolClass(cls)
            }
            const tools = {}
            for (const t of state.toolCatalog) {
                const explicit = state.toolPreferences[t.key]
                tools[t.key] = isToolPolicy(explicit) ? explicit : defaults[classOf(t)]
            }
            return { defaults, tools }
        },
        /**
         * Availability of a tool against the instance's installed nr-assistant version
         * (from `_meta.assistantMinVersion` / `assistantMaxVersion` on each entry).
         * Returns { status: 'available'|'requires-update'|'deprecated', deprecated, requiredVersion }.
         * - requires-update: instance is below the tool's min version (update to enable).
         * - deprecated: instance is past the tool's max version (a newer variant supersedes it).
         * - available + deprecated flag: in range, but a max is set so an update will supersede it.
         */
        toolAvailabilityFor: (state) => (entry) => {
            const version = state.version
            const min = entry?.minVersion || null
            const max = entry?.maxVersion || null
            if (!version || !SemVer.valid(version)) {
                // Without a known instance version we can't gate — treat as usable.
                return { status: 'available', deprecated: !!max, requiredVersion: min }
            }
            if (min && SemVer.valid(min) && SemVer.lt(version, min)) {
                return { status: 'requires-update', deprecated: false, requiredVersion: min }
            }
            if (max && SemVer.valid(max) && SemVer.gt(version, max)) {
                return { status: 'deprecated', deprecated: true, requiredVersion: null }
            }
            return { status: 'available', deprecated: !!max, requiredVersion: null }
        }
    },
    actions: {
        async handleMessage (payload) {
            if (!this.allowedInboundOrigins.includes(payload.origin)) {
                console.warn('Received message from unknown origin. Ignoring.')
                return
            }

            const payloadData = payload.data || {}
            if (payloadData.correlationId && payloadData.type === 'invoke-action') {
                const { correlationId } = payloadData
                const inflight = this.pendingRequests.get(correlationId)
                if (inflight) {
                    // console.debug('Received response for in-flight request:', { correlationId, originalRequest: inflight.postMessagePayload, response: payloadData })
                    inflight.resolve(payloadData)
                    this.pendingRequests.delete(correlationId)
                } else {
                    console.warn('Received response with correlationId that does not match any in-flight requests. Ignoring.', { correlationId, response: payloadData })
                }
            }

            switch (true) {
            case payload.data.type === 'assistant-ready':
                this.version = payload.data.version
                this.palette = payload.data.palette ?? {}
                this.assistantFeatures = payload.data.features
                this.nodeRedVersion = payload.data.nodeRedVersion
                this.setRegisteredEventProperty({
                    registeredEvent: eventsRegistry['registry:updates-available'],
                    eventData: payload.data.nodeRedUpdatesAvailable
                })
                this.requestSupportedActions()
                this.requestSelectedNodes()
                this.registerEventListeners()
                this.requestPalette()
                return await this.confirmExpertReady()
            case typeof eventsRegistry[payload.data.type] === 'object':
                return this.setRegisteredEventProperty({
                    registeredEvent: eventsRegistry[payload.data.type],
                    eventData: payload.data.eventData
                })
            case payload.data.type === 'get-assistant-version':
                return this.setVersion(payload.data.version)
            case payload.data.type === 'get-supported-actions':
                return this.setSupportedActions(payload.data.supportedActions)
            case payload.data.type === 'set-palette':
                return this.setPalette(payload.data.palette)
            case payload.data.type === 'set-assistant-features':
                return this.setFeatures(payload.data.features)
            case payload.data.type === 'set-selection':
                return this.setSelectedNodes(payload.data.selection)
            // case payload.data.type === 'debug-log-entry':
            case payload.data.type === 'debug-log-context-add':
                return this.addDebugLogContext(payload.data.debugLog)
            case payload.data.type === 'debug-log-context-remove':
                return this.removeDebugLogContext(payload.data.debugLog)
            case payload.data.type === 'debug-log-context-clear':
                return this.resetDebugLogContext()
            case payload.data.type === 'nr-assistant/workspace:change': {
                if (payload.data.tab?.label) {
                    const instanceName = useContextStore().instance?.name
                    const suffix = instanceName ? ` - ${instanceName} - FlowFuse` : ' - FlowFuse'
                    document.title = `Node-RED: ${payload.data.tab.label}${suffix}`
                }
                break
            }
            default:
                // do nothing
            }
        },
        async confirmExpertReady () {
            return this.sendMessage({
                type: 'expert-ready',
                params: { supportedFeatures }
            })
        },
        /**
         * Sends the list of registered debug log entries to the assistant, to sync
         * the state of debug log context between Node-RED and the expert.
         */
        async sendDebugLogRegister () {
            const register = this.debugLogEntries.map(entry => entry.uuid)
            return this.sendMessage({
                type: 'debug-log-context-registered',
                params: { register }
            })
        },
        /**
         * Requests the debug log entries that are currently visible in the debug sidebar.
         * NOTE: This first clears the current debug log context in state so that incoming entries replace the current context instead of adding to it.
         */
        async requestDebugLogContextVisibleEntries () {
            this.debugLogEntries = []
            return this.sendMessage({
                type: 'debug-log-context-get-entries',
                params: { visibleOnly: true, fatal: true, error: true, warn: true, info: true, debug: true, trace: false }
            })
        },
        /**
         * Requests the debug log entries that are currently visible in the debug sidebar, but only errors and fatals.
         * NOTE: This first clears the current debug log context in state so that incoming entries replace the current context instead of adding to it.
         */
        async requestDebugLogContextVisibleErrorEntries () {
            this.debugLogEntries = []
            return this.sendMessage({
                type: 'debug-log-context-get-entries',
                params: { visibleOnly: true, fatal: true, error: true, warn: false, info: false, debug: false, trace: false }
            })
        },
        async requestVersion () {
            return this.sendMessage('get-assistant-version')
        },
        async requestSupportedActions () {
            return this.sendMessage({ type: 'get-supported-actions' })
        },
        async requestPalette () {
            return this.sendMessage({ type: 'get-palette' })
        },
        async requestSelectedNodes () {
            return this.sendMessage({ type: 'get-selection' })
        },
        async registerEventListeners () {
            return this.sendMessage({
                type: 'register-event-listeners',
                params: eventsRegistry
            })
        },
        setRegisteredEventProperty ({ registeredEvent, eventData }) {
            const propertyBag = registeredEvent.propertyBag
            if (!propertyBag || !Object.prototype.hasOwnProperty.call(this, propertyBag)) {
                return
            }
            const propertyName = registeredEvent.propertyName
            if (!propertyName) {
                return
            }
            const propertyValue = registeredEvent.useEventData === true ? eventData : registeredEvent.propertyValue
            this[propertyBag][propertyName] = propertyValue
        },
        setVersion (version) {
            this.version = version
        },
        setSupportedActions (supportedActions) {
            this.supportedActions = supportedActions
        },
        setFeatures (features) {
            this.assistantFeatures = features
        },
        setPalette (palette) {
            this.palette = palette ?? {}
        },
        async setSelectedNodes (selection) {
            this.selectedNodes = selection
        },
        async setSelectedContext (context) {
            this.selectedContext = context || []
        },
        async addDebugLogContext (debugLog) {
            if (!debugLog) {
                return
            }
            const entries = (Array.isArray(debugLog) ? debugLog : [debugLog]).filter(Boolean)
            if (entries.length === 0) {
                return
            }
            // so long as the uuid of the entry is not already present, add it.
            entries.forEach(e => {
                if (!this.debugLogEntries.some(logEntry => logEntry.uuid === e.uuid)) {
                    this.debugLogEntries.push(e) // push will add to the end of the array, which is the most recent entries at the end
                }
            })
            // remove any excess entries beyond the max, keeping the most recent ones
            if (this.debugLogEntries.length > MAX_DEBUG_LOG_ENTRIES) {
                this.debugLogEntries.splice(0, this.debugLogEntries.length - MAX_DEBUG_LOG_ENTRIES) // splice will remove the oldest entries at the start of the array
            }
            this.sendDebugLogRegister() // sync node-red state with expert state after adding new entries
        },
        async removeDebugLogContext (debugLog) {
            if (!debugLog) {
                return
            }
            const entries = (Array.isArray(debugLog) ? debugLog : [debugLog]).filter(Boolean)
            if (entries.length === 0) {
                return
            }
            // for each entry, get the uuid and find the matching log entry & remove it
            entries.forEach(e => {
                const index = this.debugLogEntries.findIndex(logEntry => logEntry.uuid === e.uuid)
                if (index !== -1) {
                    this.debugLogEntries.splice(index, 1)
                }
            })
            this.sendDebugLogRegister() // sync node-red state with expert state after removing entries
        },
        async resetDebugLogContext () {
            this.debugLogEntries = []
            this.sendDebugLogRegister() // sync node-red state with expert state after clearing entries
        },
        reset () {
            this.$reset()
        },
        resetContextSelection () {
            this.selectedContext = this.availableContextOptions
        },
        async invokeAction ({ action, params }) {
            return this.sendMessage({
                type: 'invoke-action',
                action,
                params
            })
        },
        async invokeActionAwaitResponse ({ action, params, sessionId, transactionId, chatTransactionId }, timeout = 5000) {
            // create a promise that will resolve when we receive a response with the matching sessionId and transactionId, or reject after a timeout
            const pending = {
                resolve: null,
                reject: null,
                resolved: false,
                rejected: false,
                timeout: null,
                timestamp: Date.now(),
                type: 'invoke-action',
                action,
                params,
                sessionId,
                transactionId,
                chatTransactionId
            }
            const promise = new Promise((resolve, reject) => {
                pending.resolve = (payload) => {
                    clearTimeout(pending.timeout)
                    this.pendingRequests.delete(pending.transactionId)
                    if (pending.resolved) return
                    if (pending.rejected) return
                    pending.resolved = true
                    resolve(payload)
                }
                pending.reject = (error) => {
                    clearTimeout(pending.timeout)
                    this.pendingRequests.delete(pending.transactionId)
                    if (pending.resolved) return
                    if (pending.rejected) return
                    pending.rejected = true
                    reject(error)
                }
                pending.timeout = setTimeout(() => {
                    pending.reject(new Error('Node-RED command timed out'))
                }, timeout)
            })
            const correlationId = `${sessionId}:${chatTransactionId}:${transactionId}`
            this.pendingRequests.set(correlationId, pending)
            this.sendMessage({
                type: 'invoke-action',
                action,
                params,
                correlationId // post Message Correlation Id
            })
            return promise
        },
        async sendFlowsToImport (flowsJson) {
            return this.sendMessage({
                type: 'invoke-action',
                action: 'custom:import-flow',
                params: {
                    flow: flowsJson // parameters to go with the action
                }
            })
        },
        async installNodePackage (packageName) {
            return this.sendMessage({
                type: 'invoke-action',
                action: 'core:manage-palette',
                params: {
                    view: 'install',
                    filter: packageName
                }
            })
        },
        async manageNodePackage (packageName) {
            return this.sendMessage({
                type: 'invoke-action',
                action: 'core:manage-palette',
                params: {
                    view: 'nodes',
                    filter: packageName
                }
            })
        },
        // --- Expert tool permissions (HITL, #421) ---
        setToolCatalog (catalog, hash) {
            this.toolCatalog = Array.isArray(catalog) ? catalog : []
            if (hash !== undefined) {
                this.toolCatalogHash = hash || null
            }
        },
        setToolClassDefault (cls, policy) {
            if (!TOOL_CLASSES.includes(cls) || !isToolPolicy(policy)) return
            this.toolDefaults = { ...this.toolDefaults, [cls]: policy }
        },
        setToolPreference (key, policy) {
            if (!isToolPolicy(policy)) return
            this.toolPreferences = { ...this.toolPreferences, [key]: policy }
        },
        clearToolPreference (key) {
            if (!(key in this.toolPreferences)) return
            const next = { ...this.toolPreferences }
            delete next[key]
            this.toolPreferences = next
        },
        // Pending approvals (module-level map; see note at top of file).
        registerPendingApproval (id, resolve, meta = {}) {
            pendingToolApprovals.set(id, { resolve, meta })
        },
        getPendingApproval (id) {
            return pendingToolApprovals.get(id) || null
        },
        resolvePendingApproval (id, approved) {
            const entry = pendingToolApprovals.get(id)
            if (!entry) return false
            pendingToolApprovals.delete(id)
            entry.resolve(!!approved)
            return true
        },
        hasPendingApprovals () {
            return pendingToolApprovals.size > 0
        },
        // Resolve every open approval as denied — used when the user stops the chat so
        // the agent's approval wait unblocks instead of hanging on an abandoned prompt.
        rejectAllPendingApprovals () {
            for (const entry of pendingToolApprovals.values()) {
                entry.resolve(false)
            }
            pendingToolApprovals.clear()
        },
        sendMessage (payload) {
            const orchestrator = getAppOrchestrator()
            const contextStore = useContextStore()

            orchestrator.$serviceInstances.postMessage.sendMessage({
                message: {
                    ...payload,
                    ...this.scope
                },
                target: window.frames['immersive-editor-iframe'],
                targetOrigin: (contextStore.instance || contextStore.device)?.url
            })
        }
    },
    // Only the user's HITL tool-permission choices persist across sessions; the
    // catalog/hash and all editor/session state are re-derived each session.
    persist: {
        pick: ['toolDefaults', 'toolPreferences'],
        storage: localStorage
    }
})
