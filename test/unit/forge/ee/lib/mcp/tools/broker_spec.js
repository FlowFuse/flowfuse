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

    describe('platform_create_broker_client', function () {
        const tool = getTool('platform_create_broker_client')

        it('injects the create client route with username, password and acls', async function () {
            const routeResponse = { statusCode: 201, json: () => ({ username: 'client1' }) }
            inject.resolves(routeResponse)

            const acls = [{ action: 'subscribe', pattern: '#' }]
            const response = await tool.handler({ teamId: 'team1', username: 'client1', password: 'secret', acls }, { inject })

            inject.calledOnce.should.be.true()
            inject.firstCall.args[0].should.match({
                method: 'POST',
                url: '/api/v1/teams/team1/broker/client',
                payload: { username: 'client1', password: 'secret', acls }
            })
            response.should.equal(routeResponse)
        })

        it('omits acls from the payload when not provided', async function () {
            inject.resolves({ statusCode: 201, json: () => ({}) })

            await tool.handler({ teamId: 'team1', username: 'client1', password: 'secret' }, { inject })

            inject.firstCall.args[0].payload.should.deepEqual({ username: 'client1', password: 'secret' })
        })

        it('passes through an error response', async function () {
            const errorResponse = { statusCode: 409, json: () => ({ code: 'client_already_exists' }) }
            inject.resolves(errorResponse)

            const response = await tool.handler({ teamId: 'team1', username: 'client1', password: 'secret' }, { inject })
            response.should.equal(errorResponse)
        })
    })

    describe('platform_update_broker_client', function () {
        const tool = getTool('platform_update_broker_client')

        it('injects the update client route with only the provided fields', async function () {
            const routeResponse = { statusCode: 201, json: () => ({ username: 'client1' }) }
            inject.resolves(routeResponse)

            const response = await tool.handler({ teamId: 'team1', username: 'client1', password: 'newsecret' }, { inject })

            inject.calledOnce.should.be.true()
            inject.firstCall.args[0].should.match({
                method: 'PUT',
                url: '/api/v1/teams/team1/broker/client/client1',
                payload: { password: 'newsecret' }
            })
            response.should.equal(routeResponse)
        })

        it('sends acls when provided instead of password', async function () {
            inject.resolves({ statusCode: 201, json: () => ({}) })
            const acls = [{ action: 'both', pattern: 'sensors/#' }]

            await tool.handler({ teamId: 'team1', username: 'client1', acls }, { inject })

            inject.firstCall.args[0].payload.should.deepEqual({ acls })
        })

        it('rejects a call with neither password nor acls', async function () {
            const response = await tool.handler({ teamId: 'team1', username: 'client1' }, { inject })

            inject.called.should.be.false()
            response.statusCode.should.equal(400)
            response.json().code.should.equal('invalid_request')
        })

        it('passes through an error response', async function () {
            const errorResponse = { statusCode: 404, json: () => ({ code: 'not_found' }) }
            inject.resolves(errorResponse)

            const response = await tool.handler({ teamId: 'team1', username: 'client1', password: 'x' }, { inject })
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

    describe('platform_create_broker_topic', function () {
        const tool = getTool('platform_create_broker_topic')

        it('injects the create topic route with topic, type and metadata', async function () {
            const routeResponse = { statusCode: 201, json: () => ({}) }
            inject.resolves(routeResponse)

            const response = await tool.handler({
                teamId: 'team1',
                brokerId: 'team-broker',
                topic: 'sensors/room1/temperature',
                type: { type: 'number' },
                metadata: { unit: 'celsius' }
            }, { inject })

            inject.calledOnce.should.be.true()
            inject.firstCall.args[0].should.match({
                method: 'POST',
                url: '/api/v1/teams/team1/brokers/team-broker/topics',
                payload: {
                    topic: 'sensors/room1/temperature',
                    type: { type: 'number' },
                    metadata: { unit: 'celsius' }
                }
            })
            response.should.equal(routeResponse)
        })

        it('omits type and metadata from the payload when not provided', async function () {
            inject.resolves({ statusCode: 201, json: () => ({}) })

            await tool.handler({ teamId: 'team1', brokerId: 'team-broker', topic: 'sensors/room1/temperature' }, { inject })

            inject.firstCall.args[0].payload.should.deepEqual({ topic: 'sensors/room1/temperature' })
        })

        it('passes through an error response', async function () {
            const errorResponse = { statusCode: 404, json: () => ({ code: 'not_found' }) }
            inject.resolves(errorResponse)

            const response = await tool.handler({ teamId: 'team1', brokerId: 'team-broker', topic: 'sensors/room1/temperature' }, { inject })
            response.should.equal(errorResponse)
        })
    })

    describe('platform_update_broker_topic', function () {
        const tool = getTool('platform_update_broker_topic')

        it('injects the update topic route with the replacement metadata', async function () {
            const routeResponse = { statusCode: 201, json: () => ({ id: 'topic1' }) }
            inject.resolves(routeResponse)

            const response = await tool.handler({
                teamId: 'team1',
                brokerId: 'team-broker',
                topicId: 'topic1',
                metadata: { unit: 'fahrenheit' }
            }, { inject })

            inject.calledOnce.should.be.true()
            inject.firstCall.args[0].should.match({
                method: 'PUT',
                url: '/api/v1/teams/team1/brokers/team-broker/topics/topic1',
                payload: { metadata: { unit: 'fahrenheit' } }
            })
            response.should.equal(routeResponse)
        })

        it('passes through an error response', async function () {
            const errorResponse = { statusCode: 404, json: () => ({ code: 'not_found' }) }
            inject.resolves(errorResponse)

            const response = await tool.handler({ teamId: 'team1', brokerId: 'team-broker', topicId: 'topic1', metadata: {} }, { inject })
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
})
