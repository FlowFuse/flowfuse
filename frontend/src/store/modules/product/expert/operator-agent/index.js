import expertApi from '../../../../../api/expert.js'
import useTimerHelper from '../../../../../composables/TimersHelper.js'

const qwe = [{ _type: 'ai', answer: [{ content: 'Hello! I can help you gather insights by interacting with your configured resources and MCP tools in your Node-RED instances. What would you like to find out?', _streamed: true, _uuid: '1d2888c2-8c07-4437-aafb-e907449188bf' }], _timestamp: 1772031664170, _streamed: false, _uuid: '2a45f413-8f4e-41bb-a899-305f7437066b' }, { _type: 'human', content: 'get the ISS position', _timestamp: 1772031672964, _uuid: '363caf9e-a0e5-4583-857f-fa7b808e535f' }, { query: 'get the ISS position', kind: 'chat', type: 'AIMessage', answer: [{ mcpServerName: 'unknown', toolId: 'mcp_tool__acme-mcp-server-1__get_iss_position', toolName: 'get_iss_position', toolTitle: 'Get ISS Position', toolDescription: 'Retrieves the latitude and longitude of the Internanational Space Station', kind: 'mcp_tool', input: {}, output: '{\n  "message": "success",\n  "iss_position": {\n    "latitude": "-46.6415",\n    "longitude": "54.1546"\n  },\n  "timestamp": 1772031675\n}', durationMs: 480, timestamp: 1772031674787, _uuid: '4329e7cc-74c6-4fa4-b598-1ecc6a03cc5b', _streamed: false }, { title: 'Response', schemaName: 'ChatSchema', intent: 'general-question', followUp: false, content: 'The current position of the International Space Station (ISS) is approximately at latitude -46.6415 and longitude 54.1546. If you want to integrate this data into a Node-RED flow managed by FlowFuse, you can use HTTP request nodes or custom API calls to fetch and process this information dynamically. Let me know if you need guidance on how to set this up in your Node-RED instance.', kind: 'chat', _uuid: '28d3639c-c639-44b0-a4e9-f1009c2733f7', _streamed: true }], transactionId: 'd053d7d7-a527-495c-9501-fcf8ef36c0dd', _type: 'ai', _timestamp: 1772031678383, _streamed: false, _uuid: '3cd92b2e-382c-4b82-8edc-26d1505559d9' }]
const qwe2 = [{ _type: 'ai', answer: [{ content: 'Hello! I can help you gather insights by interacting with your configured resources and MCP tools in your Node-RED instances. What would you like to find out?', _streamed: true, _uuid: '1d2888c2-8c07-4437-aafb-e907449188bf' }], _timestamp: 1772031664170, _streamed: false, _uuid: '2a45f413-8f4e-41bb-a899-305f7437066b' }, { _type: 'human', content: 'get the ISS position', _timestamp: 1772031672964, _uuid: '363caf9e-a0e5-4583-857f-fa7b808e535f' }, { query: 'get the ISS position', kind: 'chat', type: 'AIMessage', answer: [{ mcpServerName: 'unknown', toolId: 'mcp_tool__acme-mcp-server-1__get_iss_position', toolName: 'get_iss_position', toolTitle: 'Get ISS Position', toolDescription: 'Retrieves the latitude and longitude of the Internanational Space Station', kind: 'mcp_tool', input: {}, output: '{\n  "message": "success",\n  "iss_position": {\n    "latitude": "-46.6415",\n    "longitude": "54.1546"\n  },\n  "timestamp": 1772031675\n}', durationMs: 480, timestamp: 1772031674787, _uuid: '4329e7cc-74c6-4fa4-b598-1ecc6a03cc5b', _streamed: false }, { title: 'Response', schemaName: 'ChatSchema', intent: 'general-question', followUp: false, content: 'The current position of the International Space Station (ISS) is approximately at latitude -46.6415 and longitude 54.1546. If you want to integrate this data into a Node-RED flow managed by FlowFuse, you can use HTTP request nodes or custom API calls to fetch and process this information dynamically. Let me know if you need guidance on how to set this up in your Node-RED instance.', kind: 'chat', _uuid: '28d3639c-c639-44b0-a4e9-f1009c2733f7', _streamed: true }], transactionId: 'd053d7d7-a527-495c-9501-fcf8ef36c0dd', _type: 'ai', _timestamp: 1772031678383, _streamed: false, _uuid: '3cd92b2e-382c-4b82-8edc-26d1505559d9' }, { _type: 'human', content: 'get the iss position and greet serban', _timestamp: 1772032704466, _uuid: 'e01ca065-9027-47c9-a898-8ee123f87334' }, { query: 'get the iss position and greet serban', kind: 'chat', type: 'AIMessage', answer: [{ mcpServerName: 'unknown', toolId: 'mcp_tool__acme-mcp-server-1__get_iss_position', toolName: 'get_iss_position', toolTitle: 'Get ISS Position', toolDescription: 'Retrieves the latitude and longitude of the Internanational Space Station', kind: 'mcp_tool', input: {}, output: '{\n  "message": "success",\n  "iss_position": {\n    "latitude": "-1.2302",\n    "longitude": "105.8413"\n  },\n  "timestamp": 1772032707\n}', durationMs: 522, timestamp: 1772032707389, _uuid: '4d37630e-9538-4515-bf83-bd7d40ffe0e3', _streamed: false }, { mcpServerName: 'unknown', toolId: 'mcp_tool__acme-mcp-server-1__greeting', toolName: 'greeting', toolTitle: 'greeting', toolDescription: 'Greet person by name', kind: 'mcp_tool', input: { name: 'serban' }, output: 'This response is defined in a Node-RED change node. Hi serban', durationMs: 2042, timestamp: 1772032707912, _uuid: 'dfaf725e-ac41-48cf-b64c-28bc6a5ac5cc', _streamed: false }, { title: 'Response', schemaName: 'ChatSchema', intent: 'general-question', followUp: false, content: 'The current position of the International Space Station (ISS) is approximately at latitude -1.2302 and longitude 105.8413. Also, hello serban! If you want to automate fetching the ISS position and sending greetings within your Node-RED flows managed by FlowFuse, I can guide you on setting that up.', kind: 'chat', _uuid: '97d3f313-508c-4c24-82eb-ebb1c8c7f55c', _streamed: true }], transactionId: '2d70031a-0134-407e-a6f6-aaa3e4399eba', _type: 'ai', _timestamp: 1772032711718, _streamed: false, _uuid: '337a211c-d9bb-4d77-8db2-3a802e88785e' }, { _type: 'human', content: 'get the iss position and greet alex', _timestamp: 1772033401030, _uuid: '5f948b63-3bdf-4942-b755-5a2c5f0ebe90' }, { query: 'get the iss position and greet alex', kind: 'chat', type: 'AIMessage', answer: [{ mcpServerName: 'unknown', toolId: 'mcp_tool__acme-mcp-server-1__get_iss_position', toolName: 'get_iss_position', toolTitle: 'Get ISS Position', toolDescription: 'Retrieves the latitude and longitude of the Internanational Space Station', kind: 'mcp_tool', input: {}, output: '{\n  "message": "success",\n  "iss_position": {\n    "latitude": "32.7513",\n    "longitude": "134.4883"\n  },\n  "timestamp": 1772033407\n}', durationMs: 1535, timestamp: 1772033406695, _uuid: 'f80ae131-5256-494d-af6d-a749054b1ae4', _streamed: false }, { mcpServerName: 'unknown', toolId: 'mcp_tool__acme-mcp-server-1__greeting', toolName: 'greeting', toolTitle: 'greeting', toolDescription: 'Greet person by name', kind: 'mcp_tool', input: { name: 'alex' }, output: 'This response is defined in a Node-RED change node. Hi alex', durationMs: 2006, timestamp: 1772033408230, _uuid: '258527fd-710d-4346-bc8a-b459aecba34e', _streamed: false }, { title: 'Response', schemaName: 'ChatSchema', intent: 'general-question', followUp: false, content: 'The current position of the International Space Station (ISS) is at latitude 32.7513 and longitude 134.4883. Also, hello alex! If you want to automate fetching the ISS position and sending greetings like this within your Node-RED flows managed by FlowFuse, I can guide you on how to set that up. How can I assist you further?', kind: 'chat', _uuid: '94f07b02-e2e1-4db9-93b6-ded72f0f589d', _streamed: true }], transactionId: 'e697b3a2-4a30-4db3-a820-f6bb5f191022', _type: 'ai', _timestamp: 1772033412342, _streamed: false, _uuid: 'd0010ce4-6400-4949-99a1-09ff113eb50c' }, { _type: 'system', _variant: 'warning', message: 'Your conversation history will expire soon. You can start a new conversation when this one expires.', _timestamp: 1772034204500, _uuid: '424561ec-1010-48e6-96a5-bb5f3ddfd280' }, { _type: 'system', _variant: 'expired', message: 'Your conversation history has expired. Chat is now disabled. Click "Start Over" to begin a new conversation.', _timestamp: 1772034384509, _uuid: 'd38d9e71-153b-459c-9cf8-d8096175d639' }]

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
        // TODO: this need to be removed when we have https://github.com/FlowFuse/flowfuse/issues/6520 part of
        //  https://github.com/FlowFuse/flowfuse/issues/6519 as it's a hacky workaround to the expert drawer opening up
        //  before we have a team loaded
        const { waitWhile } = useTimerHelper()
        await waitWhile(() => !rootGetters['account/team'], { cutoffTries: 60 })

        const payload = {
            context: {
                teamId: rootGetters['account/team'].id
            }
        }

        return expertApi.getCapabilities(payload)
            .then(data => {
                commit('SET_CAPABILITIES', data.servers || [])
            })
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
