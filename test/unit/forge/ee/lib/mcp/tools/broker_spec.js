const should = require('should') // eslint-disable-line no-unused-vars
const sinon = require('sinon')

const tools = require('../../../../../../../forge/ee/lib/mcp/tools/broker')

function getTool (name) {
    return tools.find(tool => tool.name === name)
}

describe('MCP Broker Tools', function () {
    let inject

    beforeEach(function () {
        inject = sinon.stub()
    })

    describe('platform_list_broker_clients', function () {
        const tool = getTool('platform_list_broker_clients')

        it('injects the broker clients list route and returns the response', async function () {
            const routeResponse = { statusCode: 200, json: () => ({ clients: [], count: 0 }) }
            inject.withArgs({ method: 'GET', url: '/api/v1/teams/team1/broker/clients' }).resolves(routeResponse)

            const response = await tool.handler({ teamId: 'team1' }, { inject })

            inject.calledOnce.should.be.true()
            response.should.equal(routeResponse)
        })

        it('serialises pagination and search params', async function () {
            inject.resolves({ statusCode: 200, json: () => ({ clients: [] }) })

            await tool.handler({ teamId: 'team1', cursor: 'abc', limit: 20, query: 'sensor' }, { inject })

            inject.firstCall.args[0].url.should.equal('/api/v1/teams/team1/broker/clients?cursor=abc&limit=20&query=sensor')
        })

        it('passes through an error response', async function () {
            const errorResponse = { statusCode: 404, json: () => ({ code: 'not_found' }) }
            inject.resolves(errorResponse)

            const response = await tool.handler({ teamId: 'team1' }, { inject })
            response.should.equal(errorResponse)
        })
    })

    describe('platform_get_broker_client', function () {
        const tool = getTool('platform_get_broker_client')

        it('injects the broker client route for the given username', async function () {
            const routeResponse = { statusCode: 200, json: () => ({ username: 'client1' }) }
            inject.withArgs({ method: 'GET', url: '/api/v1/teams/team1/broker/client/client1' }).resolves(routeResponse)

            const response = await tool.handler({ teamId: 'team1', username: 'client1' }, { inject })

            inject.calledOnce.should.be.true()
            response.should.equal(routeResponse)
        })

        it('passes through an error response', async function () {
            const errorResponse = { statusCode: 404, json: () => ({ code: 'not_found' }) }
            inject.resolves(errorResponse)

            const response = await tool.handler({ teamId: 'team1', username: 'client1' }, { inject })
            response.should.equal(errorResponse)
        })
    })

    describe('platform_list_brokers', function () {
        const tool = getTool('platform_list_brokers')

        it('injects the brokers list route and returns the response', async function () {
            const routeResponse = { statusCode: 200, json: () => ({ brokers: [] }) }
            inject.withArgs({ method: 'GET', url: '/api/v1/teams/team1/brokers' }).resolves(routeResponse)

            const response = await tool.handler({ teamId: 'team1' }, { inject })

            inject.calledOnce.should.be.true()
            response.should.equal(routeResponse)
        })

        it('serialises pagination params', async function () {
            inject.resolves({ statusCode: 200, json: () => ({ brokers: [] }) })

            await tool.handler({ teamId: 'team1', cursor: 'abc', limit: 5 }, { inject })

            inject.firstCall.args[0].url.should.equal('/api/v1/teams/team1/brokers?cursor=abc&limit=5')
        })

        it('passes through an error response', async function () {
            const errorResponse = { statusCode: 404, json: () => ({ code: 'not_found' }) }
            inject.resolves(errorResponse)

            const response = await tool.handler({ teamId: 'team1' }, { inject })
            response.should.equal(errorResponse)
        })
    })

    describe('platform_get_broker', function () {
        const tool = getTool('platform_get_broker')

        it('injects the broker detail route for the given broker', async function () {
            const routeResponse = { statusCode: 200, json: () => ({ id: 'team-broker' }) }
            inject.withArgs({ method: 'GET', url: '/api/v1/teams/team1/brokers/team-broker' }).resolves(routeResponse)

            const response = await tool.handler({ teamId: 'team1', brokerId: 'team-broker' }, { inject })

            inject.calledOnce.should.be.true()
            response.should.equal(routeResponse)
        })

        it('passes through an error response', async function () {
            const errorResponse = { statusCode: 404, json: () => ({ code: 'not_found' }) }
            inject.resolves(errorResponse)

            const response = await tool.handler({ teamId: 'team1', brokerId: 'team-broker' }, { inject })
            response.should.equal(errorResponse)
        })
    })

    describe('platform_list_broker_topics', function () {
        const tool = getTool('platform_list_broker_topics')

        it('injects the broker topics route for the given broker', async function () {
            const routeResponse = { statusCode: 200, json: () => ({ topics: [] }) }
            inject.withArgs({ method: 'GET', url: '/api/v1/teams/team1/brokers/team-broker/topics' }).resolves(routeResponse)

            const response = await tool.handler({ teamId: 'team1', brokerId: 'team-broker' }, { inject })

            inject.calledOnce.should.be.true()
            response.should.equal(routeResponse)
        })

        it('passes through an error response', async function () {
            const errorResponse = { statusCode: 404, json: () => ({ code: 'not_found' }) }
            inject.resolves(errorResponse)

            const response = await tool.handler({ teamId: 'team1', brokerId: 'team-broker' }, { inject })
            response.should.equal(errorResponse)
        })
    })

    describe('platform_get_broker_schema', function () {
        const tool = getTool('platform_get_broker_schema')

        it('injects the broker schema route for the given broker', async function () {
            const routeResponse = { statusCode: 200, json: () => ({ channels: {} }) }
            inject.withArgs({ method: 'GET', url: '/api/v1/teams/team1/broker/team-broker/schema' }).resolves(routeResponse)

            const response = await tool.handler({ teamId: 'team1', brokerId: 'team-broker' }, { inject })

            inject.calledOnce.should.be.true()
            response.should.equal(routeResponse)
        })

        it('passes through an error response', async function () {
            const errorResponse = { statusCode: 404, json: () => ({ code: 'not_found' }) }
            inject.resolves(errorResponse)

            const response = await tool.handler({ teamId: 'team1', brokerId: 'team-broker' }, { inject })
            response.should.equal(errorResponse)
        })
    })

    describe('platform_broker_lifecycle_action', function () {
        const tool = getTool('platform_broker_lifecycle_action')

        it('is marked destructive, since suspend tears the agent down', function () {
            tool.annotations.destructiveHint.should.be.true()
        })

        const actions = ['start', 'stop', 'suspend']
        actions.forEach(action => {
            it(`posts to the ${action} route`, async function () {
                const routeResponse = { statusCode: 200, json: () => ({}) }
                inject.withArgs({ method: 'POST', url: `/api/v1/teams/team1/brokers/broker1/${action}` }).resolves(routeResponse)

                const response = await tool.handler({ teamId: 'team1', brokerId: 'broker1', action }, { inject })

                inject.calledOnce.should.be.true()
                response.should.equal(routeResponse)
            })
        })

        it('rejects an unknown action', function () {
            tool.inputSchema.action.safeParse('restart').success.should.be.false()
        })

        it('passes through an error response', async function () {
            const errorResponse = { statusCode: 404, json: () => ({ code: 'not_found' }) }
            inject.resolves(errorResponse)

            const response = await tool.handler({ teamId: 'team1', brokerId: 'team-broker', action: 'suspend' }, { inject })
            response.should.equal(errorResponse)
        })
    })

    describe('platform_create_broker_topic', function () {
        const tool = getTool('platform_create_broker_topic')

        it('posts the topics array to the topics route', async function () {
            const routeResponse = { statusCode: 201, json: () => ({}) }
            inject.withArgs({
                method: 'POST',
                url: '/api/v1/teams/team1/brokers/team-broker/topics',
                payload: [{ topic: 'factory/line1/temp', metadata: { description: 'Line 1 temperature' } }]
            }).resolves(routeResponse)

            const response = await tool.handler({ teamId: 'team1', brokerId: 'team-broker', topics: [{ topic: 'factory/line1/temp', metadata: { description: 'Line 1 temperature' } }] }, { inject })

            inject.calledOnce.should.be.true()
            response.should.equal(routeResponse)
        })

        it('passes through an error response', async function () {
            const errorResponse = { statusCode: 404, json: () => ({ code: 'not_found' }) }
            inject.resolves(errorResponse)

            const response = await tool.handler({ teamId: 'team1', brokerId: 'broker1', topics: [{ topic: 'a/b' }] }, { inject })
            response.should.equal(errorResponse)
        })
    })

    describe('platform_update_broker_topic', function () {
        const tool = getTool('platform_update_broker_topic')

        it('puts the metadata onto the topic route', async function () {
            const routeResponse = { statusCode: 201, json: () => ({ id: 'topic1' }) }
            inject.withArgs({
                method: 'PUT',
                url: '/api/v1/teams/team1/brokers/broker1/topics/topic1',
                payload: { metadata: { description: 'updated' } }
            }).resolves(routeResponse)

            const response = await tool.handler({ teamId: 'team1', brokerId: 'broker1', topicId: 'topic1', metadata: { description: 'updated' } }, { inject })

            inject.calledOnce.should.be.true()
            response.should.equal(routeResponse)
        })

        it('passes through an error response', async function () {
            const errorResponse = { statusCode: 404, json: () => ({ code: 'not_found' }) }
            inject.resolves(errorResponse)

            const response = await tool.handler({ teamId: 'team1', brokerId: 'broker1', topicId: 'topic1', metadata: {} }, { inject })
            response.should.equal(errorResponse)
        })
    })
})
