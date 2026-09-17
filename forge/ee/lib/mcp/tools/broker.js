const { z } = require('zod')

const { teamId, basePagination, basePaginationKeys, searchQuery, appendQuery, toolError } = require('../schemas')

// Mirrors the acl shape the broker client dialog builds client-side (see
// frontend/src/pages/team/Brokers/Clients/dialogs/AclItem.vue): 'both' means publish and subscribe.
const aclEntry = z.object({
    action: z.enum(['publish', 'subscribe', 'both']).describe('What the client may do on the matching topic pattern'),
    pattern: z.string().describe('MQTT topic pattern the rule applies to, e.g. "sensors/#"')
})

module.exports = [
    {
        name: 'platform_list_broker_clients',
        title: 'List Broker Clients',
        description: `FlowFuse platform automation tool:
            Lists the MQTT clients registered on the team broker (the built-in MQTT broker that ships with the platform).
            Each entry identifies the client username and, where known, the hosted instance or remote instance it belongs to. This does not include MQTT credentials.
            Supports username search and pagination.
            This tool requires the enterprise license tier and the team broker feature enabled for the team; if the team does not have it enabled, the request returns a not found response.`,
        annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        inputSchema: {
            teamId,
            ...basePagination,
            ...searchQuery
        },
        handler: async (args, { inject }) => {
            const url = appendQuery(`/api/v1/teams/${args.teamId}/broker/clients`, args, [...basePaginationKeys, 'query'])
            const response = await inject({ method: 'GET', url })
            return response
        }
    },
    {
        name: 'platform_get_broker_client',
        title: 'Get Broker Client',
        description: `FlowFuse platform automation tool:
            Gets a single MQTT client registered on the team broker, identified by its username. This does not include MQTT credentials.
            Use this after platform_list_broker_clients to inspect one client in detail.
            This tool requires the enterprise license tier and the team broker feature enabled for the team; if the team does not have it enabled, the request returns a not found response.`,
        annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        inputSchema: {
            teamId,
            username: z.string().describe('Username of the broker client to fetch')
        },
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: `/api/v1/teams/${args.teamId}/broker/client/${args.username}` })
            return response
        }
    },
    {
        name: 'platform_create_broker_client',
        title: 'Create Broker Client',
        description: `FlowFuse platform automation tool:
            Creates a new MQTT client (a set of credentials) on the team's built-in broker.
            The username must be unique within the team; creating a client with a username that already exists fails with a conflict.
            acls controls what the client may publish or subscribe to. If omitted, the client is created with the broker's default rule (subscribe to everything, publish nothing).
            The response includes the plaintext password exactly once - it is hashed on the platform and cannot be retrieved again, so show it to the user now if they need it.
            This tool requires the enterprise license tier and the team broker feature enabled for the team; if the team does not have it enabled, the request returns a not found response.`,
        annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
        inputSchema: {
            teamId,
            username: z.string().describe('Username for the new broker client. Must be unique within the team.'),
            password: z.string().describe('Password for the new broker client'),
            acls: z.array(aclEntry).optional().describe('Access rules for this client. Omit to use the broker default (subscribe to everything, publish nothing).')
        },
        handler: async (args, { inject }) => {
            const payload = { username: args.username, password: args.password }
            if (args.acls) {
                payload.acls = args.acls
            }
            const response = await inject({ method: 'POST', url: `/api/v1/teams/${args.teamId}/broker/client`, payload })
            return response
        }
    },
    {
        name: 'platform_update_broker_client',
        title: 'Update Broker Client',
        description: `FlowFuse platform automation tool:
            Updates an existing MQTT client on the team's built-in broker: its password, its access rules (acls), or both.
            Provide at least one of password or acls. Passing acls replaces the client's entire rule set, it does not merge with the existing rules.
            Use platform_get_broker_client first if you need to see the client's current acls before changing them.
            This tool requires the enterprise license tier and the team broker feature enabled for the team; if the team does not have it enabled, the request returns a not found response.`,
        annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
        inputSchema: {
            teamId,
            username: z.string().describe('Username of the broker client to update'),
            password: z.string().optional().describe('New password for the client'),
            acls: z.array(aclEntry).optional().describe('Replacement access rules for this client. Replaces the existing rule set entirely.')
        },
        handler: async (args, { inject }) => {
            if (args.password === undefined && args.acls === undefined) {
                return toolError(400, 'invalid_request', 'Provide at least one of password or acls to update.')
            }
            const payload = {}
            if (args.password !== undefined) {
                payload.password = args.password
            }
            if (args.acls !== undefined) {
                payload.acls = args.acls
            }
            const response = await inject({ method: 'PUT', url: `/api/v1/teams/${args.teamId}/broker/client/${args.username}`, payload })
            return response
        }
    },
    {
        name: 'platform_list_brokers',
        title: 'List Brokers',
        description: `FlowFuse platform automation tool:
            Lists the 3rd-party (external) MQTT brokers that have been linked to the team. This does not include MQTT credentials.
            The built-in team broker is not part of this list. It is always addressable directly by the literal id "team-broker" in platform_get_broker, platform_list_broker_topics, and platform_get_broker_schema, so you do not need to list it first.
            Use this to find a 3rd-party broker's ID before calling platform_get_broker, platform_list_broker_topics, or platform_get_broker_schema.
            Supports pagination.
            This tool requires the enterprise license tier and the team broker feature enabled for the team; if the team does not have it enabled, the request returns a not found response.`,
        annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        inputSchema: {
            teamId,
            ...basePagination
        },
        handler: async (args, { inject }) => {
            const url = appendQuery(`/api/v1/teams/${args.teamId}/brokers`, args, basePaginationKeys)
            const response = await inject({ method: 'GET', url })
            return response
        }
    },
    {
        name: 'platform_get_broker',
        title: 'Get Broker',
        description: `FlowFuse platform automation tool:
            Gets the details and status of a single broker: the built-in team broker or a linked 3rd-party MQTT broker. This does not include MQTT credentials.
            Use this after platform_list_brokers to inspect one broker in detail.
            For brokerId "team-broker" there are two possible shapes. When the team broker agent is provisioned you get
            the full record, in the same shape as a 3rd-party broker. When it is not, you get only { state: "suspended" },
            which means the team broker exists as a feature but has no agent running - it is not an error, and there are
            no further details to read. A 3rd-party broker hashid always returns the full record.
            This tool requires the enterprise license tier and the team broker feature enabled for the team; if the team does not have it enabled, the request returns a not found response.`,
        annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        inputSchema: {
            teamId,
            brokerId: z.string().describe("broker id: either the literal 'team-broker' or a 3rd-party broker hashid")
        },
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: `/api/v1/teams/${args.teamId}/brokers/${args.brokerId}` })
            return response
        }
    },
    {
        name: 'platform_list_broker_topics',
        title: 'List Broker Topics',
        description: `FlowFuse platform automation tool:
            Lists the MQTT topics that have been observed on a broker, along with any recorded metadata and inferred payload schema for each topic.
            Use this to understand what data is flowing through a broker before wiring up new flows that publish or subscribe to it.
            Every observed topic comes back in one response and the listing cannot be paged or filtered, so a busy broker
            returns a long result. Prefer platform_get_broker_schema when you only need the topic structure.
            This tool requires the enterprise license tier and the team broker feature enabled for the team; if the team does not have it enabled, the request returns a not found response.`,
        annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        inputSchema: {
            teamId,
            brokerId: z.string().describe("broker id: either the literal 'team-broker' or a 3rd-party broker hashid")
        },
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: `/api/v1/teams/${args.teamId}/brokers/${args.brokerId}/topics` })
            return response
        }
    },
    {
        name: 'platform_create_broker_topic',
        title: 'Create Broker Topic',
        description: `FlowFuse platform automation tool:
            Registers a topic entry on a broker, with optional metadata and inferred payload schema.
            This is normally populated automatically as the broker observes traffic; use this tool to record a topic
            up front, for example one the agent is about to start publishing to, so it shows up in
            platform_list_broker_topics and platform_get_broker_schema before any traffic has flowed.
            Calling this again for a topic that already exists on the broker updates its metadata and schema rather than duplicating the entry.
            This tool requires the enterprise license tier and the team broker feature enabled for the team; if the team does not have it enabled, the request returns a not found response.`,
        annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        inputSchema: {
            teamId,
            brokerId: z.string().describe("broker id: either the literal 'team-broker' or a 3rd-party broker hashid"),
            topic: z.string().describe('The MQTT topic to register, e.g. "sensors/room1/temperature"'),
            type: z.record(z.any()).optional().describe('Optional inferred payload schema for this topic, stored as-is and returned as inferredSchema'),
            metadata: z.record(z.any()).optional().describe('Optional free-form metadata to attach to this topic')
        },
        handler: async (args, { inject }) => {
            const payload = { topic: args.topic }
            if (args.type !== undefined) {
                payload.type = args.type
            }
            if (args.metadata !== undefined) {
                payload.metadata = args.metadata
            }
            const response = await inject({ method: 'POST', url: `/api/v1/teams/${args.teamId}/brokers/${args.brokerId}/topics`, payload })
            return response
        }
    },
    {
        name: 'platform_update_broker_topic',
        title: 'Update Broker Topic',
        description: `FlowFuse platform automation tool:
            Updates the metadata recorded against an existing topic entry on a broker. This is the only field the platform lets you change on a topic after it exists; the topic name and inferred schema are not editable through this tool.
            Use platform_list_broker_topics first to find the topic's id.
            This tool requires the enterprise license tier and the team broker feature enabled for the team; if the team does not have it enabled, the request returns a not found response.`,
        annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
        inputSchema: {
            teamId,
            brokerId: z.string().describe("broker id: either the literal 'team-broker' or a 3rd-party broker hashid"),
            topicId: z.string().describe('The hashid of the topic entry, from platform_list_broker_topics'),
            metadata: z.record(z.any()).describe('Replacement metadata for this topic')
        },
        handler: async (args, { inject }) => {
            const response = await inject({
                method: 'PUT',
                url: `/api/v1/teams/${args.teamId}/brokers/${args.brokerId}/topics/${args.topicId}`,
                payload: { metadata: args.metadata }
            })
            return response
        }
    },
    {
        name: 'platform_get_broker_schema',
        title: 'Get Broker Schema',
        description: `FlowFuse platform automation tool:
            Gets the auto-generated AsyncAPI topic schema for a broker, built from the topics observed on it.
            Use this when the user wants a documented overview of a broker's topic structure and message shapes, for example to share with another team or to generate integration code.
            The whole document is returned in one response and cannot be paged or narrowed to a topic prefix. A broker
            with many topics, or with deeply nested payloads, produces a very large result, so only call this when the
            full schema is actually needed.
            This tool requires the enterprise license tier and the team broker feature enabled for the team; if the team does not have it enabled, the request returns a not found response.`,
        annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        inputSchema: {
            teamId,
            brokerId: z.string().describe("broker id: either the literal 'team-broker' or a 3rd-party broker hashid")
        },
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: `/api/v1/teams/${args.teamId}/broker/${args.brokerId}/schema` })
            return response
        }
    }
]
