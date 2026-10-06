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

    describe('platform_delete_broker_topic', function () {
        const tool = getTool('platform_delete_broker_topic')

        it('is annotated as destructive so it is served as a delete tool', function () {
            tool.annotations.should.have.property('readOnlyHint', false)
            tool.annotations.should.have.property('destructiveHint', true)
        })

        it('deletes through the broker topics route', async function () {
            const routeResponse = { statusCode: 201, json: () => ({}) }
            inject.withArgs({ method: 'DELETE', url: '/api/v1/teams/team1/brokers/team-broker/topics/topic1' }).resolves(routeResponse)

            const response = await tool.handler({ teamId: 'team1', brokerId: 'team-broker', topicId: 'topic1' }, { inject })

            inject.calledOnce.should.be.true()
            response.should.equal(routeResponse)
        })

        it('passes through an error response', async function () {
            const errorResponse = { statusCode: 404, json: () => ({ code: 'not_found' }) }
            inject.resolves(errorResponse)

            const response = await tool.handler({ teamId: 'team1', brokerId: 'team-broker', topicId: 'topic1' }, { inject })
            response.should.equal(errorResponse)
        })

        it('refuses ids that would reach another route', async function () {
            for (const [teamId, brokerId, topicId] of [
                ['team1', 'team-broker', '../../../../../applications/app1'],
                ['team1', '../../applications/app1', 'topic1'],
                ['../applications', 'team-broker', 'topic1'],
                ['team1', 'team-broker', 'topic1?x=1']
            ]) {
                const response = await tool.handler({ teamId, brokerId, topicId }, { inject })
                response.statusCode.should.equal(400)
                response.json().should.have.property('code', 'invalid_request')
            }
            inject.called.should.be.false()
        })

        it('accepts a 3rd-party broker hashid', async function () {
            inject.resolves({ statusCode: 201, json: () => ({}) })

            await tool.handler({ teamId: 'team1', brokerId: 'broker1', topicId: 'topic1' }, { inject })
            inject.calledOnce.should.be.true()
        })
    })

    describe('platform_delete_broker_client', function () {
        const tool = getTool('platform_delete_broker_client')

        it('is annotated as destructive so it is served as a delete tool', function () {
            tool.annotations.should.have.property('readOnlyHint', false)
            tool.annotations.should.have.property('destructiveHint', true)
        })

        it('deletes through the team broker client route', async function () {
            const routeResponse = { statusCode: 200, json: () => ({ status: 'okay' }) }
            inject.withArgs({ method: 'DELETE', url: '/api/v1/teams/team1/broker/client/alice' }).resolves(routeResponse)

            const response = await tool.handler({ teamId: 'team1', username: 'alice' }, { inject })

            inject.calledOnce.should.be.true()
            response.should.equal(routeResponse)
        })

        it('passes through an error response', async function () {
            const errorResponse = { statusCode: 403, json: () => ({ code: 'unauthorized' }) }
            inject.resolves(errorResponse)

            const response = await tool.handler({ teamId: 'team1', username: 'alice' }, { inject })
            response.should.equal(errorResponse)
        })

        it('encodes the username, so one containing "/" stays a single path segment', async function () {
            inject.resolves({ statusCode: 200, json: () => ({ status: 'okay' }) })

            await tool.handler({ teamId: 'team1', username: 'rv:client/2' }, { inject })
            inject.firstCall.args[0].url.should.equal(`/api/v1/teams/team1/broker/client/${encodeURIComponent('rv:client/2')}`)
        })

        it('refuses ids that would reach another route', async function () {
            for (const [teamId, username] of [['team1', '..'], ['team1', '.'], ['../applications', 'alice']]) {
                const response = await tool.handler({ teamId, username }, { inject })
                response.statusCode.should.equal(400)
                response.json().should.have.property('code', 'invalid_request')
            }
            inject.called.should.be.false()
        })
    })
})
