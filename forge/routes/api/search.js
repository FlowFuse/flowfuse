/**
 * Search API
 *
 * - /api/v1/search
 *
 */
module.exports = async function (app) {
    /**
     * Search API
     *
     * GET /api/v1/search/
     *
     * Query Params:
     *  - team : team hash id (required)
     *  - query: <string> search query term (required)
     */
    app.get('/', {
        schema: {
            summary: 'Search for resources',
            tags: ['Search'],
            query: {
                type: 'object',
                // For now, require 'team' query param to scope the search to
                // a single team. This *could* be relaxed in the future to operate
                // across all teams the user is a member of.
                required: ['team'],
                properties: {
                    team: { type: 'string' },
                    query: { type: 'string' }
                },
                additionalProperties: true
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        count: { type: 'number' },
                        results: { type: 'array', items: { type: 'object', additionalProperties: true } }
                    }
                },
                '4xx': {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        const query = request.query.query?.trim()
        const teamHashId = request.query.team
        const [teamId] = app.db.models.Team.decodeHashid(teamHashId)
        // Only search if query is not blank
        if (query) {
            // Only search if a valid team has been provided
            if (teamId !== undefined) {
                const membership = await request.session.User.getTeamMembership(teamId)
                // Check user has access to this team - either admin or at least Viewer role
                if (request.session.User.admin || app.hasPermission(membership, 'team:search')) {
                    let applicationSearchPromise = Promise.resolve([])
                    let instanceSearchPromise = Promise.resolve([])
                    let deviceSearchPromise = Promise.resolve([])

                    // first check to see if the query is an ID
                    const applicationId = app.db.models.Application.decodeHashid(query)?.[0]
                    const deviceId = app.db.models.Device.decodeHashid(query)?.[0]
                    const isAppId = typeof applicationId === 'number'
                    const isDeviceId = typeof deviceId === 'number'
                    const isInstanceId = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/.test(query)

                    // now search for the query term in the team
                    if (isAppId) {
                        applicationSearchPromise = app.db.models.Application.byTeam(
                            teamId,
                            {
                                applicationId,
                                includeApplicationSummary: true
                            }
                        )
                    } else if (isInstanceId) {
                        instanceSearchPromise = app.db.models.Project.byTeam(
                            teamId,
                            {
                                instanceId: query,
                                includeAssociations: false
                            }
                        )
                    } else if (isDeviceId) {
                        deviceSearchPromise = app.db.models.Device.byTeam(
                            teamId,
                            {
                                deviceId
                            }
                        )
                    } else {
                        applicationSearchPromise = app.db.models.Application.byTeam(
                            teamId,
                            {
                                query,
                                includeApplicationSummary: true
                            }
                        )
                        instanceSearchPromise = app.db.models.Project.byTeam(
                            teamId,
                            {
                                query,
                                includeAssociations: false
                            }
                        )
                        deviceSearchPromise = app.db.models.Device.byTeam(
                            teamId,
                            {
                                query
                            }
                        )
                    }
                    const results = await Promise.all([
                        applicationSearchPromise,
                        instanceSearchPromise,
                        deviceSearchPromise
                    ])
                    const rr = [
                        ...(results[0].map(application => {
                            return {
                                object: 'application',
                                ...app.db.views.Application.applicationSummary(application, { detailed: true })
                            }
                        })) || [],
                        ...(results[1].map(instance => {
                            return {
                                object: 'instance',
                                ...app.db.views.Project.projectSummary(instance)
                            }
                        })) || [],
                        ...(results[2].devices?.map(device => {
                            return {
                                object: 'device',
                                ...app.db.views.Device.deviceSummary(device)
                            }
                        })) || []
                    ]

                    reply.send({
                        count: rr.length,
                        results: rr.flat()
                    })
                    return
                }
            }
        }
        // Invalid team - send empty results
        reply.send({
            count: 0,
            results: []
        })
    })

    /**
     * Search API
     *
     * GET /api/v1/search/instances
     *
     * Query Params:
     *  - team : team hash id (required)
     *  - query: <string> search query term (required)
     */
    app.get('/instances', {
        preHandler: async (request, reply) => {
            const teamHashId = request.query.team
            const decodedTeamId = app.db.models.Team.decodeHashid(teamHashId)

            if (!decodedTeamId) {
                return reply.code(400).send({ code: 'bad_request', error: 'invalid_team' })
            }

            const [teamId] = decodedTeamId
            const membership = await request.session.User.getTeamMembership(teamId)
            request.teamId = teamId

            if (!request.session.User.admin && !app.hasPermission(membership, 'team:search')) {
                return reply.code(403).send({ code: 'unauthorized', error: 'unauthorized' })
            }
        },
        schema: {
            summary: 'Search for hosted and remote instances',
            tags: ['Search'],
            query: {
                type: 'object',
                required: ['team'],
                properties: {
                    team: { type: 'string' },
                    query: { type: 'string' }
                },
                additionalProperties: true
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        count: { type: 'number' },
                        results: { type: 'array', items: { type: 'object', additionalProperties: true } }
                    }
                },
                '4xx': {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        if (!request.query.query) {
            return reply.send({
                count: 0,
                results: []
            })
        }

        const instances = await app.db.models.Project.byTeamForSearch(
            request.teamId,
            request.query.query?.trim()
        )
        const devices = await app.db.models.Device.byTeamForSearch(
            request.teamId,
            request.query.query?.trim()
        )

        const instanceResults = await Promise.all(instances.map(async (instance) => {
            const summary = app.db.views.Project.dashboardInstanceSummary(instance)
            const state = await instance.liveState()

            return { ...summary, ...state, instanceType: 'hosted' }
        }))

        const deviceResults = await Promise.all(devices.map(async (device) => {
            const plainDevice = app.db.views.Device.deviceSummary(device,
                {
                    includeApplication: true
                })
            return { ...plainDevice, instanceType: 'remote' }
        }))

        reply.send({
            count: ((instances.length ?? 0) + (devices.length ?? 0)) ?? 0,
            results: [
                ...instanceResults,
                ...deviceResults
            ]
        })
    })
}
