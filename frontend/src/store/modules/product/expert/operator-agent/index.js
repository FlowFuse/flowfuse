// TODO: Uncomment when removing mock capabilities
// import expertApi from '../../../../../api/expert.js'

const initialState = () => ({
    sessionId: null,
    messages: [],

    // Session timing
    sessionStartTime: null,
    sessionWarningShown: false,
    sessionExpiredShown: false,
    sessionCheckTimer: null,

    capabilities: [],
    selectedCapabilities: []
})

const meta = {
    persistence: {
        sessionId: {
            storage: 'localStorage',
            clearOnLogout: true
        }
    }
}

const state = initialState

const getters = {
    capabilities: (state) => {
        return state.capabilities.map(capability => ({
            ...capability,
            toolCount: capability.resources.length + capability.tools.length + capability.prompts.length

        }))
    }
}

const mutations = {
    RESET (state) {
        Object.assign(state, initialState())
    },
    SET_SELECTED_CAPABILITIES (state, selectedCapabilities) {
        state.selectedCapabilities = selectedCapabilities
    },
    SET_CAPABILITIES (state, capabilities) {
        state.capabilities = capabilities
    }
}

const actions = {
    reset ({ commit }) {
        commit('RESET')
    },
    setSelectedCapabilities ({ commit }, selectedCapabilities) {
        commit('SET_SELECTED_CAPABILITIES', selectedCapabilities)
    },
    async getCapabilities ({ commit, rootGetters, state }) {
        // TODO: Remove mock capabilities - for testing ExpertToolCall component
        const mockCapabilities = [
            {
                name: 'Facility 7A - sensor5',
                instance: 'mock-instance-1',
                instanceType: 'instance',
                instanceName: 'Facility 7A',
                mcpServerName: 'sensor5',
                mcpEndpoint: '/mcp',
                mcpProtocol: 'http',
                prompts: [],
                resources: [{ name: 'sensor-data', description: 'Read sensor data' }],
                tools: [{ name: 'getValue', description: 'Get current sensor value' }],
                resourceTemplates: []
            },
            {
                name: 'Facility 7A - actuator3',
                instance: 'mock-instance-1',
                instanceType: 'instance',
                instanceName: 'Facility 7A',
                mcpServerName: 'actuator3',
                mcpEndpoint: '/mcp',
                mcpProtocol: 'http',
                title: 'Controls valve and pump operations',
                prompts: [],
                resources: [{ name: 'valve-status', description: 'Read valve positions' }],
                tools: [
                    { name: 'openValve', description: 'Open a valve' },
                    { name: 'closeValve', description: 'Close a valve' },
                    { name: 'setPumpSpeed', description: 'Set pump speed' }
                ],
                resourceTemplates: []
            },
            {
                name: 'Warehouse B - inventory',
                instance: 'mock-instance-2',
                instanceType: 'instance',
                instanceName: 'Warehouse B',
                mcpServerName: 'inventory',
                mcpEndpoint: '/mcp',
                mcpProtocol: 'http',
                prompts: [],
                resources: [
                    { name: 'stock-levels', description: 'Current inventory counts' },
                    { name: 'locations', description: 'Item storage locations' }
                ],
                tools: [{ name: 'updateStock', description: 'Update stock count' }],
                resourceTemplates: []
            },
            {
                name: 'Warehouse B - shipping',
                instance: 'mock-instance-2',
                instanceType: 'instance',
                instanceName: 'Warehouse B',
                mcpServerName: 'shipping',
                mcpEndpoint: '/mcp',
                mcpProtocol: 'http',
                title: 'Manages shipping labels and tracking',
                prompts: [],
                resources: [{ name: 'pending-shipments', description: 'Shipments awaiting dispatch' }],
                tools: [{ name: 'createLabel', description: 'Generate shipping label' }],
                resourceTemplates: []
            },
            {
                name: 'Production Line 1 - quality-control',
                instance: 'mock-instance-3',
                instanceType: 'instance',
                instanceName: 'Production Line 1',
                mcpServerName: 'quality-control',
                mcpEndpoint: '/mcp',
                mcpProtocol: 'http',
                title: 'Automated inspection and defect detection',
                prompts: [],
                resources: [
                    { name: 'inspection-results', description: 'Latest QC results' },
                    { name: 'defect-images', description: 'Captured defect photos' }
                ],
                tools: [
                    { name: 'runInspection', description: 'Trigger inspection cycle' },
                    { name: 'flagDefect', description: 'Mark item as defective' },
                    { name: 'approveItem', description: 'Mark item as passed' }
                ],
                resourceTemplates: []
            },
            {
                name: 'Production Line 1 - robot-arm',
                instance: 'mock-instance-3',
                instanceType: 'instance',
                instanceName: 'Production Line 1',
                mcpServerName: 'robot-arm',
                mcpEndpoint: '/mcp',
                mcpProtocol: 'http',
                prompts: [],
                resources: [{ name: 'arm-status', description: 'Current arm position and state' }],
                tools: [
                    { name: 'moveTo', description: 'Move arm to coordinates' },
                    { name: 'grip', description: 'Close gripper' }
                ],
                resourceTemplates: []
            },
            {
                name: 'Office HQ - hvac',
                instance: 'mock-instance-4',
                instanceType: 'instance',
                instanceName: 'Office HQ',
                mcpServerName: 'hvac',
                mcpEndpoint: '/mcp',
                mcpProtocol: 'http',
                title: 'Climate control and energy monitoring',
                prompts: [],
                resources: [
                    { name: 'temperature-readings', description: 'Zone temperatures' },
                    { name: 'energy-usage', description: 'Power consumption data' }
                ],
                tools: [
                    { name: 'setTemperature', description: 'Set target temperature' },
                    { name: 'setMode', description: 'Set heating/cooling mode' }
                ],
                resourceTemplates: []
            },
            {
                name: 'Office HQ - security',
                instance: 'mock-instance-4',
                instanceType: 'instance',
                instanceName: 'Office HQ',
                mcpServerName: 'security',
                mcpEndpoint: '/mcp',
                mcpProtocol: 'http',
                prompts: [],
                resources: [{ name: 'access-logs', description: 'Door access history' }],
                tools: [{ name: 'unlockDoor', description: 'Remote door unlock' }],
                resourceTemplates: []
            },
            {
                name: 'Lab R&D - experiment-logger',
                instance: 'mock-instance-5',
                instanceType: 'instance',
                instanceName: 'Lab R&D',
                mcpServerName: 'experiment-logger',
                mcpEndpoint: '/mcp',
                mcpProtocol: 'http',
                title: 'Records test results and observations',
                prompts: [],
                resources: [
                    { name: 'experiment-data', description: 'Recorded measurements' },
                    { name: 'notes', description: 'Researcher notes' }
                ],
                tools: [{ name: 'logObservation', description: 'Record new observation' }],
                resourceTemplates: []
            },
            {
                name: 'Lab R&D - equipment-status',
                instance: 'mock-instance-5',
                instanceType: 'instance',
                instanceName: 'Lab R&D',
                mcpServerName: 'equipment-status',
                mcpEndpoint: '/mcp',
                mcpProtocol: 'http',
                prompts: [],
                resources: [{ name: 'equipment-list', description: 'Lab equipment inventory' }],
                tools: [{ name: 'reportIssue', description: 'Flag equipment problem' }],
                resourceTemplates: []
            }
        ]
        console.log('[MOCK] Setting capabilities:', mockCapabilities)
        commit('SET_CAPABILITIES', mockCapabilities)
        return Promise.resolve()
        // END mock capabilities

        /* Original code - uncomment when backend is ready:
        const payload = {
            context: {
                team: rootGetters['account/team'].id
            }
        }
        return expertApi.getCapabilities(payload)
            .then(data => {
                commit('SET_CAPABILITIES', data.servers || [])
            })
        */
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
