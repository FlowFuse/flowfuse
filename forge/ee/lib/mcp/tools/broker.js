const { z } = require('zod')

const { teamId, basePagination, basePaginationKeys, searchQuery, appendQuery } = require('../schemas')

module.exports = [
    {
        name: 'platform_list_broker_clients',
        title: 'List Broker Clients',
        description: `FlowFuse platform automation tool:
            Lists the MQTT clients registered on the team broker (the built-in MQTT broker that ships with the platform).
            Each entry identifies the client username and, where known, the hosted instance or remote instance it belongs to. This does not include MQTT credentials.
            Supports username search and pagination.
            This tool requires the enterprise license tier and the team broker feature enabled for the team; if the team does not have it enabled, the request returns a not found response.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
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
        annotations: { readOnlyHint: true, destructiveHint: false },
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
        name: 'platform_list_brokers',
        title: 'List Brokers',
        description: `FlowFuse platform automation tool:
            Lists the 3rd-party (external) MQTT brokers that have been linked to the team. This does not include MQTT credentials.
            The built-in team broker is not part of this list. It is always addressable directly by the literal id "team-broker" in platform_get_broker, platform_list_broker_topics, and platform_get_broker_schema, so you do not need to list it first.
            Use this to find a 3rd-party broker's ID before calling platform_get_broker, platform_list_broker_topics, or platform_get_broker_schema.
            Supports pagination.
            This tool requires the enterprise license tier and the team broker feature enabled for the team; if the team does not have it enabled, the request returns a not found response.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
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
        annotations: { readOnlyHint: true, destructiveHint: false },
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
        annotations: { readOnlyHint: true, destructiveHint: false },
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
        name: 'platform_get_broker_schema',
        title: 'Get Broker Schema',
        description: `FlowFuse platform automation tool:
            Gets the auto-generated AsyncAPI topic schema for a broker, built from the topics observed on it.
            Use this when the user wants a documented overview of a broker's topic structure and message shapes, for example to share with another team or to generate integration code.
            The whole document is returned in one response and cannot be paged or narrowed to a topic prefix. A broker
            with many topics, or with deeply nested payloads, produces a very large result, so only call this when the
            full schema is actually needed.
            This tool requires the enterprise license tier and the team broker feature enabled for the team; if the team does not have it enabled, the request returns a not found response.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
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
