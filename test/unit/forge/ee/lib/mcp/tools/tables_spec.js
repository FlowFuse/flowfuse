const should = require('should') // eslint-disable-line no-unused-vars
const sinon = require('sinon')

const tools = require('../../../../../../../forge/ee/lib/mcp/tools/tables')

function getTool (name) {
    return tools.find(tool => tool.name === name)
}

describe('MCP Tables Tools', function () {
    let inject

    beforeEach(function () {
        inject = sinon.stub()
    })

    describe('platform_list_team_databases', function () {
        const tool = getTool('platform_list_team_databases')

        it('calls the databases list endpoint for the team', async function () {
            inject.resolves({ statusCode: 200, json: () => [] })
            await tool.handler({ teamId: 'team1' }, { inject })
            inject.calledOnce.should.be.true()
            inject.firstCall.args[0].should.eql({ method: 'GET', url: '/api/v1/teams/team1/databases' })
        })

        it('strips credentials from every returned database and wraps them in a databases object', async function () {
            inject.resolves({
                statusCode: 200,
                json: () => [
                    { id: 'db1', name: 'one', credentials: { password: 'secret1' } },
                    { id: 'db2', name: 'two', credentials: { password: 'secret2' } }
                ]
            })
            const response = await tool.handler({ teamId: 'team1' }, { inject })
            response.statusCode.should.equal(200)
            response.json().should.eql({
                databases: [
                    { id: 'db1', name: 'one' },
                    { id: 'db2', name: 'two' }
                ]
            })
        })

        it('passes through error responses unmodified, including any credentials', async function () {
            const errorResponse = {
                statusCode: 404,
                json: () => [{ id: 'db1', credentials: { password: 'secret1' } }]
            }
            inject.resolves(errorResponse)
            const response = await tool.handler({ teamId: 'team1' }, { inject })
            response.should.equal(errorResponse)
            response.json().should.eql([{ id: 'db1', credentials: { password: 'secret1' } }])
        })
    })

    describe('platform_get_team_database', function () {
        const tool = getTool('platform_get_team_database')

        it('calls the single database endpoint for the team', async function () {
            inject.resolves({ statusCode: 200, json: () => ({ id: 'db1' }) })
            await tool.handler({ teamId: 'team1', databaseId: 'db1' }, { inject })
            inject.calledOnce.should.be.true()
            inject.firstCall.args[0].should.eql({ method: 'GET', url: '/api/v1/teams/team1/databases/db1' })
        })

        it('strips credentials from the returned database and wraps it in a database object', async function () {
            inject.resolves({
                statusCode: 200,
                json: () => ({ id: 'db1', name: 'one', credentials: { password: 'secret1' } })
            })
            const response = await tool.handler({ teamId: 'team1', databaseId: 'db1' }, { inject })
            response.statusCode.should.equal(200)
            response.json().should.eql({ database: { id: 'db1', name: 'one' } })
        })

        it('passes through error responses unmodified, including any credentials', async function () {
            const errorResponse = {
                statusCode: 400,
                json: () => ({ id: 'db1', credentials: { password: 'secret1' } })
            }
            inject.resolves(errorResponse)
            const response = await tool.handler({ teamId: 'team1', databaseId: 'db1' }, { inject })
            response.should.equal(errorResponse)
            response.json().should.eql({ id: 'db1', credentials: { password: 'secret1' } })
        })
    })

    describe('platform_list_database_tables', function () {
        const tool = getTool('platform_list_database_tables')

        it('calls the tables list endpoint and returns the response unmodified', async function () {
            const injectResponse = { statusCode: 200, json: () => [{ name: 'table1' }] }
            inject.resolves(injectResponse)
            const response = await tool.handler({ teamId: 'team1', databaseId: 'db1' }, { inject })
            inject.firstCall.args[0].should.eql({ method: 'GET', url: '/api/v1/teams/team1/databases/db1/tables' })
            response.should.equal(injectResponse)
        })
    })

    describe('platform_get_database_table', function () {
        const tool = getTool('platform_get_database_table')

        it('calls the table endpoint with the table name and schema, and wraps the columns with the identifying fields', async function () {
            const columns = [{ name: 'id', type: 'integer' }]
            inject.resolves({ statusCode: 200, json: () => columns })
            const response = await tool.handler({ teamId: 'team1', databaseId: 'db1', tableName: 'table1', schemaName: 'public' }, { inject })
            inject.firstCall.args[0].should.eql({ method: 'GET', url: '/api/v1/teams/team1/databases/db1/tables/table1/public' })
            response.statusCode.should.equal(200)
            response.json().should.eql({
                database: 'db1',
                tableName: 'table1',
                schemaName: 'public',
                columns
            })
        })

        it('passes through error responses unmodified', async function () {
            const errorResponse = { statusCode: 404, json: () => ({ code: 'table_not_found', error: 'Table not found' }) }
            inject.resolves(errorResponse)
            const response = await tool.handler({ teamId: 'team1', databaseId: 'db1', tableName: 'table1', schemaName: 'public' }, { inject })
            response.should.equal(errorResponse)
        })
    })

    describe('platform_query_database_table_data', function () {
        const tool = getTool('platform_query_database_table_data')

        it('includes the limit query param when limit is provided', async function () {
            const injectResponse = { statusCode: 200, json: () => [{ col: 'value' }] }
            inject.resolves(injectResponse)
            const response = await tool.handler({ teamId: 'team1', databaseId: 'db1', tableName: 'table1', schemaName: 'public', limit: 5 }, { inject })
            inject.firstCall.args[0].should.eql({
                method: 'GET',
                url: '/api/v1/teams/team1/databases/db1/tables/table1/data/public?limit=5'
            })
            response.should.equal(injectResponse)
        })

        it('omits the query string when limit is undefined', async function () {
            const injectResponse = { statusCode: 200, json: () => [] }
            inject.resolves(injectResponse)
            const response = await tool.handler({ teamId: 'team1', databaseId: 'db1', tableName: 'table1', schemaName: 'public' }, { inject })
            inject.firstCall.args[0].should.eql({
                method: 'GET',
                url: '/api/v1/teams/team1/databases/db1/tables/table1/data/public'
            })
            response.should.equal(injectResponse)
        })

        it('includes a non-public schema segment', async function () {
            const injectResponse = { statusCode: 200, json: () => [{ col: 'value' }] }
            inject.resolves(injectResponse)
            await tool.handler({ teamId: 'team1', databaseId: 'db1', tableName: 'table1', schemaName: 'custom', limit: 5 }, { inject })
            inject.firstCall.args[0].should.eql({
                method: 'GET',
                url: '/api/v1/teams/team1/databases/db1/tables/table1/data/custom?limit=5'
            })
        })
    })
})
